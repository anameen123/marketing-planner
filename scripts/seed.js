#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// seed.js — Initial data migration from the HTML into Cosmos DB
// ────────────────────────────────────────────────────────────────────────────
// Reads the seed arrays embedded in marketing_schedule_FINAL4.html and writes
// each into the corresponding Cosmos container.
//
// Run once after Bicep has provisioned the resources.
//
// Usage:
//   $env:COSMOS_ENDPOINT="https://cosmos-marketingplanner.documents.azure.com:443/"
//   $env:COSMOS_KEY="<primary key>"
//   $env:COSMOS_DB_NAME="marketing-planner"
//   node scripts/seed.js
// ════════════════════════════════════════════════════════════════════════════

import { CosmosClient } from '@azure/cosmos';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, '..', 'marketing_schedule_FINAL4.html');

const endpoint = process.env.COSMOS_ENDPOINT;
const key      = process.env.COSMOS_KEY;
const dbName   = process.env.COSMOS_DB_NAME || 'marketing-planner';

if (!endpoint || !key) {
  console.error('❌ COSMOS_ENDPOINT and COSMOS_KEY environment variables are required.');
  console.error('   Get them from the Bicep deployment output or the Cosmos DB resource in Azure portal.');
  process.exit(1);
}

const client = new CosmosClient({ endpoint, key });
const db = client.database(dbName);

// ── Robust literal extractor ────────────────────────────────────────────────
// Pulls each `var NAME = <literal>;` out of the HTML and evaluates it in a
// fresh JS sandbox. Handles single quotes, comments, embedded quotes — all the
// edge cases that broke the previous regex-based JSON normalizer.
function extractLiteral(html, varName) {
  const startRe = new RegExp('^\\s*var\\s+' + varName + '\\s*=\\s*([\\[\\{])', 'm');
  const m = startRe.exec(html);
  if (!m) throw new Error('Could not find ' + varName + ' in HTML');
  const open = m[1];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let i = m.index + m[0].length - 1;  // index of the opening bracket
  let inString = null;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (; i < html.length; i++) {
    const ch = html[i];
    const next = html[i + 1];
    if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
    if (inBlockComment) { if (ch === '*' && next === '/') { inBlockComment = false; i++; } continue; }
    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) { i++; break; } }
  }
  const src = html.slice(m.index + m[0].length - 1, i);
  const sandbox = {};
  vm.createContext(sandbox);
  return vm.runInContext('(' + src + ')', sandbox, { timeout: 2000 });
}

async function upsertMany(containerName, docs) {
  const container = db.container(containerName);
  let success = 0, failed = 0;
  for (const doc of docs) {
    try {
      await container.items.upsert(doc);
      success++;
    } catch (err) {
      console.error(`  ✗ ${doc.id || doc.name} —`, err.message);
      failed++;
    }
  }
  return { success, failed };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌱 Seeding ${dbName} from ${path.basename(htmlPath)}\n`);

  const html = fs.readFileSync(htmlPath, 'utf8');

  // ── 1. Clinics ──────────────────────────────────────────────────────────
  console.log('Clinics...');
  const clinics = extractLiteral(html, 'CLINIC_BANK').map(c => ({
    id: 'clinic-' + (c.n || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
    type: 'clinic',
    category: null,
    name: c.n,
    doctor: c.d || '',
    specialty: c.s || '',
    city: c.c || '',
    notes: c.notes || '',
    status: 'Not Visited',
    addedBy: c.addedBy || 'seed',
    addedAt: c.addedAt || new Date().toISOString()
  }));
  const cR = await upsertMany('businesses', clinics);
  console.log(`  ✓ ${cR.success} clinics  (${cR.failed} failed)`);

  // ── 2. MVA Attorneys ────────────────────────────────────────────────────
  console.log('MVA attorneys...');
  const mva = extractLiteral(html, 'MVA_ATTORNEYS').map(m => ({
    id: 'mva-' + (m.firm || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
    type: 'mva',
    category: null,
    name: m.firm,
    attorney: m.attorney || '',
    city: m.city || '',
    phone: m.phone || '',
    address: m.address || '',
    notes: m.notes || '',
    status: m.status || 'Not Visited',
    addedBy: 'seed',
    addedAt: new Date().toISOString()
  }));
  const mR = await upsertMany('businesses', mva);
  console.log(`  ✓ ${mR.success} MVA firms  (${mR.failed} failed)`);

  // ── 3. Outreach (random + scheduled, NO holidays yet — handled below) ───
  console.log('Outreach orgs...');
  const outreach = extractLiteral(html, 'OUTREACH').map(o => ({
    id: o.id || ('co-' + (o.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-')),
    type: 'outreach',
    category: o.category || (['mosque', 'temple', 'church', 'synagogue', 'school'].includes(o.type) ? 'scheduled' : 'random'),
    name: o.name,
    outreachType: o.type || 'other',
    city: o.city || '',
    phone: o.phone || '',
    address: o.address || '',
    contact: o.contact || '',
    notes: o.notes || '',
    status: o.status || 'Not Visited',
    poolCap: typeof o.poolCap === 'number' ? o.poolCap : 0,
    addedBy: 'seed',
    addedAt: new Date().toISOString()
  }));
  const oR = await upsertMany('businesses', outreach);
  console.log(`  ✓ ${oR.success} outreach orgs  (${oR.failed} failed)`);

  // ── 4. Observances → outreach docs with category='holiday' ──────────────
  console.log('Observances → holiday outreach...');
  const observances = extractLiteral(html, 'OBSERVANCES').map(obs => ({
    id: 'co-h-' + obs.id,
    type: 'outreach',
    category: 'holiday',
    name: obs.name,
    outreachType: 'other',
    city: 'TBD',
    notes: (obs.desc || '') + (obs.date ? ' · ' + obs.date : ''),
    status: 'Not Visited',
    poolCap: 0,
    holidayDate: obs.date || '',
    observanceType: obs.type || 'other',
    addedBy: 'auto-import',
    addedAt: new Date().toISOString()
  }));
  const obsR = await upsertMany('businesses', observances);
  console.log(`  ✓ ${obsR.success} holiday cards  (${obsR.failed} failed)`);

  // ── 5. Tier thresholds ──────────────────────────────────────────────────
  console.log('Tier thresholds...');
  const tt = extractLiteral(html, 'TIER_THRESHOLDS');
  const tierDocs = ['clinic', 'mva', 'outreach'].map(t => ({
    id: 'tier-' + t,
    type: t,
    tiers: tt[t] || []
  }));
  const ttR = await upsertMany('tierThresholds', tierDocs);
  console.log(`  ✓ ${ttR.success} tier configs  (${ttR.failed} failed)`);

  // ── 6. Members ──────────────────────────────────────────────────────────
  console.log('Members...');
  const members = extractLiteral(html, 'MEMBERS').map(name => ({
    id: 'member-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name,
    isActive: true,
    addedAt: new Date().toISOString()
  }));
  const memR = await upsertMany('members', members);
  console.log(`  ✓ ${memR.success} members  (${memR.failed} failed)`);

  console.log('\n✅ Seeding complete.\n');
}

main().catch(err => {
  console.error('\n❌ Seeding failed:\n', err);
  process.exit(1);
});
