# Quiet releases

Date: 2026-10-09
Scope: exp-core, Dropper, PRISMA, SHIFT, WARD

## Goal

Ship a real build without interrupting people. A quiet release still reaches everyone through their userscript manager, but the only visible sign before installing is the launcher's update badge. No Update Available card, no Update Complete card.

Docs-only changes (README, screenshots) need no release at all: they are served from `main`. Push them as an ordinary commit whose message does not start with `Release ` (for example `docs: …`), so no publish workflow runs.

## Decisions

| Question | Decision |
|---|---|
| What does a quiet build show? | Launcher badge only. |
| How is a release marked quiet? | A `RELEASE_QUIET=1` option on each product's prepare script, recorded in both the changelog and the build. |
| PRISMA and WARD have no badge today | Add the badge so every product behaves the same. |
| Update checks default | On for new installs in PRISMA, SHIFT, and WARD. Existing saved settings are untouched. Dropper already checks by default. |

## 1. Marking a release as quiet

- `prepare:release:feature` in each product accepts `RELEASE_QUIET=1` next to `RELEASE_NOTES_JSON`. Without it, behavior is unchanged.
- Quiet releases still require 2–4 notes. The changelog always records what changed.
- The changelog heading gets a suffix: `## 3.4.25 — 2026-10-12 (quiet)`. The publish workflow already copies the newest changelog sections into the GitHub release body, so the marker reaches GitHub without workflow changes.
- The build records quiet versions next to its release notes: a `QUIET_RELEASES` list (Dropper: beside `RELEASE_NOTES` in `src/parts/00-setup-and-state.js`; PRISMA, SHIFT, WARD: in `src/release-notes.js`, exposed on `EXP.ReleaseNotes`). The notes object keeps its shape, so the version-pill changelog keeps listing the release.
- Release checks accept the `(quiet)` suffix (including SHIFT's changelog/in-app notes match) and fail when the changelog heading and the quiet list disagree in either direction.

## 2. exp-core

- The update checker reads the first `##` heading of the GitHub release body. If it ends in `(quiet)` and its version equals the release tag's version, the check result and the cached state carry `quiet: true`.
- Any missing, mismatched, or unparseable heading means not quiet. The fallback is always the louder behavior.
- `available`, `latest`, and `details` keep their meaning; `quiet` is additive. `consumeVersionChange` is unchanged. The badge style already exists in `foundation.js`.
- One new pure helper, `ExtraPotionsCore.isQuietUpgrade(previous, current, releasedVersions, quietVersions)`, returns `true` only when at least one released version lies in `(previous, current]` and every such version is quiet. Unparseable input returns `false`.
- Ships as an exp-core release, synced into each product's `vendor/exp-core` with `npm run sync`, gated by `verify-consumers`.

## 3. Products

Update Available:
- The launcher badge and its accessible label (`Update vX available`) appear whenever a newer version exists, quiet or not. Dropper and SHIFT already do this; PRISMA and WARD gain it and clear it once the installed version is current.
- The card shows only when the result is not quiet. A quiet result does not claim the shared `available:` notice slot.

Update Complete:
- Skipped only when every released version after the previously installed one, up to the current one, is quiet (`isQuietUpgrade` over the product's release-notes versions). If any skipped-over release was normal, the card shows the current version's notes as it does today. The installed version is still recorded so the card does not appear later.
- Known limit: before installing, Update Available only sees the newest GitHub release, so a quiet newest release hides the card for an unseen normal release just before it. The badge still shows, and the rule above restores the card after install. Dropper changes `checkVersionNotice`; PRISMA, SHIFT, and WARD change the code at their `consumeVersionChange` call.

Unchanged:
- The version pill still opens the changelog with the quiet release's notes.

Update check default:
- PRISMA, SHIFT, and WARD default `updateNotifications` to `true`. Existing users keep their saved value; settings are saved in full on first load, so a stored `false` cannot be told apart from a deliberate choice and is never overridden.
- The setting's help text drops "Off by default" and says it checks GitHub for new releases and never installs automatically.

## 4. Rollout

1. exp-core release with quiet parsing (normal release).
2. Product releases that sync the new Core and add quiet handling, the PRISMA and WARD badge, and the new default. These are normal releases with notes, because existing installs only learn the marker by updating to them.
3. Quiet releases work from then on.

## 5. Testing

- exp-core: matching `(quiet)` heading yields `quiet: true`; missing, mismatched-version, or malformed headings yield not quiet; cached results keep the flag.
- Each product: quiet available version shows the badge and label but no card; quiet installed version shows no Update Complete card, still records the version, and the changelog still lists its notes; non-quiet releases behave as before.
- Release tooling: `RELEASE_QUIET=1` writes both markers; release checks reject a mismatch.
- Settings: fresh settings default update checks on; a stored `false` stays `false`.

## Out of scope

- Suppressing userscript-manager auto-updates (not possible while `@version` changes).
- Turning update checks on for existing users.
- The shared screenshot tool (separate design).
