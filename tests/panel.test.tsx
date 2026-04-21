import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ProductPanel } from "../src/content/panel"
import type { RecommendationResult, StructuredProduct } from "../src/shared/types"

describe("ProductPanel", () => {
  it("shows parsed materials explicitly on product pages", () => {
    const product: StructuredProduct = {
      source: "reformation",
      productId: "1320101OVI",
      url: "https://www.thereformation.com/products/birdie-linen-dress/1320101OVI.html",
      title: "Birdie Linen Dress",
      category: "dresses",
      price: 298,
      currency: "USD",
      availableSizes: ["0", "2", "4", "6"],
      description: "A sleeveless maxi dress with a sweetheart neckline.",
      materials: ["100% Linen"],
      productFeatures: ["Maxi length", "Sweetheart neckline"],
      attributes: {
        neckline: "sweetheart",
        sleeve: "sleeveless",
        length: "maxi"
      }
    }

    const recommendation: RecommendationResult = {
      level: "try",
      fitScore: 7,
      sizeRecommendation: {
        recommendedSize: "6",
        confidence: "medium",
        reasons: ["The bodice looks fitted, so a precise size matters more here."],
        risks: []
      },
      reasons: ["The longer line should work well for your proportions."],
      risks: [],
      occasions: ["casual"],
      productSignals: [],
      matchedProductSignals: [],
      conditionalProductSignals: [],
      conflictingProductSignals: [],
      recommendedAttributes: [],
      conditionalAttributes: [],
      lowPriorityAttributes: [],
      fitRisks: [],
      confidence: 0.72,
      confidenceBreakdown: {
        profileCoverage: 0.7,
        riskAdjustment: 0.8,
        productDetail: 0.8,
        sizeChartDetail: 0.4
      },
      bodyStateSummary: {
        upperLowerBalance: 0.5,
        waistDefinition: 0.6,
        verticalLineStrength: 0.7,
        horizontalSensitivity: 0.4,
        structureNeed: 0.5
      }
    }

    const markup = renderToStaticMarkup(
      <ProductPanel
        product={product}
        recommendation={recommendation}
        onOpenSettings={() => undefined}
        onIgnoreSimilar={() => undefined}
      />
    )

    expect(markup).toContain("Material")
    expect(markup).toContain("100% Linen")
  })
})
