# exp-core 3.3.2

- Rebuilds the canonical shared UI reference from the approved Dropper 3.3.2 release artifact.
- Pins Dropper v3.3.2 by release commit and SHA256, with a network fallback when a sibling Dropper checkout is unavailable.
- Adopts the current launcher, menu badge, menu-width notice, Badge Only menu-content width, theme, support-control, and diagnostics chrome.
- Exposes one canonical Full / Compact / Narrow width helper for product menus and update notices.
- Adds a standalone verification workflow so Core can validate extraction, generated artifacts, and browser regressions on its own.
