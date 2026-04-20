# Phase 0 Deliverables

## 1. User Schema

The codebase uses a two-layer profile design:

- `UserInputProfile` stores raw inputs such as `height`, `weight`, optional manual measurements, future image URLs, explicit preferences, `useCases`, `avoidRules`, and `riskPreference`.
- `DerivedBodyProfile` stores recommendation-facing traits such as `legLine`, `shoulderPresence`, `waistDefinition`, `bustPresence`, `hipPresence`, and `torsoLength`.

This keeps Version A compatible with future image-derived body analysis without rewriting the engine contract.

## 2. Product Schema

`StructuredProduct` is the single normalized apparel model used by parser, normalizer, recommendation engine, and UI. It includes:

- Source and identity: `source`, `productId`, `url`, `title`
- Merchandising: `category`, `price`, `salePrice`, `currency`
- Fit inputs: `availableSizes`, `sizeChart`, `materials`, `productFeatures`
- Explanation inputs: `description`, structured `attributes`

## 3. Taxonomy

Supported apparel categories:

- `tops`
- `tees`
- `tanks`
- `shirts`
- `sweaters`
- `hoodies`
- `jackets`
- `outerwear`
- `dresses`
- `skirts`
- `pants`
- `leggings`
- `shorts`
- `jumpsuits`
- `rompers`
- `bodysuits`
- `bras`
- `underwear`
- `base_layers`

Excluded non-apparel keywords and classes:

- `bag`, `belt`, `bottle`, `mat`, `towel`, `keychain`
- `hat`, `glove`, `scarf`
- `accessory`, `equipment`

The parser rejects obvious non-apparel products before they enter the recommendation chain.

## 4. Output Schema

`RecommendationResult` is uniform across categories:

- `level`
- `sizeRecommendation`
- `reasons`
- `risks`
- `occasions`
- `confidenceNote`

## 5. Recommendation Engine Modules

The engine is intentionally layered:

1. Base rules evaluate profile completeness, explicit preferences, avoid rules, use-case alignment, and information sufficiency.
2. Category rules adjust scoring for tops, dresses, skirts, leggings, pants, shorts, outerwear, bras, bodysuits, jumpsuits, and rompers.
3. An explanation layer limits outputs to concise reasons, risks, and size guidance.

## 6. Project Structure

```text
src/
  content/        content script bootstrap, panel UI, injected styles
  engine/         profile derivation and recommendation logic
  normalizer/     raw parser output to shared schema
  options/        local profile editor and import/export UI
  parser/         lululemon page detection and field extraction
  shared/         shared contracts, defaults, taxonomy
  storage/        local storage wrappers and ignore-rule persistence
tests/            parser and engine tests
public/           manifest and options shell
scripts/          build pipeline
```

## 7. Version A Data Flow

1. The content script detects a Lululemon product page.
2. The parser extracts raw product signals from structured data and DOM.
3. The normalizer maps raw data into `StructuredProduct`.
4. The extension loads the local profile and ignore rules from storage.
5. The recommendation engine returns recommendation level, size guidance, reasons, risks, occasions, and confidence notes.
6. The React panel renders either a supported recommendation view or an unsupported non-apparel notice.
