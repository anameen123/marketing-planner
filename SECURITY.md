# Security Policy — ICC Marketing Planner

## Reporting a leak

If you spot a credential (API key, password, token, client secret, etc.) **anywhere in this repository** — including commit history — contact Mahmoud Althaher immediately at `malthaher@wcgtx.com`.

Do **not** open a public issue. Email is fine, or Teams DM. Include:
- The file / line / commit where you found it
- What service it appears to be for (Azure, Eventbrite, GitHub, Microsoft 365, etc.)

We will revoke + rotate within 24 hours.

---

## What never belongs in this repo

Hardcoding any of these in the HTML, JavaScript, or any committed file is **strictly forbidden**:

- Microsoft 365 / Entra ID **client secrets** (Sites.*.All app secrets)
- Microsoft 365 / Entra ID **certificates** (.pfx, .pem private keys)
- Eventbrite API tokens
- Any `*.password = '...'` for a real user account
- GitHub Personal Access Tokens (`ghp_...`, `gho_...`)
- Azure subscription keys / service principal secrets
- SharePoint app passwords
- SQL connection strings with credentials
- Database connection strings with credentials
- Any token that begins with `sk-`, `pk_`, `AIza`, or any other recognizable secret prefix
- Patient PII (we don't store any anyway)
- Customer financial data

---

## What may safely live in the repo

- **Client IDs** (Entra ID app registration application IDs) — these are public identifiers
- **Tenant IDs** — public identifiers
- **SharePoint site URLs** (publicly discoverable)
- **Public business names / addresses** (already in directories)
- **Code logic** — including business rules (tier thresholds, spending caps)

---

## Where secrets DO belong

| Secret type | Where to store |
|---|---|
| Microsoft 365 app permissions | Granted by IT admin via Entra ID consent — no code needed |
| Entra ID app client ID + tenant ID | Hardcoded in HTML is fine (these aren't secrets) |
| Eventbrite token (if used) | A SharePoint settings file, fetched at runtime via DataLayer |
| Any service-to-service password | A SharePoint List or Azure Key Vault, never in code |
| Personal passwords | Managed by user / Microsoft Entra ID — never collected by this app |

---

## How we enforce this

1. **No password fields in the HTML.** Authentication is delegated entirely to Microsoft Entra ID via MSAL.js. Users sign in with their `@wcgtx.com` account; the app never sees their password.
2. **`gitleaks` pre-commit hook** scans staged changes for common secret patterns BEFORE the commit lands locally. Configured in `.githooks/pre-commit`.
3. **GitHub Secret Scanning + Push Protection** is enabled on the repository. GitHub itself blocks pushes that contain known secret formats.
4. **Repository is private** as of the security hardening pass; only invited collaborators see the code.
5. **Quarterly review.** Mahmoud audits the repo every 3 months: scan for forgotten secrets, review collaborators, rotate any long-lived API tokens.

---

## In the event of a confirmed leak

Within 24 hours:

1. **Revoke** the credential in the upstream service (Entra ID portal, Eventbrite, etc.)
2. **Rotate** to a new credential
3. **Update** the runtime config (NEVER recommit the new credential to git)
4. **Remove** the leaked value from current code + push
5. **Optionally rewrite** git history via `git filter-repo` if the leak was high-value (note: doesn't help anyone who already cloned)
6. **Document** the incident in `INCIDENT_LOG.md`

---

## Past incidents

| Date | Service | Secret | Resolution |
|---|---|---|---|
| 2026-05-14 | Azure (Marketing dashboard app `0f338bab-...`) | `yKd8Q~...` client secret | Revoked in Entra ID via `az ad app credential delete` |
| 2026-05-14 | Eventbrite | API token `REDACTED_TOKEN_REVOKED_20260514` | Removed from code (user must revoke at eventbrite.com manually) |

---

## Contact

Mahmoud Althaher · `malthaher@wcgtx.com` · ICC of Texas
