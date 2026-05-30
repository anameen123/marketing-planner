// Dedupe CLINIC_BANK in the main HTML file in-place.
// Strategy: group by case-folded, punctuation-stripped name; for each group,
// MERGE the entries (keep the most complete value per field) and emit ONE
// canonical entry. The canonical NAME comes from the most-titled-case version.
const fs = require('fs');

const FILE = 'marketing_schedule_FINAL4.html';
const html = fs.readFileSync(FILE, 'utf8');
const startMarker = 'var CLINIC_BANK = [';
const start = html.indexOf(startMarker);
if (start < 0) { console.error('CLINIC_BANK not found'); process.exit(1); }
let depth = 0, inStr = false, esc = false, strCh = '';
let i = start + startMarker.length - 1; // start at the '['
for (; i < html.length; i++) {
  const ch = html[i];
  if (esc) { esc = false; continue; }
  if (inStr) { if (ch === '\\') { esc = true; continue; } if (ch === strCh) inStr = false; continue; }
  if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
  if (ch === '[') depth++;
  if (ch === ']') { depth--; if (depth === 0) break; }
}
const literalStart = start + 'var CLINIC_BANK = '.length;
const literalEnd = i + 1;   // include the ']'
const literal = html.slice(literalStart, literalEnd);
const arr = eval(literal);
console.log('Loaded', arr.length, 'clinics.');

function norm(name) {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
}
function looksLikeTitleCase(s) {
  const words = (s || '').split(/\s+/);
  if (!words.length) return false;
  const titled = words.filter(w => /^[A-Z]/.test(w)).length;
  return titled >= Math.max(1, Math.floor(words.length * 0.6));
}
function score(c) {
  let s = 0;
  if (c.d && c.d !== 'TBD') s += 10;
  if (c.s) s += 5;
  if (c.phone && c.phone !== 'TBD') s += 3;
  if (c.address && c.address !== 'TBD') s += 3;
  if (c.website && c.website !== 'TBD') s += 3;
  if (c.fax && c.fax !== 'TBD') s += 1;
  if (c.notes) s += 1;
  return s;
}
function pickBest(values) {
  // Pick the longest non-TBD/non-empty value
  const cleaned = values.filter(v => v && v !== 'TBD');
  if (!cleaned.length) return values[0] || '';
  cleaned.sort((a, b) => String(b).length - String(a).length);
  return cleaned[0];
}

const buckets = {};
arr.forEach((c, idx) => {
  const key = norm(c.n);
  if (!buckets[key]) buckets[key] = [];
  buckets[key].push(c);
});

const merged = [];
let dupGroupsCollapsed = 0;
Object.keys(buckets).forEach(key => {
  const group = buckets[key];
  if (group.length === 1) { merged.push(group[0]); return; }
  dupGroupsCollapsed++;
  // Pick best base by score
  const sorted = group.slice().sort((a, b) => score(b) - score(a));
  const base = JSON.parse(JSON.stringify(sorted[0]));
  // Pick canonical name — prefer the most title-cased version
  const nameCandidates = group.map(g => g.n).filter(Boolean);
  base.n = nameCandidates.find(looksLikeTitleCase) || nameCandidates[0];
  // For each scalar field, pick the best non-empty value across the group
  ['s', 'd', 'c', 't', 'phone', 'fax', 'website', 'address', 'notes'].forEach(k => {
    base[k] = pickBest(group.map(g => g[k]));
  });
  merged.push(base);
});

console.log('Collapsed', dupGroupsCollapsed, 'duplicate groups.');
console.log('New count:', merged.length, '(was ' + arr.length + ', removed ' + (arr.length - merged.length) + ')');

// Pretty-print JSON with 2-space indent + trailing newline
const newLiteral = JSON.stringify(merged, null, 2);
const newHtml = html.slice(0, literalStart) + newLiteral + html.slice(literalEnd);
fs.writeFileSync(FILE, newHtml);
console.log('Wrote deduped CLINIC_BANK to', FILE);
