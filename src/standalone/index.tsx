import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { recommendStyleProfile } from "../engine/recommendation"
import { DEFAULT_PROFILE } from "../shared/defaultProfile"
import type { AttributeFamily, StyleAdviceResult, UserInputProfile } from "../shared/types"
import { getUserProfile, saveUserProfile } from "../storage/localStore"
import { analyzeProfilePhotos, optimizeUploadedImage } from "../vision/bodyImageAnalysis"
import { standaloneStyles } from "./styles"

const SUPPORTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const SUPPORTED_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function joinList(value?: string[]): string {
  return value?.join(", ") ?? ""
}

function injectStyles() {
  const style = document.createElement("style")
  style.textContent = standaloneStyles
  document.head.appendChild(style)
}

function labelize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (token) => token.toUpperCase())
}

function familyTitle(family: AttributeFamily): string {
  switch (family) {
    case "neckline":
      return "Necklines"
    case "waistline":
      return "Waistlines"
    case "silhouette":
      return "Silhouettes"
    case "strapSleeve":
      return "Straps And Sleeves"
    case "length":
      return "Lengths"
    case "fabric":
      return "Fabric Behavior"
  }
}

function safeRuntimeUrl(path: string): string {
  return typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : path
}

function isSupportedUploadType(file: File): boolean {
  return SUPPORTED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())
}

function appendUnique(values: string[] | undefined, additions: string[]): string[] {
  return Array.from(new Set([...(values ?? []), ...additions]))
}

function hasRequiredProfileInputs(profile: UserInputProfile, frontImages: string[], backImages: string[]): boolean {
  return frontImages.length > 0 && backImages.length > 0 && profile.height !== undefined && profile.weight !== undefined
}

