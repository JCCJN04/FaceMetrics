/**
 * Skin Analysis Module
 * Analyzes skin quality from facial photos using canvas-based image processing.
 * Detects texture, uniformity, clarity, spots, and wrinkle indicators.
 */

export type SkinAnalysisResult = {
  textureScore: number
  uniformityScore: number
  clarityScore: number
  spotsDetected: number
  wrinkleScore: number
  overallScore: number
  details: {
    avgBrightness: number
    brightnessVariance: number
    colorUniformity: number
    edgeDensity: number
    spotRegions: { x: number; y: number; size: number }[]
  }
}

/**
 * Analyze skin quality from an image, focusing on the face region defined by landmarks.
 */
export function analyzeSkin(
  imageElement: HTMLImageElement | HTMLVideoElement,
  landmarks: { x: number; y: number; z: number }[]
): SkinAnalysisResult {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const width = imageElement instanceof HTMLImageElement ? imageElement.naturalWidth : imageElement.videoWidth
  const height = imageElement instanceof HTMLImageElement ? imageElement.naturalHeight : imageElement.videoHeight

  canvas.width = width
  canvas.height = height
  ctx.drawImage(imageElement, 0, 0, width, height)

  // Extract cheek regions (most uniform skin area for analysis)
  const regions = getSkinRegions(landmarks, width, height)
  const analyses = regions.map((region) => analyzeRegion(ctx, region, width, height))

  // Aggregate results from all regions
  const avgTexture = avg(analyses.map((a) => a.texture))
  const avgUniformity = avg(analyses.map((a) => a.uniformity))
  const avgClarity = avg(analyses.map((a) => a.clarity))
  const totalSpots = analyses.reduce((sum, a) => sum + a.spots.length, 0)
  const avgWrinkle = avg(analyses.map((a) => a.wrinkle))

  const allSpots = analyses.flatMap((a) => a.spots)

  const textureScore = Math.round(avgTexture * 10) / 10
  const uniformityScore = Math.round(avgUniformity * 10) / 10
  const clarityScore = Math.round(avgClarity * 10) / 10
  const wrinkleScore = Math.round(avgWrinkle * 10) / 10
  const overallScore = Math.round((textureScore * 0.25 + uniformityScore * 0.25 + clarityScore * 0.3 + wrinkleScore * 0.2) * 10) / 10

  return {
    textureScore,
    uniformityScore,
    clarityScore,
    spotsDetected: totalSpots,
    wrinkleScore,
    overallScore,
    details: {
      avgBrightness: avg(analyses.map((a) => a.avgBrightness)),
      brightnessVariance: avg(analyses.map((a) => a.brightnessVariance)),
      colorUniformity: avgUniformity,
      edgeDensity: avg(analyses.map((a) => a.edgeDensity)),
      spotRegions: allSpots,
    },
  }
}

type SkinRegion = { x: number; y: number; w: number; h: number }

function getSkinRegions(landmarks: { x: number; y: number }[], imgW: number, imgH: number): SkinRegion[] {
  // Left cheek, right cheek, forehead regions
  const toPixel = (lm: { x: number; y: number }) => ({
    x: Math.round(lm.x * imgW),
    y: Math.round(lm.y * imgH),
  })

  // Cheek landmarks (approximate)
  const leftCheek = toPixel(landmarks[116])
  const rightCheek = toPixel(landmarks[345])
  const forehead = toPixel(landmarks[10])
  const noseBridge = toPixel(landmarks[168])

  const regionSize = Math.round(imgW * 0.08) // ~8% of image width

  return [
    { x: leftCheek.x - regionSize / 2, y: leftCheek.y - regionSize / 2, w: regionSize, h: regionSize },
    { x: rightCheek.x - regionSize / 2, y: rightCheek.y - regionSize / 2, w: regionSize, h: regionSize },
    { x: forehead.x - regionSize / 2, y: forehead.y - regionSize * 0.8, w: regionSize, h: regionSize * 0.6 },
  ].map((r) => ({
    x: Math.max(0, Math.min(r.x, imgW - r.w)),
    y: Math.max(0, Math.min(r.y, imgH - r.h)),
    w: Math.min(r.w, imgW),
    h: Math.min(r.h, imgH),
  }))
}

type RegionAnalysis = {
  texture: number
  uniformity: number
  clarity: number
  wrinkle: number
  spots: { x: number; y: number; size: number }[]
  avgBrightness: number
  brightnessVariance: number
  edgeDensity: number
}

function analyzeRegion(ctx: CanvasRenderingContext2D, region: SkinRegion, imgW: number, imgH: number): RegionAnalysis {
  const imageData = ctx.getImageData(region.x, region.y, region.w, region.h)
  const data = imageData.data

  const pixels = region.w * region.h
  let totalR = 0, totalG = 0, totalB = 0
  const brightnesses: number[] = []
  const hues: number[] = []

  // First pass: collect color stats
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    totalR += r; totalG += g; totalB += b
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
    brightnesses.push(brightness)

    // Convert to hue for uniformity
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (max - min > 10) {
      let h = 0
      if (max === r) h = ((g - b) / (max - min)) % 6
      else if (max === g) h = (b - r) / (max - min) + 2
      else h = (r - g) / (max - min) + 4
      hues.push(h * 60)
    }
  }

  const avgBrightness = avg(brightnesses)
  const brightnessVariance = variance(brightnesses)

  // Texture score: lower variance = smoother skin
  const texture = Math.max(0, Math.min(10, 10 - brightnessVariance / 50))

  // Uniformity: how consistent is the skin color
  const hueVariance = hues.length > 0 ? variance(hues) : 0
  const uniformity = Math.max(0, Math.min(10, 10 - hueVariance / 100))

  // Edge detection for wrinkles (simple Sobel-like)
  let edgeSum = 0
  for (let y = 1; y < region.h - 1; y++) {
    for (let x = 1; x < region.w - 1; x++) {
      const idx = y * region.w + x
      const gx = Math.abs(brightnesses[idx + 1] - brightnesses[idx - 1])
      const gy = Math.abs(brightnesses[idx + region.w] - brightnesses[idx - region.w])
      edgeSum += Math.sqrt(gx * gx + gy * gy)
    }
  }
  const edgeDensity = edgeSum / pixels
  const wrinkle = Math.max(0, Math.min(10, 10 - edgeDensity / 3))

  // Spot detection: pixels significantly different from average
  const spots: { x: number; y: number; size: number }[] = []
  const threshold = avgBrightness * 0.3
  for (let y = 2; y < region.h - 2; y += 3) {
    for (let x = 2; x < region.w - 2; x += 3) {
      const idx = y * region.w + x
      if (Math.abs(brightnesses[idx] - avgBrightness) > threshold) {
        spots.push({
          x: region.x + x,
          y: region.y + y,
          size: 2,
        })
      }
    }
  }

  // Clarity: combination of brightness and contrast
  const contrast = Math.max(...brightnesses) - Math.min(...brightnesses)
  const clarity = Math.max(0, Math.min(10,
    (avgBrightness > 60 && avgBrightness < 200 ? 7 : 4) +
    (contrast > 30 && contrast < 150 ? 3 : 0) -
    spots.length * 0.1
  ))

  return { texture, uniformity, clarity, wrinkle, spots, avgBrightness, brightnessVariance, edgeDensity }
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function variance(arr: number[]): number {
  if (arr.length === 0) return 0
  const mean = avg(arr)
  return arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length
}
