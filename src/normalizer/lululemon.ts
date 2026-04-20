import { classifyApparelCategory, inferOccasionsFromText } from "../shared/taxonomy"
import type { ParsedRawProduct, StructuredProduct } from "../shared/types"

const ATTRIBUTE_MAP = {
  fit: {
    relaxed: ["relaxed", "roomy", "easy fit"],
    slim: ["slim", "close-to-body", "close to body", "fitted"],
    oversized: ["oversized"],
    classic: ["classic fit"],
    compressive: ["compressive"]
  },
  silhouette: {
    body_skimming: ["body-skimming", "body skimming"],
    streamlined: ["streamlined"],
    boxy: ["boxy"],
    flared: ["flare", "flared"]
  },
  neckline: {
    crew: ["crewneck", "crew neck"],
    v_neck: ["v-neck", "v neck"],
    scoop: ["scoop"],
    square: ["square neck", "square-neck"],
    halter: ["halter"]
  },
  sleeve: {
    sleeveless: ["sleeveless"],
    short: ["short sleeve", "short-sleeve"],
    long: ["long sleeve", "long-sleeve"]
  },
  strapStyle: {
    racerback: ["racerback"],
    crossback: ["cross-back", "cross back"],
    spaghetti: ["spaghetti strap", "thin strap"]
  },
  strapWidth: {
    thin: ["spaghetti strap", "thin strap", "skinny strap"],
    medium: ["tank strap", "tank shoulder"],
    wide: ["wide strap", "broad strap"]
  },
  waistline: {
    none: ["straight fit", "boxy fit", "relaxed through the waist"],
    natural: ["waist length", "natural waist"],
    high: ["high-rise", "super-high-rise", "high rise"],
    empire: ["empire waist"],
    wrap: ["wrap front", "wrap silhouette"],
    gathered: ["gathered waist", "smocked waist"],
    fit_and_flare: ["fit-and-flare", "fit and flare"]
  },
  waistDefinition: {
    defined: ["defined waist", "waist-defining"],
    relaxed: ["relaxed through the waist"]
  },
  waistRise: {
    high: ["high-rise", "high rise", "super-high-rise", "super high rise"],
    mid: ["mid-rise", "mid rise"],
    low: ["low-rise", "low rise"]
  },
  length: {
    cropped: ["cropped", "crop length"],
    waist: ["waist length"],
    hip: ["hip length"],
    mini: ["mini"],
    midi: ["midi"],
    maxi: ["maxi"],
    full: ["full length", "full-length"]
  },
  supportLevel: {
    light: ["light support"],
    medium: ["medium support"],
    high: ["high support"]
  },
  coverage: {
    skimpy: ["skimpy coverage"],
    medium: ["medium coverage"],
    full: ["full coverage"]
  },
  compression: {
    low: ["softly supportive", "gentle compression"],
    medium: ["supportive", "hugged sensation"],
    high: ["compressive", "held-in feel", "held in feel"]
  },
  stretch: {
    low: ["structured"],
    high: ["high-stretch", "high stretch", "buttery-soft", "buttery soft"],
    medium: ["four-way stretch", "4-way stretch"]
  },
  fabricStructure: {
    soft: ["soft", "buttery-soft", "buttery soft"],
    balanced: ["smooth", "streamlined"],
    structured: ["structured", "tailored", "sculpting", "firm handfeel"]
  },
  fabricDrape: {
    fluid: ["draped", "flowy", "fluid", "swingy"],
    controlled: ["streamlined", "holds shape", "structured"],
    clingy: ["body-skimming", "close-to-body", "hugged sensation", "second-skin"]
  },
  visualDetail: {
    low: ["minimalist", "clean lines", "solid"],
    medium: ["panelled", "textured"],
    high: ["ruffle", "pleat", "graphic", "print", "shine", "glossy"]
  },
  constructionSupport: {
    light: ["unlined"],
    medium: ["built-in shelf bra", "shelf bra", "double-layer"],
    high: ["princess seam", "darted", "lined", "contoured seams", "tailored"]
  },
  releasePoint: {
    early: ["swing silhouette", "tiered", "trapeze", "drop away"],
    controlled: ["fit-and-flare", "seamed waist", "contoured fit"]
  },
  lining: {
    lined: ["lined"],
    unlined: ["unlined"]
  }
} as const

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

