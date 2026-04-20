import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { recommendProduct } from "../engine/recommendation"
import { normalizeLululemonProduct } from "../normalizer/lululemon"
import { parseLululemonCollectionPage, parseLululemonProductPage } from "../parser/lululemon"
import { addIgnoreRule, getIgnoreRules, removeIgnoreRule } from "../storage/localStore"
import { getActiveProfileId, getPanelLayout, getSavedProfiles, getUserProfile, savePanelLayout, selectUserProfile } from "../storage/localStore"
import type { IgnoreRule, ParsedCollectionItem, RecommendationResult, StructuredProduct } from "../shared/types"
import { ProductPanel } from "./panel"
import { panelStyles } from "./styles"

const CONTAINER_ID = "lululemon-fit-signal-root"
const PANEL_TOP_DEFAULT = 96
const PANEL_MARGIN = 16
const PANEL_WIDTH = 340
const COLLAPSED_PANEL_WIDTH = 196

let root: Root | undefined
let shadowRoot: ShadowRoot | undefined
let lastUrl = window.location.href
let lastIgnoredRule: IgnoreRule | undefined
let renderTimer: number | undefined
let pendingNavigationTimers: number[] = []

function estimatePanelWidth(collapsed: boolean): number {
  return collapsed ? COLLAPSED_PANEL_WIDTH : PANEL_WIDTH
}

function defaultPanelPosition(collapsed: boolean): { top: number; left: number } {
  const width = estimatePanelWidth(collapsed)
  return {
    top: PANEL_TOP_DEFAULT,
    left: Math.max(PANEL_MARGIN, window.innerWidth - width - 20)
  }
}

function clampPanelPosition(top: number, left: number, collapsed: boolean): { top: number; left: number } {
  const width = estimatePanelWidth(collapsed)
  const minTop = 12
  const maxTop = Math.max(minTop, window.innerHeight - 72)
  const maxLeft = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN)

  return {
    top: Math.min(Math.max(top, minTop), maxTop),
    left: Math.min(Math.max(left, PANEL_MARGIN), maxLeft)
  }
}

type FloatingPanelProps = {
  debug?: boolean
  canCollapse?: boolean
  panelProps: React.ComponentProps<typeof ProductPanel>
}

