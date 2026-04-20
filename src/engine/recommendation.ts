import { deriveBodyProfile, normalizeUserProfile } from "./profile"
import type {
  ApparelCategory,
  AttributeFamily,
  IgnoreRule,
  RecommendationResult,
  StructuredProduct,
  StyleAdviceResult,
  UserInputProfile
} from "../shared/types"

type SizeConfidence = "high" | "medium" | "low"
type AttributeId =
  | "square_neck"
  | "scoop_neck"
  | "v_neck"
  | "crew_neck"
  | "halter_neck"
  | "defined_waist"
  | "natural_waist"
  | "high_waist"
  | "low_rise"
  | "empire_waist"
  | "no_waist_definition"
  | "straight_column"
  | "bias_skim"
  | "a_line"
  | "fit_and_flare"
  | "bodycon"
  | "trapeze"
  | "wide_strap"
  | "thin_strap"
  | "tank_shoulder"
  | "cap_sleeve"
  | "sleeveless"
  | "mini_length"
  | "knee_length"
  | "midi_length"
  | "maxi_length"
  | "cropped_length"
  | "full_length"
  | "structured_fabric"
  | "controlled_stretch"
  | "fluid_drape"
  | "clingy_finish"
  | "low_visual_detail"
  | "high_visual_detail"

type AttributeState = Record<AttributeId, { score: number; reasons: string[] }>

const NUMERIC_SIZES = ["0", "2", "4", "6", "8", "10", "12", "14", "16", "18", "20"]
const ALPHA_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]

const ATTRIBUTE_FAMILIES: Record<AttributeFamily, AttributeId[]> = {
  neckline: ["square_neck", "scoop_neck", "v_neck", "crew_neck", "halter_neck"],
  waistline: ["defined_waist", "natural_waist", "high_waist", "low_rise", "empire_waist", "no_waist_definition"],
  silhouette: ["straight_column", "bias_skim", "a_line", "fit_and_flare", "bodycon", "trapeze"],
  strapSleeve: ["wide_strap", "thin_strap", "tank_shoulder", "cap_sleeve", "sleeveless"],
  length: ["mini_length", "knee_length", "midi_length", "maxi_length", "cropped_length", "full_length"],
  fabric: [
    "structured_fabric",
    "controlled_stretch",
    "fluid_drape",
    "clingy_finish",
    "low_visual_detail",
    "high_visual_detail"
  ]
}

const ATTRIBUTE_TO_FAMILY = Object.entries(ATTRIBUTE_FAMILIES).reduce<Record<AttributeId, AttributeFamily>>(
  (record, [family, attributes]) => {
    attributes.forEach((attribute) => {
      record[attribute] = family as AttributeFamily
    })
    return record
  },
  {} as Record<AttributeId, AttributeFamily>
)

const ALL_STYLE_FAMILIES: AttributeFamily[] = ["neckline", "waistline", "silhouette", "strapSleeve", "length", "fabric"]

const CATEGORY_FAMILIES: Record<ApparelCategory, AttributeFamily[]> = {
  tops: ["neckline", "waistline", "strapSleeve", "fabric"],
  tees: ["neckline", "waistline", "strapSleeve", "fabric"],
  tanks: ["neckline", "waistline", "strapSleeve", "fabric"],
  shirts: ["neckline", "waistline", "strapSleeve", "fabric"],
  sweaters: ["neckline", "waistline", "fabric"],
  hoodies: ["waistline", "silhouette", "fabric"],
  jackets: ["neckline", "waistline", "silhouette", "length", "fabric"],
  outerwear: ["neckline", "waistline", "silhouette", "length", "fabric"],
  dresses: ["neckline", "waistline", "silhouette", "strapSleeve", "length", "fabric"],
  skirts: ["waistline", "silhouette", "length", "fabric"],
  pants: ["waistline", "silhouette", "length", "fabric"],
  leggings: ["waistline", "silhouette", "length", "fabric"],
  shorts: ["waistline", "silhouette", "length", "fabric"],
  jumpsuits: ["neckline", "waistline", "silhouette", "strapSleeve", "length", "fabric"],
  rompers: ["neckline", "waistline", "silhouette", "strapSleeve", "length", "fabric"],
  bodysuits: ["neckline", "waistline", "strapSleeve", "fabric"],
  bras: ["neckline", "strapSleeve", "fabric"],
  underwear: ["fabric"],
  base_layers: ["neckline", "waistline", "silhouette", "fabric"],
  unknown: ["waistline", "silhouette", "fabric"]
}

const PREFERENCE_ATTRIBUTE_MAP: Array<[RegExp, AttributeId]> = [
  [/square/i, "square_neck"],
  [/scoop/i, "scoop_neck"],
  [/v[ -]?neck/i, "v_neck"],
  [/crew|crewneck/i, "crew_neck"],
  [/halter/i, "halter_neck"],
  [/defined|waist/i, "defined_waist"],
  [/high/i, "high_waist"],
  [/low/i, "low_rise"],
  [/empire/i, "empire_waist"],
  [/column|straight/i, "straight_column"],
  [/skim|skimming/i, "bias_skim"],
  [/a-line|flare|flared/i, "a_line"],
  [/fit-and-flare|fit and flare/i, "fit_and_flare"],
  [/bodycon|slim|fitted/i, "bodycon"],
  [/trapeze|boxy|oversized/i, "trapeze"],
  [/wide strap/i, "wide_strap"],
  [/thin strap|spaghetti/i, "thin_strap"],
  [/tank/i, "tank_shoulder"],
  [/cap sleeve|short sleeve/i, "cap_sleeve"],
  [/sleeveless/i, "sleeveless"],
  [/mini/i, "mini_length"],
  [/knee/i, "knee_length"],
  [/midi/i, "midi_length"],
  [/maxi/i, "maxi_length"],
  [/crop/i, "cropped_length"],
  [/full/i, "full_length"],
  [/structured|tailored/i, "structured_fabric"],
  [/stretch|support/i, "controlled_stretch"],
  [/flowy|fluid|drape/i, "fluid_drape"],
  [/cling|body skimming/i, "clingy_finish"],
  [/minimal|clean/i, "low_visual_detail"],
  [/print|ruffle|detail/i, "high_visual_detail"]
]

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function round(value: number): number {
  return Number(value.toFixed(2))
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}

