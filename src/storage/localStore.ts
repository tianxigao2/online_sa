import { DEFAULT_PROFILE } from "../shared/defaultProfile"
import type { IgnoreRule, SavedUserProfile, StructuredProduct, UserInputProfile } from "../shared/types"

const PROFILE_KEY = "lululemon-fit-signal.profile"
const PROFILES_KEY = "lululemon-fit-signal.profiles"
const ACTIVE_PROFILE_ID_KEY = "lululemon-fit-signal.active-profile-id"
const IGNORE_RULES_KEY = "lululemon-fit-signal.ignore-rules"
const PANEL_LAYOUT_KEY = "lululemon-fit-signal.panel-layout"
const MAX_IGNORE_RULES = 50

export type SavedPanelLayout = {
  collapsed: boolean
  top?: number
  left?: number
}

type StorageShape = {
  [PROFILE_KEY]?: UserInputProfile
  [PROFILES_KEY]?: SavedUserProfile[]
  [ACTIVE_PROFILE_ID_KEY]?: string
  [IGNORE_RULES_KEY]?: IgnoreRule[]
  [PANEL_LAYOUT_KEY]?: SavedPanelLayout
}

function getChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage?.local ? chrome.storage.local : undefined
}

async function getValues<T extends keyof StorageShape>(keys: T[]): Promise<Pick<StorageShape, T>> {
  const chromeStorage = getChromeStorage()
  if (chromeStorage) {
    return new Promise((resolve) => {
      chromeStorage.get(keys, (result) => resolve(result as Pick<StorageShape, T>))
    })
  }

  return keys.reduce<Pick<StorageShape, T>>((record, key) => {
    const raw = globalThis.localStorage?.getItem(key)
    if (raw) {
      record[key] = JSON.parse(raw)
    }
    return record
  }, {} as Pick<StorageShape, T>)
}

async function setValues(values: Partial<StorageShape>): Promise<void> {
  const chromeStorage = getChromeStorage()
  if (chromeStorage) {
    return new Promise((resolve) => {
      chromeStorage.set(values, () => resolve())
    })
  }

  Object.entries(values).forEach(([key, value]) => {
    globalThis.localStorage?.setItem(key, JSON.stringify(value))
  })
}

function createProfileId(): string {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeNickname(value?: string): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : "Untitled Profile"
}

function normalizeSavedProfiles(profiles: SavedUserProfile[]): SavedUserProfile[] {
  const deduped = new Map<string, SavedUserProfile>()

  profiles.forEach((entry) => {
    deduped.set(entry.id, {
      ...entry,
      nickname: normalizeNickname(entry.nickname),
      updatedAt: entry.updatedAt || Date.now(),
      profile: entry.profile ?? DEFAULT_PROFILE
    })
  })

  return Array.from(deduped.values()).sort((left, right) => right.updatedAt - left.updatedAt)
}

async function ensureProfilesState(): Promise<{ profiles: SavedUserProfile[]; activeProfileId?: string }> {
  const result = await getValues([PROFILE_KEY, PROFILES_KEY, ACTIVE_PROFILE_ID_KEY])
  const storedProfiles = normalizeSavedProfiles(result[PROFILES_KEY] ?? [])
  let activeProfileId = result[ACTIVE_PROFILE_ID_KEY]

  if (storedProfiles.length > 0) {
    if (!activeProfileId || !storedProfiles.some((profile) => profile.id === activeProfileId)) {
      activeProfileId = storedProfiles[0]?.id
      await setValues({
        [PROFILES_KEY]: storedProfiles,
        [ACTIVE_PROFILE_ID_KEY]: activeProfileId
      })
    }

    return { profiles: storedProfiles, activeProfileId }
  }

  if (result[PROFILE_KEY]) {
    const migratedProfile: SavedUserProfile = {
      id: createProfileId(),
      nickname: "Default Profile",
      updatedAt: Date.now(),
      profile: result[PROFILE_KEY] ?? DEFAULT_PROFILE
    }

    await setValues({
      [PROFILES_KEY]: [migratedProfile],
      [ACTIVE_PROFILE_ID_KEY]: migratedProfile.id
    })

    return {
      profiles: [migratedProfile],
      activeProfileId: migratedProfile.id
    }
  }

  return {
    profiles: [],
    activeProfileId: undefined
  }
}

