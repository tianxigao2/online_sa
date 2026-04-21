import path from "node:path"
import type { SilhouetteSnapshot, StructuredProduct, UserInputProfile } from "../../src/shared/types"
import { buildImageBodyAnalysisFromSnapshots } from "../../src/vision/bodyImageAnalysis"

type SnapshotPair = {
  front: SilhouetteSnapshot
  side: SilhouetteSnapshot
}

export type ProductExpectation = {
  productId: string
  verdict: "fit" | "not_fit"
  rationaleIncludes: string[]
  expectedSignals: string[]
  expectedConflicts?: string[]
}

export type GeneratedFitCase = {
  id: string
  label: string
  profile: UserInputProfile
  snapshots: SnapshotPair
  groundTruth: {
    standaloneRecommended: string[]
    standaloneLowPriority: string[]
    productExpectations: ProductExpectation[]
  }
}

const imagePath = (filename: string) => path.join(process.cwd(), "example", "generated", filename)

export const productsUnderTest: StructuredProduct[] = [
  {
    source: "reformation",
    productId: "structured-high-rise-straight-pant",
    url: "https://example.test/products/structured-high-rise-straight-pant",
    title: "Structured High-Rise Straight Pant",
    category: "pants",
    price: 188,
    currency: "USD",
    availableSizes: ["0", "2", "4", "6", "8", "10", "12"],
    description: "High-rise straight-leg trousers with a stable woven fabric and clean surface.",
    productFeatures: ["High rise", "Straight leg", "Tailored waistband"],
    materials: ["Woven stretch twill"],
    attributes: {
      fit: "classic",
      waistRise: "high",
      silhouette: "streamlined",
      length: "full",
      stretch: "medium",
      fabricStructure: "structured",
      visualDetail: "low",
      intendedUse: ["work", "casual"]
    }
  },
  {
    source: "reformation",
    productId: "low-rise-trapeze-mini-dress",
    url: "https://example.test/products/low-rise-trapeze-mini-dress",
    title: "Low-Rise Trapeze Mini Dress",
    category: "dresses",
    price: 228,
    currency: "USD",
    availableSizes: ["0", "2", "4", "6", "8", "10", "12"],
    description: "A low-slung halter mini dress with early trapeze release and a fluid finish.",
    productFeatures: ["Low rise seam", "Halter neckline", "Trapeze shape", "Mini length"],
    materials: ["Viscose crepe"],
    attributes: {
      fit: "relaxed",
      neckline: "halter",
      strapWidth: "thin",
      waistRise: "low",
      waistline: "none",
      silhouette: "boxy",
      length: "mini",
      fabricDrape: "fluid",
      releasePoint: "early",
      visualDetail: "high",
      intendedUse: ["party"]
    }
  },
  {
    source: "reformation",
    productId: "v-neck-structured-a-line-midi-dress",
    url: "https://example.test/products/v-neck-structured-a-line-midi-dress",
    title: "V-Neck Structured A-Line Midi Dress",
    category: "dresses",
    price: 278,
    currency: "USD",
    availableSizes: ["0", "2", "4", "6", "8", "10", "12"],
    description: "A structured midi dress with a v-neck bodice and controlled A-line release.",
    productFeatures: ["V neckline", "A-line skirt", "Midi length", "Defined waist"],
    materials: ["Cotton sateen"],
    attributes: {
      fit: "classic",
      neckline: "v_neck",
      waistDefinition: "defined",
      waistline: "natural",
      silhouette: "flared",
      length: "midi",
      fabricStructure: "structured",
      constructionSupport: "high",
      visualDetail: "low",
      intendedUse: ["work", "event"]
    }
  },
  {
    source: "reformation",
    productId: "thin-strap-halter-bodycon-mini",
    url: "https://example.test/products/thin-strap-halter-bodycon-mini",
    title: "Thin-Strap Halter Bodycon Mini",
    category: "dresses",
    price: 198,
    currency: "USD",
    availableSizes: ["0", "2", "4", "6", "8", "10", "12"],
    description: "A skimpy halter mini dress with thin straps, clingy stretch, and a close bodycon fit.",
    productFeatures: ["Halter neck", "Thin straps", "Bodycon", "Mini length"],
    materials: ["Stretch jersey"],
    attributes: {
      fit: "slim",
      neckline: "halter",
      strapWidth: "thin",
      coverage: "skimpy",
      length: "mini",
      stretch: "high",
      fabricDrape: "clingy",
      visualDetail: "high",
      intendedUse: ["party"]
    }
  },
  {
    source: "reformation",
    productId: "bias-drape-midi-skirt",
    url: "https://example.test/products/bias-drape-midi-skirt",
    title: "Bias Drape Midi Skirt",
    category: "skirts",
    price: 168,
    currency: "USD",
    availableSizes: ["0", "2", "4", "6", "8", "10", "12"],
    description: "A clean bias-skimming midi skirt with a natural waistband and soft drape.",
    productFeatures: ["Bias cut", "Natural waist", "Midi length"],
    materials: ["Cupro blend"],
    attributes: {
      fit: "classic",
      waistline: "natural",
      silhouette: "body_skimming",
      length: "midi",
      fabricDrape: "fluid",
      visualDetail: "low",
      intendedUse: ["work", "casual"]
    }
  },
  {
    source: "reformation",
    productId: "cinched-bodycon-ruffle-dress",
    url: "https://example.test/products/cinched-bodycon-ruffle-dress",
    title: "Cinched Bodycon Ruffle Dress",
    category: "dresses",
    price: 248,
    currency: "USD",
    availableSizes: ["0", "2", "4", "6", "8", "10", "12"],
    description: "A slim, heavily cinched bodycon dress with high visual detail around the waist.",
    productFeatures: ["Cinched waist", "Bodycon", "Ruffle detail"],
    materials: ["Structured stretch ponte"],
    attributes: {
      fit: "slim",
      waistDefinition: "defined",
      waistline: "natural",
      silhouette: "streamlined",
      length: "midi",
      stretch: "medium",
      fabricStructure: "structured",
      constructionSupport: "high",
      visualDetail: "high",
      intendedUse: ["event"]
    }
  }
]

