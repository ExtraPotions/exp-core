# Page cost on component-heavy sites

Date: 2026-10-09
Scope: exp-core 3.7.8 (sub-project B, re-scoped by trace evidence) and SHIFT 3.5.19 (the two SHIFT costs left after the incremental engine). All four products vendor Core 3.7.8.

## Evidence

User trace on reddit.com, 92 s, SHIFT 3.5.18, PRISMA 3.2.16:

- PRISMA's shared page observer flush: 27 calls, 18.3 s, longest 4.0 s.
  - Every one of its 3,354 forced style recalcs (13.9 s) came from Core's `injectStyle` paint probe (`getComputedStyle` on a probe span).
  - PRISMA calls `injectStyle` once for every new shadow root.
  - Event dispatch itself was about 150 ms, so the v1 event and JSON protocol stays.
- SHIFT live resolver: 4.1 s, longest 224 ms.
  - 3.3 s of it was `visible()`, and 2.1 s of that was `isPresentationSuppressed`, which parses JSON on every ancestor of every candidate before the cheap off-screen check runs.
- SHIFT re-apply on stylesheet load: 2.5 s, longest 630 ms.
  - Each stylesheet that loaded after the page re-applied the whole theme, restarting the live resolver with a synchronous full pass.

## exp-core 3.7.8

- **Shadow-root styles.**
  - One constructed sheet per stylesheet text is shared by every root that injects it.
  - Paint is probed once per page, with a separate probe sheet in the first connected root. Later roots only check that `adoptedStyleSheets` took the sheet.
  - Editing a handle's text gives that root its own copy first (copy-on-write). Removing a handle detaches from that root only; the shared sheet is dropped when no root uses it.
  - If adoption fails or does not paint, the existing `<style>` fallback is used.
- **Presentation state.** `presentationStateChain` and `isPresentationSuppressed` find state-carrying ancestors with `closest('[data-exp-presentation-state]')`, so elements without state are never parsed.
- **Page observer delivery.**
  - Queued roots are delivered in chunks of at most 16. Each chunk is a complete epoch through every phase.
  - Once a task has run 8 ms, the rest continues in a new task (`setTimeout(0)`).
  - Mutations arriving meanwhile join the same queue.
  - Protocol `exp-page-observer-v1` is unchanged: `rootIndex` and `rootCount` describe the chunk.
  - With mixed Core versions, the leader's behaviour applies, so older leaders still deliver whole batches.

## SHIFT 3.5.19

- `visible()` checks geometry first, then computed style, then presentation state. The result is unchanged (all three are required), but off-screen candidates are rejected without the costly reads.
- A stylesheet that loads after `document.readyState` is `complete` no longer schedules a re-apply.
  - Native darkness is diagnostic only: it drives one sentence in the menu.
  - The dynamic engine and the live resolver already follow stylesheet loads themselves.
  - Stylesheets that load while the page is loading still merge into the window-load recheck.
  - Cost if wrong: on a site whose dark stylesheet arrives after load, the menu's explanation may say "light" until the next theme change.

## Other session's edits (kept)

PRISMA, WARD and Dropper called Core as `globalThis.ExtraPotionsCore?.x?.()`. Inside the bundles `ExtraPotionsCore` is a local binding, so those calls did nothing:

- WARD never published hide or collapse state.
- PRISMA never honoured it.
- No product published suite state.

They now call the binding directly, and each product's tests forbid the global form. The edits also add:

- PRISMA: the text walker rejects ignored elements once per subtree. Elements without presentation state skip the parse.
- Dropper: campaign ranking reads the stored order and account key once per pass.

## Tests

- **exp-core** (`tests/page-cost.test.cjs`):
  - 200 roots get at most one probe and share one sheet.
  - Editing or removing one root's style leaves the others alone.
  - A 120-deep tree is parsed only where state exists.
  - 300 roots arrive in batches of at most 16, each exactly once, with timers running in between.
- **SHIFT**:
  - `tests/visibility-cost.test.cjs`: computed-style reads stay near the viewport.
  - `tests/dynamic-engine-controller.test.cjs`:
    - A stylesheet that loads after the page does not re-apply.
    - The window-load recheck still keeps components themed.
