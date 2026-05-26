// Generate a visual flowchart PDF of the Referral System scenarios.
// Designed for a manager-facing review (clean diagrams, arrows, role colors).
// Output: ~/Downloads/Referral Scenarios.pdf
const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');

const OUT_DIR = path.join(os.homedir(), 'Downloads');
// Primary output. If the file is locked (open in a PDF viewer), we fall
// back to a timestamped filename below so the build doesn't fail.
const OUT_PDF_PRIMARY = path.join(OUT_DIR, 'Referral Scenarios.pdf');
let OUT_PDF = OUT_PDF_PRIMARY;

// ── Helpers to build flowchart nodes ─────────────────────────────────────
function actor(role, label){
  const colors = {
    member: { bg:'#dbeafe', border:'#3b82f6', text:'#1e3a8a' },
    ucplano:{ bg:'#fef3c7', border:'#f59e0b', text:'#92400e' },
    fd:     { bg:'#fce7f3', border:'#ec4899', text:'#9d174d' },
    admin:  { bg:'#ede9fe', border:'#7c3aed', text:'#5b21b6' },
    patient:{ bg:'#dcfce7', border:'#22c55e', text:'#14532d' },
    system: { bg:'#f1f5f9', border:'#64748b', text:'#0f172a' }
  };
  const c = colors[role] || colors.system;
  return `<div class="actor" style="background:${c.bg};border:2px solid ${c.border};color:${c.text}">${label}</div>`;
}
function step(label, opts){
  opts = opts || {};
  const color = opts.color || '#1F3864';
  const bg = opts.bg || '#fff';
  return `<div class="step" style="border-left:4px solid ${color};background:${bg}">${label}</div>`;
}
function decision(label){
  return `<div class="decision">${label}</div>`;
}
function arrow(label){
  return `<div class="arrow"><div class="arrow-line"></div>${label ? `<div class="arrow-label">${label}</div>` : ''}<div class="arrow-head">▼</div></div>`;
}
function handoff(label){
  return `<div class="handoff"><div class="handoff-label">↓ handoff to ${label} ↓</div></div>`;
}
function branchArrow(left, right){
  return `<div class="branch">
    <div class="branch-arm"><div class="branch-line left"></div><div class="branch-label">${left}</div></div>
    <div class="branch-arm"><div class="branch-line right"></div><div class="branch-label">${right}</div></div>
  </div>`;
}
function statusBadge(label, color){
  return `<span class="badge" style="background:${color};color:#fff">${label}</span>`;
}

// ── Scenario definitions ─────────────────────────────────────────────────

