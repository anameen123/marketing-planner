// ════════════════════════════════════════════════════════════════════════════
// /api/visits — schedule visit CRUD endpoints
// ────────────────────────────────────────────────────────────────────────────
// GET    /api/visits          — list (optionally filter by date or member)
// POST   /api/visits          — create a new visit
// PUT    /api/visits/{id}     — update a visit (status, member, lead, etc.)
// DELETE /api/visits/{id}     — remove a visit (admin only)
// ────────────────────────────────────────────────────────────────────────────
// Backs the schedule's S.days[].rows[] structure in the HTML. Each Cosmos
// document is one row (one visit). Partition key is /date so all visits on
// a single day live in the same partition for cheap range queries.
// ════════════════════════════════════════════════════════════════════════════

import { app } from '@azure/functions';
import { container, queryAll, fetchOne, upsert, remove } from '../shared/cosmos.js';
import { requireAuth, requireAdmin, getPrincipal, isAdmin } from '../shared/auth.js';

// ── GET /api/visits ────────────────────────────────────────────────────────
app.http('listVisits', {
  methods: ['GET'],
  route: 'visits',
  authLevel: 'anonymous',  // SWA enforces auth before reaching here
  handler: requireAuth(async (request) => {
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get('from');
    const dateTo   = url.searchParams.get('to');
    const member   = url.searchParams.get('member');

    // Build SQL with whichever filters were given. We always filter at the
    // database side rather than in JS because the visits container could
    // grow to thousands of docs over time.
    let sql = 'SELECT * FROM c WHERE 1=1';
    const params = [];
    if (dateFrom) { sql += ' AND c.date >= @from'; params.push({ name: '@from', value: dateFrom }); }
    if (dateTo)   { sql += ' AND c.date <= @to';   params.push({ name: '@to',   value: dateTo   }); }
    if (member)   { sql += ' AND (c.member = @member OR ARRAY_CONTAINS(c.coMembers, @member))'; params.push({ name: '@member', value: member }); }
    sql += ' ORDER BY c.date ASC';

    const visits = await queryAll('visits', sql, params);
    return { jsonBody: { visits, count: visits.length } };
  })
});

// ── POST /api/visits ───────────────────────────────────────────────────────
app.http('createVisit', {
  methods: ['POST'],
  route: 'visits',
  authLevel: 'anonymous',
  handler: requireAuth(async (request) => {
    const body = await request.json();

    // Validate the required fields. Returns a 400 with a clear error message
    // so the client can show it inline.
    const missing = [];
    if (!body.date)    missing.push('date');
    if (!body.clinic)  missing.push('clinic');
    if (missing.length) {
      return { status: 400, jsonBody: { error: 'Missing required fields', fields: missing } };
    }

    // Date integrity rule (mirrors the HTML's logic): cannot create a visit
    // for a past date as status=Completed. Other statuses are fine.
    const today = new Date().toISOString().slice(0, 10);
    if (body.status === 'Completed' && body.date < today) {
      return { status: 400, jsonBody: { error: 'Cannot mark a past-date visit as Completed at creation time' } };
    }

    const principal = getPrincipal(request);
    const now = new Date().toISOString();

    const visit = {
      id: body.id || crypto.randomUUID(),
      date: body.date,                       // partition key
      clinic: body.clinic,
      member: body.member || '',
      coMembers: body.coMembers || [],
      memberConfirmed: !!body.memberConfirmed,
      status: body.status || 'Pending',      // Pending / Completed / Postponed / Canceled
      rd: body.rd || '',                      // rescheduled date
      relationship: body.relationship || '',
      establishedLevel: body.establishedLevel || 0,
      leadNotes: body.leadNotes || '',
      relNotes: body.relNotes || '',
      rowConfirmed: !!body.rowConfirmed,
      isRescheduled: !!body.isRescheduled,
      rescheduledFrom: body.rescheduledFrom || null,
      isMosque: !!body.isMosque,
      isManual: !!body.isManual,
      customCity: body.customCity || '',
      doctor: body.doctor || '',
      specialty: body.specialty || '',
      notes: body.notes || '',
      // Audit
      createdBy: principal?.userDetails || 'unknown',
      createdAt: now,
      updatedAt: now
    };

    const saved = await upsert('visits', visit);
    await logActivity(principal, 'visit.create', { visitId: saved.id, clinic: saved.clinic, date: saved.date });
    return { status: 201, jsonBody: saved };
  })
});

