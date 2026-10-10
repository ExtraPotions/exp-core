# Menu redesign: tabs, neutral surfaces, product accent

Date: 2026-10-09
Scope: exp-core's shared menu (`lean-menu.js`, `menu-arrangement.js`, related styles) and the four products that vendor it: Dropper, PRISMA, SHIFT and WARD.

## Problem

The user is unhappy with both the look and the structure of the menu.

- **Look:** each product tints the whole panel, controls are heavy, and spacing is loose.
- **Structure:** three nested ways to open things. Accordion sections hold inner tabs, inner tabs hold collapsible groups, and those hold divided rows.

The references are shadcn and ObsidianUI: neutral near-black surfaces, hairline borders, quiet labels and a single strong action.

## Decisions (made with the user, with mockups)

1. **Navigation:** the sections become main tabs.
2. **Color:** surfaces are neutral, and only a few elements use the product's accent.
3. **Inner level:** a second, lighter row of text tabs. Collapsible groups inside pages become plain labeled cards.

## Approach

Core reshapes each product's existing menu markup when the menu mounts, as it already does for the lean layout and for inner tabs. Products keep building their sections as today; no product rewrites its menu. All four get the redesign by vendoring the new Core.

## 1. Shell and header

**Panel**
- Width and the menu size preference are unchanged.
- Surface `#09090b`, border 1px `#27272a`, radius 16px, padding 0, and shadow `0 16px 44px #0006`.
- No footer.

**Header** (padding 14px 14px 12px)
- **Logo:** the product's icon, 30px, radius 8px.
- **Name and version:** the name is 14px/600. The version follows it in 11px muted text and still opens the changelog.
- **Status line:** replaces the product tagline.
  - It is a dot plus the label from the product's own health control (`[data-exp-health-state]`, read from anywhere in the panel), in 11.5px muted text.
  - Dot colors: green for working, amber for waiting or paused, red for failing or suspended, grey when unknown.
  - It updates whenever the health control changes.
  - If a product has no health control, its existing tagline stays.
- **Heart and close:** 26px outlined icon buttons with radius 7px.

**Under the header:** Dropper's progress card and the What's New notice sit directly below the header, above the tabs.

## 2. Main tabs

- Each product section (`.fl-tool-panel` with its `.fl-tool-header`) becomes one main tab, and its body becomes the tab's page. Section order is unchanged.
- **Segmented control:** background `#18181b`, radius 9px, padding 3px.
- **Tabs:**
  - Each tab is a 12px icon plus a short label in 11.5px.
  - The active tab is a raised `#27272a` segment with an inset 2px accent underline.
- **Icons:** Core's existing section icons.
- **Short labels** on the tab; the full name stays as the accessible name:
  - Appearance → Look
  - Protection → Protect
- **Narrow panels:** when the labels don't fit, tabs become icon-only and keep their accessible names.
- **Accessibility:** ARIA tablist semantics, with arrow keys, Home and End.
- **Remembered tab:**
  - The last tab opened is remembered per product (stored under the product's own key) and restored when the menu reopens.
  - The default is the first tab.
  - Links or actions that opened a specific section before (for example "open Diagnostics") select that tab.

## 3. Inner tabs

- The existing auto-generated inner tabs (`mountTabs` in `menu-arrangement.js`) become a light row of text tabs:
  - no background, 12px muted labels
  - the active tab gets the text color and an inset 2px accent underline
  - a 1px `#1c1c1f` rule under the row
- The row scrolls sideways if it overflows; tabs never wrap onto a second line.
- Arrow keys work as today.
- Pages with a single group show no inner tab row.

## 4. Content

**Groups (`details` disclosures)**
- Groups inside a page are always open and lose their open/close control.
- The summary becomes an 11px/500 muted label, followed by a card:
  - border 1px `#27272a`, radius 10px, background `#0c0c0e`
  - rows inside are 9px 11px, divided by 1px `#1c1c1f`
- The System tab's Status, Recent activity, Support and Reset become cards in the same way.
- Two disclosures are not groups and stay collapsible: Dropper's eligibility chip (`.eligibility-chip`) and SHIFT's "Why this appearance?" (`[data-shift-appearance-explanation]`). Core already treats both as inline, not as groups.

**Controls**
- **Switches:** 30×17. On is the accent with a dark knob; off is `#27272a` with a grey knob.
- **Selects:** outlined with radius 7px and 12px text.
- **Primary button:** filled with the accent, dark text, radius 8px. At most one per page.
  - Products mark their main action with `data-exp-primary="1"`; unmarked buttons are secondary. Core never guesses.
  - Each product marks one action per page where one exists: Dropper "Show drops inventory", PRISMA "Rescan page", SHIFT none, WARD "Reapply protection".
- **Secondary buttons:** outlined.
- **Destructive buttons** (Reset): red outline `#f87171`.

**Typography and color**
- Inter, Segoe UI or the system font. Body 13px, labels 11px.
- Text `#fafafa`, muted `#a1a1aa`.

## 5. Color and themes

**Neutral tokens:**

| Token | Value |
|---|---|
| bg | `#09090b` |
| card | `#0c0c0e` |
| line | `#27272a` |
| soft line | `#1c1c1f` |
| muted | `#a1a1aa` (the mockup's `#71717a` is only 4.1:1 on `#09090b`; `#a1a1aa` is 7.8:1) |
| text | `#fafafa` |

**Product accents (unchanged from today):**

| Product | Accent |
|---|---|
| Dropper | `#bc94f5` |
| PRISMA | `#91bfff` |
| SHIFT | `#80d7d2` |
| WARD | `#e7bb75` |

The accent is used only for:
- switches
- the active tab underlines
- the focus ring
- the primary button
- Dropper's progress bar

**Themes and preferences:**
- Users' existing menu themes (high contrast, warm, the Pride gradient skin and the others) keep working and override these tokens.
- Dropper's custom opacity setting keeps working.
- Contrast between text and surfaces meets WCAG AA. That includes muted labels on `#09090b` and dark text on each accent.

## 6. Testing

The Lean visual contract (`tests/lean-menu-visual-contract.test.cjs`) is replaced. For each product's installed build, it checks:

- **Structure**
  - The number of main tabs equals the number of product sections, in order.
  - The short labels and accessible names are correct.
  - No `details` element can be toggled inside a page.
  - There are at most two tab rows.
- **Look**
  - The panel's surface and border colors.
  - The accent per product: active tab underline, switch on, primary button.
  - No footer.
- **Layout:** no horizontal overflow at panel widths 320 and 360. Icon-only tabs at the narrow size.
- **Keyboard:** arrow keys and Home/End move between tabs on both rows, and focus is visible.
- **Behaviour**
  - The last tab is remembered across close and reopen.
  - Opening Diagnostics selects the System tab.
  - The status line follows health changes.
- **Themes:** a retained custom theme still changes the menu.

Product suites:
- Product tests that click section headers to open sections now select tabs instead.
- Product-specific checks (Dropper's progress card under the header, the shared System items) stay.

Screenshots of all four products go to the user for review before release.

## 7. Rollout

- exp-core 3.8.0, then normal releases of all four products, with release notes saying the menu was redesigned.
- README screenshots are recaptured with the shared screenshot tool. Its section and tab selectors are updated for tabs.

## Out of scope

- Light mode.
- New settings, or changes to what each section contains.
- The launcher button and its grid placement.