function ignoreRuleSignature(rule: Pick<IgnoreRule, "category" | "label" | "keywords">): string {
  return [
    rule.category ?? "unknown",
    rule.label.trim().toLowerCase(),
    [...rule.keywords].sort().join("|").toLowerCase()
  ].join("::")
}

function normalizeIgnoreRules(rules: IgnoreRule[]): IgnoreRule[] {
  const deduped = new Map<string, IgnoreRule>()

  rules
    .slice()
    .sort((left, right) => right.createdAt - left.createdAt)
    .forEach((rule) => {
      const signature = ignoreRuleSignature(rule)
      if (!deduped.has(signature)) {
        deduped.set(signature, rule)
      }
    })

  return Array.from(deduped.values()).slice(0, MAX_IGNORE_RULES)
}

export async function getUserProfile(): Promise<UserInputProfile> {
  const { profiles, activeProfileId } = await ensureProfilesState()
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId)
  if (activeProfile) {
    return activeProfile.profile
  }

  const result = await getValues([PROFILE_KEY])
  return result[PROFILE_KEY] ?? DEFAULT_PROFILE
}

export async function saveUserProfile(profile: UserInputProfile): Promise<void> {
  const { profiles, activeProfileId } = await ensureProfilesState()

  if (!activeProfileId || profiles.length === 0) {
    const savedProfile: SavedUserProfile = {
      id: createProfileId(),
      nickname: "Default Profile",
      updatedAt: Date.now(),
      profile
    }

    await setValues({
      [PROFILE_KEY]: profile,
      [PROFILES_KEY]: [savedProfile],
      [ACTIVE_PROFILE_ID_KEY]: savedProfile.id
    })
    return
  }

  const nextProfiles = normalizeSavedProfiles(
    profiles.map((entry) =>
      entry.id === activeProfileId
        ? {
            ...entry,
            updatedAt: Date.now(),
            profile
          }
        : entry
    )
  )

  await setValues({
    [PROFILE_KEY]: profile,
    [PROFILES_KEY]: nextProfiles,
    [ACTIVE_PROFILE_ID_KEY]: activeProfileId
  })
}

export async function getSavedProfiles(): Promise<SavedUserProfile[]> {
  const { profiles } = await ensureProfilesState()
  return profiles
}

export async function getActiveProfileId(): Promise<string | undefined> {
  const { activeProfileId } = await ensureProfilesState()
  return activeProfileId
}

export async function createNamedProfile(nickname: string, profile: UserInputProfile): Promise<SavedUserProfile> {
  const { profiles } = await ensureProfilesState()
  const savedProfile: SavedUserProfile = {
    id: createProfileId(),
    nickname: normalizeNickname(nickname),
    updatedAt: Date.now(),
    profile
  }
  const nextProfiles = normalizeSavedProfiles([savedProfile, ...profiles])

  await setValues({
    [PROFILE_KEY]: profile,
    [PROFILES_KEY]: nextProfiles,
    [ACTIVE_PROFILE_ID_KEY]: savedProfile.id
  })

  return savedProfile
}

export async function updateProfileNickname(profileId: string, nickname: string): Promise<void> {
  const { profiles, activeProfileId } = await ensureProfilesState()
  const nextProfiles = normalizeSavedProfiles(
    profiles.map((entry) =>
      entry.id === profileId
        ? {
            ...entry,
            nickname: normalizeNickname(nickname),
            updatedAt: Date.now()
          }
        : entry
    )
  )

  const activeProfile = nextProfiles.find((entry) => entry.id === (activeProfileId ?? profileId))
  await setValues({
    [PROFILE_KEY]: activeProfile?.profile ?? DEFAULT_PROFILE,
    [PROFILES_KEY]: nextProfiles,
    [ACTIVE_PROFILE_ID_KEY]: activeProfileId ?? profileId
  })
}

