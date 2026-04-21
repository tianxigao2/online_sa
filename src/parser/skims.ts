import { classifyApparelCategory, isExcludedProduct } from "../shared/taxonomy"
import type {
  ParsedCollectionItem,
  ParsedCollectionPageResult,
  ParsedProductPageResult,
  ParsedRawProduct
} from "../shared/types"

const SIZE_TOKEN_PATTERN =
  /\b(XXXS|XXS|XS|S|M|L|XL|XXL|1X|2X|3X|\d{2}\s?[A-H]{1,2}|0|2|4|6|8|10|12|14|16|18|20)\b/i

function parseJsonLikeScripts(doc: Document): Record<string, unknown>[] {
  return Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
    .flatMap((node) => {
      try {
        const parsed = JSON.parse(node.textContent ?? "null")
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return []
      }
    })
    .filter((value): value is Record<string, unknown> => typeof value === "object" && value !== null)
}

function schemaTypeIncludes(entry: Record<string, unknown>, typeName: string): boolean {
  const type = entry["@type"]
  if (Array.isArray(type)) {
    return type.some((candidate) => String(candidate).toLowerCase() === typeName.toLowerCase())
  }

  return String(type ?? "").toLowerCase() === typeName.toLowerCase()
}

function extractStructuredProduct(doc: Document): Record<string, unknown> | undefined {
  return parseJsonLikeScripts(doc).find(
    (entry) => schemaTypeIncludes(entry, "ProductGroup") || schemaTypeIncludes(entry, "Product")
  )
}

function extractBreadcrumbList(doc: Document): Record<string, unknown> | undefined {
  return parseJsonLikeScripts(doc).find((entry) => schemaTypeIncludes(entry, "BreadcrumbList"))
}

function extractCollectionPage(doc: Document): Record<string, unknown> | undefined {
  return parseJsonLikeScripts(doc).find((entry) => schemaTypeIncludes(entry, "CollectionPage"))
}

function normalizeText(value: string | null | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim()
  return normalized ? normalized : undefined
}

function readText(doc: Document, selector: string): string | undefined {
  return normalizeText(doc.querySelector(selector)?.textContent)
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value
  }

  const text = String(value ?? "").replace(/[^\d.]/g, "")
  return text ? Number(text) : undefined
}

function hashCode(text: string): number {
  return Array.from(text).reduce((hash, char) => {
    const next = (hash << 5) - hash + char.charCodeAt(0)
    return next | 0
  }, 0)
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function normalizeSize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase()
}

function extractVariants(structuredProduct?: Record<string, unknown>): Record<string, unknown>[] {
  const variants = structuredProduct?.hasVariant
  if (Array.isArray(variants)) {
    return variants.filter((variant): variant is Record<string, unknown> => typeof variant === "object" && variant !== null)
  }

  return []
}

function extractOffersFromProduct(product?: Record<string, unknown>): Record<string, unknown>[] {
  const offers = product?.offers
  if (Array.isArray(offers)) {
    return offers.filter((offer): offer is Record<string, unknown> => typeof offer === "object" && offer !== null)
  }

  return typeof offers === "object" && offers !== null ? [offers as Record<string, unknown>] : []
}

function extractBreadcrumbTrail(doc: Document): string[] {
  const breadcrumbList = extractBreadcrumbList(doc)
  const items = breadcrumbList?.itemListElement

  if (Array.isArray(items)) {
    const structuredCrumbs = items
      .map((item) =>
        typeof item === "object" && item !== null ? normalizeText(String((item as Record<string, unknown>).name ?? "")) : undefined
      )
      .filter((crumb): crumb is string => Boolean(crumb && crumb.toLowerCase() !== "home"))

    if (structuredCrumbs.length > 0) {
      return structuredCrumbs
    }
  }

  return dedupeStrings(
    Array.from(doc.querySelectorAll('nav[aria-label*="breadcrumb" i] a, [data-testid*="breadcrumb" i] a')).map((node) =>
      normalizeText(node.textContent)
    )
  )
}

function extractSizes(doc: Document, structuredProduct?: Record<string, unknown>): string[] {
  const sizes = new Set<string>()

  extractVariants(structuredProduct).forEach((variant) => {
    const size = normalizeText(String(variant.size ?? ""))
    if (size) {
      sizes.add(normalizeSize(size))
    }
  })

  extractOffersFromProduct(structuredProduct).forEach((offer) => {
    const size = normalizeText(String(offer.size ?? ""))
    if (size) {
      sizes.add(normalizeSize(size))
    }
  })

  Array.from(doc.querySelectorAll("button, label, option, [aria-label*='size' i], [data-size]")).forEach((node) => {
    const text = normalizeText(
      [node.textContent, node.getAttribute("aria-label"), node.getAttribute("value"), node.getAttribute("data-size")]
        .filter(Boolean)
        .join(" ")
    )
    const match = text?.match(SIZE_TOKEN_PATTERN)
    if (match?.[1]) {
      sizes.add(normalizeSize(match[1]))
    }
  })

  return Array.from(sizes)
}

