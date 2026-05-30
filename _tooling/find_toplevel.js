const fs = require('fs');
const html = fs.readFileSync('marketing_schedule_FINAL4.html', 'utf8');
const lines = html.split('\n');
let interesting = [];
// We're looking for lines that EXECUTE at top level (not declarations) — these
// can throw at runtime. IIFEs start with (function(){... and bare calls match X();
for (let i = 4030; i < 24963 && i < lines.length; i++) {
  const L = lines[i] || '';
  const t = L.trim();
  if (!t) continue;
  if (t.startsWith('//')) continue;
  // IIFEs: (function(){ ... })();
  if (/^\(function\s*\(/.test(t)) {
    interesting.push({ line: i + 1, kind: 'IIFE', code: t.slice(0, 140) });
    continue;
  }
  // Top-level bare calls: foo(); or _foo();   (avoid match inside object literals)
  // Only consider if column 0 is non-whitespace OR starts with identifier and ends with );
  if (/^[a-zA-Z_$][\w$]*\([^()]*\)\s*;?\s*$/.test(t) && !/^var\s/.test(t)) {
    interesting.push({ line: i + 1, kind: 'call', code: t.slice(0, 140) });
  }
}
console.log('Found', interesting.length, 'top-level statements between MVA_ATTORNEYS and CLINIC_BANK:');
interesting.slice(0, 80).forEach(x => console.log('  L' + x.line + ' [' + x.kind + ']: ' + x.code));
