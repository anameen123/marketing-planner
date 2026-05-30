// Build the address-research PDF report for the user to review.
// Data: _research/_address_research_findings.json
// Output: _research/address_research_<date>.pdf
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const findings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_research', '_address_research_findings.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const outPath = path.join(__dirname, '..', '_research', 'address_research_' + today + '.pdf');

const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
doc.pipe(fs.createWriteStream(outPath));

// ─── Colors ────────────────────────────────────────────────────────────
const COL = {
  navy: '#1F3864',
  purple: '#7030A0',
  green: '#15803d',
  amber: '#b45309',
  red: '#b91c1c',
  grey: '#64748b',
  lightGrey: '#f1f5f9',
  border: '#cbd5e1',
  text: '#0f172a'
};

function confidenceColor(c){
  if(c === 'HIGH') return COL.green;
  if(c === 'MEDIUM') return COL.amber;
  if(c === 'LOW') return COL.red;
  return COL.grey;
}

// ─── Cover ─────────────────────────────────────────────────────────────
doc.fillColor(COL.navy).fontSize(22).font('Helvetica-Bold').text('Address Research Report');
doc.moveDown(0.25);
doc.fillColor(COL.grey).fontSize(11).font('Helvetica').text('Best-guess addresses for clinics + MVA attorneys missing real locations');
doc.moveDown(0.25);
doc.fillColor(COL.grey).fontSize(9).text('Generated ' + today + ' · WCG Marketing Planner · Phase 142');

// Header rule
doc.moveDown(0.75);
const y1 = doc.y;
doc.strokeColor(COL.navy).lineWidth(2).moveTo(50, y1).lineTo(562, y1).stroke();
doc.moveDown(1);

// ─── Read-this-first banner ────────────────────────────────────────────
const banner = 'READ THIS FIRST — These are research-based best guesses, not verified data. Many entries have name conflicts, city-label errors, or no published street address. The Confidence column tells you how strong each guess is. Nothing has been applied to the app yet — review each row before sending corrections back.';
doc.save()
   .rect(50, doc.y, 512, 60)
   .fill('#fef3c7')
   .restore();
doc.strokeColor('#fbbf24').lineWidth(2).rect(50, doc.y, 512, 60).stroke();
doc.fillColor('#7c2d12').fontSize(10).font('Helvetica-Bold').text(banner, 60, doc.y + 8, { width: 492, align: 'left' });
doc.moveDown(2);

// ─── Confidence legend ─────────────────────────────────────────────────
doc.fillColor(COL.navy).fontSize(12).font('Helvetica-Bold').text('Confidence levels');
doc.moveDown(0.3);
const legend = [
  ['HIGH', COL.green, 'Clear, unambiguous match. Doctor + clinic name + city all align. Safe to apply.'],
  ['MEDIUM', COL.amber, 'Likely match but with caveats — e.g., doctor at a different city, name slightly off. Verify.'],
  ['LOW', COL.red, 'Name too generic OR multiple plausible candidates. Pick from the listed options.'],
  ['UNCERTAIN', COL.grey, 'Could not find a confident match. Recommend asking the original referrer for the address.']
];
legend.forEach(([label, color, desc]) => {
  doc.fillColor(color).fontSize(9).font('Helvetica-Bold').text(label, 60, doc.y, { continued: true, width: 70 });
  doc.fillColor(COL.text).font('Helvetica').text(' — ' + desc, { width: 502 });
});
doc.moveDown(1);

// ─── Summary stats ─────────────────────────────────────────────────────
const cConf = { HIGH:0, MEDIUM:0, LOW:0, UNCERTAIN:0 };
findings.clinics.forEach(c => cConf[c.confidence]++);
const mConf = { HIGH:0, MEDIUM:0, LOW:0, UNCERTAIN:0 };
findings.mvas.forEach(m => mConf[m.confidence]++);

doc.fillColor(COL.navy).fontSize(12).font('Helvetica-Bold').text('Summary');
doc.moveDown(0.3);
doc.fillColor(COL.text).fontSize(10).font('Helvetica');
doc.text('Clinics researched: ' + findings.clinics.length, { continued: false });
doc.text('  ' + cConf.HIGH + ' HIGH · ' + cConf.MEDIUM + ' MEDIUM · ' + cConf.LOW + ' LOW · ' + cConf.UNCERTAIN + ' UNCERTAIN');
doc.moveDown(0.3);
doc.text('MVA attorneys researched: ' + findings.mvas.length);
doc.text('  ' + mConf.HIGH + ' HIGH · ' + mConf.MEDIUM + ' MEDIUM · ' + mConf.LOW + ' LOW · ' + mConf.UNCERTAIN + ' UNCERTAIN');
doc.moveDown(1);