function containsToken(text: string, value: string): boolean {
  return text.includes(value.toLowerCase())
}

function clampList(values: string[], limit: number): string[] {
  return Array.from(new Set(values)).slice(0, limit)
}

function shiftSize(size: string, availableSizes: string[], direction: -1 | 1): string | undefined {
  const list = availableSizes.every((value) => NUMERIC_SIZES.includes(value)) ? NUMERIC_SIZES : ALPHA_SIZES
  const currentIndex = list.indexOf(size)
  if (currentIndex === -1) {
    return undefined
  }
  const shifted = list[currentIndex + direction]
  return shifted && availableSizes.includes(shifted) ? shifted : undefined
}

function estimateNumericSize(profile: UserInputProfile): string | undefined {
  const waist = profile.manualMeasurements?.waist
  if (waist !== undefined) {
    if (waist <= 61) return "2"
    if (waist <= 66) return "4"
    if (waist <= 71) return "6"
    if (waist <= 76) return "8"
    if (waist <= 81) return "10"
    if (waist <= 86) return "12"
    if (waist <= 92) return "14"
    return "16"
  }

  if (profile.weight !== undefined) {
    if (profile.weight < 48) return "2"
    if (profile.weight < 54) return "4"
    if (profile.weight < 61) return "6"
    if (profile.weight < 68) return "8"
    if (profile.weight < 75) return "10"
    if (profile.weight < 84) return "12"
    if (profile.weight < 93) return "14"
    return "16"
  }

  return undefined
}

function numericToAlpha(size: string): string {
  const numeric = Number(size)
  if (numeric <= 2) return "XXS"
  if (numeric <= 4) return "XS"
  if (numeric <= 8) return "S"
  if (numeric <= 10) return "M"
  if (numeric <= 14) return "L"
  if (numeric <= 18) return "XL"
  return "XXL"
}

function nearestAvailableSize(target: string, availableSizes: string[]): string | undefined {
  if (availableSizes.includes(target)) {
    return target
  }

  const reference = availableSizes.every((value) => NUMERIC_SIZES.includes(value)) ? NUMERIC_SIZES : ALPHA_SIZES
  const targetIndex = reference.indexOf(target)
  if (targetIndex === -1) {
    return availableSizes[0]
  }

  const candidates = availableSizes
    .map((value) => ({ value, index: reference.indexOf(value) }))
    .filter((candidate) => candidate.index !== -1)

  candidates.sort((left, right) => Math.abs(left.index - targetIndex) - Math.abs(right.index - targetIndex))
  return candidates[0]?.value
}

function recommendSize(product: StructuredProduct, profile: UserInputProfile): RecommendationResult["sizeRecommendation"] {
  if (product.availableSizes.length === 0) {
    return {
      confidence: "low",
      reasons: ["The page did not expose enough size information for a specific size call."],
      risks: ["Available sizes were not detectable from the product page."]
    }
  }

  const numericGuess = estimateNumericSize(profile)
  const usesNumericSizes = product.availableSizes.every((size) => NUMERIC_SIZES.includes(size))
  const baseGuess = usesNumericSizes
    ? numericGuess
    : numericGuess
      ? numericToAlpha(numericGuess)
      : undefined

  let recommendedSize = baseGuess ? nearestAvailableSize(baseGuess, product.availableSizes) : undefined
  const reasons: string[] = []
  const risks: string[] = []
  let confidence: SizeConfidence = "low"

  if (profile.manualMeasurements?.waist || profile.manualMeasurements?.bust || profile.manualMeasurements?.hips) {
    confidence = product.sizeChart?.table?.length ? "high" : "medium"
    reasons.push("Manual measurements were available, so the estimate is anchored to your saved profile.")
  } else if (profile.height || profile.weight) {
    confidence = "medium"
    reasons.push("The estimate uses your saved height and weight plus the product fit signals.")
  } else {
    reasons.push("There is not enough saved body data to make an honest size call yet.")
    risks.push("Save height, weight, or measurements in the profile page before treating size guidance as actionable.")
  }

  if (recommendedSize && (product.attributes.compression === "high" || product.attributes.supportLevel === "high" || product.attributes.fit === "slim")) {
    const sizeUp = recommendedSize ? shiftSize(recommendedSize, product.availableSizes, 1) : undefined
    if (sizeUp) {
      recommendedSize = sizeUp
      reasons.push("This item reads as compressive or close-fitting, so the heuristic nudges one step up.")
    }
    risks.push("High-compression or slim items can feel smaller than the nominal size.")
  }

  if (product.attributes.fit === "oversized" || product.attributes.fit === "relaxed") {
    risks.push("Relaxed fits can run roomy; stay true to size unless you want a sharper silhouette.")
  }

  if (!product.sizeChart?.table?.length) {
    risks.push("No readable size chart was found on the page, so exact sizing remains heuristic.")
  }

  return {
    recommendedSize,
    confidence,
    reasons: clampList(reasons, 3),
    risks: clampList(risks, 3)
  }
}

function applicableFamilies(category: ApparelCategory): AttributeFamily[] {
  return CATEGORY_FAMILIES[category] ?? CATEGORY_FAMILIES.unknown
}

