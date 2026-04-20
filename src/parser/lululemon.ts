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
  const entries = parseJsonLikeScripts(doc)

  return entries.find((entry) => {
    const type = entry["@type"]
    if (Array.isArray(type)) {
      return type.some((candidate) => String(candidate).toLowerCase() === "product")
    }
    return String(type ?? "").toLowerCase() === "product"
  })
}

function readText(doc: Document, selector: string): string | undefined {
  return doc.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() || undefined
}

function normalizeText(value: string | null | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim()
  return normalized ? normalized : undefined
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value
  }
  const text = String(value ?? "").replace(/[^\d.]/g, "")
  return text ? Number(text) : undefined
}

function extractBreadcrumbTrail(doc: Document): string[] {
  const crumbs = Array.from(
    doc.querySelectorAll('nav[aria-label*="breadcrumb" i] a, [data-testid*="breadcrumb" i] a')
  )
    .map((node) => node.textContent?.trim())
    .filter((value): value is string => Boolean(value))

  if (crumbs.length > 0) {
    return crumbs
  }

  const jsonProduct = extractStructuredProduct(doc)
  const category = String(jsonProduct?.category ?? "").trim()
  return category ? [category] : []
}

function extractSizes(doc: Document): string[] {
  const sizes = new Set<string>()

  const candidates = Array.from(
    doc.querySelectorAll(
      [
        '[data-testid*="size" i]',
        '[aria-label*="size" i]',
        'button',
        'label',
        'option'
      ].join(",")
    )
  )

  for (const node of candidates) {
    const text = [node.textContent, node.getAttribute("aria-label"), node.getAttribute("value")]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()

    const match = text.match(SIZE_TOKEN_PATTERN)
    if (!match) {
      continue
    }

    const token = match[1].toUpperCase()
    if (token === "SIZE") {
      continue
    }
    sizes.add(token)
  }

  return Array.from(sizes)
}

function extractLists(doc: Document): string[] {
  return Array.from(doc.querySelectorAll("li"))
    .map((node) => node.textContent?.replace(/\s+/g, " ").trim())
    .filter((text): text is string => Boolean(text))
    .filter((text) => text.length > 12)
}

function extractDescription(doc: Document, structuredProduct?: Record<string, unknown>): string | undefined {
  return (
    String(structuredProduct?.description ?? "").trim() ||
    readText(doc, '[data-testid*="description" i]') ||
    readText(doc, "[itemprop='description']") ||
    doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
    undefined
  )
}

function extractPriceSignals(
  doc: Document,
  structuredProduct?: Record<string, unknown>
): Pick<ParsedRawProduct, "price" | "salePrice" | "currency"> {
  const offers = structuredProduct?.offers
  const offerRecord =
    Array.isArray(offers) && offers.length > 0 ? (offers[0] as Record<string, unknown>) : offers

  const salePrice = parsePrice((offerRecord as Record<string, unknown> | undefined)?.price)
  const lowPrice = parsePrice((offerRecord as Record<string, unknown> | undefined)?.lowPrice)
  const regularPrice =
    parsePrice(doc.querySelector('[data-testid*="price" i]')?.textContent) ?? salePrice ?? lowPrice

  return {
    price: regularPrice,
    salePrice: salePrice && regularPrice && salePrice < regularPrice ? salePrice : undefined,
    currency:
      String((offerRecord as Record<string, unknown> | undefined)?.priceCurrency ?? "").trim() || "USD"
  }
}

function extractSizeChart(doc: Document): ParsedRawProduct["sizeChart"] {
  const tables = Array.from(doc.querySelectorAll("table"))
  if (tables.length === 0) {
    return undefined
  }

  const parsedTable = tables
    .map((table) => {
      const rows = Array.from(table.querySelectorAll("tr"))
      const headerCells = rows.shift()?.querySelectorAll("th, td")
      const headers = Array.from(headerCells ?? []).map((cell) =>
        cell.textContent?.replace(/\s+/g, " ").trim() || ""
      )

      return rows
        .map((row) => {
          const values = Array.from(row.querySelectorAll("td, th")).map(
            (cell) => cell.textContent?.replace(/\s+/g, " ").trim() || ""
          )
          if (values.length === 0) {
            return null
          }

          return values.reduce<Record<string, string>>((record, value, index) => {
            record[headers[index] || `col_${index}`] = value
            return record
          }, {})
        })
        .filter((row): row is Record<string, string> => Boolean(row))
    })
    .flat()

  const rawText = parsedTable
    .map((row) => Object.values(row).join(" "))
    .join(" | ")
    .trim()

  return parsedTable.length > 0 ? { rawText, table: parsedTable } : undefined
}

function extractMaterials(description: string | undefined, features: string[]): string[] {
  const combined = [description, ...features].filter(Boolean).join(" ")
  const matches = combined.match(/\b\d{1,3}%\s+[A-Za-z -]+\b/g) ?? []
  return Array.from(new Set(matches.map((match) => match.trim())))
}

