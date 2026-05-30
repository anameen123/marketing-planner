const fs = require('fs');
const html = fs.readFileSync('_tooling/live.html', 'utf8');
const start = html.indexOf('var CLINIC_BANK = [');
if (start < 0) { console.log('CLINIC_BANK NOT FOUND in live HTML'); process.exit(1); }
let depth = 0, inStr = false, esc = false, strCh = '';
let i = start + 'var CLINIC_BANK = '.length;
let entryCount = 0;
for (; i < html.length; i++) {
  const ch = html[i];
  if (esc) { esc = false; continue; }
  if (inStr) {
    if (ch === '\\') { esc = true; continue; }
    if (ch === strCh) inStr = false;
    continue;
  }
  if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
  if (ch === '[') depth++;
  if (ch === ']') { depth--; if (depth === 0) break; }
  if (ch === '{' && depth === 1) entryCount++;
}
console.log('Live CLINIC_BANK entries:', entryCount);
console.log('Live file char position of CLINIC_BANK literal:', start);
