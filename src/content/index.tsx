import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { recommendProduct } from "../engine/recommendation"
import { normalizeLululemonProduct } from "../normalizer/lululemon"
import { parseLululemonCollectionPage, parseLululemonProductPage } from "../parser/lululemon"
import { addIgnoreRule, getIgnoreRules, removeIgnoreRule } from "../storage/localStore"
import { getUserProfile } from "../storage/localStore"
import type { IgnoreRule, ParsedCollectionItem, RecommendationResult, StructuredProduct } from "../shared/types"
import { ProductPanel } from "./panel"
import { panelStyles } from "./styles"

const CONTAINER_ID = "lululemon-fit-signal-root"

let root: Root | undefined
let shadowRoot: ShadowRoot | undefined
let lastUrl = window.location.href
let lastIgnoredRule: IgnoreRule | undefined

function openSettingsPage() {
  const optionsUrl = chrome.runtime?.getURL ? chrome.runtime.getURL("options.html") : "options.html"
  window.open(optionsUrl, "_blank", "noopener,noreferrer")
}

function levelLabel(level: RecommendationResult["level"]): string {
  switch (level) {
    case "strong":
      return "Great fit"
    case "try":
      return "Worth a look"
    case "cautious":
      return "Maybe"
    case "avoid":
      return "Low fit match"
  }
}

function ensureMountNode(): ShadowRoot {
  const existing = document.getElementById(CONTAINER_ID)
  const host = existing ?? Object.assign(document.createElement("div"), { id: CONTAINER_ID })

  if (!existing) {
    document.documentElement.appendChild(host)
  }

  if (!host.shadowRoot) {
    const createdShadow = host.attachShadow({ mode: "open" })
    const style = document.createElement("style")
    style.textContent = panelStyles
    createdShadow.appendChild(style)

    const mount = document.createElement("div")
    mount.className = "lfs-root debug"
    createdShadow.appendChild(mount)
    shadowRoot = createdShadow
    root = createRoot(mount)
  }

  shadowRoot = host.shadowRoot ?? undefined
  document.documentElement.setAttribute("data-lululemon-fit-signal", "loaded")
  return shadowRoot!
}

function clearCollectionHighlights() {
  document.querySelectorAll(".lfs-inline-badge").forEach((node) => node.remove())
  document.querySelectorAll(".lfs-inline-target").forEach((node) => node.classList.remove("lfs-inline-target"))
}

function makeCollectionProduct(item: ParsedCollectionItem, categoryHint?: string): StructuredProduct {
  return normalizeLululemonProduct({
    source: "lululemon",
    productId: item.productId,
    url: item.url,
    title: item.title,
    breadcrumbTrail: [categoryHint ?? item.categoryHint ?? ""].filter(Boolean),
    rawCategoryHint: item.categoryHint ?? categoryHint,
    price: item.price,
    salePrice: item.salePrice,
    currency: "USD",
    availableSizes: [],
    description: item.title,
    productFeatures: [],
    materials: [],
    rawText: [item.title, item.categoryHint, categoryHint].filter(Boolean).join(" ")
  })
}

function collectItemWhy(recommendation: RecommendationResult): string {
  return recommendation.reasons[0] ?? recommendation.recommendedAttributes[0]?.replace(/_/g, " ") ?? "Limited visible metadata."
}

function highlightCollectionItems(items: Array<{ item: ParsedCollectionItem; recommendation: RecommendationResult }>) {
  clearCollectionHighlights()

  items.forEach(({ item, recommendation }) => {
    if (!item.anchorSelector) {
      return
    }

    const anchor = document.querySelector<HTMLAnchorElement>(item.anchorSelector)
    if (!anchor) {
      return
    }

    const badge = document.createElement("span")
    badge.className = "lfs-inline-badge"
    badge.dataset.level = recommendation.level
    badge.textContent = `${levelLabel(recommendation.level)}${recommendation.recommendedAttributes[0] ? ` · ${recommendation.recommendedAttributes[0].replace(/_/g, " ")}` : ""}`

    anchor.classList.add("lfs-inline-target")
    anchor.insertAdjacentElement("afterend", badge)
  })
}

