<p align="center">
  <img src="assets/exp-core-launcher.svg" width="128" height="128" alt="exp-core icon">
</p>

<h1 align="center">exp-core</h1>

<p align="center"><strong>Shared ExtraPotions Foundation</strong></p>

<p align="center">
  The shared foundation for ExtraPotions appearance, menus, launcher coordination, and privacy-conscious diagnostics.
</p>

<p align="center">
  <img alt="Shared Component" src="https://img.shields.io/badge/Distribution-Shared%20Component-334155?style=flat-square">
  <img alt="Version 3.3.6" src="https://img.shields.io/badge/version-3.3.6-22C55E?style=flat-square">
  <img alt="JavaScript" src="https://img.shields.io/badge/Language-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=000000">
  <img alt="Public Repository" src="https://img.shields.io/badge/Repository-Public-22C55E?style=flat-square">
  <img alt="PolyForm Noncommercial 1.0.0" src="https://img.shields.io/badge/Code-PolyForm%20NC%201.0.0-6B7280?style=flat-square">
  <img alt="CC BY-NC-SA 4.0" src="https://img.shields.io/badge/Assets-CC%20BY--NC--SA%204.0-1769AA?style=flat-square">
</p>

## Purpose

ExtraPotions Core supports the shared appearance, menus, diagnostics, and launcher behavior used by ExtraPotions products. The 3.3.6 contract is rebuilt from the approved Dropper 3.3.4 release baseline. It is not an end-user userscript; install the finished product userscripts instead.

## 3.3.6

Adds Firefox-safe JSON settings copies and stops idle menu normalization from repeatedly mutating its own chevrons. Refreshes the pinned shared UI reference to Dropper 3.3.4. Twitch progress verification remains product-specific.

## What exp-core Does

- Provides shared menu chrome, theme tokens, launcher placement, update notices, and diagnostics.
- Maintains the locked eight-slot palette and coordinated multi-product launcher contract.
- Keeps shared controls and visual behavior consistent across the product suite.
- Supports Page, Technical, Console, and Plugin diagnostics.
- Helps installed ExtraPotions products recognize visible peers and conflicts on the current page.
- Remains bundled inside each finished product, with no separate installation required.

## License

**Code:** [PolyForm Noncommercial License 1.0.0](LICENSE-CODE.md)<br>
**Artwork and documentation:** [CC BY-NC-SA 4.0](LICENSE-ASSETS.md)

See [NOTICE.md](NOTICE.md) for the split-license notice.

## Disclaimer

ExtraPotions Core is a shared component for independent ExtraPotions products and is not an end-user browser extension or userscript.

## Text gradient rendering

`applyTextGradient(element, backgroundImage)` applies important inline background and text-clip properties together. Callers provide the CSS image and own foreground colors, accessibility modes, and cleanup. PRISMA 3.1.0 uses this helper to prevent invisible highlights when a host dark-mode rule overrides backgrounds. Identity data and animation choices remain product-specific.

## Settings copies in userscript sandboxes

`cloneSettings(value)` copies persisted JSON settings within the userscript realm. Use it for settings snapshots and editable drafts instead of native `structuredClone`, which can return page-realm Xray wrappers in Firefox userscript managers. This helper accepts the JSON settings schema, not DOM nodes, functions, circular graphs, or other non-JSON runtime objects.

## Shared menu and support controls

Opening a product menu closes other open product menus without stealing focus. Core supplies the default ExtraPotions Ko-fi support control, including custom headers.

## Local development changes (unreleased)

Adds shared, local settings journals (up to five snapshots), backup/restore controls, and a current-page compatibility overview. The overview reports visible product/core versions and warns about duplicate instances or mixed core versions. Dropper reuses the standalone tools while retaining its native UI.

These changes are prepared locally. The stable installation links above still serve the published release.