// ── PUT /api/visits/{id} ───────────────────────────────────────────────────
app.http('updateVisit', {
  methods: ['PUT'],
  route: 'visits/{id}',
  authLevel: 'anonymous',
  handler: requireAuth(async (request, context) => {
    const id = context.params?.id;
    const url = new URL(request.url);
    const date = url.searchParams.get('date');  // partition key needed for read

    if (!id || !date) {
      return { status: 400, jsonBody: { error: 'id (path) and date (query string) are required' } };
    }

    const existing = await fetchOne('visits', id, date);
    if (!existing) return { status: 404, jsonBody: { error: 'Visit not found' } };

    const body = await request.json();
    const principal = getPrincipal(request);

    // ── Date-integrity rules (mirror the HTML's logic, enforced server-side) ─
    const today = new Date().toISOString().slice(0, 10);
    if (body.status === 'Completed' && existing.date > today) {
      return { status: 400, jsonBody: { error: 'Cannot mark a future visit as Completed' } };
    }
    if (body.rd && body.rd < today) {
      return { status: 400, jsonBody: { error: 'Cannot reschedule to a past date' } };
    }

    // Edit-window rule: members can only edit within visit_date + 2 days.
    // Admin bypasses this. Computed in epoch ms for clean comparison.
    if (!isAdmin(request)) {
      const visitMs = new Date(existing.date + 'T00:00:00').getTime();
      const editWindowEnd = visitMs + (2 * 86400000);
      if (Date.now() > editWindowEnd) {
        return { status: 403, jsonBody: { error: 'Edit window closed — admin override required' } };
      }
    }

    // Merge the body onto the existing doc. We explicitly list updatable
    // fields so a malicious client can't overwrite createdBy / createdAt etc.
    const updatable = ['member', 'coMembers', 'memberConfirmed', 'status', 'rd',
                       'relationship', 'establishedLevel', 'leadNotes', 'relNotes',
                       'rowConfirmed', 'isRescheduled', 'rescheduledFrom',
                       'customCity', 'doctor', 'specialty', 'notes'];
    const updated = { ...existing };
    for (const field of updatable) {
      if (field in body) updated[field] = body[field];
    }
    updated.updatedAt = new Date().toISOString();
    updated.updatedBy = principal?.userDetails || 'unknown';

    const saved = await upsert('visits', updated);
    await logActivity(principal, 'visit.update', { visitId: id, changes: Object.keys(body) });
    return { jsonBody: saved };
  })
});

// ── DELETE /api/visits/{id} ────────────────────────────────────────────────
app.http('deleteVisit', {
  methods: ['DELETE'],
  route: 'visits/{id}',
  authLevel: 'anonymous',
  handler: requireAdmin(async (request, context) => {
    const id = context.params?.id;
    const url = new URL(request.url);
    const date = url.searchParams.get('date');

    if (!id || !date) {
      return { status: 400, jsonBody: { error: 'id (path) and date (query string) are required' } };
    }

    await remove('visits', id, date);
    await logActivity(getPrincipal(request), 'visit.delete', { visitId: id, date });
    return { status: 204 };
  })
});

// ── Internal: audit logging ────────────────────────────────────────────────
async function logActivity(principal, action, details) {
  try {
    await upsert('activityLog', {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),   // partition key
      timestamp: new Date().toISOString(),
      action,
      details,
      user: principal?.userDetails || 'unknown',
      role: principal?.userRoles?.[0] || 'unknown'
    });
  } catch (err) {
    // Audit logging must never break the user's action. Swallow errors here.
    console.error('[activityLog] write failed', err);
  }
}
