# ExtraPotions suite improvements

Date: 2026-10-03

Author: expDARE

## Outcome and scope

Make Dropper, WARD, SHIFT, and PRISMA easier to understand, recover, and use together. Extend existing exp-core diagnostics, coordination, menu controls, and browser tests. Preserve product preferences, current launcher artwork, and existing product behavior unless a change below explicitly requires otherwise.

The approved feature scope is the five shared improvements proposed in chat: System health, controlled recovery, menu sizing, combined-product verification, and evidence-based cleanup. The product-specific candidates are included as follow-on work within this effort: Dropper's progress timeline, WARD's coverage information, SHIFT's Amazon fixtures, and PRISMA's live style preview.

Implementation remains local through review and verification. Publishing these new changes requires a fresh release instruction. Dropper 3.4.4 remains the published baseline.

## Approach

Use shared exp-core components for health presentation and menu sizing. Each product supplies facts and safe recovery actions from its own engine. Extend the existing coexistence and menu-layout tests rather than building another testing system.

Alternative approaches considered:

1. Separate implementations in every product would be quicker to start but repeat status rules and increase visual drift.
2. A new suite dashboard would add another navigation surface and duplicate System.
3. Extending shared components keeps one presentation contract while preserving product-specific facts and actions. This is the selected approach.

## Existing foundation

- exp-core/src/diagnostic-report.js captures and redacts local diagnostics and supplies Show Diagnostics and Copy Diagnostics controls.
- exp-core/src/product-tools.js supplies site-pause and compatibility controls.
- exp-core/src/runtime.js supplies shared menu, launcher, notice, palette, and coordination behavior.
- exp-core/src/foundation.js supplies shared typography and visual controls.
- exp-core/scripts/check-suite-coexistence.cjs already loads all four real products together.
- exp-core/tests/suite-menu-layout.test.cjs checks expanded product sections and long status text.
- WARD already quarantines unsafe coupon attempts; preserve and expose this safeguard.
- SHIFT already provides engine and adapter health; PRISMA already provides lifecycle and processing snapshots.
- Dropper already has stream verification, request backoff, claim confirmation, and recovery rules. Extend them rather than replacing them.

## 1. System health

Place one compact health card at the beginning of each System menu, above the diagnostic actions. System remains the final top-level menu. The card uses the established theme and rounded rectangular geometry.

Every card presents one of four states:

| State | Meaning |
| --- | --- |
| Working | The product is enabled and its relevant page functions are operating. This does not promise a match, reward, or successful action. |
| Waiting | No work is currently available, the site is unsupported, required evidence has not arrived, or a bounded retry is pending. |
| Paused | The user has paused the product, enabled Safe Mode, or paused the suite on this site. |
| Needs attention | A relevant feature is blocked or degraded and the user may need to act. |

The summary includes a concise reason, when that reason was last checked, and an appropriate action only when one exists. Pausing has precedence over transient waiting states. An unresolved feature failure must not be reported as Working. Site-owned console or advertisement errors alone do not change product health.

The shared component accepts plain state information and product-owned action callbacks. It must not guess health from arbitrary diagnostic strings or invoke page actions based on shared DOM messages. Invalid or unavailable health data produces Waiting with an explanatory message.

Product mappings:

- Dropper distinguishes campaign verification, Twitch-credited progress, unavailable session data, protected viewing, and recovery cooldowns. Campaign support never implies credited minutes.
- WARD distinguishes unsupported coverage, active protection, no handled content, adapter degradation, and coupon quarantine. Unsupported pages are Waiting, not broken.
- SHIFT distinguishes Original, active transformations, user pause/Safe Mode, and engine/adapter degradation. Original is a valid choice, not a failure.
- PRISMA distinguishes enabled scanning, no matches, inactive sites, user pause/Safe Mode, and processing failures. Zero matches is not a failure.

Page, Technical, Console, and Plugin diagnostics remain available beneath the summary. Health refreshes on menu opening and relevant local state changes. No new perpetual polling loop is needed.

## 2. Controlled recovery

Audit current failure paths before adding new limits. Preserve existing limits that already meet the contract and test their behavior.

Track failures per feature and current route/account where applicable. A failed optional feature must not disable unrelated functions or remove launchers and System recovery controls.

Where no effective bounded recovery exists, three consecutive failures of the same feature within two minutes suspend that feature until Retry or a new route/context. Successful completion resets the consecutive-failure count. Expected absence, unsupported pages, and zero matches are not failures.

Retry schedules one attempt and disables its control while pending. It does not clear preferences or retry a reward claim that is still awaiting confirmation. A deliberate pause is never automatically lifted by a retry timer.

Dropper adds a navigation-loop safeguard: at most three recovery-driven navigations within five minutes, then suspend automatic recovery with a clear reason and Resume control. Count reloads and recovery-driven stream changes; exclude user navigation. Preserve protected channels, deliberate playback pauses, campaign verification, account scope, and existing duplicate-claim protection. Stable credited progress clears loop pressure only after evidence is received.

WARD preserves coupon quarantine, including unexpected-navigation protection. PRISMA and SHIFT stop repeating failing processing passes until the relevant feature is retried or its context changes. Processing errors must be observable in diagnostics without storing page text or secrets.