function pickAttribute(
  text: string,
  candidates: Record<string, readonly string[]>
): string | undefined {
  const normalized = text.toLowerCase()
  return Object.entries(candidates).find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword))
  )?.[0]
}

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

export function normalizeLululemonProduct(rawProduct: ParsedRawProduct): StructuredProduct {
  const analysisText = [
    rawProduct.title,
    rawProduct.description,
    rawProduct.productFeatures?.join(" "),
    rawProduct.materials?.join(" "),
    rawProduct.rawCategoryHint
  ]
    .filter(Boolean)
    .join(" ")

  return {
    source: "lululemon",
    productId: rawProduct.productId,
    url: rawProduct.url,
    title: rawProduct.title,
    category: classifyApparelCategory(
      rawProduct.rawCategoryHint,
      rawProduct.title,
      rawProduct.description,
      rawProduct.breadcrumbTrail.join(" ")
    ),
    price: rawProduct.price,
    salePrice: rawProduct.salePrice,
    currency: rawProduct.currency,
    availableSizes: sortSizes(rawProduct.availableSizes),
    sizeChart: rawProduct.sizeChart,
    description: rawProduct.description,
    materials: dedupeStrings(rawProduct.materials ?? []),
    productFeatures: dedupeStrings(rawProduct.productFeatures ?? []),
    attributes: {
      fit: pickAttribute(analysisText, ATTRIBUTE_MAP.fit),
      silhouette: pickAttribute(analysisText, ATTRIBUTE_MAP.silhouette),
      neckline: pickAttribute(analysisText, ATTRIBUTE_MAP.neckline),
      sleeve: pickAttribute(analysisText, ATTRIBUTE_MAP.sleeve),
      strapStyle: pickAttribute(analysisText, ATTRIBUTE_MAP.strapStyle),
      strapWidth: pickAttribute(analysisText, ATTRIBUTE_MAP.strapWidth),
      waistline: pickAttribute(analysisText, ATTRIBUTE_MAP.waistline),
      waistDefinition: pickAttribute(analysisText, ATTRIBUTE_MAP.waistDefinition),
      waistRise: pickAttribute(analysisText, ATTRIBUTE_MAP.waistRise),
      length: pickAttribute(analysisText, ATTRIBUTE_MAP.length),
      supportLevel: pickAttribute(analysisText, ATTRIBUTE_MAP.supportLevel),
      coverage: pickAttribute(analysisText, ATTRIBUTE_MAP.coverage),
      compression: pickAttribute(analysisText, ATTRIBUTE_MAP.compression),
      stretch: pickAttribute(analysisText, ATTRIBUTE_MAP.stretch),
      fabricStructure: pickAttribute(analysisText, ATTRIBUTE_MAP.fabricStructure),
      fabricDrape: pickAttribute(analysisText, ATTRIBUTE_MAP.fabricDrape),
      visualDetail: pickAttribute(analysisText, ATTRIBUTE_MAP.visualDetail),
      constructionSupport: pickAttribute(analysisText, ATTRIBUTE_MAP.constructionSupport),
      releasePoint: pickAttribute(analysisText, ATTRIBUTE_MAP.releasePoint),
      lining: pickAttribute(analysisText, ATTRIBUTE_MAP.lining),
      intendedUse: inferOccasionsFromText(
        rawProduct.title,
        rawProduct.description,
        rawProduct.productFeatures?.join(" ")
      )
    }
  }
}
