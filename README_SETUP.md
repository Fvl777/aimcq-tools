# AI MCQs JSON Tool — GitHub + jsDelivr Hosting Guide

This package converts the single-file `mcqs-json-tool-v15.html` into CDN-hostable
assets, so you embed the tool with one `<div>` + one `<script>` — the same shape
as your Smartboard tool, but with **no Cloudflare Worker and no JWT**. The files
are public on GitHub and delivered by jsDelivr's CDN.

## Files in this package

| File | Where it goes | Purpose |
|------|---------------|---------|
| `mcqs-tool.js` | GitHub → jsDelivr | **The only URL you reference.** Loader: injects the tool's markup, auto-loads the CSS + core from the same folder, and pulls in every library the tool needs (Tailwind, JSZip, Lucide, KaTeX, PDF.js, Cropper.js). |
| `mcqs-core.js` | GitHub → jsDelivr | The tool's logic (loaded automatically by `mcqs-tool.js`). Kept as a separate file so all the tool's buttons/handlers keep working unchanged. |
| `mcqs-tool.css` | GitHub → jsDelivr | The tool's styles (loaded automatically). |
| `embed-snippet.html` | — | Copy-paste embed for any website. |
| `blogger-embed-mcqs.xml` | Blogger Theme editor | Full Blogger theme that mounts the tool full-page. |
| `test-local.html` | your computer | Verify the 3 files locally before pushing. |

> The three CDN files (`mcqs-tool.js`, `mcqs-core.js`, `mcqs-tool.css`) **must live
> in the same folder** in your repo, because the loader finds its siblings relative
> to its own URL.

---

## Step 1 — Put the 3 files in a GitHub repo

1. Create a repo (e.g. `mcq-tool`) — public.
2. Upload `mcqs-tool.js`, `mcqs-core.js`, `mcqs-tool.css` to the repo root
   (or all into one sub-folder, e.g. `/dist`).
3. **Create a release tag** (Releases → Draft a new release → tag `v1.0`).
   Using a tag keeps the CDN version stable and caches well. (You *can* use a
   branch like `main`, but jsDelivr caches it for up to 12 h, so updates are slow
   to appear.)

---

## Step 2 — Get the jsDelivr URL

jsDelivr serves any public GitHub file at:

```
https://cdn.jsdelivr.net/gh/USER/REPO@VERSION/PATH
```

So your loader URL is one of:

```
https://cdn.jsdelivr.net/gh/USER/REPO@v1.0/mcqs-tool.js          (files in repo root)
https://cdn.jsdelivr.net/gh/USER/REPO@v1.0/dist/mcqs-tool.js     (files in /dist)
```

Replace `USER`, `REPO`, and `v1.0` with your own. You only ever hard-code this
**one** URL — the loader derives the core + css URLs from it automatically.

---

## Step-by-step math solutions

Both the **AI Analysis** panel (Question Editor) and the **Question Extractor**
have a **"Step-by-step math"** checkbox (checked by default). When enabled,
if — and only if — a question is numerical/mathematical/quantitative
(requires a calculation, formula, equation, or step-wise derivation), the
generated explanation is structured as clearly numbered steps instead of a
dense paragraph:

```
Step 1: ...
Step 2: ...
Step 3: ...  (final step states the resulting value/answer)
```

All math stays in LaTeX (`$...$`), the steps still respect the no-option-
references rule, and — in the Question Editor — still fit inside the
pre-existing explanation's overall HTML format. Purely conceptual/factual
questions with no calculation are left as a normal explanation; steps are
never forced where they don't make sense. Works in both languages (the word
"Step" is translated for Hindi output) and with both extractor providers —
in DeepSeek mode, the step structuring happens in DeepSeek's own structuring
call, after the Gemini/Gemma transcription step.

---

## Question Extractor (AI — Gemini)

A dedicated **Question Extractor** tab builds a question bank straight from
exam papers. Workflow:

1. **Load** a PDF (any page count, rendered at high fidelity) or an image
   (screenshot/photo of the paper). Same viewer as the Figure Updater —
   page navigation and zoom included; crop mode is always on.
