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

## Gemini split pipeline — Gemma vision + text-only generation

To stretch Gemini free-tier limits further, Gemini mode now has a
**"Split pipeline"** toggle (ON by default) in the Extractor API Settings.
When on, extraction runs in two cheap stages instead of one expensive
multimodal call:

1. The shared **vision model** (default `gemma-4-31b-it`, editable dropdown
   + custom id) reads the crop with a minimal transcription prompt — Gemma
   draws on its **own separate free quota**.
2. The selected **Gemini generation model** (e.g. `gemini-2.5-flash`) then
   runs **text-only** on that transcription to produce the structured
   question — so its multimodal/vision quota is never touched.

The status chip shows the chain (`gemma-4-31b-it → gemini-2.5-flash`), and
the Extract button reports each stage. Turn the toggle off for the classic
single multimodal call. If the vision model id is rejected by the API
(404/not-supported), extraction automatically falls back to the direct
multimodal call and tells you — nothing breaks. The vision model setting is
shared with DeepSeek mode (migrated automatically from earlier versions).

---

## Fix: line breaks now follow genuine breaks, not the image's word-wrap

Earlier, the extractor could copy every visual line-wrap from the cropped
image as a `<br>` — so a sentence that merely wrapped to the next line
because of column width came out broken into multiple lines instead of one
continuous sentence. The transcription and reconstruction prompts (both the
Gemini direct-vision path and the Gemma/Gemini → DeepSeek hybrid path) now
explicitly distinguish the two: a `<br>` is only inserted for a **genuine
logical break** — a new labeled statement/point (A./B./I./II./1./2.), a
clearly separate sentence/point by the author's intent, or a real paragraph
break. Plain word-wrap is reflowed back into one continuous line. When the
AI is unsure which kind of break it's looking at, it's instructed to prefer
joining the text over breaking it.

---

## LaTeX notation — sub/superscripts & degrees everywhere

