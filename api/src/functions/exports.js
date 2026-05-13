// ════════════════════════════════════════════════════════════════════════════
// /api/export/monthly + /api/export/quarterly — called by Power Automate
// ────────────────────────────────────────────────────────────────────────────
// Returns an array of base64-encoded .xlsx files for a given month or
// quarter. Power Automate then writes each file to SharePoint.
// ────────────────────────────────────────────────────────────────────────────
// Auth: API-key based. Power Automate sends X-API-Key header matching the
// EXPORT_API_KEY app setting. NOT user-authenticated because Power Automate
// runs unattended on a schedule.
// ════════════════════════════════════════════════════════════════════════════

import { app } from '@azure/functions';
import ExcelJS from 'exceljs';
import { queryAll } from '../shared/cosmos.js';

// Validate the API-key header. Returns true if it matches the env var.
function checkApiKey(request) {
  const expected = process.env.EXPORT_API_KEY;
  if (!expected) return false;  // misconfigured — fail closed
  const got = request.headers.get('x-api-key');
  return got === expected;
}

// Turn an array of {colKey: value} rows into a base64 .xlsx string. Header
// row is taken from the keys of the FIRST row.
async function toXlsxBase64(sheetName, rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Marketing Planner';
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName);

  if (rows.length === 0) {
    ws.addRow(['No data for this period']);
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf).toString('base64');
  }

  const cols = Object.keys(rows[0]);
  ws.columns = cols.map(c => ({ header: c, key: c, width: Math.max(15, c.length + 2) }));
  // Style the header row
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  rows.forEach(r => ws.addRow(r));
  // Auto-filter on header row so the recipient can sort/filter immediately
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf).toString('base64');
}

