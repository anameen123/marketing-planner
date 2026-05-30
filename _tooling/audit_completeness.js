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
const mvas = extract('MVA_ATTORNEYS');

function audit(arr, label, phoneKey, addressKey, webKey, faxKey) {
  let withPhone=0, withAddr=0, withWeb=0, withFax=0;
  const total = arr.length;
  arr.forEach(c => {
    if (c[phoneKey] && c[phoneKey] !== 'TBD' && c[phoneKey] !== '') withPhone++;
    if (c[addressKey] && c[addressKey] !== 'TBD' && c[addressKey] !== '') withAddr++;
    if (c[webKey] && c[webKey] !== 'TBD' && c[webKey] !== '') withWeb++;
    if (c[faxKey] && c[faxKey] !== 'TBD' && c[faxKey] !== '') withFax++;
  });
  console.log('\n=== ' + label + ' (' + total + ' total) ===');
  console.log('Has phone:    ' + withPhone + ' (' + Math.round(100*withPhone/total) + '%)');
  console.log('Has address:  ' + withAddr + ' (' + Math.round(100*withAddr/total) + '%)');
  console.log('Has website:  ' + withWeb + ' (' + Math.round(100*withWeb/total) + '%)');
  console.log('Has fax:      ' + withFax + ' (' + Math.round(100*withFax/total) + '%)');
}

audit(clinics, 'CLINIC_BANK', 'phone', 'address', 'website', 'fax');
audit(mvas, 'MVA_ATTORNEYS', 'phone', 'address', 'website', 'fax');
