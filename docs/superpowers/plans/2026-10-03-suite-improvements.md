# ExtraPotions Suite Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution or superpowers:subagent-driven-development if delegated execution is selected. Steps use checkbox syntax for tracking.

**Goal:** Deliver shared health, bounded recovery, readable menu sizes, combined-product verification, evidence-based cleanup, and the four product additions approved in the design.

**Architecture:** Add focused shared modules to exp-core and expose their helpers through its existing runtime. Products retain ownership of health facts, engine operations, and recovery actions. Extend existing browser fixtures and release checks; keep generated consumers synchronized with one canonical Core bundle.

**Tech Stack:** JavaScript userscripts, DOM/CSS, Node.js test runner, Playwright with installed Chrome or Edge, existing build and release scripts.

**Spec:** [Approved design](../specs/2026-10-03-suite-improvements-design.md).

All product paths below are relative to the ExtraPotions workspace. Core paths begin with `exp-core/`. Before each commit, confirm author and committer are expDARE and stage only the intended files.

## Global Constraints

- Author solely expDARE; no other contributor or author attribution.
- System remains the final top-level menu; all diagnostic functions remain there.
- Toggle switches only; rounded rectangular controls; preserve established styling.
- Standard = 13px body, 11px supporting text, 260px desired menu width.
- Large = 15px body, 13px supporting text, 300px desired menu width.
- Extra Large = 17px body, 15px supporting text, 340px desired menu width.
- Three consecutive failures within two minutes suspend only the affected feature where existing effective protection is absent.
- Dropper permits at most three recovery-driven navigations within five minutes; deliberate user navigation is excluded.
- Dropper timeline holds at most 30 account/session-scoped entries.
- Preserve settings imports, migrations, pause intentions, pending claim confirmation, essential page controls, images, and privacy redaction.
- No new product dependencies, cloud services, repository deletion/history rewrite, or remote publication during implementation.
- READMEs describe user behavior. Technical audit reports belong in local-verification.

## Review Focus

1. Late asynchronous results after route/account changes must not restore old health, resume work, or update the wrong session (Tasks 1, 2, 5).
2. Deliberate pause during an in-flight retry must win over the retry result (Tasks 2, 4).
3. Storage unavailable, malformed preferences, or mixed product injection order must fall back safely and retain usable controls (Tasks 3, 9).
4. Unrelated page/advertisement errors and a zero-match page must not become product failures (Tasks 1, 6, 7).
5. Long localized status text at 200% zoom must remain usable without trapping focus or hiding actions (Tasks 3, 9).

## Task 1: Shared health summary

**Files:** Create `exp-core/src/health-summary.js`, `exp-core/tests/health-summary.test.cjs`; modify `exp-core/scripts/build.cjs`, `exp-core/src/runtime.js`, `exp-core/src/diagnostics.js`.

**Interfaces:** Export `normalizeHealth(value)` and `createHealthControls(getHealth, notify)` from `ExtraPotionsCore`. A snapshot has `{ state, reason, checkedAt, action? }`; state is one of `working`, `waiting`, `paused`, `attention`; action is `{ label, run }`, where `run()` may return a Promise. The controls return `{ element, refresh, dispose }`. Invalid input becomes Waiting with a clear unavailable-data reason. No arbitrary diagnostic-string classification.

- [ ] Write failing tests: assert invalid state becomes `waiting`; labels equal Working/Waiting/Paused/Needs attention; reason is text-only; an older refresh cannot overwrite a newer one; disposal invalidates pending results; action runs once while pending and reports rejection without an unhandled Promise.
- [ ] Run `node --test tests/health-summary.test.cjs` in exp-core; expect the missing API failure.
- [ ] Implement the focused module, add it before runtime in the bundle list, expose the two helpers, and use existing theme/typography variables. Refresh on menu opening or an explicit local state notification; no perpetual polling.
- [ ] Build Core and rerun the test; all assertions pass. Add a browser assertion for keyboard focus and plain-text rendering of a reason containing HTML.
- [ ] Commit the shared health module and its tests.

## Task 2: Feature-scoped recovery guard

**Files:** Create `exp-core/src/recovery-control.js`, `exp-core/tests/recovery-control.test.cjs`; modify `exp-core/scripts/build.cjs`, `exp-core/src/runtime.js`.

