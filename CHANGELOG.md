## 3.3.4 — 2026-09-26

- Adds a product-neutral text-gradient helper that protects gradient backgrounds and text clipping from host-page background overrides.
- Keeps foreground colors, motion, forced-colors behavior, and cleanup under product control.
- Integrates the helper into PRISMA 3.1.0 while preserving the pinned Dropper reference.

## 3.3.3 — 2026-09-26

- Isolates non-modal launcher backdrops from site dialog styling, preventing full-page covers while preserving real modal backdrops.
- Cleans up backdrop protection when a launcher is unregistered and covers constructable stylesheet and fallback paths with regression tests.
- Preserves the pinned Dropper 3.3.2 reference and generates the bundle manifest version from the package version.
