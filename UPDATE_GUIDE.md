# Update Guide

This package has shipped several updates on top of the original AIMCQ install.
Apply the ones you haven't yet, **in order**. Each section says whether it needs
a database migration.

| # | Update | DB migration? | Re-deploy | Details |
|---|--------|---------------|-----------|---------|
| 1 | Admin dashboard (CRUD) | No | worker + 2 frontend files | this guide, below |
| 2 | Test-series rules · Subjects + Subscribe/Renew · Admin-only & professional responsive dashboards · Quizzes-in-new-tab | No | worker + 2 frontend files | `UPDATE_GUIDE_TEST_SERIES.md` |
| 3 | **Multi-tenant SaaS** (Phase 1 + 2) | **Yes** (2 migrations) | worker + 1 frontend file | `MULTITENANT_GUIDE.md` |

If you're already current and only need the latest, jump to
**Update 3** below. If you're coming from the very first release, do 1 → 2 → 3.

The general mechanism for every update is the same: `wrangler deploy` (worker)
and re-upload the changed `frontend/*` files to R2 (cache-bust the public CSS).
Updates 1–2 touch no tables; Update 3 requires the two `schema-multitenant*.sql`
migrations.

---

# Update 1 — Admin Dashboard (CRUD)

This upgrades an **already-deployed** AIMCQ install to the admin dashboard. It
adds full point-and-click CRUD for subjects, exams, subscriptions, orders, and
users, plus an overview screen — surfaced inside the dashboard widget for
manager accounts.

**This update on its own has no database migration** — it only adds API routes
(on the tables you already have) and refreshes two frontend files. (Update 3
*does* migrate; see below.)

---

## What changed

Three source files were modified, plus docs:

| File | Change | Where it runs |
|------|--------|---------------|
| `backend/src/worker.js` | New `/api/admin/*` endpoints (overview, list/delete for subjects & exams, subscription grant/extend/revoke, all-orders filter, user management) | Cloudflare Worker |
| `frontend/aimcq-auth.js` | New **Admin Panel** tab, form-modal system, CRUD views | Served from R2 → browser |
| `frontend/aimcq-auth.css` | Styles for the panel (stat cards, tables, modals, pills) | Served from R2 → browser |
| `README.md`, `frontend/embed-snippets.html` | Documentation only | — |

No changes were made to `schema.sql`, `wrangler.toml`, `engine-patch/aimcq.js`,
or `engine-patch/aimcq.css`, so those do **not** need to be redeployed.

---

## Before you start

You need the same tools you used for the original deploy:

- `wrangler` CLI, authenticated to the Cloudflare account that owns the
  `aimcq-api` Worker (`wrangler whoami` to confirm).
- A terminal opened in the `aimcq-d1-integration/backend` directory (the paths
  below assume that, matching the original setup guide).

