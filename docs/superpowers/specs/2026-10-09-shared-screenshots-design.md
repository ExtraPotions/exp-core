# Shared README screenshots

Date: 2026-10-09
Scope: exp-core, Dropper, PRISMA, SHIFT, WARD

## Goal

One command refreshes every product's README screenshots. Today each product has its own capture script (about 70% identical), with different npm script names, and refreshing all four means running four commands by hand.

Success: `npm run screenshots` in exp-core rebuilds each product and rewrites its `docs/screenshots/*.png` from the current code, with no live network, and a failure never leaves a product half-updated.

## Decisions

| Question | Decision |
|---|---|
| Main goal | One command for all products (also removes the duplicated capture code). |
| Where the tool lives | `exp-core/scripts/capture-screenshots.cjs`, versioned with exp-core. |
| What stays in each product | A shot list, `docs/screenshots.config.cjs`, and one npm script. |
| Release impact | None. Nothing users install changes; no exp-core or product release. |

## 1. Organization

- `exp-core/scripts/capture-screenshots.cjs`, run as `npm run screenshots` in exp-core.
  - No arguments: all four products. Names (`npm run screenshots -- WARD PRISMA`): only those. Unknown names fail before anything runs.
  - Finds products with `scripts/consumer-roots.cjs` (as `npm run sync` does).
  - Uses exp-core's own `playwright`. Launches Playwright's Chromium; if it is not installed, launches an installed Chrome or Edge from the same candidate list as `scripts/use-installed-browser.cjs` (honoring `EXP_BROWSER_PATH`).
- Each product: `docs/screenshots.config.cjs` holds only what is specific to it (section 3).
- Each product's `package.json` has one script, `"screenshots": "node ../exp-core/scripts/capture-screenshots.cjs <Product>"`. Dropper's `capture-screenshots` and WARD's `visual:capture` are removed; PRISMA and SHIFT keep the name `screenshots` with the new command.
- Removed: `Dropper/scripts/capture-screenshots.cjs`, `PRISMA/scripts/capture-screenshots.cjs`, `SHIFT/scripts/capture-screenshots.cjs`, `WARD/scripts/capture-visuals.cjs`.
- A product's `npm run screenshots` needs exp-core checked out beside it. CI never captures screenshots.

## 2. Capture flow (per product)

1. Build: run each script in the shot list's `build` with Node, in the product folder. `--no-build` skips this.
2. Browser context: the shot list's viewport, `deviceScaleFactor: 2`, any `cookies`. An init script installs in-memory `GM_getValue` / `GM_setValue` / `GM_deleteValue` / `GM_listValues` / `GM_addValueChangeListener` / `GM_registerMenuCommand`, pre-seeded from `storage`, and a `GM_xmlhttpRequest` that fails every request.
3. Network: navigation to the shot list's `url` gets `page`; `https://raw.githubusercontent.com/ExtraPotions/<Product>/main/assets/<file>` is served from the product's `assets/`; every other request is aborted.
4. Load: go to `url`, inject the built userscript, wait for `host` to attach, click the launcher (`[data-exp-part="launcher"]` inside `host`), then run `setup(page, host)` if present.
5. Each shot, in order:
   - apply the shot's `viewport` if given;
   - expand the header `.fl-tool-header` whose text matches `section` (if not already expanded), then click the tab with role `tab` and exact name `tab` (if given);
   - move the mouse to (0, 0);
   - run the shot's `before(page, host)` if present;
   - hide `.toast` elements in the host;
   - screenshot `[data-exp-part="dock"]` inside `host`, or the whole viewport when `include: 'page'`.
6. Save: write to a fresh temporary folder. Every file must be over 3 000 bytes and no two files may share a SHA-256. Only if every shot passed are they copied into `docs/screenshots/`. PNGs already in that folder but not in the shot list are listed as a warning, never deleted. The temporary folder is always removed.
7. Report: one line per product (`<Product>: N screenshots` or `<Product>: failed — <reason>`). A failure in one product does not stop the others; the process exits non-zero if any failed.

## 3. Shot list format

`docs/screenshots.config.cjs` exports a plain object:

| Field | Required | Meaning |
|---|---|---|
| `build` | yes | Array of script paths (relative to the product) run with Node before capturing. |
| `userscript` | yes | Built userscript path, relative to the product. |
| `host` | yes | CSS selector of the menu's shadow host. |
| `url` | yes | `https://` address the sample page pretends to be. |
| `page` | yes | Sample page HTML. |
| `viewport` | yes | `{ width, height }`. |
| `shots` | yes | Non-empty array of shots (below). |
| `cookies` | no | Playwright cookie objects added to the context. |
| `storage` | no | Object of initial GM storage values. |
| `setup` | no | `async (page, host)` run once after the menu opens. |

Shot fields: `file` (required, ends in `.png`, unique), `section` (required), `tab` (optional), `include` (optional, `'menu'` default or `'page'`), `viewport` (optional), `before` (optional `async (page, host)`).

Validation runs before the browser opens; a bad shot list fails that product with a message naming the field. The userscript must exist after the build.

## 4. Current shots carried over

| Product | Shots |
|---|---|
| Dropper | `drops-menu.png` (Drops › Progress), `streams-menu.png` (Streams › Playback); placeholder `auth-token` cookie; `before` fills sample progress values |
| PRISMA | `highlights-demo.png` (Highlights, page, 900×640), `appearance.png` (Appearance › Style) |
| SHIFT | `appearance-demo.png` (Appearance › Overview, page, 900×760; `before` applies Midnight), `readability.png` (Appearance › Readability) |
| WARD | `protection.png` (Protection › Overview), `amazon.png` (Amazon › Store) |

Sample pages, sizes, and setup values are taken from the current per-product scripts.

## 5. Testing

exp-core:
- Shot list validation: one valid sample, plus one for each failure: missing required field, duplicate `file`, non-`.png` `file`, missing userscript.
- End to end: a small fixture userscript in `exp-core/tests/fixtures/` that mounts a host with a launcher, a dock, two sections and tabs. The tool captures two shots into a temporary product folder. Asserts both images exist, are non-blank, and differ; that a non-sample request was aborted; and that a shot naming a missing tab fails the product without changing its `docs/screenshots/`.

Products:
- WARD's test that read `scripts/capture-visuals.cjs` for filenames reads the shot list instead.
- Dropper, PRISMA, SHIFT, WARD: every `docs/screenshots/*.png` the README references is in the shot list, and every shot-list file is referenced by the README.
- Existing screenshot-count checks (Dropper test, SHIFT release check, PRISMA test) stay.
- Docs that mention the old scripts (`Dropper/docs/ACTIVE-VIEWING.md`, `SHIFT/docs/testing.md`) point to `npm run screenshots`.

## 6. Rollout

1. exp-core: add the tool and its tests; ordinary commit, no release.
2. Each product: add the shot list, switch `npm run screenshots`, delete the old script, update tests and docs.
3. Run `npm run screenshots` in exp-core once and compare with the current images. Any visible difference other than rendering noise means something did not carry over; fix before committing.
4. Push each repo to `main` as an ordinary commit (no `Release ` prefix), after the user's go-ahead.

## Out of scope

- Running captures in CI or as part of the release scripts.
- Deleting unlisted screenshots automatically.
- Changing which views the READMEs show.
