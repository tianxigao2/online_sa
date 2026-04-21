import { JSDOM } from "jsdom"
import { normalizeLululemonProduct } from "../src/normalizer/lululemon"
import { normalizeReformationProduct } from "../src/normalizer/reformation"
import { normalizeSkimsProduct } from "../src/normalizer/skims"
import { parseLululemonCollectionPage, parseLululemonProductPage } from "../src/parser/lululemon"
import { parseReformationCollectionPage, parseReformationProductPage } from "../src/parser/reformation"
import { parseSkimsCollectionPage, parseSkimsProductPage } from "../src/parser/skims"

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

  it("keeps clearly classified apparel products even when another field says accessories", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Define Jacket Nulu",
                "category": "Accessories",
                "description": "Close-fitting jacket with a soft feel.",
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "USD",
                  "price": "128"
                }
              }
            </script>
          </head>
          <body>
            <h1>Define Jacket Nulu</h1>
            <button>Add to Bag</button>
            <button aria-label="Size 4">4</button>
            <ul>
              <li>Lightweight, everyday layer</li>
            </ul>
          </body>
        </html>
      `,
      { url: "https://shop.lululemon.com/p/jackets-and-hoodies-jackets/Define-Jacket-Nulu/_/prod11020158" }
    )

    const parsed = parseLululemonProductPage(dom.window.document, dom.window.location.href)
    expect(parsed.isProductPage).toBe(true)
    expect(parsed.supported).toBe(true)
    expect(parsed.unsupportedReason).toBeUndefined()
    expect(parsed.rawProduct?.rawCategoryHint).toBe("jackets")
  })

  it("uses the product url instead of noisy page text to keep jacket pages supported", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Define Nulu",
                "description": "Add to Bag and browse Accessories",
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "USD",
                  "price": "128"
                }
              }
            </script>
          </head>
          <body>
            <button>Add to Bag</button>
            <div>Accessories</div>
          </body>
        </html>
      `,
      { url: "https://shop.lululemon.com/p/jackets-and-hoodies-jackets/Define-Jacket-Nulu/_/prod11020158?color=71918" }
    )

    const parsed = parseLululemonProductPage(dom.window.document, dom.window.location.href)
    expect(parsed.isProductPage).toBe(true)
    expect(parsed.supported).toBe(true)
    expect(parsed.unsupportedReason).toBeUndefined()
    expect(parsed.rawProduct?.rawCategoryHint).toBe("jackets")
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

  it("extracts collection cards from image-led layouts without anchor text", () => {
    const dom = new JSDOM(
      `
        <html>
          <body>
            <h1>Women's Tanks</h1>
            <article>
              <a href="/p/women-tanks/Define-Full-Zip-Tank-Top-Luon/_/prod20003001">
                <img src="https://images.lululemon.com/define.jpg" alt="Define Full-Zip Tank Top Luon" />
              </a>
              <div>Sale Price $89 Regular Price $118</div>
            </article>
          </body>
        </html>
      `,
      { url: "https://shop.lululemon.com/c/women-tanks/n1abc" }
    )

    const parsed = parseLululemonCollectionPage(dom.window.document, dom.window.location.href)
    expect(parsed.isCollectionPage).toBe(true)
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]?.title).toBe("Define Full-Zip Tank Top Luon")
    expect(parsed.items[0]?.thumbnailAlt).toBe("Define Full-Zip Tank Top Luon")
    expect(parsed.items[0]?.salePrice).toBe(89)
  })
})

