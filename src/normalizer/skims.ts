import { normalizeParsedRawProduct } from "../mapping/adapters"
import type { ParsedRawProduct, StructuredProduct } from "../shared/types"

export function normalizeSkimsProduct(rawProduct: ParsedRawProduct): StructuredProduct {
  return normalizeParsedRawProduct(rawProduct)
}
