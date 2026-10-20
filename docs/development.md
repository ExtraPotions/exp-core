# Maintaining the ExtraPotions suite

This is the working guide for exp-core and the products that bundle it: Dropper, SHIFT, PRISMA, WARD and the local Thread implementation. Each product folder has a short `docs/development.md` with its own commands; this page covers everything they share. Thread has no public repository or install configured yet.

## How the suite fits together

exp-core is the one implementation of shared behaviour: the launcher and its flyout, menu chrome and tabs, themes and menu size, notices, update and changelog cards, diagnostics, and the suite contract. Products keep only their own engines and settings.

- **Build.** `npm run build` writes `dist/exp-core.js`. Products never import Core at runtime: each one vendors a released copy in `vendor/exp-core/` (`exp-core.js`, `manifest.json`, `PIN`) and its build bundles it into the single `*.user.js` file.
- **Suite contract.** `src/suite-contract.json` defines each product's role, priorities, capabilities, state events, menu sections and repository. Products cannot override these at runtime; registration only supplies identity, version and product state.
- **Launcher.** When two or more products are on a page and every Core copy speaks the flyout protocol, they share one launcher: a hub that opens a row of product tiles. `src/launcher-flyout.js` holds the order (`SUITE_ORDER`) and the site products that lead on their own sites (`SITE_PRODUCTS`: Dropper on Twitch, WARD on retailers). A Core copy without the protocol keeps everyone on the older grid. Sites listed in `SITE_SLOTS` (`src/runtime.js`) give the hub a place in the page; today that is Twitch's top bar. Everywhere else, and when the slot is hidden or too narrow, the hub sits in the bottom-right corner.
- **Menus.** Product menus use a compact sidebar over their existing sections, with inline secondary settings and Look/System navigation. Support and Reset live only inside System; donations stay in the header heart. Menu Size is directly in Look (or the Look disclosure in Dropper Settings). System keeps status, diagnostics and recovery. All existing and future products use the [shared menu template](menu-template.md); Dropper retains its separate progress surface. Custom product surfaces use `createMenuController` and take their width from `menuWidth()`.
- **Placement rules worth knowing before changing geometry:**
  - Corner positions use the viewport width without the page scrollbar (`viewWidth()` in `src/runtime.js`), not `innerWidth`.
  - A product marks a surface that notices must not cover with `data-exp-reserved` (Dropper's progress strip and page card). Update and changelog cards are placed clear of reserved surfaces.

## Toolchain

- Node 24 or newer (`engines` in every `package.json`). Run `npm ci` once in each repository.
- Browser tests use Playwright's Chromium. To use an installed Chrome or Edge instead, run `npm run test:installed-browser`, or set `EXP_BROWSER_PATH` to a browser executable. Vivaldi is not a supported test browser: a Playwright run pointed at it did not finish. Use Vivaldi with a userscript manager for manual checks of the installed scripts.
- On Windows, the installed-browser preloads require `EXP_BROWSER_PATH` to point to `chrome-headless-shell.exe`. Full Chromium 153 fresh profiles generated failed Windows logons and locked the local account; full-browser overrides are refused until a fix or mitigation is verified. Default Playwright headless tests use the shell without this override. Do not change credentials or weaken account lockout policy for browser tests.
- Keep the five repositories side by side in one folder. The sync, coexistence and screenshot scripts look for the products beside exp-core (override with `EXP_SUITE_ROOT` or `EXP_PRODUCT_ROOTS`).
- On a machine with few cores, run tests with `--test-concurrency=2`.

## Commands

| Repository | Build | Tests | Extra checks |
|---|---|---|---|
| exp-core | `npm run build` | `node --test tests/*.test.cjs` | `npm run build:check`, `npm run sync:check`, `npm run duplicates:check` |
| Dropper | `npm run build` (assembles `src/parts/`, then minifies) | `node --test tests/*.test.cjs` | `npm run build:check` |
| SHIFT | `npm run build` | `node --test tests/*.test.cjs` | `npm run release:check` |
| PRISMA | `npm run build` | `node --test tests/*.test.cjs` | `npm run release:check` |
| WARD | `npm run build` | `node --test tests-v3/*.test.cjs` | `npm run release:check`, `npm run test:fallback` |

`npm test` in each repository builds and then runs its full suite.

Checks are manual. Build affected products and choose the tests relevant to the change. `release:check`, `verify:release`, `suite:local`, Core-pin verification and coexistence checks remain optional diagnostic commands, not release gates. Some checks need sibling products or published Core assets; a failure there does not impose a release order.

## Fixing a bug

Start by deciding where the bug lives.

1. **Product only.** Change the product's source, add a test that fails first, build, and run that product's suite. For Dropper, edit `src/parts/`, never `src/dropper.user.js` or `dropper.user.js` (both are generated).
2. **Core only.** Change `src/`, add a failing test in `tests/`, run `npm run build` and the Core suite.
3. **Shared** (Core and products both change, or a Core change affects what products show):
   1. Build Core: `npm run build`.
   2. Copy it into the products: `node scripts/sync-products.cjs` (or name products: `node scripts/sync-products.cjs Dropper WARD`). This rewrites each product's `vendor/exp-core/`.
   3. Build each product and run its full suite.
   4. Choose relevant integration or coexistence checks for the shared change.
   5. For anything visible, check it in a real page as well as in the fixtures.

Tests drive real pages through Playwright. Two things catch out live checks:

- Some sites send a Content-Security-Policy that blocks injected scripts. Create the browser context with `bypassCSP: true`.
- Headless Chromium hides scrollbars, but a page with `scrollbar-gutter: stable` still reserves the space. Test corner placement with a visible scrollbar fixture rather than relying on headless screenshots.

## Writing in the repositories

- **Changelogs.** Each release gets one `## <version> — <YYYY-MM-DD>` heading with 2 to 4 bullets. Quiet releases add ` (quiet)` to the heading. Write bullets for the person using the product: what changed for them, in plain words. Release checks compare the newest bullets with the in-app release notes.
- **READMEs.** Describe the current menus by their real tab names, and keep screenshots current. Describe Dropper by what it shows (progress, eligibility, campaigns, inventory, games), not as something that acts on the user's behalf.
- **Comments.** Explain why, not what. Keep the existing density of the file you are editing.
- **Authorship.** All ExtraPotions work is authored by expDARE. Commits carry no co-author or tool trailers.

## Screenshots

README screenshots are generated from the current builds. Build the product first.

| Picture | Command (from exp-core) | Config |
|---|---|---|
| Product menus | `node scripts/capture-screenshots.cjs <Product>` (several names allowed) | `<Product>/docs/screenshots.config.cjs` |
| Shared launcher | `node scripts/capture-launcher-screenshot.cjs` | inside the script |

Products can also run `npm run screenshots`. Each product's tests fix the number and names of its README screenshots, so add or rename a picture in the config, the README and the test together. Route names in a config must match current tabs (for example PRISMA's appearance picture uses `section: 'Look', tab: 'Style'`).

