// Smoke test of the new Patient Referral Log feature.
// Signs in as admin, opens the Referrals tab, opens the form, captures.
const { chromium } = require('playwright');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const URL = 'file:///' + HTML_PATH.replace(/\\/g, '/') + '?devmode=1';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await ctx.route('**/login.microsoftonline.com/**', r => r.abort());
  await ctx.route('**/graph.microsoft.com/**', r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message.slice(0,200)));
  page.on('console', m => { if(m.type()==='error') console.log('CONSOLE ERR:', m.text().slice(0,160)); });

  console.log('Loading', URL);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    window.CURRENT_USER = { username:'admin', name:'Mahmoud Althaher', role:'admin', color:'#1F3864', authVia:'dev-bypass' };
    var ls = document.getElementById('login-screen'); if(ls){ ls.style.display='none'; ls.classList.remove('visible'); }
    if(typeof applyMemberViewClass==='function') applyMemberViewClass();
    if(typeof renderUserBadge==='function') renderUserBadge();
    if(typeof applyRoleRestrictions==='function') applyRoleRestrictions();
    if(typeof renderCalGrid==='function') renderCalGrid();
  });
  await page.waitForTimeout(600);

  // Switch to Referrals
  await page.evaluate(() => { if(typeof switchTab==='function') switchTab('referrals'); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.resolve(__dirname,'..','screenshots','referral_log_empty.png'), fullPage: true });
  console.log('Empty referral log captured');

  // Open the form
  await page.evaluate(() => { if(typeof openReferralForm==='function') openReferralForm(); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.resolve(__dirname,'..','screenshots','referral_form.png') });
  console.log('Form dialog captured');

  // Fill out + submit a test entry
  const result = await page.evaluate(() => {
    var res = addReferralEntry({
      memberName: 'Duaa',
      sourceBusiness: 'Bloomfield',
      destinationFacility: 'frisco_er',
      patientCount: 2,
      filledByName: 'Maria — Frisco ER shift A'
    });
    if(typeof renderReferralLog === 'function') renderReferralLog();
    return res;
  });
  console.log('Add entry result:', JSON.stringify(result).slice(0,200));
  await page.waitForTimeout(500);

  // Add another
  await page.evaluate(() => {
    addReferralEntry({
      memberName: 'Ms Sadia',
      sourceBusiness: 'Passion Health',
      destinationFacility: 'castle_hills_er',
      patientCount: 1,
      filledByName: 'James — Carrollton overnight'
    });
    addReferralEntry({
      memberName: 'Dr Ahsan',
      sourceBusiness: 'ATA Healthcare and Wellness',
      destinationFacility: 'plano_uc',
      patientCount: 3,
      filledByName: 'Brittany — Plano UC'
    });
    if(typeof renderReferralLog === 'function') renderReferralLog();
  });
  await page.waitForTimeout(500);

  // Close form (in case still open) + screenshot the table with entries
  await page.evaluate(() => { if(typeof closeReferralForm==='function') closeReferralForm(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.resolve(__dirname,'..','screenshots','referral_log_with_entries.png'), fullPage: true });
  console.log('Populated referral log captured');

  await browser.close();
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
