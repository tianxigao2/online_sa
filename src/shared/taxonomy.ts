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

const OCCASION_KEYWORDS: Record<string, string[]> = {
  workout: ["train", "training", "gym", "workout", "run", "running", "studio", "sweat"],
  casual: ["casual", "everyday", "day off"],
  travel: ["travel", "airport", "packable"],
  lounge: ["lounge", "soft", "rest day"],
  commute: ["commute", "office", "workday"],
  yoga: ["yoga"],
  hike: ["hike", "hiking", "trail"],
  tennis: ["tennis", "pickleball", "golf"]
}

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

  return EXCLUDED_PRODUCT_KEYWORDS.some((keyword) => text.includes(keyword))
}

export function inferOccasionsFromText(...pieces: Array<string | undefined>): string[] {
  const text = pieces
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return Object.entries(OCCASION_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
    .map(([occasion]) => occasion)
}
