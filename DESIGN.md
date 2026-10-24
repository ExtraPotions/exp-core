---
name: ExtraPotions shared menu
description: Compact product-colored tools with one consistent side rail.
colors:
  dropper-bg: "#18181b"
  dropper-panel: "#1f1f23"
  dropper-line: "#848494"
  dropper-text: "#efeff1"
  dropper-muted: "#adadb8"
  dropper-accent: "#9146ff"
  dropper-focus: "#bf94ff"
typography:
  shell:
    fontFamily: '"Segoe UI", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
  title:
    fontFamily: '"Segoe UI", system-ui, sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: '"Segoe UI", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  help:
    fontFamily: '"Segoe UI", system-ui, sans-serif'
    fontSize: "11px"
    lineHeight: 1.5
rounded:
  menu: "12px"
  control: "6px"
  switch: "4px"
  switch-thumb: "2px"
spacing:
  standard-content: "6px"
  compact-content: "6px"
  mini-content: "6px"
  standard-row: "2px"
  compact-row: "2px"
  mini-row: "2px"
  rail-padding: "4px"
  rail-gap: "0"
  viewport-margin: "8px"
components:
  menu-standard:
    rounded: "{rounded.menu}"
    width: "324px"
  menu-compact:
    rounded: "{rounded.menu}"
    width: "304px"
  menu-mini:
    rounded: "{rounded.menu}"
    width: "280px"
  navigation-rail:
    width: "84px"
    padding: "{spacing.rail-padding}"
  outlined-control:
    rounded: "{rounded.control}"
    padding: "4px 7px"
  switch:
    rounded: "{rounded.switch}"
    width: "34px"
    height: "24px"
  header-action:
    rounded: "{rounded.control}"
    width: "44px"
    height: "44px"
  version:
    rounded: "{rounded.switch}"
    padding: "1px 4px"
---

# Design System: ExtraPotions shared menu

## Overview

**Creative North Star: "Compact product tools"**

The shared menu is a dense utility surface with a stable header, one side rail and a bounded content column. Product identity comes from the current approved gem and preserved product palette; common layout and controls make settings predictable across products. This document captures the implemented template, rather than introducing a second component framework.

Core owns the shell, sizing, help and System patterns. Each product owns its feature sections, data and permission decisions. The template applies to current and new consumers; product-specific controls retain their purpose and state.

**Key Characteristics:**

- Compact side rail with visible active selection.
- Current approved product gems and product-specific color roles.
- Outlined controls, rounded rectangles and in-place disclosure.
- One content scroller with independently scrollable navigation in short windows.

Sources: `src/menu-layout.js`, `src/lean-menu.js`, `src/menu-preferences.js`, `src/menu-typography.js`, `src/suite-contract.json` and [menu-template.md](docs/menu-template.md). The approved direction and verification captures are local evidence outside this product repository; they are not prerequisites for reading this specification.

## Colors

Color is supplied through the current product's `--theme-*` roles. The frontmatter's Dropper colors are the actual Twitch palette extracted from `lean-menu.js`, useful as a concrete rendered example, not a palette imposed on other products.

### Primary

- **Dropper accent:** the switch checked background. The lighter focus role marks keyboard focus and selected navigation.
- **Product accent:** preserve each consumer's existing `--theme-accent`, `--theme-accent2` and `--theme-focus` assignments. Theme choices and contrast mode remain product controlled.

### Neutral

- **Background and panel:** distinguish the menu canvas from outlined controls.
- **Text and muted:** distinguish primary labels from supporting copy.
- **Line:** separates the header, rail and setting rows. Outlined controls use the muted role for their border.

**The Product Identity Rule.** Reuse the current product's palette and approved source gem. Shared structure does not authorize replacement artwork or a new suite-wide accent. A separately authorized artwork refinement may update the gem without changing menu layout.

### Site colors

`site-colors.js` holds the shared page palettes (Default, Indigo, Blue, Green, Red, Gray), each with light and dark surface, text, line and accent tokens. They recolor a product's own site, not its menu: menus keep their product theme. `createSiteColors` keeps one owned style per product and follows the site's light/dark state; each product maps the tokens onto its site's own variables and keeps the site's brand and status colors. `createSiteColorControl` renders the Site colors select with the site's name as the Off option. A product may add its own palette through `extra` (WARD's Obsidian).

## Typography

Use the system UI stack recorded in the frontmatter. Labels and controls use 13px text; the header uses the title role. Changelog retains the product version in its accessible name, with an icon as its visible face. Subtitles and redundant supporting copy are omitted.

All three sizes keep the same readable type and dense row geometry, changing the outer width without scaling. Preserve normal case, wrapping labels and tabular numbers for numeric outputs.

## Layout

The 48px header contains the current approved gem, product name, changelog icon, donation heart and Close. The workspace is an 84px rail plus `minmax(0, 1fr)` content. Colored icons sit above visible navigation labels. Keep Support, diagnostics and confirmed Reset inside System; donations remain a separate header action. Look owns shared menu sizing alongside product-specific appearance settings.

| Density | Menu width | Content padding | Row block padding | General control minimum height |
| --- | --- | --- | --- | --- |
| Standard | `{components.menu-standard.width}` | `{spacing.standard-content}` | `{spacing.standard-row}` | 26px |
| Compact | `{components.menu-compact.width}` | `{spacing.compact-content}` | `{spacing.compact-row}` | 26px |
| Mini | `{components.menu-mini.width}` | `{spacing.mini-content}` | `{spacing.mini-row}` | 26px |