## 3. Shared menu sizing

Add Menu size to each product's existing menu preferences with Standard, Large, and Extra Large choices. This affects ExtraPotions controls, supporting text, notices, and popovers; it does not change site content or launcher artwork.

| Choice | Body text | Supporting text | Desired menu width |
| --- | --- | --- | --- |
| Standard | 13px | 11px | 260px |
| Large | 15px | 13px | 300px |
| Extra Large | 17px | 15px | 340px |

Widths are always clamped to the available viewport with safe margins. Short viewports use internal vertical scrolling. Avoid fixed heights that clip enlarged text or controls. Preserve focused controls during live preference changes and rerendering.

Persist the preference locally through the shared settings mechanism and notify active peers on the same origin. Userscript isolation and page storage mean this does not claim automatic synchronization across unrelated websites. Missing or invalid values fall back to Standard. Existing exports and product settings remain compatible.

All toggle controls remain switches. No checkboxes or pill controls. Keyboard navigation, visible focus, reduced-motion behavior, and the existing theme are preserved. Test browser zoom up to 200% separately from the menu-size setting.

## 4. Combined-product verification

Extend the existing suite tests to cover all four built products, rather than mocked launcher shells only. Product coexistence fixtures may inject products on a common test page to exercise coordination independently of their production match rules.

Required scenarios:

- Multiple injection orders converge on the same launcher grid and every launcher remains clickable.
- Opening menus and notices from different products preserves accessible controls and viewport containment.
- Multiple update notices stack without covering each other's actions; existing once-per-change behavior remains enforced.
- System stays last and diagnostic functions remain inside it.
- Long health reasons, all three menu sizes, short viewports, and enlarged text remain usable.
- Route changes remove obsolete work and avoid duplicate observers/listeners.
- SHIFT preserves PRISMA highlight colors and owned ExtraPotions UI; WARD does not hide owned product controls.
- Pausing and resuming the suite does not lose settings or discard pending reward confirmation.

Run the existing local suite rebuild, product regression suites, Core pin checks, and build checks against the final candidate. Add release gates only where the repository's current workflow lacks the required coverage.

## 5. Cleanup audit

For each product, map visible menu controls to their event handlers, persisted settings, and actual engine effects. Check alternate names, migrations, and settings imports before identifying code as unused.

Remove a legacy path only with evidence that no current UI, import migration, runtime call, or supported test depends on it. Do not delete historical changelog entries simply because they mention earlier behavior. Document any retained compatibility path in the audit report rather than exposing implementation details in user-facing menus or READMEs.

Check source, distributed metadata, and current UI for obsolete product naming, bordered artwork references, duplicated diagnostic controls, ineffective style settings, and menu geometry overrides. Keep user-facing README updates focused on resulting behavior.

## Product-specific follow-on work

### Dropper progress timeline

Add an expandable recent-progress timeline in System with at most 30 entries scoped to the current account/session. Include Twitch-credited progress changes, verification outcomes, recovery pauses, and the reason for automatic stream changes. Do not record auth data or page text. Avoid repeating unchanged states. Clearly label the last credited update separately from the last data check.

### WARD retailer coverage

In each retailer module, distinguish categories with supported detection from conservative or unsupported coverage. Derive coverage labels from adapter capabilities. Target and Best Buy must not imply comprehensive coverage. Reuse the existing local protection review and missed-content reporting rather than adding a second report mechanism.

### SHIFT Amazon fixtures

Add sanitized fixtures for Amazon search, product detail, cart, and orders. Verify readable text/control contrast, preserved images, essential purchasing controls, and owned-product surfaces under representative light and dark themes. Strip account details, order information, tracking URLs, and executable third-party scripts from fixtures. Use existing supplied saved pages when suitable; do not assume a missing page is available.

### PRISMA style preview

Add a compact preview in the existing highlight appearance controls using fixed sample language on light and dark backgrounds. Reuse the real highlight renderer for underline, soft fill, gradients, and animation so the preview cannot diverge from actual behavior. Respect reduced motion and individual identity settings. Preview changes do not scan or modify page content.

## Acceptance and delivery

- Four products share the health presentation and sizing contract.
- Relevant failures lead to bounded, explainable recovery without harming unrelated functions.
- All menu controls have verified effects; removals have documented evidence.
- Product-specific follow-on improvements meet the contracts above.
- Browser verification covers geometry, interaction, and combined-product behavior; unit tests cover state precedence, failure limits, invalid settings, and privacy constraints.
- Build and source artifacts agree; bundled Core bytes match the chosen Core pin.
- Product READMEs describe user behavior, and changelogs match actual changes.
- ExtraPotions changes and commits are authored solely by expDARE.
- Final delivery provides local file paths, repository and install links, SHA256 values, README commits, and userscript commits. It distinguishes local verification from remote publication.

## Boundaries

This effort does not rewrite repository history, remove repositories, alter licenses, add cloud synchronization, upload diagnostics, or change userscript-manager installation inventory limitations. No live-site account actions or release publication are required to review the local implementation.
