// Second-pass geocode: strip parenthetical notes from addresses + retry
// only the businesses that missed in the first pass.

const fs = require('fs');
const path = require('path');
const https = require('https');

const HTML_FILE = path.join(__dirname, '..', 'marketing_schedule_FINAL4.html');
const EXISTING  = path.join(__dirname, 'business_geocodes.json');
const OUTFILE   = path.join(__dirname, 'business_geocodes_v2.json');
const USER_AGENT = 'wcg-marketing-planner-geocode/1.1';
const DELAY_MS = 1100;

function extractLiteral(html, prefix){
  const start = html.indexOf(prefix);
  if(start < 0) return null;
  let i = start + prefix.length;
  while(i < html.length && /[\s=]/.test(html[i])) i++;
  const openCh = html[i];
  const closeCh = openCh === '[' ? ']' : '}';
  let depth = 0, inStr = false, esc = false, strCh = '';
  const startBody = i;
  for(; i < html.length; i++){
    const ch = html[i];
    if(esc){ esc = false; continue; }
    if(inStr){
      if(ch === '\\'){ esc = true; continue; }
      if(ch === strCh) inStr = false;
      continue;
    }
    if(ch === '"' || ch === "'"){ inStr = true; strCh = ch; continue; }
    if(ch === openCh) depth++;
    if(ch === closeCh){ depth--; if(depth === 0){ i++; break; } }
  }
  return eval('(' + html.slice(startBody, i) + ')');
}

// Clean an address: strip parenthetical notes, normalize commas/spaces
function cleanAddress(raw){
  let a = String(raw || '').trim();
  // Remove parenthetical chunks  e.g. " (Plano office also exists)"
  a = a.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  // Collapse double commas / extra spaces
  a = a.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').replace(/,\s*$/, '');
  return a;
}

const html = fs.readFileSync(HTML_FILE, 'utf8');
const MVA      = extractLiteral(html, 'var MVA_ATTORNEYS = ') || [];
const OUTREACH = extractLiteral(html, 'var OUTREACH = ')      || [];
const CLINICS  = extractLiteral(html, 'var CLINIC_BANK = ')   || [];

const existing = JSON.parse(fs.readFileSync(EXISTING, 'utf8'));
console.log('Existing geocodes:', Object.keys(existing).length);

const todo = [];
function add(name, raw, city){
  if(!name || existing[name]) return;
  const cleaned = cleanAddress(raw);
  if(!cleaned || cleaned === 'TBD' || cleaned.length < 4) return;
  const q = cleaned + (city && cleaned.toLowerCase().indexOf(String(city).toLowerCase()) < 0 ? ', ' + city : '') + ', TX';
  todo.push({ name, query: q, orig: raw });
}
MVA.forEach(m => { if(m) add(m.firm, m.address, m.city); });
OUTREACH.forEach(o => { if(o) add(o.name, o.address, o.city); });
CLINICS.forEach(c => { if(c && c.address) add(c.n, c.address, c.c); });

console.log('Retry-list:', todo.length);
todo.slice(0, 5).forEach(t => console.log('  - ' + t.name + ' | ' + t.query + '  (was: ' + t.orig + ')'));

function geocode(q){
  return new Promise((resolve) => {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' + encodeURIComponent(q);
    const ctrl = require('timers').setTimeout(() => req.destroy(), 8000);
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(ctrl);
        try {
          const data = JSON.parse(body);
          if(Array.isArray(data) && data[0] && data[0].lat){
            resolve({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          } else resolve(null);
        } catch(e){ resolve(null); }
      });
    });
    req.on('error', () => { clearTimeout(ctrl); resolve(null); });
  });
}

(async () => {
  const results = Object.assign({}, existing);
  let hit = 0;
  for(let i = 0; i < todo.length; i++){
    const t = todo[i];
    const r = await geocode(t.query);
    if(r){ results[t.name] = r; hit++; }
    if((i+1) % 5 === 0){
      fs.writeFileSync(OUTFILE, JSON.stringify(results, null, 2));
      console.log('  ' + (i+1) + '/' + todo.length + '  new-hits=' + hit);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  fs.writeFileSync(OUTFILE, JSON.stringify(results, null, 2));
  console.log('\nDone. Total geocoded: ' + Object.keys(results).length + '  new in this pass: ' + hit);
})();