Values in braces refer to normative frontmatter. `menu-preferences.js` also exposes card widths (272/252/232px), which remain product-card preferences. The menu has viewport containment of `calc(100dvh - 16px)` and the content column has `calc(100dvh - 72px)` maximum height. Menus fit their content until that bound; the rail and content scroll independently in short windows. Keep the approved dense controls on touch and mouse, without scaling text.

Diagnostics buttons may wrap between words, never within “Diagnostics.” Product tab names and settings remain product specific; suite-contract section aliases are integration data, not a second visible navigation specification.

## Elevation & Depth

Flat product-colored surfaces, quiet group fills and simple borders carry structure. The outer menu uses one offset shadow; content groups add no shadows or gradients. Selected navigation uses a 22% accent2 mix. These formulas are state treatments, not new palette primitives. Existing notice placement and palette rules remain separate.

## Shapes

Use gently rounded rectangles with the menu, control, switch and thumb radii recorded in the frontmatter. Switches have a small rectangular thumb and an explicit checked state. Do not introduce checkbox controls or pill silhouettes. Existing product artwork and site-native launcher geometry remain distinct from the shared control language; Thread's native Reddit launcher handle is not a new menu shape token.

## Components

### Product gems

The current approved source assets share facet construction and balanced optical canvas use. Their SVGs use a `0 0 128 128` viewBox; this is an artwork source convention, not a new menu size or geometry token. Thread's original Pear Crystal is the unchanged reference. Dropper keeps the purple/graphite split with a transparent seam; SHIFT uses one joined cyan/blue/coral crystal; PRISMA keeps its spectrum triangle; WARD uses an octagonal cut rather than a shield.

**The Facet Construction Rule.** Use broad joined flat facets on a transparent canvas, with no inset symbols, lettering, strokes or gradients. Preserve each product's palette and distinct silhouette rather than forcing all products into one outline.

Read the approved source SVGs when updating artwork: `../Dropper/assets/dropper-launcher.svg`, `../SHIFT/assets/shift-launcher.svg`, `../PRISMA/assets/prisma-launcher.svg`, `../WARD/assets/ward-launcher.svg` and `../THREAD/assets/thread-gem.svg`. Artwork refinement requires its own authorization; shared-layout changes still preserve the current gems. Menu sizing, control shapes and theme tokens remain independent of these asset silhouettes.

### Header and navigation

Keep version/changelog, donation and Close separate. Inactive rail tabs are quiet; the selected tab retains its product-colored outline. Native tab keyboard behavior and focus survive open/close and content refresh. Headers contain the gem, product name and actions without taglines. Remove visible helper prose and redundant secondary labels; retain primary setting labels, actual state and consequential confirmations.

### Buttons, fields and switches

Use outlined product-panel controls with visible text and focus. The template focus treatment is recorded in the sidecar. Switches expose `role="switch"` and `aria-checked`; checked state changes both background and thumb position. Disabled actions must remain unavailable, rather than merely looking muted. Reset retains confirmation and theme-aware destructive colors.

Native selectors remain real, accessible pickers under a wrapping selected-value face. They share a row with their label; long values increase the row height. Short number/name controls use 56px where applicable. Everyday rows, actions and disclosures use a 26px minimum, switches use 34×24px, and header/navigation retain 44px targets. This density follows the user's reviewed web-layout approval. Setting labels activate their native control, without competing help-button roles. Header health shows abnormal states only; detailed recovery remains in System, with full-width red Reset last and its confirmation retained.

### Disclosures and System

Use native disclosure summaries for infrequent controls; help must not swallow their pointer or keyboard behavior. System groups Status, Support, optional settings transfer and Reset. Support pairs Show/Copy Diagnostics and offers Report a Problem. Keep real product destinations and consent contracts; do not invent update or issue links.

### Dropper-specific composition

Campaigns / Settings / Look / System is Dropper's visible navigation. Claim completed Drops, one Stream switching selector and Mute Opened Streams remain visible in Settings; Notifications and Advanced disclose in place. The selector offers off, normal and stopped-earning policies. A disabled held option explains manual protection, stream lock, temporary pause or a tab without navigation permission; it is a status, not a fourth selectable policy.

One progress card moves into the menu header slot when open and returns to its chat leaderboard slot or safe fallback when closed. Preserve game/reward identity, credited minutes and colored status. Outside actions are Pause or Resume, confirmed Skip and Menu; inside omits Menu. Active waiting shows Pause; manual pause shows Resume. Unknown progress stays unknown with Resume and Skip disabled. Skip preserves campaign, credit and manual pause. Restore native chat content when the card leaves. These semantics belong to Dropper and must not be generalized to other products' controls.

## Do's and Don'ts

### Do:

- **Do** reuse the Core-owned menu template and existing product identity.
- **Do** preserve feature settings, user consent and contextual recovery actions.
- **Do** keep active navigation, focus and final rail items reachable in narrow and short windows.
- **Do** distinguish local fixture evidence from installed-browser and live-service behavior.

### Don't:

- **Don't** introduce pills, checkbox controls or a second runtime UI framework.
- **Don't** replace product gems or palettes when changing shared layout.
- **Don't** add redundant Support/Reset navigation or duplicate progress surfaces.
- **Don't** treat a waiting credit state as manual pause or unknown progress as zero.

## Direct System actions
Reset All Settings is the last System section, separated from the preceding controls. Product-specific additions such as API access must be inserted before Reset. Preserve the two-tap confirmation and cancellation on focus loss.
The shared grouped System template exposes Show Diagnostics, Copy Diagnostics, Report a Problem and Reset All Settings directly. Do not hide these behind Support or Reset disclosures. Status and secondary settings transfer retain their own disclosure where appropriate. The reset button arms for four seconds on first activation and disarms on focus loss.
