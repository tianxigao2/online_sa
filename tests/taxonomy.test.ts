import { inferOccasionsFromText } from "../src/shared/taxonomy"

describe("inferOccasionsFromText", () => {
  it("infers date-night and occasion intent for silk dresses with dressy cues", () => {
    const occasions = inferOccasionsFromText(
      "Opaline Silk Dress",
      "Leg day. The Opaline Silk Dress is a sleeveless mini dress with a halter neckline and a low back.",
      "This is a lightweight silk charmeuse fabric - 100% silk."
    )

    expect(occasions).toContain("date night")
    expect(occasions).toContain("occasion")
    expect(occasions).not.toContain("workout")
  })

  it("infers casual intent for knit everyday dresses", () => {
    const occasions = inferOccasionsFromText(
      "Eloise Knit Dress",
      "Wear the dress. The Eloise Knit Dress is a short-sleeved maxi dress with a V-neckline. Feels like nothing, looks like everything.",
      "Cotton Comfy is an eco-friendly stretch fabric."
    )

    expect(occasions).toContain("casual")
    expect(occasions).not.toContain("workout")
  })

  it("does not infer workout from phrases like production run", () => {
    const occasions = inferOccasionsFromText(
      "Heads up: the country of origin above refers to stuff from our most recent production run."
    )

    expect(occasions).not.toContain("workout")
    expect(occasions).not.toContain("running")
  })
})
