## 3.4.0-dev.14 — 2026-09-28

- Marks shared suite events and retained suite state as `shared-dom-advisory` coordination data, not an authorization boundary.
- Adds Core-owned suite-state subscriptions that deliver the latest retained state immediately and then meaningful updates.
- Lets later-loaded products consume current peer state without waiting for another product transition.
- Keeps privileged site actions outside the shared DOM state/event trust model.
- Merges suite interoperability health into the existing product compatibility report while preserving legacy duplicate, protocol, and launcher checks.

## 3.4.0-dev.13 — 2026-09-28

- Defines Core-owned compact state schemas for Dropper, SHIFT, WARD, and PRISMA.
- Rejects unknown state fields, missing required fields, invalid counts, invalid percentages, and non-token status values before publication.
- Keeps product state contracts queryable through the existing Core suite contract.
- Prevents future shared-state drift from accidentally exposing identifiers or product-private payloads.

## 3.4.0-dev.12 — 2026-09-28

- Adds latest compact product state to Core suite health and diagnostics.
- Reports state type, timestamp, and age alongside capability/presentation health for each observed product.
- Includes the shared safe-state registry in exported interoperability diagnostics.
- Keeps diagnostic state limited to the non-identifying payloads published through Core.

## 3.4.0-dev.11 — 2026-09-28

- Persists the latest compact suite-state snapshot in the shared Core coordinator so later-loaded products can query current state.
- Adds product-filtered suite-state snapshots and latest-state lookup across separately bundled userscript realms.
- Caps persisted state payloads at 4096 bytes and marks coordinator state as ExtraPotions-owned.
- Keeps the persisted state registry limited to the non-identifying JSON payloads published through Core.

## 3.4.0-dev.10 — 2026-09-28

- Makes Core-owned suite and presentation registration idempotent across repeated product bootstrap calls.
- Emits interoperability registration events only when observed product metadata actually changes.
- Preserves metadata refresh when product version, Core version, role, priority, capabilities, or presentation phases change.
- Avoids duplicate suite events when products re-register diagnostics after their launcher host becomes available.

## 3.4.0-dev.9 — 2026-09-28

- Adds a Core-owned deduplicated suite-state publisher for product interoperability.
- Canonicalizes state payload key order before comparison so semantically identical snapshots do not re-emit.
- Keeps state events JSON-only and product-neutral, allowing consumers to expose compact status without passing live objects or page text.
- Prepares Dropper, SHIFT, WARD, and PRISMA to publish interoperable runtime state through one shared channel.

## 3.4.0-dev.8 — 2026-09-28

- Makes product diagnostics registration the single bootstrap point for Core-owned interoperability metadata.
- Automatically registers each known product's suite role/capabilities and presentation phases from the Core contract.
- Removes the need for products to repeat suite and presentation registration blocks.
- Keeps Dropper out of the general page-presentation pipeline while retaining its flagship suite role.

## 3.4.0-dev.7 — 2026-09-28

- Enforces Core presentation phases during shared DOM scheduler execution instead of treating phase order as metadata only.
- Batches changed roots per phase and uses synchronous phase barriers so WARD classification/visibility completes before PRISMA annotation on the same mutations.
- Keeps existing dedicated observers for attribute-sensitive consumers and preserves the public per-root observer API.
- Infers scheduler phase from the Core-owned product contract while allowing explicit phase overrides.

## 3.4.0-dev.6 — 2026-09-28

- Makes Core the single source of truth for product role, suite priority, capabilities, and presentation phases.
- Adds a public suite-contract lookup for interoperable products and diagnostics.
- Lets products register by ID/version only instead of duplicating Core-owned interoperability metadata.
- Keeps product-specific lifecycle capabilities and engine behavior in each product.

## 3.4.0-dev.5 — 2026-09-28

- Adds suite interoperability state to Core diagnostics.
- Diagnostics now include observed suite products and capabilities, presentation-provider order and phases, and shared page-observer owner/protocol/epoch.
- Keeps interoperability diagnostics metadata-only and excludes page text or product-private content.

## 3.4.0-dev.4 — 2026-09-28

- Preserves mutation roots and mutation types in the shared page-observer broadcaster.
- Routes Core DOM schedulers through the shared observer when attribute observation is not required.
- Lets WARD and PRISMA share one page MutationObserver while retaining their existing root batching and character-data behavior.
- Keeps attribute-observing schedulers on the dedicated compatibility path.

## 3.4.0-dev.3 — 2026-09-28

- Adds ancestor-aware presentation-state lookup and a shared cross-product visibility check.
- Allows SHIFT and PRISMA to honor WARD hide/collapse state without importing WARD internals.
- Keeps dimmed content available for downstream presentation and annotation.

## 3.4.0-dev.2 — 2026-09-28

- Adds a deterministic presentation pipeline: observe, classify, visibility, theme, annotate, then product UI.
- Adds cross-product presentation-provider discovery and lightweight semantic state on shared DOM elements.
- Adds a single page-level mutation broadcaster so multiple ExtraPotions products can react to DOM changes without each requiring its own page MutationObserver.
- Keeps presentation and observer APIs additive; product engines remain unchanged until they opt into the new contracts.

## 3.4.0-dev.1 — 2026-09-28

