import { recommendProduct, recommendStyleProfile } from "../src/engine/recommendation"
import type { StructuredProduct, UserInputProfile } from "../src/shared/types"

describe("recommendProduct", () => {
  const product: StructuredProduct = {
    source: "lululemon",
    productId: "prod-1",
    url: "https://shop.lululemon.com/p/womens-leggings/test",
    title: "Wunder Train High-Rise Tight 25\"",
    category: "leggings",
    price: 118,
    currency: "USD",
    availableSizes: ["4", "6", "8", "10"],
    description: "Supportive high-rise leggings built for training with four-way stretch.",
    productFeatures: ["High-rise fit", "Designed for training", "Supportive, held-in feel"],
    materials: ["69% Nylon", "31% Lycra Elastane"],
    attributes: {
      fit: "slim",
      waistRise: "high",
      compression: "high",
      stretch: "high",
      intendedUse: ["workout"]
    }
  }

  it("recommends aligned products with concrete reasons and size guidance", () => {
    const profile: UserInputProfile = {
      height: 168,
      weight: 61,
      manualMeasurements: {
        waist: 70,
        hips: 96
      },
      explicitPreferences: {
        likedRise: ["high"],
        likedFits: ["slim"]
      },
      useCases: ["workout"],
      riskPreference: "balanced"
    }

    const result = recommendProduct(product, profile)
    expect(result.level).toBe("strong")
    expect(result.reasons.join(" ")).toMatch(/workout|high|fit/i)
    expect(result.sizeRecommendation?.recommendedSize).toBe("8")
    expect(result.sizeRecommendation?.confidence).toBe("medium")
    expect(result.recommendedAttributes).toContain("high_waist")
    expect(result.productSignals).toContain("high_waist")
    expect(result.matchedProductSignals).toContain("high_waist")
    expect(result.fitScore).toBeGreaterThanOrEqual(9)
    expect(result.confidence).toBeGreaterThan(0.5)
    expect(result.bodyStateSummary.waistDefinition).toBeGreaterThan(0.5)
  })

  it("suppresses products that match ignore rules", () => {
    const result = recommendProduct(
      product,
      { riskPreference: "safe" },
      [
        {
          id: "1",
          label: "Hide leggings",
          category: "leggings",
          keywords: ["leggings"],
          createdAt: Date.now()
        }
      ]
    )

    expect(result.level).toBe("avoid")
    expect(result.fitScore).toBe(1)
    expect(result.confidenceNote).toMatch(/ignore rules/i)
  })

  it("separates fit risk scoring from style alignment", () => {
    const result = recommendProduct(product, {
      height: 168,
      weight: 61,
      manualMeasurements: {
        bust: 96,
        waist: 70,
        hips: 100
      },
      supportState: "light",
      riskPreference: "balanced"
    })

    expect(result.fitRisks.length).toBeGreaterThan(0)
    expect(result.fitRisks[0]).toHaveProperty("type")
    expect(result.fitRisks[0]).toHaveProperty("confidence")
    expect(result.fitRisks[0].confidence).toBeGreaterThan(0.5)
    expect(result.risks.join(" ")).toMatch(/waist|firm|compression|risk/i)
  })

  it("does not claim the first visible size is recommended without profile sizing inputs", () => {
    const result = recommendProduct(product, {
      riskPreference: "balanced"
    })

    expect(result.level).toBe("needs_data")
    expect(result.fitScore).toBeLessThanOrEqual(3)
    expect(result.sizeRecommendation?.recommendedSize).toBeUndefined()
    expect(result.sizeRecommendation?.reasons.join(" ")).toMatch(/not enough saved body data/i)
  })

  it("assigns a higher fit score to the better-matching product", () => {
    const profile: UserInputProfile = {
      height: 168,
      weight: 61,
      manualMeasurements: {
        waist: 70,
        hips: 96
      },
      explicitPreferences: {
        likedRise: ["high"]
      },
      riskPreference: "balanced"
    }

    const betterMatch = recommendProduct(product, profile)
    const weakerMatch = recommendProduct(
      {
        ...product,
        productId: "prod-2",
        title: "Low-Rise Training Tight",
        description: "Low-rise leggings with a softer feel and less hold.",
        productFeatures: ["Low-rise fit", "Softer handfeel"],
        attributes: {
          ...product.attributes,
          waistRise: "low",
          compression: "medium"
        }
      },
      profile
    )

    expect(betterMatch.fitScore).toBeGreaterThan(weakerMatch.fitScore)
  })

  it("returns standalone styling advice without product data", () => {
    const advice = recommendStyleProfile({
      height: 171,
      weight: 60,
      frontImageUrl: "https://example.com/front.jpg",
      sideImageUrl: "https://example.com/side.jpg",
      manualMeasurements: {
        bust: 90,
        waist: 68,
        hips: 98
      },
      styleGoals: ["look taller", "emphasize waist"]
    })

    expect(advice.confidence).toBeGreaterThan(0.6)
    expect(
      advice.attributeGroups.length.recommended.length + advice.attributeGroups.length.conditional.length
    ).toBeGreaterThan(0)
    expect(advice.attributeGroups.waistline.recommended).toContain("defined_waist")
    expect(advice.reasons.length).toBeGreaterThan(0)
  })

  it("does not over-size reformation fitted dresses by treating them like compressive activewear", () => {
    const reformationDress: StructuredProduct = {
      source: "reformation",
      productId: "ref-1",
      url: "https://www.thereformation.com/products/roma-linen-dress/1320130HRY.html",
      title: "Roma Linen Dress",
      category: "dresses",
      price: 278,
      currency: "USD",
      availableSizes: ["0", "2", "4", "6", "8", "10"],
      description: "A fitted midi dress with a square neckline and slim bodice.",
      productFeatures: ["Slim fit", "Square neckline", "Midi length"],
      materials: ["100% Linen"],
      attributes: {
        fit: "slim",
        neckline: "square",
        length: "midi",
        stretch: "medium",
        constructionSupport: "medium"
      }
    }

    const result = recommendProduct(reformationDress, {
      height: 168,
      weight: 61,
      riskPreference: "balanced"
    })

    expect(result.sizeRecommendation?.recommendedSize).toBe("6")
    expect(result.sizeRecommendation?.risks.join(" ")).not.toMatch(/nominal size/i)
  })
})
