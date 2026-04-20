import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { deriveBodyProfile } from "../engine/profile"
import { recommendStyleProfile } from "../engine/recommendation"
import { DEFAULT_PROFILE } from "../shared/defaultProfile"
import type {
  IgnoreRule,
  MeasurementSystem,
  SavedUserProfile,
  StyleAdviceResult,
  SupportState,
  UserInputProfile
} from "../shared/types"
import {
  createNamedProfile,
  deleteUserProfile,
  exportUserProfile,
  getActiveProfileId,
  getIgnoreRules,
  getSavedProfiles,
  getUserProfile,
  importUserProfile,
  removeIgnoreRule,
  saveUserProfile,
  selectUserProfile,
  updateProfileNickname
} from "../storage/localStore"
import { analyzeProfilePhotos, optimizeUploadedImage } from "../vision/bodyImageAnalysis"
import { optionsStyles } from "./styles"

type Requirement = "required" | "optional"
type ManualMeasurementKey = keyof NonNullable<UserInputProfile["manualMeasurements"]>
type ExplicitPreferenceKey = keyof NonNullable<UserInputProfile["explicitPreferences"]>
type MeasurementFieldKey = "height" | "weight" | ManualMeasurementKey

const CM_PER_INCH = 2.54
const KG_PER_POUND = 0.45359237
const SUPPORTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const SUPPORTED_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"

const FIT_OPTIONS = ["slim", "skimming", "classic", "relaxed", "oversized"]
const NECKLINE_OPTIONS = ["square", "scoop", "v-neck", "crew neck", "halter"]
const LENGTH_OPTIONS = ["cropped", "mini", "knee", "midi", "maxi", "full"]
const RISE_OPTIONS = ["high", "mid", "low"]
const SUPPORT_OPTIONS = ["light", "medium", "high"]
const USE_CASE_OPTIONS = ["workout", "running", "yoga", "travel", "casual", "work", "lounge", "layering"]
const STYLE_GOAL_OPTIONS = [
  "look taller",
  "emphasize waist",
  "elongate legs",
  "create balance",
  "more polished",
  "more structure",
  "minimize cling"
]
const AVOID_RULE_OPTIONS = [
  "closed necklines",
  "low rise",
  "thin straps",
  "cropped lengths",
  "heavy compression",
  "too clingy",
  "oversized volume"
]

