const fs = require('fs');
const html = fs.readFileSync('marketing_schedule_FINAL4.html', 'utf8');

function extract(varName) {
  const start = html.indexOf('var ' + varName + ' = [');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false, strCh = '';
  let i = start + ('var ' + varName + ' = ').length;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (esc) { esc = false; continue; }
    if (inStr) { if (ch === '\\') { esc = true; continue; } if (ch === strCh) inStr = false; continue; }
    if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
    if (ch === '[') depth++;
    if (ch === ']') { depth--; if (depth === 0) break; }
  }
  return eval(html.slice(start + ('var ' + varName + ' = ').length, i + 1));
}

const clinics = extract('CLINIC_BANK');
const buckets = {};
clinics.forEach((c, idx) => {
  const key = (c.n || '').toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
  if (!buckets[key]) buckets[key] = [];
  buckets[key].push({ idx, name: c.n, city: c.c, doctor: c.d });
});

console.log('Total clinics:', clinics.length);
const dupes = Object.keys(buckets).filter(k => buckets[k].length > 1);
console.log('Duplicate name groups:', dupes.length);
console.log('Total extra entries to remove:', dupes.reduce((s, k) => s + buckets[k].length - 1, 0));
console.log('\nFirst 30 duplicate groups:');
dupes.slice(0, 30).forEach(k => {
  console.log('\n  Group:', k);
  buckets[k].forEach(e => console.log('    [' + e.idx + '] "' + e.name + '" · ' + e.city + ' · ' + (e.doctor || 'TBD')));
});
