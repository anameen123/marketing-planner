// Apply address enrichments back to marketing_schedule_FINAL4.html
// Strategy: parse the source HTML to locate each clinic/MVA entry by name+city match,
// then insert/update the "address" field.

const fs = require('fs');
const path = require('path');

const SRC = 'C:\\Users\\roses\\CODE PROJECT\\marketing_schedule_FINAL4.html';
const RESULTS = 'C:\\Users\\roses\\CODE PROJECT\\_research\\address_research_results.json';

const results = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));

// Build a quick lookup: norm(name)|norm(city) → address
function norm(s){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function key(name, city){ return norm(name) + '|' + norm(city); }

// Only apply high and medium confidence to avoid wrong-city issues
const enrichments = {};
for (const f of results.found) {
  if (f.matchConfidence === 'low') continue; // skip low-confidence
  const k = key(f.name || f.firm, f.city);
  if (!enrichments[k]) enrichments[k] = f.address;
}

const src = fs.readFileSync(SRC, 'utf8');
const lines = src.split(/\r?\n/);

// Locate CLINIC_BANK (line 41821, 1-based) and MVA_ATTORNEYS (line 5235, 1-based) — both still hold
// Parse the source by reading the array region, identifying each object's start/end, name, city,
// and the position of the closing brace (so we can splice an address field in).

function processArrayRegion(startLine /* 1-based */, endLine /* 1-based, inclusive */, nameKey, cityKey) {
  // Build a flat array of {objStartIdx, objEndIdx, name, city, hasAddress, addressLineIdx, addressLineText}
  const objects = [];
  let inObj = false;
  let depth = 0;
  let objStart = null;
  let nameVal = '';
  let cityVal = '';
  let addrLineIdx = -1;
  let addrIsEmpty = false;
  // We scan lines from startLine to endLine (1-based inclusive).
  for (let i = startLine - 1; i < endLine; i++) {
    const ln = lines[i];
    // Track open/close braces (excluding the outer brackets at startLine and endLine)
    for (let j = 0; j < ln.length; j++) {
      const ch = ln[j];
      if (ch === '{') {
        if (depth === 0) {
          // start of a new object
          objStart = i;
          nameVal = '';
          cityVal = '';
          addrLineIdx = -1;
          addrIsEmpty = false;
        }
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          // end of object
          objects.push({
            startLine: objStart,
            endLine: i,
            endCol: j,
            name: nameVal,
            city: cityVal,
            addrLineIdx,
            addrIsEmpty
          });
          objStart = null;
        }
      }
    }
    // Extract the values of nameKey, cityKey, and address while inside an object (depth >= 1)
    if (depth >= 1 && objStart !== null) {
      // Match "key": "value"
      const nMatch = ln.match(new RegExp('"' + nameKey + '"\\s*:\\s*"([^"]*)"'));
      if (nMatch && !nameVal) nameVal = nMatch[1];
      const cMatch = ln.match(new RegExp('"' + cityKey + '"\\s*:\\s*"([^"]*)"'));
      if (cMatch && !cityVal) cityVal = cMatch[1];
      const aMatch = ln.match(/"address"\s*:\s*"([^"]*)"/);
      if (aMatch && addrLineIdx === -1) {
        addrLineIdx = i;
        addrIsEmpty = aMatch[1].trim() === '' || aMatch[1].trim().toUpperCase() === 'TBD';
      }
    }
  }
  return objects;
}

// CLINIC_BANK: lines 41821..45632, "n" and "c"
const clinicObjs = processArrayRegion(41821, 45632, 'n', 'c');
console.log('Parsed clinic objects:', clinicObjs.length);

// MVA_ATTORNEYS: lines 5235..5892, "firm" and "city"
const mvaObjs = processArrayRegion(5235, 5892, 'firm', 'city');
console.log('Parsed MVA objects:', mvaObjs.length);