async function renderPanel(): Promise<void> {
  ensureMountNode()

  const collection = parseLululemonCollectionPage(document, window.location.href)
  const parsed = parseLululemonProductPage(document, window.location.href)
  if (!root) {
    return
  }

  if (collection.isCollectionPage) {
    const [profile, ignoreRules] = await Promise.all([getUserProfile(), getIgnoreRules()])
    const recommendations = collection.items
      .slice(0, 24)
      .map((item) => {
        const product = makeCollectionProduct(item, collection.categoryHint)
        const recommendation = recommendProduct(product, profile, ignoreRules)
        return { item, recommendation }
      })
      .filter(({ recommendation }) => recommendation.level !== "avoid" || recommendation.confidence >= 0.45)
      .sort((left, right) => right.recommendation.confidence - left.recommendation.confidence)

    highlightCollectionItems(recommendations)
    root.render(
      <ProductPanel
        collectionItems={recommendations.slice(0, 4).map(({ item, recommendation }) => ({
          title: item.title,
          level: recommendation.level,
          why: collectItemWhy(recommendation)
        }))}
        onOpenSettings={openSettingsPage}
        onIgnoreSimilar={() => undefined}
      />
    )
    return
  }

  clearCollectionHighlights()

  if (!parsed.isProductPage) {
    root.render(
      <ProductPanel
        statusMessage="LFS loaded: current page does not look like a lululemon product page."
        onOpenSettings={openSettingsPage}
        onIgnoreSimilar={() => undefined}
      />
    )
    return
  }

  if (!parsed.supported || !parsed.rawProduct) {
    const mount = shadowRoot?.querySelector(".lfs-root")
    mount?.classList.remove("debug")
    root.render(
      <ProductPanel
        unsupportedReason={parsed.unsupportedReason ?? "This product is not supported in Version A."}
        onOpenSettings={openSettingsPage}
        onIgnoreSimilar={() => undefined}
      />
    )
    return
  }

  const [profile, ignoreRules] = await Promise.all([getUserProfile(), getIgnoreRules()])
  const product = normalizeLululemonProduct(parsed.rawProduct)
  const recommendation = recommendProduct(product, profile, ignoreRules)
  const mount = shadowRoot?.querySelector(".lfs-root")
  mount?.classList.remove("debug")

  root.render(
    <ProductPanel
      product={product}
      recommendation={recommendation}
      actionMessage={lastIgnoredRule ? `Ignore rule saved for "${lastIgnoredRule.label}".` : undefined}
      onOpenSettings={openSettingsPage}
      onIgnoreSimilar={async () => {
        lastIgnoredRule = await addIgnoreRule(product)
        await renderPanel()
      }}
      onUndoIgnore={
        lastIgnoredRule
          ? async () => {
              if (!lastIgnoredRule) {
                return
              }
              await removeIgnoreRule(lastIgnoredRule.id)
              lastIgnoredRule = undefined
              await renderPanel()
            }
          : undefined
      }
    />
  )
}

function installNavigationObserver() {
  window.setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      void renderPanel()
    }
  }, 1000)

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      void renderPanel()
    }
  })

  observer.observe(document.documentElement, { childList: true, subtree: true })
}

console.info("[LFS] content script boot", { url: window.location.href })

void renderPanel().catch((error) => {
  console.error("[LFS] render failed", error)
  ensureMountNode()
  root?.render(
    <ProductPanel
      statusMessage={`LFS startup failed: ${error instanceof Error ? error.message : "unknown error"}`}
      onOpenSettings={openSettingsPage}
      onIgnoreSimilar={() => undefined}
    />
  )
})

installNavigationObserver()
