// Verify the Plan-a-Route start picker — Phase 22+24 fix.
// Drives the real app via Playwright, opens the planner, exercises the
// pick-on-map flow in Corridor mode AND Random Pick wizard.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HTML = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const SHOT = path.resolve(__dirname, '_verify_route_planner.png');
const TRACE = path.resolve(__dirname, '_verify_route_planner.log');

(async () => {
  const log = [];
  const note = (s) => { console.log(s); log.push(s); };

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // Capture page console + errors so silent JS failures don't hide
  page.on('console', m => note('[console.' + m.type() + '] ' + m.text().slice(0, 280)));
  page.on('pageerror', e => note('[pageerror] ' + e.message));

  await page.goto('file:///' + HTML.replace(/\\/g, '/'));
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);   // let the app initialize

  // ── (1) Sign in as Mahmoud (admin) via the View-As menu ──────────────
  // App might auto-route to a landing tab. Look for the View-As button.
  note('--- Step: sign in as admin ---');
  try {
    // Try the simplest path: set CURRENT_USER directly via JS so we don't
    // have to navigate the View-As UI (which has known timing quirks).
    await page.evaluate(() => {
      window.CURRENT_USER = { name: 'Mahmoud Althaher', role: 'admin' };
      try { localStorage.setItem('CURRENT_USER', JSON.stringify(window.CURRENT_USER)); } catch(_){}
      if(typeof refreshAllUI === 'function') refreshAllUI();
    });
    note('[ok] CURRENT_USER set to admin via JS');
  } catch(e) {
    note('[warn] could not set admin: ' + e.message);
  }

  // ── (2) Open the route-planner drawer directly via JS ─────────────────
  note('--- Step: openRoutePlanner ---');
  const opened = await page.evaluate(() => {
    if(typeof openRoutePlanner === 'function'){
      try { openRoutePlanner(); return 'called'; } catch(e){ return 'err:' + e.message; }
    }
    return 'no openRoutePlanner';
  });
  note('  → ' + opened);
  await page.waitForTimeout(800);
  const drawerVisible = await page.evaluate(() => {
    const el = document.getElementById('route-planner-modal');
    return el ? (el.style.display !== 'none') : null;
  });
  note('  → drawer visible? ' + drawerVisible);

  // ── (3) Click the corridor pick-on-map button + observe state ─────────
  note('--- Step: click Corridor [📍 Map] for Start ---');
  // Drive via JS so a missing button click selector doesn't blank us
  const corridorState = await page.evaluate(() => {
    const out = {};
    // Make sure we're in corridor mode
    if(typeof _rpSetMode === 'function') _rpSetMode('corridor');
    // Call the same handler the button does
    if(typeof rpPickFromMapMode === 'function'){
      try { rpPickFromMapMode('start'); out.called = true; }
      catch(e){ out.err = e.message; }
    } else out.err = 'no rpPickFromMapMode';
    out.awaiting = window._RP_DIALOG_AWAITING;
    out.drawerDisplay = (document.getElementById('route-planner-modal') || {}).style?.display;
    const statusPanel = document.getElementById('rp-corridor-pick-status');
    out.statusVisible = statusPanel ? (statusPanel.style.display !== 'none') : null;
    out.statusText = statusPanel ? statusPanel.innerText.slice(0, 120) : null;
    return out;
  });
  note('  → ' + JSON.stringify(corridorState));

  // ── (4) ONE-CLICK pin pick via _rpQuickPickPin (Phase 25) ─────────────
  note('--- Step: one-click pin pick via _rpQuickPickPin ---');
  const pinClickRes = await page.evaluate(() => {
    const out = {};
    // Find a clinic that has coords
    let target = null, coord = null;
    if(typeof CLINIC_BANK !== 'undefined'){
      for(const c of CLINIC_BANK){
        if(c && c.n && typeof getCoordForBusiness === 'function'){
          const co = getCoordForBusiness(c.n);
          if(co){ target = c.n; coord = co; break; }
        }
      }
    }
    out.target = target;
    if(!target){ out.err = 'no clinic with coords found'; return out; }
    if(typeof _rpQuickPickPin === 'function'){
      out.quickPickExists = true;
      try { _rpQuickPickPin(target, coord); } catch(e){ out.err = e.message; }
    } else out.err = 'no _rpQuickPickPin (Phase 25 fn missing)';
    out.startVal     = (document.getElementById('rp-start') || {}).value;
    out.startLbl     = (document.getElementById('rp-start-search') || {}).value;
    out.drawer       = (document.getElementById('route-planner-modal') || {}).style?.display;
    out.awaitingCleared = !window._RP_DIALOG_AWAITING;
    out.startHalo    = !!(window._RP_SELECTION_HALOS && window._RP_SELECTION_HALOS.start);
    out.startMarker  = !!window._RP_RANDOM_S_MARKER;
    return out;
  });
  note('  → ' + JSON.stringify(pinClickRes));

  // ── (6) One-click END + check auto-AI hook fires ─────────────────────
  note('--- Step: one-click pick END + verify auto-AI hook attempts to run ---');
  const endRes = await page.evaluate(() => {
    if(typeof rpPickFromMapMode === 'function') rpPickFromMapMode('end');
    // Pick a different clinic
    let target = null, coord = null;
    if(typeof CLINIC_BANK !== 'undefined'){
      for(const c of CLINIC_BANK){
        if(c && c.n && c.n !== window._RP_START_NAME && typeof getCoordForBusiness === 'function'){
          const co = getCoordForBusiness(c.n);
          if(co){ target = c.n; coord = co; break; }
        }
      }
    }
    if(target && typeof _rpQuickPickPin === 'function'){
      _rpQuickPickPin(target, coord);
    }
    return {
      endVal:    (document.getElementById('rp-end') || {}).value,
      endLbl:    (document.getElementById('rp-end-search') || {}).value,
      drawer:    (document.getElementById('route-planner-modal') || {}).style?.display,
      endHalo:   !!(window._RP_SELECTION_HALOS && window._RP_SELECTION_HALOS.end),
      endMarker: !!window._RP_END_MARKER,
      aiEnabledByDefault: !!(window._RP_AI && window._RP_AI.enabled),
      autoFnExists: typeof window._rpAutoSuggestIfReady === 'function',
      hasGeminiKey: (typeof hasGeminiKey === 'function') ? hasGeminiKey() : null
    };
  });
  note('  → ' + JSON.stringify(endRes));

  // ── (6.5) Phase 26 — verify deterministic auto + per-level uniqueness ─
  note('--- Step: verify Phase 26 auto-compute + per-level candidates ---');
  const phase26 = await page.evaluate(() => {
    const out = {};
    // Pick two clinics that are geographically far apart. Use the bank
    // entries with the most extreme lat or lng diff so totalMi > 0.
    let start = null, end = null, startCoord = null, endCoord = null;
    if(typeof CLINIC_BANK !== 'undefined' && typeof getCoordForBusiness === 'function'){
      const withCoords = [];
      for(const c of CLINIC_BANK){
        if(c && c.n){
          const co = getCoordForBusiness(c.n);
          if(co) withCoords.push({ name: c.n, coord: co });
        }
      }
      // Sort by lng to find east-most + west-most
      withCoords.sort((a, b) => a.coord.lng - b.coord.lng);
      if(withCoords.length >= 2){
        start = withCoords[0].name; startCoord = withCoords[0].coord;
        end   = withCoords[withCoords.length - 1].name; endCoord = withCoords[withCoords.length - 1].coord;
      }
    }
    if(!start || !end){ out.err = 'no clinics'; return out; }
    out.startCoord = startCoord; out.endCoord = endCoord;
    // Reset planner state
    window._RP_AI && (window._RP_AI.autoSuggestLast = null);
    // Use _rpQuickPickPin to commit Start then End — pass real coords
    if(typeof rpPickFromMapMode === 'function') rpPickFromMapMode('start');
    if(typeof _rpQuickPickPin === 'function') _rpQuickPickPin(start, startCoord);
    if(typeof rpPickFromMapMode === 'function') rpPickFromMapMode('end');
    if(typeof _rpQuickPickPin === 'function') _rpQuickPickPin(end, endCoord);
    out.startLabel = start; out.endLabel = end;
    out.nVal = (document.getElementById('rp-level-count') || {}).value;
    out.halfWidthVal = (document.getElementById('rp-corridor') || {}).value;
    // Run the corridor algorithm
    if(typeof _rpV5Start === 'function'){
      try { _rpV5Start(); } catch(e){ out.runErr = e.message; }
    }
    const last = window._RP_V5_LAST;
    if(!last){ out.err2 = 'no _RP_V5_LAST'; return out; }
    out.N = last.N;
    out.baseWidth = last.baseWidth;
    out.totalMi = Math.round(last.totalMi * 10) / 10;
    // Per-level snapshot
    out.perLevel = last.slices.map((s, i) => ({
      k: i + 1,
      n: s.candidates.length,
      first3: s.candidates.slice(0, 3).map(c => c.name)
    }));
    // Cross-level uniqueness check: any clinic in 2+ levels?
    const seen = {};
    let dupes = 0;
    last.slices.forEach((s, i) => {
      s.candidates.forEach(c => {
        if(seen[c.name] != null && seen[c.name] !== i) dupes++;
        seen[c.name] = i;
      });
    });
    out.crossLevelDupes = dupes;
    return out;
  });
  note('  → N=' + phase26.N + ', halfWidth=' + phase26.baseWidth + ' mi, totalMi=' + phase26.totalMi);
  note('  → per-level: ' + JSON.stringify(phase26.perLevel));
  note('  → cross-level dupes: ' + phase26.crossLevelDupes + ' (should be 0)');

  // ── (6.6) Phase 27 — connection rule unit test ───────────────────────
  note('--- Step: Phase 27 connection-rule unit test ---');
  const phase27 = await page.evaluate(() => {
    // Synthetic picks along x=0..1 with varying perp distances.
    // halfWidth = 2 mi. Sequence: y = 0 (start), 0.5, 1.0, 4.0, 1.5, 0.8
    // Walk: 0->0.5 (Δ=0.5 ✓), 0.5->1.0 (Δ=0.5 ✓), 1.0->4.0 (Δ=3.0 ✗ SKIP),
    //       1.0->1.5 (Δ=0.5 ✓), 1.5->0.8 (Δ=0.7 ✓).
    // Expected: kept = [p1, p2, p4, p5], skipped = [p3].
    const picks = [
      { name: 'P1', t: 0.1, perp:  0.5, coord:{lat:0,lng:0} },
      { name: 'P2', t: 0.3, perp:  1.0, coord:{lat:0,lng:0} },
      { name: 'P3', t: 0.5, perp:  4.0, coord:{lat:0,lng:0} },
      { name: 'P4', t: 0.7, perp:  1.5, coord:{lat:0,lng:0} },
      { name: 'P5', t: 0.9, perp:  0.8, coord:{lat:0,lng:0} }
    ];
    if(typeof _rpV5ApplyConnectionRule !== 'function') return { err: 'fn missing' };
    const r = _rpV5ApplyConnectionRule(picks, 2);
    return {
      kept:    r.kept.map(p => p.name),
      skipped: r.skipped.map(p => p.name + ' (' + p._skipReason + ')')
    };
  });
  note('  → kept:    ' + JSON.stringify(phase27.kept));
  note('  → skipped: ' + JSON.stringify(phase27.skipped));
  note('  → expected kept: ["P1","P2","P4","P5"]  · expected skipped: ["P3"]');

  // ── (6.7) Phase 28 — quantile bounds + pin state + centerline ─────────
  note('--- Step: Phase 28 quantile slicing + pin mutation + centerline ---');
  const phase28 = await page.evaluate(() => {
    const out = {};
    const last = window._RP_V5_LAST;
    if(!last){ return { err: 'no _RP_V5_LAST' }; }
    out.N = last.N;
    out.quantileBounds = last.quantileBounds;
    // Are the bounds non-uniform (quantile) or uniform (equal interval)?
    let uniform = true;
    if(last.quantileBounds && last.quantileBounds.length > 2){
      const expected = 1 / last.N;
      for(let i = 1; i < last.quantileBounds.length - 1; i++){
        const interval = last.quantileBounds[i] - last.quantileBounds[i-1];
        if(Math.abs(interval - expected) > 0.01){ uniform = false; break; }
      }
    }
    out.boundsAreNonUniform = !uniform;   // true means quantile is working
    // Per-level counts using new bounds
    out.perLevelCounts = last.slices.map(s => s.candidates.length);
    // Pin registry / state probe
    out.pinRegistrySize = Object.keys(window._RP_PIN_REGISTRY || {}).length;
    out.helperExists = typeof window._rpSetPinState === 'function';
    // Centerline check (Phase 28 — now glow + main)
    out.centerlineHasGlow = !!(window._DV_CENTERLINE && window._DV_CENTERLINE.glow);
    out.centerlineHasMain = !!(window._DV_CENTERLINE && window._DV_CENTERLINE.main);
    return out;
  });
  note('  → N=' + phase28.N + ', bounds=' + JSON.stringify(phase28.quantileBounds));
  note('  → quantile (non-uniform): ' + phase28.boundsAreNonUniform);
  note('  → per-level counts: ' + JSON.stringify(phase28.perLevelCounts));
  note('  → pin registry: ' + phase28.pinRegistrySize + ' pins · helper: ' + phase28.helperExists);
  note('  → centerline: glow=' + phase28.centerlineHasGlow + ', main=' + phase28.centerlineHasMain);

  // ── (6.8) Phase 29 — flat list (no level wizard) ──────────────────────
  note('--- Step: Phase 29 flat list rendering + toggle ---');
  const phase29 = await page.evaluate(() => {
    const last = window._RP_V5_LAST;
    if(!last) return { err: 'no _RP_V5_LAST' };
    const out = {
      flatCount: (last.flatCandidates || []).length,
      flatHelperExists: typeof window._rpV5ShowFlatList === 'function',
      toggleHelperExists: typeof window._rpV5ToggleFlat === 'function',
      flatPicksInitially: Object.keys(window._RP_V5_FLAT_PICKS || {}).length,
      flatSortedByT: true
    };
    // Verify sort order
    let prev = -Infinity;
    (last.flatCandidates || []).forEach(c => {
      if(c.t < prev) out.flatSortedByT = false;
      prev = c.t;
    });
    // Toggle the first 3 candidates ON, verify state
    const firstThree = (last.flatCandidates || []).slice(0, 3);
    firstThree.forEach(c => window._rpV5ToggleFlat(c.name, true));
    out.afterToggle = Object.keys(window._RP_V5_FLAT_PICKS || {}).length;
    // Verify the picked pins flipped to 'picked' state
    out.firstThreePinStates = firstThree.map(c => window._RP_PIN_STATE && window._RP_PIN_STATE[c.name]);
    // Run the connection rule on the picked set
    if(typeof window._rpV5BuildConnectionPreview === 'function'){
      const html = window._rpV5BuildConnectionPreview();
      out.previewHasContent = !!html && html.length > 20;
    }
    return out;
  });
  note('  → flat candidates: ' + phase29.flatCount + ' · sorted by t: ' + phase29.flatSortedByT);
  note('  → helpers exist: show=' + phase29.flatHelperExists + ', toggle=' + phase29.toggleHelperExists);
  note('  → toggled 3 ON → flatPicks count: ' + phase29.afterToggle + ' (expect 3)');
  note('  → first three pin states: ' + JSON.stringify(phase29.firstThreePinStates) + ' (expect all "picked")');
  note('  → connection preview built: ' + phase29.previewHasContent);

  // ── (6.9) Phase 30 — corridor rectangle + AI button rewire ────────────
  note('--- Step: Phase 30 corridor box + AI button ---');
  const phase30 = await page.evaluate(() => {
    const out = {};
    // Centerline should already exist from earlier steps
    out.centerlineExists = !!(window._DV_CENTERLINE && window._DV_CENTERLINE.main);
    // Trigger box refresh and check
    if(typeof window._rpRefreshCorridorBox === 'function'){
      window._rpRefreshCorridorBox();
      out.boxFn = true;
    }
    out.boxFill = !!(window._DV_CORRIDOR_BOX && window._DV_CORRIDOR_BOX.fill);
    out.boxEdge = !!(window._DV_CORRIDOR_BOX && window._DV_CORRIDOR_BOX.edge);
    // Check the AI button is wired to _rpRunAutoCompute, not the old fn
    const btn = document.getElementById('rp-ai-suggest-n-btn');
    out.btnExists = !!btn;
    out.btnOnclick = btn ? (btn.getAttribute('onclick') || '') : '';
    out.runAutoExists = typeof window._rpRunAutoCompute === 'function';
    // Force-run the auto-compute and check that the inputs got values
    if(typeof window._rpRunAutoCompute === 'function'){
      try { window._rpRunAutoCompute(); } catch(e){ out.runErr = e.message; }
    }
    out.nVal = (document.getElementById('rp-level-count') || {}).value;
    out.halfVal = (document.getElementById('rp-corridor') || {}).value;
    return out;
  });
  note('  → centerline: ' + phase30.centerlineExists + ' · corridor box: fill=' + phase30.boxFill + ', edge=' + phase30.boxEdge);
  note('  → AI button exists: ' + phase30.btnExists + ' · onclick: ' + phase30.btnOnclick);
  note('  → after _rpRunAutoCompute: N=' + phase30.nVal + ', halfWidth=' + phase30.halfVal);

  // ── (6.10) Phase 31 — override-on-reclick (preview pin chain) ─────────
  note('--- Step: Phase 31 override-on-reclick preview chain ---');
  const phase31 = await page.evaluate(() => {
    // Need 3 clinics with coords to simulate the click chain
    if(typeof CLINIC_BANK === 'undefined') return { err: 'no CLINIC_BANK' };
    let names = [];
    for(const c of CLINIC_BANK){
      if(c && c.n && typeof getCoordForBusiness === 'function' && getCoordForBusiness(c.n)){
        names.push(c.n);
        if(names.length === 3) break;
      }
    }
    if(names.length < 3) return { err: 'need 3 clinics' };
    const out = { names: names };
    // Arm start
    if(typeof rpPickFromMapMode === 'function') rpPickFromMapMode('start');
    out.awaitingAfterArm = window._RP_DIALOG_AWAITING;
    // Click pin 1 -> preview
    if(typeof _rpDialogConsumePinClick === 'function') _rpDialogConsumePinClick(names[0]);
    out.pendingA = window._RP_DIALOG_PENDING && window._RP_DIALOG_PENDING.name;
    out.pin0StateA = window._RP_PIN_STATE && window._RP_PIN_STATE[names[0]];
    // Click pin 2 -> overrides
    if(typeof _rpDialogConsumePinClick === 'function') _rpDialogConsumePinClick(names[1]);
    out.pendingB = window._RP_DIALOG_PENDING && window._RP_DIALOG_PENDING.name;
    out.pin0StateB = window._RP_PIN_STATE && window._RP_PIN_STATE[names[0]];   // expect reverted (undefined)
    out.pin1StateB = window._RP_PIN_STATE && window._RP_PIN_STATE[names[1]];   // expect 'preview'
    // Click pin 3 -> overrides pin 2
    if(typeof _rpDialogConsumePinClick === 'function') _rpDialogConsumePinClick(names[2]);
    out.pendingC = window._RP_DIALOG_PENDING && window._RP_DIALOG_PENDING.name;
    out.pin1StateC = window._RP_PIN_STATE && window._RP_PIN_STATE[names[1]];   // expect reverted
    out.pin2StateC = window._RP_PIN_STATE && window._RP_PIN_STATE[names[2]];   // expect 'preview'
    // Confirm -> pin 3 becomes 'start', pending clears
    if(typeof _rpConfirmPendingPick === 'function') _rpConfirmPendingPick();
    out.awaitingAfterConfirm = window._RP_DIALOG_AWAITING;
    out.pin2StateD = window._RP_PIN_STATE && window._RP_PIN_STATE[names[2]];   // expect 'start'
    return out;
  });
  note('  → arm START → awaiting=' + phase31.awaitingAfterArm);
  note('  → click pin0: pending=' + phase31.pendingA + ', pin0=' + phase31.pin0StateA + ' (expect preview)');
  note('  → click pin1: pending=' + phase31.pendingB + ', pin0=' + phase31.pin0StateB + ' (expect undefined), pin1=' + phase31.pin1StateB + ' (expect preview)');
  note('  → click pin2: pending=' + phase31.pendingC + ', pin1=' + phase31.pin1StateC + ' (expect undefined), pin2=' + phase31.pin2StateC + ' (expect preview)');
  note('  → confirm: awaiting=' + phase31.awaitingAfterConfirm + ' (expect null), pin2=' + phase31.pin2StateD + ' (expect start)');

  // ── (7) Random Pick wizard — click pick-on-map, expect drawer stays ──
  note('--- Step: Random Pick mode + wizard pick ---');
  const randomRes = await page.evaluate(() => {
    if(typeof _rpSetMode === 'function') _rpSetMode('random');
    // Wait a tick for the wizard to render
    return new Promise(resolve => {
      setTimeout(() => {
        if(typeof _rpRwGoto === 'function') _rpRwGoto(1);
        const out = {};
        out.beforeStartType = window._RP_RW && window._RP_RW.startType;
        // Click the pick-on-map button (the bug we fixed — defaulted facility → no-op)
        if(typeof _rpRwStartPickOnMap === 'function'){
          try { _rpRwStartPickOnMap(); out.called = true; }
          catch(e){ out.err = e.message; }
        }
        out.afterStartType = window._RP_RW && window._RP_RW.startType;
        out.mapPickActive  = !!window._RP_RW_MAP_PICK_ACTIVE;
        out.bannerExists   = !!document.getElementById('rp-rw-map-pick-banner');
        out.drawer = (document.getElementById('route-planner-modal') || {}).style?.display;
        resolve(out);
      }, 600);
    });
  });
  note('  → ' + JSON.stringify(randomRes));

  await page.screenshot({ path: SHOT, fullPage: false });
  fs.writeFileSync(TRACE, log.join('\n'), 'utf8');
  await browser.close();
  console.log('Screenshot: ' + SHOT);
  console.log('Log: ' + TRACE);
})().catch(e => { console.error(e); process.exit(1); });