function injectStyles() {
  const style = document.createElement("style")
  style.textContent = optionsStyles
  document.head.appendChild(style)
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function runtimeUrl(path: string): string {
  return typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : path
}

function normalizeOptionsProfile(profile?: UserInputProfile): UserInputProfile {
  const backImageUrl = profile?.backImageUrl ?? profile?.sideImageUrl
  const frontImageUrls = Array.from(new Set([...(profile?.frontImageUrls ?? []), ...(profile?.frontImageUrl ? [profile.frontImageUrl] : [])]))
  const backImageUrls = Array.from(new Set([...(profile?.backImageUrls ?? []), ...(backImageUrl ? [backImageUrl] : [])]))

  return {
    ...DEFAULT_PROFILE,
    ...profile,
    frontImageUrl: profile?.frontImageUrl ?? frontImageUrls[0],
    frontImageUrls,
    backImageUrl,
    backImageUrls,
    sideImageUrl: profile?.sideImageUrl ?? backImageUrl,
    unitSystem: profile?.unitSystem ?? "metric",
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

function withInvalidatedImageAnalysis(profile: UserInputProfile): UserInputProfile {
  return {
    ...profile,
    imageAnalysis: undefined
  }
}

function labelize(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (token) => token.toUpperCase())
}

function toggleArrayValue(values: string[] | undefined, value: string): string[] {
  const nextValues = new Set(values ?? [])

  if (nextValues.has(value)) {
    nextValues.delete(value)
  } else {
    nextValues.add(value)
  }

  return Array.from(nextValues)
}

function mergeDisplayOptions(options: string[], selectedValues?: string[]): string[] {
  return [...options, ...(selectedValues ?? []).filter((value) => !options.includes(value))]
}

function isSupportedUploadType(file: File): boolean {
  return SUPPORTED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())
}

function appendUnique(values: string[] | undefined, additions: string[]): string[] {
  return Array.from(new Set([...(values ?? []), ...additions]))
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function round(value: number, digits = 1): number {
  return Number(value.toFixed(digits))
}

function formatMeasurement(value?: number): string {
  if (value === undefined) {
    return ""
  }

  return Number.isInteger(value) ? String(value) : String(round(value, 1))
}

function getMeasurementUnit(field: MeasurementFieldKey, unitSystem: MeasurementSystem): string {
  if (field === "weight") {
    return unitSystem === "metric" ? "kg" : "lb"
  }

  return unitSystem === "metric" ? "cm" : "in"
}

function toDisplayMeasurement(value: number | undefined, field: MeasurementFieldKey, unitSystem: MeasurementSystem): string {
  if (value === undefined) {
    return ""
  }

  if (unitSystem === "metric") {
    return formatMeasurement(value)
  }

  const converted = field === "weight" ? value / KG_PER_POUND : value / CM_PER_INCH
  return formatMeasurement(converted)
}

function fromDisplayMeasurement(value: string, field: MeasurementFieldKey, unitSystem: MeasurementSystem): number | undefined {
  const parsed = parseNumber(value)

  if (parsed === undefined) {
    return undefined
  }

  if (unitSystem === "metric") {
    return parsed
  }

  return field === "weight" ? round(parsed * KG_PER_POUND, 2) : round(parsed * CM_PER_INCH, 2)
}

function RequirementBadge({ requirement }: { requirement: Requirement }) {
  return <span className={`badge ${requirement}`}>{requirement === "required" ? "Required" : "Optional"}</span>
}

function FormField({
  title,
  requirement,
  hint,
  children
}: {
  title: string
  requirement: Requirement
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="field-shell">
      <div className="field-head">
        <span>{title}</span>
        <RequirementBadge requirement={requirement} />
      </div>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

function ChoiceGroup({
  title,
  requirement,
  hint,
  options,
  selectedValues,
  onToggle
}: {
  title: string
  requirement: Requirement
  hint?: string
  options: string[]
  selectedValues?: string[]
  onToggle: (value: string) => void
}) {
  const displayOptions = mergeDisplayOptions(options, selectedValues)

  return (
    <div className="choice-group">
      <div className="field-head">
        <span>{title}</span>
        <RequirementBadge requirement={requirement} />
      </div>
      {hint ? <div className="field-hint">{hint}</div> : null}
      <div className="choice-grid">
        {displayOptions.map((option) => {
          const checked = selectedValues?.includes(option) ?? false

          return (
            <label className={`choice-pill ${checked ? "active" : ""}`} key={option}>
              <input checked={checked} onChange={() => onToggle(option)} type="checkbox" />
              <span>{labelize(option)}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function describeBodyShape(bodyProfile: ReturnType<typeof deriveBodyProfile>): string {
  const waistDefinition = bodyProfile.proportions?.waistDefinition
  const upperLowerBalance = bodyProfile.bodyStateSummary.upperLowerBalance

  if (waistDefinition === "high" && upperLowerBalance >= 0.56) {
    return "hourglass leaning toward top-defined balance"
  }
  if (waistDefinition === "high" && upperLowerBalance <= 0.44) {
    return "hourglass leaning toward bottom-defined balance"
  }
  if (waistDefinition === "high") {
    return "hourglass or balanced-defined"
  }
  if (waistDefinition === "low" && upperLowerBalance >= 0.56) {
    return "oval or top-weighted straight"
  }
  if (waistDefinition === "low" && upperLowerBalance <= 0.44) {
    return "bottom-weighted straight"
  }
  if (waistDefinition === "low") {
    return "straight or rectangular"
  }
  if (upperLowerBalance >= 0.56) {
    return "top-weighted balanced"
  }
  if (upperLowerBalance <= 0.44) {
    return "bottom-weighted balanced"
  }
  return "balanced straight"
}

function buildGeneralSuggestionLines(advice: StyleAdviceResult, bodyProfile: ReturnType<typeof deriveBodyProfile>): string[] {
  const lines: string[] = []
  const bodyState = advice.bodyStateSummary
  const proportions = bodyProfile.proportions

  lines.push(`Body shape read: ${describeBodyShape(bodyProfile)}.`)

  if (proportions?.legLine === "long" || bodyState.verticalLineStrength >= 0.62) {
    lines.push("The profile reads as carrying long uninterrupted lines well, so longer hems and cleaner vertical silhouettes should be easier wins than on a shorter-line frame.")
  } else if (proportions?.legLine === "short" || bodyState.verticalLineStrength <= 0.42) {
    lines.push("The profile benefits more from cleaner visual breaks and proportion control, so very long low-break shapes are less likely to outperform shorter or knee-adjacent lines.")
  }

  if (bodyState.upperLowerBalance <= 0.44) {
    lines.push("The balance reads slightly lower-body dominant, so extra shoulder framing and cleaner straighter lower-half lines are likely to feel more stable than early flare or bulk.")
  } else if (bodyState.upperLowerBalance >= 0.56) {
    lines.push("The balance reads slightly upper-body dominant, so open necklines and controlled release below the waist are likely to work better than high concentrated upper-body framing.")
  }

  if (bodyState.waistDefinition >= 0.66) {
    lines.push("The waist break reads clearly, so shapes that acknowledge and organize the waist are likely to look more intentional than silhouettes that erase it.")
  } else if (bodyState.waistDefinition <= 0.4) {
    lines.push("The waist break reads softer, so cleaner skim and straighter line organization are likely to be easier wins than aggressively cinched shapes.")
  }

  if (bodyState.structureNeed >= 0.6) {
    lines.push("More structured fabrics and clearer shape definition are likely to outperform very loose unsupported fits.")
  } else if (bodyState.structureNeed <= 0.42) {
    lines.push("Softer skimming and easier fits can work well here because the profile does not currently read as needing heavy structural correction.")
  }

  return lines.slice(0, 5)
}

function buildEstimatedSpecRows(bodyProfile: ReturnType<typeof deriveBodyProfile>) {
  const proportions = bodyProfile.proportions
  const derived = bodyProfile.derivedMeasurements

  return [
    derived?.estimatedBust !== undefined ? `Estimated bust: ${Math.round(derived.estimatedBust)} cm` : undefined,
    derived?.estimatedWaist !== undefined ? `Estimated waist: ${Math.round(derived.estimatedWaist)} cm` : undefined,
    derived?.estimatedHips !== undefined ? `Estimated hips: ${Math.round(derived.estimatedHips)} cm` : undefined,
    derived?.estimatedShoulderWidth !== undefined ? `Estimated shoulder width: ${Math.round(derived.estimatedShoulderWidth)} cm` : undefined,
    proportions?.legLine ? `Leg line: ${labelize(proportions.legLine)}` : undefined,
    proportions?.torsoLength ? `Torso length: ${labelize(proportions.torsoLength)}` : undefined,
    proportions?.shoulderPresence ? `Shoulder presence: ${labelize(proportions.shoulderPresence)}` : undefined,
    proportions?.hipPresence ? `Hip presence: ${labelize(proportions.hipPresence)}` : undefined,
    proportions?.bustPresence ? `Bust presence: ${labelize(proportions.bustPresence)}` : undefined,
    `Body shape read: ${describeBodyShape(bodyProfile)}`
  ].filter((value): value is string => Boolean(value))
}

function AdviceBand({
  label,
  values,
  subtle = false
}: {
  label: string
  values: string[]
  subtle?: boolean
}) {
  return (
    <div className="advice-band">
      <div className="advice-band-label">{label}</div>
      <div className="choice-grid">
        {values.length > 0 ? (
          values.map((value) => (
            <span className={`advice-pill ${subtle ? "subtle" : ""}`} key={`${label}-${value}`}>
              {labelize(value)}
            </span>
          ))
        ) : (
          <span className="field-hint">Nothing strong surfaced yet for this category.</span>
        )}
      </div>
    </div>
  )
}

function App() {
  const [profile, setProfile] = useState<UserInputProfile>(normalizeOptionsProfile(DEFAULT_PROFILE))
  const [savedProfiles, setSavedProfiles] = useState<SavedUserProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string>()
  const [nickname, setNickname] = useState("Untitled Profile")
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([])
  const [importText, setImportText] = useState("")
  const [status, setStatus] = useState("")
  const standaloneUrl = runtimeUrl("standalone.html")
  const unitSystem = profile.unitSystem ?? "metric"
  const frontImages = profile.frontImageUrls ?? (profile.frontImageUrl ? [profile.frontImageUrl] : [])
  const backImages = profile.backImageUrls ?? (profile.backImageUrl ?? profile.sideImageUrl ? [profile.backImageUrl ?? profile.sideImageUrl!] : [])
  const backImageUrl = backImages[0]
  const bodyProfile = deriveBodyProfile(profile)
  const generalAdvice = recommendStyleProfile(profile)
  const generalSuggestionLines = buildGeneralSuggestionLines(generalAdvice, bodyProfile)
  const estimatedSpecRows = buildEstimatedSpecRows(bodyProfile)
  const missingRequiredFields = [
    profile.height === undefined ? "height" : undefined,
    profile.weight === undefined ? "weight" : undefined,
    frontImages.length > 0 ? undefined : "front photo",
    backImages.length > 0 ? undefined : "back photo"
  ].filter((value): value is string => Boolean(value))

  async function refreshProfilesState(nextActiveId?: string, nextProfile?: UserInputProfile) {
    const [profiles, resolvedActiveId] = await Promise.all([getSavedProfiles(), getActiveProfileId()])
    const effectiveActiveId = nextActiveId ?? resolvedActiveId
    const activeProfile = profiles.find((entry) => entry.id === effectiveActiveId)

    setSavedProfiles(profiles)
    setActiveProfileId(effectiveActiveId)
    setNickname(activeProfile?.nickname ?? "Untitled Profile")
    setProfile(normalizeOptionsProfile(nextProfile ?? activeProfile?.profile ?? DEFAULT_PROFILE))
  }

  useEffect(() => {
    void Promise.all([getUserProfile(), getSavedProfiles(), getActiveProfileId(), getIgnoreRules()]).then(
      ([savedProfile, profiles, currentActiveProfileId, rules]) => {
        setProfile(normalizeOptionsProfile(savedProfile))
        setSavedProfiles(profiles)
        setActiveProfileId(currentActiveProfileId)
        setIgnoreRules(rules)
        setNickname(profiles.find((entry) => entry.id === currentActiveProfileId)?.nickname ?? "Untitled Profile")
      }
    )
  }, [])

  function updateField<Key extends keyof UserInputProfile>(key: Key, value: UserInputProfile[Key]) {
    setProfile((current) => {
      const nextProfile = { ...current, [key]: value }
      const shouldInvalidateAnalysis =
        key === "frontImageUrl" ||
        key === "backImageUrl" ||
        key === "sideImageUrl" ||
        key === "height"

      return normalizeOptionsProfile(shouldInvalidateAnalysis ? withInvalidatedImageAnalysis(nextProfile) : nextProfile)
    })
  }

  function updateManualMeasurement(key: ManualMeasurementKey, value: number | undefined) {
    setProfile((current) =>
      normalizeOptionsProfile({
        ...current,
        manualMeasurements: {
          ...current.manualMeasurements,
          [key]: value
        }
      })
    )
  }

  function updateExplicitPreference(key: ExplicitPreferenceKey, value: string) {
    setProfile((current) =>
      normalizeOptionsProfile({
        ...current,
        explicitPreferences: {
          ...current.explicitPreferences,
          [key]: toggleArrayValue(current.explicitPreferences?.[key], value)
        }
      })
    )
  }

  function updateListField(key: "styleGoals" | "useCases" | "avoidRules", value: string) {
    setProfile((current) =>
      normalizeOptionsProfile({
        ...current,
        [key]: toggleArrayValue(current[key], value)
      })
    )
  }

  function updateMeasurementField(field: MeasurementFieldKey, rawValue: string) {
    const nextValue = fromDisplayMeasurement(rawValue, field, unitSystem)

    if (field === "height" || field === "weight") {
      updateField(field, nextValue as UserInputProfile[typeof field])
      return
    }

    updateManualMeasurement(field, nextValue)
  }

  async function handlePhotoUpload(side: "front" | "back", files?: FileList | File[]) {
    const uploadFiles = Array.from(files ?? [])
    if (uploadFiles.length === 0) {
      return
    }

    if (uploadFiles.some((file) => !isSupportedUploadType(file))) {
      setStatus("Unsupported image type. Upload a JPG, PNG, or WebP file.")
      return
    }

    setStatus(`Optimizing ${uploadFiles.length} ${side} photo${uploadFiles.length > 1 ? "s" : ""} for local storage...`)
    const optimizedImages = await Promise.all(uploadFiles.map((file) => optimizeUploadedImage(file)))

    setProfile((current) =>
      normalizeOptionsProfile(
        withInvalidatedImageAnalysis({
          ...current,
          ...(side === "front"
            ? {
                frontImageUrls: appendUnique(current.frontImageUrls, optimizedImages),
                frontImageUrl: appendUnique(current.frontImageUrls, optimizedImages)[0]
              }
            : {
                backImageUrls: appendUnique(current.backImageUrls, optimizedImages),
                backImageUrl: appendUnique(current.backImageUrls, optimizedImages)[0],
                sideImageUrl: appendUnique(current.backImageUrls, optimizedImages)[0]
              })
        })
      )
    )
    setStatus(`${uploadFiles.length} ${side === "front" ? "front" : "back"} photo${uploadFiles.length > 1 ? "s" : ""} attached. Save profile to run silhouette analysis.`)
  }

  async function handleSave() {
    const normalizedProfile = normalizeOptionsProfile(profile)
    const hasPhotos = Boolean(normalizedProfile.frontImageUrl || normalizedProfile.backImageUrl || normalizedProfile.sideImageUrl)
    let nextProfile = normalizedProfile
    let photoStatus = ""

    if (hasPhotos) {
      setStatus("Analyzing saved photos into body-shape signals...")
      const { analysis, warnings } = await analyzeProfilePhotos(normalizedProfile)
      nextProfile = normalizeOptionsProfile({
        ...normalizedProfile,
        imageAnalysis: analysis
      })
      photoStatus = analysis
        ? `Photo analysis updated${warnings.length ? ` with warnings: ${warnings.join(" ")}` : "."}`
        : `Photo analysis failed. ${warnings.join(" ")}`
    } else {
      nextProfile = normalizeOptionsProfile({
        ...normalizedProfile,
        imageAnalysis: undefined
      })
    }

    if (activeProfileId) {
      await saveUserProfile(nextProfile)
      await updateProfileNickname(activeProfileId, nickname)
      await refreshProfilesState(activeProfileId, nextProfile)
    } else {
      const createdProfile = await createNamedProfile(nickname, nextProfile)
      await refreshProfilesState(createdProfile.id, nextProfile)
    }

    if (missingRequiredFields.length === 0) {
      setStatus(
        `Profile saved successfully. Recommendations now have the full required baseline: height, weight, front photo, and back photo. Open the standalone fit-advice page to review your general suggestions, or go back to a supported product page to see item-level recommendation results. ${photoStatus}`.trim()
      )
      return
    }

    setStatus(`Profile saved. Add ${missingRequiredFields.join(", ")} to complete the required recommendation inputs. ${photoStatus}`.trim())
  }

  async function handleExport() {
    const json = await exportUserProfile()
    setImportText(json)
    downloadFile("lululemon-fit-profile.json", json)
    setStatus("Profile exported.")
  }

  async function handleImport() {
    const imported = await importUserProfile(importText)
    await refreshProfilesState(undefined, imported)
    setStatus("Profile imported.")
  }

  async function handleRemoveIgnoreRule(ruleId: string) {
    await removeIgnoreRule(ruleId)
    setIgnoreRules(await getIgnoreRules())
    setStatus("Ignore rule removed.")
  }

  async function handleSelectProfile(profileId: string) {
    if (!profileId) {
      setActiveProfileId(undefined)
      setNickname(`User ${savedProfiles.length + 1}`)
      setProfile(normalizeOptionsProfile(DEFAULT_PROFILE))
      setStatus("Started a blank draft. Save it with a nickname to create a new profile.")
      return
    }

    const selectedProfile = await selectUserProfile(profileId)
    await refreshProfilesState(profileId, selectedProfile)
    setStatus("Loaded the selected saved profile.")
  }

  function handleCreateNewDraft() {
    setActiveProfileId(undefined)
    setNickname(`User ${savedProfiles.length + 1}`)
    setProfile(normalizeOptionsProfile(DEFAULT_PROFILE))
    setStatus("Started a blank draft. Add photos and body specs, then save it as a new named profile.")
  }

  async function handleDeleteActiveProfile() {
    if (!activeProfileId) {
      setStatus("There is no saved profile selected to delete.")
      return
    }

    const deletedNickname = savedProfiles.find((entry) => entry.id === activeProfileId)?.nickname ?? "Profile"
    const deletion = await deleteUserProfile(activeProfileId)
    await refreshProfilesState(deletion.activeProfileId, deletion.profile)
    if (!deletion.activeProfileId) {
      setActiveProfileId(undefined)
      setNickname(`User ${Math.max(1, savedProfiles.length)}`)
      setProfile(normalizeOptionsProfile(DEFAULT_PROFILE))
    }
    setStatus(`${deletedNickname} was deleted.`)
  }

  return (
    <div className="page">
      <div className="hero">
        <div className="eyebrow">Version A Profile</div>
        <h1>Set up the exact inputs the recommender expects: basic body specs, front/back photos, and clear preference rules.</h1>
        <div className="lede">
          The recommendation flow now uses height, weight, and uploaded body photos to derive silhouette-based body signals. Front
          and back photos are stored locally in `chrome.storage.local`, analyzed on save, and turned into estimated body-shape data
          the recommender can reuse.
        </div>
        <div className="hero-callout">
          <strong>{missingRequiredFields.length === 0 ? "Recommendation baseline is complete." : "Required inputs still missing."}</strong>
          <span>
            {missingRequiredFields.length === 0
              ? "You have all required fields saved for the base recommendation flow."
              : `Still needed: ${missingRequiredFields.join(", ")}.`}
          </span>
        </div>
        <div className="button-row">
          <a className="secondary link-button" href={standaloneUrl}>
            Open Standalone Fit Advice
          </a>
        </div>
      </div>

      <div className="grid">
        <div className="card card-wide">
          <div className="section-title">General Suggestions</div>
          <div className="card-copy">
            This page now gives profile-level guidance immediately. Once photos and specs are saved, the same profile can also drive product-specific recommendations back on supported shopping pages.
          </div>
          <div className="hero-callout">
            <strong>
              {generalSuggestionLines.length > 0
                ? "General guidance is already available from the current profile."
                : "Add more profile detail to sharpen the general guidance."}
            </strong>
            <span>
              {missingRequiredFields.length === 0
                ? "Your saved profile is complete enough for both general profile guidance here and item-level recommendations on product pages."
                : `Complete ${missingRequiredFields.join(", ")} to unlock the full baseline recommendation flow.`}
            </span>
          </div>
          <div className="analysis-note">
            Confidence {Math.round(generalAdvice.confidence * 100)}%.
            {generalAdvice.confidenceNote ? ` ${generalAdvice.confidenceNote}` : ""}
          </div>
          <ul className="advice-list">
            {generalSuggestionLines.length > 0 ? (
              generalSuggestionLines.map((line) => <li key={line}>{line}</li>)
            ) : (
              <li>Add photos plus height and weight to generate clear general suggestions on this page.</li>
            )}
          </ul>
          <div className="advice-family">
            <div className="section-subtitle">Estimated Body Specs</div>
            <ul className="advice-list compact">
              {estimatedSpecRows.map((row) => <li key={row}>{row}</li>)}
            </ul>
          </div>
          <div className="advice-grid">
            <div className="advice-family">
              <div className="section-subtitle">Lengths</div>
              <AdviceBand label="Recommended" values={generalAdvice.attributeGroups.length.recommended} />
              <AdviceBand label="Conditional" values={generalAdvice.attributeGroups.length.conditional} subtle />
            </div>
            <div className="advice-family">
              <div className="section-subtitle">Necklines</div>
              <AdviceBand label="Recommended" values={generalAdvice.attributeGroups.neckline.recommended} />
              <AdviceBand label="Conditional" values={generalAdvice.attributeGroups.neckline.conditional} subtle />
            </div>
            <div className="advice-family">
              <div className="section-subtitle">Fit Direction</div>
              <AdviceBand label="Recommended" values={generalAdvice.attributeGroups.silhouette.recommended} />
              <AdviceBand label="Conditional" values={generalAdvice.attributeGroups.silhouette.conditional} subtle />
            </div>
            <div className="advice-family">
              <div className="section-subtitle">Waist And Rise</div>
              <AdviceBand label="Recommended" values={generalAdvice.attributeGroups.waistline.recommended} />
              <AdviceBand label="Conditional" values={generalAdvice.attributeGroups.waistline.conditional} subtle />
            </div>
            <div className="advice-family">
              <div className="section-subtitle">Fabric Behavior</div>
              <AdviceBand label="Recommended" values={generalAdvice.attributeGroups.fabric.recommended} />
              <AdviceBand label="Conditional" values={generalAdvice.attributeGroups.fabric.conditional} subtle />
            </div>
            <div className="advice-family">
              <div className="section-subtitle">Lower Priority Signals</div>
              <AdviceBand label="Watch" values={generalAdvice.lowPriorityAttributes} subtle />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Profile Library</div>
          <div className="card-copy">
            Save separate nicknamed profiles for different people. Load one to edit it, start a blank draft for someone new, or delete the currently selected saved profile entirely.
          </div>
          <div className="field-grid">
            <FormField title="Saved Profiles" requirement="optional" hint="Select a saved person profile to load it into the form.">
              <select value={activeProfileId ?? ""} onChange={(event) => void handleSelectProfile(event.target.value)}>
                <option value="">New Blank Profile</option>
                {savedProfiles.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.nickname}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField title="Profile Nickname" requirement="required" hint="This is the name you will use to identify this saved person later.">
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="User 1" />
            </FormField>
          </div>
          <div className="profile-chip-row">
            {savedProfiles.length > 0 ? (
              savedProfiles.map((entry) => (
                <button
                  className={`profile-chip ${entry.id === activeProfileId ? "active" : ""}`}
                  key={entry.id}
                  onClick={() => void handleSelectProfile(entry.id)}
                  type="button"
                >
                  {entry.nickname}
                </button>
              ))
            ) : (
              <div className="status">No named profiles saved yet.</div>
            )}
          </div>
          <div className="button-row">
            <button className="secondary" onClick={handleCreateNewDraft} type="button">
              New Blank Profile
            </button>
            <button className="secondary danger" onClick={() => void handleDeleteActiveProfile()} type="button">
              Delete Current Profile
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Recommendation Inputs</div>
          <div className="card-copy">
            These are the inputs the current recommendation system relies on first. At least one front photo and one back photo are
            required baseline inputs. More photos per view help stabilize calibration. Upload is the preferred path because those
            images can be analyzed directly. URLs only work when they point to a directly accessible image file.
          </div>

          <div className="photo-grid">
            {frontImages.length > 0 ? frontImages.map((image, index) => (
              <div className="photo-preview" key={`front-${index}`}>
                <img alt={`Front body profile preview ${index + 1}`} src={image} />
              </div>
            )) : <div className="photo-preview"><span>Front photo preview</span></div>}
            {backImages.length > 0 ? backImages.map((image, index) => (
              <div className="photo-preview" key={`back-${index}`}>
                <img alt={`Back body profile preview ${index + 1}`} src={image} />
              </div>
            )) : <div className="photo-preview"><span>Back photo preview</span></div>}
          </div>

          <div className="unit-row">
            <div className="unit-copy">
              <div className="field-head">
                <span>Units</span>
                <RequirementBadge requirement="optional" />
              </div>
              <div className="field-hint">Choose the input format you prefer. Values are still saved in metric behind the scenes.</div>
            </div>
            <div className="segment-control" role="tablist" aria-label="Measurement units">
              <button
                className={`segment-button ${unitSystem === "metric" ? "active" : ""}`}
                onClick={() => updateField("unitSystem", "metric")}
                type="button"
              >
                cm / kg
              </button>
              <button
                className={`segment-button ${unitSystem === "imperial" ? "active" : ""}`}
                onClick={() => updateField("unitSystem", "imperial")}
                type="button"
              >
                in / lb
              </button>
            </div>
          </div>

          <div className="field-grid">
            <FormField
              title={`Height (${getMeasurementUnit("height", unitSystem)})`}
              requirement="required"
              hint="Used to scale silhouette widths into estimated measurements."
            >
              <input
                inputMode="decimal"
                type="number"
                value={toDisplayMeasurement(profile.height, "height", unitSystem)}
                onChange={(event) => updateMeasurementField("height", event.target.value)}
              />
            </FormField>

            <FormField
              title={`Weight (${getMeasurementUnit("weight", unitSystem)})`}
              requirement="required"
              hint="Used with height to anchor the baseline recommendation model."
            >
              <input
                inputMode="decimal"
                type="number"
                value={toDisplayMeasurement(profile.weight, "weight", unitSystem)}
                onChange={(event) => updateMeasurementField("weight", event.target.value)}
              />
            </FormField>

            <FormField title="Front Photo Upload" requirement="required" hint="Upload one or more clear full-body front views in fitted clothing.">
              <input className="file-input" type="file" multiple accept={SUPPORTED_IMAGE_ACCEPT} onChange={(event) => void handlePhotoUpload("front", event.target.files ?? undefined)} />
            </FormField>

            <FormField
              title="Front Photo Direct URL"
              requirement="optional"
              hint="Only direct public image files work reliably. Shared Google Drive pages usually do not."
            >
              <input
                value={profile.frontImageUrl ?? ""}
                onChange={(event) =>
                  setProfile((current) =>
                    normalizeOptionsProfile(
                      withInvalidatedImageAnalysis({
                        ...current,
                        frontImageUrl: event.target.value || undefined,
                        frontImageUrls: event.target.value ? [event.target.value] : []
                      })
                    )
                  )
                }
                placeholder="https://..."
              />
            </FormField>

            <FormField title="Back Photo Upload" requirement="required" hint="Upload one or more clear full-body back views. Save after upload to rerun silhouette analysis.">
              <input className="file-input" type="file" multiple accept={SUPPORTED_IMAGE_ACCEPT} onChange={(event) => void handlePhotoUpload("back", event.target.files ?? undefined)} />
            </FormField>

            <FormField
              title="Back Photo Direct URL"
              requirement="optional"
              hint="Use a direct image file URL only. Permission-gated share links are not analyzable."
            >
              <input
                value={backImageUrl ?? ""}
                onChange={(event) => {
                  const nextValue = event.target.value || undefined
                  setProfile((current) =>
                    normalizeOptionsProfile({
                      ...withInvalidatedImageAnalysis(current),
                      backImageUrls: nextValue ? [nextValue] : [],
                      backImageUrl: nextValue,
                      sideImageUrl: nextValue
                    })
                  )
                }}
                placeholder="https://..."
              />
            </FormField>

            <FormField title="Support State" requirement="optional" hint="Helps bras and compressive items score more honestly.">
              <select
                value={profile.supportState ?? ""}
                onChange={(event) => updateField("supportState", (event.target.value || undefined) as SupportState | undefined)}
              >
                <option value="">Unknown</option>
                <option value="unsupported">Unsupported</option>
                <option value="light">Light Support</option>
                <option value="medium">Medium Support</option>
                <option value="high">High Support</option>
              </select>
            </FormField>
          </div>

          {profile.imageAnalysis ? (
            <div className="analysis-note">
              Photo analysis ready. Confidence {Math.round(profile.imageAnalysis.confidence * 100)}%.
              {profile.imageAnalysis.frontSamples || profile.imageAnalysis.backSamples
                ? ` ${profile.imageAnalysis.frontSamples ?? 0} front / ${profile.imageAnalysis.backSamples ?? 0} back photo${(profile.imageAnalysis.frontSamples ?? 0) + (profile.imageAnalysis.backSamples ?? 0) === 1 ? "" : "s"} used.`
                : ""}
              {profile.imageAnalysis.derivedMeasurements?.estimatedWaist !== undefined
                ? ` Estimated waist ${profile.imageAnalysis.derivedMeasurements.estimatedWaist} cm.`
                : ""}
            </div>
          ) : (
            <div className="analysis-note subtle">
              No stored photo analysis yet. Save the profile after uploading photos to generate silhouette-derived body measurements.
            </div>
          )}

          <div className="card-divider" />

          <div className="section-subtitle">Optional Precision Measurements</div>
          <div className="card-copy">
            These measurements are optional. Add them if you want tighter size heuristics and stronger proportion signals.
          </div>
          <div className="field-grid">
            <FormField title={`Bust (${getMeasurementUnit("bust", unitSystem)})`} requirement="optional">
              <input
                inputMode="decimal"
                type="number"
                value={toDisplayMeasurement(profile.manualMeasurements?.bust, "bust", unitSystem)}
                onChange={(event) => updateMeasurementField("bust", event.target.value)}
              />
            </FormField>

            <FormField title={`Waist (${getMeasurementUnit("waist", unitSystem)})`} requirement="optional">
              <input
                inputMode="decimal"
                type="number"
                value={toDisplayMeasurement(profile.manualMeasurements?.waist, "waist", unitSystem)}
                onChange={(event) => updateMeasurementField("waist", event.target.value)}
              />
            </FormField>

            <FormField title={`Hips (${getMeasurementUnit("hips", unitSystem)})`} requirement="optional">
              <input
                inputMode="decimal"
                type="number"
                value={toDisplayMeasurement(profile.manualMeasurements?.hips, "hips", unitSystem)}
                onChange={(event) => updateMeasurementField("hips", event.target.value)}
              />
            </FormField>

            <FormField title={`Shoulder Width (${getMeasurementUnit("shoulderWidth", unitSystem)})`} requirement="optional">
              <input
                inputMode="decimal"
                type="number"
                value={toDisplayMeasurement(profile.manualMeasurements?.shoulderWidth, "shoulderWidth", unitSystem)}
                onChange={(event) => updateMeasurementField("shoulderWidth", event.target.value)}
              />
            </FormField>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Preference Rules</div>
          <div className="card-copy">
            Use the preset multi-select options instead of free typing. Pick as many as you want and the engine will respect them as
            positive or negative rules.
          </div>

          <div className="choice-layout">
            <ChoiceGroup
              title="Fits You Like"
              requirement="optional"
              options={FIT_OPTIONS}
              selectedValues={profile.explicitPreferences?.likedFits}
              onToggle={(value) => updateExplicitPreference("likedFits", value)}
            />
            <ChoiceGroup
              title="Fits You Avoid"
              requirement="optional"
              options={FIT_OPTIONS}
              selectedValues={profile.explicitPreferences?.dislikedFits}
              onToggle={(value) => updateExplicitPreference("dislikedFits", value)}
            />
            <ChoiceGroup
              title="Necklines You Like"
              requirement="optional"
              options={NECKLINE_OPTIONS}
              selectedValues={profile.explicitPreferences?.likedNecklines}
              onToggle={(value) => updateExplicitPreference("likedNecklines", value)}
            />
            <ChoiceGroup
              title="Necklines You Avoid"
              requirement="optional"
              options={NECKLINE_OPTIONS}
              selectedValues={profile.explicitPreferences?.dislikedNecklines}
              onToggle={(value) => updateExplicitPreference("dislikedNecklines", value)}
            />
            <ChoiceGroup
              title="Lengths You Like"
              requirement="optional"
              options={LENGTH_OPTIONS}
              selectedValues={profile.explicitPreferences?.likedLengths}
              onToggle={(value) => updateExplicitPreference("likedLengths", value)}
            />
            <ChoiceGroup
              title="Lengths You Avoid"
              requirement="optional"
              options={LENGTH_OPTIONS}
              selectedValues={profile.explicitPreferences?.dislikedLengths}
              onToggle={(value) => updateExplicitPreference("dislikedLengths", value)}
            />
            <ChoiceGroup
              title="Rise You Like"
              requirement="optional"
              options={RISE_OPTIONS}
              selectedValues={profile.explicitPreferences?.likedRise}
              onToggle={(value) => updateExplicitPreference("likedRise", value)}
            />
            <ChoiceGroup
              title="Rise You Avoid"
              requirement="optional"
              options={RISE_OPTIONS}
              selectedValues={profile.explicitPreferences?.dislikedRise}
              onToggle={(value) => updateExplicitPreference("dislikedRise", value)}
            />
            <ChoiceGroup
              title="Support Levels You Like"
              requirement="optional"
              options={SUPPORT_OPTIONS}
              selectedValues={profile.explicitPreferences?.likedSupportLevels}
              onToggle={(value) => updateExplicitPreference("likedSupportLevels", value)}
            />
            <ChoiceGroup
              title="Support Levels You Avoid"
              requirement="optional"
              options={SUPPORT_OPTIONS}
              selectedValues={profile.explicitPreferences?.dislikedSupportLevels}
              onToggle={(value) => updateExplicitPreference("dislikedSupportLevels", value)}
            />
          </div>
        </div>

        <div className="card">
          <div className="section-title">Use Cases And Guardrails</div>
          <div className="card-copy">
            These are still optional, but preset choices make the intent obvious and remove the ambiguity of blank text fields.
          </div>

          <div className="choice-layout">
            <ChoiceGroup
              title="Use Cases"
              requirement="optional"
              options={USE_CASE_OPTIONS}
              selectedValues={profile.useCases}
              onToggle={(value) => updateListField("useCases", value)}
            />
            <ChoiceGroup
              title="Style Goals"
              requirement="optional"
              options={STYLE_GOAL_OPTIONS}
              selectedValues={profile.styleGoals}
              onToggle={(value) => updateListField("styleGoals", value)}
            />
            <ChoiceGroup
              title="Avoid Rules"
              requirement="optional"
              options={AVOID_RULE_OPTIONS}
              selectedValues={profile.avoidRules}
              onToggle={(value) => updateListField("avoidRules", value)}
            />
          </div>

          <FormField title="Risk Preference" requirement="optional" hint="Balanced is the default if you do not choose anything.">
            <select
              value={profile.riskPreference ?? "balanced"}
              onChange={(event) => updateField("riskPreference", event.target.value as UserInputProfile["riskPreference"])}
            >
              <option value="safe">Safe</option>
              <option value="balanced">Balanced</option>
              <option value="adventurous">Adventurous</option>
            </select>
          </FormField>
        </div>

        <div className="card">
          <div className="section-title">Import / Export</div>
          <FormField title="Profile JSON" requirement="optional" hint="Use this only for backup or migration between local profiles.">
            <textarea value={importText} onChange={(event) => setImportText(event.target.value)} />
          </FormField>
          <div className="button-row">
            <button className="primary" onClick={handleSave} type="button">
              Save Profile
            </button>
            <button className="secondary" onClick={handleExport} type="button">
              Export JSON
            </button>
            <button className="secondary" onClick={handleImport} type="button">
              Import JSON
            </button>
          </div>
          <div className="status">{status}</div>
        </div>

        <div className="card">
          <div className="section-title">Ignored Similar Items</div>
          {ignoreRules.length > 0 ? (
            <div className="rule-list">
              {ignoreRules.map((rule) => (
                <div className="rule-row" key={rule.id}>
                  <div className="rule-copy">
                    <strong>{rule.label}</strong>
                    <span>{rule.keywords.join(", ")}</span>
                  </div>
                  <button className="secondary" onClick={() => void handleRemoveIgnoreRule(rule.id)} type="button">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="status">No ignored similar-item rules are saved yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

injectStyles()
createRoot(document.getElementById("root")!).render(<App />)
