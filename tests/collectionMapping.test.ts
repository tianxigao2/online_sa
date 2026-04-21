import { normalizeCollectionItem } from "../src/mapping/collection"
import type { ParsedCollectionItem } from "../src/shared/types"

describe("normalizeCollectionItem", () => {
  it("normalizes lululemon category-page cards through the canonical mapper", () => {
    const item: ParsedCollectionItem = {
      source: "lululemon",
      productId: "prod20002016",
      url: "https://shop.lululemon.com/p/skirts-and-dresses-dresses/Softstreme-Half-Zip-Mini-Dress/_/prod20002016",
      title: "Softstreme Half-Zip Mini Dress",
      price: 128,
      salePrice: 64,
      categoryHint: "dresses",
      thumbnailAlt: "Softstreme Half-Zip Mini Dress",
      cardText: "Softstreme Half-Zip Mini Dress Sale Price $64 Regular Price $128"
    }

    const product = normalizeCollectionItem(item, "dresses")

    expect(product.category).toBe("dresses")
    expect(product.salePrice).toBe(64)
    expect(product.attributes.length).toBe("mini")
    expect(product.attributes.intendedUse).toEqual(expect.arrayContaining(["lounge", "casual"]))
    expect(product.canonical?.identity.garmentType).toBe("dress")
    expect(product.canonical?.construction.fabricFamily).toBe("performance_knit")
    expect(product.canonical?.evidence["construction.fabricFamily"]?.[0]?.ruleId).toBe("lululemon_softstreme")
  })

  it("normalizes reformation category-page cards through the canonical mapper", () => {
    const item: ParsedCollectionItem = {
      source: "reformation",
      productId: "1320130HRY",
      url: "https://www.thereformation.com/products/roma-linen-dress/1320130HRY.html",
      title: "Roma Linen Dress",
      price: 278,
      categoryHint: "dresses",
      thumbnailAlt: "Roma Linen Dress - Cherry Blossom",
      cardText: "Roma Linen Dress $278"
    }

    const product = normalizeCollectionItem(item, "dresses")

    expect(product.category).toBe("dresses")
    expect(product.attributes.intendedUse).toContain("vacation")
    expect(product.canonical?.identity.garmentType).toBe("dress")
    expect(product.canonical?.construction.fabricFamily).toBe("linen_like")
    expect(product.canonical?.sizing.sizeLabels).toEqual([])
  })
})