## Shipping

Publish only on the user's explicit request. Commit and push requests are separate from release authorization; commit messages and tag pushes never start publication.

1. Prepare the version and release notes, build the intended assets, and run relevant manual checks. Existing release preparation scripts are optional helpers.
2. When authorized, commit and push the intended source and built assets. GitHub workflows use the committed files, not uncommitted local builds.
3. When publication is authorized, run this repository's Publish release workflow manually on the intended commit. It derives `v<version>` from package.json and uploads the committed bundle, manifest or launcher asset, and SHA256SUMS, with notes from CHANGELOG.md. An existing version tag must point to that commit. Existing releases are not overwritten.
4. Download the published assets and compare their SHA256 with the intended local files.

Manual tests (`verify.yml`) is independent of Publish release (`release.yml`). There are no required test jobs, consumer gates, published Core-pin waits, scheduled syncs, automatic commits or downstream releases. Core and products are released individually when requested. For a shared change, synchronize the intended products locally and build them; choose integration checks according to the change.

These definitions take effect on GitHub only after a separately authorized push. Repository-side protection settings are managed separately.

## Adding a product

A new product touches Core in several places. Work through all of them in one Core change:

- [ ] `src/suite-contract.json`: role, priorities, capabilities, state, menu sections, `repository`, `rootId`.
- [ ] `src/runtime.js` `SITE_SLOTS`, if the product's site has a better place for the launcher than the corner.
- [ ] `src/launcher-flyout.js`: add the id to `SUITE_ORDER`, and to `SITE_PRODUCTS` if it only runs on its own sites.
- [ ] `src/runtime.js`: `FLYOUT_ACCENTS` and `FLYOUT_NAMES`.
- [ ] `src/lean-menu.js`: the product accent.
- [ ] `src/product-tools.js`: `productRepositories`.
- [ ] `scripts/check-suite-coexistence.cjs`: the injection orders and the expected order.
- [ ] `scripts/check-product-menus.cjs` and `scripts/check-annotations.cjs`: the product's host, launcher and test page.
- [ ] `scripts/suite-local.cjs` and `scripts/capture-launcher-screenshot.cjs`: the product list.
- [ ] Core tests that list every product (search `src/`, `scripts/` and `tests/` for `ward`; a plain `ward` search also matches words such as "forward").