const scenario1 = `
<div class="scenario">
  <h2>SCENARIO 1 — UC Plano front desk creates a referral (happy path)</h2>
  <div class="scenario-meta">Patient is physically at UC Plano. FD has their phone. Ride offered face-to-face — but UC Plano only ASKS; destination FD BOOKS.</div>
  ${actor('ucplano', '🏥 UC Plano Front Desk (Lisa)')}
  ${arrow('opens Create Referral form')}
  ${step('Fills:<br>• Patient name + patient phone (10-digit US)<br>• Source = UC Plano (auto)<br>• Destination = Frisco ER<br>• ETA: auto-suggested 3:45 PM<br>• 🚗 Ride: <strong>Asked, patient accepted</strong><br><span style="color:#6b21a8;font-size:10px">↳ UC Plano has no Uber Health account — destination FD will book it.</span>')}
  ${arrow('submit → enters PENDING_REFERRALS')}
  ${step('Status: ⏳ <strong>PENDING</strong>' + statusBadge('pending', '#f59e0b') + '<br>rideBookingStatus: <strong>needs_booking</strong>', { color:'#f59e0b', bg:'#fffbeb' })}
  ${handoff('Destination Front Desk')}
  ${actor('fd', '🏥 Frisco ER Front Desk (Sarah)')}
  ${arrow('sees pending row + 🚗 purple Uber-booking banner')}
  ${step('🚗 <strong>Book Uber Health ride</strong> banner shows on her pending row.<br>Sarah clicks <strong>✓ Mark as booked</strong> → prompted for pickup ETA / ride id.<br>Banner turns green: ✓ Uber Health booked by Sarah on May 26 3:32 PM.', { color:'#7c3aed', bg:'#faf5ff' })}
  ${arrow('audit logs ride_booked + patient arrives at 3:42 PM')}
  ${step('Sarah clicks <strong>✓ Approve & log patient</strong>')}
  ${arrow('Log Patient modal opens<br>📥 From Referral tab auto-selected')}
  ${step('🔒 Source / 🔒 Destination / 🔒 Member<br>locked from referral.<br>Sarah fills: age, gender, chief complaint,<br>payment type, her name as logger.<br>Clicks <strong>Save</strong>.')}
  ${arrow('on save')}
  ${step('• REFERRAL_LOG gets new entry<br>• PENDING_REFERRALS status → ✓ <strong>APPROVED</strong>' + statusBadge('approved', '#16a34a') + '<br>• linkedPatientLogId connects the two', { color:'#16a34a', bg:'#f0fdf4' })}
  ${arrow('counters trigger')}
  ${step('📈 UC Plano FD intake +1<br>📈 Patient survey-rate updated<br>📈 Frisco ER intake +1<br>💡 1-hour retraction window opens', { color:'#22c55e', bg:'#dcfce7' })}
</div>
`;

const scenario2 = `
<div class="scenario">
  <h2>SCENARIO 2 — Member creates with patient phone (patient is late, follow-up fires)</h2>
  <div class="scenario-meta">Member already called patient before submitting. Patient runs late → proactive popup catches it.</div>
  ${actor('member', '👥 Marketing Member (Duaa)')}
  ${arrow('opens Create Referral form')}
  ${step('Fills:<br>• Patient: Maria Lopez<br>• Patient phone: (469) 555-7788 (valid US ✓)<br>• Source: Bloomfield (PCP, Frisco)<br>• Destination: Frisco ER<br>• ETA: 2:30 PM (auto-suggested)<br>• ⚠ <strong>Required checkbox</strong>: "I called/texted the patient"')}
  ${arrow('submit')}
  ${step('Status: ⏳ <strong>PENDING</strong>' + statusBadge('pending', '#f59e0b'), { color:'#f59e0b', bg:'#fffbeb' })}
  ${arrow('2:30 PM passes → ETA + 10 min trigger at 2:40 PM')}
  ${step('System detects: <strong>now > expectedAt + 10 min</strong><br>+ Duaa is the owner (member-created)', { color:'#dc2626', bg:'#fef2f2' })}
  ${handoff('System auto-fires popup on Duaa&#39;s screen')}
  ${actor('system', '⏰ Follow-up popup — single-fire')}
  ${step('Shows: <strong>Maria Lopez is 10 min late</strong><br>Buttons: 📞 Call patient · 📞 Call clinic ·<br>🚗 Offered a ride · ✓ Arrived · ✗ No-show · 🔄 Update ETA · 📝 Note')}
  ${arrow('Duaa clicks 📞 Call patient (tel: link)')}
  ${step('Talks to Maria: "Stuck in traffic, 15 more min"<br>Duaa clicks <strong>🔄 Update ETA</strong> → picks 3:00 PM<br>+ types note: "Stuck in traffic, ETA 3:00 PM"', { color:'#7c3aed', bg:'#faf5ff' })}
  ${arrow('audit log appended + timer resets to NEW ETA + 5 min')}
  ${step('Patient arrives at Frisco ER at 2:58 PM<br>Frisco ER FD clicks ✓ Approve & log patient', { color:'#16a34a', bg:'#f0fdf4' })}
  ${arrow('approval flow same as Scenario 1')}
  ${step('Counters trigger:<br>📈 Duaa&#39;s patient count +1<br>📈 Bloomfield clinic patient count +1<br>📈 Frisco ER intake +1<br>📋 Full audit log saved with every action taken', { color:'#22c55e', bg:'#dcfce7' })}
</div>
`;