**Interfaces:** Export `createRecoveryGuard({ limit = 3, windowMs = 120000, now = Date.now })`. Return `{ failed(feature, context), succeeded(feature, context), snapshot(feature, context), retry(feature, context, run), clearContext(context), dispose() }`. Snapshots are plain `{ suspended, consecutiveFailures, retryPending, lastFailureAt }`; callbacks and raw exception messages are never persisted. Consumers decide which actual errors count.

- [ ] Write failing clock-controlled tests: first/second failure remain allowed, third suspends; success clears consecutive failures; failures outside two minutes do not combine; features/contexts are isolated; retry invokes one callback; duplicate retry is rejected while pending; clearContext/dispose invalidates late completion.
- [ ] Run the new test in exp-core; expect missing API failures.
- [ ] Implement the guard and expose it. Retry grants one attempt without changing settings or automatically lifting user pause. Preserve any stronger product-owned limits.
- [ ] Build and rerun tests; test deliberate-pause behavior in the product integration task rather than embedding product policy in Core.
- [ ] Commit the guard and its tests.

## Task 3: Shared menu sizing

**Files:** Create `exp-core/src/menu-preferences.js`, `exp-core/tests/menu-size.test.cjs`; modify `exp-core/scripts/build.cjs`, `exp-core/src/runtime.js`, `exp-core/src/foundation.js`, `exp-core/tests/typography-consumers.test.cjs`.

**Interfaces:** Export `menuSizePreference()`, `setMenuSizePreference(size)`, `bindMenuSize({ host, shadow, panel, onLayout })`, `createMenuSizeControls()`. Allowed values are `standard`, `large`, `extra-large`. Persist only the size in `exp:suite:menu-size`. Binding returns a cleanup function. A same-origin custom event carries only the validated preference; storage events support other tabs.

- [ ] Write failing tests asserting the exact font/width table in Global Constraints, invalid/unavailable storage fallback to Standard, immediate peer updates, and cleanup removing listeners.
- [ ] Run the new tests; expect missing helpers.
- [ ] Implement the module and integrate binding into the shared chrome creation path so Dropper and createProduct consumers both participate. Supply one select control in each existing menu-preference disclosure. Clamp widths; allow internal vertical scrolling; keep launcher artwork unchanged.
- [ ] Build and run unit/browser checks for all sizes, long supporting text, a 320px viewport, and 200% browser zoom. Verify focus remains on the select after a change and notices/popovers inherit matching typography.
- [ ] Commit menu-size changes and tests.

## Task 4: Four product health and recovery integrations

**Files:** Modify `Dropper/src/parts/07-markup-lists-and-appearance.js`, `Dropper/src/parts/01-claims-recovery-and-routing.js`, `WARD/src/ui.js`, `WARD/src/engine.js`, `PRISMA/src/ui.js`, `PRISMA/src/engine.js`, `SHIFT/src/ui.js`, `SHIFT/src/theme-controller.js`; create `Dropper/tests/system-health.test.cjs`, `WARD/tests-v3/system-health.test.cjs`, `PRISMA/tests/system-health.test.cjs`, `SHIFT/tests/system-health.test.cjs`.

**Interfaces:** Each product supplies a `systemHealthSnapshot()` following Task 1's snapshot shape. It wraps its existing engine API; recovery callbacks remain private to that product. Use Task 2 only for uncovered repetitive failure paths. Bind/dispose health controls with the existing menu/product lifecycle. Each System menu mounts health, then diagnostics, then existing tools.

- [ ] Write failing product tests: user pause overrides waiting; zero matches is not failure; unsupported WARD coverage is Waiting; SHIFT Original is valid; PRISMA processing failures are Attention; Dropper verified campaign without credited minutes remains distinguishable. Page-owned ad errors do not alter health.
- [ ] Run each new test against the baseline; expect missing health controls/mappings.
- [ ] Integrate shared controls and sizing, auditing existing recovery before adding guards. Retain WARD coupon quarantine and Dropper claim confirmation. Connect Retry to exactly one existing safe engine operation, not a page reload unless the current product recovery explicitly requires it.
- [ ] Run all four targeted suites; test pause during in-flight retry, late route results, and launchers/System remaining accessible while processing is suspended.
- [ ] Commit each product's integration independently and record which existing safeguards were retained in `local-verification/suite-recovery-audit.md`.

