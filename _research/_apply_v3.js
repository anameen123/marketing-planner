// V3 (2026-05-28) — Apply Phase 48 address research results.
// FIXED: properly bound the address lookup to the SAME JSON object using
// brace tracking, so we don't write to the next entry by accident.
const fs = require('fs');
const path = require('path');

const SRC     = path.join(__dirname, '..', 'marketing_schedule_FINAL4.html');
const BACKUP  = path.join(__dirname, '..', 'marketing_schedule_FINAL4.html.backup-before-phase48.html');
const RESULTS = path.join(__dirname, 'address_research_results_v2.json');

if(!fs.existsSync(RESULTS)){
  console.error('[apply_v3] Results file not found:', RESULTS);
  process.exit(1);
}
const results = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
if(!Array.isArray(results)){
  console.error('[apply_v3] Results file is not an array');
  process.exit(1);
}

const goodResults = results.filter(r =>
  r && r.address && r.address.length > 8 &&
  (r.confidence === 'high' || r.confidence === 'medium')
);
console.log('[apply_v3] Loaded', results.length, 'entries · applying', goodResults.length, '(high+medium with real address)');
const skipped = results.length - goodResults.length;
if(skipped > 0) console.log('[apply_v3] Skipped', skipped, '(not_found / low confidence / no address)');

let html = fs.readFileSync(SRC, 'utf8');
fs.writeFileSync(BACKUP, html);
console.log('[apply_v3] Backed up to', BACKUP);

// Walk from a position INSIDE an object and find its CLOSING brace, tracking
// nested braces + string literals. Returns the index of the closing '}'.
function findObjectEnd(text, startIdx){
  let depth = 1;            // we start at depth 1 (already inside one '{')
  let i = startIdx;
  let inStr = false, esc = false;
  while(i < text.length){
    const ch = text[i];
    if(inStr){
      if(esc){ esc = false; }
      else if(ch === '\\'){ esc = true; }
      else if(ch === '"'){ inStr = false; }
    } else {
      if(ch === '"'){ inStr = true; }
      else if(ch === '{'){ depth++; }
      else if(ch === '}'){ depth--; if(depth === 0) return i; }
    }
    i++;
  }
  return -1;
}

// From a position, walk BACKWARDS to find the matching opening '{' of the
// object containing that position. Same brace + string tracking.
function findObjectStart(text, fromIdx){
  let depth = 0;
  let i = fromIdx;
  // Track string state — note: walking backwards through quotes is unsafe
  // because we don't know which side we're starting from. So we re-scan the
  // text from the start, counting position vs target, to know if we're in
  // a string at fromIdx. For our case the names don't contain '{' or '}'
  // so we can skip string tracking when walking backwards from a known-safe
  // position (just after a name field).
  while(i >= 0){
    const ch = text[i];
    if(ch === '}'){ depth++; }
    else if(ch === '{'){ if(depth === 0) return i; depth--; }
    i--;
  }
  return -1;
}

let updateCount = 0, notFound = [], multipleMatches = [];
for(const r of goodResults){
  const key = r.key;
  if(!key) continue;
  const keyEsc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nameField = r.type === 'mva' ? 'firm' : 'n';
  const fieldRe = new RegExp('"' + nameField + '"\\s*:\\s*"' + keyEsc + '"', 'g');
  const matches = [...html.matchAll(fieldRe)];
  if(matches.length === 0){ notFound.push(key + ' (' + r.type + ')'); continue; }
  if(matches.length > 1){ multipleMatches.push(key + ' (' + matches.length + ' matches)'); }
  const matchIdx = matches[0].index;
  // Find the bounds of the containing object
  const objStart = findObjectStart(html, matchIdx - 1);
  const objEnd   = findObjectEnd(html, matchIdx + matches[0][0].length);
  if(objStart < 0 || objEnd < 0){ notFound.push(key + ' (could not bound object)'); continue; }
  // Now look for an existing "address" field STRICTLY within this object
  const objBody = html.slice(objStart, objEnd + 1);
  const addrRe  = /"address"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/;
  const addrMatch = objBody.match(addrRe);
  const newAddrEsc = String(r.address).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  let newObjBody;
  if(addrMatch){
    newObjBody = objBody.replace(addrMatch[0], '"address": "' + newAddrEsc + '"');
  } else {
    // Insert after the name field, inside this object. matchIdx is global;
    // convert to object-local by subtracting objStart.
    const localInsert = (matchIdx - objStart) + matches[0][0].length;
    newObjBody = objBody.slice(0, localInsert) + ',\n    "address": "' + newAddrEsc + '"' + objBody.slice(localInsert);
  }
  html = html.slice(0, objStart) + newObjBody + html.slice(objEnd + 1);
  updateCount++;
}

fs.writeFileSync(SRC, html);
console.log('[apply_v3] Applied', updateCount, 'address updates');
if(notFound.length > 0){
  console.log('[apply_v3] WARNING — could not locate / bound', notFound.length, 'entries:');
  notFound.slice(0, 10).forEach(n => console.log('  -', n));
}
if(multipleMatches.length > 0){
  console.log('[apply_v3] NOTE — multiple matches for these (used first):');
  multipleMatches.slice(0, 10).forEach(n => console.log('  -', n));
}
console.log('[apply_v3] Done. To revert: cp', BACKUP, SRC);