const scenario3 = `
<div class="scenario">
  <h2>SCENARIO 3 — Member creates with only clinic phone (no-show)</h2>
  <div class="scenario-meta">Member doesn't have patient's number. Source clinic was notified instead. Patient never shows up.</div>
  ${actor('member', '👥 Marketing Member (Sadia)')}
  ${arrow('opens Create Referral form')}
  ${step('Fills:<br>• Patient: Walk-in case<br>• Patient phone: (empty)<br>• <strong>Source clinic phone</strong>: (972) 555-9090<br>• Source: Care Now (UC, Frisco)<br>• Destination: Castle Hills ER<br>• ETA: 4:15 PM<br>• ⚠ <strong>Required checkbox</strong>: "Clinic notified"')}
  ${arrow('submit')}
  ${step('Status: ⏳ <strong>PENDING</strong>' + statusBadge('pending', '#f59e0b'), { color:'#f59e0b', bg:'#fffbeb' })}
  ${handoff('System fires popup on Sadia&#39;s screen — 4:25 PM (ETA + 10 min)')}
  ${actor('system', '⏰ Follow-up popup')}
  ${step('🚗 Ride option <strong>greyed out</strong> (no patient phone)<br>📞 Call patient <strong>greyed out</strong> (no patient phone)<br>📞 Call clinic ENABLED — Care Now (972) 555-9090')}
  ${arrow('Sadia clicks 📞 Call clinic')}
  ${step('Clinic: "Patient never left our office, they changed their mind"<br>Sadia clicks <strong>✗ Mark no-show</strong>', { color:'#dc2626', bg:'#fef2f2' })}
  ${arrow('immediate status flip')}
  ${step('Status: ⏰ <strong>INCOMPLETE</strong>' + statusBadge('incomplete', '#dc2626') + '<br>incompletedBy: Sadia · followUpActions logged', { color:'#dc2626', bg:'#fef2f2' })}
  ${arrow('NO counters trigger — no patient log created')}
  ${step('Referral stays visible in Pending panel with red Incomplete badge<br>+ also surfaces in calendar day-detail for the creation date', { color:'#64748b', bg:'#f8fafc' })}
</div>
`;

const scenario4 = `
<div class="scenario">
  <h2>SCENARIO 4 — Admin override (manager approves on behalf of FD)</h2>
  <div class="scenario-meta">Destination FD is unreachable. Admin steps in to approve. Override is audit-logged.</div>
  ${actor('admin', '🛡️ Admin (Mahmoud)')}
  ${arrow('sees ALL pending referrals across all facilities')}
  ${step('Spots: Maria Lopez pending at Frisco ER (3 hr old, Sarah is out)<br>Clicks <strong>✓ Approve & log patient (admin override)</strong>')}
  ${arrow('approval gate check — admin bypasses FD-only rule')}
  ${step('Log Patient modal opens (From Referral tab, fields locked)<br>Admin fills the patient details on Sarah&#39;s behalf', { color:'#7c3aed', bg:'#faf5ff' })}
  ${arrow('on save — admin override stamps')}
  ${step('Referral entry: <strong>approvedByAdmin: true</strong><br>+ approvedBy: "Mahmoud Althaher"<br>+ approvedAt: timestamp', { color:'#7c3aed', bg:'#faf5ff' })}
  ${arrow('audit banner renders on the row')}
  ${step('🛡️ <strong>Override by admin</strong> · Approved by <strong>Mahmoud Althaher</strong><br>on <strong>May 26, 5:30 PM</strong> instead of <strong>destination front desk</strong>.', { color:'#f59e0b', bg:'#fef3c7' })}
  ${arrow('visible to everyone reviewing the record later')}
  ${step('Audit trail permanently preserved.<br>Counters trigger normally (same as Sarah had approved).<br>Sarah sees the override note when she logs back in.', { color:'#16a34a', bg:'#f0fdf4' })}
</div>
`;