describe("parseReformationProductPage", () => {
  it("parses product detail pages and normalizes key attributes", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "http://schema.org/",
                "@type": "Product",
                "name": "Roma Linen Dress",
                "description": "How dreamy. Shop the Roma Linen Dress from Reformation, a sleeveless midi dress with a square neckline and hook and eye closure at the bust.",
                "mpn": "1320130HRY",
                "sku": "1320130HRY",
                "offers": [
                  { "@type": "Offer", "priceCurrency": "USD", "price": "278.00", "size": "000" },
                  { "@type": "Offer", "priceCurrency": "USD", "price": "278.00", "size": "002" },
                  { "@type": "Offer", "priceCurrency": "USD", "price": "278.00", "size": "004" }
                ]
              }
            </script>
          </head>
          <body>
            <main class="main main--product-show">
              <div class="pdp-main" data-product-container="pdp" data-pid="1320130HRY">
                <h1 data-product-component="name">Roma Linen Dress</h1>
                <div data-product-component="price">
                  <span itemprop="price" content="278.00">$278.00</span>
                </div>
                <div data-product-component="long-description">
                  How dreamy. The Roma Linen Dress is a sleeveless midi dress with a square neckline and hook and eye closure at the bust.
                </div>
                <div data-product-component="details-accordion">
                  <ul>
                    <li>Designed to be fitted at bodice with an A-line skirt.</li>
                    <li>square neckline.</li>
                    <li>The model is wearing a size 0 and is 5'10".</li>
                  </ul>
                </div>
                <div data-product-component="materials-accordion">
                  <ul>
                    <li>This is a lightweight linen fabric - 100% linen. Wash cold + dry flat.</li>
                  </ul>
                </div>
                <div data-pdp-sizepicker>
                  <button data-attr="size" data-title="Size: 0"><span data-sizepicker-value>0</span></button>
                  <button data-attr="size" data-title="Size: 2"><span data-sizepicker-value>2</span></button>
                  <button data-attr="size" data-title="Size: 4"><span data-sizepicker-value>4</span></button>
                </div>
              </div>
            </main>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/products/roma-linen-dress/1320130HRY.html" }
    )

    const parsed = parseReformationProductPage(dom.window.document, dom.window.location.href)

    expect(parsed.isProductPage).toBe(true)
    expect(parsed.supported).toBe(true)
    expect(parsed.rawProduct?.availableSizes).toEqual(["0", "2", "4"])

    const normalized = normalizeReformationProduct(parsed.rawProduct!)
    expect(normalized.category).toBe("dresses")
    expect(normalized.attributes.neckline).toBe("square")
    expect(normalized.attributes.length).toBe("midi")
    expect(normalized.attributes.sleeve).toBe("sleeveless")
  })

  it("infers dress-appropriate occasions without mistaking production run for workout intent", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "http://schema.org/",
                "@type": "Product",
                "name": "Opaline Silk Dress",
                "description": "Leg day. The Opaline Silk Dress is a sleeveless mini dress with a halter neckline and a low back.",
                "sku": "1320057SBA",
                "offers": [{ "@type": "Offer", "priceCurrency": "USD", "price": "348.00", "size": "XS" }]
              }
            </script>
          </head>
          <body>
            <main class="main main--product-show">
              <div class="pdp-main" data-product-container="pdp" data-pid="1320057SBA">
                <h1 data-product-component="name">Opaline Silk Dress</h1>
                <div data-product-component="long-description">
                  Leg day. The Opaline Silk Dress is a sleeveless mini dress with a halter neckline and a low back.
                </div>
                <div data-product-component="details-accordion">
                  <ul>
                    <li>Designed to have a slim fit throughout.</li>
                    <li>halter neckline, open back.</li>
                  </ul>
                </div>
                <div data-product-component="sustainability-accordion">
                  <ul>
                    <li>Heads up: the country of origin above refers to stuff from our most recent production run.</li>
                  </ul>
                </div>
              </div>
            </main>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/products/opaline-silk-dress/1320057SBA.html" }
    )

    const parsed = parseReformationProductPage(dom.window.document, dom.window.location.href)
    const normalized = normalizeReformationProduct(parsed.rawProduct!)
    expect(normalized.attributes.intendedUse).toContain("date night")
    expect(normalized.attributes.intendedUse).toContain("occasion")
    expect(normalized.attributes.intendedUse).not.toContain("workout")
  })

  it("parses short-sleeved Reformation dresses without inventing extra detailing", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "http://schema.org/",
                "@type": "Product",
                "name": "Eloise Knit Dress",
                "description": "Wear the dress. Shop the Eloise Knit Dress from Reformation, a short-sleeved maxi dress with a V-neckline.",
                "sku": "1318699MDN",
                "offers": [{ "@type": "Offer", "priceCurrency": "USD", "price": "218.00", "size": "XS" }]
              }
            </script>
          </head>
          <body>
            <main class="main main--product-show">
              <div class="pdp-main" data-product-container="pdp" data-pid="1318699MDN">
                <h1 data-product-component="name">Eloise Knit Dress</h1>
                <div data-product-component="long-description">
                  Wear the dress. The Eloise Knit Dress is a short-sleeved maxi dress with a V-neckline. Feels like nothing, looks like everything.
                </div>
                <div data-product-component="details-accordion">
                  <ul>
                    <li>Designed to have a slim fit throughout.</li>
                    <li>deep v neck.</li>
                  </ul>
                </div>
                <div data-product-component="materials-accordion">
                  <ul>
                    <li>Cotton Comfy is an eco-friendly stretch fabric made from 67% TENCEL Lyocell, 29% Organically Grown Cotton and 4% Elastane.</li>
                  </ul>
                </div>
              </div>
            </main>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/products/eloise-knit-dress/1318699MDN.html" }
    )

    const parsed = parseReformationProductPage(dom.window.document, dom.window.location.href)
    const normalized = normalizeReformationProduct(parsed.rawProduct!)
    expect(normalized.attributes.sleeve).toBe("short")
    expect(normalized.attributes.visualDetail).toBeUndefined()
    expect(normalized.attributes.intendedUse).toContain("casual")
  })

  it("does not treat silk charmeuse as extra detailing on simple tops", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "http://schema.org/",
                "@type": "Product",
                "name": "Veya Silk Top",
                "description": "Up top. Shop the Veya Silk Top from Reformation, a sleeveless top with a scoop neckline.",
                "sku": "1319462BLK",
                "offers": [{ "@type": "Offer", "priceCurrency": "USD", "price": "148.00", "size": "XS" }]
              }
            </script>
          </head>
          <body>
            <main class="main main--product-show">
              <div class="pdp-main" data-product-container="pdp" data-pid="1319462BLK">
                <h1 data-product-component="name">Veya Silk Top</h1>
                <div data-product-component="long-description">
                  Up top. The Veya Silk Top is a sleeveless top with a scoop neckline. Wear it, wear it again, and then a few more times after that.
                </div>
                <div data-product-component="details-accordion">
                  <ul>
                    <li>Designed to have a slim fit throughout.</li>
                  </ul>
                </div>
                <div data-product-component="materials-accordion">
                  <ul>
                    <li>This is a lightweight silk charmeuse fabric made from 100% Silk. Dry clean only.</li>
                  </ul>
                </div>
                <div data-product-component="sustainability-accordion">
                  <ul>
                    <li>This product's footprint is about 20 lbs. of CO2.</li>
                  </ul>
                </div>
              </div>
            </main>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/products/veya-silk-top/1319462BLK.html" }
    )

    const parsed = parseReformationProductPage(dom.window.document, dom.window.location.href)
    const normalized = normalizeReformationProduct(parsed.rawProduct!)

    expect(normalized.materials).toContain("100% Silk")
    expect(normalized.attributes.visualDetail).toBeUndefined()
  })

  it("still identifies actual prints as visual detail", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "http://schema.org/",
                "@type": "Product",
                "name": "Printed Silk Top",
                "description": "A printed silk top with a scoop neckline.",
                "sku": "PRINTED123",
                "offers": [{ "@type": "Offer", "priceCurrency": "USD", "price": "148.00", "size": "XS" }]
              }
            </script>
          </head>
          <body>
            <main class="main main--product-show">
              <div class="pdp-main" data-product-container="pdp" data-pid="PRINTED123">
                <h1 data-product-component="name">Printed Silk Top</h1>
                <div data-product-component="long-description">A printed silk top with a scoop neckline.</div>
              </div>
            </main>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/products/printed-silk-top/PRINTED123.html" }
    )

    const parsed = parseReformationProductPage(dom.window.document, dom.window.location.href)
    const normalized = normalizeReformationProduct(parsed.rawProduct!)

    expect(normalized.attributes.visualDetail).toBe("high")
  })

  it("filters obvious non-apparel products", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "http://schema.org/",
                "@type": "Product",
                "name": "Simona Cylinder Bag",
                "sku": "BAG123",
                "offers": [{ "@type": "Offer", "priceCurrency": "USD", "price": "268.00" }]
              }
            </script>
          </head>
          <body>
            <main class="main main--product-show">
              <div class="pdp-main" data-product-container="pdp" data-pid="BAG123">
                <h1 data-product-component="name">Simona Cylinder Bag</h1>
              </div>
            </main>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/products/simona-cylinder-bag/BAG123.html" }
    )

    const parsed = parseReformationProductPage(dom.window.document, dom.window.location.href)
    expect(parsed.isProductPage).toBe(true)
    expect(parsed.supported).toBe(false)
    expect(parsed.unsupportedReason).toMatch(/non-apparel/i)
  })
})