function App() {
  const [profile, setProfile] = useState<UserInputProfile>(DEFAULT_PROFILE)
  const [status, setStatus] = useState("Advice updates as you edit the profile below.")
  const [analysisPreview, setAnalysisPreview] = useState<UserInputProfile["imageAnalysis"]>()
  const [analysisStatus, setAnalysisStatus] = useState("")
  const frontImages = profile.frontImageUrls ?? (profile.frontImageUrl ? [profile.frontImageUrl] : [])
  const backImages = profile.backImageUrls ?? (profile.backImageUrl ?? profile.sideImageUrl ? [profile.backImageUrl ?? profile.sideImageUrl!] : [])
  const backImageUrl = backImages[0]

  useEffect(() => {
    void getUserProfile().then((savedProfile) => {
      setProfile(savedProfile)
      setAnalysisPreview(savedProfile.imageAnalysis)
      setStatus("Loaded your saved profile. Adjust anything here to explore standalone advice.")
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    if (frontImages.length === 0 && backImages.length === 0) {
      setAnalysisPreview(profile.imageAnalysis)
      setAnalysisStatus("")
      return () => {
        cancelled = true
      }
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const { analysis, warnings } = await analyzeProfilePhotos(profile)
        if (cancelled) {
          return
        }

        setAnalysisPreview(analysis)
        setAnalysisStatus(
          analysis
            ? `Live photo analysis ready${warnings.length ? `. ${warnings.join(" ")}` : "."}`
            : warnings.join(" ")
        )
      })()
    }, 320)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [profile.frontImageUrl, profile.frontImageUrls, profile.backImageUrl, profile.backImageUrls, profile.sideImageUrl, profile.height, frontImages.length, backImages.length, backImageUrl, profile.imageAnalysis])

  function updateField<Key extends keyof UserInputProfile>(key: Key, value: UserInputProfile[Key]) {
    setProfile((current) => ({
      ...current,
      [key]: value,
      imageAnalysis:
        key === "frontImageUrl" || key === "backImageUrl" || key === "sideImageUrl" || key === "height"
          ? undefined
          : current.imageAnalysis
    }))
  }

  async function handlePhotoUpload(side: "front" | "back", files?: FileList | File[]) {
    const uploadFiles = Array.from(files ?? [])
    if (uploadFiles.length === 0) {
      return
    }

    if (uploadFiles.some((file) => !isSupportedUploadType(file))) {
      setAnalysisStatus("Unsupported image type. Upload a JPG, PNG, or WebP file.")
      return
    }

    setAnalysisStatus(`Optimizing ${uploadFiles.length} ${side} photo${uploadFiles.length > 1 ? "s" : ""}...`)
    const nextUrls = await Promise.all(uploadFiles.map((file) => optimizeUploadedImage(file)))

    setProfile((current) => ({
      ...current,
      ...(side === "front"
        ? {
            frontImageUrls: appendUnique(current.frontImageUrls, nextUrls),
            frontImageUrl: appendUnique(current.frontImageUrls, nextUrls)[0]
          }
        : {
            backImageUrls: appendUnique(current.backImageUrls, nextUrls),
            backImageUrl: appendUnique(current.backImageUrls, nextUrls)[0],
            sideImageUrl: appendUnique(current.backImageUrls, nextUrls)[0]
          }),
      imageAnalysis: undefined
    }))
  }

  async function handleSave() {
    const nextProfile: UserInputProfile = {
      ...profile,
      frontImageUrls: frontImages,
      backImageUrl,
      backImageUrls: backImages,
      sideImageUrl: backImageUrl,
      imageAnalysis: analysisPreview
    }

    await saveUserProfile(nextProfile)
    setProfile(nextProfile)
    setStatus(
      hasRequiredProfileInputs(nextProfile, frontImages, backImages)
        ? "Profile saved successfully. Your general styling suggestions are already visible on this page. You can now go back to a supported product page to see product-specific recommendation results."
        : "Saved the current measurements, uploaded photos, preferences, and live photo analysis as your default profile."
    )
  }

  async function handleReload() {
    const savedProfile = await getUserProfile()
    setProfile(savedProfile)
    setAnalysisPreview(savedProfile.imageAnalysis)
    setStatus("Reloaded the saved profile into the standalone advice view.")
  }

  function handleResetDraft() {
    setProfile(DEFAULT_PROFILE)
    setAnalysisPreview(undefined)
    setAnalysisStatus("")
    setStatus("Reset the draft to a blank local profile. Advice is now based on minimal inputs.")
  }

  const runtimeProfile: UserInputProfile = {
      ...profile,
      frontImageUrls: frontImages,
      backImageUrl,
      backImageUrls: backImages,
      sideImageUrl: backImageUrl,
      imageAnalysis: analysisPreview
    }

  const advice = recommendStyleProfile(runtimeProfile)
  const hasCompletedRequiredInputs = hasRequiredProfileInputs(runtimeProfile, frontImages, backImages)
  const hasVisibleGeneralAdvice = advice.recommendedAttributes.length > 0 || advice.conditionalAttributes.length > 0
  const familyOrder: AttributeFamily[] = ["length", "neckline", "waistline", "silhouette", "strapSleeve", "fabric"]
  const optionsUrl = safeRuntimeUrl("options.html")

  return (
    <div className="sf-page">
      <div className="sf-hero">
        <div className="sf-eyebrow">Standalone Fit Advice</div>
        <h1 className="sf-title">General styling guidance without any shopping page.</h1>
        <div className="sf-lede">
          Give the engine your front and back photos, basic body specs, and preference goals. It will return
          general attribute advice such as which lengths, necklines, waist treatments, and silhouettes are more
          likely to support your proportions. Uploaded photos are actually analyzed into silhouette ratios and
          estimated body measurements during this session.
        </div>
        <div className="sf-inline-links">
          <a href={optionsUrl}>Open Saved Profile Settings</a>
        </div>
        {hasCompletedRequiredInputs ? (
          <div className="sf-note">
            Submission looks complete. Your general styling suggestions should already be visible on this page. After reviewing them, you can go back to a supported product page and see product-specific recommendation results using this saved profile.
          </div>
        ) : null}
      </div>

      <div className="sf-shell">
        <div className="sf-panel">
          <div className="sf-panel-head">
            <div className="sf-eyebrow">Input Profile</div>
            <div className="sf-panel-title">Photos, body specs, and style goals</div>
          </div>

          <div className="sf-panel-body">
            <div className="sf-section">
              <div className="sf-section-label">Photos</div>
              <div className="sf-preview-grid">
                <div className="sf-preview">
                  {frontImages.length > 0 ? (
                    <img alt="Front profile preview" src={frontImages[0]} />
                  ) : (
                    <div>Front photo preview. Upload a fitted full-body image or paste a direct image URL below.</div>
                  )}
                </div>
                <div className="sf-preview">
                  {backImages.length > 0 ? (
                    <img alt="Back profile preview" src={backImages[0]} />
                  ) : (
                    <div>Back photo preview. Neutral stance and minimal occlusion work best.</div>
                  )}
                </div>
              </div>
              {frontImages.length + backImages.length > 2 ? (
                <div className="sf-note">
                  {frontImages.length} front and {backImages.length} back photos loaded. The live analyzer will average all usable photos.
                </div>
              ) : null}
              <div className="sf-field-grid wide">
                <label>
                  Front Photo Upload
                  <input
                    className="sf-file-input"
                    type="file"
                    multiple
                    accept={SUPPORTED_IMAGE_ACCEPT}
                    onChange={(event) => void handlePhotoUpload("front", event.target.files ?? undefined)}
                  />
                </label>
                <label>
                  Back Photo Upload
                  <input
                    className="sf-file-input"
                    type="file"
                    multiple
                    accept={SUPPORTED_IMAGE_ACCEPT}
                    onChange={(event) => void handlePhotoUpload("back", event.target.files ?? undefined)}
                  />
                </label>
              </div>
              <div className="sf-field-grid">
                <label>
                  Front Photo Direct URL
                  <input
                    value={profile.frontImageUrl ?? ""}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        frontImageUrl: event.target.value || undefined,
                        frontImageUrls: event.target.value ? [event.target.value] : [],
                        imageAnalysis: undefined
                      }))
                    }
                  />
                </label>
                <label>
                  Back Photo Direct URL
                  <input
                    value={backImageUrl ?? ""}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        backImageUrls: event.target.value ? [event.target.value] : [],
                        backImageUrl: event.target.value || undefined,
                        sideImageUrl: event.target.value || undefined,
                        imageAnalysis: undefined
                      }))
                    }
                  />
                </label>
              </div>
              {analysisStatus ? <div className="sf-note">{analysisStatus}</div> : null}
            </div>

            <div className="sf-section">
              <div className="sf-section-label">Body Specs</div>
              <div className="sf-field-grid">
                <label>
                  Height (cm)
                  <input
                    type="number"
                    value={profile.height ?? ""}
                    onChange={(event) => updateField("height", Number(event.target.value) || undefined)}
                  />
                </label>
                <label>
                  Weight (kg)
                  <input
                    type="number"
                    value={profile.weight ?? ""}
                    onChange={(event) => updateField("weight", Number(event.target.value) || undefined)}
                  />
                </label>
                <label>
                  Bust (cm)
                  <input
                    type="number"
                    value={profile.manualMeasurements?.bust ?? ""}
                    onChange={(event) =>
                      updateField("manualMeasurements", {
                        ...profile.manualMeasurements,
                        bust: Number(event.target.value) || undefined
                      })
                    }
                  />
                </label>
                <label>
                  Waist (cm)
                  <input
                    type="number"
                    value={profile.manualMeasurements?.waist ?? ""}
                    onChange={(event) =>
                      updateField("manualMeasurements", {
                        ...profile.manualMeasurements,
                        waist: Number(event.target.value) || undefined
                      })
                    }
                  />
                </label>
                <label>
                  Hips (cm)
                  <input
                    type="number"
                    value={profile.manualMeasurements?.hips ?? ""}
                    onChange={(event) =>
                      updateField("manualMeasurements", {
                        ...profile.manualMeasurements,
                        hips: Number(event.target.value) || undefined
                      })
                    }
                  />
                </label>
                <label>
                  Shoulder Width (cm)
                  <input
                    type="number"
                    value={profile.manualMeasurements?.shoulderWidth ?? ""}
                    onChange={(event) =>
                      updateField("manualMeasurements", {
                        ...profile.manualMeasurements,
                        shoulderWidth: Number(event.target.value) || undefined
                      })
                    }
                  />
                </label>
                <label>
                  Support State
                  <select
                    value={profile.supportState ?? ""}
                    onChange={(event) => updateField("supportState", (event.target.value || undefined) as UserInputProfile["supportState"])}
                  >
                    <option value="">Unknown</option>
                    <option value="unsupported">Unsupported</option>
                    <option value="light">Light Support</option>
                    <option value="medium">Medium Support</option>
                    <option value="high">High Support</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="sf-section">
              <div className="sf-section-label">Goals And Preferences</div>
              <div className="sf-field-grid wide">
                <label>
                  Style Goals
                  <input
                    value={joinList(profile.styleGoals)}
                    onChange={(event) => updateField("styleGoals", parseList(event.target.value))}
                    placeholder="look taller, emphasize waist, more polished"
                  />
                </label>
                <label>
                  Liked Necklines
                  <input
                    value={joinList(profile.explicitPreferences?.likedNecklines)}
                    onChange={(event) =>
                      updateField("explicitPreferences", {
                        ...profile.explicitPreferences,
                        likedNecklines: parseList(event.target.value)
                      })
                    }
                  />
                </label>
                <label>
                  Liked Lengths
                  <input
                    value={joinList(profile.explicitPreferences?.likedLengths)}
                    onChange={(event) =>
                      updateField("explicitPreferences", {
                        ...profile.explicitPreferences,
                        likedLengths: parseList(event.target.value)
                      })
                    }
                    placeholder="midi, maxi"
                  />
                </label>
                <label>
                  Liked Fits
                  <input
                    value={joinList(profile.explicitPreferences?.likedFits)}
                    onChange={(event) =>
                      updateField("explicitPreferences", {
                        ...profile.explicitPreferences,
                        likedFits: parseList(event.target.value)
                      })
                    }
                  />
                </label>
                <label>
                  Notes To Avoid
                  <input
                    value={joinList(profile.avoidRules)}
                    onChange={(event) => updateField("avoidRules", parseList(event.target.value))}
                    placeholder="closed necklines, too clingy"
                  />
                </label>
              </div>
            </div>

            <div className="sf-button-row">
              <button className="sf-button primary" onClick={handleSave} type="button">
                Save As Default Profile
              </button>
              <button className="sf-button secondary" onClick={handleReload} type="button">
                Reload Saved Profile
              </button>
              <button className="sf-button secondary" onClick={handleResetDraft} type="button">
                Reset Draft
              </button>
            </div>

            <div className="sf-status">{status}</div>
          </div>
        </div>

        <AdvicePanel
          advice={advice}
          hasCompletedRequiredInputs={hasCompletedRequiredInputs}
          hasVisibleGeneralAdvice={hasVisibleGeneralAdvice}
        />
      </div>
    </div>
  )
}

