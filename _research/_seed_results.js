// Seed address_research_results.json from prior enrichment files.
// Match by (case-insensitive, normalized) clinic name + city.
const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\Users\\roses\\CODE PROJECT\\_research';
const audit = JSON.parse(fs.readFileSync(path.join(ROOT,'missing_addresses_audit.json'),'utf8'));
const enrichB2 = JSON.parse(fs.readFileSync(path.join(ROOT,'clinic_enrichment_batch_2.json'),'utf8'));

function norm(s){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }

// Build a lookup of enrichment names → {address, physician}
const enrichEntries = Object.entries(enrichB2.enrichments || {});

const found = [];
const skippedAlreadyEnriched = [];

// Track which clinic-name match for diagnostics
const matchedKeys = new Set();

for (const c of audit.clinics.missingList) {
  const cN = norm(c.name);
  let match = null;
  for (const [name, data] of enrichEntries) {
    if (matchedKeys.has(name)) continue;
    if (norm(name) === cN) {
      match = { name, data };
      break;
    }
  }
  if (match && match.data.address && match.data.address.trim() && match.data.address.trim().toUpperCase() !== 'TBD') {
    // Quality check: enrichment was Frisco-focused. Don't apply to non-Frisco unless the address is in the right city.
    const addrLc = match.data.address.toLowerCase();
    const cityLc = (c.city || '').toLowerCase();
    if (cityLc && addrLc.includes(cityLc)) {
      found.push({
        type: 'clinic',
        name: c.name,
        city: c.city,
        specialty: c.specialty,
        doctor: c.doctor,
        marketingRep: c.marketingRep,
        address: match.data.address.trim(),
        matchConfidence: 'high',
        matchReason: `Prior enrichment (clinic_enrichment_batch_2) — name match, address in ${c.city}`,
        source: 'clinic_enrichment_batch_2.json'
      });
      matchedKeys.add(match.name);
    } else if (cityLc) {
      // Address city doesn't match — log as low confidence but still capture as candidate
      // Only include if both cities are within DFW area (most are)
      // Leave for manual review — skip for now
    }
  }
}

const results = {
  generatedAt: new Date().toISOString(),
  stoppedAt: null,
  notes: 'Seeded from prior enrichment files. Phase 2 web research appended below.',
  found,
  notFound: []
};

fs.writeFileSync(path.join(ROOT,'address_research_results.json'), JSON.stringify(results, null, 2));
console.log(`Seeded ${found.length} addresses from prior enrichment.`);
