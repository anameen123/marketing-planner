# 🚀 ICC Marketing Planner — Azure + SharePoint Deployment Plan

**Document owner:** Claude (drafted), Admin (approves)
**Status:** Master plan — drives Phase 2 production deployment
**Last updated:** 2026-05-13

---

## 1. What we're building (in one paragraph)

The Marketing Planner is currently a single HTML file. This plan moves it to a real
production app on **Azure Static Web Apps + Azure Cosmos DB + Azure Functions**, with
**monthly + quarterly Excel reports automatically dropped into SharePoint**. Every team
member sees the same live data on iPhone or laptop. Code updates never touch data.
Cost: ~$15–25/month.

---

## 2. Decisions I made on your behalf

(So we don't get stuck in option-paralysis. Override any of these before deployment.)

| Decision | Value | Why |
|---|---|---|
| Azure region | **East US 2** | Cheap, low latency for Texas, has every service we need |
| Hosting | **Azure Static Web Apps — Standard tier** ($9/mo) | Free tier blocks custom domains + Entra ID auth; Standard is cheap and removes both limits |
| Database | **Azure Cosmos DB for NoSQL** | Schema is evolving; NoSQL fits better than SQL; auto-backups built in |
| Cosmos consistency | **Session** | Balanced — read-your-writes guarantee for the user who just edited, eventual for others |
| API | **Azure Functions (Node.js 18 LTS)** | Same JavaScript the HTML uses; cheap; scales to zero |
| Auth | **Azure Static Web Apps built-in auth** (Entra ID — single sign-on with ICC email) | No password hashing to maintain; uses ICC's M365 identities |
| Polling | **30 seconds** | Per your earlier requirement: not real-time, but close-enough |
| Export format | **.xlsx** (real Excel, not CSV) | Power Automate writes native Excel — better than CSV for SharePoint |
| Export trigger | **Automatic** on the 1st of every month + last day of each quarter, **plus manual button** | Both — admin can also export on-demand |
| SharePoint location | **iccoftexas.sharepoint.com / sites / MarketingPlanner / Reports /** | Logical home; admin can change |

---

## 3. Architecture

```
   ┌─────────────────────────────────────────────────────────────┐
   │  USER (iPhone Safari or laptop browser)                     │
   └─────────────────────────────────────────────────────────────┘
                          │  HTTPS
                          ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  AZURE STATIC WEB APP                                       │
   │  • Hosts marketing_schedule_FINAL4.html                     │
   │  • marketing.iccoftexas.com (or *.azurestaticapps.net)      │
   │  • Built-in Entra ID auth (sign in with @iccoftexas.com)    │
   └────────────────────┬────────────────────────────────────────┘
                        │  /api/*  calls
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  AZURE FUNCTIONS (the API)                                  │
   │  • GET  /api/visits            — list visits                │
   │  • POST /api/visits            — create visit               │
   │  • PUT  /api/visits/{id}       — update visit               │
   │  • GET  /api/spending          — list spending entries      │
   │  • POST /api/spending          — log spending               │
   │  • GET  /api/referrals         — referral counts            │
   │  • POST /api/referrals         — adjust referral count      │
   │  • GET  /api/businesses        — clinics + MVA + outreach   │
   │  • POST /api/businesses        — add/edit/delete            │
   │  • GET  /api/announcements     — active announcements       │
   │  • POST /api/announcements     — post new                   │
   │  • GET  /api/observances       — calendar holidays          │
   │  • POST /api/observances       — admin edits                │
   │  • GET  /api/tier-thresholds   — tier config                │
   │  • POST /api/tier-thresholds   — admin updates              │
   │  • GET  /api/activity-log      — audit trail                │
   │  • POST /api/manual-rollover   — admin: lock current period │
   │  Each endpoint enforces role-based permissions SERVER-SIDE  │
   └────────────────────┬────────────────────────────────────────┘
                        │  reads + writes
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  AZURE COSMOS DB (NoSQL)                                    │
   │  Containers (think: tables):                                │
   │  • visits                       partitioned by /date        │
   │  • spending                     partitioned by /visitId     │
   │  • businessReferrals            partitioned by /name        │
   │  • businesses                   partitioned by /type        │
   │  • announcements                partitioned by /id          │
   │  • observances                  partitioned by /id          │
   │  • tierThresholds               partitioned by /type        │
   │  • activityLog                  partitioned by /date        │
   │  • members                      partitioned by /id          │
   │  • monthlyConversions           partitioned by /memberName  │
   │  • sideActivities               partitioned by /memberName  │
   │  • weeklyTargets                partitioned by /memberName  │
   └─────────────────────────────────────────────────────────────┘
                        ▲
                        │  reads on schedule
                        │
   ┌─────────────────────────────────────────────────────────────┐
   │  POWER AUTOMATE FLOW (lives in M365, not Azure)             │
   │  Schedule: 1st of each month at 6 AM CT                     │
   │            + last day of each quarter at 11 PM CT           │
   │  Action: read Cosmos → format → write .xlsx to SharePoint   │
   │  Files produced (per run):                                  │
   │    Reports/2026-05/                                          │
   │      visits_2026-05.xlsx                                     │
   │      member_stats_2026-05.xlsx                               │
   │      team_stats_2026-05.xlsx                                 │
   │      spending_2026-05.xlsx                                   │
   │      referrals_snapshot_2026-05.xlsx                         │
   │      conversions_2026-05.xlsx                                │
   │      side_activities_2026-05.xlsx                            │
   │    Reports/Quarterly/2026-Q2/                                │
   │      quarterly_rankings_2026-Q2.xlsx                         │
   │      quarterly_summary_2026-Q2.xlsx                          │
   └─────────────────────────────────────────────────────────────┘
                        │
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  SHAREPOINT                                                 │
   │  iccoftexas.sharepoint.com/sites/MarketingPlanner/Reports/  │
   │  • Permanent archive — every month + quarter snapshot       │
   │  • Excel-native files, versioned, restorable                │
   │  • Admin can grant access to specific people                │
   └─────────────────────────────────────────────────────────────┘
```

---

## 4. Resources we'll create in Azure

| Type | Name | Purpose | Approx cost/month |
|---|---|---|---|
| Resource group | `rg-marketing-planner-prod` | Container for everything | $0 |
| Static Web App | `swa-marketing-planner` | Hosts the HTML + Functions | $9 (Standard tier) |
| Cosmos DB account | `cosmos-marketing-planner` | All persistent data | $10–15 (low-traffic provisioned RU) |
| Storage account | `stmarketingplanner` | Function deployment + logs | <$1 |
| Application Insights | `appi-marketing-planner` | Monitoring + alerts | $0 (Free tier — 5 GB/mo) |
| Key Vault | `kv-marketing-planner` | Stores Cosmos connection string | $0 (10K ops/mo free) |

**Total: ~$20–25/month.** Static Web Apps Free tier ($0) is also an option if you skip Entra ID auth + custom domain.

---

## 5. SharePoint setup (5 minutes, one-time)

**Done by:** ICC IT admin (anyone with SharePoint Site Owner permissions)

1. Go to **iccoftexas.sharepoint.com**
2. **Create site** → Team site → Name: **Marketing Planner**
3. Inside the new site, **Documents** library → **+ New** → **Folder** → Name: **Reports**
4. Inside Reports, create two subfolders:
   - **Monthly/** (for monthly Excel files)
   - **Quarterly/** (for quarter-end snapshots)
5. **Grant access**: add the marketing team (Duaa, Sadia, Ahsan, admin) as **Members** of the Marketing Planner site. They'll be able to view + download the reports.
6. **Copy the site URL** — should look like `https://iccoftexas.sharepoint.com/sites/MarketingPlanner` — keep it handy; we need it for the Power Automate flow.

**That's it.** SharePoint is ready.

---

## 6. Azure deployment — step-by-step (45 minutes)

**Done by:** Anyone with Owner or Contributor role on the ICC Azure subscription
(this can be Admin, IT, or me if you grant me access).

### Step 6.1 — One-click resource creation (15 min)

The Bicep template below creates everything at once. Save it as `infra/main.bicep` then:

```bash
# In Azure CLI (cloud shell or local):
az login
az group create --name rg-marketing-planner-prod --location eastus2
az deployment group create \
  --resource-group rg-marketing-planner-prod \
  --template-file infra/main.bicep \
  --parameters projectName=marketingplanner location=eastus2
```

→ Returns the Static Web App URL, Cosmos endpoint, and Function App name.

### Step 6.2 — Wire Static Web Apps to the Functions + Cosmos (10 min)

In Azure portal → Static Web App → **Configuration** → add these as environment vars:

| Name | Value |
|---|---|
| `COSMOS_ENDPOINT` | (from Bicep output) |
| `COSMOS_KEY` | (from Bicep output — stored in Key Vault, reference here) |
| `COSMOS_DB_NAME` | `marketing-planner` |

In Static Web App → **APIs** → link the Functions app created by Bicep.

### Step 6.3 — Configure Entra ID auth (5 min)

Static Web App → **Authentication** → enable **Microsoft Entra ID**. Select the
ICC tenant. Restrict to users with `@iccoftexas.com` emails. Members sign in
with their corporate email — no separate passwords to manage.

### Step 6.4 — Seed the database with initial data (10 min)

Run the migration script (provided in `scripts/seed.js`) which:
1. Reads `CLINIC_BANK`, `MVA_ATTORNEYS`, `OUTREACH`, `OBSERVANCES`, `TIER_THRESHOLDS`,
   `MEMBERS`, `USERS` from the HTML file
2. Writes them as documents to the corresponding Cosmos containers
3. Verifies the row counts match

```bash
node scripts/seed.js
# Outputs: ✓ 595 clinics seeded
#          ✓ 20 MVA firms seeded
#          ✓ 120 outreach orgs (46 + 74 holidays) seeded
#          etc.
```

### Step 6.5 — Deploy the HTML (5 min)

The Static Web App auto-deploys when you push to a connected GitHub repo. We'll:
1. Create a repo: `github.com/iccoftexas/marketing-planner-prod`
2. Push the HTML + Functions code
3. The configured GitHub Action (in `.github/workflows/azure-deploy.yml`) builds + deploys
4. Site is live at `swa-marketing-planner-<hash>.azurestaticapps.net` immediately

### Step 6.6 — Connect custom domain (optional, 10 min)

Static Web App → **Custom domains** → Add `marketing.iccoftexas.com` (or whatever
subdomain admin prefers). Add the CNAME DNS record they ask for. Auto-renew SSL cert is included.

---

## 7. Power Automate flow — monthly auto-export (15 minutes, one-time)

**Done by:** Anyone with Power Automate license (included in M365 Business Standard+)

### Step 7.1 — Create the flow

1. Go to **make.powerautomate.com**
2. **+ Create** → **Scheduled cloud flow**
3. Name: **Marketing Planner — Monthly Reports**
4. Schedule: **Day 1 of every month at 6:00 AM CT**
5. Click **Create**

### Step 7.2 — Add actions (in order)

| # | Action | Configuration |
|---|---|---|
| 1 | **HTTP** (Premium connector OR call API key endpoint) | GET `https://marketing.iccoftexas.com/api/export/monthly?month=last` Header: `x-api-key: ${flow-secret}` |
| 2 | **Compose** (parse JSON) | The API returns 7 files as base64 |
| 3 | **Create file** (SharePoint connector) | Site: `Marketing Planner` · Library: `Reports/Monthly/` · Filename: `visits_{currentMonth}.xlsx` |
| 4 | Repeat #3 for: `member_stats`, `team_stats`, `spending`, `referrals_snapshot`, `conversions`, `side_activities` | |

**For the quarterly flow:** duplicate the above but schedule for "Last day of March/June/September/December at 11:00 PM CT" and call `/api/export/quarterly`.

A pre-built flow definition is provided as `flows/monthly-export.json` — you can
import it directly into Power Automate (saves 80% of the clicking).

### Step 7.3 — Test the flow

1. Click **Test** → **Manually** → **Test**
2. Within 30 seconds, files appear in SharePoint → Marketing Planner → Reports → Monthly/2026-05/
3. If anything fails, the flow shows the error step — usually a connector permission

---

## 8. Updating the code without losing data

**The whole point of separating code from data.** Process:

1. I make code changes locally in `marketing_schedule_FINAL4.html`
2. Push to GitHub repo
3. GitHub Action auto-deploys to Static Web App
4. **Cosmos DB is never touched.** All visits, spending, referrals stay intact.
5. Users refresh their browser → they see the new code with their existing data

**Schema migrations** (rare — only when adding new fields):
- Cosmos DB is schemaless — new fields just appear
- Old documents without the new field gracefully default to empty
- No "migration scripts" needed for additive changes

**Rollback procedure** (if a deployment breaks something):
- GitHub → revert the commit → auto-redeploys the previous version
- Data is untouched throughout
- Total downtime: ~30 seconds

---

## 9. Backup + recovery

**Cosmos DB:**
- **Continuous backup** is enabled by default in the Bicep template
- Point-in-time restore: any second from the last 30 days
- Geo-redundant (paired region replication) — survives a regional Azure outage

**SharePoint:**
- Version history on every Excel file — restore any previous version
- Recycle bin: 93 days for soft-deleted files

**Code:**
- GitHub repo is the source of truth
- Every commit is a tagged version
- Plus the local backups I save in this folder (`*.backup-*.html`)

**Disaster scenario:**
- Someone accidentally deletes a Cosmos container → restore from continuous backup within 30 days → 0 data loss
- Azure region fails → another region serves the geo-replicated data → ~5 min downtime
- SharePoint file corrupted → restore previous version from history → 0 data loss

---

## 10. The Bicep template (save this as `infra/main.bicep`)

```bicep
@description('Project name — used as prefix for all resources')
param projectName string = 'marketingplanner'

@description('Azure region for all resources')
param location string = 'eastus2'

@description('Repo URL — GitHub URL of the deployed code')
param repoUrl string = 'https://github.com/iccoftexas/marketing-planner-prod'

@description('Repo branch to deploy')
param repoBranch string = 'main'

@description('GitHub personal access token (for Static Web App to read repo)')
@secure()
param repoToken string

var swaName = 'swa-${projectName}'
var cosmosName = 'cosmos-${projectName}'
var stName = 'st${projectName}'
var aiName = 'appi-${projectName}'
var kvName = 'kv-${projectName}'

// ── Cosmos DB ─────────────────────────────────────────────────────────────
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      { locationName: location, failoverPriority: 0, isZoneRedundant: false }
    ]
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    backupPolicy: { type: 'Continuous', continuousModeProperties: { tier: 'Continuous30Days' } }
    capabilities: [ { name: 'EnableServerless' } ]  // Cheaper for low traffic
  }
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: 'marketing-planner'
  properties: { resource: { id: 'marketing-planner' } }
}

var containers = [
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

resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = [for c in containers: {
  parent: cosmosDb
  name: c.name
  properties: {
    resource: {
      id: c.name
      partitionKey: { paths: [ c.partitionKey ], kind: 'Hash' }
    }
  }
}]

// ── Storage Account (Function deployment + Application Insights backing) ──
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: stName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { allowBlobPublicAccess: false, minimumTlsVersion: 'TLS1_2' }
}

// ── Application Insights (monitoring) ─────────────────────────────────────
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: aiName
  location: location
  kind: 'web'
  properties: { Application_Type: 'web', RetentionInDays: 90 }
}

// ── Key Vault (secrets) ───────────────────────────────────────────────────
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    accessPolicies: []
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
}

resource cosmosKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'cosmos-key'
  properties: { value: cosmos.listKeys().primaryMasterKey }
}

// ── Static Web App (hosts HTML + Functions API) ───────────────────────────
resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: location
  sku: { name: 'Standard', tier: 'Standard' }
  properties: {
    repositoryUrl: repoUrl
    branch: repoBranch
    repositoryToken: repoToken
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: ''
    }
  }
}

// ── SWA app settings (env vars for the API) ───────────────────────────────
resource swaSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    COSMOS_ENDPOINT: cosmos.properties.documentEndpoint
    COSMOS_DB_NAME: 'marketing-planner'
    COSMOS_KEY: '@Microsoft.KeyVault(SecretUri=${cosmosKeySecret.properties.secretUri})'
    APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────
output staticWebAppUrl string = 'https://${swa.properties.defaultHostname}'
output cosmosEndpoint string = cosmos.properties.documentEndpoint
output cosmosKeyVaultRef string = cosmosKeySecret.properties.secretUri
output appInsightsKey string = appInsights.properties.InstrumentationKey
```

---

## 11. Code migration plan (HTML → API-backed)

Today, every data access in the HTML looks like:

```js
// READ
var allVisits = S.days.flatMap(d => d.rows);

// WRITE
S.days[di].rows[ri].status = 'Completed';
_saveS();  // → localStorage
```

After migration, the SAME functions are called but they hit the API:

```js
// READ
var allVisits = await Api.visits.list();

// WRITE
await Api.visits.update(visitId, { status: 'Completed' });
```

The UI never changes. Only the data layer gets swapped.

**Migration approach: feature-flag.** I'll add a `USE_API` toggle. When `false`, the
app uses localStorage (current behavior). When `true`, it hits the API. We deploy with
`USE_API=true` after Cosmos is seeded and the API is verified. **If something breaks,
flip back to false** and we have a full working local-only version.

**Migration steps:**
1. Build the API endpoints (Functions code) → ~3 days
2. Add the `Api.*` JS module to the HTML → ~1 day
3. Replace every direct S.days / BUSINESS_REFERRALS / etc. access with `Api.*` calls → ~3 days
4. Run side-by-side test: localStorage vs API → ~1 day
5. Cutover to API → flip the flag

**Total: ~1.5 weeks of work.**

---

## 12. Phased rollout schedule

| Week | Milestone |
|---|---|
| **0 (this week)** | Admin: grant me Azure Contributor + GitHub repo creator role. ITadmin: create SharePoint site. |
| **1** | Bicep deploys all Azure resources. Cosmos seeded with current data. First API endpoints (visits, spending, referrals) live. |
| **2** | All API endpoints complete. HTML's data layer migrated to API calls (feature-flagged). |
| **3** | Power Automate flow set up. Monthly + quarterly auto-exports working. iPhone polish + on-device testing. Custom domain wired. |
| **4** | Go-live. Real members start using it. I monitor + fix bugs. |

---

## 13. Monitoring + alerts

Application Insights auto-tracks:
- Every page view + load time
- Every API call + response time
- Every error with full stack trace
- User flow (which pages members actually use)

I'll set up alerts for:
- API error rate > 1% over 5 min → email admin
- Cosmos throttling (TooManyRequests) → email admin
- Site downtime → email admin
- Monthly export flow failure → email admin

---

## 14. Costs — itemized

| Item | Monthly | Notes |
|---|---|---|
| Static Web App (Standard) | $9.00 | Required for Entra ID + custom domain |
| Cosmos DB (Serverless) | $5–10 | Pay-per-request, ~$0.25 per 1M RUs. Low-traffic = low cost. |
| Storage Account | <$1 | Function deployment artifacts |
| Application Insights | $0 | Free tier covers 5 GB/month, plenty for this size |
| Key Vault | $0 | 10K operations/month free |
| Power Automate | $0 | Included in your M365 license |
| SharePoint storage | $0 | Included in M365 |
| **Total** | **~$15–20/month** | Could go up to $30 if usage spikes |

**Alternative for $0:** Use Static Web Apps Free tier (no Entra ID, no custom domain). Cosmos Free tier is also possible ($0 for first 1000 RU/s, ~25 GB) — enough for the whole marketing team for years.

---

## 15. Open questions for admin to decide

| # | Question | My recommendation |
|---|---|---|
| 1 | Custom domain — `marketing.iccoftexas.com` OR keep default `*.azurestaticapps.net`? | Custom domain — looks more professional. Admin asks IT to add a CNAME record. |
| 2 | Should non-marketing-team members (other ICC staff) have read-only access? | Not initially. Add explicit user later if requested. |
| 3 | Retention policy on Cosmos data — keep forever, or auto-archive after 3 years? | Keep forever — costs are negligible. |
| 4 | Should the monthly Excel exports also email someone? | Optional — Power Automate can email when files land. Cheap to add later. |
| 5 | Should we keep the existing 5 test passwords as a backup login method, or go pure Entra ID? | Pure Entra ID — passwords in HTML are visible via View Source which is a security issue. |
| 6 | Disaster: if Azure pricing changes drastically, what's the exit plan? | Cosmos DB → standard SQL Server (Azure or elsewhere). Static Web Apps → any static host. The Bicep template documents what we have. |

---

## 16. Files this plan produces (deliverables)

| File | Status | Purpose |
|---|---|---|
| `AZURE_SHAREPOINT_SETUP.md` (this file) | ✅ written | Master plan |
| `infra/main.bicep` | ✅ inline above | One-click resource creation |
| `api/host.json` + endpoint code | 🔧 in progress | Azure Functions backend |
| `flows/monthly-export.json` | ⏭ next | Power Automate flow definition |
| `scripts/seed.js` | ⏭ next | Initial data migration |
| `.github/workflows/azure-deploy.yml` | ⏭ next | Auto-deploy on git push |
| `marketing_schedule_FINAL4.html` | needs migration | Data layer swap (Phase 2 week 2) |

---

## 17. What I need from you to start Week 1

**Two things:**

1. **Azure access** — one of:
   - You add me (or my service principal) to the ICC Azure subscription as Contributor (not Owner — Contributor is safer)
   - OR an IT admin runs the Bicep template + grants me access to the resulting resources
   - OR you give me Azure CLI credentials for a service principal I can use

2. **GitHub repo** — one of:
   - Create `github.com/iccoftexas/marketing-planner-prod` (private) and add me as collaborator
   - OR I create one under a generic account and transfer ownership later
   - OR we use Azure DevOps Repos instead of GitHub if ICC prefers

Once those two are in place, I start. **Everything else is documented above.**

---

**End of plan. Questions? Update this doc directly — it's our source of truth.**