function FloatingPanel({ debug = false, canCollapse = false, panelProps }: FloatingPanelProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [position, setPosition] = React.useState(() => defaultPanelPosition(false))
  const positionRef = React.useRef(position)
  const dragStateRef = React.useRef<{
    pointerId: number
    startX: number
    startY: number
    startTop: number
    startLeft: number
    handle?: HTMLElement
  } | null>(null)

  React.useEffect(() => {
    positionRef.current = position
  }, [position])

  React.useEffect(() => {
    let active = true

    void getPanelLayout().then((layout) => {
      if (!active || !layout) {
        return
      }

      const nextCollapsed = canCollapse ? layout.collapsed : false
      const nextPosition = clampPanelPosition(
        layout.top ?? defaultPanelPosition(nextCollapsed).top,
        layout.left ?? defaultPanelPosition(nextCollapsed).left,
        nextCollapsed
      )

      setCollapsed(nextCollapsed)
      setPosition(nextPosition)
    })

    return () => {
      active = false
    }
  }, [canCollapse])

  React.useEffect(() => {
    if (!canCollapse && collapsed) {
      setCollapsed(false)
    }
  }, [canCollapse, collapsed])

  React.useEffect(() => {
    void savePanelLayout({
      collapsed,
      top: position.top,
      left: position.left
    })
  }, [collapsed, position.left, position.top])

  React.useEffect(() => {
    const handleResize = () => {
      setPosition((current) => clampPanelPosition(current.top, current.left, collapsed))
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [collapsed])

  React.useEffect(() => {
    setPosition((current) => clampPanelPosition(current.top, current.left, collapsed))
  }, [collapsed])

  React.useEffect(() => {
    return () => {
      const activeDrag = dragStateRef.current
      activeDrag?.handle?.releasePointerCapture?.(activeDrag.pointerId)
      dragStateRef.current = null
    }
  }, [])

  const handleMovePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()

    const handle = event.currentTarget
    handle.setPointerCapture?.(event.pointerId)
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTop: positionRef.current.top,
      startLeft: positionRef.current.left,
      handle
    }

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const dragState = dragStateRef.current
      if (!dragState || dragState.pointerId !== pointerEvent.pointerId) {
        return
      }

      const nextPosition = clampPanelPosition(
        dragState.startTop + (pointerEvent.clientY - dragState.startY),
        dragState.startLeft + (pointerEvent.clientX - dragState.startX),
        collapsed
      )
      setPosition(nextPosition)
    }

    const handlePointerUp = (pointerEvent: PointerEvent) => {
      const dragState = dragStateRef.current
      if (!dragState || dragState.pointerId !== pointerEvent.pointerId) {
        return
      }

      dragState.handle?.releasePointerCapture?.(pointerEvent.pointerId)
      dragStateRef.current = null
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)
  }

  return (
    <div
      className={`lfs-root${debug ? " debug" : ""}${collapsed ? " collapsed" : ""}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      <ProductPanel
        {...panelProps}
        collapsed={collapsed}
        canCollapse={canCollapse}
        onToggleCollapse={canCollapse ? () => setCollapsed((current) => !current) : undefined}
        onMovePointerDown={handleMovePointerDown}
      />
    </div>
  )
}

function openSettingsPage() {
  chrome.runtime.sendMessage({ type: "OPEN_OPTIONS_PAGE" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      console.error("[LFS] failed to open options page", chrome.runtime.lastError?.message ?? response?.error)
    }
  })
}

function levelLabel(level: RecommendationResult["level"]): string {
  switch (level) {
    case "needs_data":
      return "Needs more data"
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
    mount.className = "lfs-mount"
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
  const quickScanText = [item.title, item.thumbnailAlt, item.cardText, item.categoryHint, categoryHint]
    .filter(Boolean)
    .join(" ")

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
    description: item.thumbnailAlt ?? item.cardText ?? item.title,
    productFeatures: item.cardText ? [item.cardText] : item.thumbnailAlt ? [item.thumbnailAlt] : [],
    materials: [],
    rawText: quickScanText
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
    badge.textContent = `${levelLabel(recommendation.level)} · ${recommendation.fitScore}/10`

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

  const [savedProfiles, activeProfileId] = await Promise.all([getSavedProfiles(), getActiveProfileId()])
  const handleSelectProfile = async (profileId: string) => {
    await selectUserProfile(profileId)
    await renderPanel()
  }

  if (collection.isCollectionPage) {
    const [profile, ignoreRules] = await Promise.all([getUserProfile(), getIgnoreRules()])
    const recommendations = collection.items
      .map((item) => {
        const product = makeCollectionProduct(item, collection.categoryHint)
        const recommendation = recommendProduct(product, profile, ignoreRules)
        return { item, recommendation }
      })
      .sort((left, right) => {
        if (right.recommendation.fitScore !== left.recommendation.fitScore) {
          return right.recommendation.fitScore - left.recommendation.fitScore
        }
        return right.recommendation.confidence - left.recommendation.confidence
      })

    const highlightedRecommendations = recommendations.filter(
      ({ recommendation }) => recommendation.level !== "avoid" || recommendation.confidence >= 0.45
    )

    highlightCollectionItems(highlightedRecommendations.slice(0, 12))
    root.render(
      <FloatingPanel
        panelProps={{
          collectionItems: recommendations.map(({ item, recommendation }) => ({
            title: item.title,
            level: recommendation.level,
            fitScore: recommendation.fitScore,
            why: collectItemWhy(recommendation),
            confidence: recommendation.confidence
          })),
          savedProfiles,
          activeProfileId,
          onSelectProfile: (profileId) => {
            void handleSelectProfile(profileId)
          },
          onOpenSettings: openSettingsPage,
          onIgnoreSimilar: () => undefined
        }}
      />
    )
    return
  }

  clearCollectionHighlights()

  if (!parsed.isProductPage) {
    root.render(
      <FloatingPanel
        debug
        panelProps={{
          statusMessage: "LFS loaded: current page does not look like a lululemon product page.",
          savedProfiles,
          activeProfileId,
          onSelectProfile: (profileId) => {
            void handleSelectProfile(profileId)
          },
          onOpenSettings: openSettingsPage,
          onIgnoreSimilar: () => undefined
        }}
      />
    )
    return
  }

  if (!parsed.supported || !parsed.rawProduct) {
    root.render(
      <FloatingPanel
        panelProps={{
          unsupportedReason: parsed.unsupportedReason ?? "This product is not supported in Version A.",
          savedProfiles,
          activeProfileId,
          onSelectProfile: (profileId) => {
            void handleSelectProfile(profileId)
          },
          onOpenSettings: openSettingsPage,
          onIgnoreSimilar: () => undefined
        }}
      />
    )
    return
  }

  const [profile, ignoreRules] = await Promise.all([getUserProfile(), getIgnoreRules()])
  const product = normalizeLululemonProduct(parsed.rawProduct)
  const recommendation = recommendProduct(product, profile, ignoreRules)

  root.render(
    <FloatingPanel
      canCollapse
      panelProps={{
        product,
        recommendation,
        savedProfiles,
        activeProfileId,
        onSelectProfile: (profileId) => {
          void handleSelectProfile(profileId)
        },
        actionMessage: lastIgnoredRule ? `Ignore rule saved for "${lastIgnoredRule.label}".` : undefined,
        onOpenSettings: openSettingsPage,
        onIgnoreSimilar: async () => {
          lastIgnoredRule = await addIgnoreRule(product)
          await renderPanel()
        },
        onUndoIgnore:
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
      }}
    />
  )
}

function renderPanelSafely() {
  void renderPanel().catch((error) => {
    console.error("[LFS] render failed", error)
    ensureMountNode()
    root?.render(
      <FloatingPanel
        debug
        panelProps={{
          statusMessage: `LFS startup failed: ${error instanceof Error ? error.message : "unknown error"}`,
          onOpenSettings: openSettingsPage,
          onIgnoreSimilar: () => undefined
        }}
      />
    )
  })
}

function scheduleRender(delay = 0) {
  if (renderTimer !== undefined) {
    window.clearTimeout(renderTimer)
  }

  renderTimer = window.setTimeout(() => {
    renderTimer = undefined
    renderPanelSafely()
  }, delay)
}

function scheduleNavigationRenders() {
  pendingNavigationTimers.forEach((timer) => window.clearTimeout(timer))
  pendingNavigationTimers = []

  ;[0, 150, 600].forEach((delay) => {
    const timer = window.setTimeout(() => {
      pendingNavigationTimers = pendingNavigationTimers.filter((candidate) => candidate !== timer)
      renderPanelSafely()
    }, delay)

    pendingNavigationTimers.push(timer)
  })
}

function handleUrlChange() {
  if (window.location.href === lastUrl) {
    return
  }

  lastUrl = window.location.href
  scheduleNavigationRenders()
}

function patchHistoryMethod(methodName: "pushState" | "replaceState") {
  const original = window.history[methodName]

  window.history[methodName] = function patchedHistoryMethod(...args) {
    const result = original.apply(this, args)
    window.setTimeout(handleUrlChange, 0)
    return result
  }
}

function installNavigationObserver() {
  patchHistoryMethod("pushState")
  patchHistoryMethod("replaceState")
  window.addEventListener("popstate", handleUrlChange)
  window.addEventListener("hashchange", handleUrlChange)

  window.setInterval(() => {
    handleUrlChange()
  }, 1000)

  const observer = new MutationObserver(() => {
    handleUrlChange()
  })

  observer.observe(document.documentElement, { childList: true, subtree: true })
}

console.info("[LFS] content script boot", { url: window.location.href })

scheduleRender()

installNavigationObserver()
