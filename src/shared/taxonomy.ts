import type { ApparelCategory } from "./types"

const APPAREL_CATEGORY_KEYWORDS: Record<ApparelCategory, string[]> = {
  tops: ["top", "shell"],
  tees: ["tee", "t-shirt", "t shirt"],
  tanks: ["tank", "cami", "camisole"],
  shirts: ["shirt", "button-down", "button down", "blouse"],
  sweaters: ["sweater", "cardigan", "pullover", "knit"],
  hoodies: ["hoodie", "sweatshirt", "fleece"],
  jackets: ["jacket", "blazer"],
  outerwear: ["parka", "coat", "windbreaker", "anorak", "vest"],
  dresses: ["dress"],
  skirts: ["skirt", "skort"],
  pants: ["pant", "trouser"],
  leggings: ["legging", "tight"],
  shorts: ["short"],
  jumpsuits: ["jumpsuit"],
  rompers: ["romper"],
  bodysuits: ["bodysuit"],
  bras: ["bra", "sports bra"],
  underwear: ["underwear", "thong", "brief"],
  base_layers: ["base layer", "baselayer", "thermal"],
  unknown: []
}

export const EXCLUDED_PRODUCT_KEYWORDS = [
  "accessory",
  "accessories",
  "equipment",
  "bag",
  "belt",
  "bottle",
  "mat",
  "towel",
  "keychain",
  "hat",
  "glove",
  "scarf"
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function keywordPattern(keyword: string): RegExp {
  const escapedParts = keyword.trim().split(/[\s-]+/).map(escapeRegExp)
  return new RegExp(`(^|[^a-z0-9])${escapedParts.join("[\\s-]+")}s?([^a-z0-9]|$)`, "i")
}

const OCCASION_PATTERNS: Record<string, RegExp[]> = {
  workout: [
    /\btraining\b/i,
    /\bgym\b/i,
    /\bworkout\b/i,
    /\brunning\b/i,
    /\brunner\b/i,
    /\bstudio\b/i,
    /\bsweat(?:-wicking)?\b/i
  ],
  running: [/\brunning\b/i, /\brunner\b/i, /\brun club\b/i],
  casual: [/\bcasual\b/i, /\beveryday\b/i, /\bday off\b/i],
  travel: [/\btravel\b/i, /\bairport\b/i, /\bpackable\b/i],
  lounge: [/\blounge\b/i, /\bsoft\b/i, /\brest day\b/i],
  work: [/\bcommute\b/i, /\boffice\b/i, /\bworkday\b/i, /\bworkwear\b/i, /\bpolished\b/i, /\btailored\b/i],
  yoga: [/\byoga\b/i],
  hike: [/\bhike\b/i, /\bhiking\b/i, /\btrail\b/i],
  tennis: [/\btennis\b/i, /\bpickleball\b/i, /\bgolf\b/i],
  vacation: [/\bvacation\b/i, /\bresort\b/i, /\bbeach\b/i, /\bholiday\b/i],
  occasion: [/\boccasion\b/i, /\bevent\b/i, /\bformal\b/i, /\bcocktail\b/i, /\bgala\b/i, /\bblack tie\b/i],
  "date night": [/\bdate night\b/i, /\bnight out\b/i, /\bgoing out\b/i, /\bromantic\b/i],
  party: [/\bparty\b/i, /\bholiday party\b/i, /\bcelebration\b/i],
  "wedding guest": [/\bwedding guest\b/i, /\bguest of\b/i, /\bbridesmaid\b/i, /\bbridal\b/i, /\bwedding\b/i],
  layering: [/\blayer(?:ing)?\b/i]
}

type OccasionHeuristic = {
  occasion: string
  score: number
  test: (text: string) => boolean
}

const OCCASION_HEURISTICS: OccasionHeuristic[] = [
  {
    occasion: "date night",
    score: 2,
    test: (text) =>
      /\b(silk|satin|charmeuse|sequin|lace)\b/i.test(text) &&
      /\b(dress|top|skirt|jumpsuit|romper)\b/i.test(text)
  },
  {
    occasion: "occasion",
    score: 2,
    test: (text) =>
      /\b(silk|satin|charmeuse|sequin|lace)\b/i.test(text) &&
      /\b(dress|gown|maxi dress|mini dress|midi dress)\b/i.test(text)
  },
  {
    occasion: "date night",
    score: 1,
    test: (text) =>
      /\b(halter|low back|open back|strapless|plunge|deep v|deep v neck)\b/i.test(text) &&
      /\b(dress|top|bodysuit|jumpsuit|romper)\b/i.test(text)
  },
  {
    occasion: "casual",
    score: 2,
    test: (text) =>
      /\b(knit|jersey|cotton comfy|ribbed|rib knit)\b/i.test(text) &&
      /\b(dress|top|tee|tank|skirt)\b/i.test(text)
  },
  {
    occasion: "casual",
    score: 1,
    test: (text) =>
      /\b(easy|throw on|wear the dress|feels like nothing|everyday)\b/i.test(text) &&
      /\b(dress|top|tee|tank|skirt)\b/i.test(text)
  },
  {
    occasion: "vacation",
    score: 1,
    test: (text) =>
      /\b(linen|beach|resort|vacation)\b/i.test(text) &&
      /\b(dress|set|top|pant|skirt|short)\b/i.test(text)
  },
  {
    occasion: "work",
    score: 1,
    test: (text) =>
      /\b(tailored|polished|workwear|office|blazer|trouser|button-down|button down)\b/i.test(text)
  }
]

export function classifyApparelCategory(...pieces: Array<string | undefined>): ApparelCategory {
  const text = pieces
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const countMatches = (keyword: string): number => {
    let count = 0
    let startIndex = 0

    while (startIndex < text.length) {
      const matchIndex = text.indexOf(keyword, startIndex)
      if (matchIndex === -1) {
        break
      }

      count += 1
      startIndex = matchIndex + keyword.length
    }

    return count
  }

  let winningCategory: ApparelCategory = "unknown"
  let winningScore = 0

  for (const [category, keywords] of Object.entries(APPAREL_CATEGORY_KEYWORDS) as Array<
    [ApparelCategory, string[]]
  >) {
    const score = keywords.reduce((sum, keyword) => {
      const matches = countMatches(keyword)
      if (matches === 0) {
        return sum
      }
      return sum + keyword.length * matches
    }, 0)
    if (score > winningScore) {
      winningScore = score
      winningCategory = category
    }
  }

  return winningCategory
}

export function isExcludedProduct(...pieces: Array<string | undefined>): boolean {
  const text = pieces
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return EXCLUDED_PRODUCT_KEYWORDS.some((keyword) => keywordPattern(keyword).test(text))
}

export function inferOccasionsFromText(...pieces: Array<string | undefined>): string[] {
  const text = pieces
    .filter(Boolean)
    .join(" ")

  const scores = new Map<string, number>()

  Object.entries(OCCASION_PATTERNS).forEach(([occasion, patterns]) => {
    if (patterns.some((pattern) => pattern.test(text))) {
      scores.set(occasion, (scores.get(occasion) ?? 0) + 2)
    }
  })

  OCCASION_HEURISTICS.forEach(({ occasion, score, test }) => {
    if (test(text)) {
      scores.set(occasion, (scores.get(occasion) ?? 0) + score)
    }
  })

  return Array.from(scores.entries())
    .filter(([, score]) => score > 0)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }
      return left[0].localeCompare(right[0])
    })
    .map(([occasion]) => occasion)
    .slice(0, 4)
}
