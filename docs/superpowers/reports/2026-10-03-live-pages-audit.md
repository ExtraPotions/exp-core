# Live candidate audit

Publication remains held. No remote writes were performed.

Installed candidates observed: Core 3.6.0, Dropper 3.4.5, WARD 3.4.3, SHIFT 3.5.3, PRISMA 3.2.3.

## Observed on live pages

- Amazon home, UPS search, GOLDENMATE product, cart and orders: SHIFT dark themes preserve product images, with readable sampled headings and enabled shopping controls. WARD dimmed recognized placements at opacity 0.58. No cart, order or checkout actions were taken.
- Wikipedia: PRISMA Underline produces text decoration and gradient; Soft Fill produces a translucent fill; Animation produces the pulse on real matches. Preview samples remain separate from page match counts.
- Twitch: Dropper defers to an existing managing tab. Credited progress and live chat-bonus collection were not verified. System health remains at its generic fallback after a fresh page load; complete-runtime local health tests pass. Cause remains unresolved; no speculative Dropper production patch.
- eBay, Etsy, Walmart, Target and Best Buy: WARD mounts on live pages. This establishes mounting only, not comprehensive promotion coverage or transaction safety.

## WARD repair

Live Amazon sponsored search products use `.s-result-item.AdHolder` rather than the earlier sponsored component marker. Sponsored brand units use `.sb-desktop` within a search result. These complete units were untouched by the installed candidate.

Added detection and complete-unit normalization for these markers. A reduced fixture uses only structural markers and sample labels, without account data or tracking URLs. Regression failed before the patch; it now verifies Hide, Dim, organic-result preservation and restoration. Existing essential-overlap and protected-root safeguards remain in force.

WARD 122/122 and Dropper 305/305 tests pass. WARD build equality and both repository whitespace checks pass. Other products were not rebuilt or changed by this repair.

The updated WARD bytes require a userscript-manager reinstall and a live Amazon retest. Access to extension pages is blocked by browser control policy; no workaround was attempted. Dropper should also be reinstalled from the exact candidate bytes before further diagnosis to eliminate installed-copy uncertainty. All candidates remain unpublished.

SHIFT restored to Original. PRISMA restored to Gradient and Animation off. No transaction or account preferences were changed.

Evidence is local under `local-verification/live-2026-10-03`; public PRISMA preview screenshot and aggregate observations are available there. Account page contents are excluded from this report.
