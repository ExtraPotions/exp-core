# Quiet Releases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a product ship a real build whose only visible sign is the launcher's update badge, and turn update checks on by default for new installs.

**Architecture:** A `(quiet)` suffix on the newest changelog heading travels into the GitHub release body; exp-core's update checker reads it and adds `quiet` to its result. Each product keeps a `QUIET_RELEASES` list beside its release notes and asks a new pure Core helper, `isQuietUpgrade`, whether every version the user skipped was quiet before showing Update Complete. Products show the badge for any available update and the Update Available card only for non-quiet ones.

**Tech Stack:** Plain JavaScript userscripts, Node `node:test`, Playwright (Chromium), GitHub Actions publish workflows.

**Spec:** `exp-core/docs/superpowers/specs/2026-10-09-quiet-releases-design.md`

## Global Constraints

- Workspace root: `C:/Users/OneDareAtHome/Documents/ChatGPT/ExtraPotions`. Repos: `exp-core`, `Dropper`, `PRISMA`, `SHIFT`, `WARD`; each is its own git repo on branch `codex/remaining-hardening` tracking `origin/main`.
- Quiet marker: changelog heading `## <version> <— or -> <YYYY-MM-DD> (quiet)`. WARD uses ` - `, the others ` — `.
- Quiet list name everywhere: `QUIET_RELEASES`, one line, JSON-quoted strings: `const QUIET_RELEASES = Object.freeze(["3.4.25"]);` (empty: `Object.freeze([])`).
- Quiet releases still need 2–4 notes.
- Missing, mismatched, or unparseable quiet data means "not quiet" (show the card).
- Update check default `true` for new installs in PRISMA, SHIFT, WARD; a stored `false` is never changed.
- Help text for the setting: `Checks GitHub for new releases. Never installs automatically.`
- Launcher label with an update: `Open <Product> · Update v<x> Available`; without: Core's default (`Open PRISMA`, `Open SHIFT`, `Open WARD`; Dropper `Open Dropper Settings`).
- Do not rewrite these exp-core lines (product tests regex-match them): `function releaseDetails(body)`, `checkedForCurrentVersion = state.checkedForVersion === currentVersion`, `state.lastCheckAt = 0`, `state.lastRemoteVersion = ''`, `state.checkedForVersion = currentVersion`.
- No push, tag, or release happens before Task 10, and Task 10 needs the user's explicit go-ahead at the moment it runs.

## Review Focus

- A user who skipped a normal release and landed on a quiet one must still see Update Complete (pinned in Task 6 and Task 8 tests).
- A WARD-style hyphen heading and CRLF release body must still be read as quiet (pinned in Task 1).
- A cached quiet result must not stay quiet once a newer normal release appears (pinned in Task 1).
- The hourly Core-sync bot's `prepare-core-release.cjs` output (heading without `(quiet)`, no list change) must pass the new consistency tests (pinned in Tasks 3 and 4).
- Default-on update checks must not break browser tests that stub `GM_xmlhttpRequest` with a no-op or capture requests by index (SHIFT `tests/dynamic-boundaries.test.cjs`; checked in Task 7).

---

### Task 1: exp-core reads the quiet marker and adds `isQuietUpgrade`

**Files:**
- Modify: `exp-core/src/runtime.js` (update checker near lines 1786–1905; after `consumeVersionChange` at line 1304; API export at line 2190)
- Test: `exp-core/tests/quiet-releases.test.cjs` (create)

**Interfaces:**
- Produces: checker results and `status()` gain `quiet: boolean` (true only when available and the newest release heading is quiet). `ExtraPotionsCore.isQuietUpgrade(previous: string, current: string, releasedVersions: string[], quietVersions: string[]) => boolean`.

- [ ] **Step 1: Write the failing tests**

Create `exp-core/tests/quiet-releases.test.cjs`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'dist/exp-core.js'), 'utf8');
const slice = (start, end) => {
  const from = bundle.indexOf(start);
  const to = bundle.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `missing ${start}`);
  return bundle.slice(from, to);
};
const factory = slice('  function createReleaseUpdateChecker(', '\n  function createDiagnosticsReport(');
const compare = slice('function compareVersions(', '\nreturn Object.freeze').trim();
const helper = slice('  function isQuietUpgrade(', '\n  function visibleFloatingNotices(');

function fixture(cached = {}, version = '3.2.13') {
  const key = 'exp:v3:ward:update-cache';
  const storage = new Map([[key, JSON.stringify(cached)]]);
  const requests = [];
  const context = {
    ExtraPotionsTools: { productDataResetting: () => false },
    options: { productId: 'ward', repository: 'ExtraPotions/WARD', currentVersion: version, enabled: () => true },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
    GM_xmlhttpRequest: o => requests.push(o),
    Date, JSON, Object, String, Number, Array, Promise, Error,
  };
  vm.runInNewContext(`const CoreFoundation = { compareVersions: (${compare}) };\n${factory}\nthis.checker = createReleaseUpdateChecker(options);`, context);
  return { checker: context.checker, requests };
}
function release(request, tag, body) {
  request.onload({ status: 200, responseText: JSON.stringify({ tag_name: 'v' + tag, body }) });
}
async function checkWith(body, tag = '3.2.14', cached = {}) {
  const f = fixture(cached);
  const pending = f.checker.check(true);
  release(f.requests[0], tag, body);
  return { result: await pending, f };
}
const quietUpgrade = (() => {
  const context = {};
  vm.runInNewContext(`const CoreFoundation = { compareVersions: (${compare}) };\n${helper}\nthis.isQuietUpgrade = isQuietUpgrade;`, context);
  return context.isQuietUpgrade;
})();

test('a matching (quiet) heading marks the available release quiet', async () => {
  const { result } = await checkWith('## 3.2.14 — 2026-10-12 (quiet)\n\n- First.\n- Second.\n\n## 3.2.13 — 2026-10-01\n\n- Old.');
  assert.equal(result.available, true);
  assert.equal(result.quiet, true);
  assert.deepEqual(Array.from(result.details), ['First.', 'Second.']);
});

test('hyphen separators and CRLF bodies are read as quiet', async () => {
  const { result } = await checkWith('## 3.2.14 - 2026-10-12 (quiet)\r\n\r\n- First.\r\n- Second.\r\n');
  assert.equal(result.quiet, true);
});

