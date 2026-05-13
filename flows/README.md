# Power Automate Flow Setup — Monthly + Quarterly Excel Auto-Export

This folder describes the two Power Automate flows that read data from the
Marketing Planner API and drop Excel files into SharePoint on a schedule.

**Build these by hand inside Power Automate (make.powerautomate.com)** —
Power Automate stores flows in its own service, not in this repo. The
step-by-step below mirrors what you'd see in the Power Automate UI.

---

## Prerequisites

1. ✅ Azure deployment complete (HTML + API live at `marketing.iccoftexas.com`)
2. ✅ SharePoint site exists: `iccoftexas.sharepoint.com/sites/MarketingPlanner`
3. ✅ Reports library with `Monthly/` + `Quarterly/` subfolders
4. ✅ An **Export API Key** generated and stored:
   - In **Azure Static Web App → Configuration**, add app setting `EXPORT_API_KEY` with a long random value (e.g. UUID v4). This is what the Functions check against.
   - Save the same value somewhere safe — you'll paste it into Power Automate next.

---

## Flow 1 — Monthly Reports

**Name:** `Marketing Planner — Monthly Reports`
**Trigger:** Schedule
**When:** Day 1 of every month at 6:00 AM Central Time

### Steps

#### Step 1 — Trigger
- **Type:** Recurrence
- **Interval:** 1
- **Frequency:** Month
- **On these days:** 1
- **At these hours:** 6
- **Time zone:** Central Standard Time

#### Step 2 — Initialize variable: monthLabel
- **Name:** `monthLabel`
- **Type:** String
- **Value:** `@{formatDateTime(addToTime(utcNow(), -1, 'Month'), 'yyyy-MM')}`
  (Why: when the flow fires on the 1st of June, we want to export *May's* data, so we subtract 1 month from "now")

#### Step 3 — HTTP request
- **Method:** GET
- **URI:** `https://marketing.iccoftexas.com/api/export/monthly?month=@{variables('monthLabel')}`
- **Headers:**
  - `x-api-key`: `@{variables('exportApiKey')}` (or paste it directly — never commit it to source control)
  - `Content-Type`: `application/json`

#### Step 4 — Parse JSON
- **Content:** `@{outputs('HTTP')['body']}`
- **Schema:** *(use the "Generate from sample" button and paste an example response from the API — pasted below)*
```json
{
  "type": "object",
  "properties": {
    "month": { "type": "string" },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "base64": { "type": "string" }
        }
      }
    }
  }
}
```

#### Step 5 — Apply to each (loop over the 7 files)
- **From:** `@body('Parse_JSON').files`
  - **Inside the loop, add:** Create file (SharePoint)
    - **Site Address:** `https://iccoftexas.sharepoint.com/sites/MarketingPlanner`
    - **Folder Path:** `/Shared Documents/Reports/Monthly/@{variables('monthLabel')}`
    - **File Name:** `@{items('Apply_to_each')['name']}`
    - **File Content:** `@{base64ToBinary(items('Apply_to_each')['base64'])}`

### Optional: notify on success
Add a final **Send email (V2)** action:
- **To:** the admin email
- **Subject:** `Marketing Planner reports for @{variables('monthLabel')} are ready`
- **Body:** `7 files have been exported to SharePoint → Marketing Planner → Reports → Monthly → @{variables('monthLabel')}/`

---

## Flow 2 — Quarterly Reports

**Name:** `Marketing Planner — Quarterly Reports`
**Trigger:** Schedule (4 times a year)
**When:** Last day of March, June, September, December at 11:00 PM Central Time

The Power Automate UI doesn't directly support "last day of quarter," so:

### Steps

#### Step 1 — Trigger: Recurrence, daily at 11 PM CT
- **Frequency:** Day
- **At hour:** 23
- **Time zone:** Central Standard Time

#### Step 2 — Condition: is today the last day of a quarter?
- **Condition:**
  `@{or(
       and(equals(formatDateTime(addDays(utcNow(), 1), 'MM-dd'), '04-01'), true),
       and(equals(formatDateTime(addDays(utcNow(), 1), 'MM-dd'), '07-01'), true),
       and(equals(formatDateTime(addDays(utcNow(), 1), 'MM-dd'), '10-01'), true),
       and(equals(formatDateTime(addDays(utcNow(), 1), 'MM-dd'), '01-01'), true)
   )}`
- (Translation: "is tomorrow's date the 1st of April, July, October, or January?")
- **If TRUE:** proceed with the export steps
- **If FALSE:** Terminate

#### Step 3 — Initialize variable: quarterLabel
- **Name:** `quarterLabel`
- **Value:** `@{concat(formatDateTime(utcNow(), 'yyyy'), '-Q', div(add(int(formatDateTime(utcNow(), 'MM')), -1), 3) + 1)}`
  - E.g. on June 30 → `2026-Q2`

#### Step 4 — HTTP request
- **URI:** `https://marketing.iccoftexas.com/api/export/quarterly?quarter=@{variables('quarterLabel')}`
- (everything else same as Flow 1)

#### Step 5 — Parse JSON + Apply to each → Create file
Same as Flow 1, but:
- **Folder Path:** `/Shared Documents/Reports/Quarterly/@{variables('quarterLabel')}`

---

## Testing both flows

1. Open Flow 1 (Monthly)
2. Click **Test** → **Manually** → **Test**
3. Wait 30 seconds; check the **Run History** to confirm success
4. Open SharePoint → Marketing Planner → Reports → Monthly → folder for that month → should see 7 `.xlsx` files
5. Open one file in Excel → verify the data looks right

If anything fails:
- Click the failed step → see the error message
- Common causes:
  - **401 from HTTP step** → wrong x-api-key value
  - **SharePoint Create File 403** → flow owner lacks write access to the Reports library
  - **HTTP step times out** → Functions cold start (re-run, should be fast 2nd time)

---

## How updates to this work

If we add a new file type (say, **`call_logs_YYYY-MM.xlsx`**):
1. I add a new entry to the API's response in `api/src/functions/exports.js`
2. You drag a new "Create file" action into the flow's loop (Power Automate auto-handles it because we iterate over `files[]`)
3. No flow restart needed.

The data layer (Cosmos) is untouched in any of this — only the export output expands.
