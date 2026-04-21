import { classifyApparelCategory } from "../shared/taxonomy"
import type { ApparelCategory } from "../shared/types"
import { BRAND_MAPPING_RULES } from "./rules/brands"
import { GLOBAL_MAPPING_RULES } from "./rules/global"
import { CATEGORY_OVERRIDE_RULES } from "./rules/overrides"
import type {
  CanonicalFieldValue,
  CanonicalGarment,
  EvidenceItem,
  MappingRule,
  MatchDefinition,
  RawProductMappingPayload,
  SourceField
} from "./types"

type Candidate = {
  value: CanonicalFieldValue
  score: number
  confidence: number
  evidence: EvidenceItem
}

const ARRAY_FIELDS = new Set(["occasionSemantics.occasionTags", "construction.surfaceFinish", "occasionSemantics.seasonality"])

const CATEGORY_GARMENT_TYPES: Partial<Record<ApparelCategory, string>> = {
  tops: "top",
  tees: "top",
  tanks: "top",
  shirts: "top",
  sweaters: "sweater",
  hoodies: "sweater",
  jackets: "jacket",
  outerwear: "coat",
  dresses: "dress",
  skirts: "skirt",
  pants: "pants",
  leggings: "active_bottom",
  shorts: "shorts",
  jumpsuits: "jumpsuit",
  rompers: "jumpsuit",
  bodysuits: "top",
  bras: "active_top",
  underwear: "underwear",
  base_layers: "active_top"
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function phrasePattern(keyword: string): RegExp {
  const escapedParts = keyword.trim().split(/[\s-]+/).map(escapeRegExp)
  return new RegExp(`(^|[^a-z0-9])${escapedParts.join("[\\s-]+")}([^a-z0-9]|$)`, "i")
}

function readSourceField(payload: RawProductMappingPayload, field: SourceField): string[] {
  const value = payload[field]
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  return value ? [value] : []
}

function valuesForRule(payload: RawProductMappingPayload, rule: MappingRule): Array<{ sourceField: string; text: string }> {
  return rule.sourceFields.flatMap((sourceField) =>
    readSourceField(payload, sourceField).map((text) => ({ sourceField, text }))
  )
}

function findPhraseMatch(text: string, phrase: string): string | undefined {
  const match = text.match(phrasePattern(phrase))
  return match ? phrase : undefined
}

function findMatch(texts: Array<{ sourceField: string; text: string }>, match: MatchDefinition) {
  if (match.type === "phrase") {
    for (const candidate of texts) {
      const matchedText = findPhraseMatch(candidate.text, match.value)
      if (matchedText) {
        return { ...candidate, matchedText }
      }
    }
  }

  if (match.type === "any_phrase") {
    for (const phrase of match.values) {
      for (const candidate of texts) {
        const matchedText = findPhraseMatch(candidate.text, phrase)
        if (matchedText) {
          return { ...candidate, matchedText }
        }
      }
    }
  }

  if (match.type === "all_phrases") {
    const combined = texts.map(({ text }) => text).join(" ")
    const allMatched = match.values.every((phrase) => phrasePattern(phrase).test(combined))
    if (allMatched) {
      return { sourceField: "combined", text: combined, matchedText: match.values.join(" + ") }
    }
  }

  if (match.type === "regex") {
    for (const candidate of texts) {
      const regexMatch = candidate.text.match(match.pattern)
      if (regexMatch?.[0]) {
        return { ...candidate, matchedText: regexMatch[0] }
      }
    }
  }

  return undefined
}

function emptyCanonical(): CanonicalGarment {
  return {
    identity: {},
    construction: {},
    shape: {},
    styleSemantics: {},
    occasionSemantics: {},
    sizing: {},
    evidence: {},
    confidence: {}
  }
}

function getTargetContainer(canonical: CanonicalGarment, path: string): Record<string, unknown> | undefined {
  const [root] = path.split(".")
  switch (root) {
    case "identity":
      return canonical.identity
    case "construction":
      return canonical.construction
    case "shape":
      return canonical.shape
    case "styleSemantics":
      return canonical.styleSemantics
    case "occasionSemantics":
      return canonical.occasionSemantics
    case "sizing":
      return canonical.sizing
    default:
      return undefined
  }
}

function setField(canonical: CanonicalGarment, path: string, value: CanonicalFieldValue) {
  const [, key] = path.split(".")
  const container = getTargetContainer(canonical, path)
  if (!container || !key) {
    return
  }

  container[key] = value
}

function addEvidence(canonical: CanonicalGarment, path: string, evidence: EvidenceItem) {
  canonical.evidence[path] = [...(canonical.evidence[path] ?? []), evidence]
}

function chooseScalarCandidate(candidates: Candidate[]): Candidate | undefined {
  return [...candidates].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }
    return right.confidence - left.confidence
  })[0]
}