function buildAttributeState(families: AttributeFamily[]): AttributeState {
  const state = {} as AttributeState

  families
    .flatMap((family) => ATTRIBUTE_FAMILIES[family])
    .forEach((attribute) => {
      state[attribute] = { score: 0, reasons: [] }
    })

  return state
}

function adjustScores(
  state: AttributeState,
  ids: AttributeId[],
  delta: number,
  reason: string
): void {
  ids.forEach((id) => {
    if (!state[id]) {
      return
    }
    state[id].score += delta
    state[id].reasons.push(reason)
  })
}

function applyBodyStateRules(
  state: AttributeState,
  families: AttributeFamily[],
  contextCategory: ApparelCategory | undefined,
  profile: UserInputProfile,
  bodyState: RecommendationResult["bodyStateSummary"]
): void {
  const hasFamily = (family: AttributeFamily) => families.includes(family)

  if (hasFamily("waistline")) {
    if (bodyState.waistDefinition >= 0.66) {
      adjustScores(
        state,
        ["defined_waist", "high_waist", "natural_waist"],
        1.25,
        "Clear waist definition usually benefits from a visibly organized waistline."
      )
      adjustScores(
        state,
        ["no_waist_definition", "low_rise"],
        -1,
        "Dropping or hiding the waist is less likely to keep the silhouette balanced."
      )
    } else if (bodyState.waistDefinition <= 0.4) {
      adjustScores(
        state,
        ["natural_waist", "straight_column", "bias_skim"],
        0.85,
        "Cleaner line continuity is usually easier to carry than heavily cinched shaping."
      )
      adjustScores(
        state,
        ["defined_waist"],
        -0.45,
        "Strongly forced waist emphasis can read less natural when the waist break is softer."
      )
    }
  }

  if (hasFamily("neckline") || hasFamily("strapSleeve")) {
    if (bodyState.horizontalSensitivity >= 0.62) {
      adjustScores(
        state,
        ["v_neck", "scoop_neck", "square_neck", "wide_strap", "tank_shoulder"],
        1,
        "More open framing tends to reduce horizontal visual load through the upper body."
      )
      adjustScores(
        state,
        ["crew_neck", "halter_neck", "thin_strap"],
        -0.95,
        "Closed or highly concentrated upper-body lines can feel more width-sensitive."
      )
    }

    if (bodyState.upperLowerBalance <= 0.44) {
      adjustScores(
        state,
        ["square_neck", "wide_strap", "tank_shoulder", "cap_sleeve"],
        0.95,
        "A bit more shoulder framing can visually balance a stronger lower half."
      )
    } else if (bodyState.upperLowerBalance >= 0.56) {
      adjustScores(
        state,
        ["v_neck", "scoop_neck"],
        0.9,
        "Open vertical necklines usually keep the upper body from feeling over-emphasized."
      )
      adjustScores(
        state,
        ["halter_neck"],
        -0.8,
        "High halter framing concentrates attention at the upper body."
      )
    }
  }

  if (hasFamily("silhouette")) {
    if (bodyState.upperLowerBalance >= 0.56) {
      adjustScores(
        state,
        ["a_line", "fit_and_flare"],
        1.05,
        "Controlled release below the waist is usually helpful when the upper half carries more visual weight."
      )
      adjustScores(
        state,
        ["bodycon"],
        -0.65,
        "A tight uninterrupted silhouette can overstate the upper-lower contrast."
      )
    } else if (bodyState.upperLowerBalance <= 0.44) {
      adjustScores(
        state,
        ["straight_column", "bias_skim"],
        0.95,
        "Cleaner skirt or leg lines usually keep extra lower-half volume from building too early."
      )
      adjustScores(
        state,
        ["trapeze"],
        -0.8,
        "Early release below the waist is more likely to add lower-body bulk."
      )
    }

    if (bodyState.structureNeed >= 0.6) {
      adjustScores(
        state,
        ["fit_and_flare", "straight_column"],
        0.9,
        "More controlled shaping is usually easier to wear than unsupported excess ease."
      )
      adjustScores(
        state,
        ["trapeze"],
        -0.9,
        "Loose unsupported volume is more likely to drift away from the body line."
      )
    }
  }

  if (hasFamily("length")) {
    if (bodyState.verticalLineStrength >= 0.62) {
      adjustScores(
        state,
        ["midi_length", "maxi_length", "full_length"],
        0.8,
        "Longer uninterrupted lines are more likely to read intentional than overwhelming."
      )
      adjustScores(
        state,
        ["cropped_length"],
        -0.55,
        "Short segmented hems can interrupt otherwise strong vertical line."
      )
    } else if (bodyState.verticalLineStrength <= 0.42) {
      adjustScores(
        state,
        ["knee_length", "high_waist"],
        0.75,
        "A slightly higher visual break can keep proportions feeling longer."
      )
      adjustScores(
        state,
        ["maxi_length"],
        -0.45,
        "Long low breaks need more natural vertical strength to stay clean."
      )
    }
  }

  if (hasFamily("fabric")) {
    if (bodyState.structureNeed >= 0.6) {
      adjustScores(
        state,
        ["structured_fabric", "controlled_stretch", "low_visual_detail"],
        1,
        "Stable fabrics with cleaner surfaces are more likely to support the body line."
      )
      adjustScores(
        state,
        ["fluid_drape", "clingy_finish"],
        -0.9,
        "Too much drape or cling is more likely to create avoidable fit noise."
      )
    } else {
      adjustScores(
        state,
        ["fluid_drape", "bias_skim"],
        0.55,
        "Softer drape can work well when less structural correction is needed."
      )
    }

    if (bodyState.horizontalSensitivity >= 0.62) {
      adjustScores(
        state,
        ["low_visual_detail"],
        0.7,
        "Lower visual complexity usually keeps the upper-body line cleaner."
      )
      adjustScores(
        state,
        ["high_visual_detail"],
        -0.8,
        "Busy details make horizontal emphasis more likely."
      )
    }
  }

  if (profile.styleGoals?.some((goal) => /look taller|length|elong/i.test(goal))) {
    adjustScores(
      state,
      ["v_neck", "straight_column", "midi_length", "full_length", "high_waist"],
      0.6,
      "Your saved goals lean toward longer visual lines."
    )
  }

  if (profile.styleGoals?.some((goal) => /waist/i.test(goal))) {
    adjustScores(
      state,
      ["defined_waist", "high_waist", "fit_and_flare"],
      0.7,
      "Your saved goals explicitly ask for clearer waist emphasis."
    )
  }

  if (profile.styleGoals?.some((goal) => /structure|polish|tailored/i.test(goal))) {
    adjustScores(
      state,
      ["structured_fabric", "controlled_stretch", "straight_column"],
      0.65,
      "Your saved goals favor a more controlled and polished line."
    )
  }

  if (contextCategory === "leggings" || contextCategory === "pants" || contextCategory === "shorts") {
    adjustScores(
      state,
      ["high_waist", "controlled_stretch"],
      0.35,
      "For lower-body items, stable rise and recovery are usually the first things to get right."
    )
  }
}

