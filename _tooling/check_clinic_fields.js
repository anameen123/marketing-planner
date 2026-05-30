const fs = require('fs');
const html = fs.readFileSync('marketing_schedule_FINAL4.html', 'utf8');
const start = html.indexOf('var CLINIC_BANK = [');
let depth = 0, inStr = false, esc = false, strCh = '';
let i = start + 'var CLINIC_BANK = '.length;
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
}
const literal = html.slice(start + 'var CLINIC_BANK = '.length, i + 1);
const arr = eval(literal);
console.log('Total entries:', arr.length);
let missingD = 0, missingS = 0, missingC = 0, missingN = 0;
const examples = { d: [], s: [], c: [], n: [] };
arr.forEach((e, idx) => {
  if (typeof e.d !== 'string') { missingD++; if (examples.d.length < 3) examples.d.push({ idx, e }); }
  if (typeof e.s !== 'string') { missingS++; if (examples.s.length < 3) examples.s.push({ idx, e }); }
  if (typeof e.c !== 'string') { missingC++; if (examples.c.length < 3) examples.c.push({ idx, e }); }
  if (typeof e.n !== 'string') { missingN++; if (examples.n.length < 3) examples.n.push({ idx, e }); }
});
console.log('Missing/non-string d:', missingD);
console.log('Missing/non-string s:', missingS);
console.log('Missing/non-string c:', missingC);
console.log('Missing/non-string n:', missingN);
if (missingD || missingS || missingC || missingN) {
  console.log('Examples:', JSON.stringify(examples, null, 2));
}