describe("parseReformationCollectionPage", () => {
  it("parses collection tiles for inline recommendation highlights", () => {
    const dom = new JSDOM(
      `
        <html>
          <body>
            <div class="search-results" data-search-component="search-results">
              <h1 class="search-results__title">dresses</h1>
              <div data-product-tile data-pid="1320130HRY">
                <a class="product-tile__anchor" href="/products/roma-linen-dress/1320130HRY.html?dwvar_1320130HRY_color=HRY"></a>
                <img data-cloudinary-plp-image src="https://media.thereformation.com/roma.jpg" alt="Roma Linen Dress - Cherry Blossom" />
                <div data-product-component="name">Roma Linen Dress</div>
                <div data-product-component="price"><span itemprop="price" content="278.00">$278.00</span></div>
              </div>
              <div data-product-tile data-pid="1319536TON">
                <a class="product-tile__anchor" href="/products/sorrel-dress/1319536TON.html"></a>
                <img data-cloudinary-plp-image src="https://media.thereformation.com/sorrel.jpg" alt="Sorrel Dress - Tonal" />
                <div data-product-component="name">Sorrel Dress</div>
                <div data-product-component="price">
                  <span itemprop="price" content="148.00">$148.00</span>
                </div>
                <span class="price__original">$198.00</span>
              </div>
            </div>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/dresses" }
    )

    const parsed = parseReformationCollectionPage(dom.window.document, dom.window.location.href)
    expect(parsed.isCollectionPage).toBe(true)
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items[0]?.title).toBe("Roma Linen Dress")
    expect(parsed.items[1]?.salePrice).toBe(148)
    expect(parsed.items[1]?.price).toBe(198)
  })

  it("parses tops collection tiles that include multiple product links per card", () => {
    const dom = new JSDOM(
      `
        <html>
          <body>
            <div class="search-results" data-search-component="search-results">
              <h1 class="search-results__title">tops</h1>
              <div data-product-tile data-pid="1304142DOC">
                <a class="product-tile__anchor" href="/products/teddy-silk-top/1304142DOC.html?dwvar_1304142DOC_color=DOC"></a>
                <a href="/products/teddy-silk-top/1304142DOC.html?dwvar_1304142DOC_color=ALC" title="Almond Lace"></a>
                <div data-product-component="name">Teddy Silk Top</div>
                <span itemprop="price" content="168.00">$168.00</span>
              </div>
              <div data-product-tile data-pid="1319579USG">
                <a class="product-tile__anchor" href="/products/alistair-linen-top/1319579USG.html?dwvar_1319579USG_color=USG"></a>
                <a href="/products/alistair-linen-top/1319579USG.html?dwvar_1319579USG_color=BLK" title="Black"></a>
                <div itemprop="name">Alistair Linen Top</div>
                <span itemprop="price" content="148.00">$148.00</span>
              </div>
            </div>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/tops" }
    )

    const parsed = parseReformationCollectionPage(dom.window.document, dom.window.location.href)

    expect(parsed.isCollectionPage).toBe(true)
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items[0]?.title).toBe("Teddy Silk Top")
    expect(parsed.items[1]?.url).toContain("/products/alistair-linen-top/1319579USG.html")
  })

  it("treats a Reformation collection shell as a collection before tiles finish loading", () => {
    const dom = new JSDOM(
      `
        <html>
          <body>
            <main data-search-component="search-main">
              <div class="search-results" data-search-component="search-results">
                <h1 class="search-results__title">tops</h1>
                <div data-search-component="product-grid"></div>
              </div>
            </main>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/tops?page=6" }
    )

    const parsed = parseReformationCollectionPage(dom.window.document, dom.window.location.href)

    expect(parsed.isCollectionPage).toBe(true)
    expect(parsed.title).toBe("tops")
    expect(parsed.items).toEqual([])
  })

  it("parses structural product grids on editorial collection URLs", () => {
    const dom = new JSDOM(
      `
        <html>
          <body>
            <h1>The Occasion Shop</h1>
            <div class="product-grid__component">
              <div data-product-tile data-pid="1318768MNL">
                <a class="product-tile__anchor" href="/products/lilibeth-silk-dress/1318768MNL.html?dwvar_1318768MNL_color=MNL"></a>
                <img alt="Lilibeth Silk Dress - Moonlight" />
                <div data-product-component="name">Lilibeth Silk Dress</div>
                <span itemprop="price" content="398.00">$398.00</span>
              </div>
              <div data-product-tile data-pid="1304134WAE">
                <a class="product-tile__anchor" href="/products/frankie-silk-dress/1304134WAE.html?dwvar_1304134WAE_color=WAE"></a>
                <div itemprop="name">Frankie Silk Dress</div>
              </div>
            </div>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/the-occasion-shop.html" }
    )

    const parsed = parseReformationCollectionPage(dom.window.document, dom.window.location.href)

    expect(parsed.isCollectionPage).toBe(true)
    expect(parsed.title).toBe("The Occasion Shop")
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items[0]?.title).toBe("Lilibeth Silk Dress")
    expect(parsed.items[0]?.price).toBe(398)
    expect(parsed.items[1]?.url).toContain("/products/frankie-silk-dress/1304134WAE.html")
  })

  it("falls back to JSON-LD ItemList product URLs when rendered tiles are absent", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "http://schema.org/",
                "@type": "ItemList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "url": "https://www.thereformation.com/products/avery-knit-top/1318573BLK.html"
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "url": "https://www.thereformation.com/products/brynn-linen-top/1319586WHT.html"
                  }
                ]
              }
            </script>
          </head>
          <body>
            <h1>Tops</h1>
          </body>
        </html>
      `,
      { url: "https://www.thereformation.com/tops?page=6" }
    )

    const parsed = parseReformationCollectionPage(dom.window.document, dom.window.location.href)

    expect(parsed.isCollectionPage).toBe(true)
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items[0]?.title).toBe("Avery Knit Top")
    expect(parsed.items[1]?.productId).toBe("1319586WHT")
  })
})

describe("parseSkimsProductPage", () => {
  it("parses ProductGroup detail pages and normalizes Skims-specific support signals", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <meta name="description" content="An ultra-lift push-up bra with smooth cups and high-stretch fabric." />
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://skims.com/" },
                  { "@type": "ListItem", "position": 2, "name": "Bras", "item": "https://skims.com/collections/bras" },
                  { "@type": "ListItem", "position": 3, "name": "Push-Up Bras", "item": "https://skims.com/collections/push-up-bras" }
                ]
              }
            </script>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "ProductGroup",
                "brand": { "@type": "Brand", "name": "SKIMS" },
                "description": "A smooth push-up bra with high support and high-stretch fabric.",
                "name": "SKIMS ULTIMATE TEARDROP PUSH-UP BRA | CLAY",
                "productGroupID": "BA-PLG-9214",
                "hasVariant": [
                  {
                    "@type": "Product",
                    "mpn": "BA-PLG-9214-CLY-30A",
                    "size": "30 A",
                    "offers": { "@type": "Offer", "price": 64, "priceCurrency": "USD" }
                  },
                  {
                    "@type": "Product",
                    "mpn": "BA-PLG-9214-CLY-32A",
                    "size": "32 A",
                    "offers": { "@type": "Offer", "price": 64, "priceCurrency": "USD" }
                  }
                ]
              }
            </script>
          </head>
          <body>
            <h1>SKIMS ULTIMATE TEARDROP PUSH-UP BRA | CLAY</h1>
          </body>
        </html>
      `,
      { url: "https://skims.com/products/skims-ultimate-teardrop-push-up-bra-clay" }
    )

    const parsed = parseSkimsProductPage(dom.window.document, dom.window.location.href)

    expect(parsed.isProductPage).toBe(true)
    expect(parsed.supported).toBe(true)
    expect(parsed.rawProduct?.title).toBe("SKIMS ULTIMATE TEARDROP PUSH-UP BRA")
    expect(parsed.rawProduct?.availableSizes).toEqual(["30 A", "32 A"])
    expect(parsed.rawProduct?.price).toBe(64)

    const normalized = normalizeSkimsProduct(parsed.rawProduct!)
    expect(normalized.category).toBe("bras")
    expect(normalized.attributes.supportLevel).toBe("high")
    expect(normalized.attributes.stretch).toBe("high")
  })
})

