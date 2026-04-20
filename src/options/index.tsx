import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { DEFAULT_PROFILE } from "../shared/defaultProfile"
import type { IgnoreRule, UserInputProfile } from "../shared/types"
import {
  exportUserProfile,
  getIgnoreRules,
  getUserProfile,
  importUserProfile,
  removeIgnoreRule,
  saveUserProfile
} from "../storage/localStore"
import { optionsStyles } from "./styles"

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

function App() {
  const [profile, setProfile] = useState<UserInputProfile>(DEFAULT_PROFILE)
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([])
  const [importText, setImportText] = useState("")
  const [status, setStatus] = useState("")
  const standaloneUrl = runtimeUrl("standalone.html")

  useEffect(() => {
    void getUserProfile().then(setProfile)
    void getIgnoreRules().then(setIgnoreRules)
  }, [])

  function updateField<Key extends keyof UserInputProfile>(key: Key, value: UserInputProfile[Key]) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    await saveUserProfile(profile)
    setStatus("Profile saved to local extension storage.")
  }

  async function handleExport() {
    const json = await exportUserProfile()
    setImportText(json)
    downloadFile("lululemon-fit-profile.json", json)
    setStatus("Profile exported.")
  }

  async function handleImport() {
    const imported = await importUserProfile(importText)
    setProfile(imported)
    setStatus("Profile imported.")
  }

  async function handleRemoveIgnoreRule(ruleId: string) {
    await removeIgnoreRule(ruleId)
    setIgnoreRules(await getIgnoreRules())
    setStatus("Ignore rule removed.")
  }

  return (
    <div className="page">
      <div className="hero">
        <div className="eyebrow">Version A Profile</div>
        <h1>Save the body profile and style rules the recommendation engine should honor.</h1>
        <div className="lede">
          This page stores data locally in `chrome.storage.local`. The engine uses this profile for apparel fit signals,
          use-case alignment, size heuristics, and local ignore rules.
        </div>
        <div className="button-row">
          <a className="secondary link-button" href={standaloneUrl}>
            Open Standalone Fit Advice
          </a>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="section-title">Core Measurements</div>
          <div className="field-grid">
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
              Front Photo URL
              <input
                value={profile.frontImageUrl ?? ""}
                onChange={(event) => updateField("frontImageUrl", event.target.value || undefined)}
              />
            </label>
            <label>
              Side Photo URL
              <input
                value={profile.sideImageUrl ?? ""}
                onChange={(event) => updateField("sideImageUrl", event.target.value || undefined)}
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
          </div>
        </div>

        <div className="card">
          <div className="section-title">Preference Rules</div>
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
            Disliked Fits
            <input
              value={joinList(profile.explicitPreferences?.dislikedFits)}
              onChange={(event) =>
                updateField("explicitPreferences", {
                  ...profile.explicitPreferences,
                  dislikedFits: parseList(event.target.value)
                })
              }
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
            Disliked Necklines
            <input
              value={joinList(profile.explicitPreferences?.dislikedNecklines)}
              onChange={(event) =>
                updateField("explicitPreferences", {
                  ...profile.explicitPreferences,
                  dislikedNecklines: parseList(event.target.value)
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
            />
          </label>
          <label>
            Liked Rise
            <input
              value={joinList(profile.explicitPreferences?.likedRise)}
              onChange={(event) =>
                updateField("explicitPreferences", {
                  ...profile.explicitPreferences,
                  likedRise: parseList(event.target.value)
                })
              }
            />
          </label>
          <label>
            Liked Support Levels
            <input
              value={joinList(profile.explicitPreferences?.likedSupportLevels)}
              onChange={(event) =>
                updateField("explicitPreferences", {
                  ...profile.explicitPreferences,
                  likedSupportLevels: parseList(event.target.value)
                })
              }
            />
          </label>
        </div>

        <div className="card">
          <div className="section-title">Use Cases and Guardrails</div>
          <label>
            Use Cases
            <input
              value={joinList(profile.useCases)}
              onChange={(event) => updateField("useCases", parseList(event.target.value))}
            />
          </label>
          <label>
            Style Goals
            <input
              value={joinList(profile.styleGoals)}
              onChange={(event) => updateField("styleGoals", parseList(event.target.value))}
            />
          </label>
          <label>
            Avoid Rules
            <input
              value={joinList(profile.avoidRules)}
              onChange={(event) => updateField("avoidRules", parseList(event.target.value))}
            />
          </label>
          <label>
            Risk Preference
            <select
              value={profile.riskPreference ?? "balanced"}
              onChange={(event) => updateField("riskPreference", event.target.value as UserInputProfile["riskPreference"])}
            >
              <option value="safe">Safe</option>
              <option value="balanced">Balanced</option>
              <option value="adventurous">Adventurous</option>
            </select>
          </label>
        </div>

        <div className="card">
          <div className="section-title">Import / Export</div>
          <label>
            Profile JSON
            <textarea value={importText} onChange={(event) => setImportText(event.target.value)} />
          </label>
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
