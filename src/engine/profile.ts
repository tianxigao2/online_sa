import { DEFAULT_PROFILE } from "../shared/defaultProfile"
import type { DerivedBodyProfile, UserInputProfile } from "../shared/types"

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function average(values: Array<number | undefined>, fallback: number): number {
  const filtered = values.filter((value): value is number => value !== undefined)
  if (filtered.length === 0) {
    return fallback
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length
}

export function normalizeUserProfile(profile?: UserInputProfile): UserInputProfile {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    explicitPreferences: {
      ...DEFAULT_PROFILE.explicitPreferences,
      ...profile?.explicitPreferences
    },
    styleGoals: profile?.styleGoals ?? [],
    useCases: profile?.useCases ?? [],
    avoidRules: profile?.avoidRules ?? [],
    riskPreference: profile?.riskPreference ?? "balanced"
  }
}

export function deriveBodyProfile(profile?: UserInputProfile): DerivedBodyProfile {
  const normalized = normalizeUserProfile(profile)
  const measurements = normalized.manualMeasurements ?? {}
  const waist = measurements.waist
  const hips = measurements.hips
  const bust = measurements.bust
  const shoulderWidth = measurements.shoulderWidth
  const source: DerivedBodyProfile["source"] =
    normalized.frontImageUrl && normalized.sideImageUrl
      ? "hybrid"
      : normalized.frontImageUrl || normalized.sideImageUrl
        ? "image_estimation"
        : "manual"

  const missingSignals = [
    normalized.frontImageUrl ? undefined : "front photo",
    normalized.sideImageUrl ? undefined : "side photo",
    normalized.height ? undefined : "height",
    normalized.weight ? undefined : "weight"
  ].filter((value): value is string => Boolean(value))

  const waistFromShape =
    waist === undefined || (hips === undefined && bust === undefined)
      ? undefined
      : average(
          [
            hips !== undefined ? clamp((0.92 - waist / hips) / 0.24) : undefined,
            bust !== undefined ? clamp((0.95 - waist / bust) / 0.25) : undefined
          ],
          0.5
        )

  const waistFromHeight = waist === undefined || normalized.height === undefined
    ? undefined
    : clamp((0.48 - waist / normalized.height) / 0.11)

  const upperLowerBalance = clamp(
    average(
      [
        bust !== undefined && hips !== undefined ? 0.5 + (bust - hips) / 40 : undefined,
        shoulderWidth !== undefined && hips !== undefined ? 0.5 + (shoulderWidth * 2.3 - hips) / 42 : undefined
      ],
      0.5
    )
  )

  const waistDefinition = clamp(average([waistFromShape, waistFromHeight], 0.5))

  const verticalLineStrength = clamp(
    average(
      [
        normalized.height !== undefined ? 0.28 + ((normalized.height - 152) / 24) * 0.44 : undefined,
        normalized.height !== undefined && normalized.weight !== undefined
          ? 0.58 - (normalized.weight / normalized.height - 0.34) * 1.1
          : undefined
      ],
      0.5
    )
  )

  const horizontalSensitivity = clamp(
    average(
      [
        0.28 + upperLowerBalance * 0.38,
        bust !== undefined && normalized.height !== undefined ? 0.24 + (bust / normalized.height) * 0.65 : undefined,
        shoulderWidth !== undefined ? 0.2 + shoulderWidth / 100 : undefined
      ],
      0.5
    )
  )

  const structureNeed = clamp(
    average(
      [
        0.24 + waistDefinition * 0.34,
        0.22 + Math.abs(upperLowerBalance - 0.5) * 0.9,
        bust !== undefined && waist !== undefined ? clamp((bust - waist) / 42) : undefined,
        hips !== undefined && waist !== undefined ? clamp((hips - waist) / 45) : undefined,
        normalized.supportState === "unsupported"
          ? 0.72
          : normalized.supportState === "light"
            ? 0.63
            : normalized.supportState === "medium"
              ? 0.56
              : normalized.supportState === "high"
                ? 0.48
                : undefined
      ],
      0.54
    )
  )

  const evidenceScore = [
    normalized.height !== undefined ? 0.18 : 0,
    normalized.weight !== undefined ? 0.14 : 0,
    bust !== undefined ? 0.09 : 0,
    waist !== undefined ? 0.12 : 0,
    hips !== undefined ? 0.12 : 0,
    shoulderWidth !== undefined ? 0.08 : 0,
    normalized.frontImageUrl ? 0.12 : 0,
    normalized.sideImageUrl ? 0.15 : 0,
    normalized.supportState ? 0.05 : 0
  ].reduce((sum, value) => sum + value, 0)

  return {
    source,
    confidence: clamp(0.24 + evidenceScore, 0.24, 0.94),
    missingSignals,
    proportions: {
      legLine:
        normalized.height === undefined ? undefined : normalized.height < 160 ? "short" : normalized.height > 170 ? "long" : "balanced",
      shoulderPresence:
        shoulderWidth === undefined
          ? undefined
          : shoulderWidth < 37
            ? "narrow"
            : shoulderWidth > 42
              ? "broad"
              : "balanced",
      waistDefinition:
        waistFromShape === undefined ? undefined : waistDefinition >= 0.66 ? "high" : waistDefinition >= 0.42 ? "medium" : "low",
      bustPresence:
        bust === undefined ? undefined : bust < 84 ? "small" : bust > 96 ? "full" : "medium",
      hipPresence:
        hips === undefined ? undefined : hips < 90 ? "narrow" : hips > 102 ? "full" : "balanced",
      torsoLength:
        normalized.height === undefined ? undefined : normalized.height < 158 ? "short" : normalized.height > 172 ? "long" : "balanced"
    },
    derivedMeasurements: {
      estimatedBust: bust,
      estimatedWaist: waist,
      estimatedHips: hips,
      estimatedShoulderWidth: shoulderWidth
    },
    bodyStateSummary: {
      upperLowerBalance: Number(upperLowerBalance.toFixed(2)),
      waistDefinition: Number(waistDefinition.toFixed(2)),
      verticalLineStrength: Number(verticalLineStrength.toFixed(2)),
      horizontalSensitivity: Number(horizontalSensitivity.toFixed(2)),
      structureNeed: Number(structureNeed.toFixed(2))
    }
  }
}
