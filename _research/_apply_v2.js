// V2: Apply address enrichments using proper string-aware brace tracking.
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\Users\\roses\\CODE PROJECT\\marketing_schedule_FINAL4.html';
const RESULTS = 'C:\\Users\\roses\\CODE PROJECT\\_research\\address_research_results.json';

const results = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));

function norm(s){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function key(name, city){ return norm(name) + '|' + norm(city); }

const enrichments = {};
for (const f of results.found) {
  if (f.matchConfidence === 'low') continue;
  const k = key(f.name || f.firm, f.city);
  if (!enrichments[k]) enrichments[k] = f.address;
}
console.log('Loaded enrichments:', Object.keys(enrichments).length);

const src = fs.readFileSync(SRC, 'utf8');
const lines = src.split(/\r?\n/);

// Walk a region with proper string + escape handling.
// Returns array of {startIdx, endIdx, depth} for each top-level object boundary in the region.
function findTopLevelObjects(startLine /*1-based incl*/, endLine /*1-based incl*/) {
  const objects = [];
  let depth = 0;        // tracks nesting INSIDE the outer array; we expect to be inside the outer [ ... ] from startLine.
  let inString = false;
  let escape = false;
  let curObjStart = null; // line index (0-based) of '{' opening current top-level object
  // The outer `[` is in lines[startLine-1]. We skip until we see `[`.
  let sawOuterOpen = false;
  for (let i = startLine - 1; i < endLine; i++) {
    const ln = lines[i];
    for (let j = 0; j < ln.length; j++) {
      const ch = ln[j];
      if (inString) {
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = false; continue; }
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (!sawOuterOpen) {
        if (ch === '[') sawOuterOpen = true;
        continue;
      }
      if (ch === '{') {
        if (depth === 0) {
          curObjStart = i;
        }
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          objects.push({ startLine: curObjStart, endLine: i, endCol: j });
          curObjStart = null;
        }
      } else if (ch === ']' && depth === 0) {
        // end of array
        return objects;
      }
    }
  }
  return objects;
}

// For each object slice, parse it as JSON and extract name+city+address
function parseObject(startLine, endLine /*line indices, 0-based incl*/) {
  let slice = lines.slice(startLine, endLine + 1).join('\n');
  // Strip trailing whitespace + comma (the comma separates entries in the array)
  slice = slice.replace(/,\s*$/, '').trim();
  // Try strict JSON parse
  try {
    return JSON.parse(slice);
  } catch (e) {
    // fallback: try eval (some entries may have JS syntax)
    try {
      return new Function('return ' + slice + ';')();
    } catch (e2) {
      return null;
    }
  }
}

// Find the line/col of the closing '}' relative to lines.
// Also find address line if present.
function locateAddressLine(startLine, endLine) {
  for (let i = startLine; i <= endLine; i++) {
    if (/"address"\s*:/.test(lines[i])) return i;
  }
  return -1;
}

const lineEdits = new Map(); // 0-based line idx → new line text
const insertBefore = new Map(); // 0-based line idx → array of new lines

function jsonEscape(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function applyToObjects(objects, nameKey, label) {
  let applied = 0;
  let updated = 0;
  let inserted = 0;
  let alreadyOK = 0;
  let noMatch = 0;
  let parseFail = 0;
  for (const o of objects) {
    const parsed = parseObject(o.startLine, o.endLine);
    if (!parsed) { parseFail++; continue; }
    const name = parsed[nameKey];
    const city = parsed[nameKey === 'n' ? 'c' : 'city'];
    if (!name) continue;
    const k = key(name, city);
    const addr = enrichments[k];
    if (!addr) { noMatch++; continue; }
    const existing = parsed.address;
    if (existing && existing.trim() && existing.trim().toUpperCase() !== 'TBD') {
      alreadyOK++;
      continue;
    }
    const addrLine = locateAddressLine(o.startLine, o.endLine);
    if (addrLine !== -1) {
      // Replace empty/TBD address
      const original = lineEdits.get(addrLine) || lines[addrLine];
      const replaced = original.replace(/"address"\s*:\s*"[^"]*"/, '"address": "' + jsonEscape(addr) + '"');
      if (replaced !== original) {
        lineEdits.set(addrLine, replaced);
        applied++; updated++;
      }
    } else {
      // Need to insert. Find last non-empty content line before the closing brace line.
      let prev = o.endLine - 1;
      while (prev > o.startLine && lines[prev].trim() === '') prev--;
      const prevLineText = lineEdits.get(prev) || lines[prev];
      let newPrev = prevLineText;
      if (!/,\s*$/.test(prevLineText.replace(/\s+$/, ''))) {
        newPrev = prevLineText.replace(/(\s*)$/, ',$1');
      }
      lineEdits.set(prev, newPrev);
      // Determine indent from prev line
      const indentMatch = prevLineText.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '    ';
      const ins = insertBefore.get(o.endLine) || [];
      ins.push(indent + '"address": "' + jsonEscape(addr) + '"');
      insertBefore.set(o.endLine, ins);
      applied++; inserted++;
    }
  }
  console.log(label, { total: objects.length, applied, updated, inserted, alreadyOK, noMatch, parseFail });
}

const clinicObjs = findTopLevelObjects(41984, 45795);
console.log('Clinic objects parsed:', clinicObjs.length);
applyToObjects(clinicObjs, 'n', 'CLINIC');

const mvaObjs = findTopLevelObjects(5235, 5892);
console.log('MVA objects parsed:', mvaObjs.length);
applyToObjects(mvaObjs, 'firm', 'MVA');

// Rebuild
const out = [];
for (let i = 0; i < lines.length; i++) {
  if (insertBefore.has(i)) {
    for (const newLine of insertBefore.get(i)) out.push(newLine);
  }
  out.push(lineEdits.has(i) ? lineEdits.get(i) : lines[i]);
}

const usesCRLF = src.includes('\r\n');
const newContent = out.join('\n');
const finalContent = usesCRLF ? newContent.replace(/\n/g, '\r\n') : newContent;

const backupPath = SRC + '.before-address-enrichment.bak';
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, src);
  console.log('Backup written:', backupPath);
}

fs.writeFileSync(SRC, finalContent);
console.log('Wrote updated HTML');
