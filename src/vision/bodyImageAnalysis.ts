import type {
  ImageAnalysisSource,
  ImageBodyAnalysis,
  SilhouetteSnapshot,
  UserInputProfile
} from "../shared/types"

type AnalysisResult = {
  analysis?: ImageBodyAnalysis
  warnings: string[]
}

type LoadedImage = {
  image: HTMLImageElement
  revoke?: () => void
}

const ANALYSIS_MAX_DIMENSION = 420
const STORAGE_MAX_DIMENSION = 960

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits))
}

function average(values: Array<number | undefined>, fallback: number): number {
  const filtered = values.filter((value): value is number => value !== undefined)
  if (filtered.length === 0) {
    return fallback
  }

  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const midpoint = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint]
}

function isDirectImageSource(value?: string): boolean {
  return Boolean(value && (value.startsWith("data:image/") || value.startsWith("blob:")))
}

function normalizePhotoList(primary?: string, list?: string[]): string[] {
  const values = [...(list ?? []), ...(primary ? [primary] : [])].filter(Boolean)
  return Array.from(new Set(values))
}

export function resolveProfilePhotoSources(profile: UserInputProfile): { front: string[]; back: string[] } {
  return {
    front: normalizePhotoList(profile.frontImageUrl, profile.frontImageUrls),
    back: normalizePhotoList(profile.backImageUrl ?? profile.sideImageUrl, profile.backImageUrls)
  }
}

function inferImageSource(front: string[], back: string[]): ImageAnalysisSource {
  const frontDirect = front.some((value) => isDirectImageSource(value))
  const backDirect = back.some((value) => isDirectImageSource(value))

  if ((frontDirect && backDirect) || (frontDirect && !back) || (backDirect && !front)) {
    return "upload"
  }

  if (!frontDirect && !backDirect) {
    return "url"
  }

  return "mixed"
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

function scaleToFit(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

async function waitForImageLoad(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error("Image failed to load"))
  })
}

async function loadImageFromSource(source: string): Promise<LoadedImage> {
  if (source.startsWith("data:image/") || source.startsWith("blob:")) {
    const image = new Image()
    image.src = source
    await waitForImageLoad(image)
    return { image }
  }

  try {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error(`Image request failed: ${response.status}`)
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()
    image.src = objectUrl
    await waitForImageLoad(image)
    return {
      image,
      revoke: () => URL.revokeObjectURL(objectUrl)
    }
  } catch (error) {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.src = source
    await waitForImageLoad(image)
    return { image }
  }
}

function collectBorderPixels(data: Uint8ClampedArray, width: number, height: number): number[][] {
  const edge = Math.max(6, Math.floor(Math.min(width, height) * 0.03))
  const pixels: number[][] = []

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const isBorder = y < edge || y >= height - edge || x < edge || x >= width - edge
      if (!isBorder) {
        continue
      }

      const offset = (y * width + x) * 4
      pixels.push([data[offset], data[offset + 1], data[offset + 2]])
    }
  }

  return pixels
}

function colorDistance(pixel: number[], reference: number[]): number {
  return Math.sqrt(
    (pixel[0] - reference[0]) ** 2 +
      (pixel[1] - reference[1]) ** 2 +
      (pixel[2] - reference[2]) ** 2
  )
}

function summarizeBorder(pixels: number[][]) {
  const mean = pixels.reduce<[number, number, number]>(
    (acc, pixel) => [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]],
    [0, 0, 0]
  )

  const averageColor = mean.map((value) => value / pixels.length)
  const distances = pixels.map((pixel) => colorDistance(pixel, averageColor))

  return {
    averageColor,
    meanDistance: average(distances, 0),
    stdDistance: Math.sqrt(average(distances.map((distance) => (distance - average(distances, 0)) ** 2), 0))
  }
}