function AdvicePanel({
  advice,
  hasCompletedRequiredInputs,
  hasVisibleGeneralAdvice
}: {
  advice: StyleAdviceResult
  hasCompletedRequiredInputs: boolean
  hasVisibleGeneralAdvice: boolean
}) {
  const familyOrder: AttributeFamily[] = ["length", "neckline", "waistline", "silhouette", "strapSleeve", "fabric"]

  return (
    <div className="sf-result-shell">
      <div className="sf-panel">
        <div className="sf-panel-head">
          <div className="sf-eyebrow">Advice Output</div>
          <div className="sf-panel-title">General fit and styling direction</div>
        </div>

        <div className="sf-panel-body">
          {hasCompletedRequiredInputs ? (
            <div className="sf-note">
              {hasVisibleGeneralAdvice
                ? "Submission successful. Review the general advice below now, then return to a supported product page whenever you want item-level recommendations."
                : "Submission successful. The page has enough profile data; if stronger advice still does not appear, add optional measurements or preference goals to sharpen the guidance."}
            </div>
          ) : null}

          <div className="sf-pill-row">
            <span className="sf-pill">Confidence {Math.round(advice.confidence * 100)}%</span>
            {advice.attributeGroups.length.recommended.length ? (
              <span className="sf-pill">Length Focus {advice.attributeGroups.length.recommended.map(labelize).join(", ")}</span>
            ) : null}
          </div>

          <div className="sf-metric-strip">
            <div className="sf-metric">
              <span>Upper / Lower Balance</span>
              <strong>{advice.bodyStateSummary.upperLowerBalance}</strong>
            </div>
            <div className="sf-metric">
              <span>Waist Definition</span>
              <strong>{advice.bodyStateSummary.waistDefinition}</strong>
            </div>
            <div className="sf-metric">
              <span>Vertical Line</span>
              <strong>{advice.bodyStateSummary.verticalLineStrength}</strong>
            </div>
            <div className="sf-metric">
              <span>Horizontal Sensitivity</span>
              <strong>{advice.bodyStateSummary.horizontalSensitivity}</strong>
            </div>
            <div className="sf-metric">
              <span>Structure Need</span>
              <strong>{advice.bodyStateSummary.structureNeed}</strong>
            </div>
          </div>

          <div className="sf-section">
            <div className="sf-section-label">Core Guidance</div>
            <ul className="sf-list">
              {advice.reasons.length > 0 ? (
                advice.reasons.map((reason) => <li key={reason}>{reason}</li>)
              ) : (
                <li>Add more measurements or both photos to surface stronger general advice.</li>
              )}
            </ul>
          </div>

          {advice.confidenceNote ? <div className="sf-note">{advice.confidenceNote}</div> : null}
        </div>
      </div>

      <div className="sf-family-grid">
        {familyOrder.map((family) => (
          <div className="sf-family-card" key={family}>
            <div className="sf-family-title">{familyTitle(family)}</div>

            <div className="sf-band">
              <div className="sf-band-label">Recommended</div>
              <div className="sf-pill-row">
                {advice.attributeGroups[family].recommended.length > 0 ? (
                  advice.attributeGroups[family].recommended.map((attribute) => (
                    <span className="sf-pill" key={attribute}>
                      {labelize(attribute)}
                    </span>
                  ))
                ) : (
                  <span className="sf-note">No strong recommendation surfaced yet for this family.</span>
                )}
              </div>
            </div>

            <div className="sf-band">
              <div className="sf-band-label">Conditional</div>
              <div className="sf-pill-row">
                {advice.attributeGroups[family].conditional.length > 0 ? (
                  advice.attributeGroups[family].conditional.map((attribute) => (
                    <span className="sf-pill subtle" key={attribute}>
                      {labelize(attribute)}
                    </span>
                  ))
                ) : (
                  <span className="sf-note">Nothing sits in the conditional middle band right now.</span>
                )}
              </div>
            </div>

            <div className="sf-band">
              <div className="sf-band-label">Lower Priority</div>
              <div className="sf-pill-row">
                {advice.attributeGroups[family].lowPriority.length > 0 ? (
                  advice.attributeGroups[family].lowPriority.map((attribute) => (
                    <span className="sf-pill subtle" key={attribute}>
                      {labelize(attribute)}
                    </span>
                  ))
                ) : (
                  <span className="sf-note">No clear caution flags surfaced here.</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sf-panel">
        <div className="sf-panel-head">
          <div className="sf-eyebrow">Cautions</div>
          <div className="sf-panel-title">What to watch when you interpret the advice</div>
        </div>
        <div className="sf-panel-body">
          <ul className="sf-list">
            {advice.cautionNotes.length > 0 ? (
              advice.cautionNotes.map((note) => <li key={note}>{note}</li>)
            ) : (
              <li>No strong lower-priority warnings surfaced from the current inputs.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

injectStyles()
createRoot(document.getElementById("root")!).render(<App />)
