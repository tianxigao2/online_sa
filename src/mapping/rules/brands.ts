import type { MappingRule } from "../types"

export const BRAND_MAPPING_RULES: MappingRule[] = [
  {
    ruleId: "lululemon_nulu",
    brands: ["lululemon"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "phrase", value: "nulu" },
    apply: {
      "construction.fabricFamily": "performance_knit",
      "construction.surfaceSoftness": "high",
      "construction.stretchLevel": "high",
      "construction.structureLevel": "low"
    },
    weight: 5,
    confidence: 0.9
  },
  {
    ruleId: "lululemon_softstreme",
    brands: ["lululemon"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "phrase", value: "softstreme" },
    apply: {
      "construction.fabricFamily": "performance_knit",
      "construction.surfaceSoftness": "high",
      "construction.drapeLevel": "medium",
      "occasionSemantics.occasionTags": ["lounge", "casual"]
    },
    weight: 5,
    confidence: 0.88
  },
  {
    ruleId: "lululemon_align",
    brands: ["lululemon"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "align" },
    apply: {
      "construction.compressionLevel": "low",
      "construction.stretchLevel": "high",
      "occasionSemantics.occasionTags": ["yoga", "workout"]
    },
    weight: 4,
    confidence: 0.84
  },
  {
    ruleId: "reformation_occasion_dress",
    brands: ["reformation"],
    sourceFields: ["title", "breadcrumbs", "categoryTags", "descriptionBlocks"],
    match: { type: "any_phrase", values: ["occasion dress", "occasion dresses", "event dressing"] },
    apply: {
      "styleSemantics.formalityLevel": "formal",
      "styleSemantics.polishLevel": "high",
      "occasionSemantics.occasionTags": ["occasion"]
    },
    weight: 4,
    confidence: 0.86
  },
  {
    ruleId: "reformation_dreamy",
    brands: ["reformation"],
    sourceFields: ["descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "dreamy" },
    apply: { "styleSemantics.romanticness": "low" },
    weight: 1,
    confidence: 0.45
  },
  {
    ruleId: "reformation_ref_silk",
    brands: ["reformation"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes", "compositionText"],
    match: { type: "any_phrase", values: ["ref silk", "silk charmeuse"] },
    apply: {
      "construction.fabricFamily": "satin_like",
      "construction.drapeLevel": "medium_high",
      "styleSemantics.polishLevel": "high"
    },
    weight: 4,
    confidence: 0.82
  },
  {
    ruleId: "skims_fits_everybody",
    brands: ["skims"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "phrase", value: "fits everybody" },
    apply: {
      "construction.fabricFamily": "jersey",
      "construction.stretchLevel": "high",
      "construction.surfaceSoftness": "high",
      "shape.fitIntent": "close_fit"
    },
    weight: 5,
    confidence: 0.88
  },
  {
    ruleId: "skims_seamless_sculpt",
    brands: ["skims"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "phrase", value: "seamless sculpt" },
    apply: {
      "construction.compressionLevel": "high",
      "construction.supportLevel": "high",
      "shape.fitIntent": "close_fit",
      "shape.silhouette": "body_skimming"
    },
    weight: 5,
    confidence: 0.9
  },
  {
    ruleId: "skims_push_up",
    brands: ["skims"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["push-up", "push up"] },
    apply: {
      "construction.supportLevel": "high",
      "styleSemantics.sexinessSignal": "medium"
    },
    weight: 4,
    confidence: 0.84
  },
  {
    ruleId: "skims_cotton_jersey",
    brands: ["skims"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes", "compositionText"],
    match: { type: "any_phrase", values: ["cotton jersey", "cotton rib", "soft lounge"] },
    apply: {
      "construction.fabricFamily": "jersey",
      "construction.stretchLevel": "medium",
      "construction.surfaceSoftness": "high",
      "occasionSemantics.occasionTags": ["lounge", "casual"]
    },
    weight: 4,
    confidence: 0.82
  }
]