2. **Crop one full question** (statement + options), Google-Lens style.
3. **Extract Question with AI** uses the tab's **own free-tier API pools**
   ("Extractor API Settings" — fully separate from the Question Editor's
   key), with a **provider switch between Gemini and DeepSeek**, each with
   its own model choice and its own multi-key pool. In Gemini mode the crop
   goes straight to a Gemini vision call. In DeepSeek mode — since
   DeepSeek's API cannot read images — a **dedicated vision model** first
   transcribes the crop with a minimal plain-text prompt, and DeepSeek then
   does all the heavy structuring/solving/explanation work, keeping most
   token usage on your DeepSeek limits. That transcription step defaults to
   **gemma-4-31b-it** (a Gemma vision model, called via the Gemini API with
   your extractor Gemini-pool keys, or the Question Editor's key as
   fallback) — chosen deliberately because it draws on its **own separate
   free quota**, independent of whichever Gemini model you use for direct
   Gemini-mode extraction. The vision model is editable in the DeepSeek
   settings note (dropdown + custom model id field) if you'd rather use a
   different Gemini/Gemma model for this step. Add multiple keys per provider from separate
   accounts; they're tried in order, and when the active key hits a
   quota/rate limit (HTTP 429 — or 402 insufficient balance for DeepSeek)
   it's automatically deactivated for 24 hours
   (the free tier's daily reset) and the call retries with the next active
   key, repeating till the last key. Deactivated keys re-activate on their
   own after 24 h, or instantly via the per-key Reactivate / "Reset all
   limits" buttons. The pool (keys, model, cooldowns) lives in localStorage
   and survives refresh. The AI
   transcribes the question and options exactly (LaTeX as `$...$`,
   `[image here: ...]` placeholders for embedded diagrams — ready for the
   Figure Updater later), solves it if the paper doesn't mark the answer,
   and drafts an explanation (no option-letter references). Output language
   is selectable: Auto-detect / English / Hindi / Bilingual (EN + HI).
4. **Review & edit** every field — question, options (add/remove, pick the
   correct one), explanation, Hindi side for bilingual — then
   **Save to Question Bank**.
5. Repeat for each question. The bank is stored in the browser's
   **IndexedDB**: it survives refresh and browser close, and entries are
   removed only via the per-question Delete button (or Delete All, both
   with confirmation).
6. **Export JSON** downloads the whole bank in the standard question JSON
   format (`posts` with `_aimcq_options`, `_aimcq_correct_answers`,
   `_aimcq_explanation`, plus `_hi` fields for bilingual) — directly usable
   in the Question Editor, Quiz Builder, and Figure Updater tabs.

---

## Figure position — place figures anywhere in the question

Exam papers often show the diagram *between* the question's lines (e.g. after
"Consider the following statements…" but before statement A). The Figure
Updater supports this: once a question figure is cropped/set, a
**"Figure Position in Question"** panel appears listing every line of the
question. Pick **Auto** (default — replaces an `[image here: ...]` placeholder
or the existing figure, else appends at the end), **At the very start**,
**After line N** (each line shown with a text preview), or **At the very end**.
The live preview updates instantly, and Apply writes the figure at that exact
spot in both English and Hindi content (line number clamped for the shorter
side). Re-applying at a different position moves the figure — never duplicates
it.

---

## Instant CDN updates (forced jsDelivr purge)

jsDelivr normally caches GitHub branch URLs for up to ~12 hours. The tool now
**force-purges the jsDelivr cache automatically** every time you use
**Update to GitHub** (in the Question Editor and the Figure Updater), so the
committed JSON is served immediately on the same CDN URL — no waiting, no
version bump needed. Both URL forms are purged:
`.../gh/USER/REPO@BRANCH/file.json` and `.../gh/USER/REPO/file.json`.

A manual **Purge CDN cache** button also sits next to "Copy CDN link" in the
GitHub link row of both tabs, for cases where the file was changed outside the
tool. If the purge service is unreachable the commit still succeeds — you'll
get a notice and can retry the purge button (or wait for natural expiry).

---

## AI Question Update (Gemini API)