## Task 5: Dropper navigation-loop protection and timeline

**Files:** Modify `Dropper/src/parts/00-setup-and-state.js`, `01-claims-recovery-and-routing.js`, `02-guards-and-campaign-catalog.js`, `07-markup-lists-and-appearance.js`, `08-notices-updates-and-layout.js`; create `Dropper/tests/recovery-loop.test.cjs`, `Dropper/tests/progress-timeline.test.cjs`; extend `Dropper/tests/active-viewing-browser.test.cjs`.

**Interfaces:** Add private `recoveryNavigationAllowed(reason, context)` at the actual automatic navigation boundary and `recordProgressTimeline(type, details)`/`progressTimelineSnapshot()` for sanitized session entries. Persist only timestamps/reasons/credited minute counts and selected campaign/channel identifiers using existing account-scoped session storage. Expose plain summaries in diagnostics; UI under System.

- [ ] Write failing tests: three recovery navigations in five minutes allowed, fourth blocked; manual navigation excluded; account changes isolate counters; stale callbacks cannot navigate; existing protected-channel and deliberate-pause checks win; verified campaign alone does not clear pressure.
- [ ] Run new tests; reproduce the missing loop guard. Add timeline assertions for maximum 30 entries, unchanged-state deduplication, last credited update distinct from last data check, account/session isolation, and no auth/page-text fields.
- [ ] Guard automatic stream changes and reloads at their actual boundaries. Add Resume to System without clearing preferences or pending claims. Record existing progress/verification/navigation events rather than introducing another poller.
- [ ] Run focused and active-viewing browser tests, including late claim confirmation after recovery suspension and a later credited-progress update.
- [ ] Commit Dropper recovery and timeline.

## Task 6: WARD coverage information

**Files:** Modify `WARD/src/retailers.js`, `WARD/src/retailer-module.js`, `WARD/src/ui.js`; extend `WARD/tests-v3/new-retailer-modules.test.cjs`, `WARD/tests-v3/audit.test.cjs`.

**Interfaces:** Add `coverage()` to the retailer facade returning `{ retailer, supportedCategories, conservativeCategories, unsupportedCategories }` derived from adapter capabilities. Reuse existing Audit review/report controls.

- [ ] Write failing assertions for all six retailers; Target and Best Buy cannot claim comprehensive coverage, unsupported categories do not produce product failure, and no second missed-content reporting flow is introduced.
- [ ] Run the two existing test files; expect missing coverage summaries.
- [ ] Add concise category coverage explanations to retailer controls, preserve essential content safeguards, and reuse current review actions.
- [ ] Run targeted browser tests for category labels and protection review; verify no hidden purchasing controls or account values are included in reports.
- [ ] Commit coverage changes and tests.

## Task 7: PRISMA live style preview

**Files:** Modify `PRISMA/src/ui.js`, `PRISMA/src/renderer.js`; create `PRISMA/tests/style-preview.test.cjs`.

**Interfaces:** Add `EXP.Renderer.createPreview(settings, identity)` returning `{ element, refresh(settings, identity), dispose() }`. The preview uses the same style rules as real highlights but fixed sample text and no Engine scan calls.

- [ ] Write failing tests for underline, soft fill, gradient, and animation on light/dark preview panels; reduced motion suppresses animation; disabled identity is represented accurately; preview changes do not alter page text or match counts.
- [ ] Run the new test; expect missing preview behavior.
- [ ] Add the compact preview to existing appearance controls using shared renderer rules; avoid copying animation/color logic into UI.
- [ ] Run preview and existing renderer/engine tests; test cleanup and repeated settings changes without accumulating wrappers or listeners.
- [ ] Commit preview changes.

## Task 8: SHIFT Amazon coverage fixtures

**Files:** Create sanitized fixtures under `SHIFT/tests/fixtures/amazon/`, `SHIFT/tests/amazon-pages.test.cjs`; modify `SHIFT/src/site-fixes.js`, `SHIFT/src/theme-rules.js`, or `SHIFT/src/dynamic-engine.js` only when a fixture reproduces a failure.

