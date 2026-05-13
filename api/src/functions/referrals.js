// ════════════════════════════════════════════════════════════════════════════
// /api/referrals — patient-referral counter per business
// ────────────────────────────────────────────────────────────────────────────
// Mirrors BUSINESS_REFERRALS from the HTML. One Cosmos doc per business.
// Random + Holiday outreach are LIFETIME counters; everything else resets
// every 3 months at period rollover.
// ════════════════════════════════════════════════════════════════════════════

import { app } from '@azure/functions';
import { queryAll, fetchOne, upsert } from '../shared/cosmos.js';
import { requireAuth, getPrincipal, isReferralEditor, forbidden } from '../shared/auth.js';

// ── GET /api/referrals ─────────────────────────────────────────────────────
// Returns every business's referral record. The client groups + sorts.
app.http('listReferrals', {
  methods: ['GET'],
  route: 'referrals',
  authLevel: 'anonymous',
  handler: requireAuth(async () => {
    const records = await queryAll('businessReferrals', 'SELECT * FROM c');
    return { jsonBody: { records, count: records.length } };
  })
});

// ── POST /api/referrals/adjust ─────────────────────────────────────────────
// Bumps a single business's referral counter by a delta (positive or
// negative). ONLY admin or Ms Sadia can do this — same rule as the HTML.
app.http('adjustReferralCount', {
  methods: ['POST'],
  route: 'referrals/adjust',
  authLevel: 'anonymous',
  handler: requireAuth(async (request) => {
    if (!isReferralEditor(request)) return forbidden('Only admin or Ms Sadia can adjust referral counts');

    const body = await request.json();
    if (!body.name || typeof body.delta !== 'number') {
      return { status: 400, jsonBody: { error: 'name (string) and delta (number) are required' } };
    }
    const principal = getPrincipal(request);
    const now = new Date().toISOString();

    // Read-modify-write (Cosmos doesn't have atomic counters; we accept
    // the small race-condition risk because referral edits are rare and
    // manual.)
    let rec = await fetchOne('businessReferrals', body.name, body.name);
    if (!rec) {
      // Auto-create on first bump — matches HTML behavior
      rec = {
        id: body.name,
        name: body.name,                          // partition key
        type: body.type || 'clinic',
        currentCount: 0,
        periodStart: body.periodStart || '',
        history: [],
        lastUpdatedBy: '',
        lastUpdatedAt: ''
      };
    }
    rec.currentCount = Math.max(0, (rec.currentCount || 0) + body.delta);
    rec.lastUpdatedBy = principal?.userDetails || 'unknown';
    rec.lastUpdatedAt = now;

    const saved = await upsert('businessReferrals', rec);
    return { jsonBody: saved };
  })
});

// ── POST /api/referrals/rollover ───────────────────────────────────────────
// Admin-only: snapshot the current period's counts into history, then reset
// counters to 0 for the new period. Skips random + holiday outreach (those
// are lifetime counters).
app.http('rolloverPeriod', {
  methods: ['POST'],
  route: 'referrals/rollover',
  authLevel: 'anonymous',
  handler: requireAuth(async (request) => {
    if (!isReferralEditor(request)) return forbidden('Only admin or Ms Sadia can lock a period');

    const body = await request.json();
    if (!body.periodLabel) {
      return { status: 400, jsonBody: { error: 'periodLabel is required (e.g. "2026-Q2")' } };
    }
    const principal = getPrincipal(request);
    const now = new Date().toISOString();

    // Read every business; snapshot the current count into history; reset.
    // Lifetime-counter businesses (random + holiday outreach) are
    // identified by their isLifetimeCounter flag and skipped.
    const records = await queryAll('businessReferrals', 'SELECT * FROM c');
    const updated = [];
    for (const rec of records) {
      if (rec.isLifetimeCounter) continue;   // skip random + holiday
      const snapshot = {
        period: body.periodLabel,
        count: rec.currentCount || 0,
        tier: rec.currentTier || null,
        tierName: rec.currentTierName || null,
        limitPerVisit: rec.currentLimitPerVisit || null,
        periodBudget: rec.currentPeriodBudget || null,
        lockedAt: now,
        lockedBy: principal?.userDetails || 'unknown'
      };
      rec.history = Array.isArray(rec.history) ? rec.history : [];
      rec.history.push(snapshot);
      rec.currentCount = 0;
      rec.periodStart = '';
      await upsert('businessReferrals', rec);
      updated.push(rec.name);
    }

    return { jsonBody: { lockedPeriod: body.periodLabel, businessesUpdated: updated.length, names: updated } };
  })
});