function buildForegroundMask(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { mask: Uint8Array; box?: { top: number; bottom: number; left: number; right: number } } {
  const borderPixels = collectBorderPixels(data, width, height)
  if (borderPixels.length === 0) {
    return { mask: new Uint8Array(width * height) }
  }

  const border = summarizeBorder(borderPixels)
  const threshold = Math.max(26, border.meanDistance * 1.8 + border.stdDistance * 2.2)
  const mask = new Uint8Array(width * height)
  const rowCounts = new Array<number>(height).fill(0)
  const columnCounts = new Array<number>(width).fill(0)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const alpha = data[offset + 3]
      if (alpha < 12) {
        continue
      }

      const distance = colorDistance(
        [data[offset], data[offset + 1], data[offset + 2]],
        border.averageColor
      )

      if (distance <= threshold) {
        continue
      }

      const index = y * width + x
      mask[index] = 1
      rowCounts[y] += 1
      columnCounts[x] += 1
    }
  }

  const minRowPixels = Math.max(6, Math.floor(width * 0.04))
  const minColPixels = Math.max(6, Math.floor(height * 0.03))

  let top = rowCounts.findIndex((count) => count >= minRowPixels)
  let bottom = -1
  for (let y = height - 1; y >= 0; y -= 1) {
    if (rowCounts[y] >= minRowPixels) {
      bottom = y
      break
    }
  }

  let left = columnCounts.findIndex((count) => count >= minColPixels)
  let right = -1
  for (let x = width - 1; x >= 0; x -= 1) {
    if (columnCounts[x] >= minColPixels) {
      right = x
      break
    }
  }

  if (top === -1 || bottom === -1 || left === -1 || right === -1 || bottom - top < height * 0.35) {
    return { mask }
  }

  return {
    mask,
    box: { top, bottom, left, right }
  }
}

function rowSpan(mask: Uint8Array, width: number, y: number, left: number, right: number) {
  let spanLeft = -1
  let spanRight = -1

  for (let x = left; x <= right; x += 1) {
    if (mask[y * width + x]) {
      spanLeft = x
      break
    }
  }

  for (let x = right; x >= left; x -= 1) {
    if (mask[y * width + x]) {
      spanRight = x
      break
    }
  }

  if (spanLeft === -1 || spanRight === -1 || spanRight <= spanLeft) {
    return undefined
  }

  return {
    left: spanLeft,
    right: spanRight,
    width: spanRight - spanLeft + 1
  }
}

function snapshotFromMask(
  mask: Uint8Array,
  width: number,
  height: number,
  box: { top: number; bottom: number; left: number; right: number }
): SilhouetteSnapshot | undefined {
  const boxHeight = box.bottom - box.top + 1
  const boxWidth = box.right - box.left + 1
  const spans: Array<{ center: number; widthRatio: number; normalizedY: number; fillRatio: number }> = []
  let foregroundPixels = 0

  for (let y = box.top; y <= box.bottom; y += 1) {
    const span = rowSpan(mask, width, y, box.left, box.right)
    if (!span) {
      continue
    }

    const fillRatio = span.width / boxWidth
    if (fillRatio < 0.14) {
      continue
    }

    spans.push({
      center: (span.left + span.right) / 2,
      widthRatio: span.width / boxHeight,
      normalizedY: (y - box.top) / boxHeight,
      fillRatio
    })
    foregroundPixels += span.width
  }

  if (spans.length < Math.max(30, Math.floor(boxHeight * 0.4))) {
    return undefined
  }

  function bandMedian(start: number, end: number): number {
    const values = spans
      .filter((span) => span.normalizedY >= start && span.normalizedY <= end)
      .map((span) => span.widthRatio)

    return values.length ? median(values) : 0
  }

  const centers = spans.map((span) => span.center)
  const centerMedian = median(centers)
  const symmetry = clamp(
    1 -
      average(
        centers.map((center) => Math.abs(center - centerMedian) / Math.max(1, boxWidth * 0.18)),
        0.55
      ),
    0,
    1
  )
  const maskCoverage = clamp(foregroundPixels / (boxWidth * boxHeight), 0, 1)

  return {
    visibleHeightRatio: round(boxHeight / height, 3),
    shoulderWidthRatio: round(bandMedian(0.16, 0.24), 3),
    bustWidthRatio: round(bandMedian(0.27, 0.36), 3),
    waistWidthRatio: round(bandMedian(0.43, 0.53), 3),
    hipWidthRatio: round(bandMedian(0.55, 0.66), 3),
    symmetry: round(symmetry, 3),
    maskCoverage: round(maskCoverage, 3)
  }
}