const scenario6 = `
<div class="scenario">
  <h2>SCENARIO 6 — Community outreach event (multiple members attend same event)</h2>
  <div class="scenario-meta">Two members attend the same outreach event on the same day. Both get personal credit; event card shows ONE visit.</div>
  ${actor('member', '👥 Duaa creates outreach visit')}
  ${arrow('picks &quot;Frisco Mosque Health Fair&quot; from OUTREACH bank · today&#39;s date')}
  ${step('Visit row created · Duaa is assigned · status Pending', { color:'#3b82f6', bg:'#dbeafe' })}
  ${handoff('Later same day — Abrar attends the SAME event')}
  ${actor('member', '👥 Abrar adds visit for the same event')}
  ${arrow('picks &quot;Frisco Mosque Health Fair&quot; · same date as Duaa&#39;s row')}
  ${step('System detects: same outreach event + same date.<br>Outreach is EXEMPT from the one-visit-per-day rule.<br>A SECOND row is created for Abrar (his own row, not a co-attendee).', { color:'#22c55e', bg:'#f0fdf4' })}
  ${arrow('both members mark Completed + add spending + lead status')}
  ${step('Two rows on the calendar:<br>• Row #9 — Duaa · Completed<br>• Row #10 — Abrar · Completed<br>Each tracks their own spending + lead outcome independently.', { color:'#7030A0', bg:'#faf5ff' })}
  ${arrow('counters trigger by different rules')}
  ${step('<strong>Per-member counters</strong> (getMemberStats):<br>• Duaa: +1 completed visit<br>• Abrar: +1 completed visit<br><br><strong>Event card recency</strong> (daysSinceLastVisit):<br>• &quot;Frisco Mosque Health Fair&quot; = 1 event today (most-recent date wins, not row count)<br><br>So both members get credit individually, but the event itself only counts as ONE relationship touchpoint.', { color:'#16a34a', bg:'#dcfce7' })}
</div>
`;

const scenario7 = `
<div class="scenario">
  <h2>SCENARIO 7 — Uber Health ride booking (full split-of-duty flow)</h2>
  <div class="scenario-meta">UC Plano asks; Frisco/Castle Hills ER books. UC Plano has no Uber Health account — the destination FD owns the booking. Includes the "couldn't book" branch.</div>
  ${actor('ucplano', '🏥 UC Plano Front Desk (Lisa)')}
  ${arrow('patient sitting in front of her — ready for transport')}
  ${step('Lisa asks: <strong>"Want us to arrange a ride to Castle Hills ER?"</strong><br>Patient says <strong>YES</strong>.<br>Lisa picks <strong>"Asked, patient accepted"</strong> on Create Referral.<br><span style="color:#6b21a8;font-size:10px">⚠ Lisa does NOT book the ride. UC Plano has no Uber Health account.</span>')}
  ${arrow('submit')}
  ${step('PENDING_REFERRALS entry:<br>rideRequested: <strong>accepted</strong><br>rideBookingStatus: <strong>needs_booking</strong>' + statusBadge('needs booking', '#7c3aed'), { color:'#7c3aed', bg:'#faf5ff' })}
  ${handoff('Castle Hills ER Front Desk')}
  ${actor('fd', '🏥 Castle Hills ER Front Desk (Sarah)')}
  ${arrow('opens Pending Referrals panel')}
  ${step('Sees prominent <strong>purple banner</strong> on the row:<br>🚗 <strong>Book Uber Health ride</strong> — Patient John Doe accepted a ride from UC Plano → Castle Hills ER.<br>"UC Plano asked the patient. <strong>You book on your Uber Health account.</strong>"<br>Two buttons: <strong>✓ Mark as booked</strong> · <strong>Couldn\\\'t book</strong>', { color:'#7c3aed', bg:'#faf5ff' })}
  ${branchArrow('Sarah books successfully ✓', 'Sarah couldn\\\'t book ✗')}
  ${step('<strong>LEFT BRANCH — Booked</strong><br>Sarah opens Uber Health, books ride, comes back.<br>Clicks <strong>✓ Mark as booked</strong> → prompt: pickup ETA / ride id.<br>Types: <em>"Pickup 3:25 PM, Uber ride #UB-4471"</em><br>Banner turns 🟢 <strong>✓ Uber Health booked by Sarah on 3:22 PM</strong>.<br>followUpActions += { action: ride_booked, by: Sarah, note: ... }', { color:'#16a34a', bg:'#f0fdf4' })}
  ${step('<strong>RIGHT BRANCH — Couldn\\\'t book</strong><br>Maybe: no driver available · insurance issue · patient changed mind.<br>Sarah clicks <strong>Couldn\\\'t book</strong> → prompt: reason (required).<br>Types: <em>"No drivers in area, patient will Uber on their own"</em><br>rideBookingStatus → <strong>cancelled</strong>.<br>followUpActions += { action: ride_booking_cancelled, note: ... }<br>Audit trail preserved — admin can review why.', { color:'#dc2626', bg:'#fef2f2' })}
  ${arrow('either way — referral approval flow continues separately')}
  ${step('Patient arrives → Sarah clicks <strong>✓ Approve & log patient</strong> as normal.<br>Counters trigger.<br>Audit trail shows: ride asked → ride booked (or cancelled) → patient logged.', { color:'#22c55e', bg:'#dcfce7' })}
</div>
`;

