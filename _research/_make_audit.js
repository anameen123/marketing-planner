// Build missing-addresses audit for CLINIC_BANK and MVA_ATTORNEYS
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\Users\\roses\\CODE PROJECT\\marketing_schedule_FINAL4.html';
const OUT_DIR = 'C:\\Users\\roses\\CODE PROJECT\\_research';

const src = fs.readFileSync(SRC, 'utf8');
const lines = src.split(/\r?\n/);

function sliceArray(startLine, endLine) {
  // line numbers are 1-based as reported by grep
  return lines.slice(startLine - 1, endLine).join('\n');
}

// CLINIC_BANK is lines 41821..45632, MVA_ATTORNEYS is 5235..5892
const clinicSrc = sliceArray(41821, 45632);
const mvaSrc = sliceArray(5235, 5892);

function evalArray(jsText, varName) {
  // The text is `var X = [ ... ];`. We can sandbox-eval.
  // Use Function constructor to evaluate and return the array.
  const wrapped = jsText.replace(/^\s*var\s+\w+\s*=/, 'return ');
  const fn = new Function(wrapped.endsWith(';') ? wrapped : wrapped + ';');
  return fn();
}

const clinics = evalArray(clinicSrc, 'CLINIC_BANK');
const mvas = evalArray(mvaSrc, 'MVA_ATTORNEYS');

console.log('Parsed clinics:', clinics.length);
console.log('Parsed mvas:', mvas.length);

function hasAddress(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const a = entry.address;
  if (typeof a !== 'string') return false;
  const t = a.trim();
  if (!t) return false;
  if (t.toUpperCase() === 'TBD') return false;
  return true;
}

const clinicMissing = clinics.filter(c => !hasAddress(c));
const mvaMissing = mvas.filter(m => !hasAddress(m));

const audit = {
  generatedAt: new Date().toISOString(),
  clinics: {
    total: clinics.length,
    withAddress: clinics.length - clinicMissing.length,
    missing: clinicMissing.length,
    missingList: clinicMissing.map(c => ({
      name: c.n || '',
      specialty: c.s || '',
      doctor: c.d || '',
      city: c.c || '',
      marketingRep: c.t || ''
    }))
  },
  mva: {
    total: mvas.length,
    withAddress: mvas.length - mvaMissing.length,
    missing: mvaMissing.length,
    missingList: mvaMissing.map(m => ({
      firm: m.firm || '',
      attorney: m.attorney || '',
      city: m.city || '',
      phone: m.phone || '',
      website: m.website || '',
      id: m.id || ''
    }))
  }
};

fs.writeFileSync(path.join(OUT_DIR, 'missing_addresses_audit.json'), JSON.stringify(audit, null, 2));
console.log('Wrote audit. Clinics missing:', clinicMissing.length, ' MVAs missing:', mvaMissing.length);
