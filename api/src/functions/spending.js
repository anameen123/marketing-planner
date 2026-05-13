// ════════════════════════════════════════════════════════════════════════════
// /api/spending — visit-spending CRUD endpoints
// ────────────────────────────────────────────────────────────────────────────
// Backs the row.spending object in the HTML. One Cosmos doc per spending
// entry (one per visit). Partitioned by /visitId so all spending changes
// for a single visit live in the same partition.
// ════════════════════════════════════════════════════════════════════════════

import { app } from '@azure/functions';
import { queryAll, fetchOne, upsert } from '../shared/cosmos.js';
import { requireAuth, getPrincipal, isAdmin } from '../shared/auth.js';

// ── GET /api/spending ──────────────────────────────────────────────────────
// Optional filters: from / to (date range), member, business, overOnly
app.http('listSpending', {
  methods: ['GET'],
  route: 'spending',
  authLevel: 'anonymous',
  handler: requireAuth(async (request) => {
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get('from');
    const dateTo   = url.searchParams.get('to');
    const member   = url.searchParams.get('member');
    const business = url.searchParams.get('business');
    const overOnly = url.searchParams.get('overOnly') === 'true';

    // Spending is keyed by visitId. Filtering by date / member / business
    // requires joining visit info into the spending docs (we denormalize at
    // write time — every spending doc carries its visit's date + member +
    // clinic so we can filter cheaply without a join.)
    let sql = 'SELECT * FROM c WHERE c.visitDate IS NOT NULL';
    const params = [];
    if (dateFrom) { sql += ' AND c.visitDate >= @from'; params.push({ name: '@from', value: dateFrom }); }
    if (dateTo)   { sql += ' AND c.visitDate <= @to';   params.push({ name: '@to',   value: dateTo   }); }
    if (member)   { sql += ' AND c.member = @member';   params.push({ name: '@member', value: member }); }
    if (business) { sql += ' AND c.clinic = @business'; params.push({ name: '@business', value: business }); }
    if (overOnly) { sql += ' AND c.overLimit = true'; }
    sql += ' ORDER BY c.visitDate DESC';

    const entries = await queryAll('spending', sql, params);
    return { jsonBody: { entries, count: entries.length } };
  })
});

// ── POST /api/spending ─────────────────────────────────────────────────────
// Create or update a visit's spending entry. Idempotent — same visitId
// upserts. The over-limit / over-budget approval is captured in the body
// and persisted as part of the entry.
app.http('saveSpending', {
  methods: ['POST'],
  route: 'spending',
  authLevel: 'anonymous',
  handler: requireAuth(async (request) => {
    const body = await request.json();
    if (!body.visitId) {
      return { status: 400, jsonBody: { error: 'visitId is required' } };
    }
    const principal = getPrincipal(request);
    const now = new Date().toISOString();

    const entry = {
      id: body.visitId,                       // one spending doc per visit
      visitId: body.visitId,                  // partition key
      visitDate: body.visitDate || '',         // denormalized for query
      member: body.member || '',
      clinic: body.clinic || '',
      items: Array.isArray(body.items) ? body.items : [],
      total: typeof body.total === 'number' ? body.total : 0,
      zeroSpending: !!body.zeroSpending,
      tierAtSave: body.tierAtSave || '',
      limitAtSave: typeof body.limitAtSave === 'number' ? body.limitAtSave : 0,
      overLimit: !!body.overLimit,
      overrideReason: body.overrideReason || '',
      // Period-budget over-pool approval
      periodBudgetAtSave: body.periodBudgetAtSave || 0,
      periodBudgetOver: !!body.periodBudgetOver,
      // Audit
      confirmedBy: principal?.userDetails || 'unknown',
      confirmedAt: now,
      updatedAt: now
    };

    const saved = await upsert('spending', entry);
    return { jsonBody: saved };
  })
});

// ── GET /api/spending/{visitId} ────────────────────────────────────────────
app.http('getSpending', {
  methods: ['GET'],
  route: 'spending/{visitId}',
  authLevel: 'anonymous',
  handler: requireAuth(async (request, context) => {
    const visitId = context.params?.visitId;
    if (!visitId) {
      return { status: 400, jsonBody: { error: 'visitId is required' } };
    }
    const entry = await fetchOne('spending', visitId, visitId);
    if (!entry) return { status: 404, jsonBody: { error: 'No spending entry for this visit' } };
    return { jsonBody: entry };
  })
});
