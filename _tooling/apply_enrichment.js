// Merges _research/mva_enrichment.json + _research/clinic_enrichment.json
// into the inline data arrays in marketing_schedule_FINAL4.html.
// Atomic: backs up the HTML first, then rewrites the arrays in place.
const fs = require('fs');
const path = require('path');

const HTML_PATH    = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const MVA_JSON     = path.resolve(__dirname, '..', '_research', 'mva_enrichment.json');
const CLINIC_JSON  = path.resolve(__dirname, '..', '_research', 'clinic_enrichment.json');
const BACKUP_PATH  = HTML_PATH + '.backup-before-enrichment.html';

function loadJson(p, label){
  if(!fs.existsSync(p)){ console.log('  (' + label + ' enrichment file not found at ' + p + ' — skipping)'); return { enrichments: {} }; }
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch(e){ console.error('  Failed to parse ' + label + ': ' + e.message); process.exit(1); }
}

// Apply enrichment to a JS array literal embedded in the HTML.
// Strategy: parse the array via eval, mutate it in JS, then re-serialize.
function applyToArray(html, arrayName, matchKey, enrichments){
  const re = new RegExp('var ' + arrayName + '\\s*=\\s*(\\[[\\s\\S]*?\\n\\])(;)', 'm');
  const m = html.match(re);
  if(!m){ throw new Error('Could not find ' + arrayName + ' in HTML'); }
  let arr;
  eval('arr = ' + m[1]);
  let touched = 0, missed = [];
  // Build a lowercase map from the enrichment keys for case-insensitive matching
  const lowerMap = {};
  Object.keys(enrichments).forEach(k => { lowerMap[k.toLowerCase().trim()] = enrichments[k]; });
  arr.forEach(rec => {
    const key = String(rec[matchKey] || '').toLowerCase().trim();
    const enr = lowerMap[key];
    if(!enr) return;
    touched++;
    // Apply fields. Keep existing values if the enrichment value is empty/null.
    ['attorney','phone','fax','website','address','email'].forEach(f => {
      if(enr[f] != null && enr[f] !== '') rec[f] = enr[f];
    });
    // For MVA the "attorney" field already exists; for clinics the "d" field
    // is the doctor — map accordingly.
    if(arrayName === 'CLINIC_BANK' && enr.physician != null && enr.physician !== ''){
      rec.d = enr.physician;
    }
    // Mark as enriched for audit
    rec.enrichedAt = enr.researchedAt || new Date().toISOString().slice(0,10);
  });
  // Re-serialize
  const newArr = JSON.stringify(arr, null, 2);
  const newHtml = html.replace(re, 'var ' + arrayName + ' = ' + newArr + ';');
  return { html: newHtml, touched: touched, totalRecords: arr.length };
}

console.log('Reading HTML...');
let html = fs.readFileSync(HTML_PATH, 'utf8');
console.log('Backup → ' + BACKUP_PATH);
fs.writeFileSync(BACKUP_PATH, html);

const mvaData    = loadJson(MVA_JSON, 'MVA');
const clinicData = loadJson(CLINIC_JSON, 'Clinic');

console.log('\nApplying MVA enrichment...');
const mvaResult = applyToArray(html, 'MVA_ATTORNEYS', 'firm', mvaData.enrichments || {});
html = mvaResult.html;
console.log('  ✓ ' + mvaResult.touched + ' / ' + mvaResult.totalRecords + ' MVA records enriched');

console.log('\nApplying Clinic enrichment...');
const clinicResult = applyToArray(html, 'CLINIC_BANK', 'n', clinicData.enrichments || {});
html = clinicResult.html;
console.log('  ✓ ' + clinicResult.touched + ' / ' + clinicResult.totalRecords + ' Clinic records enriched');

console.log('\nWriting updated HTML...');
fs.writeFileSync(HTML_PATH, html);
console.log('Done. Open the app + go to Businesses tab to see updated data.');
console.log('Rollback: copy ' + path.basename(BACKUP_PATH) + ' → ' + path.basename(HTML_PATH));
