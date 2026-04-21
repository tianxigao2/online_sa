import type { ParsedRawProduct, StructuredProduct } from "../shared/types"
import { mapRawProductToCanonical } from "./engine"
import type { CanonicalGarment, RawProductMappingPayload } from "./types"

const SIZE_ORDER = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "1X",
  "2X",
  "3X",
  "0",
  "2",
  "4",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "18",
  "20"
]

function dedupeStrings(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((value) => value!.replace(/\s+/g, " ").trim())
        .filter(Boolean)
    )
  )
}

function sortSizes(sizes: string[]): string[] {
  return [...new Set(sizes)].sort((left, right) => {
    const leftIndex = SIZE_ORDER.indexOf(left)
    const rightIndex = SIZE_ORDER.indexOf(right)
    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right)
    }
    if (leftIndex === -1) {
      return 1
    }
    if (rightIndex === -1) {
      return -1
    }
    return leftIndex - rightIndex
  })
}

function rawProductToMappingPayload(rawProduct: ParsedRawProduct): RawProductMappingPayload {
  return {
    site: rawProduct.source,
    brand: rawProduct.source,
    productId: rawProduct.productId,
    url: rawProduct.url,
    title: rawProduct.title,
    breadcrumbs: rawProduct.breadcrumbTrail,
    categoryTags: rawProduct.rawCategoryHint ? [rawProduct.rawCategoryHint] : [],
    descriptionBlocks: rawProduct.description ? [rawProduct.description] : [],
    bulletPoints: rawProduct.productFeatures ?? [],
    fabricNotes: rawProduct.materials ?? [],
    compositionText: rawProduct.materials?.join("; "),
    sizeOptions: sortSizes(rawProduct.availableSizes),
    sizeChart: rawProduct.sizeChart
  }
}

function legacyFit(canonical: CanonicalGarment): string | undefined {
  switch (canonical.shape.fitIntent) {
    case "second_skin":
    case "close_fit":
    case "fitted":
      return "slim"
    case "tailored":
    case "classic":
      return "classic"
    case "relaxed":
    case "oversized":
      return canonical.shape.fitIntent
    default:
      return undefined
  }
}

function legacySilhouette(canonical: CanonicalGarment): string | undefined {
  switch (canonical.shape.silhouette) {
    case "body_skimming":
      return "body_skimming"
    case "straight":
    case "column":
      return "streamlined"
    case "a_line":
    case "fit_and_flare":
      return "flared"
    case "boxy":
    case "oversized":
      return "boxy"
    default:
      return undefined
  }
}

function legacySleeve(canonical: CanonicalGarment): string | undefined {
  switch (canonical.shape.sleeveType) {
    case "short_sleeve":
      return "short"
    case "long_sleeve":
      return "long"
    case "sleeveless":
      return "sleeveless"
    default:
      return undefined
  }
}

function legacyLength(canonical: CanonicalGarment): string | undefined {
  return canonical.shape.length === "full_length" ? "full" : canonical.shape.length
}

function legacyWaistDefinition(canonical: CanonicalGarment): string | undefined {
  switch (canonical.shape.waistDefinition) {
    case "high":
    case "medium":
      return "defined"
    case "none":
    case "low":
      return "relaxed"
    default:
      return undefined
  }
}

function legacyWaistline(canonical: CanonicalGarment): string | undefined {
  if (canonical.shape.silhouette === "fit_and_flare") {
    return "fit_and_flare"
  }
  if (canonical.shape.waistRise === "high") {
    return "high"
  }
  if (canonical.shape.waistDefinition === "none") {
    return "none"
  }
  return undefined
}

function legacyLevel(value: string | undefined): string | undefined {
  switch (value) {
    case "medium_high":
      return "high"
    case "medium_low":
      return "low"
    default:
      return value
  }
}

