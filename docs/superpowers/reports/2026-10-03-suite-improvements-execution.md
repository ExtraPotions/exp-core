# SDD ledger — plan: docs/superpowers/plans/2026-10-03-suite-improvements.md

Spec: docs/superpowers/specs/2026-10-03-suite-improvements-design.md
Execution: native, approved by user 2026-10-03.
Ruling: use dedicated branches in the five clean existing checkouts — the shared suite build expects sibling repositories; no unrelated local modifications exist. Published main refs remain unchanged.
Pre-flight: Tasks 1-3 produce the shared helpers consumed by Tasks 4-9; signatures and state enums agree.
Pre-flight: Task 10 owns final version changes and pins; interim Core builds retain the existing version only during local development.
Task 1: in progress.
Task 1: complete; Task 2: complete — shared controls, 4/4 targeted tests RED to GREEN, commit recorded in git. Task 3: in progress.
Task 3: shared sizing helpers complete; 5/5 shared tests pass. Remaining product preference controls and suite geometry verified in Tasks 4 and 9. Task 4: in progress.
Ruling: consolidate product health mapping tests in the Core consumer gate, with real-engine recovery browser tests in each product — avoids copied mapping assertions. Full suites still test consumers independently. Ruling: use small explicitly synthetic Amazon fixtures without account data; page fixture readiness checks host attachment, not its zero-size popover root.
Task 4: integrations implemented and verified in four state mapping tests plus real WARD/PRISMA/SHIFT failure and retry browser tests. Shared controller now binds sizing for custom shells as well as generic shells.
Task 5: recovery and timeline checks pass; a full regression found and corrected timeline recording placed in target selection instead of the actual credited-minute path. Existing claims and intentional viewing protections preserved. Final whole suite pending.
Task 6: coverage capability test and WARD 121/121 pass.
Task 7: actual preview styles and motion checks pass; PRISMA 83/83 pass. Page match selectors now explicitly exclude preview samples.
Task 8: four synthetic Amazon routes pass in dark and custom light themes. No theme production fix was justified. SHIFT 121/121 pass.
Task 9: real pointer clicks, System last, rendered label sizes and viewport bounds pass in two injection orders and all three sizes. Core targeted checks 12/12; complete suite gate pending.
Task 10: menu audit report created; unused PRISMA catalog local removed and inaccurate SHIFT updater help corrected. Compatibility keys and historical notes retained. Candidate docs and versions synchronized.
Ruling: prepare Core 3.6.0 because this adds shared public menu/health/recovery APIs; product scripts each prepare one patch candidate. Cost if wrong: version numbers can be changed before publication.
Ruling: commit each product integration and its candidate metadata together so the vendored Core and generated userscript stay reproducible. Cost if wrong: reverting one product feature requires a focused follow-up rather than reverting the whole candidate.
Ruling: emulate the CSS viewport available at 200% zoom; no claim of native browser zoom automation. Cost if wrong: browser-specific zoom quirks still require a live check.
Final review: no Critical findings; five Important findings and two Minor findings. Declined-to-judge list empty.
Final: navigation-side-effects regression RED to GREEN (blocked move leaves no flight, notification, mute, viewing intent, or general guard update).
Final: WARD coupon failure and disable precedence plus SHIFT effective Original/exclusion/adapter state mapping regressions RED to GREEN (6/6 consumer checks).
Final: production SHIFT adapter repeated failure regression RED to GREEN, bounded independently of generic live repair; site-pause cancellation preserves suspension (2/2).
Final: open System health transition browser regressions RED to GREEN for WARD, SHIFT and Dropper (3/3); no polling added.
Final: minor (deferred) — Dropper timeline currently omits stream-verified and stream-rejected events; verification-start and credited progress remain represented.
Final: minor (deferred) — Amazon fixture evidence measures selected text/button contrast and image-filter preservation, not every represented form control or owned surface. Narrow delivery claim accordingly.
Final: whole-suite verification after the fix pass is pending; no re-review will be dispatched.
Final: narrow 360px Extra Large coexistence case reproduced overlap with other grid rows. Shared menu placement now accounts for all horizontally intersecting launchers; viewport readiness replaces an arbitrary short delay. Extended gate RED to GREEN; existing placement + live health regressions 12/12 pass. Whole-suite rerun on rebuilt final bytes pending.
Final: rebuilt candidate verification complete: Core 184/184, Dropper 303/303, WARD 121/121, SHIFT 122/122, PRISMA 83/83; total 813 passing tests, zero failures. Fresh build, sync, duplicate and whitespace checks pass. Latest enhanced coexistence gate passes both injection orders, all menu sizes, 360px viewport and active SHIFT theme preserving PRISMA annotations.
Final: release pin verification remains pending publication of Core v3.6.0; its remote URL returns 404 while unpublished. Local vendors exactly match canonical Core SHA256. No remote operations performed.
Ruling costs clarification: existing clean checkouts require isolation if unrelated edits appear; central consumer coverage requires the full sibling suite; synthetic Amazon fixtures limit claims about live widgets.
Final: all planned work and final fix pass complete locally. Execution record preserved in the tracked reports directory before removing this plan's temporary workspace.