// ── GET /api/export/monthly?month=2026-05 ──────────────────────────────────
app.http('exportMonthly', {
  methods: ['GET'],
  route: 'export/monthly',
  authLevel: 'anonymous',
  handler: async (request) => {
    if (!checkApiKey(request)) return { status: 401, jsonBody: { error: 'Invalid API key' } };

    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month');  // YYYY-MM or "last"
    let month = monthParam;
    if (month === 'last' || !month) {
      // Default: previous calendar month (typical when the flow runs on the 1st)
      const d = new Date();
      d.setDate(0);  // last day of previous month
      month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }

    const monthStart = month + '-01';
    const [year, mNum] = month.split('-').map(Number);
    const monthEnd = new Date(year, mNum, 0).toISOString().slice(0, 10);   // last day of month

    // ── Pull data ─────────────────────────────────────────────────────────
    const visits = await queryAll('visits',
      'SELECT * FROM c WHERE c.date >= @start AND c.date <= @end ORDER BY c.date',
      [{ name: '@start', value: monthStart }, { name: '@end', value: monthEnd }]
    );
    const spending = await queryAll('spending',
      'SELECT * FROM c WHERE c.visitDate >= @start AND c.visitDate <= @end',
      [{ name: '@start', value: monthStart }, { name: '@end', value: monthEnd }]
    );
    const referrals = await queryAll('businessReferrals', 'SELECT * FROM c');
    const conversions = await queryAll('monthlyConversions',
      'SELECT * FROM c WHERE c.month = @month',
      [{ name: '@month', value: month }]
    );
    const sideActivities = await queryAll('sideActivities',
      'SELECT * FROM c WHERE c.monthKey = @month',
      [{ name: '@month', value: month }]
    );

    // ── Flatten into Excel-friendly rows ──────────────────────────────────
    const visitRows = visits.map(v => ({
      Date: v.date,
      'Day of week': new Date(v.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
      Members: [v.member, ...(v.coMembers || [])].filter(Boolean).join('; '),
      Business: v.clinic || '',
      Area: v.customCity || '',
      Specialty: v.specialty || '',
      Doctor: v.doctor || '',
      Status: v.status || '',
      'Lead status': v.relationship || '',
      'Lead level': v.establishedLevel || 0,
      'Lead notes': v.leadNotes || '',
      'Rescheduled to': v.rd || '',
      'Member confirmed': v.memberConfirmed ? 'Yes' : 'No',
      'Row confirmed (3rd level)': v.rowConfirmed ? 'Yes' : 'No',
      Notes: v.notes || '',
      'Created by': v.createdBy || '',
      'Created at': v.createdAt || ''
    }));

    // Member aggregates
    const memberAgg = {};
    visits.forEach(v => {
      [v.member, ...(v.coMembers || [])].filter(Boolean).forEach(m => {
        if (!memberAgg[m]) memberAgg[m] = { Member: m, Total: 0, Completed: 0, Postponed: 0, Canceled: 0, Pending: 0, 'Leads (established)': 0 };
        memberAgg[m].Total++;
        if (v.status === 'Completed') memberAgg[m].Completed++;
        else if (v.status === 'Postponed') memberAgg[m].Postponed++;
        else if (v.status === 'Canceled')  memberAgg[m].Canceled++;
        else memberAgg[m].Pending++;
        if (v.relationship === 'established') memberAgg[m]['Leads (established)']++;
      });
    });
    const memberRows = Object.values(memberAgg).map(r => ({
      ...r,
      'Completion %': r.Total > 0 ? Math.round((r.Completed / r.Total) * 100) + '%' : '0%'
    }));

    // Team totals
    const teamRow = Object.values(memberAgg).reduce((a, r) => ({
      Total:     a.Total     + r.Total,
      Completed: a.Completed + r.Completed,
      Postponed: a.Postponed + r.Postponed,
      Canceled:  a.Canceled  + r.Canceled,
      Pending:   a.Pending   + r.Pending,
      Leads:     a.Leads     + r['Leads (established)']
    }), { Total: 0, Completed: 0, Postponed: 0, Canceled: 0, Pending: 0, Leads: 0 });
    const teamRows = [
      { Metric: 'Month',                Value: month },
      { Metric: 'Total assigned visits', Value: teamRow.Total },
      { Metric: 'Completed',             Value: teamRow.Completed },
      { Metric: 'Postponed',             Value: teamRow.Postponed },
      { Metric: 'Canceled',              Value: teamRow.Canceled },
      { Metric: 'Pending',               Value: teamRow.Pending },
      { Metric: 'Leads established',     Value: teamRow.Leads },
      { Metric: 'Completion %',          Value: teamRow.Total > 0 ? Math.round((teamRow.Completed / teamRow.Total) * 100) + '%' : '0%' }
    ];

    // Spending rows (item-level)
    const spendingRows = [];
    spending.forEach(s => {
      if (s.zeroSpending) {
        spendingRows.push({
          Date: s.visitDate, Member: s.member, Business: s.clinic, Item: '(zero-spending visit)',
          Qty: '', 'Price each': '', 'Item total': 0, 'Visit total': 0, 'Tier at save': s.tierAtSave,
          'Per-visit cap': s.limitAtSave, 'Over cap': 'No', 'Override reason': '',
          'Confirmed by': s.confirmedBy, 'Confirmed at': s.confirmedAt
        });
      } else {
        (s.items || []).forEach(item => {
          spendingRows.push({
            Date: s.visitDate, Member: s.member, Business: s.clinic,
            Item: item.item || '', Qty: item.qty || 0,
            'Price each': item.price || 0, 'Item total': item.total || 0,
            'Visit total': s.total, 'Tier at save': s.tierAtSave,
            'Per-visit cap': s.limitAtSave, 'Over cap': s.overLimit ? 'Yes' : 'No',
            'Override reason': s.overrideReason || '',
            'Confirmed by': s.confirmedBy, 'Confirmed at': s.confirmedAt
          });
        });
      }
    });

    const referralRows = referrals.map(r => ({
      Business: r.name, Type: r.type || '',
      'Current count': r.currentCount || 0,
      'Last updated': r.lastUpdatedAt || '',
      'Updated by': r.lastUpdatedBy || ''
    }));

    const conversionRows = conversions.map(c => ({
      Member: c.memberName, Month: c.month,
      'Week 1': c.weeks?.[0] || 0, 'Week 2': c.weeks?.[1] || 0,
      'Week 3': c.weeks?.[2] || 0, 'Week 4': c.weeks?.[3] || 0,
      'Month total': c.monthTotal || 0
    }));

    const sideRows = sideActivities.map(s => ({
      Member: s.memberName, Date: s.activityDate, Description: s.description,
      'Logged at': s.addedAt
    }));

    // ── Build all 7 files in parallel ─────────────────────────────────────
    const [visitsFile, memberFile, teamFile, spendingFile, referralFile, conversionFile, sideFile] = await Promise.all([
      toXlsxBase64('Visits',          visitRows),
      toXlsxBase64('Member Stats',    memberRows),
      toXlsxBase64('Team Stats',      teamRows),
      toXlsxBase64('Spending',        spendingRows),
      toXlsxBase64('Referrals',       referralRows),
      toXlsxBase64('Conversions',     conversionRows),
      toXlsxBase64('Side Activities', sideRows)
    ]);

    return {
      jsonBody: {
        month,
        files: [
          { name: `visits_${month}.xlsx`,           base64: visitsFile      },
          { name: `member_stats_${month}.xlsx`,     base64: memberFile      },
          { name: `team_stats_${month}.xlsx`,       base64: teamFile        },
          { name: `spending_${month}.xlsx`,         base64: spendingFile    },
          { name: `referrals_${month}.xlsx`,        base64: referralFile    },
          { name: `conversions_${month}.xlsx`,      base64: conversionFile  },
          { name: `side_activities_${month}.xlsx`,  base64: sideFile        }
        ]
      }
    };
  }
});

// ── GET /api/export/quarterly?quarter=2026-Q2 ──────────────────────────────
app.http('exportQuarterly', {
  methods: ['GET'],
  route: 'export/quarterly',
  authLevel: 'anonymous',
  handler: async (request) => {
    if (!checkApiKey(request)) return { status: 401, jsonBody: { error: 'Invalid API key' } };

    const url = new URL(request.url);
    const q = url.searchParams.get('quarter');
    if (!q || !/^\d{4}-Q[1-4]$/.test(q)) {
      return { status: 400, jsonBody: { error: 'quarter param required, format: YYYY-Qx' } };
    }

    // Pull every referral record's snapshot for this quarter from history[]
    const referrals = await queryAll('businessReferrals', 'SELECT * FROM c');
    const rankingRows = [];
    referrals.forEach(r => {
      const snap = (r.history || []).find(h => h.period === q);
      if (!snap) return;
      rankingRows.push({
        Business: r.name, Type: r.type, Quarter: q,
        'Final ref count': snap.count, 'Tier (locked)': snap.tierName || snap.tier,
        '$ Per-visit cap': snap.limitPerVisit || 0,
        '$ Period budget': snap.periodBudget || 0,
        'Locked at': snap.lockedAt
      });
    });
    // Sort by ref count desc per type
    rankingRows.sort((a, b) => {
      if (a.Type !== b.Type) return a.Type.localeCompare(b.Type);
      return b['Final ref count'] - a['Final ref count'];
    });

    // Team summary for the quarter
    const [qy, qNum] = q.split('-Q').map(Number);
    const qStart = new Date(qy, (qNum - 1) * 3, 1).toISOString().slice(0, 10);
    const qEnd   = new Date(qy, qNum * 3, 0).toISOString().slice(0, 10);
    const visits = await queryAll('visits',
      'SELECT * FROM c WHERE c.date >= @s AND c.date <= @e',
      [{ name: '@s', value: qStart }, { name: '@e', value: qEnd }]
    );
    const spending = await queryAll('spending',
      'SELECT * FROM c WHERE c.visitDate >= @s AND c.visitDate <= @e',
      [{ name: '@s', value: qStart }, { name: '@e', value: qEnd }]
    );
    const totalSpend = spending.filter(s => !s.zeroSpending).reduce((sum, s) => sum + (s.total || 0), 0);
    const summaryRows = [
      { Metric: 'Quarter',           Value: q },
      { Metric: 'Period start',      Value: qStart },
      { Metric: 'Period end',        Value: qEnd },
      { Metric: 'Total visits',      Value: visits.length },
      { Metric: 'Completed',         Value: visits.filter(v => v.status === 'Completed').length },
      { Metric: 'Postponed',         Value: visits.filter(v => v.status === 'Postponed').length },
      { Metric: 'Canceled',          Value: visits.filter(v => v.status === 'Canceled').length },
      { Metric: 'Leads established', Value: visits.filter(v => v.relationship === 'established').length },
      { Metric: 'Total spending',    Value: '$' + totalSpend.toFixed(2) }
    ];

    const [rankingFile, summaryFile] = await Promise.all([
      toXlsxBase64('Quarterly Rankings', rankingRows),
      toXlsxBase64('Quarterly Summary',  summaryRows)
    ]);

    return {
      jsonBody: {
        quarter: q,
        files: [
          { name: `quarterly_rankings_${q}.xlsx`, base64: rankingFile },
          { name: `quarterly_summary_${q}.xlsx`,  base64: summaryFile }
        ]
      }
    };
  }
});