test('normal, mismatched, missing, and malformed headings are not quiet', async () => {
  for (const body of [
    '## 3.2.14 — 2026-10-12\n\n- First.\n- Second.',
    '## 3.2.15 — 2026-10-12 (quiet)\n\n- Wrong version.\n- Second.',
    '- No heading at all.',
    '',
    '## Release notes (quiet)\n\n- No version.',
    '## 3.2.14 — 2026-10-12 (quiet) extra\n\n- Suffix not last.',
  ]) {
    const { result } = await checkWith(body);
    assert.equal(result.quiet, false, JSON.stringify(body));
  }
});

test('quiet is false when the release is not newer than the installed version', async () => {
  const { result } = await checkWith('## 3.2.13 — 2026-10-12 (quiet)\n\n- Same.\n- Version.', '3.2.13');
  assert.equal(result.available, false);
  assert.equal(result.quiet, false);
});

test('a cached quiet result keeps its flag in status()', async () => {
  const { f } = await checkWith('## 3.2.14 — 2026-10-12 (quiet)\n\n- First.\n- Second.');
  assert.equal(f.checker.status().quiet, true);
});

test('a newer normal release replaces a cached quiet result', async () => {
  const { f } = await checkWith('## 3.2.14 — 2026-10-12 (quiet)\n\n- First.\n- Second.');
  const pending = f.checker.check(true);
  release(f.requests[1], '3.2.15', '## 3.2.15 — 2026-10-13\n\n- Loud.\n- Release.');
  const result = await pending;
  assert.equal(result.latest, '3.2.15');
  assert.equal(result.quiet, false);
});

test('a new installed version clears a cached quiet flag', () => {
  const f = fixture({ checkedForVersion: '3.2.12', lastCheckAt: Date.now(), lastRemoteVersion: '3.2.14', quiet: true }, '3.2.13');
  f.checker.check();
  assert.equal(f.checker.status().quiet, false);
});

