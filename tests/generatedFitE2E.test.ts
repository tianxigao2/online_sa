import { existsSync } from "node:fs"
import { recommendProduct, recommendStyleProfile } from "../src/engine/recommendation"
import { generatedFitCases, productsUnderTest, withGeneratedImageAnalysis } from "./fixtures/generatedFitCases"

const ACCEPTABLE_FIT_LEVELS = ["strong", "try"] as const
const ACCEPTABLE_NOT_FIT_LEVELS = ["avoid", "cautious"] as const

function textIncludesAny(text: string, needles: string[]): boolean {
  const normalized = text.toLowerCase()
  return needles.some((needle) => normalized.includes(needle.toLowerCase()))
}

describe("generated fit judgment end-to-end cases", () => {
  it("keeps every generated profile complete enough for photo-aware analysis", () => {
    generatedFitCases.forEach((caseFixture) => {
      const profile = withGeneratedImageAnalysis(caseFixture)

      expect(profile.height).toBeGreaterThan(0)
      expect(profile.weight).toBeGreaterThan(0)
      expect(profile.frontImageUrl).toBeTruthy()
      expect(profile.sideImageUrl).toBeTruthy()
      expect(existsSync(profile.frontImageUrl!)).toBe(true)
      expect(existsSync(profile.sideImageUrl!)).toBe(true)
      expect(profile.imageAnalysis).toBeDefined()
      expect(profile.imageAnalysis?.front).toBeDefined()
      expect(profile.imageAnalysis?.back).toBeDefined()
      expect(profile.imageAnalysis?.derivedMeasurements?.estimatedWaist).toBeGreaterThan(0)
      expect(profile.imageAnalysis?.confidence).toBeGreaterThan(0.6)
    })
  })

  it("matches standalone profile advice against generated ground truth", () => {
    generatedFitCases.forEach((caseFixture) => {
      const profile = withGeneratedImageAnalysis(caseFixture)
      const advice = recommendStyleProfile(profile)

      caseFixture.groundTruth.standaloneRecommended.forEach((attribute) => {
        expect(advice.recommendedAttributes).toContain(attribute)
      })

      caseFixture.groundTruth.standaloneLowPriority.forEach((attribute) => {
        expect(advice.lowPriorityAttributes).toContain(attribute)
      })

      expect(advice.reasons.length).toBeGreaterThan(0)
      expect(advice.confidenceNote).toMatch(/photo|silhouette/i)
    })
  })

  it("matches product page fit and non-fit judgments against generated ground truth", () => {
    generatedFitCases.forEach((caseFixture) => {
      const profile = withGeneratedImageAnalysis(caseFixture)
      const productResults = new Map(
        caseFixture.groundTruth.productExpectations.map((expectation) => {
          const product = productsUnderTest.find((candidate) => candidate.productId === expectation.productId)
          expect(product).toBeDefined()
          return [expectation.productId, recommendProduct(product!, profile)]
        })
      )

      caseFixture.groundTruth.productExpectations.forEach((expectation) => {
        const result = productResults.get(expectation.productId)!
        const explanation = [...result.reasons, ...result.risks, ...result.fitRisks.map((risk) => risk.reason)].join(" ")

        expectation.expectedSignals.forEach((signal) => {
          expect(result.productSignals).toContain(signal)
        })

        expectation.expectedConflicts?.forEach((signal) => {
          expect(result.conflictingProductSignals).toContain(signal)
        })

        if (expectation.verdict === "fit") {
          expect(ACCEPTABLE_FIT_LEVELS).toContain(result.level as (typeof ACCEPTABLE_FIT_LEVELS)[number])
          expect(result.matchedProductSignals.length + result.conditionalProductSignals.length).toBeGreaterThan(0)
          expect(result.reasons.length).toBeGreaterThan(0)
        } else {
          expect(ACCEPTABLE_NOT_FIT_LEVELS).toContain(result.level as (typeof ACCEPTABLE_NOT_FIT_LEVELS)[number])
          expect(result.risks.length + result.fitRisks.length).toBeGreaterThan(0)
        }

        expect(textIncludesAny(explanation, expectation.rationaleIncludes)).toBe(true)
      })

      const fitScores = caseFixture.groundTruth.productExpectations
        .filter((expectation) => expectation.verdict === "fit")
        .map((expectation) => productResults.get(expectation.productId)!.fitScore)
      const notFitScores = caseFixture.groundTruth.productExpectations
        .filter((expectation) => expectation.verdict === "not_fit")
        .map((expectation) => productResults.get(expectation.productId)!.fitScore)

      expect(Math.min(...fitScores)).toBeGreaterThan(Math.max(...notFitScores))
    })
  })
})