export async function selectUserProfile(profileId: string): Promise<UserInputProfile> {
  const { profiles } = await ensureProfilesState()
  const selectedProfile = profiles.find((entry) => entry.id === profileId)
  if (!selectedProfile) {
    throw new Error(`Profile not found: ${profileId}`)
  }

  await setValues({
    [PROFILE_KEY]: selectedProfile.profile,
    [ACTIVE_PROFILE_ID_KEY]: profileId
  })

  return selectedProfile.profile
}

export async function deleteUserProfile(profileId: string): Promise<{ deleted: boolean; activeProfileId?: string; profile: UserInputProfile }> {
  const { profiles, activeProfileId } = await ensureProfilesState()
  const nextProfiles = normalizeSavedProfiles(profiles.filter((entry) => entry.id !== profileId))
  const nextActiveProfileId =
    activeProfileId === profileId
      ? nextProfiles[0]?.id
      : activeProfileId && nextProfiles.some((entry) => entry.id === activeProfileId)
        ? activeProfileId
        : nextProfiles[0]?.id
  const nextActiveProfile = nextProfiles.find((entry) => entry.id === nextActiveProfileId)

  await setValues({
    [PROFILE_KEY]: nextActiveProfile?.profile ?? DEFAULT_PROFILE,
    [PROFILES_KEY]: nextProfiles,
    [ACTIVE_PROFILE_ID_KEY]: nextActiveProfileId
  })

  return {
    deleted: nextProfiles.length !== profiles.length,
    activeProfileId: nextActiveProfileId,
    profile: nextActiveProfile?.profile ?? DEFAULT_PROFILE
  }
}

export async function getIgnoreRules(): Promise<IgnoreRule[]> {
  const result = await getValues([IGNORE_RULES_KEY])
  return normalizeIgnoreRules(result[IGNORE_RULES_KEY] ?? [])
}

export async function addIgnoreRule(product: StructuredProduct): Promise<IgnoreRule> {
  const currentRules = await getIgnoreRules()
  const keywords = [product.category, ...product.title.toLowerCase().split(/\s+/).slice(0, 3)]
    .filter(Boolean)
    .slice(0, 4)

  const nextRule: IgnoreRule = {
    id: `${product.productId}-${Date.now()}`,
    label: `${product.category}: ${product.title}`,
    category: product.category,
    keywords,
    createdAt: Date.now()
  }

  const existingRule = currentRules.find(
    (rule) => ignoreRuleSignature(rule) === ignoreRuleSignature(nextRule)
  )

  if (existingRule) {
    await setValues({ [IGNORE_RULES_KEY]: currentRules })
    return existingRule
  }

  await setValues({ [IGNORE_RULES_KEY]: normalizeIgnoreRules([nextRule, ...currentRules]) })
  return nextRule
}

export async function removeIgnoreRule(ruleId: string): Promise<void> {
  const currentRules = await getIgnoreRules()
  await setValues({
    [IGNORE_RULES_KEY]: currentRules.filter((rule) => rule.id !== ruleId)
  })
}

export async function getPanelLayout(): Promise<SavedPanelLayout | undefined> {
  const result = await getValues([PANEL_LAYOUT_KEY])
  return result[PANEL_LAYOUT_KEY]
}

export async function savePanelLayout(layout: SavedPanelLayout): Promise<void> {
  await setValues({
    [PANEL_LAYOUT_KEY]: layout
  })
}

export async function importUserProfile(rawJson: string): Promise<UserInputProfile> {
  const parsed = JSON.parse(rawJson) as UserInputProfile
  await saveUserProfile(parsed)
  return parsed
}

export async function exportUserProfile(): Promise<string> {
  const profile = await getUserProfile()
  return JSON.stringify(profile, null, 2)
}
