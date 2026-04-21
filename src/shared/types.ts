import type { CanonicalGarment } from "../mapping/types"

export type ApparelCategory =
  | "tops"
  | "tees"
  | "tanks"
  | "shirts"
  | "sweaters"
  | "hoodies"
  | "jackets"
  | "outerwear"
  | "dresses"
  | "skirts"
  | "pants"
  | "leggings"
  | "shorts"
  | "jumpsuits"
  | "rompers"
  | "bodysuits"
  | "bras"
  | "underwear"
  | "base_layers"
  | "unknown"

export type ProductSource = "lululemon" | "reformation" | "skims"

export type RiskPreference = "safe" | "balanced" | "adventurous"
export type SupportState = "unsupported" | "light" | "medium" | "high"
export type AttributeFamily = "neckline" | "waistline" | "silhouette" | "strapSleeve" | "length" | "fabric"
export type MeasurementSystem = "metric" | "imperial"
export type ImageAnalysisSource = "upload" | "url" | "mixed"

export interface SilhouetteSnapshot {
  visibleHeightRatio: number
  shoulderWidthRatio: number
  bustWidthRatio: number
  waistWidthRatio: number
  hipWidthRatio: number
  symmetry: number
  maskCoverage: number
}

export interface ImageBodyAnalysis {
  analyzedAt: number
  source: ImageAnalysisSource
  confidence: number
  frontSamples?: number
  backSamples?: number
  front?: SilhouetteSnapshot
  back?: SilhouetteSnapshot
  derivedMeasurements?: {
    estimatedBust?: number
    estimatedWaist?: number
    estimatedHips?: number
    estimatedShoulderWidth?: number
  }
  notes: string[]
}

export interface SavedUserProfile {
  id: string
  nickname: string
  updatedAt: number
  profile: UserInputProfile
}

export interface UserInputProfile {
  height?: number
  weight?: number
  frontImageUrl?: string
  frontImageUrls?: string[]
  backImageUrl?: string
  backImageUrls?: string[]
  sideImageUrl?: string
  imageAnalysis?: ImageBodyAnalysis
  unitSystem?: MeasurementSystem
  supportState?: SupportState
  styleGoals?: string[]
  manualMeasurements?: {
    bust?: number
    waist?: number
    hips?: number
    shoulderWidth?: number
  }
  explicitPreferences?: {
    likedFits?: string[]
    dislikedFits?: string[]
    likedLengths?: string[]
    dislikedLengths?: string[]
    likedNecklines?: string[]
    dislikedNecklines?: string[]
    likedRise?: string[]
    dislikedRise?: string[]
    likedSupportLevels?: string[]
    dislikedSupportLevels?: string[]
  }
  useCases?: string[]
  avoidRules?: string[]
  riskPreference?: RiskPreference
}

export interface DerivedBodyProfile {
  source: "manual" | "image_estimation" | "hybrid"
  confidence: number
  missingSignals: string[]
  proportions?: {
    legLine?: "short" | "balanced" | "long"
    shoulderPresence?: "narrow" | "balanced" | "broad"
    waistDefinition?: "low" | "medium" | "high"
    bustPresence?: "small" | "medium" | "full"
    hipPresence?: "narrow" | "balanced" | "full"
    torsoLength?: "short" | "balanced" | "long"
  }
  derivedMeasurements?: {
    estimatedBust?: number
    estimatedWaist?: number
    estimatedHips?: number
    estimatedShoulderWidth?: number
  }
  bodyStateSummary: {
    upperLowerBalance: number
    waistDefinition: number
    verticalLineStrength: number
    horizontalSensitivity: number
    structureNeed: number
  }
}

export interface StructuredProduct {
  source: ProductSource
  productId: string
  url: string
  title: string
  category: ApparelCategory
  price?: number
  salePrice?: number
  currency?: string
  availableSizes: string[]
  sizeChart?: {
    rawText?: string
    table?: Array<Record<string, string>>
  }
  description?: string
  materials?: string[]
  productFeatures?: string[]
  attributes: {
    fit?: string
    silhouette?: string
    neckline?: string
    sleeve?: string
    strapStyle?: string
    strapWidth?: string
    waistline?: string
    waistDefinition?: string
    waistRise?: string
    length?: string
    inseam?: string
    supportLevel?: string
    coverage?: string
    compression?: string
    stretch?: string
    fabricStructure?: string
    fabricDrape?: string
    visualDetail?: string
    constructionSupport?: string
    releasePoint?: string
    lining?: string
    intendedUse?: string[]
  }
  canonical?: CanonicalGarment
}

export interface RecommendationResult {
  level: "strong" | "try" | "cautious" | "avoid" | "needs_data"
  fitScore: number
  sizeRecommendation?: {
    recommendedSize?: string
    confidence: "high" | "medium" | "low"
    reasons: string[]
    risks: string[]
  }
  reasons: string[]
  risks: string[]
  occasions: string[]
  productSignals: string[]
  matchedProductSignals: string[]
  conditionalProductSignals: string[]
  conflictingProductSignals: string[]
  recommendedAttributes: string[]
  conditionalAttributes: string[]
  lowPriorityAttributes: string[]
  fitRisks: Array<{
    type: string
    confidence: number
    reason: string
  }>
  confidence: number
  confidenceBreakdown: {
    profileCoverage: number
    riskAdjustment: number
    productDetail: number
    sizeChartDetail: number
  }
  bodyStateSummary: DerivedBodyProfile["bodyStateSummary"]
  confidenceNote?: string
}

export interface StyleAdviceResult {
  recommendedAttributes: string[]
  conditionalAttributes: string[]
  lowPriorityAttributes: string[]
  reasons: string[]
  cautionNotes: string[]
  confidence: number
  bodyStateSummary: DerivedBodyProfile["bodyStateSummary"]
  confidenceNote?: string
  attributeGroups: Record<
    AttributeFamily,
    {
      recommended: string[]
      conditional: string[]
      lowPriority: string[]
    }
  >
}

export interface IgnoreRule {
  id: string
  label: string
  category?: ApparelCategory
  keywords: string[]
  createdAt: number
}

export interface ParsedRawProduct {
  source: ProductSource
  productId: string
  url: string
  title: string
  breadcrumbTrail: string[]
  rawCategoryHint?: string
  price?: number
  salePrice?: number
  currency?: string
  availableSizes: string[]
  sizeChart?: {
    rawText?: string
    table?: Array<Record<string, string>>
  }
  description?: string
  productFeatures?: string[]
  materials?: string[]
  rawText: string
}

export interface ParsedProductPageResult {
  isProductPage: boolean
  supported: boolean
  unsupportedReason?: string
  rawProduct?: ParsedRawProduct
}

export interface ParsedCollectionItem {
  source: ProductSource
  productId: string
  url: string
  title: string
  price?: number
  salePrice?: number
  categoryHint?: string
  thumbnailUrl?: string
  thumbnailAlt?: string
  cardText?: string
  anchorSelector?: string
}

export interface ParsedCollectionPageResult {
  isCollectionPage: boolean
  title?: string
  categoryHint?: string
  items: ParsedCollectionItem[]
}
