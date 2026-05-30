// Dry-run: count how many businesses have a real address suitable for
// geocoding. No network calls.

const fs = require('fs');
const path = require('path');

function extractLiteral(html, prefix){
  const start = html.indexOf(prefix);
  if(start < 0) return null;
  let i = start + prefix.length;
  while(i < html.length && /[\s=]/.test(html[i])) i++;
  const openCh = html[i];
  if(openCh !== '[' && openCh !== '{') return null;
  const closeCh = openCh === '[' ? ']' : '}';
  let depth = 0, inStr = false, esc = false, strCh = '';
  const startBody = i;
  for(; i < html.length; i++){
    const ch = html[i];
    if(esc){ esc = false; continue; }
    if(inStr){ if(ch === '\\'){ esc = true; continue; } if(ch === strCh) inStr = false; continue; }
    if(ch === '"' || ch === "'"){ inStr = true; strCh = ch; continue; }
    if(ch === openCh) depth++;
    if(ch === closeCh){ depth--; if(depth === 0){ i++; break; } }
  }
  return eval('(' + html.slice(startBody, i) + ')');
}

const html = fs.readFileSync(path.join(__dirname, '..', 'marketing_schedule_FINAL4.html'), 'utf8');
const CLINIC_BANK   = extractLiteral(html, 'var CLINIC_BANK = ')   || [];
const MVA_ATTORNEYS = extractLiteral(html, 'var MVA_ATTORNEYS = ') || [];
const OUTREACH      = extractLiteral(html, 'var OUTREACH = ')      || [];

function realAddr(a){
  if(!a) return false;
  const s = String(a).trim();
  if(s === '' || s === 'TBD' || s.length < 4) return false;
  return true;
}

const clinicSamples = CLINIC_BANK.filter(c => c && realAddr(c.address)).slice(0, 5);
const mvaSamples = MVA_ATTORNEYS.filter(m => m && realAddr(m.address)).slice(0, 3);
const outSamples = OUTREACH.filter(o => o && realAddr(o.address)).slice(0, 3);

console.log('=== CLINIC_BANK ===');
console.log('  total:               ' + CLINIC_BANK.length);
console.log('  with real address:   ' + CLINIC_BANK.filter(c => c && realAddr(c.address)).length);
console.log('  first clinic shape:  ' + Object.keys(CLINIC_BANK[0]||{}).join(', '));
console.log('  samples:');
clinicSamples.forEach(c => console.log('    - ' + c.n + ' | ' + c.address + ' | ' + c.c));

console.log('\n=== MVA_ATTORNEYS ===');
console.log('  total:               ' + MVA_ATTORNEYS.length);
console.log('  with real address:   ' + MVA_ATTORNEYS.filter(m => m && realAddr(m.address)).length);
console.log('  samples:');
mvaSamples.forEach(m => console.log('    - ' + m.firm + ' | ' + m.address + ' | ' + m.city));

console.log('\n=== OUTREACH ===');
console.log('  total:               ' + OUTREACH.length);
console.log('  with real address:   ' + OUTREACH.filter(o => o && realAddr(o.address)).length);
console.log('  samples:');
outSamples.forEach(o => console.log('    - ' + o.name + ' | ' + o.address + ' | ' + o.city));

const totalToGeocode =
  CLINIC_BANK.filter(c => c && realAddr(c.address)).length +
  MVA_ATTORNEYS.filter(m => m && realAddr(m.address)).length +
  OUTREACH.filter(o => o && realAddr(o.address)).length;
console.log('\n>>> Total to geocode: ' + totalToGeocode);
console.log('>>> Estimated runtime at 1.1s/req: ' + Math.ceil(totalToGeocode * 1100 / 60000) + ' min');
