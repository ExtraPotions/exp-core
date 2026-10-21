# ExtraPotions menu template

All product menus use the Core-owned `extrapotions-menu-v1` template, exposed as
`ExtraPotionsCore.menuTemplate`. Impeccable is design and review guidance; it is
not a runtime framework, component library, or a second visual style.

The extracted tokens and durable visual rules are in [DESIGN.md](../DESIGN.md),
with component previews and extension metadata in `.impeccable/design.json`.
Product-specific controls and palettes remain owned by their products.

## Shared structure

- Header: the product's existing gem, name, version/changelog chip, donation heart and Close.
- Sidebar: product feature sections, Look and System. No separate Support or Reset navigation.
- Look: shared Standard/Compact/Mini menu sizing; product-specific appearance choices remain available.
- System: Status, Support with paired Show/Copy Diagnostics and Report a Problem, optional settings transfer, and confirmed Reset.
- Settings: shared outlined controls, rectangular toggles, in-place disclosures, readable text, visible focus, and selective contained hover/focus help.
- One content scroller with a visible header, shared viewport containment and menu stacking.

Products supply their colors, badge, feature controls and health/data callbacks.
They do not copy the shell, help engine, diagnostic-button styling or reset UI.
Site-specific launcher docking is owned by Core. Thread's Reddit launcher uses
the native circular handle shape/size; other sites retain their established placement.

Dropper uses Campaigns, Settings, Look and System. Settings keeps Claim completed
Drops, one Stream switching policy selector and Mute Opened Streams visible;
Notifications and Advanced expand in place. Advanced retains interruption,
playback, recovery, backup and context controls. Existing saved preferences migrate
without discarding user pause, navigation permission or campaign priority.

Dropper's single progress card moves into the header slot while its menu is open,
and returns to the chat leaderboard slot or safe fallback when closed. The row is
credited minutes / Pause or Resume / confirmed Skip / Menu; Menu is omitted inside
the menu. Active waiting uses Pause; manual pause uses Resume. No reward means
unknown minutes and disabled Resume/Skip. Skip preserves the campaign, credit and
manual pause. Native chat content is restored whenever the card leaves its slot.

The shared shell uses an 84px rail, 7px corners and 32x22px rectangular switches.
Sizes adjust layout and controls while preserving readable type. Diagnostics can
wrap between words, never within Diagnostics. In short windows the navigation
rail scrolls independently so its last section stays keyboard reachable.

## New products

Register the product in the suite contract using the development guide. Build
feature sections with vanilla DOM controls. Use `createProduct` for the shell;
the template is mounted automatically. Existing custom-shell adapters also mount
the same template through `createMenuController` and the shared size binding.
Do not introduce another custom shell for a new product.

```js
const health = ExtraPotionsCore.createProductTimeline(id, getHealth, notify, {
  layout: 'grouped', showActivity: false,
});
const diagnostics = ExtraPotionsCore.createDiagnosticsControls(getDiagnostics, notify);
const renderSystem = () => ExtraPotionsCore.createProductSystem({
  id, version, timeline: health.element, diagnostics,
  preferences: renderSettingsTransfer(), onReset, notify,
}); // grouped is the default
const product = ExtraPotionsCore.createProduct({
  id, name, version, artwork, theme, getSettings, onSettings,
  sections: [
    ...featureSections,
    {id: 'look', label: 'Look', render: renderLook},
    {id: 'system', label: 'System', render: renderSystem},
  ],
});
```

Dispose product health listeners with the product lifecycle. Add help with
`setMenuHelp` only where an explanation helps; native disclosure summaries must
retain their normal click and keyboard behavior. Do not invent update, issue or
install destinations before they exist.

Regression expectations: the template marker is present, System remains
keyboard/mouse reachable, redundant shortcuts are absent, diagnostics and Reset
work inside System, Reset All Settings follows every other System section with
extra spacing above it, product colors/badges remain intact, and desktop/narrow/short
layouts contain their controls. Capture the built menus rather than describing
fixture tests as installed-browser proof.
