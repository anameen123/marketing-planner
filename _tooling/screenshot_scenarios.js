// Quick screenshot tool: re-renders the same HTML that produced the PDF,
// then captures one PNG per page so the agent can visually QA it.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Reload + rerun the PDF generator's HTML composer so we screenshot the
// exact same output that gets printed to PDF.
const genModulePath = path.join(__dirname, 'generate_referral_scenarios_pdf.js');
const src = fs.readFileSync(genModulePath, 'utf8');
// Extract the html const by evaluating the relevant part — easier to just
// copy the file's html builder. Hack: capture between `const html = ` and
// `(async`.
const m = src.match(/const html = `([\s\S]*?)`;\s*\(async/);
if(!m) { console.error('Could not extract HTML template'); process.exit(1); }
// Inline-eval the template string using string replacement of the placeholders
// — but the template contains backticks around it so we re-evaluate by
// requiring the module would be cleaner. Easiest: invoke the script's
// generation by sourcing via vm. Simpler still: copy what the script does
// and re-render.
//
// To keep it simple, just spawn the original script differently: it writes
// a PDF; we want HTML. So we manually re-eval the template here by extracting
// the whole script and running it with a different output.
//
// Quickest cheat: run the script with a temp file location via env var.

// Cheat path: directly use the generator's exports — but it has none. So
// re-evaluate the script in a clean context by requiring it (it runs an
// IIFE at the bottom). We'll patch process.cwd via env then read back.

(async () => {
  // Just re-render by importing the same html template construction:
  // copy-paste the html-building pattern by sourcing the file's runtime.
  // Simpler: read the script, replace the pdf-output stanza with file:write
  // of html, eval.
  let scriptText = fs.readFileSync(genModulePath, 'utf8');
  // Strip the trailing IIFE that writes PDF
  scriptText = scriptText.replace(/\(async \(\)[\s\S]*$/, '');
  // Append our own html-write
  const tmpHtml = path.join(__dirname, '_scenarios_preview.html');
  scriptText += `\nrequire('fs').writeFileSync(${JSON.stringify(tmpHtml)}, html, 'utf8');\n`;
  // Evaluate
  const Module = require('module');
  const m = new Module(genModulePath);
  m.filename = genModulePath;
  m.paths = Module._nodeModulePaths(path.dirname(genModulePath));
  m._compile(scriptText, genModulePath);
  console.log('Wrote HTML preview to', tmpHtml);

  // Now screenshot it page-by-page
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
  await page.goto('file://' + tmpHtml.replace(/\\/g, '/'));
  // Take a full-page screenshot
  const fullShot = path.join(__dirname, '_scenarios_fullpage.png');
  await page.screenshot({ path: fullShot, fullPage: true });
  console.log('Wrote full-page screenshot:', fullShot);

  // Also one per .scenario / .cover / .legend
  const elements = await page.$$('.cover, .legend, .scenario');
  for(let i = 0; i < elements.length; i++){
    const e = elements[i];
    const cls = await e.evaluate(el => el.className.replace(' ', '_'));
    const out = path.join(__dirname, `_scenarios_${String(i+1).padStart(2,'0')}_${cls}.png`);
    await e.screenshot({ path: out });
    console.log('Wrote', out);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
