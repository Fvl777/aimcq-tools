# AIMCQ — Step-by-Step Setup Guide

Follow these steps **in order**, top to bottom. By the end you'll have:

- a Cloudflare Worker running your API + serving the engine from private R2,
- the engine protected by JWT (static token + your domain + signed JWT),
- accounts, subscriptions, ranking and leaderboards live on your Blogger site,
- a built-in **Admin Panel** for managing subjects, exams, subscriptions,
  orders, users and settings — no curl required after setup,
- a multi-tenant **SaaS layer**: a **Super Admin** console for managing
  teacher/manager sites and usage billing, on top of per-site (per-domain) data.

**Three roles** (set automatically; one dashboard each):

| Role | Sees | Manages |
|------|------|---------|
| `superadmin` | Super Admin console (Tenants · Billing · Invoices) | tenant sites, their access & billing |
| `manager` | Admin Panel (your old "admin") | their site's subjects, exams, students, orders |
| `student` | learner dashboard | their own tests, subscriptions, results |

Quizzes launched from the dashboard now open in a **new tab** (full-screen). For
multiple domains/customers, see `MULTITENANT_GUIDE.md`; this guide sets up a
single site (tenant 1).

Throughout, replace these placeholders when you see them:

| Placeholder | Means |
|-------------|-------|
| `YOURNAME` | your Cloudflare Workers subdomain (set on first deploy) |
| `yourblog.blogspot.com` | your actual site domain |
| `YOUR_ASSET_TOKEN` | the `ASSET_TOKEN` value you generate in Step 6 |
| `<ADMIN_TOKEN>` | the login token you get in Step 11 |

---

## Step 0 — Prerequisites

You need:

1. A **Cloudflare account** (free plan is fine).
2. **Node.js** installed (v18+). Check with `node -v`.
3. The files from this package on your computer (unzip it).
4. Your site's domain handy (e.g. `yourblog.blogspot.com`).

Install the Cloudflare CLI and log in:

```bash
npm install -g wrangler
wrangler login
```

A browser window opens — approve the access. Then open a terminal **inside the
`backend/` folder** of this package:

```bash
cd path/to/aimcq-d1-integration/backend
```

Run every command below from this `backend/` folder unless told otherwise.

---

## Step 1 — Create the database (D1)

```bash
wrangler d1 create aimcq
```

It prints a block like:

```
[[d1_databases]]
binding = "DB"
database_name = "aimcq"
database_id = "abc123-...."
```

Copy the **`database_id`** value. Open `wrangler.toml` in a text editor and
paste it in, replacing `PASTE_YOUR_D1_DATABASE_ID_HERE`:

```toml
[[d1_databases]]
binding       = "DB"
database_name = "aimcq"
database_id   = "abc123-...."   # ← your real id here
```

Save the file.

---

## Step 2 — Create the tables

Run the base schema, then the two multi-tenant migrations, **in this order**:

```bash
wrangler d1 execute aimcq --file=./schema.sql --remote
wrangler d1 execute aimcq --file=./schema-multitenant.sql --remote
wrangler d1 execute aimcq --file=./schema-multitenant-phase2.sql --remote
```

The base file creates users, subjects, exams, subscriptions, orders, scores and
settings. The two migrations add the **multi-tenant SaaS** layer the Worker now
relies on — `tenants`, per-tenant `tenant_settings`, the API-usage meter
(`usage_counters`), platform `tenant_invoices`, and a `tenant_id` on every table
— and seed a **default tenant (id 1)** that owns everything. (Running the
migrations on a fresh, empty database is safe — they simply create the structures
and the default tenant.)

Now point the default tenant at **your** domain (it seeds as `example.com`):

```bash
wrangler d1 execute aimcq --remote \
  --command="UPDATE tenants SET domain='yourblog.blogspot.com', name='My Academy' WHERE id=1"
```

> **Running a single site?** That's fine — you just use tenant 1. The SaaS
> features (multiple domains, billing) stay dormant until you add more tenants.
> **Running a multi-tenant SaaS?** Read `MULTITENANT_GUIDE.md` after setup — it
> covers onboarding teacher/manager sites, usage billing and tenant signup.

---

## Step 3 — Create the R2 bucket