// Track edits: line index → new content
// We need to do edits carefully — multiple edits on same line could conflict, so we accumulate by line index.
const lineEdits = new Map(); // lineIdx → newLine
const insertBefore = new Map(); // lineIdx → array of new lines to insert before this line

function jsonEscape(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function applyEnrichment(objects, nameKey) {
  let applied = 0;
  let skippedNoMatch = 0;
  let skippedAlreadyHasAddress = 0;
  for (const o of objects) {
    if (!o.name) continue;
    const k = key(o.name, o.city);
    const addr = enrichments[k];
    if (!addr) { skippedNoMatch++; continue; }

    if (o.addrLineIdx !== -1) {
      if (o.addrIsEmpty) {
        // Replace the empty address with the real one
        const original = lineEdits.get(o.addrLineIdx) || lines[o.addrLineIdx];
        const replaced = original.replace(/"address"\s*:\s*"[^"]*"/, '"address": "' + jsonEscape(addr) + '"');
        if (replaced !== original) {
          lineEdits.set(o.addrLineIdx, replaced);
          applied++;
        }
      } else {
        skippedAlreadyHasAddress++;
      }
    } else {
      // No address field — insert one before the closing brace
      // Find the line with the closing brace (o.endLine)
      const endLineText = lineEdits.get(o.endLine) || lines[o.endLine];
      // We need to add a new key. Find the last property line — the line before endLine that has a value.
      // Strategy: replace the closing brace line, prepending a new property + comma to the previous property's line.
      // Easier: find the last non-empty content line before endLine and add a trailing comma + new line with address.
      // Simpler: just insert a new line that contains the address property, right before the closing brace line.
      // We need to also add a comma to the previous property if missing.
      // Find the previous content line (line before endLine that isn't only whitespace)
      let prev = o.endLine - 1;
      while (prev > o.startLine && lines[prev].trim() === '') prev--;
      const prevLineText = lineEdits.get(prev) || lines[prev];
      // Add comma to prev line if it doesn't end with one already
      let newPrev = prevLineText;
      if (!/,\s*$/.test(prevLineText.trimEnd())) {
        // Add comma at end (preserve trailing spaces)
        newPrev = prevLineText.replace(/(\s*)$/, ',$1');
      }
      lineEdits.set(prev, newPrev);
      // Determine indent (use the indent of prev line + maintain consistency)
      const indentMatch = prevLineText.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '    ';
      // Insert as a new entry in lineEdits keyed at endLine — we'll prepend to the endLine.
      // To insert a new line, easiest is to put it before endLine via a special marker map.
      // Use a separate "insertBefore" map.
      const ins = insertBefore.get(o.endLine) || [];
      ins.push(indent + '"address": "' + jsonEscape(addr) + '"');
      insertBefore.set(o.endLine, ins);
      applied++;
    }
  }
  return { applied, skippedNoMatch, skippedAlreadyHasAddress };
}

console.log('--- CLINIC enrichment ---');
const clinicStats = applyEnrichment(clinicObjs, 'n');
console.log(clinicStats);

console.log('--- MVA enrichment ---');
const mvaStats = applyEnrichment(mvaObjs, 'firm');
console.log(mvaStats);

// Now rebuild the file
const out = [];
for (let i = 0; i < lines.length; i++) {
  if (insertBefore.has(i)) {
    for (const newLine of insertBefore.get(i)) {
      out.push(newLine);
    }
  }
  out.push(lineEdits.has(i) ? lineEdits.get(i) : lines[i]);
}

const newContent = out.join('\n');
// Preserve original line ending — the source uses \r\n? Let's check.
const usesCRLF = src.includes('\r\n');
const finalContent = usesCRLF ? newContent.replace(/\n/g, '\r\n') : newContent;

// Backup first
const backupPath = SRC + '.before-address-enrichment.bak';
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, src);
  console.log('Wrote backup to', backupPath);
}

fs.writeFileSync(SRC, finalContent);
console.log('Updated', SRC);
console.log('Total clinic addresses applied:', clinicStats.applied);
console.log('Total MVA addresses applied:', mvaStats.applied);
