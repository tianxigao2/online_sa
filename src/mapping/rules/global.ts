import type { MappingRule } from "../types"

export const GLOBAL_MAPPING_RULES: MappingRule[] = [
  {
    ruleId: "taxonomy_dress",
    sourceFields: ["title", "breadcrumbs", "categoryTags"],
    match: { type: "phrase", value: "dress" },
    apply: { "identity.garmentType": "dress" },
    weight: 5,
    confidence: 0.92
  },
  {
    ruleId: "taxonomy_trouser_pant",
    sourceFields: ["title", "breadcrumbs", "categoryTags"],
    match: { type: "any_phrase", values: ["pant", "trouser", "legging", "tight"] },
    apply: { "identity.garmentType": "active_bottom" },
    weight: 4,
    confidence: 0.82
  },
  {
    ruleId: "length_mini",
    sourceFields: ["title", "breadcrumbs", "categoryTags", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "mini" },
    apply: { "shape.length": "mini" },
    weight: 4,
    confidence: 0.88
  },
  {
    ruleId: "length_midi",
    sourceFields: ["title", "breadcrumbs", "categoryTags", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "midi" },
    apply: { "shape.length": "midi" },
    weight: 4,
    confidence: 0.9
  },
  {
    ruleId: "length_maxi",
    sourceFields: ["title", "breadcrumbs", "categoryTags", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "maxi" },
    apply: { "shape.length": "maxi" },
    weight: 4,
    confidence: 0.9
  },
  {
    ruleId: "length_cropped",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["cropped", "crop length"] },
    apply: { "shape.length": "cropped" },
    weight: 3,
    confidence: 0.86
  },
  {
    ruleId: "length_full",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["full length", "full-length"] },
    apply: { "shape.length": "full_length" },
    weight: 3,
    confidence: 0.86
  },
  {
    ruleId: "neckline_square",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["square neck", "square-neck", "square neckline"] },
    apply: { "shape.neckline": "square" },
    weight: 4,
    confidence: 0.9
  },
  {
    ruleId: "neckline_v",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["v-neck", "v neck", "deep v", "deep v neck"] },
    apply: { "shape.neckline": "v_neck" },
    weight: 4,
    confidence: 0.88
  },
  {
    ruleId: "neckline_scoop",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "scoop" },
    apply: { "shape.neckline": "scoop" },
    weight: 4,
    confidence: 0.86
  },
  {
    ruleId: "neckline_crew",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["crewneck", "crew neck"] },
    apply: { "shape.neckline": "crew" },
    weight: 4,
    confidence: 0.86
  },
  {
    ruleId: "neckline_halter",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "halter" },
    apply: { "shape.neckline": "halter", "styleSemantics.sexinessSignal": "medium" },
    weight: 4,
    confidence: 0.86
  },
  {
    ruleId: "sleeveless",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "sleeveless" },
    apply: { "shape.sleeveType": "sleeveless" },
    weight: 4,
    confidence: 0.9
  },
  {
    ruleId: "short_sleeve",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["short sleeve", "short-sleeve", "short-sleeved"] },
    apply: { "shape.sleeveType": "short_sleeve" },
    weight: 4,
    confidence: 0.9
  },
  {
    ruleId: "long_sleeve",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["long sleeve", "long-sleeve", "long-sleeved"] },
    apply: { "shape.sleeveType": "long_sleeve" },
    weight: 4,
    confidence: 0.9
  },
  {
    ruleId: "thin_strap",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["spaghetti strap", "thin strap", "skinny strap", "barely-there straps"] },
    apply: {
      "shape.strapType": "spaghetti",
      "shape.strapWidth": "thin",
      "styleSemantics.sexinessSignal": "medium"
    },
    weight: 3,
    confidence: 0.82
  },
  {
    ruleId: "wide_strap",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["wide strap", "broad strap"] },
    apply: { "shape.strapWidth": "wide" },
    weight: 3,
    confidence: 0.82
  },
  {
    ruleId: "racerback",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "racerback" },
    apply: { "shape.strapType": "racerback" },
    weight: 3,
    confidence: 0.86
  },
  {
    ruleId: "crossback",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["cross-back", "cross back"] },
    apply: { "shape.strapType": "crossback" },
    weight: 3,
    confidence: 0.86
  },
  {
    ruleId: "fit_relaxed",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "any_phrase", values: ["relaxed", "roomy", "easy fit"] },
    apply: { "shape.fitIntent": "relaxed" },
    weight: 3,
    confidence: 0.78
  },
  {
    ruleId: "fit_oversized",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "phrase", value: "oversized" },
    apply: { "shape.fitIntent": "oversized" },
    weight: 4,
    confidence: 0.88
  },
  {
    ruleId: "fit_slim_fitted",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "any_phrase", values: ["slim", "close-to-body", "close to body", "fitted", "fitted through"] },
    apply: { "shape.fitIntent": "fitted" },
    weight: 3,
    confidence: 0.8
  },
  {
    ruleId: "fit_at_bodice",
    sourceFields: ["descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "any_phrase", values: ["fitted at bodice", "fitted through the bodice"] },
    apply: {
      "shape.fitIntent": "fitted",
      "construction.structureLevel": "medium",
      "construction.supportLevel": "medium"
    },
    weight: 4,
    confidence: 0.84
  },
  {
    ruleId: "fit_classic",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "phrase", value: "classic fit" },
    apply: { "shape.fitIntent": "classic" },
    weight: 3,
    confidence: 0.8
  },
  {
    ruleId: "body_skimming",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "any_phrase", values: ["body-skimming", "body skimming", "second-skin", "curve-hugging"] },
    apply: {
      "shape.silhouette": "body_skimming",
      "shape.fitIntent": "close_fit",
      "construction.drapeLevel": "clingy",
      "styleSemantics.sexinessSignal": "medium"
    },
    weight: 4,
    confidence: 0.86
  },
  {
    ruleId: "a_line",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["a-line", "a line", "a-line skirt", "a line skirt"] },
    apply: { "shape.silhouette": "a_line", "shape.releasePoint": "controlled" },
    weight: 4,
    confidence: 0.9
  },
  {
    ruleId: "fit_and_flare",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["fit-and-flare", "fit and flare"] },
    apply: {
      "shape.silhouette": "fit_and_flare",
      "shape.waistDefinition": "high",
      "shape.releasePoint": "controlled"
    },
    weight: 4,
    confidence: 0.9
  },
  {
    ruleId: "column_streamlined",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["column", "streamlined"] },
    apply: { "shape.silhouette": "column", "construction.drapeLevel": "controlled" },
    weight: 3,
    confidence: 0.78
  },
  {
    ruleId: "boxy",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "boxy" },
    apply: { "shape.silhouette": "boxy", "shape.waistDefinition": "none" },
    weight: 3,
    confidence: 0.8
  },
  {
    ruleId: "waist_high_rise",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "any_phrase", values: ["high-rise", "high rise", "super-high-rise", "super high rise"] },
    apply: { "shape.waistRise": "high", "shape.waistDefinition": "high" },
    weight: 5,
    confidence: 0.92
  },
  {
    ruleId: "waist_mid_rise",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "any_phrase", values: ["mid-rise", "mid rise"] },
    apply: { "shape.waistRise": "mid" },
    weight: 5,
    confidence: 0.9
  },
  {
    ruleId: "waist_low_rise",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "any_phrase", values: ["low-rise", "low rise"] },
    apply: { "shape.waistRise": "low" },
    weight: 5,
    confidence: 0.9
  },
  {
    ruleId: "defined_waist",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "any_phrase", values: ["defined waist", "waist-defining", "natural waist"] },
    apply: { "shape.waistDefinition": "high" },
    weight: 3,
    confidence: 0.82
  },
  {
    ruleId: "relaxed_waist",
    sourceFields: ["descriptionBlocks", "bulletPoints", "fitNotes"],
    match: { type: "any_phrase", values: ["straight fit", "relaxed through the waist"] },
    apply: { "shape.waistDefinition": "none" },
    weight: 3,
    confidence: 0.78
  },
  {
    ruleId: "compression_high",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "any_phrase", values: ["compressive", "held-in feel", "held in feel", "sculpting"] },
    apply: {
      "construction.compressionLevel": "high",
      "shape.fitIntent": "close_fit",
      "styleSemantics.sexinessSignal": "medium"
    },
    weight: 4,
    confidence: 0.86
  },
  {
    ruleId: "compression_medium",
    sourceFields: ["descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "any_phrase", values: ["supportive", "hugged sensation", "gentle compression"] },
    apply: { "construction.compressionLevel": "medium" },
    weight: 3,
    confidence: 0.76
  },
  {
    ruleId: "stretch_high",
    sourceFields: ["descriptionBlocks", "bulletPoints", "fabricNotes", "compositionText"],
    match: { type: "any_phrase", values: ["high-stretch", "high stretch", "buttery-soft", "buttery soft", "stretch fabric"] },
    apply: { "construction.stretchLevel": "high" },
    weight: 4,
    confidence: 0.82
  },
  {
    ruleId: "stretch_medium",
    sourceFields: ["descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "any_phrase", values: ["four-way stretch", "4-way stretch"] },
    apply: { "construction.stretchLevel": "medium" },
    weight: 4,
    confidence: 0.84
  },
  {
    ruleId: "soft_surface",
    sourceFields: ["descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "any_phrase", values: ["soft", "buttery-soft", "buttery soft", "feels like nothing"] },
    apply: { "construction.surfaceSoftness": "high", "construction.structureLevel": "low" },
    weight: 2,
    confidence: 0.68
  },
  {
    ruleId: "structured",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "any_phrase", values: ["structured", "tailored", "firm handfeel"] },
    apply: { "construction.structureLevel": "medium_high" },
    weight: 3,
    confidence: 0.78
  },
  {
    ruleId: "drapey_fluid",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "any_phrase", values: ["draped", "drapey", "flowy", "fluid", "swingy", "floaty"] },
    apply: { "construction.drapeLevel": "high", "construction.structureLevel": "low" },
    weight: 3,
    confidence: 0.8
  },
  {
    ruleId: "fabric_linen",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes", "compositionText"],
    match: { type: "phrase", value: "linen" },
    apply: { "construction.fabricFamily": "linen_like", "occasionSemantics.occasionTags": ["vacation"] },
    weight: 2,
    confidence: 0.72
  },
  {
    ruleId: "fabric_silk_satin",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes", "compositionText"],
    match: { type: "any_phrase", values: ["silk", "satin", "charmeuse"] },
    apply: {
      "construction.fabricFamily": "satin_like",
      "construction.drapeLevel": "medium_high",
      "styleSemantics.polishLevel": "high"
    },
    weight: 3,
    confidence: 0.78
  },
  {
    ruleId: "fabric_knit_jersey",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes", "compositionText"],
    match: { type: "any_phrase", values: ["knit", "jersey", "ribbed", "rib knit"] },
    apply: { "construction.fabricFamily": "jersey", "construction.stretchLevel": "medium" },
    weight: 2,
    confidence: 0.72
  },
  {
    ruleId: "lining_lined",
    sourceFields: ["descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "phrase", value: "lined" },
    apply: { "construction.lining": "lined", "construction.supportLevel": "high" },
    weight: 3,
    confidence: 0.82
  },
  {
    ruleId: "lining_unlined",
    sourceFields: ["descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "phrase", value: "unlined" },
    apply: { "construction.lining": "unlined", "construction.supportLevel": "light" },
    weight: 3,
    confidence: 0.82
  },
  {
    ruleId: "support_light",
    sourceFields: ["descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "light support" },
    apply: { "construction.supportLevel": "light" },
    weight: 3,
    confidence: 0.88
  },
  {
    ruleId: "support_medium",
    sourceFields: ["descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "medium support" },
    apply: { "construction.supportLevel": "medium" },
    weight: 3,
    confidence: 0.88
  },
  {
    ruleId: "support_high",
    sourceFields: ["descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "high support" },
    apply: { "construction.supportLevel": "high" },
    weight: 3,
    confidence: 0.88
  },
  {
    ruleId: "coverage_skimpy",
    sourceFields: ["descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "skimpy coverage" },
    apply: { "construction.coverage": "skimpy" },
    weight: 3,
    confidence: 0.88
  },
  {
    ruleId: "coverage_medium",
    sourceFields: ["descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "medium coverage" },
    apply: { "construction.coverage": "medium" },
    weight: 3,
    confidence: 0.88
  },
  {
    ruleId: "coverage_full",
    sourceFields: ["descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "full coverage" },
    apply: { "construction.coverage": "full" },
    weight: 3,
    confidence: 0.88
  },
  {
    ruleId: "formal_event_keywords",
    sourceFields: ["title", "breadcrumbs", "categoryTags", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["wedding", "wedding guest", "cocktail", "gala", "evening", "special event", "occasion dress", "occasion dresses"] },
    apply: {
      "styleSemantics.formalityLevel": "formal",
      "styleSemantics.polishLevel": "high",
      "occasionSemantics.occasionTags": ["occasion"]
    },
    weight: 4,
    confidence: 0.84
  },
  {
    ruleId: "wedding_guest_occasion",
    sourceFields: ["title", "breadcrumbs", "categoryTags", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["wedding guest", "weddings", "wedding"] },
    apply: { "occasionSemantics.occasionTags": ["wedding_guest"] },
    weight: 5,
    confidence: 0.9
  },
  {
    ruleId: "desk_to_dinner",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["desk to dinner", "work to dinner", "work-to-weekend"] },
    apply: {
      "occasionSemantics.occasionTags": ["office", "dinner"],
      "occasionSemantics.dayNightFlexibility": "balanced",
      "styleSemantics.formalityLevel": "business_casual"
    },
    weight: 4,
    confidence: 0.86
  },
  {
    ruleId: "work_occasion",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["commute", "office", "workday", "workwear", "office-ready"] },
    apply: {
      "occasionSemantics.occasionTags": ["office"],
      "styleSemantics.formalityLevel": "business_casual"
    },
    weight: 3,
    confidence: 0.78
  },
  {
    ruleId: "polished_tailored",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["polished", "tailored", "refined", "elevated", "sophisticated", "sleek", "elegant"] },
    apply: { "styleSemantics.polishLevel": "high", "styleSemantics.formalityLevel": "smart_casual" },
    weight: 2,
    confidence: 0.68
  },
  {
    ruleId: "casual_keywords",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["casual", "everyday", "day off", "easy", "throw on", "wear the dress", "laid-back", "weekend", "lived-in"] },
    apply: { "occasionSemantics.occasionTags": ["casual"], "styleSemantics.formalityLevel": "casual" },
    weight: 2,
    confidence: 0.68
  },
  {
    ruleId: "workout_keywords",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["training", "gym", "workout", "running", "runner", "studio", "sweat-wicking"] },
    apply: { "occasionSemantics.occasionTags": ["workout"] },
    weight: 4,
    confidence: 0.84
  },
  {
    ruleId: "running_keywords",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["running", "runner", "run club"] },
    apply: { "occasionSemantics.occasionTags": ["running"] },
    weight: 4,
    confidence: 0.84
  },
  {
    ruleId: "yoga_keywords",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "yoga" },
    apply: { "occasionSemantics.occasionTags": ["yoga", "workout"] },
    weight: 4,
    confidence: 0.84
  },
  {
    ruleId: "vacation_keywords",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["vacation", "resort", "beach", "holiday", "getaway"] },
    apply: { "occasionSemantics.occasionTags": ["vacation"] },
    weight: 3,
    confidence: 0.8
  },
  {
    ruleId: "date_night_keywords",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["date night", "night out", "going out", "romantic", "open back", "low back", "backless", "plunging neckline", "cutout"] },
    apply: { "occasionSemantics.occasionTags": ["date_night"], "styleSemantics.sexinessSignal": "medium" },
    weight: 3,
    confidence: 0.78
  },
  {
    ruleId: "party_keywords",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["party", "holiday party", "celebration"] },
    apply: { "occasionSemantics.occasionTags": ["party"], "styleSemantics.playfulness": "medium" },
    weight: 3,
    confidence: 0.8
  },
  {
    ruleId: "silk_dress_date_night",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes", "compositionText"],
    match: { type: "all_phrases", values: ["silk", "dress"] },
    apply: { "occasionSemantics.occasionTags": ["date_night", "occasion"], "styleSemantics.formalityLevel": "smart_casual" },
    weight: 2,
    confidence: 0.66
  },
  {
    ruleId: "high_ornamentation",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: {
      type: "any_phrase",
      values: ["embellished", "sequined", "sequin", "beaded", "feather trim", "ornate", "dramatic ruffle", "statement bow"]
    },
    apply: { "styleSemantics.ornamentationLevel": "high", "styleSemantics.visualLoudness": "high" },
    weight: 5,
    confidence: 0.88
  },
  {
    ruleId: "medium_ornamentation",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["ruffle", "pleat", "pleated", "bow detail", "lace trim", "lace-up detail", "tiered", "textured", "panelled"] },
    apply: { "styleSemantics.ornamentationLevel": "medium", "styleSemantics.visualLoudness": "medium" },
    weight: 3,
    confidence: 0.76
  },
  {
    ruleId: "print_detail",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["graphic", "print", "printed", "print-heavy", "jacquard floral"] },
    apply: { "styleSemantics.ornamentationLevel": "high", "styleSemantics.visualLoudness": "high" },
    weight: 4,
    confidence: 0.82
  },
  {
    ruleId: "minimalism_signal",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["minimal", "minimalist", "clean lines", "pared-back", "understated", "simple silhouette", "no-fuss"] },
    apply: {
      "styleSemantics.minimalismLevel": "high",
      "styleSemantics.ornamentationLevel": "low",
      "styleSemantics.visualLoudness": "low"
    },
    weight: 4,
    confidence: 0.82
  },
  {
    ruleId: "romantic_detail",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "any_phrase", values: ["soft ruffle", "lace trim", "sweetheart neckline", "bow detail", "floral appliqué", "floaty", "airy"] },
    apply: { "styleSemantics.romanticness": "medium" },
    weight: 3,
    confidence: 0.76
  },
  {
    ruleId: "feminine_weak_signal",
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "feminine" },
    apply: { "styleSemantics.romanticness": "low" },
    weight: 1,
    confidence: 0.48
  }
]
