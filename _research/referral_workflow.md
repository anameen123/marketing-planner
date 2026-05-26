# Referral System — Complete Workflow

**Built today (2026-05-26).** Owner: Mahmoud Althaher.

This document describes the full end-to-end referral workflow as implemented in `marketing_schedule_FINAL4.html` after today's Phase 16 → Phase 20 commits.

---

## 1. Create the referral

**Who can create:** Marketing members · UC Plano front desk · Admin

**Form (`Create Referral` modal, all *required):**

| Field | Notes |
|---|---|
| Creator * | 👥 Member dropdown OR 🏥 UC Plano FD (free-text staff name) |
| Patient name * | Required for everyone |
| Contact * | At least ONE phone — patient phone OR source clinic phone. Live-validated: 10 digits + valid US area code (369-code list including all states + territories + toll-free) |
| Source clinic / MVA * | Must exist in the bank (strict — no free-typed clinics allowed) |
| Destination facility * | Frisco ER · Castle Hills ER · UC Plano |
| Expected ETA | Optional. Smart auto-suggest = `haversine(source → dest) × 1.4 ÷ 30 mph + 5 min` |
| 🚗 Ride offer | Only for UC Plano creators. Required: No / Asked-Declined / Asked-Accepted. **UC Plano only ASKS** — they don't have an Uber Health account. Destination FD (Frisco ER or Castle Hills ER) is the one who actually books the ride after they approve. |
| ⚠ Pre-contact | Members with patient phone: "I called/texted the patient" checkbox · Members with only clinic phone: "Clinic notified" checkbox |
| Notes | Optional free-text |

**On submit:** record enters `PENDING_REFERRALS` with `status: 'pending'`, `followUpActions: []`, `autoETA`, `patientPhone`, `sourceClinicPhone`, `rideRequested`, `preContactConfirmed`.

---

## 2. Pending — who can approve

| Creator | Approver |
|---|---|
| UC Plano FD | Destination facility FD (Frisco ER FD or Castle Hills ER FD) |
| Marketing member | Destination facility FD (any of the three) |
| Anyone | **Admin can override** with audit note |

**Auto-expire:** if not approved within **1.5 hours from createdAt**, status flips to `incomplete` automatically. Zero counter impact (no patient log created).

---

## 3. Proactive follow-up (during the wait)

**Trigger:** `now > effectiveETA + 10 min`. Buffer shrinks to +5 min after a manual ETA update.

**Owner routing (who sees the popup):**
| Referral created by | Popup fires on |
|---|---|
| UC Plano FD | Destination FD's screen |
| Marketing member | The creating member's screen |

**Popup behavior (single-fire, no repeat loop):**
- Fires once when the trigger crosses
- Persistent row badge stays on the Pending panel even after dismiss
- Won't re-fire for the same referral unless the user updates the ETA

**Popup actions** (all logged to `followUpActions` audit trail):
| Action | What it does |
|---|---|
| 📞 Call patient | Opens `tel:` link if patient phone on file |
| 📞 Call clinic | Opens `tel:` link if clinic phone on file |
| 🚗 Offered a ride | Manual log entry — only available if patient phone exists |
| ✓ Patient arrived | Opens the Approve & Log Patient flow |
| ✗ Mark no-show | Immediate status flip to `incomplete`, skips the 1.5h auto-wait |
| 🔄 Update ETA | New time picker, resets timer with +5 min buffer |
| 📝 Note | Free-text appended to audit log |

---

## 4. Approve → Log Patient

When destination FD (or admin) clicks **✓ Approve & log patient** on a pending referral:

The Log Patient modal opens with **two tabs:**

**📥 From Referral tab** (auto-selected for approval flow):
- 🔒 Source clinic/MVA → locked from referral
- 🔒 Destination facility → locked from referral
- 🔒 Marketing member to credit → locked from referral
- 🔒 Channel = "Referral" (locked)
- Editable: age, gender, chief complaint, payment type, insurance, front-desk logger name, optional notes

**📞 Other Channel tab** (default for manual logging):
- All fields editable, channel free-form

**On save:**
1. New entry written to `REFERRAL_LOG`
2. `linkedPatientLogId` written back to the original `PENDING_REFERRALS` record
3. Pending referral status flips to `approved` + `approvedAt` + `approvedBy`
4. If admin approved on behalf of FD → `approvedByAdmin: true` flag + yellow audit banner:
   > 🛡️ Override by admin · Approved by [name] on [time] instead of destination front desk
5. 1-hour retraction window opens

---

## 4b. Uber Health ride booking (when patient accepted)

**Split of duties:**

| Role | Owns |
|---|---|
| UC Plano FD | **Asks** the patient if they want a ride. Picks _No / Asked-Declined / Asked-Accepted_ on the Create Referral form. Does NOT have an Uber Health account. |
| Destination FD (Frisco ER OR Castle Hills ER) | **Books** the actual Uber Health ride after they approve the referral. They have the Uber Health account. |

**When `rideRequested === 'accepted'`:**

1. Referral lands in the destination FD's Pending Referrals panel with a prominent purple banner:
   > 🚗 **Book Uber Health ride** — Patient [name] accepted a ride from [source] → [destination]. UC Plano asked the patient. **You book on your Uber Health account.**
2. Two buttons: **✓ Mark as booked** (prompts for ride ETA / id, optional) and **Couldn't book** (requires reason — logs to audit).
3. On confirmation: status flips `rideBookingStatus: 'booked'` with `rideBookedBy` + `rideBookedAt`. Banner turns green: _✓ Uber Health ride booked by [name] on [time]_.
4. Audit-logged via `followUpActions` as `ride_booked` or `ride_booking_cancelled`.

