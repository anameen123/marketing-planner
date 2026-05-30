// Quick visual check of the new tier badge palette
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const URL = 'file:///' + HTML_PATH.replace(/\\/g, '/') + '?devmode=1';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Render a swatch HTML using getTierStyle directly so we see all 4 medal colors
  const html = await page.evaluate(() => {
    const labels = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const swatches = labels.map((name, i) => {
      const id = i + 1;
      const ts = window.getTierStyle('clinic', id);
      return `
        <div style="display:flex;align-items:center;gap:14px;padding:14px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
          <div style="font-size:12px;color:#64748b;width:80px">Tier ${id}</div>
          <span style="background:${ts.bg};color:${ts.fg};font-size:12px;font-weight:800;padding:5px 14px;border-radius:10px;letter-spacing:.05em;border:1px solid ${ts.border};box-shadow:0 1px 3px ${ts.glow}">${name}</span>
          <span style="background:${ts.bg};color:${ts.fg};font-size:10px;font-weight:800;padding:3px 10px;border-radius:8px;letter-spacing:.05em;border:1px solid ${ts.border}">${name} (small)</span>
          <code style="font-size:10px;color:#94a3b8;font-family:Consolas,monospace">solid ${ts.solid}</code>
        </div>
      `;
    }).join('');
    document.body.innerHTML = `
      <div style="padding:30px;font-family:'Segoe UI',sans-serif;background:#f8fafc;min-height:100vh">
        <h2 style="color:#1F3864">New Tier Medal Palette</h2>
        <div style="display:flex;flex-direction:column;gap:10px;max-width:700px">
          ${swatches}
        </div>
      </div>
    `;
    return document.body.innerHTML.length;
  });

  await page.waitForTimeout(300);
  await page.screenshot({ path: path.resolve(__dirname, '..', 'screenshots', 'tier_swatch.png') });
  await browser.close();
  console.log('Wrote tier_swatch.png');
})();
