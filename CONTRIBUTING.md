# Contributing

Two rules, both non-negotiable:

1. **Zero runtime dependencies.** Node built-ins only.
2. **Deterministic.** No `Math.random`, no `Date.now`, no locale-dependent formatting.
   Same input must produce byte-identical output, forever.

Everything else is open: new rock types, new entropy mappings, new renderers, better glyphs.

## Running the tests

```
npm test
```

Under a restricted sandbox the per-file test runner cannot spawn children; use:

```
npm run test:sandbox
```

## Adding a rock type

Add an entry to `ROCKS` in `src/palette.mjs` with a name, an RGB triple, a Unicode glyph
and an ASCII glyph. Both glyphs are required: the ASCII fallback is not allowed to erase
rock identity. Then extend the rock list in `src/model.mjs` so the hash maps onto it.