**Data fields on `PENDING_REFERRALS[i]`:**
- `rideRequested` — `'no' | 'declined' | 'accepted' | null` (UC Plano picks)
- `rideBookingStatus` — `'needs_booking' | 'booked' | 'cancelled' | null` (destination FD owns)
- `rideBookedBy` — destination FD name
- `rideBookedAt` — ISO timestamp
- `rideBookingNote` — pickup ETA / ride id / cancellation reason

---

## 5. Counters trigger

The new `REFERRAL_LOG` entry automatically rolls into:

| Counter | What it tracks |
|---|---|
| **Referring member's patient count** | Monthly + quarterly totals on their profile + leaderboard rank |
| **Source clinic / MVA patient count** | Drives priority in the Plan-a-Route corridor planner (high-converting sources rank higher) |
| **Destination facility intake count** | Per-facility daily / monthly summary in the Referrals tab calendar |
| **Patient survey-rate** | Logged patient counts toward the "% with full survey info" calculation |

---

## 6. Visibility across the app

| Where | What shows |
|---|---|
| **Pending Referrals panel** (default filter = All) | All statuses — pending · approved · declined · incomplete · retracted. Status badge color-coded |
| **Main Referral Log list** | Approved referrals appear as their linked patient log entries with source attribution + member credit |
| **Calendar day-detail modal** | Two sub-tabs: 📋 Patients (logged entries) and 📥 Referrals (PENDING_REFERRALS records for that date) |
| **Master Search (Ctrl+K)** | Patient name · source · destination · status — all searchable |
| **Audit trail (inline on each row)** | Every follow-up action: `2:45 PM · Duaa · Called patient — "Stuck in traffic, 15 more min"` |

---

## 7. Hard guardrails (enforced today)

- ❌ Off-bank clinics / MVAs **blocked** at every entry point (Add Visit AND Create Referral)
- ❌ Member **cannot** change another member's referral / visit / status / spending — only admin can override
- ❌ Member **cannot** approve referrals — destination FD or admin only
- ❌ Bank-card creation **requires AI Google verification** (GitHub Models) — fake/typo names rejected at insertion
- ✅ **Admin override** on any block stamps a visible yellow `🛡️ Override by admin` audit banner with name + timestamp + what was overridden
- ✅ Phone numbers validated: 10 digits + valid US area code (369 area codes accepted)
- ✅ Visit cannot be marked **Completed** without both 💰 spending + 🎯 lead status — retro-audit modal shows pre-existing violations to admin

---

## 8. Phase commit map (today's work)

| Phase | What landed |
|---|---|
| 16b | Admin override for referral approval + badge |
| 16c | Reusable admin-override audit note helper (`_renderAdminOverrideNote`) |
| 16d | Override note covers referral edits (not just approvals) |
| 16e | Auto-expire pending referrals at end of Day+1 (later tightened to 1.5h in 19b) |
| 16 | Log Patient modal — From Referral / Other Channel tabs |
| 19a | Create Referral form — patient + phones + smart ETA + conditional fields |
| 19b | Follow-up popup engine + late-patient actions |
| 19c | US phone validation (10 digits + 369 area codes) |
| 19f | Bank-card creation requires AI Google verification |
| 20 | Members get access to Referrals tab · Spending added to Master Search · Member-vs-member action protection |

---

## 9. Data shape — `PENDING_REFERRALS[i]`

```js
{
  id: 'pref_1716754321_abc123',
  createdAt: '2026-05-26T14:10:00.000Z',
  createdBy: 'Duaa',                       // or "Lisa · morning shift" for UC Plano FD
  creatorRole: 'marketing',                // 'marketing' | 'uc_plano_fd'
  createdByAccount: 'Mahmoud Althaher',    // signed-in user, for audit
  sourceType: 'clinic',                    // 'clinic' | 'mva' | 'wcg_facility'
  sourceName: 'Bloomfield',
  destinationFacility: 'frisco_er',        // 'frisco_er' | 'castle_hills_er' | 'plano_uc'
  expectedAt: '2026-05-26T14:30:00.000Z',  // user's pick (may be blank)
  autoETA: '2026-05-26T14:28:00.000Z',     // smart-suggest value
  patientName: 'Maria Lopez',
  patientPhone: '4695557788',              // digits only
  sourceClinicPhone: null,
  rideRequested: 'accepted',               // UC Plano asks: 'no' | 'declined' | 'accepted' | null
  rideBookingStatus: 'needs_booking',      // destination FD owns: 'needs_booking' | 'booked' | 'cancelled' | null
  rideBookedBy: null,                      // destination FD name after booking
  rideBookedAt: null,                      // ISO ts after booking
  rideBookingNote: null,                   // Uber pickup ETA / ride id / cancel reason
  preContactConfirmed: true,
  status: 'pending',                       // 'pending' | 'approved' | 'declined' | 'incomplete' | 'retracted'
  notes: 'First-time visit',
  linkedPatientLogId: null,                // populated on approval
  approvedAt: null,
  approvedBy: null,
  approvedByAdmin: false,                  // audit flag if admin overrode
  declinedAt: null,
  declinedBy: null,
  incompletedAt: null,
  autoExpired: false,
  followUpShownAt: null,                   // popup nag tracker
  followUpShownForETA: null,
  followUpEtaUpdatedAt: null,
  followUpActions: [                       // audit log, append-only
    { at: '2026-05-26T14:45:00.000Z', by: 'Sarah', action: 'called_patient', note: 'Stuck in traffic, 15 more min' },
    { at: '2026-05-26T15:05:00.000Z', by: 'Sarah', action: 'arrived',         note: 'Patient checked in' }
  ]
}
```