All AI prompts (Question Extractor transcription + structuring, both
providers, and the Question Editor's AI Analysis) now enforce a shared
notation rule: **every superscript, subscript and degree symbol is written
as KaTeX-renderable LaTeX inside `$...$`**, in math *and* non-math content
alike — question text, every option, and the whole explanation. Covered
cases include powers (`$x^2$`, `$10^{-3}$`), units (`$m^2$`, `$km^2$`,
`$m/s^2$`), chemical formulas (`$H_2O$`, `$CO_2$`, `$C_6H_{12}O_6$`),
ions/charges (`$Na^+$`, `$SO_4^{2-}$`), isotopes (`$^{235}U$`), angles /
temperatures / coordinates (`$45^\circ$`, `$30^\circ C$`, `$23.5^\circ N$`,
`$82.5^\circ E$`), and indexed terms (`$a_n$`, `$v_0$`). Multi-character
scripts must be braced (`$10^{-3}$`). Raw Unicode script/degree characters
(², ₂, °, ⁺ …) and HTML `<sub>/<sup>` tags are forbidden — even if the
source image prints them that way, they're converted to LaTeX during
transcription, so everything renders consistently through KaTeX in the quiz
frontends.

---

## Explanation depth — Detailed teaching mode (for weak students)

Both the **Question Extractor** and the Question Editor's **AI Analysis**
panel now have an **Explanation** depth selector with three levels:

- **Detailed (for weak students)** — the default. The AI is required to
  teach, not just state: it recalls the key concept/formula and why it
  applies, shows every intermediate step of the working with a
  plain-language reason after each, restates the final answer, optionally
  notes the most common mistake, and targets roughly 120-300 words —
  short 2-3 sentence answers are explicitly forbidden. This fixes
  DeepSeek's tendency to return very terse, to-the-point explanations. In
  bilingual output, both language sides must meet the depth, each in its
  own language.
- **Standard** — the previous behavior, no extra depth instruction.
- **Concise** — explicitly brief, 2-4 essential sentences.

The depth requirement composes with the existing rules (step-by-step math,
no option references, language matching). In the Question Editor, Detailed
mode is allowed to exceed the pre-existing explanation sample's length —
it keeps the sample's tags, styling and structural conventions but expands
the substance to the required depth.

---

## AI figure generator (Figure Updater tab — optional)

Figure reproduction lives in the **Figure Updater** tab, as an optional
manual step inside **Quick Crop & Upload**:

1. Load the PDF/image, crop the figure region (graph, circuit, truth
   table, labelled diagram — common in NEET/JEE physics) as usual.
2. Tick **AI figure generator** (off by default). A model selector appears
   (default `gemini-3.1-flash-lite-image`, with a custom-id field), and the
   button relabels to **Generate Figure & Upload**.
3. Click it: the crop is sent to the image-output model, which reproduces
   ONLY the figure as a clean standalone image on white — question text,
   options, answer markings and watermarks removed — and that generated
   image is then uploaded to GitHub and served via **jsDelivr**, giving you
   a reusable CDN URL exactly like a normal crop upload. Leave the toggle
   off to upload the raw crop unchanged.
4. Use the resulting URL through the tab's normal figure-slot workflow to
   write it into the target question(s).

The **AI figure generator toggle also applies to every figure slot's
Crop & Set** — the Question Figure slot and all four Option A/B/C/D slots.
With it on, clicking **Crop & Set** on any slot sends that slot's crop to
the image model, reproduces only the figure, and sets the generated image
into the slot (marked with a small **AI** badge); **Apply Figures** then
uploads it to GitHub + jsDelivr exactly like a manual crop. This makes it
easy to AI-generate figures for questions whose *options themselves* are
figures (e.g. four graph options). With the toggle off, Crop & Set stores
the raw crop at its exact pixel dimensions as before. If generation fails
(no key / model error) the slot is left untouched with a clear message.

The AI call uses a Gemini API key from the **Question Extractor key pool**
(with the same 24 h limit rotation), falling back to the **Question
Editor** AI key; if neither is set it tells you. Uploading uses this tab's
**Image Hosting (GitHub)** settings. This keeps figure generation fully
manual and separate from question extraction — the Question Extractor no
longer generates figures itself.

---

## Span-pages (crop across a page break)

Both PDF viewers — the **Question Extractor** and the **Figure Updater** —
have a **Span pages** toggle in the page-navigation bar. When a question
(or figure) starts near the bottom of one page and continues onto the next,
turn it on: the current page and the following page are rendered stacked on
one tall, scrollable canvas with a dashed line marking the page boundary, so
you can drag a single crop selection straight across the break and capture
the whole question in one go. The page label shows the range (e.g. "1–2"),
and Next/Prev step by the span. Turn it off to return to the normal
one-page-at-a-time view. (Images loaded directly are single-canvas already
and ignore the toggle.)

---

## Match-the-list & table questions

The Question Extractor now handles **match-the-list / match-the-columns**
questions (List-I / List-II, Column A / Column B, "Match the following")
and any question that **already contains a table**:

- The matched lists are rendered as a clean HTML `<table>` inside the
  question, using the lists' own headings for the two columns.
- **Each list item stays whole in one cell, with its own label** — e.g.
  `A. Kudankulam` in one cell and `1. Karnataka` in the adjacent cell on
  the same row. The A./B./C./D. and 1./2./3./4. markers are **not** split
  into separate columns, and no extra marker columns are created.
- One matched pair per row, in the printed order; unequal lists leave the
  extra cells empty.
- The four answer options remain compact code strings
  (e.g. `A-2, B-4, C-3, D-1`), not tables.
- Existing tables (including truth tables) are reproduced faithfully with
  the same rows/columns rather than flattened into lines.

Tables use minimal clean HTML (`<table>/<thead>/<tbody>/<tr>/<th>/<td>`),
render correctly in the review Preview, the rich editors, and the quiz
frontends, and survive the HTML-source view with proper indentation. In
DeepSeek mode the vision step transcribes tables as Markdown so the
structure is preserved before DeepSeek rebuilds the HTML table.

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
   its own model choice and its own multi-key pool (DeepSeek:
   `deepseek-v4-flash` default, `deepseek-v4-pro`, plus V3 `deepseek-chat` /
   R1 `deepseek-reasoner`; both providers also accept a custom model id). In Gemini mode the crop
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
4. **Review in Preview / Editor mode.** After extraction the question opens
   in **Preview mode** by default — rendered exactly as students will see
   it in the quiz frontend: formatted question text with KaTeX math,
   lettered option cards with the correct one highlighted (✓), and the
   explanation panel; bilingual questions show both language sections. A
   **Preview | Editor** toggle at the top switches to **Editor mode**,
   where the **question and explanation fields use the same full rich
   editor as the Question Editor tab** — a **Blogger-style toolbar**
   (undo/redo, font family & size, Normal/Heading/Subheading/Minor
   heading/Paragraph/Quote dropdown, bold/italic/underline/strikethrough,
   text-colour & highlight palette pickers with custom colour, sub/
   superscript, link/image/table, left/centre/right/justify alignment,
   numbered & bulleted lists, remove formatting), plus Compose /
   HTML-source / live-preview tabs and the ∑ LaTeX helper for inserting
   math enclosers. The **HTML view is Blogger-like too**: a light white
   theme (no dark code background) with readable syntax colours, and the
   source is shown **well-structured** — block tags (`<p>`, `<ul>`,
   `<table>`, headings…) each on their own line with 2-space nesting
   indentation, one line per `<br>`, and short leaf elements like
   `<li>text</li>` kept compact on a single line. `<br>` line structure
   and toolbar-applied `<span style>` colours/fonts are preserved in the
   source (only bare editing wrappers and `&nbsp;` are normalised away). The toolbar is one shared component, so the interface
   is exactly identical in the Question Editor modal and the Extractor — while options stay as
   quick inline inputs (add/remove, radio for the correct one), with a
   full Hindi editor set for bilingual questions. Edits are never lost when
   switching: Preview re-reads the current field values every time it
   opens, so you can flip back and forth to check how changes render, then
   **Save to Question Bank** from either mode.
5. Repeat for each question. Questions are saved into **subject
   libraries**: pick the target library (e.g. Physics, History, Maths)
   right next to the Save button, or create a new one with the **+**
   button. The bank card has a library filter (All libraries / specific),
   shows a library badge on each question in the All view, and remembers
   your selections. Everything is stored in the browser's **IndexedDB**:
   it survives refresh and browser close, and entries are removed only via
   the delete buttons — per-question Delete, a library-scoped **Delete
   All**, or **Delete library** (removes a custom library plus its
   questions; the built-in General library can't be deleted). All deletes
   ask for confirmation. Existing banks from earlier versions migrate
   automatically into General.
6. **Export JSON** downloads the currently viewed scope — the selected
   library (filename includes the library name, JSON includes a `library`
   field) or all libraries together — in the standard question JSON
   format, with the **`terms` array populated per library**: `taxonomy`
   and `name` are the library name, `slug` is its slug (Devanagari
   preserved), and `language`/`language_code` reflect the generated
   language of that library's questions — `English`/`01EN`,
   `Hindi`/`01HI`, or `English & Hindi`/`01ENHI` (any bilingual question, or a
   mix of English and Hindi questions, makes the library `01ENHI`). Every
   exported post also references its library term via
   `taxonomies: { "<Library Name>": ["<library-slug>"] }`; an
   all-libraries export contains one term per library, each with its own
   code (`posts` with `_aimcq_options`, `_aimcq_correct_answers`,
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
