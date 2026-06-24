# AI MCQs JSON Tool — CDN (library) build

This is the standalone `mcqs-json-tool-v15.html` page repackaged into hosted
**CSS + JS files**, loaded the same way as your Smartboard tool: drop a host
`<div>` into any post/page and include one script tag.

```html
<div class="smartboard-page-wrap">
  <div data-height="100vh" id="smartboard-host"></div>
</div>
<script src="https://cdn.jsdelivr.net/gh/USER/REPO@TAG/mcqs.js"></script>
```

That single `mcqs.js` automatically loads `mcqs.css` and `mcqs.app.js` from the
same folder, plus the third-party libraries the tool needs (Tailwind, JSZip,
Lucide, KaTeX, PDF.js, Cropper). You do **not** add any other `<link>`/`<script>`.

## Files to host

| File          | Role                                                                 |
|---------------|----------------------------------------------------------------------|
| `mcqs.js`     | **Loader** — the only file you reference. Finds the host, injects the UI, loads everything else. |
| `mcqs.css`    | All tool styles (auto-loaded).                                       |
| `mcqs.app.js` | The application logic (auto-loaded **after** the libraries, so its inline button handlers stay global and PDF.js is configured correctly). |

Keep all three in the **same folder** so the loader can find its siblings.

## Hosting on GitHub → jsDelivr

1. Create/choose a repo and upload `mcqs.js`, `mcqs.css`, `mcqs.app.js`
   (e.g. in the repo root, or a `mcqs/` folder).
2. Create a release/tag, e.g. `v1.0` (recommended — see caching note).
3. Your CDN base becomes:
   `https://cdn.jsdelivr.net/gh/USER/REPO@v1.0/`
   so the script URL is:
   `https://cdn.jsdelivr.net/gh/USER/REPO@v1.0/mcqs.js`
   (add the folder if you used one: `…@v1.0/mcqs/mcqs.js`).

**Caching:** pin a tag or commit (`@v1.0`, `@<commit-sha>`) so the three files
stay in sync. After pushing an update, bump the tag, or purge the old one at
`https://purge.jsdelivr.net/gh/USER/REPO@TAG/mcqs.js` (purge all three).

## The `data-height` attribute

- `100vh` → full viewport height (what your snippet uses).
- `640` (bare number) → `640px`.
- Any CSS length (`80vh`, `720px`) works.
- Omit it → the host grows with its content (min-height applies).

## Notes / behaviour

- Only **one** instance mounts per page (the tool uses global element IDs).
  The loader mounts the first host it finds: `#smartboard-host`, or
  `.smartboard-page-wrap [data-height]`, or any `[data-mcqs]` element.
- The original full-page `<body>` styling is reproduced **on the host only**, so
  the tool no longer restyles your site's own `<body>`.
- If a CDN library is briefly slow/unavailable the loader never blocks; the app
  guards missing libraries (icons fill in when Lucide arrives, math renders once
  KaTeX is ready, etc.).
- Manual mount (if you inject the host later): `window.MCQsTool.mount()`.

## Local preview

Open `demo.html` next to the three files (it references `./mcqs.js`). Note that
opening via `file://` may block some CDN libraries; serve over `http://`
(e.g. `python3 -m http.server`) for a faithful preview.
