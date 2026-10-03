# Core development reference

## Architecture

exp-core is the canonical implementation of shared ExtraPotions infrastructure. Product repositories consume a pinned released Core artifact; they do not define or feed shared behavior back into Core.

Shared launcher coordination, menu geometry and themes, diagnostics, notices, update chrome, compatibility controls, and other cross-product UI/runtime behavior belong here. Core also provides suite capability discovery, cross-product events, and shared page context so products can interoperate without importing one another's engines. Product role, suite priority, launcher placement priority, theme ownership priority, capabilities, presentation phases, and shared state schemas are defined once in the Core suite manifest. Known suite products cannot override those coordination fields at runtime; registration only supplies product identity, version, and product-specific state. Shared menu palettes are likewise published through the Core API, so theme ownership does not inspect another product's private DOM. Dropper, SHIFT, WARD, PRISMA, and future products keep only their product-specific engines and integrations.

Custom product surfaces use `createMenuController` for menu interactions without replacing their markup or geometry. They obtain the shared preferred size from `menuWidth()` and pass it through Core placement for viewport clamping. Width presets and persisted menu-width preferences are retired; device viewport tests do not represent selectable menu modes. Core-native `create` and `createProduct` use the same controller internally.

A released Core update is synchronized into each consumer, verified byte-for-byte against the pinned Core tag, tested with that product, and prepared as a product patch release automatically.

## Running the tests without a browser download

Tests run in a real browser through Playwright. If you would rather use the Chrome or Edge you already have installed:

```
npm run test:installed-browser
```

To run Core together with Dropper, SHIFT, WARD, and PRISMA rebuilt on this Core, the same check CI runs before a release (the product folders must sit beside this one, each with `npm ci` done):

```
npm run suite:local
```

Set `EXP_BROWSER_PATH` to pick a specific browser. Your product folders are copied to a temporary workspace and never modified.