function mapPreferenceValuesToAttributes(values: string[] | undefined): AttributeId[] {
  if (!values?.length) {
    return []
  }

  return Array.from(
    new Set(
      values.flatMap((value) =>
        PREFERENCE_ATTRIBUTE_MAP.filter(([pattern]) => pattern.test(value)).map(([, attribute]) => attribute)
      )
    )
  )
}

function applyPreferenceRules(state: AttributeState, profile: UserInputProfile): void {
  adjustScores(
    state,
    mapPreferenceValuesToAttributes(profile.explicitPreferences?.likedNecklines),
    0.8,
    "This attribute also matches a saved neckline preference."
  )
  adjustScores(
    state,
    mapPreferenceValuesToAttributes(profile.explicitPreferences?.dislikedNecklines),
    -1,
    "This attribute conflicts with a saved neckline avoid rule."
  )
  adjustScores(
    state,
    mapPreferenceValuesToAttributes(profile.explicitPreferences?.likedLengths),
    0.7,
    "This attribute matches a saved length preference."
  )
  adjustScores(
    state,
    mapPreferenceValuesToAttributes(profile.explicitPreferences?.dislikedLengths),
    -0.85,
    "This attribute conflicts with a saved length avoid rule."
  )
  adjustScores(
    state,
    mapPreferenceValuesToAttributes(profile.explicitPreferences?.likedRise),
    0.8,
    "This attribute matches a saved rise preference."
  )
  adjustScores(
    state,
    mapPreferenceValuesToAttributes(profile.explicitPreferences?.dislikedRise),
    -0.9,
    "This attribute conflicts with a saved rise avoid rule."
  )
  adjustScores(
    state,
    mapPreferenceValuesToAttributes(profile.explicitPreferences?.likedFits),
    0.7,
    "This attribute matches a saved fit preference."
  )
  adjustScores(
    state,
    mapPreferenceValuesToAttributes(profile.explicitPreferences?.dislikedFits),
    -0.95,
    "This attribute conflicts with a saved fit avoid rule."
  )
}

function topAttributes(
  state: AttributeState,
  comparator: (score: number) => boolean,
  limit: number,
  descending: boolean,
  maxPerFamily = Number.POSITIVE_INFINITY
): AttributeId[] {
  const familyCounts = new Map<AttributeFamily, number>()

  return (Object.entries(state) as Array<[AttributeId, { score: number }]>)
    .filter(([, details]) => comparator(details.score))
    .sort((left, right) => descending ? right[1].score - left[1].score : left[1].score - right[1].score)
    .reduce<AttributeId[]>((selected, [attribute]) => {
      if (selected.length >= limit) {
        return selected
      }

      const family = ATTRIBUTE_TO_FAMILY[attribute]
      const currentCount = family ? (familyCounts.get(family) ?? 0) : 0
      if (family && currentCount >= maxPerFamily) {
        return selected
      }

      if (family) {
        familyCounts.set(family, currentCount + 1)
      }
      selected.push(attribute)
      return selected
    }, [])
}

function collectAdviceReasons(
  state: AttributeState,
  attributes: string[],
  limit: number
): string[] {
  return clampList(
    attributes
      .flatMap((attribute) => state[attribute as AttributeId]?.reasons ?? [])
      .filter(Boolean),
    limit
  )
}