The **Question Editor** tab includes an AI review workflow powered by Google's
Gemini API. It runs entirely in the browser — your key is stored only in
localStorage and requests go directly to `generativelanguage.googleapis.com`.

**Setup (once):** load a JSON in the Question Editor tab, open the
**"AI Question Update (Gemini API)"** card above the toolbar, paste your key
(free at https://aistudio.google.com/app/apikey), pick a model
(`gemini-2.5-flash` recommended), then **Save**. Use **Test connection** to verify.

**Per question:** click any question to open its edit modal. The
**AI Analysis (Gemini)** panel there will:

1. Independently re-solve the question from the question text + options.
2. Cross-check whether the currently marked correct option is really correct.
3. If it's wrong, tell you the truly correct option (with confidence level).
4. Draft a **new explanation that replicates the pre-existing explanation's
   exact HTML format** (same tags, structure, styles, LaTeX conventions) —
   only the substance changes to justify the correct answer. Language always
   follows the file itself — a Hindi-only file gets a Hindi explanation, an
   English-only file an English one. For bilingual files it is preserved per side: the English explanation is written in English matching
   the English sample's format, the Hindi explanation in Hindi matching the
   Hindi sample's format. Explanations contain **no option references** — no
   option letters (A/B/C/D), no "Correct Answer: (X)" lines — they state and
   justify the actual answer substance directly. (Option letters still appear
   in the on-screen AI reasoning/verdict, just never inside the explanation.)
5. Optionally verify **your own suggested option**: pick "Option (X) — I think
   this is correct" in the dropdown before analyzing, and the AI reports an
   explicit verdict on your suggestion.

Nothing is changed automatically. Review the result, then use
**Apply Correct Option / Apply Explanation / Apply Both**, and finally click
**Save Changes** to commit (and Apply & Export / Update to GitHub as usual).

Notes: questions relying on figures are analyzed from text only ("[FIGURE]"
placeholder is sent), so treat low-confidence verdicts on figure questions
with care. If requests fail, check the key, model access, quota, or
ad-blockers blocking `googleapis.com`.

---

## Step 3 — Embed it

### Any website

```html
<div class="mcqs-page-wrap">
  <div id="mcqs-host" data-height="auto"></div>
</div>
<script src="https://cdn.jsdelivr.net/gh/USER/REPO@v1.0/mcqs-tool.js"></script>
```

### Blogger

Open **Theme → ⋮ → Edit HTML**, replace the whole theme with
`blogger-embed-mcqs.xml`, edit the loader URL inside it, and Save. The theme
hides Blogger's own header/footer so the tool fills the page (same approach as
your Smartboard theme).

---

## How it works (the embed flow)

```
Your page
  │  <script src=".../mcqs-tool.js">  runs
  │     1. reads its own URL → knows the CDN folder
  │     2. finds <div id="mcqs-host"> (or [data-mcqs-tool], or #smartboard-host)
  │     3. injects the tool's HTML into that div
  │     4. adds <link> mcqs-tool.css  (same folder)
  │     5. injects Tailwind / JSZip / Lucide / KaTeX / PDF.js / Cropper
  │     6. adds <script> mcqs-core.js (same folder) → tool boots
  ▼
Tool appears inside the host div ✅
```

### The host `<div>`
- `id="mcqs-host"` is the default the loader looks for.
- `[data-mcqs-tool]` also works (`<div data-mcqs-tool data-height="auto"></div>`).
- `id="smartboard-host"` also works, so you can reuse an existing Smartboard
  page layout without renaming anything.
- `data-height` — height behavior of the host:
  - `"auto"`, omitted, or the legacy `"100vh"` → **flexible height** (default).
    The tool is exactly as tall as its content, so homepage content placed
    below it flows immediately after the tool with no white gap. (`"100vh"`
    is intentionally treated as auto for backward compatibility — older
    embeds stop forcing a full-viewport min-height without any edit.)
  - Any other value (`"640"`, `"640px"`, `"80vh"`) → applied as a
    **min-height** for pages that want a fixed reserved space.

### Manual mount (optional)
The loader auto-mounts on page load. To control it yourself:

