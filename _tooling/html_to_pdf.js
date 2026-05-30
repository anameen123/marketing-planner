// Render the member quickstart HTML to a PDF using Playwright's print mode.
//
// Usage: node html_to_pdf.js <input.html> <output.pdf>

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error('Usage: node html_to_pdf.js <input.html> <output.pdf>');
  process.exit(1);
}

const inAbs = path.resolve(inFile);
const outAbs = path.resolve(outFile);
const inURL = 'file:///' + inAbs.replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(inURL, { waitUntil: 'networkidle' });
  // Wait for images to actually decode
  await page.waitForFunction(() => {
    const imgs = Array.from(document.images);
    return imgs.length === 0 || imgs.every((i) => i.complete && i.naturalWidth > 0);
  }, { timeout: 15000 });

  await page.pdf({
    path: outAbs,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' },
    preferCSSPageSize: true,
  });

  await browser.close();
  const sz = fs.statSync(outAbs).size;
  console.log('Wrote', outAbs, '(' + (sz/1024).toFixed(0) + ' KB)');
})().catch((e) => { console.error(e); process.exit(1); });