const scenario5 = `
<div class="scenario">
  <h2>SCENARIO 5 — Auto-expire safety net (no action by end of 1.5h)</h2>
  <div class="scenario-meta">Last-resort cleanup. Triggered when nobody — FD, member, or admin — acted on a pending referral.</div>
  ${actor('member', '👥 Member or 🏥 UC Plano FD')}
  ${arrow('creates referral at 1:00 PM, expectedAt 1:30 PM')}
  ${step('Status: ⏳ <strong>PENDING</strong>' + statusBadge('pending', '#f59e0b'), { color:'#f59e0b', bg:'#fffbeb' })}
  ${handoff('System auto-expire sweep — runs every 5 min')}
  ${actor('system', '⏰ Auto-expire sweep (runs every 5 min)')}
  ${arrow('detects: createdAt + 1.5h has passed')}
  ${step('Status: ⏰ <strong>INCOMPLETE</strong>' + statusBadge('incomplete', '#dc2626') + '<br>autoExpired: true · incompletedAt: 2:30 PM', { color:'#dc2626', bg:'#fef2f2' })}
  ${arrow('zero counter impact')}
  ${step('No patient log created.<br>Referrer keeps full visibility — referral stays in their calendar<br>day-detail for the creation date with the red Incomplete badge.', { color:'#64748b', bg:'#f8fafc' })}
</div>
`;

