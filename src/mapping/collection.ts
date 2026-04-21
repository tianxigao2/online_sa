import type { ParsedCollectionItem, ParsedRawProduct, StructuredProduct } from "../shared/types"
import { normalizeParsedRawProduct } from "./adapters"

export function collectionItemToRawProduct(
  item: ParsedCollectionItem,
  categoryHint?: string
): ParsedRawProduct {
  const quickScanText = [item.title, item.thumbnailAlt, item.cardText, item.categoryHint, categoryHint]
    .filter(Boolean)
    .join(" ")
  const description = item.thumbnailAlt ?? item.cardText ?? item.title
  const productFeatures = item.cardText ? [item.cardText] : item.thumbnailAlt ? [item.thumbnailAlt] : []

  return {
    source: item.source,
    productId: item.productId,
    url: item.url,
    title: item.title,
    breadcrumbTrail: [categoryHint ?? item.categoryHint ?? ""].filter(Boolean),
    rawCategoryHint: item.categoryHint ?? categoryHint,
    price: item.price,
    salePrice: item.salePrice,
    currency: "USD",
    availableSizes: [],
    description,
    productFeatures,
    materials: [],
    rawText: quickScanText
  }
}

export function normalizeCollectionItem(
  item: ParsedCollectionItem,
  categoryHint?: string
): StructuredProduct {
  return normalizeParsedRawProduct(collectionItemToRawProduct(item, categoryHint))
}
