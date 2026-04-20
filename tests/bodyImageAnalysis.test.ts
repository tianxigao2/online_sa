import { deriveBodyProfile } from "../src/engine/profile"
import { buildImageBodyAnalysisFromSnapshots } from "../src/vision/bodyImageAnalysis"

describe("body image analysis", () => {
  it("turns silhouette snapshots into estimated measurements", () => {
    const analysis = buildImageBodyAnalysisFromSnapshots(
      {
        visibleHeightRatio: 0.92,
        shoulderWidthRatio: 0.24,
        bustWidthRatio: 0.29,
        waistWidthRatio: 0.18,
        hipWidthRatio: 0.31,
        symmetry: 0.82,
        maskCoverage: 0.36
      },
      {
        visibleHeightRatio: 0.9,
        shoulderWidthRatio: 0.25,
        bustWidthRatio: 0.28,
        waistWidthRatio: 0.19,
        hipWidthRatio: 0.3,
        symmetry: 0.8,
        maskCoverage: 0.34
      },
      168,
      "upload"
    )

    expect(analysis).toBeDefined()
    expect(analysis?.confidence).toBeGreaterThan(0.6)
    expect(analysis?.derivedMeasurements?.estimatedBust).toBeGreaterThan(85)
    expect(analysis?.derivedMeasurements?.estimatedWaist).toBeGreaterThan(60)
    expect(analysis?.derivedMeasurements?.estimatedHips).toBeGreaterThan(90)
  })

  it("feeds photo-derived measurements into the body profile when manual specs are missing", () => {
    const imageAnalysis = buildImageBodyAnalysisFromSnapshots(
      {
        visibleHeightRatio: 0.93,
        shoulderWidthRatio: 0.245,
        bustWidthRatio: 0.287,
        waistWidthRatio: 0.176,
        hipWidthRatio: 0.308,
        symmetry: 0.84,
        maskCoverage: 0.38
      },
      {
        visibleHeightRatio: 0.91,
        shoulderWidthRatio: 0.252,
        bustWidthRatio: 0.281,
        waistWidthRatio: 0.183,
        hipWidthRatio: 0.302,
        symmetry: 0.81,
        maskCoverage: 0.35
      },
      170,
      "upload"
    )

    const bodyProfile = deriveBodyProfile({
      height: 170,
      frontImageUrl: "data:image/jpeg;base64,front",
      backImageUrl: "data:image/jpeg;base64,back",
      imageAnalysis
    })

    expect(bodyProfile.source).toBe("image_estimation")
    expect(bodyProfile.derivedMeasurements?.estimatedWaist).toBeGreaterThan(60)
    expect(bodyProfile.bodyStateSummary.waistDefinition).toBeGreaterThan(0.55)
    expect(bodyProfile.proportions?.hipPresence).toBeDefined()
    expect(bodyProfile.confidence).toBeGreaterThan(0.5)
  })
})
