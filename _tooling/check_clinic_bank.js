const fs = require('fs');
const html = fs.readFileSync('marketing_schedule_FINAL4.html', 'utf8');
const start = html.indexOf('var CLINIC_BANK = [');
if (start < 0) { console.log('CLINIC_BANK literal NOT FOUND'); process.exit(1); }
let depth = 0;
let inStr = false;
let esc = false;
let strCh = '';
let i = start + 'var CLINIC_BANK = '.length;
let lineCount = 0;
let entryCount = 0;
for (; i < html.length; i++) {
  const ch = html[i];
  if (ch === '\n') lineCount++;
  if (esc) { esc = false; continue; }
  if (inStr) {
    if (ch === '\\') { esc = true; continue; }
    if (ch === strCh) { inStr = false; }
    continue;
  }
  if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
  if (ch === '[') depth++;
  if (ch === ']') { depth--; if (depth === 0) break; }
  if (ch === '{' && depth === 1) entryCount++;
}
console.log('CLINIC_BANK literal starts at char', start);
console.log('Closes at char', i, '(spans', lineCount, 'lines)');
console.log('Entry count:', entryCount);
console.log('Closing context:', JSON.stringify(html.slice(i - 5, i + 20)));