function inferProductId(url: string, structuredProduct?: Record<string, unknown>): string {
  const fromStructured =
    String(structuredProduct?.sku ?? structuredProduct?.productID ?? structuredProduct?.mpn ?? "").trim()
  if (fromStructured) {
    return fromStructured
  }

  return inferProductIdFromUrl(url)
}

function inferProductIdFromUrl(url: string): string {
  const prodMatch = url.match(/(prod\d+)/i)
  if (prodMatch?.[1]) {
    return prodMatch[1]
  }

  try {
    const parsedUrl = new URL(url)
    const segments = parsedUrl.pathname.split("/").filter(Boolean)
    const slug = segments.at(-1) || segments.at(-2)
    if (slug) {
      return slug.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()
    }
  } catch {
    return `lululemon-${Math.abs(hashCode(url))}`
  }

  return `lululemon-${Math.abs(hashCode(url))}`
}

function hashCode(text: string): number {
  return Array.from(text).reduce((hash, char) => {
    const next = (hash << 5) - hash + char.charCodeAt(0)
    return next | 0
  }, 0)
}

function extractPriceFromNearbyText(node: Element): { price?: number; salePrice?: number } {
  const nearbyText = [node.textContent, node.parentElement?.textContent, node.closest("section, article, li, div")?.textContent]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")

  const salePriceMatch = nearbyText.match(/sale price\s*\$?(\d+(?:\.\d+)?)/i)
  const regularPriceMatch = nearbyText.match(/regular price\s*\$?(\d+(?:\.\d+)?)/i)
  const plainPriceMatch = nearbyText.match(/\$(\d+(?:\.\d+)?)/)

  if (salePriceMatch) {
    return {
      salePrice: Number(salePriceMatch[1]),
      price: regularPriceMatch ? Number(regularPriceMatch[1]) : Number(salePriceMatch[1])
    }
  }

  return {
    price: plainPriceMatch ? Number(plainPriceMatch[1]) : undefined
  }
}

function extractCollectionCardRoot(anchor: HTMLAnchorElement): Element {
  let current: Element | null = anchor

  for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
    const text = normalizeText(current.textContent) ?? ""
    const hasImage = Boolean(current.querySelector("img"))
    const hasPrice = /\$\d/.test(text) || /sale price|regular price/i.test(text)
    const productLinks = current.querySelectorAll('a[href*="/p/"]').length

    if (productLinks > 0 && (hasImage || hasPrice)) {
      return current
    }
  }

  return anchor
}

function titleFromProductUrl(url: string): string | undefined {
  try {
    const parsedUrl = new URL(url)
    const segments = parsedUrl.pathname.split("/").filter(Boolean)
    const slug = [...segments].reverse().find((segment) => segment !== "_" && !/^prod\d+$/i.test(segment))
    if (!slug) {
      return undefined
    }

    const normalized = slug
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    if (!normalized) {
      return undefined
    }

    return normalized.replace(/\b\w/g, (token) => token.toUpperCase())
  } catch {
    return undefined
  }
}

function looksLikeProductTitle(text: string): boolean {
  const normalized = text.trim()
  if (!normalized) {
    return false
  }

  if (normalized.length < 4 || normalized.length > 140) {
    return false
  }

  if (/^\$/.test(normalized)) {
    return false
  }

  if (/sale price|regular price|wishlist|quick add|select size|add to bag/i.test(normalized)) {
    return false
  }

  return /[a-z]/i.test(normalized)
}

function extractCollectionTitle(anchor: HTMLAnchorElement, cardRoot: Element, absoluteUrl: string): string | undefined {
  const directAnchorText = normalizeText(anchor.textContent)
  if (directAnchorText && looksLikeProductTitle(directAnchorText)) {
    return directAnchorText
  }

  const headingText = Array.from(cardRoot.querySelectorAll("h1, h2, h3, h4, [data-testid*='product' i], [data-test*='product' i]"))
    .map((node) => normalizeText(node.textContent))
    .find((text): text is string => typeof text === "string" && looksLikeProductTitle(text))

  if (headingText) {
    return headingText
  }

  const imageAlt = normalizeText(cardRoot.querySelector("img")?.getAttribute("alt"))
  if (imageAlt && looksLikeProductTitle(imageAlt)) {
    return imageAlt
  }

  return titleFromProductUrl(absoluteUrl)
}