- Starts the ExtraPotions interoperability layer without changing product engines.
- Adds a cross-sandbox suite registry and capability discovery for Dropper, SHIFT, WARD, and PRISMA.
- Adds a serialized suite event channel and shared page-context helper for future product coordination.
- Records the product-line priority as Dropper (flagship), SHIFT, WARD, then PRISMA while leaving user launcher arrangement unchanged.
- Existing diagnostics registration now also publishes each running product into the suite registry.

## 3.3.17 — 2026-09-28

- Preserves a Core-owned submenu after the user opens it during a menu arrangement refresh.
- Prevents shared layout normalization from immediately re-collapsing navigation targets such as SHIFT site/profile controls.
- Adds regression coverage for user-opened submenu persistence while keeping initial submenu state collapsed.

## 3.3.16 — 2026-09-28

- Adds Core-owned Main, Appearance, Advanced, and System menu category primitives.
- Classifies current SHIFT, PRISMA, WARD, and Dropper sections centrally without moving product-specific controls into Core.
- Keeps existing menu order and hidden-section storage keys compatible while grouping the arrangement editor by shared category.
- Makes Core-created submenus collapsed by default and tags them for shared menu behavior.
- Adds full, compact, and narrow width regression coverage for shared menu arrangement and nested disclosures.

## 3.3.15 — 2026-09-28

- Lets Core-owned product services resolve the consumer version lazily during bootstrap.
- Preserves version-scoped update caching once the product version becomes available.
- Prevents the Core-services migration from aborting consumers that define their version after shared bootstrap.
- Uses package.json as the single Core version source when generating the runtime bundle.

## 3.3.14 — 2026-09-28

- Adds a Core-owned product-services factory for lifecycle, diagnostics, and release-update plumbing.
- Prepares SHIFT, PRISMA, and WARD to remove duplicate diagnostics and update wrapper modules on the next Core rollout.
- Keeps product engines and product-specific error handling declarative in each consumer.

## 3.3.13 — 2026-09-27

- Makes exp-core the canonical owner of shared ExtraPotions UI and runtime infrastructure, with Core-native provenance and public shared-service APIs.
- Removes the legacy Dropper-to-Core extraction and synchronization paths, and treats Dropper as a downstream Core consumer like SHIFT, PRISMA, and WARD.
- Requires every consumer to pin and byte-verify a published exp-core artifact, with ownership tests preventing product-local reimplementation of shared infrastructure.
- Centralizes Core-driven consumer rollout in exp-core so a released Core change is synchronized, rebuilt, tested, patch-versioned, and published by each consumer automatically.

## 3.3.12 — 2026-09-27

- Adds the shared themed outer menu border across ExtraPotions products.
- Keeps palette-specific border treatment inside the shared Core instead of duplicating product CSS.
- Adds regression coverage for the themed menu shell border.

## 3.3.11 — 2026-09-27

- Lets every launcher move left, right, up, or down within the shared grid.
- Persists launcher order and supports Alt+Arrow keyboard reordering.

## 3.3.10 — 2026-09-27

- Adds distinct raised and inset surfaces so menus retain visible depth across every palette.
- Derives accessible link, focus, and accent-text colors without changing established theme identities.
- Preserves compatible seven-token palettes while publishing the expanded semantic palette contract.

## 3.3.9 — 2026-09-26

- Compacts System menus and keeps menu width controls together on one row.
- Groups existing menu preferences consistently while preserving saved settings.
- Removes automatic Settings Backup and its restore controls.
- Adds a Bitcoin donation option with address copying and wallet support.

## 3.3.8 — 2026-09-26

- Adds section rearranging and visibility controls under System while preserving shared recovery tools.
- Keeps menus and long controls inside the available viewport.
- Refreshes the product guide with a horizontal screenshot gallery and linked license badges.

## 3.3.7 — 2026-09-26

- Adds bounded local settings journals and shared backup/restore controls.
- Shows current-page product versions and warns about duplicate instances or mixed core versions.
- Updates the verified Dropper UI reference to 3.3.5.

## 3.3.6 — 2026-09-26

- Coordinates launcher menus across independent product bundles without passing cross-realm objects.
- Provides the default ExtraPotions donation control, including custom product headers.
- Pins the shared UI reference to Dropper 3.3.4.

## 3.3.5 — 2026-09-26

- Adds realm-local JSON settings copies for Firefox userscript sandboxes.
- Avoids repeated chevron mutations while menus are idle.
- Pins shared UI extraction to the Dropper 3.3.3 release. Twitch earning logic stays in Dropper.

## 3.3.4 — 2026-09-26

- Adds a product-neutral text-gradient helper that protects gradient backgrounds and text clipping from host-page background overrides.
- Keeps foreground colors, motion, forced-colors behavior, and cleanup under product control.
- Integrates the helper into PRISMA 3.1.0 while preserving the pinned Dropper reference.

## 3.3.3 — 2026-09-26

- Isolates non-modal launcher backdrops from site dialog styling, preventing full-page covers while preserving real modal backdrops.
- Cleans up backdrop protection when a launcher is unregistered and covers constructable stylesheet and fallback paths with regression tests.
- Preserves the pinned Dropper 3.3.2 reference and generates the bundle manifest version from the package version.
