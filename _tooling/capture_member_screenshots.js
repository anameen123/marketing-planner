// iPhone screenshots of the marketing planner from Duaa (member) perspective.
// Uses correct internal tab names: home, schedule, bank, leads-page, members,
// finances, feed. Outputs to ../screenshots/*.png

const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const OUT_DIR = path.resolve(__dirname, '..', 'screenshots');
const URL = 'file:///' + HTML_PATH.replace(/\\/g, '/') + '?devmode=1';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function shot(page, name, fullPage = false) {
  const out = path.join(OUT_DIR, name + '.png');
  await page.screenshot({ path: out, fullPage });
  const sz = fs.statSync(out).size;
  console.log('  saved', name + '.png', '(' + (sz/1024).toFixed(0) + ' KB)');
}

(async () => {
  console.log('Launching iPhone 13 viewport...');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    deviceScaleFactor: 2,
  });
  // Block Microsoft endpoints — devmode bypass means we never need them
  await ctx.route('**/login.microsoftonline.com/**', (r) => r.abort());
  await ctx.route('**/graph.microsoft.com/**', (r) => r.abort());

  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message.slice(0, 120)));

  console.log('Loading', URL);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });

  // ── 1. Login screen (blank) ────────────────────────────────────────────
  console.log('1. Login screen (blank)');
  await shot(page, '01_login_screen');

  // ── 2. Login filled (email + password) ─────────────────────────────────
  console.log('2. Login screen — fields filled');
  await page.fill('#login-email', 'dkhan@wcgtx.com');
  await page.fill('#login-password', '••••••••••••');
  await page.waitForTimeout(400);
  await shot(page, '02_login_filled');

  // Sign in as Duaa directly (bypass MSAL)
  console.log('Signing in as Duaa (devmode bypass)...');
  await page.evaluate(() => {
    window.CURRENT_USER = {
      username: 'duaa',
      name: 'Duaa',
      role: 'member',
      color: '#7030A0',
      authVia: 'dev-bypass',
    };
    var ls = document.getElementById('login-screen');
    if (ls) { ls.style.display = 'none'; ls.classList.remove('visible'); }
    if (typeof applyMemberViewClass === 'function') applyMemberViewClass();
    if (typeof renderUserBadge === 'function') renderUserBadge();
    if (typeof applyRoleRestrictions === 'function') applyRoleRestrictions();
    if (typeof renderCalGrid === 'function') renderCalGrid();
    if (typeof renderCounters === 'function') renderCounters();
    if (typeof switchTab === 'function') switchTab('home');
  });
  await page.waitForTimeout(1500);

  // ── 3. Home tab ────────────────────────────────────────────────────────
  console.log('3. Home');
  await page.evaluate(() => switchTab('home'));
  await page.waitForTimeout(1000);
  await shot(page, '03_home');

  // ── 4. Dashboard (= schedule view) ─────────────────────────────────────
  console.log('4. Dashboard (calendar)');
  await page.evaluate(() => switchTab('schedule'));
  await page.waitForTimeout(1200);
  await shot(page, '04_dashboard_calendar');

  // ── 5. Open a day (call openDay directly) ─────────────────────────────
  console.log('5. Day popup with visit slots');
  const opened = await page.evaluate(() => {
    if (typeof openDay === 'function' && typeof S !== 'undefined' && S.days && S.days.length) {
      // Find a day with at least one slot to make it interesting
      var idx = 0;
      for (var i = 0; i < S.days.length; i++) {
        if (S.days[i].rows && S.days[i].rows.length) { idx = i; break; }
      }
      openDay(idx);
      return { ok: true, idx: idx, totalDays: S.days.length };
    }
    return { ok: false };
  });
  console.log('  openDay:', JSON.stringify(opened));
  await page.waitForTimeout(1200);
  await shot(page, '05_day_visits_popup');

  // Close popup
  await page.evaluate(() => {
    var modals = document.querySelectorAll('.modal-overlay, .modal, .popup-overlay, [class*="overlay"]');
    modals.forEach((m) => {
      var cs = getComputedStyle(m);
      if (cs.display !== 'none' && cs.visibility !== 'hidden') {
        var x = m.querySelector('.close, .modal-close, [onclick*="close"], [aria-label*="close"]');
        if (x) x.click(); else m.style.display = 'none';
      }
    });
    // Also try Escape via direct event
    var esc = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' });
    document.dispatchEvent(esc);
  });
  await page.waitForTimeout(500);

  // ── 6. Businesses tab (= bank view) ────────────────────────────────────
  console.log('6. Businesses (clinic/MVA/outreach bank)');
  await page.evaluate(() => switchTab('bank'));
  await page.waitForTimeout(1200);
  await shot(page, '06_businesses_bank');

  // ── 7. Status tab (= leads-page) ───────────────────────────────────────
  console.log('7. Status (leads CRM)');
  await page.evaluate(() => switchTab('leads-page'));
  await page.waitForTimeout(1200);
  await shot(page, '07_status_leads');

  // ── 8. Team tab (= members view) ───────────────────────────────────────
  console.log('8. Team (personal stats)');
  await page.evaluate(() => switchTab('members'));
  await page.waitForTimeout(1200);
  await shot(page, '08_team_stats');

  // ── 9. User badge / Sign out — back to Home and scroll to top ──────────
  console.log('9. User badge / Sign out');
  await page.evaluate(() => switchTab('home'));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await shot(page, '09_user_badge_signout');

  await browser.close();
  console.log('\nDone. Screenshots in', OUT_DIR);
})().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
