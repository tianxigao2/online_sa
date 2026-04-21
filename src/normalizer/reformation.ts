import { normalizeParsedRawProduct } from "../mapping/adapters"
import type { ParsedRawProduct, StructuredProduct } from "../shared/types"

export function normalizeReformationProduct(rawProduct: ParsedRawProduct): StructuredProduct {
  return normalizeParsedRawProduct(rawProduct)
}
