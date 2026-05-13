// ════════════════════════════════════════════════════════════════════════════
// Marketing Planner — Azure infrastructure
// One-click resource creation. Deploy with:
//   az deployment group create \
//     --resource-group rg-marketing-planner-prod \
//     --template-file infra/main.bicep \
//     --parameters projectName=marketingplanner location=eastus2 \
//                  repoToken=$GITHUB_PAT
//
// Provisions: Static Web App + Cosmos DB + Storage + App Insights + Key Vault
// Cost: ~$15-20/month
// ════════════════════════════════════════════════════════════════════════════

@description('Project name — used as prefix for all resource names. Must be lowercase, alphanumeric, 3-18 chars (Storage account names cap at 24 with our prefix).')
@minLength(3)
@maxLength(18)
param projectName string = 'marketingplanner'

@description('Azure region where all resources live. South Central US is closest to Texas + supports Cosmos + SWA.')
param location string = 'southcentralus'

@description('Whether to wire the Static Web App to a GitHub repo for CI/CD. Set false on first deploy if the repo does not yet exist — we can flip it on later by re-running the template.')
param enableGitHubIntegration bool = false

@description('GitHub URL of the deployed code repo. Ignored unless enableGitHubIntegration = true.')
param repoUrl string = ''

@description('Repo branch to auto-deploy from. Ignored unless enableGitHubIntegration = true.')
param repoBranch string = 'main'

@description('GitHub personal-access-token. Static Web App uses this to read the repo. Generate at https://github.com/settings/tokens with repo + workflow scopes. Ignored unless enableGitHubIntegration = true.')
@secure()
param repoToken string = ''

// ── Derived resource names ─────────────────────────────────────────────────
var swaName    = 'swa-${projectName}'
var cosmosName = 'cosmos-${projectName}'
var stName     = take('st${projectName}', 24)   // Storage names max 24 chars, must be alphanumeric only
var aiName     = 'appi-${projectName}'
var kvName     = take('kv-${projectName}', 24)   // KV names max 24 chars

// ════════════════════════════════════════════════════════════════════════════
// COSMOS DB — the primary data store
// ════════════════════════════════════════════════════════════════════════════
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: {
        tier: 'Continuous30Days'   // Point-in-time restore for 30 days
      }
    }
    capabilities: [
      { name: 'EnableServerless' }   // Pay-per-request, cheaper for our traffic
    ]
    publicNetworkAccess: 'Enabled'
    networkAclBypass: 'AzureServices'
  }
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: 'marketing-planner'
  properties: {
    resource: { id: 'marketing-planner' }
  }
}

// All containers (think: tables). Each has a partition key chosen for
// query efficiency — we partition by the field we most often filter on.
var containerDefs = [
  { name: 'visits',              partitionKey: '/date' }
  { name: 'spending',            partitionKey: '/visitId' }
  { name: 'businessReferrals',   partitionKey: '/name' }
  { name: 'businesses',          partitionKey: '/type' }
  { name: 'announcements',       partitionKey: '/id' }
  { name: 'observances',         partitionKey: '/id' }
  { name: 'tierThresholds',      partitionKey: '/type' }
  { name: 'activityLog',         partitionKey: '/date' }
  { name: 'members',             partitionKey: '/id' }
  { name: 'monthlyConversions',  partitionKey: '/memberName' }
  { name: 'sideActivities',      partitionKey: '/memberName' }
  { name: 'weeklyTargets',       partitionKey: '/memberName' }
]

resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = [for c in containerDefs: {
  parent: cosmosDb
  name: c.name
  properties: {
    resource: {
      id: c.name
      partitionKey: {
        paths: [ c.partitionKey ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
      }
    }
  }
}]

// ════════════════════════════════════════════════════════════════════════════
// STORAGE ACCOUNT — Function App deployment + Application Insights backing
// ════════════════════════════════════════════════════════════════════════════
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: stName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

// ════════════════════════════════════════════════════════════════════════════
// APPLICATION INSIGHTS — monitoring + error tracking
// ════════════════════════════════════════════════════════════════════════════
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: aiName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 90
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ════════════════════════════════════════════════════════════════════════════
// KEY VAULT — stores secrets (Cosmos primary key)
// ════════════════════════════════════════════════════════════════════════════
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
}

resource cosmosKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'cosmos-key'
  properties: {
    value: cosmos.listKeys().primaryMasterKey
    contentType: 'text/plain'
  }
}

// ════════════════════════════════════════════════════════════════════════════
// STATIC WEB APP — hosts the HTML + integrated Functions API
// ════════════════════════════════════════════════════════════════════════════
// SWA can be created in two modes:
//   • enableGitHubIntegration=false  → "manual" mode. We push the HTML+API
//     via Azure CLI (swa deploy). This is what we use on first run because
//     the GitHub repo may not exist yet.
//   • enableGitHubIntegration=true   → SWA pulls from GitHub on every push.
//     Re-run the Bicep with this flag once the repo + PAT exist.
resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'   // Required for Entra ID auth + custom domain
  }
  properties: enableGitHubIntegration ? {
    repositoryUrl: repoUrl
    branch: repoBranch
    repositoryToken: repoToken
    buildProperties: {
      appLocation: '/'             // HTML lives at repo root
      apiLocation: 'api'           // Functions in /api folder
      outputLocation: ''           // Static HTML; no build step
    }
    provider: 'GitHub'
    enterpriseGradeCdnStatus: 'Disabled'
  } : {
    provider: 'None'   // Manual deployment via "az staticwebapp deploy"
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

// App settings — environment variables the Functions API reads
resource swaSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    COSMOS_ENDPOINT: cosmos.properties.documentEndpoint
    COSMOS_DB_NAME: 'marketing-planner'
    COSMOS_KEY: '@Microsoft.KeyVault(SecretUri=${cosmosKeySecret.properties.secretUri})'
    APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
    NODE_ENV: 'production'
  }
}

// ════════════════════════════════════════════════════════════════════════════
// OUTPUTS — values printed after deployment, used by deploy scripts + admins
// ════════════════════════════════════════════════════════════════════════════
output staticWebAppName     string = swa.name
output staticWebAppUrl      string = 'https://${swa.properties.defaultHostname}'
output cosmosEndpoint       string = cosmos.properties.documentEndpoint
output cosmosDatabaseName   string = cosmosDb.name
output keyVaultName         string = kv.name
output cosmosKeyVaultRef    string = cosmosKeySecret.properties.secretUri
output appInsightsKey       string = appInsights.properties.InstrumentationKey
output resourceGroupName    string = resourceGroup().name
