## Unreleased

- Adds shared, local settings journals (up to five snapshots), backup/restore controls, and a current-page compatibility overview. The overview reports visible product/core versions and warns about duplicate instances or mixed core versions. Dropper reuses the standalone tools while retaining its native UI.

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