async function analyzeSingleImage(source: string): Promise<SilhouetteSnapshot | undefined> {
  const loaded = await loadImageFromSource(source)

  try {
    const scaled = scaleToFit(loaded.image.naturalWidth, loaded.image.naturalHeight, ANALYSIS_MAX_DIMENSION)
    const canvas = createCanvas(scaled.width, scaled.height)
    const context = canvas.getContext("2d")

    if (!context) {
      return undefined
    }

    context.drawImage(loaded.image, 0, 0, scaled.width, scaled.height)
    const imageData = context.getImageData(0, 0, scaled.width, scaled.height)
    const { mask, box } = buildForegroundMask(imageData.data, scaled.width, scaled.height)
    if (!box) {
      return undefined
    }

    return snapshotFromMask(mask, scaled.width, scaled.height, box)
  } finally {
    loaded.revoke?.()
  }
}

function aggregateSnapshots(snapshots: SilhouetteSnapshot[]): SilhouetteSnapshot | undefined {
  if (snapshots.length === 0) {
    return undefined
  }

  const averageValue = (selector: (snapshot: SilhouetteSnapshot) => number) =>
    round(snapshots.reduce((sum, snapshot) => sum + selector(snapshot), 0) / snapshots.length, 3)

  return {
    visibleHeightRatio: averageValue((snapshot) => snapshot.visibleHeightRatio),
    shoulderWidthRatio: averageValue((snapshot) => snapshot.shoulderWidthRatio),
    bustWidthRatio: averageValue((snapshot) => snapshot.bustWidthRatio),
    waistWidthRatio: averageValue((snapshot) => snapshot.waistWidthRatio),
    hipWidthRatio: averageValue((snapshot) => snapshot.hipWidthRatio),
    symmetry: averageValue((snapshot) => snapshot.symmetry),
    maskCoverage: averageValue((snapshot) => snapshot.maskCoverage)
  }
}

