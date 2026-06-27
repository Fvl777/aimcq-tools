# Update Guide — Test-Series Rules

This update ports the **test-series rules** from the WordPress *AI MCQs Frontend
Pro* plugin into the D1 tool. It upgrades an **already-deployed** install — there
is **no database migration**. The `exams` table already carries
`start_date`/`start_time`/`end_date`/`end_time`, and `subjects.type` already has
`'test_series'`, so your existing data, users, subscriptions, and settings are
untouched.

A subject behaves as a test series when its **type is `test_series`**. The rules
below apply only to exams whose subject is a test series; ordinary subjects keep
the normal "Take Test + Practice" behaviour.

---

## The six rules (and where each is enforced)

| # | Rule | Behaviour | Enforced in |
|---|------|-----------|-------------|
| 1 | **Test mode only** | A live/upcoming test-series exam shows **only "Take Test"** — no Practice button. | `aimcq-auth.js` (card) + `aimcq.js` (`lock_mode`) |
| 2 | **Start-time lock** | Before the unlock date/time the card shows a disabled **"Starts: …"** and the test can't be started. | `aimcq-auth.js` (card) + `worker.js` (rejects early scores) |
| 3 | **Deadline lock** | After the end date/time the timed test is gone; only **Practice** remains. | `aimcq-auth.js` (card) + `worker.js` (rejects late scores) |
| 4 | **Single timed attempt** | One recorded attempt. Afterwards the card flips to **Practice + Leaderboard**; retaking the timed test is blocked. | `worker.js` (rejects repeat attempts) + `aimcq-auth.js` (card) |
| 5 | **Practice gate** | Practice unlocks only **after** an attempt **or after** the deadline — no early revision. | `aimcq-auth.js` (card) + `aimcq.js` (`lock_mode`) |
| 6 | **Leaderboard reveal** | Rankings stay hidden until the deadline passes; the button shows **"Rank locked"**. If no end date is set, the leaderboard is always open. | `worker.js` (already present) + `aimcq-auth.js` (card) |

Client gating is the UX; **the Worker is the hard gate** — practice runs are
never recorded, and timed submissions that are too early, too late, or a repeat
attempt are rejected server-side even if the UI is bypassed.

---

## What changed

| File | Change | Where it runs |
|------|--------|---------------|
| `backend/src/worker.js` | `examScheduleState()` / `userAttempted()` helpers; `schedule` + `attempted` added to `/api/exams` and `/api/exam`; `submitScore` now ignores `mode:'revision'` and enforces start/deadline/single-attempt for test series | Cloudflare Worker |
| `frontend/aimcq-auth.js` | Rewritten test-series exam cards (rules 1–5); timed-vs-practice `launchExam(e, mode)`; score POST forwards `mode` and refreshes cards after a recorded attempt | Served from R2 → browser |
| `frontend/aimcq-auth.css` | Styles for status notes, the action row, and locked buttons | Served from R2 → browser |
| `engine-patch/aimcq.js` | New additive `lock_mode` setting (`'exam'` / `'revision'` / `''`) so a forced launch offers only the correct start button | Served from R2 → browser |

No changes to `schema.sql`, `wrangler.toml`, or `engine-patch/aimcq.css`.

---

## Deploy

1. **Worker** — redeploy the backend:
   ```bash
   cd backend
   wrangler deploy
   ```
2. **Frontend assets** — re-upload the three changed files to wherever you serve
   them (R2 / CDN), keeping the same paths:
   - `frontend/aimcq-auth.js`
   - `frontend/aimcq-auth.css`
   - `engine-patch/aimcq.js`
3. **Cache-bust** if you version asset URLs (e.g. bump `?v=` on the script/style
   tags) so browsers pick up the new files.

No `wrangler d1 execute` is needed.

---

## How to configure a test

In the admin panel (or directly in the `exams` row):

- **Start date / Start time** — leave blank for "available immediately". When set,
  the test is locked until then (default time `00:00`).
- **End date / End time** — leave **End date blank** for "no deadline". When set,
  the timed test closes then (default time `23:59`) and the leaderboard unlocks at
  that same moment.

Set the exam's **subject** to one whose **type is `test_series`** for any of this
to take effect.

---

## Quick test checklist

- Future start date → card shows **"Starts: …"**, disabled; a forced `/api/score`
  returns **403 "has not started yet"**.
- Active window, not attempted → card shows **only "Take Test"** (no Practice).
- Finish the timed test → toast "New best saved", card flips to **Practice +
  Leaderboard (Rank locked till …)**.
- Try to retake the timed test → blocked; `/api/score` returns **403 "already
  attempted"**.