function productSignalSet(product: StructuredProduct): Set<AttributeId> {
  const signals = new Set<AttributeId>()

  switch (product.attributes.neckline) {
    case "square":
      signals.add("square_neck")
      break
    case "scoop":
      signals.add("scoop_neck")
      break
    case "v_neck":
      signals.add("v_neck")
      break
    case "crew":
      signals.add("crew_neck")
      break
    case "halter":
      signals.add("halter_neck")
      break
  }

  switch (product.attributes.strapWidth) {
    case "wide":
      signals.add("wide_strap")
      break
    case "thin":
      signals.add("thin_strap")
      break
    case "medium":
      signals.add("tank_shoulder")
      break
  }

  if (product.attributes.strapStyle === "racerback" || product.attributes.strapStyle === "crossback") {
    signals.add("tank_shoulder")
  }

  switch (product.attributes.sleeve) {
    case "short":
      signals.add("cap_sleeve")
      break
    case "sleeveless":
      signals.add("sleeveless")
      break
  }

  if (product.attributes.waistDefinition === "defined") {
    signals.add("defined_waist")
  }
  if (product.attributes.waistDefinition === "relaxed" || product.attributes.waistline === "none") {
    signals.add("no_waist_definition")
  }

  switch (product.attributes.waistline) {
    case "natural":
      signals.add("natural_waist")
      break
    case "high":
      signals.add("high_waist")
      break
    case "empire":
      signals.add("empire_waist")
      break
    case "fit_and_flare":
      signals.add("fit_and_flare")
      break
  }

  switch (product.attributes.waistRise) {
    case "high":
      signals.add("high_waist")
      break
    case "mid":
      signals.add("natural_waist")
      break
    case "low":
      signals.add("low_rise")
      break
  }

  switch (product.attributes.silhouette) {
    case "body_skimming":
      signals.add("bias_skim")
      break
    case "streamlined":
      signals.add("straight_column")
      break
    case "flared":
      signals.add("a_line")
      break
    case "boxy":
      signals.add("trapeze")
      break
  }

  if (product.attributes.fit === "slim" || product.attributes.compression === "high") {
    signals.add("bodycon")
    signals.add("controlled_stretch")
    signals.add("clingy_finish")
  }
  if (product.attributes.fit === "oversized" || product.attributes.fit === "relaxed") {
    signals.add("trapeze")
    signals.add("fluid_drape")
    signals.add("no_waist_definition")
  }

  switch (product.attributes.length) {
    case "mini":
      signals.add("mini_length")
      break
    case "midi":
      signals.add("midi_length")
      break
    case "maxi":
      signals.add("maxi_length")
      break
    case "cropped":
      signals.add("cropped_length")
      break
    case "full":
      signals.add("full_length")
      break
  }

  if (product.attributes.fabricStructure === "structured" || product.attributes.constructionSupport === "high") {
    signals.add("structured_fabric")
  }

  if (product.attributes.stretch === "high" || product.attributes.stretch === "medium" || product.attributes.compression) {
    signals.add("controlled_stretch")
  }

  if (product.attributes.fabricDrape === "fluid") {
    signals.add("fluid_drape")
  }
  if (product.attributes.fabricDrape === "clingy") {
    signals.add("clingy_finish")
  }

  if (product.attributes.visualDetail === "high") {
    signals.add("high_visual_detail")
  } else if (product.attributes.visualDetail === "low") {
    signals.add("low_visual_detail")
  }

  return signals
}

