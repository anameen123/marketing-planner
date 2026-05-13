// ════════════════════════════════════════════════════════════════════════════
// /api/businesses — Clinics + MVA + Outreach CRUD
// ────────────────────────────────────────────────────────────────────────────
// All three lists live in the same Cosmos container, distinguished by /type
// (clinic | mva | outreach). Admin can add / edit / delete; others read-only.
// Outreach has a sub-category field (random / scheduled / holiday).
// ════════════════════════════════════════════════════════════════════════════

import { app } from '@azure/functions';
import { queryAll, fetchOne, upsert, remove } from '../shared/cosmos.js';
import { requireAuth, requireAdmin, getPrincipal } from '../shared/auth.js';

// ── GET /api/businesses?type=clinic|mva|outreach ───────────────────────────
app.http('listBusinesses', {
  methods: ['GET'],
  route: 'businesses',
  authLevel: 'anonymous',
  handler: requireAuth(async (request) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const category = url.searchParams.get('category');   // outreach: random|scheduled|holiday

    let sql = 'SELECT * FROM c WHERE 1=1';
    const params = [];
    if (type)     { sql += ' AND c.type = @type';         params.push({ name: '@type', value: type }); }
    if (category) { sql += ' AND c.category = @category'; params.push({ name: '@category', value: category }); }
    sql += ' ORDER BY c.name ASC';

    const records = await queryAll('businesses', sql, params);
    return { jsonBody: { records, count: records.length } };
  })
});

// ── POST /api/businesses ───────────────────────────────────────────────────
// Admin-only: create or update. Idempotent on the id field.
app.http('saveBusiness', {
  methods: ['POST'],
  route: 'businesses',
  authLevel: 'anonymous',
  handler: requireAdmin(async (request) => {
    const body = await request.json();
    if (!body.name || !body.type) {
      return { status: 400, jsonBody: { error: 'name and type are required' } };
    }
    if (!['clinic', 'mva', 'outreach'].includes(body.type)) {
      return { status: 400, jsonBody: { error: 'type must be clinic | mva | outreach' } };
    }
    const principal = getPrincipal(request);
    const now = new Date().toISOString();

    const doc = {
      id: body.id || `${body.type}-${crypto.randomUUID()}`,
      type: body.type,                              // partition key
      category: body.category || (body.type === 'outreach' ? 'random' : null),
      name: body.name,
      city: body.city || '',
      address: body.address || '',
      phone: body.phone || '',
      doctor: body.doctor || '',
      specialty: body.specialty || '',
      attorney: body.attorney || '',
      contact: body.contact || '',
      notes: body.notes || '',
      status: body.status || 'Not Visited',
      // Holiday-specific
      holidayDate: body.holidayDate || '',
      observanceType: body.observanceType || '',
      // Audit
      addedBy: body.addedBy || principal?.userDetails || 'unknown',
      addedAt: body.addedAt || now,
      updatedAt: now,
      updatedBy: principal?.userDetails || 'unknown'
    };

    const saved = await upsert('businesses', doc);
    return { jsonBody: saved };
  })
});

// ── DELETE /api/businesses/{id}?type=... ───────────────────────────────────
app.http('deleteBusiness', {
  methods: ['DELETE'],
  route: 'businesses/{id}',
  authLevel: 'anonymous',
  handler: requireAdmin(async (request, context) => {
    const id = context.params?.id;
    const url = new URL(request.url);
    const type = url.searchParams.get('type');   // partition key
    if (!id || !type) {
      return { status: 400, jsonBody: { error: 'id (path) and type (query) are required' } };
    }
    await remove('businesses', id, type);
    return { status: 204 };
  })
});