function extractPriceSignals(
  doc: Document,
  structuredProduct?: Record<string, unknown>
): Pick<ParsedRawProduct, "price" | "salePrice" | "currency"> {
  const offers = [...extractOffersFromProduct(structuredProduct), ...extractVariants(structuredProduct).flatMap(extractOffersFromProduct)]
  const offerPrices = offers.map((offer) => parsePrice(offer.price)).filter((price): price is number => typeof price === "number")
  const currentPrice = offerPrices.length > 0 ? Math.min(...offerPrices) : parsePrice(doc.querySelector('[itemprop="price"]')?.textContent)

  return {
    price: currentPrice,
    currency: String(offers[0]?.priceCurrency ?? "").trim() || "USD"
  }
}

function extractDescription(doc: Document, structuredProduct?: Record<string, unknown>): string | undefined {
  return (
    normalizeText(String(structuredProduct?.description ?? "")) ||
    readText(doc, "[data-product-description]") ||
    readText(doc, "[itemprop='description']") ||
    doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
    undefined
  )
}

function extractLists(doc: Document): string[] {
  return dedupeStrings(
    Array.from(doc.querySelectorAll("li"))
      .map((node) => normalizeText(node.textContent))
      .filter((text): text is string => Boolean(text && text.length > 12 && text.length < 240))
  )
}

function extractMaterials(description: string | undefined, features: string[]): string[] {
  const combined = [description, ...features].filter(Boolean).join(" ")
  const matches = combined.match(/\b\d{1,3}%\s+[A-Za-z -]+\b/g) ?? []
  return Array.from(new Set(matches.map((match) => match.trim())))
}

function inferProductId(url: string, structuredProduct?: Record<string, unknown>): string {
  const fromStructured = normalizeText(
    String(structuredProduct?.productGroupID ?? structuredProduct?.sku ?? structuredProduct?.mpn ?? structuredProduct?.productID ?? "")
  )
  if (fromStructured) {
    return fromStructured
  }

  return inferProductIdFromUrl(url)
}

function inferProductIdFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    const productSegment = parsedUrl.pathname.match(/\/products\/([^/?#]+)/i)?.[1]
    if (productSegment) {
      return productSegment.toLowerCase()
    }
  } catch {
    return `skims-${Math.abs(hashCode(url))}`
  }

  return `skims-${Math.abs(hashCode(url))}`
}

function cleanProductTitle(title: string): string {
  return title
    .replace(/\s*\|\s*[^|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function titleFromProductUrl(url: string): string | undefined {
  const match = url.match(/\/products\/([^/?#]+)/i)
  if (!match?.[1]) {
    return undefined
  }

  return match[1]
    .split("-")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ")
}

function looksLikeProductPage(
  doc: Document,
  url: string,
  title: string | undefined,
  structuredProduct?: Record<string, unknown>
): boolean {
  if (!/\/products\//.test(url)) {
    return false
  }

  return Boolean(structuredProduct || title || doc.querySelector('button, [role="button"]'))
}

function extractCollectionItemsFromJsonLd(doc: Document, url: string): ParsedCollectionItem[] {
  const collectionPage = extractCollectionPage(doc)
  const mainEntity = collectionPage?.mainEntity
  const itemListElement =
    typeof mainEntity === "object" && mainEntity !== null
      ? (mainEntity as Record<string, unknown>).itemListElement
      : undefined

  if (!Array.isArray(itemListElement)) {
    return []
  }

  return itemListElement
    .map((item): ParsedCollectionItem | undefined => {
      if (typeof item !== "object" || item === null) {
        return undefined
      }

      const record = item as Record<string, unknown>
      const itemUrl = normalizeText(String(record.url ?? ""))
      if (!itemUrl || !/\/products\//.test(itemUrl)) {
        return undefined
      }

      const absoluteUrl = new URL(itemUrl, url).toString()
      const title = normalizeText(String(record.name ?? "")) || titleFromProductUrl(absoluteUrl)
      if (!title) {
        return undefined
      }

      const image = Array.isArray(record.image) ? record.image[0] : record.image

      return {
        source: "skims",
        productId: inferProductIdFromUrl(absoluteUrl),
        url: absoluteUrl,
        title: cleanProductTitle(title),
        thumbnailUrl: normalizeText(String(image ?? "")),
        thumbnailAlt: title,
        cardText: title
      }
    })
    .filter((item): item is ParsedCollectionItem => Boolean(item))
}

function extractCollectionItemsFromDom(doc: Document, url: string, categoryHint?: string): ParsedCollectionItem[] {
  const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href*="/products/"]'))
  const itemsById = new Map<string, ParsedCollectionItem>()

  anchors.forEach((anchor) => {
    const href = anchor.getAttribute("href")
    if (!href) {
      return
    }

    const absoluteUrl = new URL(href, url).toString()
    const productId = inferProductIdFromUrl(absoluteUrl)
    if (itemsById.has(productId)) {
      return
    }

    const image = anchor.querySelector<HTMLImageElement>("img") ?? anchor.closest("article, li, div")?.querySelector<HTMLImageElement>("img")
    const title = normalizeText(anchor.textContent) || normalizeText(image?.getAttribute("alt")) || titleFromProductUrl(absoluteUrl)
    if (!title) {
      return
    }

    const cardRoot = anchor.closest("article, li, div") ?? anchor
    itemsById.set(productId, {
      source: "skims",
      productId,
      url: absoluteUrl,
      title: cleanProductTitle(title),
      categoryHint,
      thumbnailUrl: image?.currentSrc || image?.src || undefined,
      thumbnailAlt: normalizeText(image?.getAttribute("alt")),
      cardText: normalizeText(cardRoot.textContent),
      anchorSelector: `a[href="${href}"]`
    })
  })

  return Array.from(itemsById.values())
}

export function parseSkimsProductPage(
  doc: Document,
  url: string = doc.location?.href ?? "https://skims.com"
): ParsedProductPageResult {
  const structuredProduct = extractStructuredProduct(doc)
  const title =
    normalizeText(String(structuredProduct?.name ?? "")) ||
    readText(doc, "h1") ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    undefined

  if (!looksLikeProductPage(doc, url, title, structuredProduct)) {
    return {
      isProductPage: false,
      supported: false,
      unsupportedReason: "This page does not look like a Skims product detail page."
    }
  }

  const breadcrumbTrail = extractBreadcrumbTrail(doc)
  const description = extractDescription(doc, structuredProduct)
  const productFeatures = extractLists(doc)
  const cleanTitle = title ? cleanProductTitle(title) : undefined
  const categoryHint = classifyApparelCategory(cleanTitle, description, breadcrumbTrail.join(" "), productFeatures.join(" "), url)
  const rawText = [cleanTitle, description, breadcrumbTrail.join(" "), productFeatures.join(" ")]
    .filter(Boolean)
    .join(" ")
  const excludedByKeyword = isExcludedProduct(cleanTitle, breadcrumbTrail.join(" "), productFeatures.join(" "), url)

  if (excludedByKeyword && categoryHint === "unknown") {
    return {
      isProductPage: true,
      supported: false,
      unsupportedReason: "This product appears to be an accessory or non-apparel item, which Version A excludes."
    }
  }

  const rawProduct: ParsedRawProduct = {
    source: "skims",
    productId: inferProductId(url, structuredProduct),
    url,
    title: cleanTitle ?? "Unnamed Skims product",
    breadcrumbTrail,
    rawCategoryHint: categoryHint === "unknown" ? breadcrumbTrail.at(-1) : categoryHint,
    ...extractPriceSignals(doc, structuredProduct),
    availableSizes: extractSizes(doc, structuredProduct),
    sizeChart: undefined,
    description,
    productFeatures,
    materials: extractMaterials(description, productFeatures),
    rawText
  }

  return {
    isProductPage: true,
    supported: categoryHint !== "unknown" || !excludedByKeyword,
    rawProduct
  }
}

export function parseSkimsCollectionPage(
  doc: Document,
  url: string = doc.location?.href ?? "https://skims.com"
): ParsedCollectionPageResult {
  if (/\/products\//.test(url)) {
    return {
      isCollectionPage: false,
      items: []
    }
  }

  const collectionPage = extractCollectionPage(doc)
  if (!/\/collections\//.test(url) && !collectionPage) {
    return {
      isCollectionPage: false,
      items: []
    }
  }

  const pageTitle =
    normalizeText(String(collectionPage?.name ?? "")) ||
    readText(doc, "h1") ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    undefined
  const pageDescription =
    normalizeText(String(collectionPage?.description ?? "")) ||
    doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
    undefined
  const categoryHint = classifyApparelCategory(pageTitle, pageDescription, url)
  const category = categoryHint === "unknown" ? pageTitle : categoryHint
  const jsonLdItems = extractCollectionItemsFromJsonLd(doc, url)
  const domItems = jsonLdItems.length > 0 ? [] : extractCollectionItemsFromDom(doc, url, category)

  return {
    isCollectionPage: true,
    title: pageTitle,
    categoryHint: category,
    items: [...jsonLdItems, ...domItems]
      .map((item) => ({ ...item, categoryHint: item.categoryHint ?? category }))
      .filter((item) => !isExcludedProduct(item.title, item.cardText))
  }
}
