'use strict';

/**
 * ExtraPotions shared chrome contract.
 * Product userscripts remain self-contained; this module defines the suite baseline
 * that products consume through the canonical Core bundle.
 */
const VERSION = '3.3.3';
const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const UPDATE_NOTICE_DURATION_MS = 30 * 1000;
const MENU_DISMISS_MS = 15 * 1000;

const chromeContract = Object.freeze({
  artwork: Object.freeze({
    menuBadge: 'borderless',
    menuBadgeSize: 38,
    launcherButtonSize: 48,
    launcherArtworkSize: 40,
    launcherGapSize: 8,
    sourceBadgeSize: 128,
    dropperProgressRingSize: 44,
    siblingProgressRings: false,
    launcherOwnsChrome: true,
  }),
  header: Object.freeze({
    divider: 'soft-edge-fade',
    prideDivider: 'full-gradient',
    versionAction: 'changelog',
  }),
  notices: Object.freeze({
    placement: 'menu-width-card',
    openMenuPlacement: 'above-menu',
    closedMenuPlacement: 'launcher-relative',
    gapPx: 8,
    insideMenu: false,
    durationMs: UPDATE_NOTICE_DURATION_MS,
    actions: Object.freeze(['release', 'install']),
    changelogReleaseAction: true,
    updateComplete: true,
    updateAvailable: true,
  }),
  updates: Object.freeze({
    intervalMs: UPDATE_CHECK_INTERVAL_MS,
    releaseSource: 'github-releases',
    versionScopedThrottle: true,
    freshCheckPerInstalledVersion: true,
  }),
  menu: Object.freeze({
    dismissMs: MENU_DISMISS_MS,
    widthPx: 288,
    sizing: 'viewport-clamped',
    dockPaddingInlinePx: 9,
    badgeOnlyProgress: Object.freeze({
      placement: 'menu-content',
      width: '100%',
      outerBleed: false,
    }),
  }),
});

function compareVersions(left, right) {
  const a = String(left || '').replace(/^v/, '').split(/[.-]/).slice(0, 3).map((part) => Number(part) || 0);
  const b = String(right || '').replace(/^v/, '').split(/[.-]/).slice(0, 3).map((part) => Number(part) || 0);
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

function createReleaseConfig({ productId, repository, currentVersion, scriptName }) {
  if (!productId || !repository || !currentVersion || !scriptName) throw new Error('Incomplete release config');
  return Object.freeze({
    productId,
    repository,
    currentVersion,
    endpoint: `https://api.github.com/repos/${repository}/releases/latest`,
    releasesUrl: `https://github.com/${repository}/releases`,
    installUrl: `https://raw.githubusercontent.com/${repository}/main/${scriptName}`,
    checkIntervalMs: UPDATE_CHECK_INTERVAL_MS,
    noticeDurationMs: UPDATE_NOTICE_DURATION_MS,
  });
}

module.exports = Object.freeze({
  VERSION,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_NOTICE_DURATION_MS,
  MENU_DISMISS_MS,
  chromeContract,
  compareVersions,
  createReleaseConfig,
});
