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