// ─── Helper: render one entry card ─────────────────────────────────────
function renderEntry(num, primaryName, subtitle, conf, bestGuess, notes, sources, isMVA, phone, city){
  // Ensure we have ~140pt of space; else new page
  if(doc.y + 140 > 750){ doc.addPage(); }
  const startY = doc.y;
  const cardX = 50, cardW = 512;

  // Header bar with number + name
  doc.save().rect(cardX, startY, cardW, 22).fill(COL.navy).restore();
  doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold')
     .text((isMVA ? 'M' : 'C') + num + '.  ' + primaryName, cardX + 8, startY + 6, { width: cardW - 100 });

  // Confidence pill on the right
  const pillW = 80, pillX = cardX + cardW - pillW - 6, pillY = startY + 4;
  doc.save().roundedRect(pillX, pillY, pillW, 14, 3).fill(confidenceColor(conf)).restore();
  doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
     .text(conf, pillX, pillY + 3, { width: pillW, align: 'center' });

  // Body
  let bodyY = startY + 26;
  doc.fillColor(COL.grey).fontSize(8).font('Helvetica');
  const meta = [subtitle, city ? 'City tag: ' + city : null, phone ? 'Phone: ' + phone : null].filter(Boolean).join(' · ');
  if(meta){
    doc.text(meta, cardX + 8, bodyY, { width: cardW - 16 });
    bodyY = doc.y + 4;
  }

  doc.fillColor(COL.navy).fontSize(9).font('Helvetica-Bold').text('Best guess', cardX + 8, bodyY, { continued: true });
  doc.fillColor(COL.text).font('Helvetica').text(': ' + bestGuess, { width: cardW - 16 });
  bodyY = doc.y + 4;

  doc.fillColor(COL.navy).fontSize(9).font('Helvetica-Bold').text('Notes', cardX + 8, bodyY, { continued: true });
  doc.fillColor(COL.text).font('Helvetica').text(': ' + notes, { width: cardW - 16 });
  bodyY = doc.y + 4;

  if(sources && sources.length){
    doc.fillColor(COL.grey).fontSize(8).font('Helvetica-Oblique')
       .text('Sources: ' + sources.join(', '), cardX + 8, bodyY, { width: cardW - 16 });
    bodyY = doc.y + 4;
  }

  // Outer border
  doc.strokeColor(COL.border).lineWidth(0.5).rect(cardX, startY, cardW, bodyY - startY + 4).stroke();
  doc.y = bodyY + 8;
}

// ─── Clinics section ──────────────────────────────────────────────────
doc.addPage();
doc.fillColor(COL.navy).fontSize(18).font('Helvetica-Bold').text('Clinics (29)');
doc.moveDown(0.5);

findings.clinics.forEach(c => {
  const subtitle = [c.spec, c.doctor].filter(Boolean).join(' · ') || null;
  renderEntry(c.num, c.name, subtitle, c.confidence, c.bestGuess, c.notes, c.sources, false, null, c.city);
});

// ─── MVA section ──────────────────────────────────────────────────────
doc.addPage();
doc.fillColor(COL.navy).fontSize(18).font('Helvetica-Bold').text('MVA Attorneys (11)');
doc.moveDown(0.5);

findings.mvas.forEach(m => {
  renderEntry(m.num, m.firm, null, m.confidence, m.bestGuess, m.notes, m.sources, true, m.phone, m.city);
});

// ─── Footer page ──────────────────────────────────────────────────────
doc.addPage();
doc.fillColor(COL.navy).fontSize(16).font('Helvetica-Bold').text('What to do next');
doc.moveDown(0.5);
doc.fillColor(COL.text).fontSize(11).font('Helvetica');

const steps = [
  '1.  Review each row in this PDF. Pay special attention to UNCERTAIN entries — many appear to have wrong city labels (clinic in McKinney tagged as Frisco, doctor in Austin attributed to McKinney clinic, etc.).',
  '2.  For HIGH/MEDIUM confidence entries: if the address looks correct, mark it OK on your end and I will apply them to BUSINESS_GEOCODES (with addressVerified: true). The pin will land on the actual building.',
  '3.  For LOW/UNCERTAIN entries: ask the original referrer or the assigned member to confirm the real address before I apply anything. I will NOT guess on these.',
  '4.  For entries where city label is wrong: tell me the corrected city and I will update both the bank entry AND the geocode.',
  '5.  Outreach entries (4 missing) are deliberately skipped per your instruction — we will tackle them after the clinics/MVAs are resolved.',
  '6.  After this batch is verified and applied, the pins for these 40 clinics/MVAs will move from city-centroid placeholder to their real street addresses. The OSRM polyline will visibly connect them.',
];
steps.forEach(s => { doc.text(s, { width: 512, paragraphGap: 6 }); });

doc.moveDown(1.5);
doc.fillColor(COL.grey).fontSize(9).font('Helvetica-Oblique')
   .text('All addresses in this PDF are research-based guesses, not verified. Sources are linked for each entry. Nothing has been applied to the app — the data is unchanged until you say go.', { width: 512 });

doc.end();
console.log('✓ PDF written: ' + outPath);
