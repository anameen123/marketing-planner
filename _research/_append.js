// Helper script to append entries to address_research_results.json
// Usage: node _append.js path-to-batch-additions.json
const fs = require('fs');
const path = require('path');
const ROOT = 'C:\\Users\\roses\\CODE PROJECT\\_research';
const RESULTS = path.join(ROOT, 'address_research_results.json');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node _append.js <batch.json>');
  process.exit(1);
}

const additions = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const results = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));

function norm(s){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function key(e){ return norm(e.name || e.firm) + '|' + norm(e.city); }

const seen = new Set();
for (const e of results.found) seen.add(key(e));
for (const e of results.notFound) seen.add(key(e));

let addedF = 0, addedN = 0, dup = 0;
for (const f of (additions.found || [])) {
  if (seen.has(key(f))) { dup++; continue; }
  results.found.push(f);
  seen.add(key(f));
  addedF++;
}
for (const n of (additions.notFound || [])) {
  if (seen.has(key(n))) { dup++; continue; }
  results.notFound.push(n);
  seen.add(key(n));
  addedN++;
}
if (additions.stoppedAt !== undefined) results.stoppedAt = additions.stoppedAt;

results.generatedAt = new Date().toISOString();
fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2));
console.log(`Appended ${addedF} found, ${addedN} notFound (skipped ${dup} dups). Totals: found=${results.found.length}, notFound=${results.notFound.length}`);