> Tip: take a note of your current Worker version first — see
> [Rollback](#rollback-if-something-looks-wrong) — so you can revert in one
> command if needed.

---

## Step 1 — Deploy the updated Worker

From `aimcq-d1-integration/backend`:

```bash
wrangler deploy
```

That publishes the new `/api/admin/*` routes. The Worker is stateless, so this
is instant and safe — existing routes are unchanged, and the new ones are simply
added. No secrets or bindings need to change.

Quick sanity check that the new routes are live (the health route needs no auth):

```bash
curl https://aimcq-api.YOURNAME.workers.dev/health        # -> OK
```

---

## Step 2 — Re-upload the two frontend files to R2

The dashboard JS and CSS are served from your private `aimcq-assets` bucket, so
updating them is a re-upload (same commands as the original Step 8 /
"Updating a file later"):

```bash
wrangler r2 object put aimcq-assets/aimcq-auth.js  --file=../frontend/aimcq-auth.js
wrangler r2 object put aimcq-assets/aimcq-auth.css --file=../frontend/aimcq-auth.css
```

You do **not** need to re-upload `aimcq.js` or `aimcq.css` — those engine files
were not touched.

### About caching

- **`aimcq-auth.js`** is a protected asset served with `Cache-Control: no-store`,
  so every page load fetches the new version immediately. Nothing to do.
- **`aimcq-auth.css`** is public and cached for up to **24 hours**. To see the
  new styling right away, do one of:
  - Add/bump a version query on the stylesheet link in your Blogger template:
    ```html
    <link rel="stylesheet" href="https://aimcq-api.YOURNAME.workers.dev/asset/aimcq-auth.css?v=2">
    ```
    (bump `v=2` → `v=3` on each future CSS change), **or**
  - Purge the Cloudflare cache for that URL, **or**
  - Just wait — functionality works regardless; only the visual polish lags.

No other Blogger/template edits are required. The existing
`window.AIMCQ_AUTH.dashboard('aimcq-dashboard')` mount automatically shows the
Admin Panel tab to admins.

---

## Step 3 — Verify

1. Log in (in the browser) with an **admin** account. If you have never created
   one, run the one-time bootstrap from the README ("Create the first admin").
2. Open the page where your dashboard widget is embedded. You should see a new
   **Admin Panel** entry in the dashboard nav.
3. Click through the sub-tabs and confirm each loads:
   - **Overview** — stat cards + recent orders
   - **Subjects** — your existing subjects listed; "New Subject" opens a form
   - **Exams** — existing exams with subject names
   - **Subscriptions** — search + "Grant Subscription"
   - **Orders** — pending / approved / rejected / all filter
   - **Users** — search + edit
   - **Settings** — brand/UPI/labels prefilled

Optional API smoke test with your admin bearer token (the `token` returned by
login):

```bash
curl https://aimcq-api.YOURNAME.workers.dev/api/admin/overview \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

It should return a JSON object with a `stats` block.

---

## What you can now do without curl

Everything that previously required `curl` against `/api/admin/*` is now visual:

- **Create / edit / delete subjects & test series** — price, validity (days),
  visibility, sort order, description.
- **Create / edit / delete exams** — subject picker, premium toggle, marks,
  negative marks, schedule (start/end), and an advanced JSON settings box.
- **Manage subscriptions** — search by user or subject, manually grant or extend
  access by email/username (extend-vs-set-fresh modes), and revoke.
- **Moderate orders** — filter by status and approve/reject inline.
- **Manage users** — search, edit profile and role, reset a password, delete.
- **Edit settings** — brand name, UPI id, payee, labels.

The curl recipes in the README still work unchanged if you prefer scripting.

---

## Safeguards to be aware of

These are enforced server-side, so the UI can't bypass them:

- You **cannot delete your own** admin account.
- You **cannot demote or delete the last remaining admin** (prevents locking
  everyone out of the panel).
- **Deleting a subject** cascades to its subscriptions and orders and unlinks
  (does not delete) its exams — this follows your existing schema's foreign-key
  rules. The confirmation dialog warns you and shows the affected exam count.
- **Deleting an exam** removes its recorded scores. **Deleting a user** removes
  that user's subscriptions, orders, and scores. Both are confirmed first.

---

## Rollback (if something looks wrong)

The Worker and the R2 assets roll back independently.

**Worker:** Cloudflare keeps your deployment history. List recent versions and
roll back to the previous one:

```bash
wrangler deployments list
wrangler rollback            # interactive: pick the prior version
```

**Frontend assets:** re-upload your previous copies of the two files (keep a
backup of the old `aimcq-auth.js` / `aimcq-auth.css` before Step 2 if you want a
one-command revert):

```bash
wrangler r2 object put aimcq-assets/aimcq-auth.js  --file=/path/to/old/aimcq-auth.js
wrangler r2 object put aimcq-assets/aimcq-auth.css --file=/path/to/old/aimcq-auth.css
```

Because there was no schema change, rolling back the code fully restores the
prior behavior — no data cleanup is involved.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| No "Admin Panel" tab appears | You're not logged in as an admin, **or** the browser still has the old `aimcq-auth.js`. Hard-refresh; confirm `state.user.role === 'admin'`. |
| Panel tab shows but actions return **403 Forbidden** | Your token isn't an admin token. Re-login with the admin account. |
| New admin routes return **404 Not found** | The Worker wasn't redeployed. Run `wrangler deploy` again (Step 1). |
| Panel looks unstyled / old styling | Public CSS is cached up to 24h. Bump the `?v=` on the stylesheet link or purge cache (see Step 2 caching note). |
| "Cannot demote the last remaining admin" | Working as intended — promote another user to admin first, then change this one. |
| Subject delete removed subscriptions you didn't expect | Foreign-key cascade from the original schema. Use "Hidden" visibility instead of delete if you only want to retire a subject. |

---

## Summary checklist

```text
[ ] wrangler deploy                                   (new admin API routes)
[ ] wrangler r2 object put …/aimcq-auth.js            (panel JS)
[ ] wrangler r2 object put …/aimcq-auth.css           (panel styles)
[ ] (optional) bump ?v= on the aimcq-auth.css <link>  (cache-bust)
[ ] log in as admin → confirm Admin Panel tab + sub-tabs load
```

No `wrangler d1 execute`, no template rewrites, no engine re-upload.

---

# Update 2 — Test series, subjects, dashboards & new-tab quizzes

A bundle of feature updates. **No database migration** — your existing schedule
columns (`exams.start_*` / `end_*`) and `subjects.type` already support it.

What it includes (full details and per-feature state tables in
`UPDATE_GUIDE_TEST_SERIES.md`):

- **Test-series rules** — test-mode-only, start-time lock, deadline lock, single
  timed attempt, practice-after-attempt, leaderboard reveal (enforced in the
  Worker *and* the UI).
- **Subjects tab + Subscribe/Renew** — paid & free subjects browsable like test
  series; one button rule everywhere: not subscribed → **Subscribe**, subscribed
  → disabled **Subscribed**, within 7 days of expiry → **Renew**.
- **Admin-only dashboard** for managers, and a **professional, responsive**
  redesign (header band, segmented nav, refined cards/tables; tablet & mobile
  breakpoints).
- **Quizzes open in a new tab** (full-screen) instead of below the dashboard,
  with an in-page fallback if pop-ups are blocked.

### Deploy

```bash
cd backend
wrangler deploy                                                   # worker (test-series enforcement)
wrangler r2 object put aimcq-assets/aimcq.js       --file=../engine-patch/aimcq.js     # engine: lock_mode
wrangler r2 object put aimcq-assets/aimcq-auth.js  --file=../frontend/aimcq-auth.js
wrangler r2 object put aimcq-assets/aimcq-auth.css --file=../frontend/aimcq-auth.css
```

Bump the `?v=` on the `aimcq-auth.css` `<link>` to pick up the new styling
immediately (public CSS is edge-cached up to 24h). No template changes needed.

---

# Update 3 — Multi-tenant SaaS (Phase 1 + 2)

This is the **largest** update and **requires database migrations**. It turns the
app into a domain-per-tenant SaaS with three roles (`superadmin` / `manager` /
`student`), per-tenant data isolation, API-usage metering, a Super Admin console,
tenant self-signup, hard quotas and platform invoices.

> **Back up first.** This migration rebuilds the `users`, `subjects` and `exams`
> tables to add per-tenant uniqueness. Export your DB before running it:
> `wrangler d1 export aimcq --remote --output=backup.sql`

### Deploy

```bash
cd backend
# 1) migrations (Phase 1 then Phase 2)
wrangler d1 execute aimcq --file=schema-multitenant.sql        --remote
wrangler d1 execute aimcq --file=schema-multitenant-phase2.sql --remote
# 2) point the default tenant at your real domain (seeds as example.com)
wrangler d1 execute aimcq --remote \
  --command="UPDATE tenants SET domain='yourdomain.com', name='Your Org' WHERE id=1"
# 3) worker + frontend
wrangler deploy
wrangler r2 object put aimcq-assets/aimcq-auth.js --file=../frontend/aimcq-auth.js
```

### After migrating

- Your existing **admin** accounts became **managers** (tenant admins); all your
  data is assigned to **tenant 1**.
- Create the platform **super admin** (uses `ADMIN_BOOTSTRAP_SECRET`):
  ```bash
  curl -X POST https://aimcq-api.YOURNAME.workers.dev/api/admin/bootstrap \
    -H "Content-Type: application/json" -H "Referer: https://yourdomain.com/" \
    -d '{"secret":"<ADMIN_BOOTSTRAP_SECRET>","email":"you@org.com","password":"<8+ chars>"}'
  ```
  (Already had an admin you want as super admin? Promote it:
  `UPDATE users SET role='superadmin' WHERE email='you@org.com'`.)
- Optional new env defaults for self-signup plans: `DEFAULT_RATE_PER_1K`,
  `DEFAULT_INCLUDED_REQUESTS`, `DEFAULT_MONTHLY_FEE`.

Full walkthrough — onboarding tenants, billing, invoices, the self-signup embed
and hard quotas — is in **`MULTITENANT_GUIDE.md`**.

### Rollback note

Because Update 3 changes the schema, a code-only rollback is **not** enough —
restore the DB from your pre-migration `backup.sql` if you need to revert.