The product repository needs:

- [ ] `package.json` with `build`, `build:check` or `release:check`, `test`, `screenshots`, `prepare:release:feature`, `test:installed-browser`, and `engines.node >=24`.
- [ ] `vendor/exp-core/` filled by `node scripts/sync-products.cjs <Product>` from exp-core.
- [ ] Copies of the shared scripts the other products carry: `sync-exp-core.cjs`, `verify-exp-core-pin.cjs`, `prepare-feature-release.cjs`, `use-installed-browser.cjs`, `test-installed-browser.cjs`.
- [ ] `.github/workflows/`: manual `verify.yml` and independent manual `release.yml`.
- [ ] `docs/screenshots.config.cjs`, the README screenshots, and a test that fixes their names.
- [ ] `README.md`, `CHANGELOG.md`, `LICENSE-CODE.md`, `LICENSE-ASSETS.md`, `NOTICE.md`, `docs/development.md`.
- [ ] Badge and launcher artwork in `assets/`.

For a new product, choose integration and coexistence checks that exercise it beside the existing products. `npm run suite:local` remains available as an optional broader check.

Thread's modern-Reddit lane is `node scripts/check-thread.cjs`. It exercises its menu, local annotations, four content views, lifecycle and forced five-product coexistence on authored fixtures. The established four-product menu/annotation/coexistence tools invoke this lane separately, because their own fixture sites differ. `node ../THREAD/tests/browser.cjs --captures` creates Thread's local README and theme-comparison captures only after its checks pass. This is synthetic evidence; Reddit network-security blocks prevented live DOM verification. Do not interpret the provisional contract repository field as an existing public repository, or run a release against it.

The Reddit slot is active only with Thread registered. It uses native rail/collapse geometry, opens menus adjacent to the left-rail gem, and keeps a top-left fallback on missing/collapsed rails. It creates no second launcher or replacement native control. Twitch and unrelated sites retain their existing slots/corner behavior. Focused coverage is `tests/reddit-site-slot.test.cjs` beside the existing Twitch slot tests; changes to this shared geometry require deliberate consumer synchronization.

## Workspace status

From the workspace root, `pwsh -NoProfile -File .release-tools/Status-ExtraPotions.ps1` reads ownership, repository state and release information without modifying files. Network failures are unavailable results.

