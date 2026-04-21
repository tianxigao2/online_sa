import type { MappingRule } from "../types"

export const CATEGORY_OVERRIDE_RULES: MappingRule[] = [
  {
    ruleId: "structured_blazer_override",
    categories: ["jackets"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "any_phrase", values: ["structured", "tailored"] },
    apply: { "construction.structureLevel": "high", "styleSemantics.polishLevel": "high" },
    weight: 5,
    confidence: 0.86
  },
  {
    ruleId: "structured_dress_override",
    categories: ["dresses"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "any_phrase", values: ["structured", "tailored"] },
    apply: { "construction.structureLevel": "medium_high", "shape.fitIntent": "tailored" },
    weight: 5,
    confidence: 0.84
  },
  {
    ruleId: "structured_knit_override",
    categories: ["tops", "tees", "tanks", "sweaters"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints", "fabricNotes"],
    match: { type: "all_phrases", values: ["structured", "knit"] },
    apply: { "construction.structureLevel": "medium_low" },
    weight: 5,
    confidence: 0.78
  },
  {
    ruleId: "puff_sleeve_dress_override",
    categories: ["dresses"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "puff sleeve" },
    apply: { "styleSemantics.ornamentationLevel": "medium", "styleSemantics.romanticness": "medium" },
    weight: 4,
    confidence: 0.74
  },
  {
    ruleId: "puff_sleeve_top_override",
    categories: ["tops", "shirts", "sweaters"],
    sourceFields: ["title", "descriptionBlocks", "bulletPoints"],
    match: { type: "phrase", value: "puff sleeve" },
    apply: { "styleSemantics.ornamentationLevel": "low", "styleSemantics.romanticness": "low" },
    weight: 4,
    confidence: 0.66
  }
]
