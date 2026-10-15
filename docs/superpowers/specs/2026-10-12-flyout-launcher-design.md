# Flyout launcher: one launcher per page, placed per site

Date: 2026-10-12
Scope: exp-core's launcher, menu and notice placement (`runtime.js` launcher grid, `placeMenu`, `placeNotice`) and the four products that vendor it: Dropper, PRISMA, SHIFT and WARD. Dropper adds the progress strip and ring.
Approved mockups: [`2026-10-12-flyout-launcher/`](2026-10-12-flyout-launcher/) (`flyout-1.png` to `flyout-6.png`, close-ups `zoom-*.png`).

## Problem

Measured on a live Twitch channel (/jynxzi, signed out) at 1600×900 and 1280×720 with all four products loaded:

- **Launchers:** the four launchers stack into a 216px column over the bottom of Twitch chat. They cover the chat input's emote button, the row under it and the Sign Up button in Twitch's banner.
- **Progress card:** the closed card covers the newest chat messages.
- **Menus:** an open menu covers all of chat and overlaps the right edge of the video by about 47px.

The grid's cost is four permanent tiles, wherever they sit.

## Decisions (made with the user, with mockups)

1. **Flyout instead of the grid, for all products.** Each page shows one launcher. Clicking it opens a flyout with each running product at full size.
2. **The launcher shows the leading product's icon plus a "+N" count** of the other running products.
   - **Leading product:** the product made for the site leads (Dropper on Twitch, WARD on retailers). Otherwise the first running product in suite order leads: Dropper, SHIFT, PRISMA, WARD.
   - **One product running:** no count, and clicking opens that product's menu directly.
3. **Placement is per site.** Twitch puts the launcher in its top bar. Every other site keeps the bottom-right corner and keeps steering around site controls.
4. **Menus open from the flyout.**
5. **Dropper progress** uses a strip on the page and a ring on the launcher. Badge Only still decides which one shows.
6. **Update notices and changelogs** keep working through the flyout, as described below.

## 1. Launcher

- **Size:** 40px in the Twitch top bar, 48px in the corner. Rounded square with radius 10px (12px at 48px).
- **Icon:** the leading product's launcher art.
- **Count "+N":** a rounded rectangle at the bottom-right corner, overhanging by 5px.
  - Background `#27272a`, border 1px `#3f3f46`, and a 2px outline in the page background.
  - Text 10px/600 `#fafafa`.
  - Never a pill.
- **Update marker:** a 10px rounded square (radius 3px) at the top-right corner, overhanging by 4px.
  - It uses the updating product's accent and has a 2px outline in the page background.
  - It marks real state only.
- **Interaction:**
  - It opens on click, not hover.
  - It is a button that announces whether the flyout is open.
  - Escape or clicking elsewhere closes the flyout and returns focus to the launcher.

## 2. Flyout

- **Panel:** a rounded rectangle with radius 12px.
  - Surface `#09090b`, border 1px `#27272a`, padding 7px.
  - 6px gap between tiles, shadow `0 12px 32px #0008`.
- **Contents:** the running products in suite order, each as its own 40px launcher in its accent.
  - The open product's tile shows a full accent border.
  - A product with an update carries the update marker.
- **Keyboard:** arrow keys move between products, and Enter opens a product's menu.
- **Direction:** on Twitch the flyout drops down from the top bar. In the corner it opens upward.

## 3. Placement table (Core)

Core owns a small table that maps each site to a launcher slot. Products declare nothing. Adding a site means adding one row.

- **Twitch:** the slot is in the top bar, between the search box and the inbox icon.
  - Measured signed out: x ≈ 1000–1360 at 1600px wide, and ≈ 860–1030 at 1280px.
  - The flyout, menus and notices drop into the chat column, right-aligned 8px from the window edge. They cover chat while open and never cover the video.
- **Every other site:** the bottom-right corner, as Core places launchers today, with the flyout, menus and notices opening upward.
- **Fallback:** if the site slot is missing or too narrow (the layout changed, a narrow window, or the signed-in top bar is fuller), Core falls back to the corner.

## 4. Dropper progress

- **Badge Only off:** progress shows as a one-row strip over Twitch's "Stream Chat" title bar.
  - It shows the channel (13px/600), the percent in the Dropper accent, a 4px bar and the minutes (12px muted).
  - Surface `#09090b`, border 1px `#27272a`, radius 8px, 32px tall.
  - Clicking the strip opens the full progress card.
- **Badge Only on:** progress shows only at the top of the Dropper menu, as in 3.4.37.
- **Ring:** the ring shows on the launcher on Twitch, whichever product leads.
  - **Geometry:** it is concentric with the launcher, with the stroke centre 3px outside its edge.
    - Corner radius is the launcher's radius plus 3px, and the stroke is 2px.
    - That leaves an even 2px gap on every side and corner.
  - **Colours and direction:** the track is `#3f3f46` and the fill is the Dropper accent. It starts at the top centre and fills clockwise.
  - **Gaps:** it breaks with 3px clearance around the count, and around the update marker when one shows. Nothing overlaps the ring.
  - **Border:** while the ring shows, the launcher's own border is neutral (`#52525b`), so it cannot read as progress.
  - **Shared element:** it is one shared Core element, sized from the launcher's size and radius.

## 5. Update notices and changelogs

- **Update card:** shows for 30 seconds under the launcher, or above it when the launcher sits at the bottom of the window. It uses the menu's column and width.
- **Several updates:** updates from several products queue and show one at a time.
- **Quiet releases:** these show only the update marker, on the product's flyout icon and on the launcher corner.
- **Changelog:** opens from the version in that product's menu and sits beyond the menu, as `placeNotice` does today.

## Build decisions (2026-10-12)

- **Drag:** the corner launcher keeps vertical drag, its saved position and the reset control. Reordering is removed, because the flyout uses suite order. The Twitch top-bar launcher cannot be dragged.
- **Shortcuts:** a product shortcut opens that product's menu directly, with the flyout shown open and that product selected.
- **Signed-in Twitch:** the slot is found on the page between the search box and Twitch's right-hand icons (about 360px wide signed in at 1879px). Narrower than 48px, or with search collapsed, uses the corner.
- **Theater mode and fullscreen:** the top bar is hidden, so the launcher uses the corner.
- **Version:** Core 3.9.0. Products release first, then Core.

## Constraints

- Keep the established GUI: neutral surfaces, the product accents, rounded squares and rectangles, and toggle switches. No pills or checkboxes.
- This is a breaking Core change for the products' launcher and placement tests. Push the four product release commits first, then Core, then re-run the products' failed publish runs.

## To verify during the build

- Measure the Twitch top bar signed in, because it shows more icons than signed out.
- Check how Twitch's layout changes at narrow widths, where chat collapses or moves.
- Test keyboard and focus order through the launcher, flyout, menu and back.
- Test contrast of the count and marker on light and dark sites.
- Check the 360px and short-window layouts in the corner placement.