describe("parseSkimsCollectionPage", () => {
  it("parses JSON-LD collection item lists for inline recommendation highlights", () => {
    const dom = new JSDOM(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "name": "Women’s Bras - Wireless, Balconettes, Cotton Bras & More",
                "description": "Shop women’s bras in flattering styles.",
                "url": "/collections/bras",
                "mainEntity": {
                  "@type": "ItemList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "url": "/products/skims-ultimate-teardrop-push-up-bra-clay",
                      "name": "SKIMS ULTIMATE TEARDROP PUSH-UP BRA | CLAY",
                      "image": "https://cdn.shopify.com/skims-bra.jpg"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "url": "/products/fits-everybody-t-shirt-bra-onyx",
                      "name": "FITS EVERYBODY T-SHIRT BRA | ONYX",
                      "image": "https://cdn.shopify.com/skims-tshirt-bra.jpg"
                    }
                  ]
                }
              }
            </script>
          </head>
          <body>
            <h1>Bras</h1>
          </body>
        </html>
      `,
      { url: "https://skims.com/collections/bras" }
    )

    const parsed = parseSkimsCollectionPage(dom.window.document, dom.window.location.href)

    expect(parsed.isCollectionPage).toBe(true)
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items[0]?.title).toBe("SKIMS ULTIMATE TEARDROP PUSH-UP BRA")
    expect(parsed.items[0]?.productId).toBe("skims-ultimate-teardrop-push-up-bra-clay")
    expect(parsed.items[1]?.thumbnailUrl).toBe("https://cdn.shopify.com/skims-tshirt-bra.jpg")
  })
})
