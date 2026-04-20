import { DEFAULT_PROFILE } from "../shared/defaultProfile"
import type { IgnoreRule, StructuredProduct, UserInputProfile } from "../shared/types"

const PROFILE_KEY = "lululemon-fit-signal.profile"
const IGNORE_RULES_KEY = "lululemon-fit-signal.ignore-rules"

type StorageShape = {
  [PROFILE_KEY]?: UserInputProfile
  [IGNORE_RULES_KEY]?: IgnoreRule[]
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

export async function getUserProfile(): Promise<UserInputProfile> {
  const result = await getValues([PROFILE_KEY])
  return result[PROFILE_KEY] ?? DEFAULT_PROFILE
}

export async function saveUserProfile(profile: UserInputProfile): Promise<void> {
  await setValues({ [PROFILE_KEY]: profile })
}

export async function getIgnoreRules(): Promise<IgnoreRule[]> {
  const result = await getValues([IGNORE_RULES_KEY])
  return result[IGNORE_RULES_KEY] ?? []
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

  await setValues({ [IGNORE_RULES_KEY]: [...currentRules, nextRule] })
  return nextRule
}

export async function removeIgnoreRule(ruleId: string): Promise<void> {
  const currentRules = await getIgnoreRules()
  await setValues({
    [IGNORE_RULES_KEY]: currentRules.filter((rule) => rule.id !== ruleId)
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