**Interfaces:** Fixtures represent search, product detail, cart, and orders. Use static extracted markup; do not execute third-party saved-page scripts. Existing saved-page attachments may supply search/product/orders markup. Missing cart coverage uses a small explicit fixture, not a claim of a live capture.

- [ ] Build fixtures with account/order values, tracking URLs, and third-party executable scripts removed. Add assertions for text/control contrast, original image pixels/styles, essential controls, and ExtraPotions-owned UI under representative light/dark themes.
- [ ] Run the new browser test; record any actual failures before changing theme code.
- [ ] Fix only reproduced theme errors through existing site rules or engine behavior. If the baseline passes a scenario, retain the test without adding unnecessary code.
- [ ] Rerun fixtures and affected engine tests; verify PRISMA annotation colors remain intact in the combined-product task.
- [ ] Commit fixtures and any justified fixes.

## Task 9: Coexistence and accessibility release gates

**Files:** Modify `exp-core/scripts/check-suite-coexistence.cjs`, `exp-core/tests/suite-menu-layout.test.cjs`, `exp-core/tests/menu-coordination.test.cjs`, `exp-core/tests/update-version-regression.test.cjs`; extend existing workflows only where a required scenario is absent.

**Interfaces:** Reuse real built userscripts and the existing suite manifest. No new launcher mock or suite dashboard. Test helpers accept product root IDs and size/viewport parameters and return actionable geometry/interaction failures.

- [ ] Add failing/characterization cases for multiple injection orders, every launcher hit target, overlapping menus, stacked notice actions, once-per-change notices, route cleanup, and System last.
- [ ] Run the expanded tests against candidates; identify missing coverage separately from runtime failures.
- [ ] Add all three menu sizes, short viewports, 200% zoom, long reasons, keyboard focus, unavailable storage, mixed current/older consumers, suite pause during claims, and SHIFT/PRISMA/WARD owned-surface preservation.
- [ ] Run `npm run suite:local` in exp-core. Require no uncaught browser errors, inaccessible actions, or geometry failures. Fix implementation or fixture failures on their owning paths, not by weakening assertions.
- [ ] Commit combined-product tests and any required workflow gates.

## Task 10: Cleanup, synchronized candidates, and final review

**Files:** Audit all five repositories; update only evidenced unused/current paths. Update product `README.md`, `CHANGELOG.md`, metadata/version/release-note sources, generated userscripts, Core bundle/manifest, vendor pins, and existing rollout metadata using repository scripts. Save reports under workspace `local-verification/`.

**Interfaces:** Report columns: control/path, owner, persisted setting or caller, verified effect, migration dependency, outcome. A deletion requires no active UI/runtime/import dependency. Delivery fields: local path, repository, install URL, SHA256, README commit, userscript commit, verification evidence, publication state.

- [ ] Map every visible menu control to its handler/setting/effect, checking imports/migrations before flagging unused code. Record retained compatibility paths and reproduced ineffective controls; add regressions for meaningful failures.
- [ ] Remove only evidenced obsolete paths and current naming/artwork references. Preserve historical changelogs. Verify cleanup with affected regressions and build checks.
- [ ] Prepare one Core release candidate, synchronize its canonical bytes into the products, and bump each product once through its existing feature-release workflow. Update user-facing documentation for delivered behavior only; commit solely as expDARE.
- [ ] Run Core suite verification, all four full product regression suites, release checks where provided, Core pins, source/build equality, whitespace checks, and final hash calculation. Run a final review against every approved design acceptance item. Do not claim live Twitch credited progress or comprehensive retailer coverage based on fixtures.
- [ ] Deliver concrete local candidates with per-product metadata and reports. Request fresh publication approval; after approval use the existing release verification workflow, confirm remote commits/CI, and download/hash-check every release asset.

## Execution and review

Recommended execution is native in this chat: the shared interfaces precede their product integrations, and the final coexistence checks depend on all candidates. Delegated execution is available if explicitly selected. Each task remains independently reviewable and has its own regression cycle; final integration review checks the complete suite.

The plan and design are local documents. Implementation begins after the plan review required by the writing-plans workflow. Publication remains a separate user-authorized action.