export const generatedFitCases: GeneratedFitCase[] = [
  {
    id: "petite-pear",
    label: "Petite lower-body emphasis with a defined waist",
    snapshots: {
      front: {
        visibleHeightRatio: 0.91,
        shoulderWidthRatio: 0.21,
        bustWidthRatio: 0.235,
        waistWidthRatio: 0.17,
        hipWidthRatio: 0.325,
        symmetry: 0.86,
        maskCoverage: 0.36
      },
      side: {
        visibleHeightRatio: 0.9,
        shoulderWidthRatio: 0.215,
        bustWidthRatio: 0.23,
        waistWidthRatio: 0.18,
        hipWidthRatio: 0.31,
        symmetry: 0.82,
        maskCoverage: 0.34
      }
    },
    profile: {
      height: 158,
      weight: 55,
      frontImageUrl: imagePath("petite-pear-front.svg"),
      sideImageUrl: imagePath("petite-pear-side.svg"),
      manualMeasurements: {
        bust: 82,
        waist: 64,
        hips: 101,
        shoulderWidth: 35
      },
      supportState: "medium",
      styleGoals: ["look taller", "emphasize waist"],
      explicitPreferences: {
        likedRise: ["high"],
        dislikedRise: ["low"],
        likedFits: ["straight"],
        dislikedFits: ["oversized"]
      },
      useCases: ["work", "casual"],
      riskPreference: "safe"
    },
    groundTruth: {
      standaloneRecommended: ["defined_waist", "high_waist", "straight_column", "structured_fabric"],
      standaloneLowPriority: ["low_rise", "trapeze", "fluid_drape"],
      productExpectations: [
        {
          productId: "structured-high-rise-straight-pant",
          verdict: "fit",
          rationaleIncludes: ["high", "straight", "stable"],
          expectedSignals: ["high_waist", "straight_column", "structured_fabric"]
        },
        {
          productId: "low-rise-trapeze-mini-dress",
          verdict: "not_fit",
          rationaleIncludes: ["low", "trapeze", "loose"],
          expectedSignals: ["low_rise", "trapeze"],
          expectedConflicts: ["low_rise", "trapeze", "fluid_drape"]
        }
      ]
    }
  },
  {
    id: "tall-inverted",
    label: "Tall upper-body emphasis with broader shoulders",
    snapshots: {
      front: {
        visibleHeightRatio: 0.93,
        shoulderWidthRatio: 0.285,
        bustWidthRatio: 0.32,
        waistWidthRatio: 0.2,
        hipWidthRatio: 0.265,
        symmetry: 0.84,
        maskCoverage: 0.35
      },
      side: {
        visibleHeightRatio: 0.92,
        shoulderWidthRatio: 0.275,
        bustWidthRatio: 0.305,
        waistWidthRatio: 0.205,
        hipWidthRatio: 0.255,
        symmetry: 0.8,
        maskCoverage: 0.33
      }
    },
    profile: {
      height: 176,
      weight: 68,
      frontImageUrl: imagePath("tall-inverted-front.svg"),
      sideImageUrl: imagePath("tall-inverted-side.svg"),
      manualMeasurements: {
        bust: 101,
        waist: 74,
        hips: 93,
        shoulderWidth: 44
      },
      supportState: "light",
      styleGoals: ["polished", "avoid extra upper-body width"],
      explicitPreferences: {
        likedNecklines: ["v-neck", "scoop"],
        dislikedNecklines: ["halter", "crew"],
        likedFits: ["structured"],
        dislikedFits: ["bodycon"]
      },
      useCases: ["work", "event"],
      avoidRules: ["skimpy"],
      riskPreference: "balanced"
    },
    groundTruth: {
      standaloneRecommended: ["v_neck", "scoop_neck", "a_line", "fit_and_flare", "structured_fabric"],
      standaloneLowPriority: ["halter_neck", "thin_strap", "bodycon", "high_visual_detail"],
      productExpectations: [
        {
          productId: "v-neck-structured-a-line-midi-dress",
          verdict: "fit",
          rationaleIncludes: ["open", "release", "structured"],
          expectedSignals: ["v_neck", "a_line", "structured_fabric"]
        },
        {
          productId: "thin-strap-halter-bodycon-mini",
          verdict: "not_fit",
          rationaleIncludes: ["halter", "thin", "upper"],
          expectedSignals: ["halter_neck", "thin_strap", "bodycon"],
          expectedConflicts: ["halter_neck", "thin_strap", "bodycon", "high_visual_detail"]
        }
      ]
    }
  },
  {
    id: "balanced-soft",
    label: "Balanced proportions with softer waist definition",
    snapshots: {
      front: {
        visibleHeightRatio: 0.91,
        shoulderWidthRatio: 0.24,
        bustWidthRatio: 0.265,
        waistWidthRatio: 0.235,
        hipWidthRatio: 0.275,
        symmetry: 0.88,
        maskCoverage: 0.34
      },
      side: {
        visibleHeightRatio: 0.9,
        shoulderWidthRatio: 0.235,
        bustWidthRatio: 0.26,
        waistWidthRatio: 0.23,
        hipWidthRatio: 0.27,
        symmetry: 0.85,
        maskCoverage: 0.32
      }
    },
    profile: {
      height: 165,
      weight: 58,
      frontImageUrl: imagePath("balanced-soft-front.svg"),
      sideImageUrl: imagePath("balanced-soft-side.svg"),
      manualMeasurements: {
        bust: 88,
        waist: 78,
        hips: 91,
        shoulderWidth: 39
      },
      supportState: "high",
      riskPreference: "balanced"
    },
    groundTruth: {
      standaloneRecommended: ["natural_waist", "straight_column", "bias_skim", "fluid_drape"],
      standaloneLowPriority: ["defined_waist"],
      productExpectations: [
        {
          productId: "bias-drape-midi-skirt",
          verdict: "fit",
          rationaleIncludes: ["natural", "bias", "drape"],
          expectedSignals: ["natural_waist", "bias_skim", "fluid_drape"]
        },
        {
          productId: "cinched-bodycon-ruffle-dress",
          verdict: "not_fit",
          rationaleIncludes: ["forced", "waist", "detail"],
          expectedSignals: ["defined_waist", "high_visual_detail"],
          expectedConflicts: ["defined_waist", "high_visual_detail"]
        }
      ]
    }
  }
]

export function withGeneratedImageAnalysis(caseFixture: GeneratedFitCase): UserInputProfile {
  return {
    ...caseFixture.profile,
    imageAnalysis: buildImageBodyAnalysisFromSnapshots(
      caseFixture.snapshots.front,
      caseFixture.snapshots.side,
      caseFixture.profile.height,
      "upload"
    )
  }
}
