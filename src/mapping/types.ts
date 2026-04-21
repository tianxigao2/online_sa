import type { ApparelCategory, ProductSource } from "../shared/types"

export type CanonicalFieldValue = string | string[]

export interface RawProductMappingPayload {
  site: ProductSource
  brand?: string
  productId: string
  url: string
  title?: string
  breadcrumbs?: string[]
  categoryTags?: string[]
  descriptionBlocks?: string[]
  bulletPoints?: string[]
  fitNotes?: string[]
  fabricNotes?: string[]
  compositionText?: string
  careText?: string
  sizeOptions?: string[]
  sizeChart?: {
    rawText?: string
    table?: Array<Record<string, string>>
  }
}

export interface EvidenceItem {
  sourceField: string
  matchedText: string
  ruleId: string
  weight: number
}

export interface CanonicalGarment {
  identity: {
    garmentType?: string
    subcategory?: string
    primaryCategoryConfidence?: number
    sourceCategory?: ApparelCategory
  }
  construction: {
    fabricFamily?: string
    composition?: Array<{ material: string; pct?: number }>
    lining?: string
    stretchLevel?: string
    compressionLevel?: string
    structureLevel?: string
    drapeLevel?: string
    surfaceSoftness?: string
    sheerness?: string
    surfaceFinish?: string[]
    careLevel?: string
    supportLevel?: string
    coverage?: string
  }
  shape: {
    silhouette?: string
    fitIntent?: string
    length?: string
    waistDefinition?: string
    waistRise?: string
    neckline?: string
    sleeveType?: string
    strapType?: string
    strapWidth?: string
    hemShape?: string
    closureType?: string
    releasePoint?: string
  }
  styleSemantics: {
    formalityLevel?: string
    ornamentationLevel?: string
    visualLoudness?: string
    romanticness?: string
    minimalismLevel?: string
    trendSignal?: string
    playfulness?: string
    sexinessSignal?: string
    polishLevel?: string
  }
  occasionSemantics: {
    occasionTags?: string[]
    dayNightFlexibility?: string
    workAppropriateness?: string
    travelFriendliness?: string
    seasonality?: string[]
  }
  sizing: {
    sizeSystemType?: string
    sizeLabels?: string[]
    sizeChartAvailable?: boolean
    fitBias?: string
    petiteTallSignal?: string
  }
  evidence: Record<string, EvidenceItem[]>
  confidence: Record<string, number>
}

export type SourceField = keyof Pick<
  RawProductMappingPayload,
  | "title"
  | "breadcrumbs"
  | "categoryTags"
  | "descriptionBlocks"
  | "bulletPoints"
  | "fitNotes"
  | "fabricNotes"
  | "compositionText"
  | "careText"
>

export type MatchDefinition =
  | {
      type: "phrase"
      value: string
    }
  | {
      type: "any_phrase"
      values: string[]
    }
  | {
      type: "all_phrases"
      values: string[]
    }
  | {
      type: "regex"
      pattern: RegExp
    }

export interface MappingRule {
  ruleId: string
  sourceFields: SourceField[]
  match: MatchDefinition
  apply: Record<string, CanonicalFieldValue>
  weight: number
  confidence: number
  brands?: ProductSource[]
  categories?: ApparelCategory[]
}
