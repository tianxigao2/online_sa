import { mapRawProductToCanonical } from "../src/mapping/engine"

describe("mapRawProductToCanonical", () => {
  it("maps formal occasion language into independent style and occasion dimensions", () => {
    const canonical = mapRawProductToCanonical({
      site: "reformation",
      brand: "reformation",
      productId: "ref-formal-1",
      url: "https://www.thereformation.com/products/tailored-bow-midi-dress/REF1.html",
      title: "Tailored Bow Detail Midi Dress",
      breadcrumbs: ["Women", "Clothing", "Dresses", "Occasion Dresses"],
      descriptionBlocks: ["Perfect for weddings, dinners, and special events."],
      bulletPoints: ["Lined", "Invisible back zip"],
      sizeOptions: ["0", "2", "4"]
    })

    expect(canonical.identity.garmentType).toBe("dress")
    expect(canonical.shape.length).toBe("midi")
    expect(canonical.styleSemantics.formalityLevel).toBe("formal")
    expect(canonical.styleSemantics.ornamentationLevel).toBe("medium")
    expect(canonical.styleSemantics.romanticness).toBe("medium")
    expect(canonical.occasionSemantics.occasionTags).toEqual(
      expect.arrayContaining(["occasion", "wedding_guest"])
    )
    expect(canonical.evidence["styleSemantics.formalityLevel"]?.length).toBeGreaterThan(0)
    expect(canonical.confidence["styleSemantics.formalityLevel"]).toBeGreaterThan(0.7)
  })

  it("uses brand dictionaries without hard-coding brand normalizer branches", () => {
    const canonical = mapRawProductToCanonical({
      site: "lululemon",
      brand: "lululemon",
      productId: "prod-align",
      url: "https://shop.lululemon.com/p/womens-leggings/align-pant/prod12345",
      title: "Align High-Rise Pant 25\"",
      breadcrumbs: ["Women", "Clothing", "Leggings"],
      descriptionBlocks: ["Buttery-soft yoga leggings with high-rise support and four-way stretch."],
      bulletPoints: ["Nulu fabric feels buttery soft"],
      sizeOptions: ["4", "6", "8"]
    })

    expect(canonical.identity.garmentType).toBe("active_bottom")
    expect(canonical.shape.waistRise).toBe("high")
    expect(canonical.construction.fabricFamily).toBe("performance_knit")
    expect(canonical.construction.surfaceSoftness).toBe("high")
    expect(canonical.occasionSemantics.occasionTags).toEqual(expect.arrayContaining(["yoga", "workout"]))
    expect(canonical.evidence["construction.fabricFamily"]?.[0]?.ruleId).toBe("lululemon_nulu")
  })

  it("applies category-aware overrides for ambiguous style terms", () => {
    const dress = mapRawProductToCanonical({
      site: "reformation",
      productId: "structured-dress",
      url: "https://www.thereformation.com/products/structured-midi-dress/REF2.html",
      title: "Structured Midi Dress",
      breadcrumbs: ["Women", "Clothing", "Dresses"],
      descriptionBlocks: ["A tailored midi dress with clean lines."]
    })
    const knitTop = mapRawProductToCanonical({
      site: "reformation",
      productId: "structured-knit",
      url: "https://www.thereformation.com/products/structured-knit-top/REF3.html",
      title: "Structured Knit Top",
      breadcrumbs: ["Women", "Clothing", "Tops"],
      descriptionBlocks: ["A structured knit top with a simple silhouette."]
    })

    expect(dress.construction.structureLevel).toBe("medium_high")
    expect(dress.shape.fitIntent).toBe("tailored")
    expect(knitTop.construction.structureLevel).toBe("medium_low")
    expect(knitTop.evidence["construction.structureLevel"]?.some((item) => item.ruleId === "structured_knit_override")).toBe(true)
  })
})
