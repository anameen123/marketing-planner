// ════════════════════════════════════════════════════════════════════════════
// Cosmos DB client + container accessors
// ────────────────────────────────────────────────────────────────────────────
// Single shared Cosmos client across all functions. The endpoint + key are
// injected via Static Web App app settings (which read from Key Vault).
// Containers are lazily created on first read — useful when running locally
// before the Bicep deployment has been applied.
// ════════════════════════════════════════════════════════════════════════════

import { CosmosClient } from '@azure/cosmos';

const endpoint = process.env.COSMOS_ENDPOINT;
const key      = process.env.COSMOS_KEY;
const dbName   = process.env.COSMOS_DB_NAME || 'marketing-planner';

if (!endpoint || !key) {
  // Functions can still load — but any call will fail with a clear error.
  // We don't throw at module-load because Functions Core Tools loads ALL
  // functions at startup and one missing env var would break the whole app.
  console.warn('[cosmos] COSMOS_ENDPOINT or COSMOS_KEY missing. API will return 500 on data calls.');
}

const client = endpoint && key
  ? new CosmosClient({ endpoint, key })
  : null;

export function getDb() {
  if (!client) throw new Error('Cosmos client not initialized — COSMOS_ENDPOINT / COSMOS_KEY missing');
  return client.database(dbName);
}

export function container(name) {
  return getDb().container(name);
}

// Convenience wrappers used by every endpoint. Each returns a promise.

/** Fetch all documents in a container, optionally filtered by a SQL query. */
export async function queryAll(containerName, sqlQuery, parameters = []) {
  const c = container(containerName);
  const { resources } = await c.items
    .query({ query: sqlQuery, parameters })
    .fetchAll();
  return resources;
}

/** Fetch one document by id + partitionKey. */
export async function fetchOne(containerName, id, partitionKey) {
  const c = container(containerName);
  try {
    const { resource } = await c.item(id, partitionKey).read();
    return resource;
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

/** Insert or update. Returns the saved document. */
export async function upsert(containerName, doc) {
  const c = container(containerName);
  const { resource } = await c.items.upsert(doc);
  return resource;
}

/** Delete by id + partitionKey. Throws on 404. */
export async function remove(containerName, id, partitionKey) {
  const c = container(containerName);
  await c.item(id, partitionKey).delete();
}
