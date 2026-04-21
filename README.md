# Fit Signal Extension MVP

Local-first Chrome extension MVP for explaining supported apparel recommendations, size guidance, and risk points on product pages, with a standalone fit-advice entry for profile-only styling guidance.

## What is included

- MV3 extension scaffold with a React content panel and options page
- Standalone fit-advice page available directly from the extension action popup
- Lululemon, Reformation, and Skims parsers with non-apparel filtering
- Normalized apparel schema and taxonomy
- Rule-based recommendation engine with category-aware heuristics
- Profile-only advice engine for general questions like preferred lengths, waistlines, silhouettes, and necklines
- Local profile storage with import/export and ignore-similar rules
- Jest coverage for parser and recommendation behavior
- Phase 0 architecture notes in [docs/phase0/README.md](/Users/janegao/dev/online_sa/docs/phase0/README.md)

## Local setup

```bash
npm install
npm run build
```

Then load `/Users/janegao/dev/online_sa/dist` as an unpacked Chrome extension.

After loading the extension:

- Open the extension action to launch the standalone fit-advice page or profile settings.
- Visit a supported Lululemon, Reformation, or Skims product page to see product-specific recommendation overlays.

## Current limitation

The standalone page accepts front and side photos, but this MVP still uses them mainly as confidence signals and saved references. The dedicated vision-extraction stage described in the tech design has not been implemented yet, so the strongest advice still comes from the body specs and preference inputs.

## Useful scripts

```bash
npm run build
npm run typecheck
npm test
```

For larger recommendation-design changes, run the generated end-to-end fit judgment suite directly:

```bash
npx jest tests/generatedFitE2E.test.ts --runInBand
```