export function buildImageBodyAnalysisFromSnapshots(
  front: SilhouetteSnapshot | undefined,
  back: SilhouetteSnapshot | undefined,
  heightCm?: number,
  source: ImageAnalysisSource = "mixed",
  sampleCounts: { front: number; back: number } = { front: front ? 1 : 0, back: back ? 1 : 0 }
): ImageBodyAnalysis | undefined {
  if (!front && !back) {
    return undefined
  }

  const shoulderRatio = average([front?.shoulderWidthRatio, back?.shoulderWidthRatio], 0.23)
  const bustRatio = average([front?.bustWidthRatio, back?.bustWidthRatio], 0.28)
  const waistRatio = average([front?.waistWidthRatio, back?.waistWidthRatio], 0.2)
  const hipRatio = average([front?.hipWidthRatio, back?.hipWidthRatio], 0.29)
  const symmetry = average([front?.symmetry, back?.symmetry], 0.55)
  const maskCoverage = average([front?.maskCoverage, back?.maskCoverage], 0.42)

  const estimatedShoulderWidth =
    heightCm !== undefined ? round(clamp(shoulderRatio, 0.16, 0.31) * heightCm * 1.02, 1) : undefined
  const estimatedBust =
    heightCm !== undefined ? round(clamp(bustRatio, 0.18, 0.38) * heightCm * 1.92, 1) : undefined
  const estimatedWaist =
    heightCm !== undefined ? round(clamp(waistRatio, 0.12, 0.32) * heightCm * 2.08, 1) : undefined
  const estimatedHips =
    heightCm !== undefined ? round(clamp(hipRatio, 0.19, 0.4) * heightCm * 1.96, 1) : undefined

  const confidence = clamp(
    0.28 +
      (front ? 0.15 : 0) +
      (back ? 0.17 : 0) +
      Math.min(0.1, Math.max(0, sampleCounts.front - 1) * 0.03 + Math.max(0, sampleCounts.back - 1) * 0.03) +
      symmetry * 0.18 +
      maskCoverage * 0.14 +
      (heightCm !== undefined ? 0.08 : 0),
    0.24,
    0.92
  )

  const notes: string[] = []
  if (!front || !back) {
    notes.push("Only one body photo was analyzable, so silhouette extraction is running with partial coverage.")
  }
  if (sampleCounts.front + sampleCounts.back > 2) {
    notes.push("Multiple photos were averaged to stabilize the silhouette calibration.")
  }
  if (heightCm === undefined) {
    notes.push("Without height, the photos can still shape proportions but exact measurement estimates stay limited.")
  }
  if (maskCoverage < 0.22 || symmetry < 0.45) {
    notes.push("Photo extraction confidence is reduced because the subject/background separation is weak or the stance is uneven.")
  }

  return {
    analyzedAt: Date.now(),
    source,
    confidence: round(confidence, 3),
    frontSamples: sampleCounts.front,
    backSamples: sampleCounts.back,
    front,
    back,
    derivedMeasurements: {
      estimatedBust,
      estimatedWaist,
      estimatedHips,
      estimatedShoulderWidth
    },
    notes
  }
}

export async function analyzeProfilePhotos(profile: UserInputProfile): Promise<AnalysisResult> {
  const sources = resolveProfilePhotoSources(profile)
  const warnings: string[] = []

  if (sources.front.length === 0 && sources.back.length === 0) {
    return { warnings }
  }

  const frontSnapshots: SilhouetteSnapshot[] = []
  const backSnapshots: SilhouetteSnapshot[] = []

  for (const source of sources.front) {
    try {
      const snapshot = await analyzeSingleImage(source)
      if (snapshot) {
        frontSnapshots.push(snapshot)
      } else {
        warnings.push("A front photo could not be segmented into a clean silhouette.")
      }
    } catch {
      warnings.push("A front photo could not be read for image analysis. Direct uploads work best.")
    }
  }

  for (const source of sources.back) {
    try {
      const snapshot = await analyzeSingleImage(source)
      if (snapshot) {
        backSnapshots.push(snapshot)
      } else {
        warnings.push("A back photo could not be segmented into a clean silhouette.")
      }
    } catch {
      warnings.push("A back photo could not be read for image analysis. Direct uploads work best.")
    }
  }

  const front = aggregateSnapshots(frontSnapshots)
  const back = aggregateSnapshots(backSnapshots)
  const analysis = buildImageBodyAnalysisFromSnapshots(
    front,
    back,
    profile.height,
    inferImageSource(sources.front, sources.back),
    {
      front: frontSnapshots.length,
      back: backSnapshots.length
    }
  )

  if (!analysis) {
    warnings.push("Photo analysis did not produce usable body-shape signals.")
  }

  return {
    analysis,
    warnings
  }
}

export async function optimizeUploadedImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"))
    reader.readAsDataURL(file)
  })

  const loaded = await loadImageFromSource(dataUrl)

  try {
    const scaled = scaleToFit(loaded.image.naturalWidth, loaded.image.naturalHeight, STORAGE_MAX_DIMENSION)
    const canvas = createCanvas(scaled.width, scaled.height)
    const context = canvas.getContext("2d")

    if (!context) {
      return dataUrl
    }

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, scaled.width, scaled.height)
    context.drawImage(loaded.image, 0, 0, scaled.width, scaled.height)
    return canvas.toDataURL("image/jpeg", 0.82)
  } finally {
    loaded.revoke?.()
  }
}