- Past end date, never attempted → card shows **Practice** only; leaderboard
  reveals.
- Practice run → no score recorded (`/api/score` returns `practice: true`).

---

## Add-on: Subjects tab + Subscribe / Renew button rules

A new **Subjects** dashboard tab lists **paid** and **free** subjects exactly like
Test Series — each card has a **View Exams** button (free subjects open straight
in; paid subjects open too, with individual premium exams still locked until you
subscribe). Test series cards now carry the same subscription controls.

The payment button follows one rule everywhere (Subjects, Test Series, Subscribe,
and My Subscriptions):

| State | Button |
|-------|--------|
| Free subject | none (just View Exams) |
| Paid, not subscribed / expired | **Subscribe** (active) |
| Paid, subscribed, more than 7 days left | **Subscribed** (disabled — no re-subscribe) |
| Paid, subscribed, within the last 7 days to expiry | **Renew** (active) |

The 7-day window is `RENEW_WINDOW_DAYS` in `frontend/aimcq-auth.js` (change it
there if you want a different lead time). All of this is frontend-only — it reads
`/api/subjects` and `/api/subscriptions`; **no backend or schema change** and no
redeploy of `worker.js` is required for this part (only the two frontend files).

Files touched: `frontend/aimcq-auth.js` (new `viewSubjects`, shared
`subjectActionButton` / `subjectStatusBadge` / `renderSubjectCard`, updated
`viewTestSeries` / `viewUpgrade` / `viewSubscriptions`, new nav tab) and
`frontend/aimcq-auth.css` (`expiring` badge).

---

## Add-on: Admin-only dashboard

Admins now get an **admin-only dashboard** — the student tabs (Test Series,
Subjects, My Subscriptions, Subscribe) are hidden for them and the dashboard opens
straight on the **Admin Panel** (with its own Overview / Subjects / Exams /
Subscriptions / Orders / Users / Settings sub-nav). If a student view is ever
requested while logged in as an admin, it is redirected back to the panel.
Regular users are unaffected. Frontend-only (`frontend/aimcq-auth.js`); no backend
or schema change.

---

## Add-on: Professional, responsive dashboard redesign (user + admin)

A visual overhaul of both dashboards, keeping the existing indigo identity but
elevating it into a cohesive product UI that works well on phones and tablets.

- **Header band** on every dashboard: avatar, greeting (or "Admin console" + an
  **Admin** chip), and a context pill showing the current section.
- **Segmented navigation** that scrolls horizontally on narrow screens instead of
  wrapping. Admins drop straight into the panel's own sub-nav (the redundant
  single top tab is hidden).
- **Refined cards** with hover lift, clearer badges and status notes, and
  full-width action buttons on mobile.
- **Leaderboard**: the "your rank" hero reflows to a 2-column grid on small
  phones, and the ranking table turns into a labelled **card per row** on mobile
  (`data-label` per cell) instead of an awkward horizontal scroll.
- **Admin console**: accent-striped stat cards, tidy toolbar/pills, and data-dense
  tables that scroll horizontally with aligned columns on small screens.
- **Quality floor**: visible keyboard focus rings, larger tap targets on touch,
  and `prefers-reduced-motion` respected.

Breakpoints: tablet ≤960px, mobile ≤640px, small phone ≤400px.

---

## Add-on: Open quizzes in a new tab

Launching a test or practice run from the dashboard now opens it in a **new
browser tab** (full-screen) instead of mounting below the dashboard. The tab is
opened on the user's click, so pop-up blockers allow it; if a browser does block
it, the quiz falls back to the old in-page mount automatically.

How it works: the launch opens `…?aimcq_run=<examId>&aimcq_mode=<exam|practice>`.
On load the add-on detects that parameter, fetches the exam, and renders the quiz
full-screen with a slim top bar (brand + **Close**). The user stays logged in
because the token is shared across tabs, so scores still record on finish. The
new tab re-checks subscription, test-series schedule, deadline and single-attempt
rules before starting, mirroring the dashboard cards.

By default the new tab reopens the current page. Optionally set
`AIMCQ_AUTH_CONFIG.examPage` to a dedicated blank runner page (one that also loads
the HEAD block), and `dashboardUrl` for where **Close** sends users if the tab
can't close itself. Frontend-only — `frontend/aimcq-auth.js` and
`frontend/aimcq-auth.css`; no backend or schema change.

Files touched: `frontend/aimcq-auth.css` (rewritten) and `frontend/aimcq-auth.js`
(dashboard header markup, single-tab hide for admins, `data-label`s on the
leaderboard table). No backend or schema change. A standalone
`dashboard-preview.html` is provided to eyeball the result and resize-test it.
