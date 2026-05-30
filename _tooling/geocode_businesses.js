// One-time geocoding pass for every clinic / MVA / outreach in the HTML
// that has a real street address. Uses Nominatim (free, OpenStreetMap)
// with the required 1.1 sec / request rate limit.
//
// Output: _tooling/business_geocodes.json — { "Business Name": {lat, lng} }
// The HTML patcher in the next step injects this as a literal map.

const fs = require('fs');
const path = require('path');
const https = require('https');

const HTML_FILE  = path.join(__dirname, '..', 'marketing_schedule_FINAL4.html');
const OUT_FILE   = path.join(__dirname, 'business_geocodes.json');
const PARTIAL_OUT = path.join(__dirname, 'business_geocodes.partial.json');
const USER_AGENT = 'wcg-marketing-planner-geocode/1.0 (https://anameen123.github.io/marketing-planner)';
const DELAY_MS   = 1100;   // Nominatim TOS: max 1 req/sec → we use 1.1s
const TIMEOUT_MS = 8000;

// --- Extract literals from the HTML ---
function extractLiteral(html, prefix){
  const start = html.indexOf(prefix);
  if(start < 0) return null;
  let i = start + prefix.length;
  // skip whitespace + '='
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
  const body = html.slice(startBody, i);
  return eval('(' + body + ')');
}

const html = fs.readFileSync(HTML_FILE, 'utf8');
const CLINIC_BANK   = extractLiteral(html, 'var CLINIC_BANK = ')   || [];
const MVA_ATTORNEYS = extractLiteral(html, 'var MVA_ATTORNEYS = ') || [];
const OUTREACH      = extractLiteral(html, 'var OUTREACH = ')      || [];

console.log('Extracted from HTML:');
console.log('  CLINIC_BANK:   ' + CLINIC_BANK.length);
console.log('  MVA_ATTORNEYS: ' + MVA_ATTORNEYS.length);
console.log('  OUTREACH:      ' + OUTREACH.length);

// --- Build the work list: { name, query, type } ---
function buildQuery(addr, city){
  const a = String(addr || '').trim();
  const c = String(city || '').trim();
  if(!a || a === 'TBD' || a.length < 4) return null;
  // If address already contains the city, don't duplicate
  if(a.toLowerCase().indexOf(c.toLowerCase()) >= 0) return a + ', TX';
  return a + (c ? ', ' + c : '') + ', TX';
}

const todo = [];
CLINIC_BANK.forEach(c => {
  if(!c || !c.n) return;
  // Clinic shape: { n, c (city), d (doctor), s (spec), address, phone, ... }
  const q = buildQuery(c.address, c.c);
  if(q) todo.push({ name: c.n, query: q, type: 'clinic' });
});
MVA_ATTORNEYS.forEach(m => {
  if(!m || !m.firm) return;
  const q = buildQuery(m.address, m.city);
  if(q) todo.push({ name: m.firm, query: q, type: 'mva' });
});
OUTREACH.forEach(o => {
  if(!o || !o.name) return;
  const q = buildQuery(o.address, o.city);
  if(q) todo.push({ name: o.name, query: q, type: 'outreach' });
});

console.log('\nTotal businesses with real addresses to geocode: ' + todo.length);
console.log('Estimated runtime: ' + Math.ceil(todo.length * DELAY_MS / 60000) + ' min');
console.log();

// --- Resume support: load partial results if present ---
let results = {};
if(fs.existsSync(PARTIAL_OUT)){
  try {
    results = JSON.parse(fs.readFileSync(PARTIAL_OUT, 'utf8'));
    console.log('Resuming from partial — ' + Object.keys(results).length + ' already done.');
  } catch(_){}
}

function geocode(query){
  return new Promise((resolve, reject) => {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' + encodeURIComponent(query);
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }, timeout: TIMEOUT_MS }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if(Array.isArray(data) && data[0] && data[0].lat && data[0].lon){
            resolve({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          } else {
            resolve(null);
          }
        } catch(e){ reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
  });
}

(async () => {
  let done = 0, hit = 0, miss = 0;
  for(const item of todo){
    if(results[item.name]){ done++; continue; }   // resume skip
    try {
      const coord = await geocode(item.query);
      if(coord){
        results[item.name] = coord;
        hit++;
      } else {
        results[item.name] = null;   // record miss so resume doesn't retry
        miss++;
      }
    } catch(err){
      console.warn('  ! ' + item.name + ' — ' + err.message);
      // Don't store on error so resume retries
    }
    done++;
    if(done % 10 === 0){
      // Persist partial every 10
      fs.writeFileSync(PARTIAL_OUT, JSON.stringify(results, null, 2));
      const pct = ((done / todo.length) * 100).toFixed(1);
      console.log('  ' + done + '/' + todo.length + ' (' + pct + '%)  hit=' + hit + ' miss=' + miss);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  // Final save
  // Strip null entries — keep only successful geocodes
  const finalMap = {};
  Object.keys(results).forEach(k => { if(results[k] && results[k].lat) finalMap[k] = results[k]; });
  fs.writeFileSync(OUT_FILE, JSON.stringify(finalMap, null, 2));
  console.log('\n✓ Done. ' + Object.keys(finalMap).length + ' businesses geocoded successfully.');
  console.log('  Output: ' + OUT_FILE);
})();