function hasButtonWithText(doc: Document, text: string): boolean {
  const normalizedTarget = text.trim().toLowerCase()
  return Array.from(doc.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']")).some(
    (node) => {
      const label = [
        node.textContent,
        node.getAttribute("aria-label"),
        node.getAttribute("value")
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()

      return label.includes(normalizedTarget)
    }
  )
}

function isLikelyProductPage(
  doc: Document,
  url: string,
  title: string | undefined,
  structuredProduct?: Record<string, unknown>
): boolean {
  if (/\/c\//.test(url)) {
    return false
  }

  if (/\/p\//.test(url)) {
    return true
  }

  const hasAddToBag = hasButtonWithText(doc, "add to bag")
  const hasSelectSize = /select size/i.test(doc.body.textContent ?? "")
  const hasProductSchema =
    Boolean(structuredProduct) &&
    Boolean(String(structuredProduct?.name ?? "").trim()) &&
    Boolean(structuredProduct?.offers)
  const looksLikeProductListing =
    /product list/i.test(doc.body.textContent ?? "") || doc.querySelectorAll('a[href*="/p/"]').length > 3
  const hasPrice = Boolean(doc.querySelector('[data-testid*="price" i], [itemprop="price"]'))
  const hasTitle = Boolean(title)

  if (looksLikeProductListing && !hasAddToBag) {
    return false
  }

  return hasPrice && hasTitle && (hasAddToBag || hasSelectSize || hasProductSchema)
}

export function parseLululemonProductPage(
  doc: Document,
  url: string = doc.location?.href ?? "https://shop.lululemon.com"
): ParsedProductPageResult {
  const structuredProduct = extractStructuredProduct(doc)
  const title =
    String(structuredProduct?.name ?? "").trim() ||
    readText(doc, "h1") ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    undefined

  if (!isLikelyProductPage(doc, url, title, structuredProduct)) {
    return {
      isProductPage: false,
      supported: false,
      unsupportedReason: "This page does not look like a lululemon product detail page."
    }
  }

  const breadcrumbTrail = extractBreadcrumbTrail(doc)
  const description = extractDescription(doc, structuredProduct)
  const productFeatures = extractLists(doc)
  const categoryHint = classifyApparelCategory(title, description, breadcrumbTrail.join(" "), url)
  const rawText = [title, description, breadcrumbTrail.join(" "), productFeatures.join(" ")].join(" ")
  const excludedByKeyword = isExcludedProduct(title, breadcrumbTrail.join(" "), url)

  if (excludedByKeyword && categoryHint === "unknown") {
    return {
      isProductPage: true,
      supported: false,
      unsupportedReason: "This product appears to be an accessory or equipment item, which Version A excludes."
    }
  }

  const rawProduct: ParsedRawProduct = {
    source: "lululemon",
    productId: inferProductId(url, structuredProduct),
    url,
    title: title ?? "Unnamed lululemon product",
    breadcrumbTrail,
    rawCategoryHint: categoryHint === "unknown" ? breadcrumbTrail.at(-1) : categoryHint,
    ...extractPriceSignals(doc, structuredProduct),
    availableSizes: extractSizes(doc),
    sizeChart: extractSizeChart(doc),
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

export function parseLululemonCollectionPage(
  doc: Document,
  url: string = doc.location?.href ?? "https://shop.lululemon.com"
): ParsedCollectionPageResult {
  if (!/\/c\//.test(url)) {
    return {
      isCollectionPage: false,
      items: []
    }
  }

  const pageTitle = readText(doc, "h1")
  const categoryHint = classifyApparelCategory(pageTitle, url)
  const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href*="/p/"]'))
  const itemsById = new Map<string, ParsedCollectionItem>()

  anchors.forEach((anchor) => {
    const href = anchor.href
    if (!href) {
      return
    }

    const absoluteUrl = new URL(href, url).toString()
    const cardRoot = extractCollectionCardRoot(anchor)
    const title = extractCollectionTitle(anchor, cardRoot, absoluteUrl)
    if (!title) {
      return
    }

    const productId = inferProductIdFromUrl(absoluteUrl)
    if (itemsById.has(productId)) {
      return
    }

    const cardText = normalizeText(cardRoot.textContent)
    const thumbnail = cardRoot.querySelector<HTMLImageElement>("img")
    const priceSignals = extractPriceFromNearbyText(cardRoot)
    itemsById.set(productId, {
      source: "lululemon",
      productId,
      url: absoluteUrl,
      title,
      price: priceSignals.price,
      salePrice: priceSignals.salePrice,
      categoryHint: categoryHint === "unknown" ? pageTitle : categoryHint,
      thumbnailUrl: thumbnail?.currentSrc || thumbnail?.src || undefined,
      thumbnailAlt: normalizeText(thumbnail?.getAttribute("alt")),
      cardText,
      anchorSelector: `a[href="${anchor.getAttribute("href")}"]`
    })
  })

  return {
    isCollectionPage: true,
    title: pageTitle,
    categoryHint: categoryHint === "unknown" ? pageTitle : categoryHint,
    items: Array.from(itemsById.values()).filter((item) => !isExcludedProduct(item.title))
  }
}