This is where the engine files live, privately.

```bash
wrangler r2 bucket create aimcq-assets
```

Do **not** enable public access on this bucket — the Worker is the only way in.
(The binding is already wired in `wrangler.toml`, nothing to edit here.)

---

## Step 4 — Set your allowed domain(s)

Open `wrangler.toml` and find the `[vars]` line `ALLOWED_ORIGINS`. Set it to
your site origin(s), comma-separated, **no trailing slash**:

```toml
[vars]
ALLOWED_ORIGINS = "https://yourblog.blogspot.com"
```

Multiple sites? Separate with commas:

```toml
ALLOWED_ORIGINS = "https://yourblog.blogspot.com,https://www.yourdomain.com"
```

This list does two jobs: it controls API CORS **and** defines which domains are
allowed to load the protected engine. Save the file.

---

## Step 5 — Generate your secret values

You need four random strings. Generate them now and **paste them into a
temporary notepad** — you'll use them in the next step (and the ASSET_TOKEN
again later in Blogger).

Run these (each prints one value):

```bash
# AUTH_SECRET  (signs login sessions)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ADMIN_BOOTSTRAP_SECRET  (one-time, to make the first admin)
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"

# ASSET_TOKEN  (the embed token you'll paste into Blogger)
node -e "console.log('sb_'+require('crypto').randomBytes(24).toString('hex'))"

# ASSET_JWT_SECRET  (signs the short-lived asset JWTs)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Label each one in your notepad so you don't mix them up.

---

## Step 6 — Store the secrets in the Worker

Run each command, and when prompted **paste the matching value** from Step 5,
then press Enter:

```bash
wrangler secret put AUTH_SECRET
wrangler secret put ADMIN_BOOTSTRAP_SECRET
wrangler secret put ASSET_TOKEN
wrangler secret put ASSET_JWT_SECRET
```

(Optional — only if you want password-reset emails via Resend:)

```bash
wrangler secret put RESEND_API_KEY
wrangler secret put MAIL_FROM        # e.g. AIMCQ <noreply@yourdomain.com>
```

---

## Step 7 — Deploy the Worker

```bash
wrangler deploy
```

When it finishes it prints your Worker URL, e.g.:

```
https://aimcq-api.YOURNAME.workers.dev
```

**Write this URL down** — it's your `WORKER_BASE` for Blogger and the base for
all the commands below. (If this is your first Worker, Cloudflare asks you to
pick your `YOURNAME` subdomain here.)

---

## Step 8 — Upload the engine files to R2

Run these from the `backend/` folder (the paths point up into the package):

```bash
wrangler r2 object put aimcq-assets/aimcq.js       --file=../engine-patch/aimcq.js
wrangler r2 object put aimcq-assets/aimcq.css      --file=../engine-patch/aimcq.css
wrangler r2 object put aimcq-assets/aimcq-auth.js  --file=../frontend/aimcq-auth.js
wrangler r2 object put aimcq-assets/aimcq-auth.css --file=../frontend/aimcq-auth.css
```

The names on the left (`aimcq-assets/aimcq.js`, etc.) must stay exactly as
shown — that's what the Worker looks up.

---

## Step 9 — Test the backend (quick check)

Replace `YOURNAME` and `YOUR_ASSET_TOKEN`, then run:

```bash
# ✅ should return a JWT
curl -H "Referer: https://yourblog.blogspot.com/" \
  "https://aimcq-api.YOURNAME.workers.dev/auth?token=YOUR_ASSET_TOKEN"
```

Expected: `{"jwt":"eyJ...","ttl":120}`

```bash
# ❌ a wrong domain should be refused
curl -H "Referer: https://example.com/" \
  "https://aimcq-api.YOURNAME.workers.dev/auth?token=YOUR_ASSET_TOKEN"
```

Expected: `{"error":"Domain not authorised: example.com"}`

If the first one returns a JWT, your backend + asset protection are working.

---

## Step 10 — Create your platform super admin

Replace the secret and details, then run (uses your `ADMIN_BOOTSTRAP_SECRET`
from Step 5). Run it with a `Referer` from **your** domain so it lands in
tenant 1:

```bash
curl -X POST https://aimcq-api.YOURNAME.workers.dev/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -H "Referer: https://yourblog.blogspot.com/" \
  -d '{"secret":"YOUR_ADMIN_BOOTSTRAP_SECRET","username":"superadmin","email":"you@example.com","password":"a-strong-password"}'