function resolveCandidates(canonical: CanonicalGarment, candidatesByPath: Map<string, Candidate[]>) {
  candidatesByPath.forEach((candidates, path) => {
    candidates.forEach(({ evidence }) => addEvidence(canonical, path, evidence))

    if (ARRAY_FIELDS.has(path)) {
      const values = candidates.flatMap(({ value }) => (Array.isArray(value) ? value : [value]))
      const deduped = Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)))
      setField(canonical, path, deduped)
      canonical.confidence[path] = Math.min(0.98, candidates.reduce((sum, item) => sum + item.confidence, 0) / Math.max(1, candidates.length) + deduped.length * 0.03)
      return
    }

    const winner = chooseScalarCandidate(candidates)
    if (!winner) {
      return
    }

    setField(canonical, path, winner.value)
    const conflictingValues = new Set(candidates.map(({ value }) => JSON.stringify(value))).size
    const conflictPenalty = conflictingValues > 1 ? 0.12 : 0
    canonical.confidence[path] = Math.max(0.1, Math.min(0.98, winner.confidence + Math.min(0.12, candidates.length * 0.03) - conflictPenalty))
  })
}

function inferComposition(text: string | undefined): Array<{ material: string; pct?: number }> | undefined {
  const matches = text?.match(/\b\d{1,3}%\s+[A-Za-z -]+\b/g)
  if (!matches?.length) {
    return undefined
  }

  return matches.map((match) => {
    const [, pct, material] = match.match(/^(\d{1,3})%\s+(.+)$/) ?? []
    return {
      material: material?.trim().toLowerCase() ?? match.toLowerCase(),
      pct: pct ? Number(pct) : undefined
    }
  })
}

function inferSizeSystem(sizeLabels: string[]): string | undefined {
  if (sizeLabels.length === 0) {
    return undefined
  }

  if (sizeLabels.every((size) => /^\d+$/.test(size))) {
    return "us_numeric_even"
  }

  if (sizeLabels.some((size) => /^X{0,3}S$|^M$|^L$|^X{1,2}L$|^[123]X$/.test(size))) {
    return "alpha"
  }

  return "unknown"
}

function applyRules(payload: RawProductMappingPayload, category: ApparelCategory): Map<string, Candidate[]> {
  const candidatesByPath = new Map<string, Candidate[]>()
  const rules = [...GLOBAL_MAPPING_RULES, ...BRAND_MAPPING_RULES, ...CATEGORY_OVERRIDE_RULES]

  rules.forEach((rule) => {
    if (rule.brands && !rule.brands.includes(payload.site)) {
      return
    }
    if (rule.categories && !rule.categories.includes(category)) {
      return
    }

    const matched = findMatch(valuesForRule(payload, rule), rule.match)
    if (!matched) {
      return
    }

    Object.entries(rule.apply).forEach(([path, value]) => {
      const evidence: EvidenceItem = {
        sourceField: matched.sourceField,
        matchedText: matched.matchedText,
        ruleId: rule.ruleId,
        weight: rule.weight
      }
      const candidate: Candidate = {
        value,
        score: rule.weight * rule.confidence,
        confidence: rule.confidence,
        evidence
      }

      candidatesByPath.set(path, [...(candidatesByPath.get(path) ?? []), candidate])
    })
  })

  return candidatesByPath
}

export function mapRawProductToCanonical(payload: RawProductMappingPayload): CanonicalGarment {
  const category = classifyApparelCategory(
    ...(payload.categoryTags ?? []),
    ...(payload.breadcrumbs ?? []),
    payload.title,
    ...(payload.descriptionBlocks ?? []),
    ...(payload.bulletPoints ?? [])
  )
  const canonical = emptyCanonical()
  const candidatesByPath = applyRules(payload, category)

  resolveCandidates(canonical, candidatesByPath)

  canonical.identity.sourceCategory = category
  canonical.identity.garmentType = canonical.identity.garmentType ?? CATEGORY_GARMENT_TYPES[category] ?? "unknown"
  canonical.identity.primaryCategoryConfidence = category === "unknown" ? 0.2 : 0.82
  canonical.sizing.sizeLabels = payload.sizeOptions ?? []
  canonical.sizing.sizeChartAvailable = Boolean(payload.sizeChart?.table?.length || payload.sizeChart?.rawText)
  canonical.sizing.sizeSystemType = inferSizeSystem(canonical.sizing.sizeLabels)
  canonical.sizing.fitBias = "unknown"
  canonical.sizing.petiteTallSignal = "none"

  const composition = inferComposition(payload.compositionText)
  if (composition) {
    canonical.construction.composition = composition
    canonical.confidence["construction.composition"] = 0.9
  }

  return canonical
}
