# Multi-tenant SaaS — Phase 1

This turns AIMCQ into a **domain-per-tenant SaaS** with three roles. It is
backward compatible: your current site keeps working as "tenant 1".

## The model

- **Tenant = a domain.** The Worker reads each request's `Origin`/`Referer` host
  and resolves the tenant from it, then scopes *every* query to that tenant. A
  student on `coachingA.com` only ever sees tenant A's subjects, exams, scores,
  subscriptions and leaderboards.
- **Roles**
  - `superadmin` — global. Manages tenants, their access, and billing.
  - `manager` — a tenant's teacher/admin (your old `admin`, now tenant-scoped).
  - `student` — an end user, enrolled under one tenant.
- **Billing.** Every `/api/*` request is metered per tenant per month. The
  charge for a month is:
  `monthly_fee + max(0, requests − included_requests) ÷ 1000 × rate_per_1k`.
  A super admin sets `rate_per_1k`, `included_requests` and `monthly_fee` per
  tenant, and can **suspend** a tenant (which blocks its API).

Because isolation is enforced by the backend on the resolved domain, the
**manager console and student dashboard need no changes** — they are the same UI,
automatically scoped. Only the **Super Admin console** is new.

## What changed

| File | Change |
|------|--------|
| `backend/schema-multitenant.sql` | New migration: `tenants`, `usage_counters`, `tenant_settings`, `tenant_id` on every scoped table, per-tenant unique slugs/usernames/emails, `admin`→`manager`. |
| `backend/src/worker.js` | Tenant resolution by domain + API metering + suspension gate; every query scoped to the tenant; `superadmin`/`manager`/`student` roles; new `/api/super/*` endpoints (tenant CRUD, suspend/activate, create manager). Bootstrap now creates a **super admin**. |
| `frontend/aimcq-auth.js` | Role routing (super → platform console, manager → admin console, student → dashboard) + the Super Admin console (Tenants + Billing). |

No new environment variables are required.

## Deploy

1. **Migrate the database** (one-time, on your existing D1):
   ```bash
   cd backend
   wrangler d1 execute aimcq --file=schema-multitenant.sql --remote
   ```
2. **Set tenant 1's real domain** (it seeds as `example.com`):
   ```bash
   wrangler d1 execute aimcq --remote \
     --command="UPDATE tenants SET domain='yourdomain.com', name='Your Org' WHERE id=1"
   ```
3. **Deploy the Worker** and re-upload the two frontend files (cache-bust them):
   ```bash
   wrangler deploy
   ```
4. **Create the super admin** (uses your existing `ADMIN_BOOTSTRAP_SECRET`). Run
   this from the platform domain so it lands in tenant 1:
   ```bash
   curl -X POST https://YOUR-worker/api/auth/../api/admin/bootstrap \
     -H 'Content-Type: application/json' \
     -d '{"secret":"<ADMIN_BOOTSTRAP_SECRET>","email":"you@org.com","password":"<8+ chars>"}'
   ```
   (If you already bootstrapped an `admin` before migrating, it became a
   `manager`. Promote one to super admin directly:
   `UPDATE users SET role='superadmin' WHERE email='you@org.com'`.)

## Onboarding a new tenant (teacher/manager)

As the super admin, in the dashboard:
1. **Tenants → + Add tenant** — name, **domain**, rate per 1,000 requests,
   included monthly requests, optional flat fee.
2. **+ Manager** on that row — creates the manager's login for that tenant.
3. Point the tenant's website (that domain) at the same HEAD embed block. Their
   manager logs in on their own domain and sees only their data; their students
   register on that domain and are enrolled into that tenant automatically.

## Billing

**Super Admin → Billing** shows current-month requests and computed charges per
tenant, plus totals. Usage is metered live on every API call; charges recompute
from the per-tenant rate/quota/fee you set under **Tenants → Edit**.

## Notes & limits

- A fresh install with a single tenant resolves from any domain (so nothing
  breaks before you configure domains). Once you add a 2nd tenant, requests must
  come from a configured tenant domain or they're rejected ("Unknown tenant").
- Usernames/emails are unique **per tenant**.
- A token issued on one domain can't be replayed on another.

---

# Phase 2 — self-signup, quotas, invoices & payments

Apply the Phase 2 migration after Phase 1:
```bash
cd backend
wrangler d1 execute aimcq --file=schema-multitenant-phase2.sql --remote
wrangler deploy
```
Re-upload `frontend/aimcq-auth.js` (and cache-bust it).

### 1. Tenant self-service signup
Prospective managers can register their own institute. Add a button anywhere on
your platform/marketing page:
```html
<div id="aimcq-signup"></div>
<script>aimcqReady(function(){ window.AIMCQ_AUTH.mountTenantSignup('aimcq-signup', 'Register your institute'); });</script>
```
They enter org name, **domain**, and a manager login. The tenant is created with
status **pending** (its API is blocked) on a default plan. Optional env defaults
for new signups: `DEFAULT_RATE_PER_1K`, `DEFAULT_INCLUDED_REQUESTS`,
`DEFAULT_MONTHLY_FEE`. In **Super Admin → Tenants**, pending rows show
**Approve** / **Reject**. Approving flips them to active; the manager can then log
in on their domain.

### 2. Hard request quota
Each tenant has an optional **Hard request cap / month** (Tenants → Edit; 0 =
unlimited). Once a tenant exceeds it in a month, its students' API is blocked
(HTTP 429) until the next month — but the manager can still log in and view/pay
billing, and you can raise the cap anytime.

### 3. Invoices & payment
**Super Admin → Invoices**: pick a month and **Generate** to raise invoices from
the usage meter (`charge = fee + (requests − included)/1000 × rate`). Re-generating
updates *unpaid* invoices and leaves paid/submitted ones alone. Each invoice has
**Print** (opens a clean invoice → Print / Save as PDF) and **Mark paid**.

**Manager → Platform Billing**: each tenant's manager sees their own invoices,
the amount due, can **Print** an invoice, and **Pay** by submitting a payment
reference (status → *submitted*). The super admin then **Mark paid** to confirm.

### Not yet included (future)
- Collecting tenant payments through a live gateway (today payment is a
  reference the super admin confirms, mirroring the student UPI flow).
- Automatic monthly invoice generation (today it's a one-click action).
- Domain-ownership verification on self-signup (today approval is manual).