```html
<div id="my-spot"></div>
<script src="https://cdn.jsdelivr.net/gh/USER/REPO@v1.0/mcqs-tool.js"></script>
<script>MCQTool.mount(document.getElementById('my-spot'));</script>
```

---

## Updating the tool later

1. Edit the file(s) in your repo.
2. Cut a new release tag (e.g. `v1.1`).
3. Change `@v1.0` → `@v1.1` in your embed `<script>` URL.

If you embedded with `@main` instead of a tag, you can force jsDelivr to refresh
its cache by visiting `https://purge.jsdelivr.net/gh/USER/REPO@main/mcqs-tool.js`.

---

## Notes & gotchas

- **Dedicated page recommended.** The tool uses Tailwind's runtime CDN, whose
  base reset applies page-wide — exactly as in the original single-file tool.
  Give it its own page (the Blogger theme already hides other page chrome), just
  like the Smartboard.
- **All libraries auto-load.** You don't add Tailwind/JSZip/etc. yourself; the
  loader injects them (and skips any your page already has).
- **Nothing was rewritten.** `mcqs-core.js` is the original tool script verbatim
  and `mcqs-tool.css` is the original styles verbatim (plus a few additive,
  scoped rules at the end of the CSS). All tabs — Split, Combine, Quiz Builder,
  Question Editor, Figure Updater, Frontend Builder, GitHub sync — behave exactly
  as before.
- **No flash of unstyled HTML.** The loader fetches `mcqs-tool.css` + Tailwind
  first, mounts the tool hidden behind a small loading spinner, and only reveals
  it once the styles are applied — so the raw markup never paints unstyled.
- **`aimcq.js` is unrelated.** The Frontend Builder still generates quiz pages
  that reference `aimcq.js` in *your* quiz repo; that is the published quiz
  player and is separate from these tool files.

---

## v1.3 — Passage (reading-comprehension) support

The tool now fully preserves aimcq passage structure end-to-end:

- **Export canonicalization keeps passage keys.** Questions keep
  `_aimcq_is_passage_question` / `_aimcq_passage_id`, and `post_type:"passage"`
  posts keep `_aimcq_passage_content_hi`, `_aimcq_passage_display_title_en/_hi`
  and `_aimcq_passage_translation_custom_prompt`. (Previously these were
  stripped, so quizzes exported by the tool lost their passage box in the
  aimcq engine.)
- **Split is passage-aware.** A passage post and all of its linked questions
  always land in the same output file; the chunk size counts questions and the
  passage post rides along.
- **Question Editor shows passage badges** (purple "Passage" / "Passage Q → id")
  and keeps groups consistent: deleting a passage also marks its linked
  questions, deleting the last linked question also removes the now-orphan
  passage post, and undeleting restores the group.
- **Export-time validation.** Every download and GitHub commit checks passage
  integrity and shows a warning toast if questions reference a passage that is
  missing from the file (or a passage has no linked questions).

### v1.3.1 — Browse & Load tab: per-file Download + Delete

Each `.json` row in the GitHub modal's **Browse & Load** tab now shows, between
the CDN and Load buttons:

- **Download (green)** — saves the file to your device exactly as it is on
  GitHub (no canonicalization, nothing is loaded into the tool).
- **Delete (red)** — permanently deletes the file from the repository. Two-step
  safety: the first click arms the button ("Sure?", auto-disarms after 4 s);
  the second click within that window commits the delete, refreshes the
  listing, and unlinks the file if it was the currently linked Editor/Figures
  file. Requires a token with `repo` scope (the button sends you to the
  Credentials tab if none is saved).

### v1.3.2 — Browse & Load tab: folder Download + Delete

Folder rows in the **Browse & Load** tab now have the same two buttons
(between the folder name and the chevron):

- **Download (green)** — recursively fetches every file inside the folder
  (including subfolders, binary-safe for images) and saves it as
  `foldername.zip`, with a progress counter on the button.
- **Delete (red)** — permanently deletes the folder and ALL files inside it,
  with the same two-step arm/confirm ("Sure?", 4 s auto-disarm), per-file
  progress on the button, automatic unlinking of any linked Editor/Figures
  file that lived inside the folder, and a listing refresh afterwards.