```

It returns a `token` for the **super admin** — the platform owner. The super
admin gets the **Super Admin console** (Tenants · Billing · Invoices), not the
content Admin Panel. Copy this `token` — it's your `<ADMIN_TOKEN>` for the curl
steps below.

> **Roles recap.** Bootstrap makes a `superadmin`. Day-to-day content (subjects,
> exams, students) is run by a `manager` — the tenant admin who sees the **Admin
> Panel**. Create a manager for your site once your dashboard is embedded
> (Step 16): log in as the super admin → **Tenants → + Manager** on your tenant.
> You can also create one now by curl:
>
> ```bash
> curl -X POST https://aimcq-api.YOURNAME.workers.dev/api/super/managers \
>   -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
>   -H "Referer: https://yourblog.blogspot.com/" \
>   -d '{"tenant_id":1,"email":"manager@example.com","password":"another-strong-pw","display_name":"Site Manager"}'
> ```
>
> The seeding curl in Steps 11–13 below works with either the super admin token
> (it manages tenant 1) or a manager token. Either way, content is scoped to the
> tenant of the domain in the `Referer`.

---

## Step 11 — Set your store settings (UPI, labels)

> **Two ways to do Steps 11–13.** The `curl` commands below let you seed content
> immediately, even before your site is embedded — good for a clean first run.
> If you'd rather click than curl, skip ahead to Steps 14–16, embed the
> dashboard, then do all of this from the visual **Admin Panel** (Settings,
> Subjects, Exams tabs). Either path produces the same result.

```bash
curl -X POST https://aimcq-api.YOURNAME.workers.dev/api/admin/settings \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"upi_id":"you@upi","payee_name":"Your Name","label_singular":"Test Series","label_plural":"Test Series","brand_name":"My Academy"}'
```

These show on the subscribe screen and around the UI.

---

## Step 12 — Create a test series (subject)

```bash
curl -X POST https://aimcq-api.YOURNAME.workers.dev/api/admin/subjects \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"SSC CGL 2026","type":"test_series","price":299,"days":365,"visibility":"show","slug":"ssc-cgl-2026","description":"Full mock test series"}'
```

> **`visibility`** must be `"show"` (visible in the catalogue) or `"hide"`.
> The backend normalises other values, but use `"show"`/`"hide"` to be safe —
> a subject that isn't visible can't be subscribed to (the subscribe screen
> would say "Subject not found").

The response includes an **`id`** (e.g. `1`). Note it — that's your
`subject_id`.

---

## Step 13 — Register an exam

```bash
curl -X POST https://aimcq-api.YOURNAME.workers.dev/api/admin/exams \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"title":"Full Mock Test 01","slug":"mock-test-01","subject_id":1,"json_url":"https://your-public-quiz-json-url/mock01.json","premium":true,"marks_per_question":2,"negative_marks":0.5,"total_questions":100,"start_date":"2026-07-01","start_time":"10:00","end_date":"2026-07-07","end_time":"23:59"}'
```

Key fields:
- `slug` → you'll use `"mock-test-01"` as the `exam_id` in your quiz snippet.
- `subject_id` → the id from Step 12.
- `premium: true` → requires a subscription to open.
- `end_date` / `end_time` → the leaderboard stays locked until then.

Repeat Steps 12–13 for each test series / exam you want.

---

## Step 14 — Add the HEAD block to Blogger

In Blogger: **Theme → ⋯ → Edit HTML**, and paste the HEAD block from
`frontend/embed-snippets.html` just before `</head>`. In that block, set the
two values at the top of the loader:

```js
var WORKER_BASE  = 'https://aimcq-api.YOURNAME.workers.dev';  // from Step 7
var ASSET_TOKEN  = 'YOUR_ASSET_TOKEN';                         // from Step 5
```

Also update the two CSS `<link>` URLs in that block to your Worker:

```html
<link rel="stylesheet" href="https://aimcq-api.YOURNAME.workers.dev/asset/aimcq.css">
<link rel="stylesheet" href="https://aimcq-api.YOURNAME.workers.dev/asset/aimcq-auth.css">
```

Save the theme. (You only do this once for the whole site.)

> The HEAD loader also defines `window.aimcqReady(cb)` — use it to mount the
> account/dashboard/leaderboard widgets in Step 16 (it waits for the engine to
> be ready). Quiz blocks (Step 15) don't need it; the loader queues and replays
> early `loadAimcqFromDrive` calls automatically.

> Prefer not to edit the theme? Add it instead via **Layout → Add a Gadget →
> HTML/JavaScript**, once.

---

## Step 15 — Add a quiz to a post

Edit a post/page in **HTML view** and paste a quiz block from
`embed-snippets.html`. For a ranked, premium quiz, the important part is the
three keys inside `settings`:

```html
<div id="aimcq-quiz-ranked"></div>
<script>
document.addEventListener('DOMContentLoaded', function () {
  window.loadAimcqFromDrive('aimcq-quiz-ranked', {
    jsonUrl: 'https://your-public-quiz-json-url/mock01.json',
    settings: {
      title: "Full Mock Test 01",
      timer: 60,
      exam_interface: 'professional',
      marks_per_question: 2,
      negative_marks: 0.5,

      exam_id:   'mock-test-01',   // matches Step 13 slug → enables ranking
      premium:   true,             // require a subscription
      subject_id: 1                // matches Step 12 id
    }
  });
});
</script>
```

For a **free, unranked** quiz, just leave out `exam_id` / `premium` /
`subject_id` — it behaves like your original embed.

---

## Step 16 — Add account, dashboard and leaderboard

Paste these where you want them (e.g. a header gadget and dedicated pages).
Copy the exact blocks from `embed-snippets.html`.

> **Important:** these widgets use `aimcqReady(...)`, **not**
> `DOMContentLoaded`. The HEAD loader (Step 14) exposes `window.aimcqReady(cb)`,
> which runs your callback only once the add-on (`AIMCQ_AUTH`) has finished
> loading. Because the engine loads after a `/auth` round-trip — usually
> *after* `DOMContentLoaded` — calling `window.AIMCQ_AUTH.*` directly on
> `DOMContentLoaded` would run too early and render nothing. Always wrap widget
> calls in `aimcqReady(...)`.

- **Account widget** (login/logout button) — a header or sidebar gadget:
  ```html
  <div id="aimcq-account"></div>
  <script>aimcqReady(function(){window.AIMCQ_AUTH.mountAccount('aimcq-account');});</script>
  ```
- **Dashboard** — on a "My Account" page:
  ```html
  <div id="aimcq-dashboard"></div>
  <script>aimcqReady(function(){window.AIMCQ_AUTH.dashboard('aimcq-dashboard');});</script>
  ```
- **Leaderboard** — on a results page (use the same `exam_id`):
  ```html
  <div id="aimcq-leaderboard"></div>
  <script>aimcqReady(function(){window.AIMCQ_AUTH.leaderboard('aimcq-leaderboard',{exam_id:'mock-test-01'});});</script>
  ```

### Optional — self-contained variant (no dependency on the HEAD helper)

`aimcqReady(...)` is provided by the Step 14 HEAD block. If you can't be sure the
updated HEAD block is in place (e.g. an older theme, a one-off gadget on another
site, or you'd rather the widget not depend on it), use this self-contained
version instead — it polls for `AIMCQ_AUTH` on its own and needs nothing from the
HEAD block:

- **Account widget:**
  ```html
  <div id="aimcq-account"></div>
  <script>
  (function(){
    function ready(cb){
      if (window.AIMCQ_AUTH) return cb();
      var n=0, t=setInterval(function(){
        if (window.AIMCQ_AUTH){ clearInterval(t); cb(); }
        else if(++n>200){ clearInterval(t); console.error('[AIMCQ] add-on never loaded'); }
      },100);
    }
    ready(function(){ window.AIMCQ_AUTH.mountAccount('aimcq-account'); });
  })();
  </script>
  ```
- **Dashboard:**
  ```html
  <div id="aimcq-dashboard"></div>
  <script>
  (function(){
    function ready(cb){
      if (window.AIMCQ_AUTH) return cb();
      var n=0, t=setInterval(function(){
        if (window.AIMCQ_AUTH){ clearInterval(t); cb(); }
        else if(++n>200){ clearInterval(t); console.error('[AIMCQ] add-on never loaded'); }
      },100);
    }
    ready(function(){ window.AIMCQ_AUTH.dashboard('aimcq-dashboard'); });
  })();
  </script>
  ```
- **Leaderboard** (use the same `exam_id` as the quiz):
  ```html
  <div id="aimcq-leaderboard"></div>
  <script>
  (function(){
    function ready(cb){
      if (window.AIMCQ_AUTH) return cb();
      var n=0, t=setInterval(function(){
        if (window.AIMCQ_AUTH){ clearInterval(t); cb(); }
        else if(++n>200){ clearInterval(t); console.error('[AIMCQ] add-on never loaded'); }
      },100);
    }
    ready(function(){ window.AIMCQ_AUTH.leaderboard('aimcq-leaderboard', { exam_id: 'mock-test-01' }); });
  })();
  </script>
  ```

Both approaches are equivalent. Differences: `aimcqReady` waits indefinitely and
fires immediately if the add-on is already loaded; the self-contained poller
gives up after ~20s with a console error. Use **one** per widget — don't call
`aimcqReady(...)` on a page whose HEAD block doesn't define it, or nothing runs.

---

## Manage everything from the Admin Panel (managers)

Once the dashboard widget from Step 16 is on a page, **log in with a `manager`
account** (created in Step 10). Managers get a dedicated, full-screen **Admin
Panel** — the content console for their site. (The **super admin** instead sees
the platform console — Tenants · Billing · Invoices — covered in
`MULTITENANT_GUIDE.md`. Students see the learner dashboard.)

The panel has these sub-tabs:

- **Overview** — live counts (users, subjects, exams, active subscriptions,
  pending orders, approved revenue) and a recent-orders feed.
- **Subjects** — create, edit, and delete subjects & test series (name, type,
  price, validity days, visibility, sort order, description). This is the visual
  equivalent of Step 12.
- **Exams** — create, edit, and delete exams with a subject picker, premium
  toggle, marks / negative marks, schedule, and an advanced JSON-settings box.
  The visual equivalent of Step 13.
- **Subscriptions** — search, manually grant or extend access by a user's email
  or username (extend-vs-start-fresh modes), and revoke.
- **Orders** — filter by pending / approved / rejected / all, and approve or
  reject UPI submissions inline (the same approval that grants a subscription).
- **Users** — search, edit a user's profile and role, reset a password, and
  delete accounts.
- **Platform Billing** — this site's monthly platform invoices (usage charges
  set by the super admin): view amount due, **Print** an invoice (→ Save as PDF),
  and **Pay** by submitting a payment reference for the super admin to confirm.
- **Settings** — brand name, UPI id, payee, and labels. The visual equivalent
  of Step 11; saving updates the live subscribe screen immediately.

A few safeguards are enforced server-side, so the panel can't bypass them: you
can't delete your own account or remove the **last** remaining manager for the
site, and destructive actions ask for confirmation first. Deleting a subject
also removes its subscriptions and orders and unlinks its exams (the dialog warns
you and shows the affected count) — if you only want to retire a subject, set its
visibility to **Hidden** instead of deleting it. All data is scoped to the
site's tenant, so one manager never sees another site's data.

> No extra embed code is needed for the panel — it's part of the same
> `window.AIMCQ_AUTH.dashboard('aimcq-dashboard')` widget from Step 16. It shows
> the Admin Panel to `manager` accounts, the Super Admin console to `superadmin`
> accounts, and the learner dashboard to `student` accounts.

---

## Step 17 — Final end-to-end test

1. Open your post on your **real domain** — the quiz should load.
2. Click the account widget → **Register** a test student account.
3. Open a **premium** quiz → you should see a **lock / Subscribe** screen.
4. Subscribe → pay screen shows your UPI id → submit a transaction id → it
   creates a **pending order**.
5. Log in as a **manager** → open the dashboard → **Admin Panel** → **Orders** →
   approve it.
6. Back as the student → the quiz now opens. Finish it → check the
   **leaderboard** (it unlocks after the exam's end date/time).

If all six work, you're done. 🎉

> While you're logged in as admin, open the **Admin Panel → Overview** tab too:
> you should see your counts (1 user or more, your subjects, exams, the approved
> order and its revenue) — a quick confirmation the whole stack is wired up.

---

## How subscriptions get approved (recap)

Buyers pay by UPI and submit their transaction id, which creates a **pending
order**. You approve it from the **Admin Panel → Orders** tab; approval grants
the subscription for the subject's `days`. Nothing is granted automatically —
you stay in control, and prices are enforced server-side.

---

## Adding another site/domain later

Each additional domain is a **tenant** with its own isolated data, students and
content. To add one:

1. Add its origin to `ALLOWED_ORIGINS` in `wrangler.toml`, then `wrangler deploy`
   (this authorises the domain to load the engine).
2. Log in as the **super admin** → **Tenants → + Add tenant** (name + that
   domain + optional billing plan), then **+ Manager** to create its login.
3. Paste the same HEAD block (Step 14) on the new site. Its manager logs in on
   that domain and sees only their data; students register there and are enrolled
   into that tenant automatically.

See `MULTITENANT_GUIDE.md` for usage billing, invoices and self-service tenant
signup.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Quiz area shows "Missing runtime authorisation" | The HEAD loader didn't run, or `ASSET_TOKEN` in Blogger doesn't match the secret. Re-check Step 14. |
| `/auth` returns "Domain not authorised" | Your domain isn't in `ALLOWED_ORIGINS`. Fix Step 4, redeploy. |
| `/auth` returns "Invalid token" | `ASSET_TOKEN` in Blogger ≠ the secret you set. Re-set one to match. |
| Engine file 404 in console | You didn't upload it to R2, or the key name is wrong. Redo Step 8. |
| "Worker misconfigured: ... not set" | A secret is missing. Re-run the relevant `wrangler secret put` (Step 6). |
| Quiz never appears, no error | Make sure the HEAD block is on the page and `WORKER_BASE` has no trailing slash. |
| No **Admin Panel** tab in the dashboard | You're logged in as a student or super admin, not a `manager`. The Admin Panel shows for `manager`; the super admin gets the Tenants/Billing console instead. |
| Admin Panel tab shows but looks unstyled | Public CSS (`aimcq-auth.css`) is edge-cached up to 24h. Add/bump a `?v=` query on its `<link>`, or purge cache. |
| Admin Panel actions return **403 Forbidden** | Your session isn't a manager/super-admin token — log out and back in with the right account. |
| API returns **"Unknown tenant for this domain"** | The request's domain isn't registered as a tenant. Set tenant 1's domain (Step 2), or add the domain as a tenant in the Super Admin console. |
| Site says **"awaiting approval"** / **"suspended"** | The tenant's status is `pending` or `suspended`. Approve/activate it in **Super Admin → Tenants**. |
| **"This site has reached its monthly request limit"** (429) | The tenant's hard request cap was exceeded. Raise it in **Tenants → Edit**, or wait for the next month. |
| "Cannot delete the last remaining manager" | Working as intended. Add another manager for the site first, then change this one. |
| Leaderboard says "locked" | Normal until the exam's `end_date`/`end_time`. |
| Subscribe screen says "Subject not found" | The subject isn't visible. Create it with `visibility:"show"` (Step 12). To fix an existing one: `wrangler d1 execute aimcq --remote --command "UPDATE subjects SET visibility='show' WHERE visibility NOT IN ('show','hide');"` |
| Account / dashboard / leaderboard render nothing (blank) | The widget script called `AIMCQ_AUTH` before the add-on loaded. Wrap the call in `aimcqReady(function(){ ... })` instead of `DOMContentLoaded` (Step 16). |

---

## Updating a file later

Changed `aimcq.js`, `aimcq-auth.js`, or a CSS file? Just re-upload it:

```bash
wrangler r2 object put aimcq-assets/aimcq.js --file=../engine-patch/aimcq.js
```

Protected JS is served fresh each load; public CSS may take up to 24h to
refresh (or rename if you need it instant).

For deeper reference (full endpoint list, security details), see `README.md`.