function evaluateIgnoreRules(product: StructuredProduct, ignoreRules: IgnoreRule[]): IgnoreRule | undefined {
  const haystack = [product.title, product.description, product.productFeatures?.join(" "), product.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return ignoreRules.find((rule) => {
    const categoryMatch = rule.category ? rule.category === product.category : true
    const keywordMatch = rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
    return categoryMatch && keywordMatch
  })
}

function matchPreference(
  values: string[] | undefined,
  productValue: string | undefined,
  haystack: string
): boolean {
  if (!values?.length) {
    return false
  }

  return values.some((value) => {
    const normalized = value.toLowerCase()
    return normalized === productValue?.toLowerCase() || containsToken(haystack, normalized)
  })
}

function computeFitRisks(
  product: StructuredProduct,
  profile: UserInputProfile,
  bodyState: RecommendationResult["bodyStateSummary"],
  productSignals: Set<AttributeId>
): RecommendationResult["fitRisks"] {
  const risks: RecommendationResult["fitRisks"] = []
  const upperBodySensitive = product.category === "tops" || product.category === "tanks" || product.category === "shirts" || product.category === "dresses" || product.category === "jumpsuits" || product.category === "rompers" || product.category === "bodysuits" || product.category === "bras"

  const addRisk = (type: string, score: number, reason: string) => {
    if (score < 0.52) {
      return
    }
    risks.push({ type, confidence: round(score), reason })
  }

  const restrictiveUpperGarment = Number(
    upperBodySensitive &&
      (product.attributes.fit === "slim" ||
        product.attributes.compression === "high" ||
        product.attributes.coverage === "skimpy" ||
        productSignals.has("thin_strap"))
  )

  addRisk(
    "bust_overfill_risk",
    clamp(bodyState.upperLowerBalance * 0.45 + bodyState.horizontalSensitivity * 0.3 + restrictiveUpperGarment * 0.3),
    "Upper-body prominence plus a more restrictive top construction increases the chance of visual or physical overfill."
  )

  addRisk(
    "armhole_digging_risk",
    clamp(bodyState.horizontalSensitivity * 0.48 + Number(productSignals.has("thin_strap") || productSignals.has("sleeveless")) * 0.2 + Number(product.attributes.fit === "slim") * 0.26),
    "More exposed armholes with a close fit are more likely to cut in when upper-body width sensitivity is higher."
  )

  addRisk(
    "waist_compression_risk",
    clamp(bodyState.waistDefinition * 0.44 + bodyState.structureNeed * 0.18 + Number(productSignals.has("defined_waist") || productSignals.has("high_waist")) * 0.18 + Number(product.attributes.compression === "high" || product.attributes.fit === "slim") * 0.2),
    "A stronger waist break combined with compressive shaping raises the chance that the waist zone feels too firm."
  )

  addRisk(
    "high_hip_release_too_early_risk",
    clamp((1 - bodyState.upperLowerBalance) * 0.4 + bodyState.structureNeed * 0.18 + Number(product.attributes.releasePoint === "early" || productSignals.has("trapeze") || productSignals.has("a_line")) * 0.32),
    "Earlier release below the waist is more likely to create bulk when the lower body already carries more visual emphasis."
  )

  addRisk(
    "loose_wrinkle_risk",
    clamp(bodyState.waistDefinition * 0.3 + bodyState.structureNeed * 0.35 + Number(product.attributes.fit === "relaxed" || product.attributes.fit === "oversized" || productSignals.has("fluid_drape")) * 0.28),
    "Extra ease without enough shaping is more likely to pool and wrinkle instead of hanging intentionally."
  )

  addRisk(
    "drag_line_risk",
    clamp(bodyState.structureNeed * 0.34 + bodyState.horizontalSensitivity * 0.16 + Number(product.attributes.fit === "slim" || product.attributes.compression === "high") * 0.22 + Number((product.category === "jumpsuits" || product.category === "rompers" || product.category === "bodysuits") && profile.height !== undefined && profile.height > 170) * 0.22),
    "Close-fitting construction plus higher structural demand makes stress lines more likely if allowance is limited."
  )

  addRisk(
    "shapeless_excess_ease_risk",
    clamp(bodyState.structureNeed * 0.42 + bodyState.waistDefinition * 0.2 + Number(productSignals.has("trapeze") || productSignals.has("no_waist_definition") || product.attributes.fit === "oversized") * 0.28),
    "When the body responds better to stable shaping, very loose volume is less likely to read intentional."
  )

  return risks.sort((left, right) => right.confidence - left.confidence).slice(0, 4)
}

function buildConfidenceNote(
  profile: UserInputProfile,
  product: StructuredProduct,
  bodyProfileConfidence: number,
  fitRisks: RecommendationResult["fitRisks"]
): string | undefined {
  const segments: string[] = []
  const frontCount = profile.frontImageUrls?.length ?? (profile.frontImageUrl ? 1 : 0)
  const backCount = profile.backImageUrls?.length ?? (profile.backImageUrl ?? profile.sideImageUrl ? 1 : 0)

  if (frontCount === 0 || backCount === 0) {
    segments.push("Body-state inference is running on measurements and saved profile signals because front and back photos are not both available.")
  } else if (profile.imageAnalysis) {
    segments.push("Saved photo analysis contributed silhouette-derived body measurements to this recommendation.")
  } else {
    segments.push("Photos are saved, but the body-profile run could not extract a usable silhouette from them.")
  }

  if (!product.sizeChart?.table?.length) {
    segments.push("No readable size chart was detected.")
  }

  if (bodyProfileConfidence < 0.5) {
    segments.push("Recommendation confidence is intentionally capped because profile coverage is still thin.")
  }

  if (fitRisks.some((risk) => risk.confidence >= 0.75)) {
    segments.push("Fit-risk and style score are separated, so a promising silhouette can still carry a construction warning.")
  }

  return segments.length ? segments.join(" ") : undefined
}

function buildStyleAdviceNote(profile: UserInputProfile, bodyProfileConfidence: number): string | undefined {
  const segments: string[] = []
  const frontCount = profile.frontImageUrls?.length ?? (profile.frontImageUrl ? 1 : 0)
  const backCount = profile.backImageUrls?.length ?? (profile.backImageUrl ?? profile.sideImageUrl ? 1 : 0)

  if (frontCount === 0 || backCount === 0) {
    segments.push("Photo-aware advice works best with both front and back images; for now the engine is relying more heavily on body specs and saved preferences.")
  } else if (profile.imageAnalysis) {
    segments.push("This advice includes silhouette ratios extracted from your saved body photos, not just the fact that photos exist.")
  } else {
    segments.push("Photos are saved, but the current run could not derive a clean silhouette from them, so the engine is leaning back on manual body specs.")
  }

  if (bodyProfileConfidence < 0.5) {
    segments.push("Confidence is intentionally moderated because the profile is still sparse.")
  }

  if (profile.imageAnalysis?.notes.length) {
    segments.push(profile.imageAnalysis.notes[0]!)
  }

  return segments.length ? segments.join(" ") : undefined
}

function normalizeAlignmentScore(score: number, riskPenalty: number): RecommendationResult["level"] {
  const net = score - riskPenalty
  if (net >= 2.2) return "strong"
  if (net >= 0.7) return "try"
  if (net <= -1.1) return "avoid"
  return "cautious"
}

function remapClamped(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
): number {
  if (inputMax <= inputMin) {
    return outputMin
  }

  const ratio = clamp((value - inputMin) / (inputMax - inputMin))
  return outputMin + ratio * (outputMax - outputMin)
}

function computeFitScore(
  level: RecommendationResult["level"],
  confidence: number,
  alignmentScore = 0,
  riskPenalty = 0
): number {
  if (level === "needs_data") {
    return clampInteger(remapClamped(confidence, 0, 0.45, 1, 3), 1, 3)
  }

  const net = alignmentScore - riskPenalty

  if (level === "avoid") {
    return clampInteger(remapClamped(net, -3, -1.1, 1, 3), 1, 3)
  }

  if (level === "cautious") {
    return clampInteger(remapClamped(net, -1.1, 0.7, 4, 6), 4, 6)
  }

  if (level === "try") {
    return clampInteger(remapClamped(net, 0.7, 2.2, 7, 8), 7, 8)
  }

  return clampInteger(remapClamped(net, 2.2, 4.2, 9, 10), 9, 10)
}

function hasMeaningfulProfileSignals(profile: UserInputProfile): boolean {
  const explicitPreferences = profile.explicitPreferences
  const preferenceCount =
    [
      explicitPreferences?.likedFits,
      explicitPreferences?.dislikedFits,
      explicitPreferences?.likedLengths,
      explicitPreferences?.dislikedLengths,
      explicitPreferences?.likedNecklines,
      explicitPreferences?.dislikedNecklines,
      explicitPreferences?.likedRise,
      explicitPreferences?.dislikedRise,
      explicitPreferences?.likedSupportLevels,
      explicitPreferences?.dislikedSupportLevels,
      profile.useCases,
      profile.styleGoals,
      profile.avoidRules
    ]
      .flatMap((value) => value ?? [])
      .filter(Boolean).length

  const bodySignals = [
    profile.height,
    profile.weight,
    profile.manualMeasurements?.bust,
    profile.manualMeasurements?.waist,
    profile.manualMeasurements?.hips,
    profile.manualMeasurements?.shoulderWidth,
    profile.supportState,
    profile.frontImageUrls?.length ?? profile.frontImageUrl,
    profile.backImageUrls?.length ?? profile.backImageUrl ?? profile.sideImageUrl,
    profile.imageAnalysis?.confidence
  ].filter(Boolean).length

  return bodySignals >= 2 || preferenceCount >= 2
}

export function recommendProduct(
  product: StructuredProduct,
  profileInput?: UserInputProfile,
  ignoreRules: IgnoreRule[] = []
): RecommendationResult {
  const profile = normalizeUserProfile(profileInput)
  const ignoreRule = evaluateIgnoreRules(product, ignoreRules)
  const detectedSignals = Array.from(productSignalSet(product)) as AttributeId[]

  if (ignoreRule) {
    return {
      level: "avoid",
      fitScore: 1,
      reasons: [`Local ignore rule "${ignoreRule.label}" matched this product.`],
      risks: ["You previously asked not to surface similar items."],
      occasions: product.attributes.intendedUse ?? [],
      productSignals: detectedSignals,
      matchedProductSignals: [],
      conditionalProductSignals: [],
      conflictingProductSignals: [],
      recommendedAttributes: [],
      conditionalAttributes: [],
      lowPriorityAttributes: [],
      fitRisks: [],
      confidence: 0.2,
      confidenceBreakdown: {
        profileCoverage: 0,
        riskAdjustment: 0.2,
        productDetail: 0,
        sizeChartDetail: 0
      },
      bodyStateSummary: {
        upperLowerBalance: 0.5,
        waistDefinition: 0.5,
        verticalLineStrength: 0.5,
        horizontalSensitivity: 0.5,
        structureNeed: 0.5
      },
      confidenceNote: "Recommendation suppressed by your saved local ignore rules."
    }
  }

  const bodyProfile = deriveBodyProfile(profile)
  if (bodyProfile.confidence < 0.45 && !hasMeaningfulProfileSignals(profile)) {
    const confidence = round(bodyProfile.confidence)
    return {
      level: "needs_data",
      fitScore: computeFitScore("needs_data", confidence),
      sizeRecommendation: recommendSize(product, profile),
      reasons: [
        "Save a few profile inputs first so the engine can judge fit and silhouette with less guesswork."
      ],
      risks: [],
      occasions: clampList(product.attributes.intendedUse ?? [], 4),
      productSignals: detectedSignals,
      matchedProductSignals: [],
      conditionalProductSignals: [],
      conflictingProductSignals: [],
      recommendedAttributes: [],
      conditionalAttributes: [],
      lowPriorityAttributes: [],
      fitRisks: [],
      confidence,
      confidenceBreakdown: {
        profileCoverage: confidence,
        riskAdjustment: 0,
        productDetail: 0,
        sizeChartDetail: 0
      },
      bodyStateSummary: bodyProfile.bodyStateSummary,
      confidenceNote: "Current profile evidence is too thin for a real recommendation. Add height, weight, measurements, or explicit style preferences."
    }
  }

  const families = applicableFamilies(product.category)
  const attributeState = buildAttributeState(families)
  applyBodyStateRules(attributeState, families, product.category, profile, bodyProfile.bodyStateSummary)
  applyPreferenceRules(attributeState, profile)

  const recommendedAttributes = topAttributes(attributeState, (score) => score >= 0.75, 5, true, 1)
  const conditionalAttributes = topAttributes(attributeState, (score) => score >= 0.2 && score < 0.75, 4, true, 1)
  const lowPriorityAttributes = topAttributes(attributeState, (score) => score <= -0.45, 5, false, 1)
  const signals = new Set<AttributeId>(detectedSignals)
  const productSignals = [...detectedSignals]
  const matchedProductSignals = productSignals.filter((signal) => recommendedAttributes.includes(signal))
  const conditionalProductSignals = productSignals.filter((signal) => conditionalAttributes.includes(signal))
  const conflictingProductSignals = productSignals.filter((signal) => lowPriorityAttributes.includes(signal))

  const haystack = [
    product.title,
    product.description,
    product.productFeatures?.join(" "),
    product.materials?.join(" "),
    Object.values(product.attributes)
      .flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
      .join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  let alignmentScore = 0
  const reasons: string[] = []
  const risks: string[] = []

  signals.forEach((signal) => {
    if (recommendedAttributes.includes(signal)) {
      alignmentScore += 1.1
      reasons.push(attributeState[signal]?.reasons[0] ?? `This product lines up with the recommended ${signal.replace(/_/g, " ")} direction.`)
    } else if (conditionalAttributes.includes(signal)) {
      alignmentScore += 0.45
      reasons.push(`This product overlaps a conditional match: ${signal.replace(/_/g, " ")}.`)
    } else if (lowPriorityAttributes.includes(signal)) {
      alignmentScore -= 1
      risks.push(`This product leans into a lower-probability attribute: ${signal.replace(/_/g, " ")}.`)
    }
  })

  if (profile.useCases?.length && product.attributes.intendedUse?.length) {
    const overlap = profile.useCases.filter((useCase) => product.attributes.intendedUse?.includes(useCase))
    if (overlap.length > 0) {
      alignmentScore += 0.9
      reasons.push(`The product language lines up with your saved use cases: ${overlap.join(", ")}.`)
    }
  }

  if (matchPreference(profile.explicitPreferences?.likedFits, product.attributes.fit, haystack)) {
    alignmentScore += 0.7
    reasons.push(`The fit signal matches a saved preference (${product.attributes.fit}).`)
  }

  if (matchPreference(profile.explicitPreferences?.dislikedFits, product.attributes.fit, haystack)) {
    alignmentScore -= 1
    risks.push(`The fit signal conflicts with your saved avoid list (${product.attributes.fit}).`)
  }

  if (matchPreference(profile.explicitPreferences?.likedSupportLevels, product.attributes.supportLevel, haystack)) {
    alignmentScore += 0.45
    reasons.push(`The support level matches what you usually look for (${product.attributes.supportLevel}).`)
  }

  if (matchPreference(profile.explicitPreferences?.dislikedSupportLevels, product.attributes.supportLevel, haystack)) {
    alignmentScore -= 0.75
    risks.push(`The support level conflicts with your saved avoid list (${product.attributes.supportLevel}).`)
  }

  const avoidRuleMatches = profile.avoidRules?.filter((rule) => containsToken(haystack, rule)) ?? []
  if (avoidRuleMatches.length > 0) {
    alignmentScore -= Math.min(2.4, avoidRuleMatches.length * 0.9)
    risks.push(`The product hits explicit avoid rules: ${avoidRuleMatches.join(", ")}.`)
  }

  if (!product.description || product.productFeatures?.length === 0) {
    alignmentScore -= 0.35
    risks.push("Page detail is thin, so the explanation is working with partial product information.")
  }

  const fitRisks = computeFitRisks(product, profile, bodyProfile.bodyStateSummary, signals)
  fitRisks.forEach((risk) => {
    if (risk.confidence >= 0.62) {
      risks.push(risk.reason)
    }
  })

  const riskPenalty =
    fitRisks.reduce((sum, risk) => sum + risk.confidence, 0) * 0.42 +
    fitRisks.filter((risk) => risk.confidence >= 0.7).length * 0.18

  const profileCoverage = bodyProfile.confidence * 0.65
  const riskAdjustment = clamp(1 - riskPenalty / 3) * 0.2
  const productDetail = product.description ? 0.08 : 0.03
  const sizeChartDetail = product.sizeChart?.table?.length ? 0.07 : 0.02
  const level = normalizeAlignmentScore(alignmentScore, riskPenalty)
  const confidence = round(clamp(profileCoverage + riskAdjustment + productDetail + sizeChartDetail))
  const fitScore = computeFitScore(level, confidence, alignmentScore, riskPenalty)

  return {
    level,
    fitScore,
    sizeRecommendation: recommendSize(product, profile),
    reasons: clampList(reasons, 3),
    risks: clampList(risks, 4),
    occasions: clampList(product.attributes.intendedUse ?? [], 4),
    productSignals,
    matchedProductSignals,
    conditionalProductSignals,
    conflictingProductSignals,
    recommendedAttributes,
    conditionalAttributes,
    lowPriorityAttributes,
    fitRisks,
    confidence,
    confidenceBreakdown: {
      profileCoverage: round(profileCoverage),
      riskAdjustment: round(riskAdjustment),
      productDetail: round(productDetail),
      sizeChartDetail: round(sizeChartDetail)
    },
    bodyStateSummary: bodyProfile.bodyStateSummary,
    confidenceNote: buildConfidenceNote(profile, product, bodyProfile.confidence, fitRisks)
  }
}

export function recommendStyleProfile(profileInput?: UserInputProfile): StyleAdviceResult {
  const profile = normalizeUserProfile(profileInput)
  const bodyProfile = deriveBodyProfile(profile)
  const attributeState = buildAttributeState(ALL_STYLE_FAMILIES)

  applyBodyStateRules(attributeState, ALL_STYLE_FAMILIES, undefined, profile, bodyProfile.bodyStateSummary)
  applyPreferenceRules(attributeState, profile)

  const attributeGroups = ALL_STYLE_FAMILIES.reduce<StyleAdviceResult["attributeGroups"]>((groups, family) => {
    const familyAttributes = ATTRIBUTE_FAMILIES[family]
      .map((attribute) => ({
        attribute,
        score: attributeState[attribute].score
      }))

    groups[family] = {
      recommended: familyAttributes
        .filter(({ score }) => score >= 0.55)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map(({ attribute }) => attribute),
      conditional: familyAttributes
        .filter(({ score }) => score >= 0.1 && score < 0.55)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map(({ attribute }) => attribute),
      lowPriority: familyAttributes
        .filter(({ score }) => score <= -0.35)
        .sort((left, right) => left.score - right.score)
        .slice(0, 3)
        .map(({ attribute }) => attribute)
    }

    return groups
  }, {} as StyleAdviceResult["attributeGroups"])

  const recommendedAttributes = ALL_STYLE_FAMILIES.flatMap((family) => attributeGroups[family].recommended)
  const conditionalAttributes = ALL_STYLE_FAMILIES.flatMap((family) => attributeGroups[family].conditional)
  const lowPriorityAttributes = ALL_STYLE_FAMILIES.flatMap((family) => attributeGroups[family].lowPriority)

  const reasons = collectAdviceReasons(attributeState, recommendedAttributes, 5)
  const cautionNotes = collectAdviceReasons(attributeState, lowPriorityAttributes, 4)

  return {
    recommendedAttributes,
    conditionalAttributes,
    lowPriorityAttributes,
    reasons,
    cautionNotes,
    confidence: round(bodyProfile.confidence),
    bodyStateSummary: bodyProfile.bodyStateSummary,
    confidenceNote: buildStyleAdviceNote(profile, bodyProfile.confidence),
    attributeGroups
  }
}
