// Verify getCaptureSummaryForDate + getCaptureSummaryForMonth helpers.
const { chromium } = require('playwright');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const URL = 'file:///' + HTML_PATH.replace(/\\/g, '/') + '?devmode=1';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**/login.microsoftonline.com/**', r => r.abort());
  await ctx.route('**/graph.microsoft.com/**', r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message.slice(0,200)));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    window.CURRENT_USER = { username:'admin', name:'Mahmoud', role:'admin' };
    var ls = document.getElementById('login-screen'); if(ls){ ls.style.display='none'; }
    if(typeof switchTab==='function') switchTab('referrals');
  });
  await page.waitForTimeout(500);

  // Set up: 2 referrals logged at Frisco today, but front desk reports 10 patients.
  // Expected capture rate = 2/10 = 20% (red zone).
  const setup = await page.evaluate(() => {
    var today = new Date().toISOString().slice(0,10);
    // Wipe prior data so test is deterministic
    REFERRAL_LOG = [];
    SHIFT_TOTALS_LOG = [];
    addReferralEntry({ memberName:'Duaa', sourceChannel:'walkin', destinationFacility:'frisco_er',
                       entryDate:today, entryTime:'10:00', age:30, gender:'Female',
                       chiefComplaint:'test', filledByName:'Maria' });
    addReferralEntry({ memberName:'Duaa', sourceChannel:'google', destinationFacility:'frisco_er',
                       entryDate:today, entryTime:'11:00', age:45, gender:'Male',
                       chiefComplaint:'test2', filledByName:'Maria' });
    addShiftTotal({ facilityKey:'frisco_er', shiftDate:today, shiftName:'Morning',
                    reportedTotal:10, filledByName:'Maria' });
    return {
      today: today,
      day:   getCaptureSummaryForDate(today),
      month: getCaptureSummaryForMonth(today.slice(0,7))
    };
  });
  console.log('Setup capture summaries:');
  console.log('  Day:  ', JSON.stringify(setup.day));
  console.log('  Month:', JSON.stringify(setup.month));

  // Open calendar tab to render the summary banner
  await page.evaluate(() => { if(typeof switchReferralSubtab==='function') switchReferralSubtab('calendar'); });
  await page.waitForTimeout(400);

  const banner = await page.evaluate(() => {
    var b = document.getElementById('rl-cal-month-summary');
    return {
      visible: b && b.style.display !== 'none',
      hasRate: b && (b.innerHTML.indexOf('20%') >= 0 || b.innerHTML.indexOf('Capture rate') >= 0)
    };
  });
  console.log('Banner state:', JSON.stringify(banner));

  await browser.close();
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