function legacyFabricStructure(canonical: CanonicalGarment): string | undefined {
  if (canonical.construction.structureLevel === "high" || canonical.construction.structureLevel === "medium_high") {
    return "structured"
  }
  if (canonical.construction.surfaceSoftness === "high") {
    return "soft"
  }
  if (canonical.construction.structureLevel === "medium") {
    return "balanced"
  }
  return undefined
}

function legacyFabricDrape(canonical: CanonicalGarment): string | undefined {
  if (canonical.construction.drapeLevel === "high" || canonical.construction.drapeLevel === "medium_high") {
    return "fluid"
  }
  if (canonical.construction.drapeLevel === "clingy") {
    return "clingy"
  }
  if (canonical.construction.drapeLevel === "controlled" || canonical.construction.structureLevel === "medium_high") {
    return "controlled"
  }
  return undefined
}

function legacyVisualDetail(canonical: CanonicalGarment): string | undefined {
  switch (canonical.styleSemantics.ornamentationLevel) {
    case "high":
    case "medium_high":
      return "high"
    case "medium":
      return "medium"
    case "low":
      return canonical.styleSemantics.minimalismLevel === "high" ? "low" : undefined
    default:
      return undefined
  }
}

function legacyConstructionSupport(canonical: CanonicalGarment): string | undefined {
  if (canonical.construction.supportLevel) {
    return canonical.construction.supportLevel
  }
  if (canonical.construction.lining === "lined") {
    return "high"
  }
  if (canonical.construction.lining === "unlined") {
    return "light"
  }
  return undefined
}

function legacyOccasion(tag: string): string {
  switch (tag) {
    case "date_night":
      return "date night"
    case "wedding_guest":
      return "wedding guest"
    case "special_event":
    case "cocktail":
      return "occasion"
    case "office":
      return "work"
    case "everyday":
      return "casual"
    default:
      return tag
  }
}

function legacyAttributesFromCanonical(canonical: CanonicalGarment): StructuredProduct["attributes"] {
  return {
    fit: legacyFit(canonical),
    silhouette: legacySilhouette(canonical),
    neckline: canonical.shape.neckline,
    sleeve: legacySleeve(canonical),
    strapStyle: canonical.shape.strapType,
    strapWidth: canonical.shape.strapWidth,
    waistline: legacyWaistline(canonical),
    waistDefinition: legacyWaistDefinition(canonical),
    waistRise: canonical.shape.waistRise,
    length: legacyLength(canonical),
    supportLevel: canonical.construction.supportLevel,
    coverage: canonical.construction.coverage,
    compression: legacyLevel(canonical.construction.compressionLevel),
    stretch: legacyLevel(canonical.construction.stretchLevel),
    fabricStructure: legacyFabricStructure(canonical),
    fabricDrape: legacyFabricDrape(canonical),
    visualDetail: legacyVisualDetail(canonical),
    constructionSupport: legacyConstructionSupport(canonical),
    releasePoint: canonical.shape.releasePoint,
    lining: canonical.construction.lining,
    intendedUse: Array.from(new Set((canonical.occasionSemantics.occasionTags ?? []).map(legacyOccasion)))
  }
}

export function normalizeParsedRawProduct(rawProduct: ParsedRawProduct): StructuredProduct {
  const payload = rawProductToMappingPayload(rawProduct)
  const canonical = mapRawProductToCanonical(payload)
  const materials = dedupeStrings(rawProduct.materials ?? [])
  const productFeatures = dedupeStrings(rawProduct.productFeatures ?? [])

  return {
    source: rawProduct.source,
    productId: rawProduct.productId,
    url: rawProduct.url,
    title: rawProduct.title,
    category: canonical.identity.sourceCategory ?? "unknown",
    price: rawProduct.price,
    salePrice: rawProduct.salePrice,
    currency: rawProduct.currency,
    availableSizes: payload.sizeOptions ?? [],
    sizeChart: rawProduct.sizeChart,
    description: rawProduct.description,
    materials,
    productFeatures,
    attributes: legacyAttributesFromCanonical(canonical),
    canonical
  }
}