// ── HTML wrapper ─────────────────────────────────────────────────────────
const now = new Date();
const dateStr = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Referral System — Scenarios for Manager Approval</title>
<style>
  @page { size: letter; margin: 0.5in; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1F3864; font-size: 11px; line-height: 1.4; margin: 0; padding: 0; }
  .cover { padding: 60px 40px; text-align: center; background: linear-gradient(135deg, #1F3864, #7030A0); color: #fff; page-break-after: always; min-height: 9in; display: flex; flex-direction: column; justify-content: center; }
  .cover h1 { font-size: 38px; margin: 0 0 12px; letter-spacing: -0.5px; }
  .cover .sub { font-size: 16px; opacity: .9; margin-bottom: 40px; }
  .cover .meta { font-size: 12px; opacity: .75; margin-top: 50px; }
  .cover .ic { background: rgba(255,255,255,.15); border: 2px solid rgba(255,255,255,.4); border-radius: 14px; padding: 24px; max-width: 480px; margin: 0 auto; font-size: 13px; line-height: 1.6; text-align: left; }
  .legend { padding: 24px 36px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; page-break-after: always; min-height: 9in; }
  .legend h2 { font-size: 22px; margin: 0 0 18px; }
  .legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .legend-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-size: 11px; line-height: 1.5; }
  .legend-item strong { display: block; margin-bottom: 4px; font-size: 12px; }
  .scenario { padding: 28px 36px; page-break-before: always; }
  .scenario:first-of-type { page-break-before: auto; }
  .scenario h2 { font-size: 18px; margin: 0 0 6px; color: #1F3864; border-bottom: 3px solid #7030A0; padding-bottom: 4px; }
  .scenario-meta { font-size: 11px; color: #64748b; font-style: italic; margin-bottom: 18px; }
  .actor { padding: 12px 18px; border-radius: 12px; font-weight: 800; font-size: 13px; text-align: center; max-width: 380px; margin: 0 auto; }
  .step { padding: 11px 14px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.05); font-size: 11px; line-height: 1.55; max-width: 480px; margin: 0 auto; }
  .arrow { display: flex; flex-direction: column; align-items: center; padding: 8px 0; }
  .arrow-line { width: 6px; height: 22px; background: #475569; border-radius: 3px; }
  .arrow-label { font-size: 10.5px; color: #334155; font-weight: 600; margin: 4px 0; max-width: 440px; text-align: center; background: #f1f5f9; padding: 3px 10px; border-radius: 6px; border: 1px solid #cbd5e1; }
  .arrow-head { color: #475569; font-size: 22px; line-height: 1; margin-top: -4px; font-weight: 900; }
  .handoff { display: flex; align-items: center; gap: 12px; margin: 14px 0; padding: 8px 0; border-top: 2px dashed #cbd5e1; border-bottom: 2px dashed #cbd5e1; background: linear-gradient(90deg, transparent, rgba(112,48,160,.06), transparent); }
  .handoff-label { font-size: 10px; font-weight: 800; color: #7030A0; text-transform: uppercase; letter-spacing: .08em; flex: 1; text-align: center; }
  .decision { padding: 14px 20px; background: #fef3c7; border: 2px solid #f59e0b; color: #92400e; border-radius: 12px; font-weight: 800; font-size: 12px; text-align: center; transform: rotate(0deg); max-width: 380px; margin: 0 auto; }
  .badge { display: inline-block; padding: 2px 9px; border-radius: 10px; font-size: 9px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; margin-left: 6px; }
</style>
</head><body>
<div class="cover">
  <div class="ic">
    🏥 <strong>Immediate Care Centers of Texas</strong><br>
    <span style="font-size:11px;opacity:.85">Marketing Planner — Referral System</span>
  </div>
  <h1 style="margin-top:60px">Referral System</h1>
  <div class="sub">7 end-to-end scenarios for review</div>
  <div class="sub" style="font-size:13px;opacity:.8">Prepared for manager approval</div>
  <div class="meta">${dateStr}<br>By Mahmoud Althaher</div>
</div>

<div class="legend">
  <h2>🎨 Legend — color-coded actors</h2>
  <div class="legend-grid">
    <div class="legend-item" style="border-left:4px solid #3b82f6"><strong style="color:#1e3a8a">👥 Marketing Member</strong>Sadia, Duaa, Dr Asin, Abrar. Creates referrals + owns follow-up if patient is late.</div>
    <div class="legend-item" style="border-left:4px solid #f59e0b"><strong style="color:#92400e">🏥 UC Plano Front Desk</strong>Creates referrals when sending their patients to an ER. Always has patient phone. <strong>Asks</strong> about ride — does NOT book (no Uber Health account).</div>
    <div class="legend-item" style="border-left:4px solid #ec4899"><strong style="color:#9d174d">🏥 Destination Facility FD</strong>Frisco ER or Castle Hills ER. Approves incoming referrals + logs patients on arrival. <strong>Books the Uber Health ride</strong> when the patient accepted at UC Plano.</div>
    <div class="legend-item" style="border-left:4px solid #7c3aed"><strong style="color:#5b21b6">🛡️ Admin</strong>Mahmoud. Can approve any referral as override. Audit-noted.</div>
    <div class="legend-item" style="border-left:4px solid #22c55e"><strong style="color:#14532d">📞 Patient</strong>The person being referred. Phone optional but enables follow-up calls + ride offers.</div>
    <div class="legend-item" style="border-left:4px solid #64748b"><strong style="color:#0f172a">⚙️ System / Automation</strong>Auto-fires popups, auto-expires after 1.5h, tracks audit log.</div>
  </div>
  <h2 style="margin-top:28px">📋 What's enforced (hard rules)</h2>
  <ul style="font-size:11px;line-height:1.7;margin:0;padding-left:20px">
    <li><strong>Bank-only entries</strong> — clinics/MVAs must already exist in the bank. New ones require admin to add the card first (with AI Google verification).</li>
    <li><strong>Phone validation</strong> — patient/clinic phones must be 10 digits with a valid US area code (369 codes recognized).</li>
    <li><strong>Pre-contact required</strong> — members with patient phone must confirm they called/texted before submitting.</li>
    <li><strong>Approval gated</strong> — only the destination facility's front desk OR admin can approve. Audit note when admin overrides.</li>
    <li><strong>1.5-hour cap</strong> — pending referrals not approved by createdAt + 1.5h auto-expire to Incomplete. Zero counter impact.</li>
    <li><strong>Same-actor edit only</strong> — members cannot edit / delete / approve another member's work. Admin can override with audit note.</li>
    <li><strong>One visit per clinic per day AND per week</strong> — members hard-blocked. Outreach EXEMPT (multiple members can attend the same event — see Scenario 6).</li>
    <li><strong>Fuzzy name matching</strong> — "Pediatric Associates" vs "Pediatrics Associates of Frisco" collapse to the same key. Catches typo / pluralization variants.</li>
    <li><strong>Admin notified on every block</strong> — blocked duplicate attempts appear in the Activity Feed so admin can audit member behavior.</li>
    <li><strong>Spending + lead status required for Completed</strong> — visits can't be marked Completed without both fields. Retro-audit modal lists pre-existing violations to admin.</li>
    <li><strong>🚗 Uber Health split of duty</strong> — UC Plano FD ASKS the patient (no Uber Health account). Destination FD (Frisco ER or Castle Hills ER) BOOKS the ride from their Uber Health account. Tracked end-to-end via rideBookingStatus + audit log. See Scenario 7.</li>
  </ul>
</div>

${scenario1}
${scenario2}
${scenario3}
${scenario4}
${scenario5}
${scenario6}
${scenario7}

</body></html>`;

(async () => {
  if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  // Probe-write to detect a file lock (user has PDF open in viewer) BEFORE
  // spinning up Chromium. If locked, switch to a timestamped sibling so the
  // build still produces output. Either way the user gets the new content.
  try {
    if(fs.existsSync(OUT_PDF_PRIMARY)){
      const fd = fs.openSync(OUT_PDF_PRIMARY, 'r+');
      fs.closeSync(fd);
    }
  } catch (e) {
    if(e && (e.code === 'EBUSY' || e.code === 'EPERM' || e.code === 'EACCES')){
      const ts = new Date().toISOString().replace(/[:.]/g,'-').replace('T','_').slice(0,19);
      OUT_PDF = path.join(OUT_DIR, 'Referral Scenarios (updated ' + ts + ').pdf');
      console.log('⚠ Primary PDF is locked (open in a viewer). Writing to:');
      console.log('  ' + OUT_PDF);
    } else { throw e; }
  }
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: OUT_PDF, format: 'Letter', margin: { top:'0.5in', bottom:'0.5in', left:'0.5in', right:'0.5in' }, printBackground: true });
  await browser.close();
  console.log('Wrote: ' + OUT_PDF);
})().catch(e => { console.error(e); process.exit(1); });