test('isQuietUpgrade is true only when every skipped release is quiet', () => {
  const released = ['3.4.26', '3.4.25', '3.4.24', '3.4.23'];
  assert.equal(quietUpgrade('3.4.25', '3.4.26', released, ['3.4.26']), true);
  assert.equal(quietUpgrade('3.4.24', '3.4.26', released, ['3.4.26']), false, 'skipped normal 3.4.25');
  assert.equal(quietUpgrade('3.4.24', '3.4.26', released, ['3.4.25', '3.4.26']), true);
  assert.equal(quietUpgrade('3.4.25', '3.4.26', released, []), false);
  assert.equal(quietUpgrade('3.4.25', '3.4.27', released, ['3.4.26']), false, 'current missing from notes');
  assert.equal(quietUpgrade('3.4.26', '3.4.25', released, ['3.4.25']), false, 'downgrade');
  assert.equal(quietUpgrade('', '3.4.26', released, ['3.4.26']), false);
  assert.equal(quietUpgrade('garbage', '3.4.26', released, ['3.4.26']), false);
  assert.equal(quietUpgrade('3.4.25', '3.4.26', null, null), false);
});
```

- [ ] **Step 2: Build and run the tests to see them fail**

Run: `cd exp-core && npm run build && node --test tests/quiet-releases.test.cjs`
Expected: FAIL — `missing   function isQuietUpgrade(` from the module-level `slice` call.

- [ ] **Step 3: Implement**

In `exp-core/src/runtime.js`, inside `createReleaseUpdateChecker`, add after the `releaseDetails` function (keep `releaseDetails` unchanged):

```js
    // A release is quiet when the newest heading of its notes is that release, marked "(quiet)".
    function releaseQuiet(body, latest) {
      for (const line of String(body || '').split(/\r?\n/)) {
        if (!/^##\s+/.test(line)) continue;
        const heading = line.match(/^##\s+v?(\d+\.\d+\.\d+)\b(.*)$/);
        return Boolean(heading && heading[1] === latest && /\(quiet\)\s*$/.test(heading[2]));
      }
      return false;
    }
```

In `snapshot`, add a line after `details: next.details.slice(0, 4),`:

```js
        quiet: Boolean(next.quiet && latest && CoreFoundation.compareVersions(latest, currentVersion) > 0),
```

In `check`, inside the `if (!checkedForCurrentVersion) { ... }` reset block, add after `state.details = [];`:

```js
        state.quiet = false;
```

In `check`, on success, add after `state.details = releaseDetails(payload.body);`:

```js
        state.quiet = releaseQuiet(payload.body, latest);
```

After `consumeVersionChange` (ends at line 1310), add:

```js
  // True only when at least one released version lies in (previous, current], current among them,
  // and every one of them is quiet. Anything unparseable is not quiet.
  function isQuietUpgrade(previous, current, releasedVersions, quietVersions) {
    const pattern = /^\d+\.\d+\.\d+$/;
    previous = String(previous || '');
    current = String(current || '');
    if (!pattern.test(previous) || !pattern.test(current) || CoreFoundation.compareVersions(current, previous) <= 0) return false;
    const quiet = new Set(Array.from(quietVersions || [], String));
    const skipped = Array.from(releasedVersions || [], String).filter(version => pattern.test(version)
      && CoreFoundation.compareVersions(version, previous) > 0 && CoreFoundation.compareVersions(version, current) <= 0);
    return skipped.includes(current) && skipped.every(version => quiet.has(version));
  }
```

In the `const api = Object.freeze({...})` line (2190), add `isQuietUpgrade,` immediately after `consumeVersionChange,`.

- [ ] **Step 4: Build and run the tests to see them pass**

Run: `cd exp-core && npm run build && node --test tests/quiet-releases.test.cjs tests/update-version-regression.test.cjs`
Expected: PASS, all tests.

- [ ] **Step 5: Run the full exp-core suite**

Run: `cd exp-core && npm test`
Expected: PASS (225 + 8 tests). If `check-core-duplicates` or annotation checks complain about the new function, follow their message (they name the file and rule).

- [ ] **Step 6: Commit**

```bash
cd exp-core && git add src/runtime.js dist tests/quiet-releases.test.cjs && git commit -m "feat: read quiet release markers and add isQuietUpgrade"
```

---

### Task 2: exp-core 3.7.7 version bump (local only)

**Files:**
- Modify: `exp-core/package.json`, `exp-core/package-lock.json`, `exp-core/CHANGELOG.md`, `exp-core/dist/*` (rebuilt)

**Interfaces:**
- Produces: a local commit `Release exp-core 3.7.7: quiet release markers` whose `dist/manifest.json` reports `coreVersion: "3.7.7"`. Tasks 5–9 sync this build into products.

- [ ] **Step 1: Bump the version**

```bash
cd exp-core && node -e "
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='3.7.7';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
const l=JSON.parse(fs.readFileSync('package-lock.json','utf8'));l.version='3.7.7';if(l.packages&&l.packages['']) l.packages[''].version='3.7.7';fs.writeFileSync('package-lock.json',JSON.stringify(l,null,2)+'\n');"
```

- [ ] **Step 2: Add the changelog section at the top of `exp-core/CHANGELOG.md`** (use today's date)

```markdown
## 3.7.7 — 2026-10-09

- Recognizes quiet releases, so products can show only the update badge for them.
- Adds a shared check for whether every skipped release was quiet.

```

- [ ] **Step 3: Build and test**

Run: `cd exp-core && npm run build && npm test`
Expected: `Core 3.7.7 <sha>` from the build, then all tests PASS.

- [ ] **Step 4: Commit (do not push)**

```bash
cd exp-core && git add -A && git commit -m "Release exp-core 3.7.7: quiet release markers"
```

---

### Task 3: Quiet release tooling in PRISMA, SHIFT, WARD

The three repos share an identical `scripts/prepare-feature-release.cjs`. Apply the identical edit to all three. Repeat Steps 1–7 once per repo, with `<P>` = `PRISMA`, `SHIFT`, `WARD`; `<tests>` = `tests` (PRISMA, SHIFT) or `tests-v3` (WARD); `<NOTES>` = `notes` (PRISMA, WARD) or `NOTES` (SHIFT).

**Files:**
- Modify: `<P>/src/release-notes.js`, `<P>/scripts/prepare-feature-release.cjs`
- Modify (SHIFT only): `SHIFT/scripts/release-check.cjs:46`, `SHIFT/tests/version.test.cjs:25`
- Test: `<P>/<tests>/quiet-releases.test.cjs` (create)

**Interfaces:**
- Consumes: `ExtraPotionsCore.isQuietUpgrade` (Task 1; only called at runtime, not by these tests).
- Produces: `EXP.ReleaseNotes.isQuietUpgrade(previous: string) => boolean` and `EXP.ReleaseNotes.QUIET_RELEASES: string[]` in all three products. `RELEASE_QUIET=1` support in `prepare-feature-release.cjs`.

- [ ] **Step 1: Write the failing tests**

Create `<P>/<tests>/quiet-releases.test.cjs`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const QUIET_LINE = /const QUIET_RELEASES = Object\.freeze\((\[[^\]\n]*\])\);/;
const quietList = text => JSON.parse(text.match(QUIET_LINE)[1]);
const quietHeadings = text => [...text.matchAll(/^## (\d+\.\d+\.\d+) .*\(quiet\)\s*$/gm)].map(m => m[1]);

test('changelog (quiet) headings and QUIET_RELEASES agree', () => {
  const listed = quietList(read('src/release-notes.js'));
  assert.deepEqual([...listed].sort(), quietHeadings(read('CHANGELOG.md')).sort());
  for (const version of listed) assert.ok(read('src/release-notes.js').includes(`'${version}': [`), `${version} needs release notes`);
});

test('release notes expose isQuietUpgrade backed by Core', () => {
  const source = read('src/release-notes.js');
  assert.match(source, QUIET_LINE);
  assert.match(source, /ExtraPotionsCore\.isQuietUpgrade\(previous, EXP\.VERSION, Object\.keys\(/);
  assert.match(source, /isQuietUpgrade, QUIET_RELEASES/);
});

function prepare(env) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'quiet-prepare-'));
  for (const file of ['package.json', 'package-lock.json', 'CHANGELOG.md', 'src/metadata.txt', 'src/main.js', 'src/release-notes.js', 'scripts/prepare-feature-release.cjs']) {
    fs.mkdirSync(path.dirname(path.join(work, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(work, file));
  }
  execFileSync(process.execPath, [path.join(work, 'scripts/prepare-feature-release.cjs')], {
    env: { ...process.env, RELEASE_NOTES_JSON: JSON.stringify(['First note.', 'Second note.']), ...env }, stdio: 'pipe',
  });
  const out = name => fs.readFileSync(path.join(work, name), 'utf8');
  const version = JSON.parse(out('package.json')).version;
  const result = { version, changelog: out('CHANGELOG.md'), notes: out('src/release-notes.js') };
  fs.rmSync(work, { recursive: true, force: true });
  return result;
}

test('RELEASE_QUIET=1 marks both the changelog heading and QUIET_RELEASES', () => {
  const { version, changelog, notes } = prepare({ RELEASE_QUIET: '1' });
  assert.match(changelog.split('\n')[0], new RegExp(`^## ${version.replaceAll('.', '\\.')} (—|-) \\d{4}-\\d{2}-\\d{2} \\(quiet\\)$`));
  assert.equal(quietList(notes)[0], version);
  assert.deepEqual([...quietList(notes)].sort(), quietHeadings(changelog).sort());
});

test('a normal release leaves QUIET_RELEASES alone and adds no marker', () => {
  const before = quietList(read('src/release-notes.js'));
  const { changelog, notes } = prepare({});
  assert.doesNotMatch(changelog.split('\n')[0], /\(quiet\)/);
  assert.deepEqual(quietList(notes), before);
});

test('the Core-sync bot heading format passes the quiet consistency check', () => {
  // prepare-core-release.cjs writes "## <next> — <date>" with no marker and never touches QUIET_RELEASES.
  const changelog = `## 9.9.9 — 2026-10-12\n\n- Includes exp-core 9.9.9.\n- Keeps every setting.\n\n${read('CHANGELOG.md')}`;
  assert.deepEqual([...quietList(read('src/release-notes.js'))].sort(), quietHeadings(changelog).sort());
});
```

- [ ] **Step 2: Run to see it fail**

Run: `cd <P> && node --test <tests>/quiet-releases.test.cjs`
Expected: FAIL — `Cannot read properties of null (reading '1')` (no `QUIET_RELEASES` line yet).

- [ ] **Step 3: Add the quiet list to `<P>/src/release-notes.js`**

PRISMA and WARD: replace the closing lines

```js
  function current() { return notes[EXP.VERSION] || Object.freeze(['Current PRISMA improvements and fixes.']); }
  return Object.freeze({ current });
```

with (WARD: keep its own fallback text `'Current WARD improvements and fixes.'`):

```js
  function current() { return notes[EXP.VERSION] || Object.freeze(['Current PRISMA improvements and fixes.']); }
  const QUIET_RELEASES = Object.freeze([]);
  function isQuietUpgrade(previous) { return ExtraPotionsCore.isQuietUpgrade(previous, EXP.VERSION, Object.keys(notes), QUIET_RELEASES); }
  return Object.freeze({ current, isQuietUpgrade, QUIET_RELEASES });
```

SHIFT: replace `  return Object.freeze({ forVersion, renderChangelog });` with:

```js
  const QUIET_RELEASES = Object.freeze([]);
  function isQuietUpgrade(previous) { return ExtraPotionsCore.isQuietUpgrade(previous, EXP.VERSION, Object.keys(NOTES), QUIET_RELEASES); }
  return Object.freeze({ forVersion, renderChangelog, isQuietUpgrade, QUIET_RELEASES });
```

- [ ] **Step 4: Teach `<P>/scripts/prepare-feature-release.cjs` about `RELEASE_QUIET`**

Add to the header comment, after the `RELEASE_VERSION` line:

```js
// Optional: RELEASE_QUIET=1 marks the release quiet: people see only the launcher badge, no notice cards.
```

After `notes = notes.map(note => note.trim());` add:

```js
const quiet = process.env.RELEASE_QUIET === '1';
```

After the `write('src/release-notes.js', replaceRequired(...'in-app release notes'));` statement add:

```js
if (quiet) {
  const quietLine = /const QUIET_RELEASES = Object\.freeze\((\[[^\]\n]*\])\);/;
  const releaseNotes = read('src/release-notes.js');
  const match = releaseNotes.match(quietLine);
  if (!match) throw new Error('Could not locate QUIET_RELEASES');
  const listed = JSON.parse(match[1]);
  if (!listed.includes(next)) listed.unshift(next);
  write('src/release-notes.js', releaseNotes.replace(quietLine, `const QUIET_RELEASES = Object.freeze(${JSON.stringify(listed)});`));
}
```

Change the section line to:

```js
const section = `## ${next} ${separator} ${date}${quiet ? ' (quiet)' : ''}\n\n${notes.map(note => `- ${note}`).join('\n')}\n\n`;
```

Change the final log line to:

```js
console.log(`Prepared ${pkg.name || 'product'} ${next} from ${previous} with ${notes.length} release notes${quiet ? ' (quiet)' : ''}. Run npm test to rebuild.`);
```

- [ ] **Step 5 (SHIFT only): Accept the marker in SHIFT's header checks**

In `SHIFT/scripts/release-check.cjs:46` and `SHIFT/tests/version.test.cjs:25`, change the header pattern's end from `\\d{4}-\\d{2}-\\d{2}$` to `\\d{4}-\\d{2}-\\d{2}(?: \\(quiet\\))?$`. Exact new lines:

```js
const versionHeader = new RegExp(`^## ${pkg.version.replaceAll('.', '\\.')} — \\d{4}-\\d{2}-\\d{2}(?: \\(quiet\\))?$`, 'm');
```

```js
  const header = new RegExp(`^## ${escapedVersion} — \\d{4}-\\d{2}-\\d{2}(?: \\(quiet\\))?$`, 'm');
```

- [ ] **Step 6: Run the new tests and the full suite**

Run: `cd <P> && node --test <tests>/quiet-releases.test.cjs && npm test`
Expected: PASS. (`npm test` rebuilds the userscript; the build references `ExtraPotionsCore.isQuietUpgrade` only at call time, so it passes with the old vendored Core.)

- [ ] **Step 7: Commit**

```bash
cd PRISMA && git add src/release-notes.js scripts/prepare-feature-release.cjs tests/quiet-releases.test.cjs prisma.user.js && git commit -m "feat: quiet release tooling"
cd SHIFT && git add src/release-notes.js scripts/prepare-feature-release.cjs scripts/release-check.cjs tests/version.test.cjs tests/quiet-releases.test.cjs shift.user.js && git commit -m "feat: quiet release tooling"
cd WARD && git add src/release-notes.js scripts/prepare-feature-release.cjs tests-v3/quiet-releases.test.cjs ward.user.js && git commit -m "feat: quiet release tooling"
```

---

### Task 4: Quiet release tooling in Dropper

**Files:**
- Modify: `Dropper/src/parts/00-setup-and-state.js:213` (beside `RELEASE_NOTES`), `Dropper/scripts/prepare-feature-release.cjs`
- Test: `Dropper/tests/quiet-releases.test.cjs` (create)

**Interfaces:**
- Produces: `const QUIET_RELEASES = Object.freeze([...])` in Dropper's first source part, readable by Task 6. `RELEASE_QUIET=1` support.

- [ ] **Step 1: Write the failing tests**

Create `Dropper/tests/quiet-releases.test.cjs`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const HEADER_PART = 'src/parts/00-setup-and-state.js';
const QUIET_LINE = /const QUIET_RELEASES = Object\.freeze\((\[[^\]\n]*\])\);/;
const quietList = text => JSON.parse(text.match(QUIET_LINE)[1]);
const quietHeadings = text => [...text.matchAll(/^## (\d+\.\d+\.\d+) .*\(quiet\)\s*$/gm)].map(m => m[1]);

test('changelog (quiet) headings and QUIET_RELEASES agree', () => {
  const listed = quietList(read(HEADER_PART));
  assert.deepEqual([...listed].sort(), quietHeadings(read('CHANGELOG.md')).sort());
  for (const version of listed) assert.ok(read(HEADER_PART).includes(`"${version}": [`), `${version} needs release notes`);
});

function prepare(env) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'dropper-quiet-'));
  for (const file of ['package.json', 'package-lock.json', 'CHANGELOG.md', HEADER_PART, 'scripts/prepare-feature-release.cjs']) {
    fs.mkdirSync(path.dirname(path.join(work, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(work, file));
  }
  execFileSync(process.execPath, [path.join(work, 'scripts/prepare-feature-release.cjs')], {
    env: { ...process.env, RELEASE_NOTES_JSON: JSON.stringify(['First note.', 'Second note.']), ...env }, stdio: 'pipe',
  });
  const out = name => fs.readFileSync(path.join(work, name), 'utf8');
  const result = { version: JSON.parse(out('package.json')).version, changelog: out('CHANGELOG.md'), source: out(HEADER_PART) };
  fs.rmSync(work, { recursive: true, force: true });
  return result;
}

test('RELEASE_QUIET=1 marks both the changelog heading and QUIET_RELEASES', () => {
  const { version, changelog, source } = prepare({ RELEASE_QUIET: '1' });
  assert.match(changelog.split('\n')[0], new RegExp(`^## ${version.replaceAll('.', '\\.')} — \\d{4}-\\d{2}-\\d{2} \\(quiet\\)$`));
  assert.equal(quietList(source)[0], version);
});

test('a normal release leaves QUIET_RELEASES alone and adds no marker', () => {
  const before = quietList(read(HEADER_PART));
  const { changelog, source } = prepare({});
  assert.doesNotMatch(changelog.split('\n')[0], /\(quiet\)/);
  assert.deepEqual(quietList(source), before);
});

test('the Core-sync bot heading format passes the quiet consistency check', () => {
  const changelog = `## 9.9.9 — 2026-10-12\n\n- Includes exp-core 9.9.9.\n- Keeps every setting.\n\n${read('CHANGELOG.md')}`;
  assert.deepEqual([...quietList(read(HEADER_PART))].sort(), quietHeadings(changelog).sort());
});
```

Note: `prepare-feature-release.cjs` finds the header part with `fs.readdirSync(src/parts)`; the temp copy contains only `00-setup-and-state.js`, which is the first part, so it resolves correctly. Its trailing `npm run build` is part of the npm script, not the file, so it does not run here.

- [ ] **Step 2: Run to see it fail**

Run: `cd Dropper && node --test tests/quiet-releases.test.cjs`
Expected: FAIL — `Cannot read properties of null (reading '1')`.

- [ ] **Step 3: Add the list** — in `Dropper/src/parts/00-setup-and-state.js`, insert immediately above `  const RELEASE_NOTES = {`:

```js
  const QUIET_RELEASES = Object.freeze([]);
```

- [ ] **Step 4: Teach `Dropper/scripts/prepare-feature-release.cjs` about `RELEASE_QUIET`**

After `notes = notes.map(note => note.trim());` add `const quiet = process.env.RELEASE_QUIET === '1';`.

Before `write(HEADER_PART, source);` add:

```js
if (quiet) {
  const quietLine = /const QUIET_RELEASES = Object\.freeze\((\[[^\]\n]*\])\);/;
  const match = source.match(quietLine);
  if (!match) throw new Error('Could not locate QUIET_RELEASES');
  const listed = JSON.parse(match[1]);
  if (!listed.includes(next)) listed.unshift(next);
  source = source.replace(quietLine, `const QUIET_RELEASES = Object.freeze(${JSON.stringify(listed)});`);
}
```

Change the section line to:

```js
const section = `## ${next} — ${date}${quiet ? ' (quiet)' : ''}\n\n${notes.map(note => `- ${note}`).join('\n')}\n\n`;
```

And the log line to:

```js
console.log(`Prepared Dropper ${next} feature release from ${previous} with ${notes.length} release notes${quiet ? ' (quiet)' : ''}.`);
```

- [ ] **Step 5: Run the new tests and the full suite**

Run: `cd Dropper && node --test tests/quiet-releases.test.cjs && npm test`
Expected: PASS (388 + 4).

- [ ] **Step 6: Commit**

```bash
cd Dropper && git add src/parts/00-setup-and-state.js src/dropper.user.js dropper.user.js scripts/prepare-feature-release.cjs tests/quiet-releases.test.cjs && git commit -m "feat: quiet release tooling"
```

---

### Task 5: Sync the local Core 3.7.7 build into the products

**Files:**
- Modify: `<P>/vendor/exp-core/{exp-core.js,manifest.json,PIN}` for Dropper, PRISMA, SHIFT, WARD

**Interfaces:**
- Consumes: Task 2's `dist`.
- Produces: products whose `ExtraPotionsCore` has `isQuietUpgrade` and quiet-aware update results, for Tasks 6–9.

- [ ] **Step 1: Sync**

Run: `cd exp-core && npm run sync`
Expected: four lines `<Product>: Core matches canonical bundle`.

- [ ] **Step 2: Rebuild and test every product**

Run (each repo): `cd Dropper && npm test`, `cd PRISMA && npm test`, `cd SHIFT && npm test`, `cd WARD && npm test`
Expected: PASS everywhere. Do not run `release:check` yet; its pin check fetches `v3.7.7` from GitHub, which is not published until Task 10.

- [ ] **Step 3: Commit in each product**

```bash
cd Dropper && git add vendor/exp-core src/dropper.user.js dropper.user.js && git commit -m "chore: vendor exp-core 3.7.7"
cd PRISMA && git add vendor/exp-core prisma.user.js && git commit -m "chore: vendor exp-core 3.7.7"
cd SHIFT && git add vendor/exp-core shift.user.js && git commit -m "chore: vendor exp-core 3.7.7"
cd WARD && git add vendor/exp-core ward.user.js && git commit -m "chore: vendor exp-core 3.7.7"
```

---

### Task 6: Dropper — badge-only for quiet updates, quiet-aware Update Complete

**Files:**
- Modify: `Dropper/src/parts/08-notices-updates-and-layout.js` (`markUpdateAvailable` at 446, `checkCachedUpdateNotice` at 490, `checkVersionNotice` at 500, `scheduleUpdateCheck` at 521)
- Test: `Dropper/tests/quiet-releases.test.cjs` (append)

**Interfaces:**
- Consumes: `QUIET_RELEASES` (Task 4), `ExtraPotionsCore.isQuietUpgrade` and `result.quiet` (Tasks 1, 5).

- [ ] **Step 1: Append failing browser tests to `Dropper/tests/quiet-releases.test.cjs`**

```js
const { chromium } = require('playwright');
const { loadDropperSource } = require('./load-source.cjs');

const releasedVersions = () => [...read(HEADER_PART).matchAll(/^\s*"(\d+\.\d+\.\d+)": \[/gm)].map(m => m[1]);

async function bootDropper(t, { release = null, previous = null, quiet = null } = {}) {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let source = loadDropperSource();
  if (quiet) source = source.replace(QUIET_LINE, `const QUIET_RELEASES = Object.freeze(${JSON.stringify(quiet)});`);
  await page.addInitScript(({ release, previous }) => {
    if (previous) localStorage.setItem('dropper-last-version-v2', previous);
    window.GM_xmlhttpRequest = o => {
      if (release && String(o.url).includes('api.github.com')) setTimeout(() => o.onload({ status: 200, responseText: JSON.stringify(release) }), 0);
      return { abort() {} };
    };
  }, { release, previous });
  await page.route('https://www.twitch.tv/**', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await page.goto('https://www.twitch.tv/quiet-release');
  await page.addScriptTag({ content: source });
  await page.waitForFunction(() => document.getElementById('tdh-root')?.shadowRoot?.getElementById('tdh-settings-launcher'));
  return page;
}
const dropperFacts = page => page.evaluate(() => {
  const shadow = document.getElementById('tdh-root').shadowRoot;
  const launcher = shadow.getElementById('tdh-settings-launcher');
  const notice = shadow.getElementById('tdh-update-notice');
  return { badge: launcher.classList.contains('update-available'), label: launcher.getAttribute('aria-label'), card: !notice.hidden, text: notice.textContent };
});
const body = (version, quiet) => `## ${version} — 2026-10-12${quiet ? ' (quiet)' : ''}\n\n- First.\n- Second.`;

test('a normal available update shows the badge and the card (control)', async t => {
  const page = await bootDropper(t, { release: { tag_name: 'v99.0.0', body: body('99.0.0', false) } });
  await page.waitForFunction(() => !document.getElementById('tdh-root').shadowRoot.getElementById('tdh-update-notice').hidden, null, { timeout: 5000 });
  const facts = await dropperFacts(page);
  assert.equal(facts.badge, true);
  assert.match(facts.text, /Update Available/);
});

test('a quiet available update shows only the badge and its label', async t => {
  const page = await bootDropper(t, { release: { tag_name: 'v99.0.0', body: body('99.0.0', true) } });
  await page.waitForFunction(() => document.getElementById('tdh-root').shadowRoot.getElementById('tdh-settings-launcher').classList.contains('update-available'), null, { timeout: 5000 });
  await page.waitForTimeout(500);
  const facts = await dropperFacts(page);
  assert.equal(facts.card, false);
  assert.equal(facts.label, 'Open Dropper Settings · Update v99.0.0 Available');
});

test('Update Complete is skipped when every skipped release is quiet', async t => {
  const [current, previous] = releasedVersions();
  const page = await bootDropper(t, { previous, quiet: [current] });
  await page.waitForTimeout(1500);
  assert.equal((await dropperFacts(page)).card, false);
  assert.equal(await page.evaluate(() => localStorage.getItem('dropper-last-version-v2')), current);
});

test('Update Complete still shows when a skipped release was normal', async t => {
  const [current, , older] = releasedVersions();
  const page = await bootDropper(t, { previous: older, quiet: [current] });
  await page.waitForFunction(() => !document.getElementById('tdh-root').shadowRoot.getElementById('tdh-update-notice').hidden, null, { timeout: 5000 });
  assert.match((await dropperFacts(page)).text, /Update Complete/);
});
```

- [ ] **Step 2: Run to see the quiet tests fail**

Run: `cd Dropper && node --test --test-name-pattern="quiet available|Update Complete is skipped" tests/quiet-releases.test.cjs`
Expected: FAIL — the card is shown. Also run the control: `--test-name-pattern="control|was normal"` → PASS (proves the harness reaches the notice).

- [ ] **Step 3: Implement in `Dropper/src/parts/08-notices-updates-and-layout.js`**

Change the `markUpdateAvailable` signature and add the quiet early return after the existing `if (alreadyAnnounced) return;`:

```js
  function markUpdateAvailable(version, details = [], quiet = false) {
```

```js
    if (alreadyAnnounced) return;
    // Quiet releases show only the badge and label above.
    if (quiet) return;
```

In `checkCachedUpdateNotice`: `markUpdateAvailable(status.latest, status.details, status.quiet);`
In `scheduleUpdateCheck`: `markUpdateAvailable(result.latest, result.details, result.quiet);`

In `checkVersionNotice`, change the condition to:

```js
    if (previous && previous !== APP_VERSION
        && !ExtraPotionsCore.isQuietUpgrade(previous, APP_VERSION, Object.keys(RELEASE_NOTES), QUIET_RELEASES)
        && claimNotice(`updated:${APP_VERSION}`)) {
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd Dropper && npm test`
Expected: PASS, all tests including the four new browser tests.

- [ ] **Step 5: Commit**

```bash
cd Dropper && git add src dropper.user.js tests/quiet-releases.test.cjs && git commit -m "feat: badge-only quiet updates and quiet-aware Update Complete"
```

---

### Task 7: SHIFT — quiet handling, launcher label, default-on update checks

**Files:**
- Modify: `SHIFT/src/ui.js` (`checkUpdateNotice` at 75–87, Update Complete at 474–484, help text at 358), `SHIFT/src/settings.js:31`
- Test: `SHIFT/tests/quiet-releases.test.cjs` (append)

**Interfaces:**
- Consumes: `EXP.ReleaseNotes.isQuietUpgrade` (Task 3), `result.quiet` (Tasks 1, 5).

- [ ] **Step 1: Append failing tests to `SHIFT/tests/quiet-releases.test.cjs`**

Append this constants line, then the whole of Appendix A (including its last test):

```js
const ID = 'shift', HOST = '#exp-shift-root', NAME = 'SHIFT', PAGE = 'https://quiet.test/', SEP = '—';
```

- [ ] **Step 2: Run to see the new tests fail**

Run: `cd SHIFT && node --test tests/quiet-releases.test.cjs`
Expected: FAIL on the quiet, label, default, and help-text tests (with the default still off, the browser tests never reach the update path).

- [ ] **Step 3: Implement**

`SHIFT/src/settings.js:31`: `updateNotifications: true,`

`SHIFT/src/ui.js`, add above `async function checkUpdateNotice`:

```js
  function markLauncherUpdate(result = {}) {
    if (!launcher) return;
    const ready = Boolean(result.available && result.latest);
    launcher.classList.toggle('update-available', ready);
    launcher.setAttribute('aria-label', ready ? `Open SHIFT · Update v${result.latest} Available` : 'Open SHIFT');
  }
```

In `checkUpdateNotice`, replace `launcher?.classList.toggle('update-available', Boolean(result.available));` with `markLauncherUpdate(result);` and change the condition to `if (result.available && !result.quiet && EXP.Core.claimNotice('shift',`available:${result.latest}`)) showUpdateNotice({`.

Update Complete: change `if (previous) {` (line 476) to `if (previous && !EXP.ReleaseNotes.isQuietUpgrade(previous)) {`.

Help text (line 358): replace `'Off by default. When enabled, checks GitHub release metadata when needed and never installs automatically.'` with `'Checks GitHub for new releases. Never installs automatically.'`.

- [ ] **Step 4: Run the full suite**

Run: `cd SHIFT && npm test`
Expected: PASS. If `tests/dynamic-boundaries.test.cjs` now fails because the update request lands in `responses[0]`/`requests.at(-1)`, change those two tests' stubs to ignore GitHub requests: `window.GM_xmlhttpRequest=o=>{if(!String(o.url).includes('api.github.com'))responses.push(o);}` (and the same for `requests`). Re-run until green.

- [ ] **Step 5: Commit**

```bash
cd SHIFT && git add src shift.user.js tests && git commit -m "feat: quiet updates, launcher update label, update checks on for new installs"
```

---

### Task 8: PRISMA — badge, quiet handling, default-on update checks

**Files:**
- Modify: `PRISMA/src/ui.js` (update flow at 285–287, help text at 203), `PRISMA/src/settings.js:28`
- Test: `PRISMA/tests/quiet-releases.test.cjs` (append)

**Interfaces:**
- Consumes: `EXP.ReleaseNotes.isQuietUpgrade` (Task 3), `result.quiet` (Tasks 1, 5).

- [ ] **Step 1: Append failing tests to `PRISMA/tests/quiet-releases.test.cjs`**

Append this constants line, then the whole of Appendix A (including its last test):

```js
const ID = 'prisma', HOST = '#exp-prisma-root', NAME = 'PRISMA', PAGE = 'https://quiet.test/', SEP = '—';
```

- [ ] **Step 2: Run to see them fail**

Run: `cd PRISMA && node --test tests/quiet-releases.test.cjs`
Expected: FAIL on badge, label, quiet, default, and help-text tests.

- [ ] **Step 3: Implement**

`PRISMA/src/settings.js:28`: `updateNotifications: true,`

`PRISMA/src/ui.js`, add after the `hideUpdateCard` function (line 20):

```js
  function markLauncherUpdate(result = {}) {
    if (!launcher) return;
    const ready = Boolean(result.available && result.latest);
    launcher.classList.toggle('update-available', ready);
    launcher.setAttribute('aria-label', ready ? `Open PRISMA · Update v${result.latest} Available` : 'Open PRISMA');
  }
```

Replace lines 286–287:

```js
    if (previous && !EXP.ReleaseNotes.isQuietUpgrade(previous)) showUpdateCard({}, true, previous);
    if (EXP.Settings.snapshot().updateNotifications) EXP.Updates.check(false).then(result => {
      if (!host) return;
      markLauncherUpdate(result);
      if (result.available && !result.quiet) showUpdateCard(result);
    });
```

Help text (line 203): replace `'Off by default. Opt-in checks request release metadata only.'` with `'Checks GitHub for new releases. Never installs automatically.'`.

- [ ] **Step 4: Run the full suite**

Run: `cd PRISMA && npm test`
Expected: PASS. `tests/shared-core.test.cjs:57` seeds `updateNotifications: false` explicitly and is unaffected.

- [ ] **Step 5: Commit**

```bash
cd PRISMA && git add src prisma.user.js tests && git commit -m "feat: update badge, quiet updates, update checks on for new installs"
```

---

### Task 9: WARD — badge, quiet handling, default-on update checks

**Files:**
- Modify: `WARD/src/ui.js` (toggle handler at 566, mount flow at 773–775), `WARD/src/settings.js:25`
- Test: `WARD/tests-v3/quiet-releases.test.cjs` (append)

**Interfaces:**
- Consumes: `EXP.ReleaseNotes.isQuietUpgrade` (Task 3), `result.quiet` (Tasks 1, 5).

- [ ] **Step 1: Append failing tests to `WARD/tests-v3/quiet-releases.test.cjs`**

Append this constants line (WARD only runs on supported retailers; its changelog uses ` - `), then Appendix A **without its last test** (WARD's setting has no help text):

```js
const ID = 'ward', HOST = '#exp-ward-root', NAME = 'WARD', PAGE = 'https://www.amazon.com/', SEP = '-';
```

- [ ] **Step 2: Run to see them fail**

Run: `cd WARD && node --test tests-v3/quiet-releases.test.cjs`
Expected: FAIL on badge, label, quiet, and default tests.

- [ ] **Step 3: Implement**

`WARD/src/settings.js:25`: `updateNotifications: true,`

`WARD/src/ui.js`, add above `function showUpdateCard(` (line 85):

```js
  function markLauncherUpdate(result = {}) {
    if (!launcher) return;
    const ready = Boolean(result.available && result.latest);
    launcher.classList.toggle('update-available', ready);
    launcher.setAttribute('aria-label', ready ? `Open WARD · Update v${result.latest} Available` : 'Open WARD');
  }
```

Replace lines 774–775:

```js
    if(previous&&!EXP.ReleaseNotes.isQuietUpgrade(previous))showUpdateCard({},true,previous);
    if(EXP.Settings.snapshot().updateNotifications)EXP.Updates.check(false).then(r=>{markLauncherUpdate(r);if(r.available&&!r.quiet)showUpdateCard(r);});
```

In the toggle handler (line 566), add the badge update so turning checks on shows it immediately:

```js
        if(key==='updateNotifications' && value) EXP.Updates.check(true).then(result=>{markLauncherUpdate(result);notify(result.available?'A WARD update is available.':'WARD update check complete.');});
```

- [ ] **Step 4: Run the full suite**

Run: `cd WARD && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd WARD && git add src ward.user.js tests-v3 && git commit -m "feat: update badge, quiet updates, update checks on for new installs"
```

---

### Task 10: Rollout (requires the user's explicit go-ahead before Step 1)

Ask the user: "Ready to publish exp-core 3.7.7 and normal releases of all four products?" Proceed only on a clear yes. Start Step 1 just after a `:17` past the hour, so the hourly Core-sync bot has the longest window before its next run.

**Files:** none new; publishes the commits from Tasks 1–9.

- [ ] **Step 1: Publish exp-core**

```bash
cd exp-core && git fetch origin && git rebase origin/main && git push origin HEAD:main
```

Wait for the run: `../.release-tools/github-cli/bin/gh.exe run watch -R ExtraPotions/exp-core $(../.release-tools/github-cli/bin/gh.exe run list -R ExtraPotions/exp-core -L 1 --json databaseId --jq '.[0].databaseId') --exit-status`
Expected: success, and `gh release view v3.7.7 -R ExtraPotions/exp-core` exists.

- [ ] **Step 2: Re-sync each product from the published tag**

Run (each product): `node scripts/sync-exp-core.cjs v3.7.7 && git status --short vendor`
Expected: no diff (bytes equal the local sync from Task 5). If there is a diff, commit it as `chore: vendor exp-core 3.7.7`.

- [ ] **Step 3: Prepare normal releases** (each product, no `RELEASE_QUIET`)

```bash
RELEASE_NOTES_JSON='["Shows a badge on the launcher when an update is ready.","Checks for updates by default on new installs."]' npm run prepare:release:feature
```

- [ ] **Step 4: Verify**

Run: `cd Dropper && npm test`; then in PRISMA, SHIFT, and WARD: `npm test && npm run release:check` (the prepare script there does not rebuild).
Expected: all PASS, pin checks report `Vendored exp-core matches v3.7.7 byte-for-byte.`

- [ ] **Step 5: Recapture README screenshots** (menus show the version)

Run: `cd Dropper && node scripts/capture-screenshots.cjs`, `cd PRISMA && node scripts/capture-screenshots.cjs`, `cd SHIFT && node scripts/capture-screenshots.cjs`, `cd WARD && node scripts/capture-visuals.cjs`

- [ ] **Step 6: Commit and push each product**

```bash
git add -A && git commit -m "Release <Product> <version>: update badge and quiet release support" && git fetch origin && git rebase origin/main && git push origin HEAD:main
```

If `git rebase` shows the Core-sync bot already published a release (`Release <Product> <x>` on origin/main), stop for that product and tell the user; its version numbers need redoing.

- [ ] **Step 7: Confirm publication**

For each product: watch its `Publish release` run to success, then `curl -sL https://github.com/ExtraPotions/<Product>/releases/latest/download/<product>.user.js | grep -m1 @version` shows the new version.

---

## Appendix A: Product UI test block (Tasks 7, 8, 9)

Appended to each product's `quiet-releases.test.cjs` after that task's constants line (`ID`, `HOST`, `NAME`, `PAGE`, `SEP`). It reuses `read` and `QUIET_LINE` from the Task 3 part of the same file.

```js
const vm = require('node:vm');
const { chromium } = require('playwright');
const { loadSource } = require('./load-source.cjs');

const releasedVersions = () => [...read('src/release-notes.js').matchAll(/^\s*'(\d+\.\d+\.\d+)': \[/gm)].map(m => m[1]);
const body = (version, quiet) => `## ${version} ${SEP} 2026-10-12${quiet ? ' (quiet)' : ''}\n\n- First.\n- Second.`;

async function boot(t, { release = null, previous = null, quiet = null } = {}) {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let source = loadSource();
  if (quiet) source = source.replace(QUIET_LINE, `const QUIET_RELEASES = Object.freeze(${JSON.stringify(quiet)});`);
  await page.addInitScript(({ release, previous, id }) => {
    const values = new Map(previous ? [[`exp:v3:${id}:installed-version`, previous]] : []);
    window.GM_getValue = (k, f) => values.has(k) ? values.get(k) : f;
    window.GM_setValue = (k, v) => values.set(k, v);
    window.GM_deleteValue = k => values.delete(k);
    window.GM_xmlhttpRequest = o => {
      if (release && String(o.url).includes('api.github.com')) setTimeout(() => o.onload({ status: 200, responseText: JSON.stringify(release) }), 0);
      return { abort() {} };
    };
  }, { release, previous, id: ID });
  await page.route(`${PAGE}**`, r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><p>Quiet release fixture</p></body></html>' }));
  await page.goto(PAGE);
  await page.addScriptTag({ content: source });
  await page.waitForSelector(HOST, { state: 'attached' });
  return page;
}
const facts = page => page.locator(HOST).evaluate(host => {
  const launcher = host.shadowRoot.querySelector('[data-exp-part="launcher"]');
  const notice = host.shadowRoot.querySelector('[data-exp-floating-notice="1"]');
  return { badge: launcher.classList.contains('update-available'), label: launcher.getAttribute('aria-label'), card: Boolean(notice && !notice.hidden), text: notice?.textContent || '' };
});
const cardShown = page => page.waitForFunction(h => { const n = document.querySelector(h)?.shadowRoot?.querySelector('[data-exp-floating-notice="1"]'); return n && !n.hidden; }, HOST, { timeout: 5000 });
const badgeShown = page => page.waitForFunction(h => document.querySelector(h)?.shadowRoot?.querySelector('[data-exp-part="launcher"]')?.classList.contains('update-available'), HOST, { timeout: 5000 });

test('a normal available update shows the badge, label, and card (control)', async t => {
  const page = await boot(t, { release: { tag_name: 'v99.0.0', body: body('99.0.0', false) } });
  await cardShown(page);
  const f = await facts(page);
  assert.equal(f.badge, true);
  assert.equal(f.label, `Open ${NAME} · Update v99.0.0 Available`);
  assert.match(f.text, /Update Available/);
});

test('a quiet available update shows only the badge and label', async t => {
  const page = await boot(t, { release: { tag_name: 'v99.0.0', body: body('99.0.0', true) } });
  await badgeShown(page);
  await page.waitForTimeout(500);
  const f = await facts(page);
  assert.equal(f.card, false);
  assert.equal(f.label, `Open ${NAME} · Update v99.0.0 Available`);
});

test('Update Complete is skipped when every skipped release is quiet', async t => {
  const [current, previous] = releasedVersions();
  const page = await boot(t, { previous, quiet: [current] });
  await page.waitForTimeout(1500);
  assert.equal((await facts(page)).card, false);
});

test('Update Complete still shows when a skipped release was normal', async t => {
  const [current, , older] = releasedVersions();
  const page = await boot(t, { previous: older, quiet: [current] });
  await cardShown(page);
  assert.match((await facts(page)).text, /Update Complete/);
});

function loadSettings(stored) {
  const store = new Map(stored ? [[`exp:v3:${ID}:settings`, stored]] : []);
  const context = vm.createContext({
    EXP: { VERSION: 'fixture' }, location: { hostname: 'example.com' },
    ExtraPotionsCore: { cloneSettings: v => JSON.parse(JSON.stringify(v)), productDataResetting: () => false },
    GM_getValue: (k, f) => store.has(k) ? store.get(k) : f, GM_setValue: (k, v) => store.set(k, v),
  });
  vm.runInContext(read('src/settings.js'), context);
  context.EXP.Settings.load();
  return context.EXP.Settings.snapshot();
}

test('new installs check for updates by default; a saved false stays false', () => {
  assert.equal(loadSettings(null).updateNotifications, true);
  assert.equal(loadSettings({ schema: 1, updateNotifications: false }).updateNotifications, false);
});

test('the update setting no longer says "Off by default"', () => {
  assert.doesNotMatch(read('src/ui.js'), /Off by default/);
  assert.match(read('src/ui.js'), /Checks GitHub for new releases\. Never installs automatically\./);
});
```
