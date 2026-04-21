import type { ProductSource } from "./types"

export function detectProductSource(url: string): ProductSource | undefined {
  try {
    const hostname = new URL(url).hostname.toLowerCase()

    if (hostname === "lululemon.com" || hostname === "shop.lululemon.com" || hostname.endsWith(".lululemon.com")) {
      return "lululemon"
    }

    if (hostname === "thereformation.com" || hostname === "www.thereformation.com" || hostname.endsWith(".thereformation.com")) {
      return "reformation"
    }

    if (hostname === "skims.com" || hostname === "www.skims.com" || hostname.endsWith(".skims.com")) {
      return "skims"
    }
  } catch {
    return undefined
  }

  return undefined
}

export function productSourceLabel(source: ProductSource): string {
  switch (source) {
    case "reformation":
      return "Reformation"
    case "skims":
      return "SKIMS"
    case "lululemon":
      return "Lululemon"
  }
}
