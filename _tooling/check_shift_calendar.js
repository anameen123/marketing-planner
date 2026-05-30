// Smoke test the new shift-total form + calendar reconciliation view.
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

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    window.CURRENT_USER = { username:'admin', name:'Mahmoud', role:'admin', color:'#1F3864', authVia:'dev-bypass' };
    var ls = document.getElementById('login-screen'); if(ls){ ls.style.display='none'; ls.classList.remove('visible'); }
    if(typeof applyMemberViewClass==='function') applyMemberViewClass();
    if(typeof renderUserBadge==='function') renderUserBadge();
    if(typeof applyRoleRestrictions==='function') applyRoleRestrictions();
    if(typeof renderCalGrid==='function') renderCalGrid();
    if(typeof switchTab==='function') switchTab('referrals');
  });
  await page.waitForTimeout(800);

  // Test 1: add a referral entry with v2 fields (Google channel — non-business)
  const r1 = await page.evaluate(() => {
    return addReferralEntry({
      memberName: 'Duaa',
      sourceChannel: 'google',
      destinationFacility: 'frisco_er',
      entryDate: '2026-05-18',
      entryTime: '11:24',
      patientNumber: '2',
      age: 69,
      gender: 'Female',
      chiefComplaint: 'Fell — Head/Shoulder injury',
      extraNotes: 'Patient required help walking in',
      filledByName: 'Maria — Frisco ER'
    });
  });
  console.log('v2 Google entry:', JSON.stringify(r1).slice(0,260));

  // Test 2: add a shift total
  const s1 = await page.evaluate(() => {
    return addShiftTotal({
      facilityKey: 'frisco_er',
      shiftDate: '2026-05-18',
      shiftName: 'Morning',
      reportedTotal: 12,
      filledByName: 'Maria — Frisco ER'
    });
  });
  console.log('Shift total 1:', JSON.stringify(s1).slice(0,200));

  // Test 3: add another shift total (Afternoon)
  const s2 = await page.evaluate(() => {
    return addShiftTotal({
      facilityKey: 'frisco_er',
      shiftDate: '2026-05-18',
      shiftName: 'Afternoon',
      reportedTotal: 8,
      filledByName: 'Sarah — Frisco ER'
    });
  });
  console.log('Shift total 2:', JSON.stringify(s2).slice(0,200));

  // Test 4: check reconciliation numbers
  const recon = await page.evaluate(() => {
    return {
      reported: getReportedTotalForFacilityDate('frisco_er', '2026-05-18'),
      logged:   getLoggedCountForFacilityDate('frisco_er', '2026-05-18')
    };
  });
  console.log('Reconciliation for Frisco 2026-05-18:', JSON.stringify(recon));

  // Test 5: switch to calendar sub-tab
  await page.evaluate(() => { if(typeof switchReferralSubtab==='function') switchReferralSubtab('calendar'); });
  await page.waitForTimeout(600);

  const calOk = await page.evaluate(() => {
    var grid = document.getElementById('rl-cal-grid');
    var label= document.getElementById('rl-cal-month-label');
    return {
      gridHasContent: grid && grid.innerHTML.length > 100,
      labelText: label ? label.textContent : null
    };
  });
  console.log('Calendar:', JSON.stringify(calOk));

  // Test 6: click May 18, 2026 and verify the detail panel renders
  await page.evaluate(() => { if(typeof _rlSelectCalDay==='function') _rlSelectCalDay('2026-05-18'); });
  await page.waitForTimeout(400);
  const detail = await page.evaluate(() => {
    var det = document.getElementById('rl-cal-day-detail');
    return {
      visible: det && det.style.display !== 'none',
      hasReconciliation: det && det.innerHTML.indexOf('Reported') >= 0,
      hasEntries: det && det.innerHTML.indexOf('Logged patient entries') >= 0
    };
  });
  console.log('Day detail:', JSON.stringify(detail));

  // Test 7: set a mismatch reason and verify it persists + renders
  const reasonRes = await page.evaluate(() => {
    var shift = SHIFT_TOTALS_LOG[0];   // newest entry (Afternoon for Frisco)
    if(!shift) return { error: 'no shift to update' };
    return setShiftTotalMismatchReason(shift.id, 'paper_log', 'Patients written on the clipboard — will key in tonight');
  });
  console.log('Set reason result:', JSON.stringify(reasonRes).slice(0,200));

  // Re-render and check the day-detail panel now shows the reason
  await page.evaluate(() => { if(typeof _rlSelectCalDay==='function') _rlSelectCalDay('2026-05-18'); });
  await page.waitForTimeout(300);
  const reasonShown = await page.evaluate(() => {
    var det = document.getElementById('rl-cal-day-detail');
    return {
      hasReasonText: det && det.innerHTML.indexOf('Used paper log') >= 0,
      hasReasonNote: det && det.innerHTML.indexOf('clipboard') >= 0
    };
  });
  console.log('Reason shown in day detail:', JSON.stringify(reasonShown));

  await browser.close();
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
