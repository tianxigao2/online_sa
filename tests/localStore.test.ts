import {
  addIgnoreRule,
  createNamedProfile,
  deleteUserProfile,
  getActiveProfileId,
  getIgnoreRules,
  getPanelLayout,
  getSavedProfiles,
  getUserProfile,
  savePanelLayout,
  selectUserProfile,
  updateProfileNickname
} from "../src/storage/localStore"
import type { StructuredProduct } from "../src/shared/types"

describe("localStore ignore rules", () => {
  const product: StructuredProduct = {
    source: "lululemon",
    productId: "prod-1",
    url: "https://shop.lululemon.com/p/test/prod-1",
    title: "Align Dress",
    category: "dresses",
    availableSizes: [],
    attributes: {}
  }

  beforeEach(() => {
    window.localStorage.clear()
  })

  it("does not keep duplicate ignore rules for the same item", async () => {
    await addIgnoreRule(product)
    await addIgnoreRule(product)

    const rules = await getIgnoreRules()
    expect(rules).toHaveLength(1)
    expect(rules[0]?.label).toMatch(/Align Dress/)
  })

  it("caps ignore rules to the configured maximum", async () => {
    for (let index = 0; index < 55; index += 1) {
      await addIgnoreRule({
        ...product,
        productId: `prod-${index}`,
        title: `Dress ${index}`,
        url: `https://shop.lululemon.com/p/test/prod-${index}`
      })
    }

    const rules = await getIgnoreRules()
    expect(rules).toHaveLength(50)
  })

  it("creates, switches, renames, and deletes named profiles", async () => {
    const userOne = await createNamedProfile("User 1", { height: 165, weight: 58 })
    const userTwo = await createNamedProfile("User 2", { height: 171, weight: 67 })

    let profiles = await getSavedProfiles()
    expect(profiles).toHaveLength(2)
    expect(profiles.map((entry) => entry.nickname)).toEqual(expect.arrayContaining(["User 1", "User 2"]))
    expect(await getActiveProfileId()).toBe(userTwo.id)

    await selectUserProfile(userOne.id)
    expect((await getUserProfile()).height).toBe(165)

    await updateProfileNickname(userOne.id, "Primary User")
    profiles = await getSavedProfiles()
    expect(profiles.find((entry) => entry.id === userOne.id)?.nickname).toBe("Primary User")

    const deletion = await deleteUserProfile(userOne.id)
    expect(deletion.deleted).toBe(true)
    expect((await getSavedProfiles()).map((entry) => entry.id)).toEqual([userTwo.id])
    expect((await getUserProfile()).height).toBe(171)
  })

  it("saves panel layout preferences", async () => {
    await savePanelLayout({
      collapsed: true,
      top: 140,
      left: 980
    })

    await expect(getPanelLayout()).resolves.toEqual({
      collapsed: true,
      top: 140,
      left: 980
    })
  })
})
