import { classifyApparelCategory, isExcludedProduct } from "../shared/taxonomy"
import type {
  ParsedCollectionItem,
  ParsedCollectionPageResult,
  ParsedProductPageResult,
  ParsedRawProduct
} from "../shared/types"

const SIZE_TOKEN_PATTERN = /\b(XXXS|XXS|XS|S|M|L|XL|XXL|1X|2X|3X|0|2|4|6|8|10|12|14|16|18|20)\b/i

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

function extractStructuredProduct(doc: Document): Record<string, unknown> | undefined {
  return parseJsonLikeScripts(doc).find((entry) => {
    const type = entry["@type"]
    if (Array.isArray(type)) {
      return type.some((candidate) => String(candidate).toLowerCase() === "product")
    }

    return String(type ?? "").toLowerCase() === "product"
  })
}

function extractStructuredItemList(doc: Document): Record<string, unknown> | undefined {
  return parseJsonLikeScripts(doc).find((entry) => {
    const type = entry["@type"]
    if (Array.isArray(type)) {
      return type.some((candidate) => String(candidate).toLowerCase() === "itemlist")
    }

    return String(type ?? "").toLowerCase() === "itemlist"
  })
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

function normalizeSize(value: string): string {
  const trimmed = value.trim().toUpperCase()
  if (/^\d+$/.test(trimmed)) {
    return String(Number(trimmed))
  }

  return trimmed
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function extractStructuredOffers(structuredProduct?: Record<string, unknown>): Record<string, unknown>[] {
  const offers = structuredProduct?.offers
  if (Array.isArray(offers)) {
    return offers.filter((offer): offer is Record<string, unknown> => typeof offer === "object" && offer !== null)
  }

  return typeof offers === "object" && offers !== null ? [offers as Record<string, unknown>] : []
}

function extractBreadcrumbTrail(doc: Document): string[] {
  return dedupeStrings(
    Array.from(doc.querySelectorAll('.pdp__breadcrumbs a, nav[aria-label*="breadcrumb" i] a')).map((node) =>
      normalizeText(node.textContent)
    )
  )
}

function extractSizes(doc: Document, structuredProduct?: Record<string, unknown>): string[] {
  const sizes = new Set<string>()

  Array.from(doc.querySelectorAll("[data-attr='size'], [data-sizepicker-value]")).forEach((node) => {
    const text = normalizeText(
      [
        node.textContent,
        node.getAttribute("aria-label"),
        node.getAttribute("data-title"),
        node.getAttribute("data-attr-value")
      ]
        .filter(Boolean)
        .join(" ")
    )

    const match = text?.match(SIZE_TOKEN_PATTERN)
    if (match?.[1]) {
      sizes.add(normalizeSize(match[1]))
    }
  })

  extractStructuredOffers(structuredProduct).forEach((offer) => {
    const size = normalizeText(String(offer.size ?? ""))
    if (size) {
      sizes.add(normalizeSize(size))
    }
  })

  return Array.from(sizes)
}

function extractPriceSignals(
  doc: Document,
  structuredProduct?: Record<string, unknown>
): Pick<ParsedRawProduct, "price" | "salePrice" | "currency"> {
  const offers = extractStructuredOffers(structuredProduct)
  const salePrice =
    parsePrice(offers[0]?.price) ?? parsePrice(doc.querySelector('[data-product-component="price"] [itemprop="price"]')?.getAttribute("content"))
  const regularPrice = parsePrice(doc.querySelector(".price__original")?.textContent)

  return {
    price: regularPrice ?? salePrice,
    salePrice: regularPrice && salePrice && salePrice < regularPrice ? salePrice : undefined,
    currency: String(offers[0]?.priceCurrency ?? "USD").trim() || "USD"
  }
}

function extractAccordionList(doc: Document, componentName: string): string[] {
  return dedupeStrings(
    Array.from(doc.querySelectorAll(`[data-product-component="${componentName}"] li`)).map((node) =>
      normalizeText(node.textContent)
    )
  )
}

function extractDescription(doc: Document, structuredProduct?: Record<string, unknown>): string | undefined {
  return (
    normalizeText(String(structuredProduct?.description ?? "")) ||
    readText(doc, '[data-product-component="long-description"]') ||
    doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
    undefined
  )
}

function extractMaterials(description: string | undefined, features: string[]): string[] {
  const combined = [description, ...features].filter(Boolean).join(" ")
  const matches = combined.match(/\b\d{1,3}%\s+[A-Za-z -]+\b/g) ?? []
  return Array.from(new Set(matches.map((match) => match.trim())))
}

function inferProductId(url: string, structuredProduct?: Record<string, unknown>, doc?: Document): string {
  const fromStructured = normalizeText(
    String(structuredProduct?.sku ?? structuredProduct?.mpn ?? structuredProduct?.productID ?? "")
  )
  if (fromStructured) {
    return fromStructured
  }

  const fromDom = doc?.querySelector("[data-product-container='pdp']")?.getAttribute("data-pid")
  if (fromDom) {
    return fromDom
  }

  const match = url.match(/\/products\/[^/]+\/([A-Z0-9]+)\.html/i)
  if (match?.[1]) {
    return match[1]
  }

  return `reformation-${Math.abs(hashCode(url))}`
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

  return Boolean(
    doc.querySelector("[data-product-container='pdp'], .main--product-show") ||
      (title && structuredProduct?.offers) ||
      doc.querySelector('[data-product-component="price"] [itemprop="price"]')
  )
}

function inferProductIdFromUrl(url: string): string {
  const match = url.match(/\/products\/[^/]+\/([A-Z0-9]+)\.html/i)
  if (match?.[1]) {
    return match[1]
  }

  const fallback = url.match(/\/products\/([^/?#]+)/i)?.[1]
  return fallback ? fallback.toLowerCase() : `reformation-${Math.abs(hashCode(url))}`
}

function extractCollectionTitle(cardRoot: Element): string | undefined {
  return (
    normalizeText(cardRoot.querySelector('[data-product-component="name"]')?.textContent) ||
    normalizeText(cardRoot.querySelector("[itemprop='name']")?.textContent) ||
    normalizeText(cardRoot.querySelector("img")?.getAttribute("alt"))
  )
}

function selectPrimaryProductAnchor(cardRoot: Element): HTMLAnchorElement | undefined {
  const candidates = Array.from(cardRoot.querySelectorAll<HTMLAnchorElement>('a[href*="/products/"]'))

  return (
    candidates.find((anchor) => anchor.matches(".product-tile__anchor[href]")) ??
    candidates.find((anchor) => anchor.getAttribute("itemprop") === "url") ??
    candidates[0]
  )
}

function extractCollectionAnchorLabel(anchor: HTMLAnchorElement | undefined): string | undefined {
  if (!anchor) {
    return undefined
  }

  const aria = normalizeText(anchor.getAttribute("aria-label"))
  if (!aria) {
    return undefined
  }

  return aria.replace(/^Quick Add\s+/i, "").replace(/\s+in\s+.+$/i, "").trim() || undefined
}

function titleFromProductUrl(url: string): string | undefined {
  const match = url.match(/\/products\/([^/]+)\//i)
  if (!match?.[1]) {
    return undefined
  }

  return match[1]
    .split("-")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ")
}

function looksLikeCollectionShell(doc: Document, url: string): boolean {
  if (/\/products\//.test(url)) {
    return false
  }

  return Boolean(
    doc.querySelector(
      [
        '[data-search-component="search-results"]',
        '[data-search-component="results-container"]',
        '[data-search-component="product-grid"]',
        ".search-results",
        ".search-results__title",
        ".product-grid__component",
        "[data-product-tile]",
        "[data-product-tile-wrapper]"
      ].join(",")
    ) ||
      extractStructuredItemList(doc)?.itemListElement
  )
}

function extractItemListUrls(doc: Document): string[] {
  const itemList = extractStructuredItemList(doc)
  const elements = itemList?.itemListElement
  if (!Array.isArray(elements)) {
    return []
  }

  return elements
    .map((entry) => typeof entry === "object" && entry !== null ? String((entry as Record<string, unknown>).url ?? "") : "")
    .filter((entry) => /\/products\//.test(entry))
}

export function parseReformationProductPage(
  doc: Document,
  url: string = doc.location?.href ?? "https://www.thereformation.com"
): ParsedProductPageResult {
  const structuredProduct = extractStructuredProduct(doc)
  const title =
    normalizeText(String(structuredProduct?.name ?? "")) ||
    readText(doc, '[data-product-component="name"]') ||
    readText(doc, "h1") ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    undefined

  if (!looksLikeProductPage(doc, url, title, structuredProduct)) {
    return {
      isProductPage: false,
      supported: false,
      unsupportedReason: "This page does not look like a Reformation product detail page."
    }
  }

  const breadcrumbTrail = extractBreadcrumbTrail(doc)
  const description = extractDescription(doc, structuredProduct)
  const detailFeatures = extractAccordionList(doc, "details-accordion")
  const materialFeatures = extractAccordionList(doc, "materials-accordion")
  const sustainabilityFeatures = extractAccordionList(doc, "sustainability-accordion")
  const productFeatures = dedupeStrings([...detailFeatures, ...materialFeatures])
  const categoryHint = classifyApparelCategory(title, description, breadcrumbTrail.join(" "), productFeatures.join(" "), url)
  const rawText = [title, description, breadcrumbTrail.join(" "), productFeatures.join(" "), sustainabilityFeatures.join(" ")]
    .filter(Boolean)
    .join(" ")
  const excludedByKeyword = isExcludedProduct(title, breadcrumbTrail.join(" "), productFeatures.join(" "), url)

  if (excludedByKeyword && categoryHint === "unknown") {
    return {
      isProductPage: true,
      supported: false,
      unsupportedReason: "This product appears to be an accessory or non-apparel item, which Version A excludes."
    }
  }

  const rawProduct: ParsedRawProduct = {
    source: "reformation",
    productId: inferProductId(url, structuredProduct, doc),
    url,
    title: title ?? "Unnamed Reformation product",
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

export function parseReformationCollectionPage(
  doc: Document,
  url: string = doc.location?.href ?? "https://www.thereformation.com"
): ParsedCollectionPageResult {
  if (looksLikeProductPage(doc, url, readText(doc, "h1"), extractStructuredProduct(doc))) {
    return {
      isCollectionPage: false,
      items: []
    }
  }

  const productTiles = Array.from(doc.querySelectorAll("[data-product-tile]"))

  if (!looksLikeCollectionShell(doc, url)) {
    return {
      isCollectionPage: false,
      items: []
    }
  }

  const pageTitle = readText(doc, ".search-results__title") || readText(doc, "h1")
  const pageSubtitle = readText(doc, ".search-results__subtitle")
  const categoryHint = classifyApparelCategory(pageTitle, pageSubtitle, url)
  const itemsById = new Map<string, ParsedCollectionItem>()

  productTiles.forEach((tile) => {
    const anchor = selectPrimaryProductAnchor(tile)
    if (!anchor?.getAttribute("href")) {
      return
    }

    const title = extractCollectionTitle(tile) || extractCollectionAnchorLabel(anchor)
    if (!title) {
      return
    }

    const absoluteUrl = new URL(anchor.getAttribute("href")!, url).toString()
    const productId = tile.getAttribute("data-pid") ?? inferProductIdFromUrl(absoluteUrl)
    if (itemsById.has(productId)) {
      return
    }

    const salePrice =
      parsePrice(tile.querySelector('[itemprop="price"]')?.getAttribute("content")) ??
      parsePrice(tile.querySelector('[data-product-component="price"] [itemprop="price"]')?.getAttribute("content"))
    const regularPrice = parsePrice(tile.querySelector(".price__original")?.textContent)
    const image = tile.querySelector<HTMLImageElement>("img[data-cloudinary-plp-image], img")

    itemsById.set(productId, {
      source: "reformation",
      productId,
      url: absoluteUrl,
      title,
      price: regularPrice ?? salePrice,
      salePrice: regularPrice && salePrice && salePrice < regularPrice ? salePrice : undefined,
      categoryHint: categoryHint === "unknown" ? pageTitle : categoryHint,
      thumbnailUrl: image?.currentSrc || image?.src || undefined,
      thumbnailAlt: normalizeText(image?.getAttribute("alt")),
      cardText: normalizeText(tile.textContent),
      anchorSelector: `a[href="${anchor.getAttribute("href")}"]`
    })
  })

  if (itemsById.size === 0) {
    extractItemListUrls(doc).forEach((itemUrl) => {
      const absoluteUrl = new URL(itemUrl, url).toString()
      const productId = inferProductIdFromUrl(absoluteUrl)
      if (itemsById.has(productId)) {
        return
      }

      const title = titleFromProductUrl(absoluteUrl)
      if (!title) {
        return
      }

      itemsById.set(productId, {
        source: "reformation",
        productId,
        url: absoluteUrl,
        title,
        categoryHint: categoryHint === "unknown" ? pageTitle : categoryHint,
        cardText: title
      })
    })
  }

  return {
    isCollectionPage: true,
    title: pageTitle,
    categoryHint: categoryHint === "unknown" ? pageTitle : categoryHint,
    items: Array.from(itemsById.values()).filter((item) => !isExcludedProduct(item.title, item.cardText))
  }
}
