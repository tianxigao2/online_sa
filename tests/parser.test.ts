import { JSDOM } from "jsdom"
import { normalizeLululemonProduct } from "../src/normalizer/lululemon"
import { parseLululemonCollectionPage, parseLululemonProductPage } from "../src/parser/lululemon"

describe("parseLululemonProductPage", () => {
  it("parses apparel products and normalizes key attributes", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Align High-Rise Pant 25\\"",
                "sku": "LW5CT2S",
                "description": "Buttery-soft yoga leggings with high-rise support and four-way stretch.",
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "USD",
                  "price": "128"
                }
              }
            </script>
          </head>
          <body>
            <nav aria-label="Breadcrumb">
              <a>Women</a>
              <a>Clothing</a>
              <a>Leggings</a>
            </nav>
            <h1>Align High-Rise Pant 25"</h1>
            <button aria-label="Size 4">4</button>
            <button aria-label="Size 6">6</button>
            <button aria-label="Size 8">8</button>
            <ul>
              <li>Designed for yoga</li>
              <li>High-rise, 25" inseam</li>
              <li>Nulu fabric feels buttery soft</li>
            </ul>
          </body>
        </html>
      `,
      { url: "https://shop.lululemon.com/p/womens-leggings/align-pant/prod12345" }
    )

    const parsed = parseLululemonProductPage(dom.window.document, dom.window.location.href)

    expect(parsed.isProductPage).toBe(true)
    expect(parsed.supported).toBe(true)
    expect(parsed.rawProduct?.availableSizes).toEqual(["4", "6", "8"])

    const normalized = normalizeLululemonProduct(parsed.rawProduct!)
    expect(normalized.category).toBe("leggings")
    expect(normalized.attributes.waistRise).toBe("high")
    expect(normalized.attributes.stretch).toBe("high")
  })

  it("filters obvious non-apparel products", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Back to Life Sport Bottle 24oz",
                "sku": "BOT123"
              }
            </script>
          </head>
          <body>
            <nav aria-label="Breadcrumb">
              <a>Accessories</a>
              <a>Bottles</a>
            </nav>
            <h1>Back to Life Sport Bottle 24oz</h1>
          </body>
        </html>
      `,
      { url: "https://shop.lululemon.com/p/water-bottles/back-to-life/prod999" }
    )

    const parsed = parseLululemonProductPage(dom.window.document, dom.window.location.href)
    expect(parsed.isProductPage).toBe(true)
    expect(parsed.supported).toBe(false)
    expect(parsed.unsupportedReason).toMatch(/accessory or equipment/i)
  })

  it("does not treat collection pages as product detail pages", () => {
    const dom = new JSDOM(
      `
        <html>
          <body>
            <h1>Women's Dresses</h1>
            <div>30 products</div>
            <div>Product List</div>
            <div>Size</div>
            <button>XXXS</button>
            <button>XXS</button>
            <button>XS</button>
            <a href="/p/skirts-and-dresses-dresses/2-in-1-Maxi-Dress/_/prod20002015">2-in-1 Maxi Dress</a>
            <div>$148</div>
          </body>
        </html>
      `,
      { url: "https://shop.lululemon.com/c/women-dresses/n1mk31" }
    )

    const parsed = parseLululemonProductPage(dom.window.document, dom.window.location.href)
    expect(parsed.isProductPage).toBe(false)
    expect(parsed.rawProduct).toBeUndefined()
  })

  it("parses collection page cards for inline recommendation highlights", () => {
    const dom = new JSDOM(
      `
        <html>
          <body>
            <h1>Women's Dresses</h1>
            <a href="/p/skirts-and-dresses-dresses/2-in-1-Maxi-Dress/_/prod20002015">2-in-1 Maxi Dress</a>
            <div>$148</div>
            <a href="/p/skirts-and-dresses-dresses/Softstreme-Half-Zip-Mini-Dress/_/prod20002016">Softstreme Half-Zip Mini Dress</a>
            <div>Sale Price $64 Regular Price $128</div>
          </body>
        </html>
      `,
      { url: "https://shop.lululemon.com/c/women-dresses/n1mk31" }
    )

    const parsed = parseLululemonCollectionPage(dom.window.document, dom.window.location.href)
    expect(parsed.isCollectionPage).toBe(true)
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items[0]?.title).toBe("2-in-1 Maxi Dress")
    expect(parsed.items[1]?.salePrice).toBe(64)
  })
})
