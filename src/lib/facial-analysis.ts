/**
 * Facial Analysis Engine
 * Uses MediaPipe Face Mesh (478 landmarks) for facial measurements,
 * symmetry analysis, proportions, and golden ratio calculations.
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// Key landmark indices for facial analysis
const LANDMARKS = {
  // Face outline
  chin: 152,
  leftTemple: 234,
  rightTemple: 454,
  foreheadTop: 10,

  // Eyes
  leftEyeInner: 133,
  leftEyeOuter: 33,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  rightEyeTop: 386,
  rightEyeBottom: 374,

  // Eyebrows
  leftBrowInner: 107,
  leftBrowOuter: 70,
  leftBrowPeak: 105,
  rightBrowInner: 336,
  rightBrowOuter: 300,
  rightBrowPeak: 334,

  // Nose
  noseTip: 1,
  noseTop: 6,
  noseBottom: 2,
  leftNostril: 98,
  rightNostril: 327,
  noseBridge: 168,

  // Mouth/Lips
  upperLipTop: 0,
  lowerLipBottom: 17,
  leftMouth: 61,
  rightMouth: 291,
  upperLipCenter: 13,
  lowerLipCenter: 14,

  // Jaw
  leftJaw: 172,
  rightJaw: 397,
  jawLeft: 132,
  jawRight: 361,

  // Cheekbones
  leftCheek: 116,
  rightCheek: 345,

  // Face center
  noseBridgeTop: 168,
  faceCenter: 4,

  // Thirds division points
  hairline: 10,
  browLine: 9,
  noseBase: 2,
  chinBottom: 152,

  // Fifths division
  leftFaceEdge: 234,
  rightFaceEdge: 454,
}

const GOLDEN_RATIO = 1.618

type Point = { x: number; y: number; z: number }

let landmarkerInstance: FaceLandmarker | null = null

export async function initFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerInstance) return landmarkerInstance

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  )

  landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'IMAGE',
    numFaces: 1,
    outputFaceBlendshapes: true,
  })

  return landmarkerInstance
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
}

export type AnalysisResult = {
  landmarks: Point[]
  symmetry: SymmetryResult
  proportions: ProportionResult
  goldenRatio: GoldenRatioResult
  thirds: ThirdsResult
  fifths: FifthsResult
  features: FeatureResult[]
  overallScore: number
}

export type SymmetryResult = {
  score: number
  leftRightDeviation: number
  details: { name: string; leftValue: number; rightValue: number; deviation: number }[]
}

export type ProportionResult = {
  score: number
  faceWidthToHeight: number
  jawToFaceWidth: number
  eyeSpacing: number
  noseToFaceWidth: number
  mouthToFaceWidth: number
  details: { name: string; value: number; ideal: number; deviation: number }[]
}

export type GoldenRatioResult = {
  score: number
  ratios: { name: string; value: number; ideal: number; deviation: number }[]
}

export type ThirdsResult = {
  score: number
  upper: number
  middle: number
  lower: number
  idealThird: number
}

export type FifthsResult = {
  score: number
  sections: number[]
  idealFifth: number
}

export type FeatureResult = {
  feature: string
  score: number
  assessment: string
  recommendations: string[]
}

export async function analyzeFace(imageElement: HTMLImageElement | HTMLVideoElement): Promise<AnalysisResult> {
  const landmarker = await initFaceLandmarker()
  const result = landmarker.detect(imageElement)

  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    throw new Error('No se detectó ningún rostro en la imagen')
  }

  const landmarks = result.faceLandmarks[0].map((l) => ({ x: l.x, y: l.y, z: l.z }))

  const symmetry = analyzeSymmetry(landmarks)
  const proportions = analyzeProportions(landmarks)
  const goldenRatio = analyzeGoldenRatio(landmarks)
  const thirds = analyzeThirds(landmarks)
  const fifths = analyzeFifths(landmarks)
  const features = assessFeatures(landmarks, symmetry, proportions)

  const overallScore =
    symmetry.score * 0.25 +
    proportions.score * 0.2 +
    goldenRatio.score * 0.2 +
    thirds.score * 0.1 +
    fifths.score * 0.1 +
    (features.reduce((sum, f) => sum + f.score, 0) / features.length) * 0.15

  return {
    landmarks,
    symmetry,
    proportions,
    goldenRatio,
    thirds,
    fifths,
    features,
    overallScore: Math.round(overallScore * 10) / 10,
  }
}

function analyzeSymmetry(lm: Point[]): SymmetryResult {
  const center = lm[LANDMARKS.faceCenter]

  const pairs = [
    { name: 'Ojos (ancho)', left: [LANDMARKS.leftEyeInner, LANDMARKS.leftEyeOuter], right: [LANDMARKS.rightEyeInner, LANDMARKS.rightEyeOuter] },
    { name: 'Ojos (altura)', left: [LANDMARKS.leftEyeTop, LANDMARKS.leftEyeBottom], right: [LANDMARKS.rightEyeTop, LANDMARKS.rightEyeBottom] },
    { name: 'Cejas', left: [LANDMARKS.leftBrowInner, LANDMARKS.leftBrowOuter], right: [LANDMARKS.rightBrowInner, LANDMARKS.rightBrowOuter] },
    { name: 'Pómulos', left: [LANDMARKS.leftCheek, LANDMARKS.faceCenter], right: [LANDMARKS.rightCheek, LANDMARKS.faceCenter] },
    { name: 'Mandíbula', left: [LANDMARKS.jawLeft, LANDMARKS.chin], right: [LANDMARKS.jawRight, LANDMARKS.chin] },
    { name: 'Fosas nasales', left: [LANDMARKS.leftNostril, LANDMARKS.noseTip], right: [LANDMARKS.rightNostril, LANDMARKS.noseTip] },
    { name: 'Comisuras', left: [LANDMARKS.leftMouth, LANDMARKS.faceCenter], right: [LANDMARKS.rightMouth, LANDMARKS.faceCenter] },
  ]

  const details = pairs.map((pair) => {
    const leftValue = distance(lm[pair.left[0]], lm[pair.left[1]])
    const rightValue = distance(lm[pair.right[0]], lm[pair.right[1]])
    const avg = (leftValue + rightValue) / 2
    const deviation = avg > 0 ? Math.abs(leftValue - rightValue) / avg * 100 : 0
    return { name: pair.name, leftValue, rightValue, deviation }
  })

  // Also check distance from center line
  const leftEyeCenter = midpoint(lm[LANDMARKS.leftEyeInner], lm[LANDMARKS.leftEyeOuter])
  const rightEyeCenter = midpoint(lm[LANDMARKS.rightEyeInner], lm[LANDMARKS.rightEyeOuter])
  const leftDistFromCenter = Math.abs(leftEyeCenter.x - center.x)
  const rightDistFromCenter = Math.abs(rightEyeCenter.x - center.x)
  const centerDeviation = Math.abs(leftDistFromCenter - rightDistFromCenter) / ((leftDistFromCenter + rightDistFromCenter) / 2) * 100

  const avgDeviation = details.reduce((sum, d) => sum + d.deviation, 0) / details.length
  const totalDeviation = (avgDeviation + centerDeviation) / 2

  // Score: 100 = perfect symmetry, decreases with deviation
  const score = Math.max(0, Math.min(10, 10 - totalDeviation * 0.5))

  return { score: Math.round(score * 10) / 10, leftRightDeviation: Math.round(totalDeviation * 100) / 100, details }
}

function analyzeProportions(lm: Point[]): ProportionResult {
  const faceWidth = distance(lm[LANDMARKS.leftTemple], lm[LANDMARKS.rightTemple])
  const faceHeight = distance(lm[LANDMARKS.foreheadTop], lm[LANDMARKS.chin])
  const jawWidth = distance(lm[LANDMARKS.jawLeft], lm[LANDMARKS.jawRight])
  const eyeSpacing = distance(lm[LANDMARKS.leftEyeInner], lm[LANDMARKS.rightEyeInner])
  const leftEyeWidth = distance(lm[LANDMARKS.leftEyeInner], lm[LANDMARKS.leftEyeOuter])
  const noseWidth = distance(lm[LANDMARKS.leftNostril], lm[LANDMARKS.rightNostril])
  const mouthWidth = distance(lm[LANDMARKS.leftMouth], lm[LANDMARKS.rightMouth])

  const details = [
    { name: 'Ancho/Alto del rostro', value: faceWidth / faceHeight, ideal: 0.66, deviation: 0 },
    { name: 'Mandíbula/Ancho rostro', value: jawWidth / faceWidth, ideal: 0.75, deviation: 0 },
    { name: 'Espacio entre ojos / Ancho ojo', value: eyeSpacing / leftEyeWidth, ideal: 1.0, deviation: 0 },
    { name: 'Nariz / Ancho rostro', value: noseWidth / faceWidth, ideal: 0.25, deviation: 0 },
    { name: 'Boca / Ancho rostro', value: mouthWidth / faceWidth, ideal: 0.38, deviation: 0 },
  ]

  details.forEach((d) => {
    d.value = Math.round(d.value * 1000) / 1000
    d.deviation = Math.round(Math.abs(d.value - d.ideal) / d.ideal * 100 * 100) / 100
  })

  const avgDeviation = details.reduce((sum, d) => sum + d.deviation, 0) / details.length
  const score = Math.max(0, Math.min(10, 10 - avgDeviation * 0.2))

  return {
    score: Math.round(score * 10) / 10,
    faceWidthToHeight: details[0].value,
    jawToFaceWidth: details[1].value,
    eyeSpacing: details[2].value,
    noseToFaceWidth: details[3].value,
    mouthToFaceWidth: details[4].value,
    details,
  }
}

function analyzeGoldenRatio(lm: Point[]): GoldenRatioResult {
  const faceWidth = distance(lm[LANDMARKS.leftTemple], lm[LANDMARKS.rightTemple])
  const faceHeight = distance(lm[LANDMARKS.foreheadTop], lm[LANDMARKS.chin])
  const mouthToNose = distance(lm[LANDMARKS.upperLipTop], lm[LANDMARKS.noseBottom])
  const noseToEyes = distance(lm[LANDMARKS.noseBottom], lm[LANDMARKS.noseBridgeTop])
  const eyesToForehead = distance(lm[LANDMARKS.noseBridgeTop], lm[LANDMARKS.foreheadTop])
  const noseLength = distance(lm[LANDMARKS.noseTop], lm[LANDMARKS.noseBottom])
  const mouthWidth = distance(lm[LANDMARKS.leftMouth], lm[LANDMARKS.rightMouth])
  const noseWidth = distance(lm[LANDMARKS.leftNostril], lm[LANDMARKS.rightNostril])

  const ratios = [
    { name: 'Alto/Ancho rostro', value: faceHeight / faceWidth, ideal: GOLDEN_RATIO, deviation: 0 },
    { name: 'Nariz-ojos / Boca-nariz', value: noseToEyes / mouthToNose, ideal: GOLDEN_RATIO, deviation: 0 },
    { name: 'Frente-ojos / Nariz-ojos', value: eyesToForehead / noseToEyes, ideal: GOLDEN_RATIO, deviation: 0 },
    { name: 'Boca / Nariz (ancho)', value: mouthWidth / noseWidth, ideal: GOLDEN_RATIO, deviation: 0 },
  ]

  ratios.forEach((r) => {
    r.value = Math.round(r.value * 1000) / 1000
    r.deviation = Math.round(Math.abs(r.value - r.ideal) / r.ideal * 100 * 100) / 100
  })

  const avgDeviation = ratios.reduce((sum, r) => sum + r.deviation, 0) / ratios.length
  const score = Math.max(0, Math.min(10, 10 - avgDeviation * 0.3))

  return { score: Math.round(score * 10) / 10, ratios }
}

function analyzeThirds(lm: Point[]): ThirdsResult {
  const hairline = lm[LANDMARKS.hairline]
  const browLine = lm[LANDMARKS.browLine]
  const noseBase = lm[LANDMARKS.noseBase]
  const chinBottom = lm[LANDMARKS.chinBottom]

  const upper = distance(hairline, browLine)
  const middle = distance(browLine, noseBase)
  const lower = distance(noseBase, chinBottom)
  const total = upper + middle + lower
  const idealThird = total / 3

  const deviations = [upper, middle, lower].map((v) => Math.abs(v - idealThird) / idealThird * 100)
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / 3
  const score = Math.max(0, Math.min(10, 10 - avgDeviation * 0.3))

  return {
    score: Math.round(score * 10) / 10,
    upper: Math.round((upper / total) * 1000) / 10,
    middle: Math.round((middle / total) * 1000) / 10,
    lower: Math.round((lower / total) * 1000) / 10,
    idealThird: 33.3,
  }
}

function analyzeFifths(lm: Point[]): FifthsResult {
  const leftEdge = lm[LANDMARKS.leftFaceEdge]
  const rightEdge = lm[LANDMARKS.rightFaceEdge]
  const leftEyeOuter = lm[LANDMARKS.leftEyeOuter]
  const leftEyeInner = lm[LANDMARKS.leftEyeInner]
  const rightEyeInner = lm[LANDMARKS.rightEyeInner]
  const rightEyeOuter = lm[LANDMARKS.rightEyeOuter]

  const s1 = distance(leftEdge, leftEyeOuter)
  const s2 = distance(leftEyeOuter, leftEyeInner)
  const s3 = distance(leftEyeInner, rightEyeInner)
  const s4 = distance(rightEyeInner, rightEyeOuter)
  const s5 = distance(rightEyeOuter, rightEdge)

  const total = s1 + s2 + s3 + s4 + s5
  const idealFifth = total / 5
  const sections = [s1, s2, s3, s4, s5].map((v) => Math.round((v / total) * 1000) / 10)

  const deviations = [s1, s2, s3, s4, s5].map((v) => Math.abs(v - idealFifth) / idealFifth * 100)
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / 5
  const score = Math.max(0, Math.min(10, 10 - avgDeviation * 0.3))

  return { score: Math.round(score * 10) / 10, sections, idealFifth: 20 }
}

function assessFeatures(lm: Point[], symmetry: SymmetryResult, proportions: ProportionResult): FeatureResult[] {
  const features: FeatureResult[] = []

  // Eyes
  const leftEyeWidth = distance(lm[LANDMARKS.leftEyeInner], lm[LANDMARKS.leftEyeOuter])
  const leftEyeHeight = distance(lm[LANDMARKS.leftEyeTop], lm[LANDMARKS.leftEyeBottom])
  const eyeRatio = leftEyeWidth / leftEyeHeight
  const eyeScore = Math.max(0, Math.min(10, 10 - Math.abs(eyeRatio - 2.5) * 2))
  features.push({
    feature: 'Ojos',
    score: Math.round(eyeScore * 10) / 10,
    assessment: eyeRatio > 3 ? 'Ojos estrechos' : eyeRatio < 2 ? 'Ojos redondos' : 'Proporción equilibrada',
    recommendations: getEyeRecommendations(eyeRatio, symmetry),
  })

  // Nose
  const noseWidth = distance(lm[LANDMARKS.leftNostril], lm[LANDMARKS.rightNostril])
  const noseLength = distance(lm[LANDMARKS.noseTop], lm[LANDMARKS.noseBottom])
  const noseRatio = noseLength / noseWidth
  const noseScore = Math.max(0, Math.min(10, 10 - Math.abs(noseRatio - 1.6) * 3))
  features.push({
    feature: 'Nariz',
    score: Math.round(noseScore * 10) / 10,
    assessment: noseRatio > 2 ? 'Nariz alargada' : noseRatio < 1.2 ? 'Nariz ancha' : 'Proporciones armónicas',
    recommendations: getNoseRecommendations(noseRatio, proportions),
  })

  // Jaw
  const jawWidth = distance(lm[LANDMARKS.jawLeft], lm[LANDMARKS.jawRight])
  const faceWidth = distance(lm[LANDMARKS.leftTemple], lm[LANDMARKS.rightTemple])
  const jawRatio = jawWidth / faceWidth
  const jawScore = Math.max(0, Math.min(10, 10 - Math.abs(jawRatio - 0.75) * 10))
  features.push({
    feature: 'Mandíbula',
    score: Math.round(jawScore * 10) / 10,
    assessment: jawRatio > 0.85 ? 'Mandíbula ancha/cuadrada' : jawRatio < 0.65 ? 'Mandíbula estrecha' : 'Mandíbula bien definida',
    recommendations: getJawRecommendations(jawRatio),
  })

  // Lips
  const mouthWidth = distance(lm[LANDMARKS.leftMouth], lm[LANDMARKS.rightMouth])
  const lipHeight = distance(lm[LANDMARKS.upperLipTop], lm[LANDMARKS.lowerLipBottom])
  const upperLip = distance(lm[LANDMARKS.upperLipTop], lm[LANDMARKS.upperLipCenter])
  const lowerLip = distance(lm[LANDMARKS.lowerLipCenter], lm[LANDMARKS.lowerLipBottom])
  const lipRatio = upperLip > 0 ? lowerLip / upperLip : 1
  const lipScore = Math.max(0, Math.min(10, 10 - Math.abs(lipRatio - 1.6) * 3))
  features.push({
    feature: 'Labios',
    score: Math.round(lipScore * 10) / 10,
    assessment: lipRatio > 2.5 ? 'Labio superior fino' : lipRatio < 1 ? 'Labio inferior fino' : 'Proporción labial equilibrada',
    recommendations: getLipRecommendations(lipRatio),
  })

  // Cheekbones
  const cheekWidth = distance(lm[LANDMARKS.leftCheek], lm[LANDMARKS.rightCheek])
  const cheekRatio = cheekWidth / faceWidth
  const cheekScore = Math.max(0, Math.min(10, 10 - Math.abs(cheekRatio - 0.85) * 12))
  features.push({
    feature: 'Pómulos',
    score: Math.round(cheekScore * 10) / 10,
    assessment: cheekRatio > 0.9 ? 'Pómulos prominentes' : cheekRatio < 0.75 ? 'Pómulos poco definidos' : 'Pómulos bien estructurados',
    recommendations: getCheekRecommendations(cheekRatio),
  })

  // Forehead
  const foreheadHeight = distance(lm[LANDMARKS.foreheadTop], lm[LANDMARKS.browLine || LANDMARKS.noseBridgeTop])
  const faceHeight = distance(lm[LANDMARKS.foreheadTop], lm[LANDMARKS.chin])
  const foreheadRatio = foreheadHeight / faceHeight
  const foreheadScore = Math.max(0, Math.min(10, 10 - Math.abs(foreheadRatio - 0.33) * 20))
  features.push({
    feature: 'Frente',
    score: Math.round(foreheadScore * 10) / 10,
    assessment: foreheadRatio > 0.4 ? 'Frente amplia' : foreheadRatio < 0.25 ? 'Frente corta' : 'Proporción frontal equilibrada',
    recommendations: getForeheadRecommendations(foreheadRatio),
  })

  return features
}

// Science-based recommendation generators with concrete exercises and actions

function getEyeRecommendations(ratio: number, symmetry: SymmetryResult): string[] {
  const recs: string[] = []

  // Periorbital health (evidence: Darvin et al., 2008 - skin carotenoids; Oyetakin-White et al., 2015 - sleep and skin aging)
  recs.push('[EJERCICIO] Masaje linfático periorbital: con el dedo anular, presionar suavemente 5 puntos desde el lagrimal hacia la sien, mantener 3 seg cada punto, 2 veces al día. Reduce retención de líquidos y ojeras (estudios de drenaje linfático facial, Majewski et al., 2021)')

  if (ratio > 3) {
    recs.push('[ACCIÓN] Ojos estrechos detectados — Ejercicio de apertura ocular: abrir los ojos al máximo sin arrugar la frente, mantener 5 seg, repetir 10 veces. Fortalece el músculo elevador del párpado superior (Hwang et al., 2018, Korean J Ophthalmol)')
    recs.push('[ACCIÓN] Aplicar retinol 0.3-0.5% en contorno de ojos cada noche para mejorar elasticidad del párpado (Kafi et al., 2007, Arch Dermatol — retinol mejora arrugas y laxitud)')
  }

  if (ratio < 2) {
    recs.push('[ACCIÓN] Ojos redondos/grandes — rasgo generalmente atractivo según estudios de percepción facial (Rhodes, 2006). Proteger con gafas de sol UV400 para preservar la zona periorbital')
  }

  const eyeSymm = symmetry.details.find((d) => d.name === 'Ojos (ancho)')
  if (eyeSymm && eyeSymm.deviation > 5) {
    recs.push('[EJERCICIO] Asimetría ocular detectada — esto es normal (Ercan et al., 2008 demostró que el 100% de rostros tienen asimetría). Ejercicio corrector: guiñar el ojo del lado más pequeño 20 veces, 3 series, 2x/día para tonificar el orbicular')
  }

  recs.push('[ACCIÓN] Regla 20-20-20 para salud ocular: cada 20 min de pantalla, mirar algo a 20 pies (6m) por 20 seg. Reduce fatiga ocular y entrecerrar los ojos (Sheppard & Wolffsohn, 2018, BMJ Open Ophthalmol)')
  recs.push('[ACCIÓN] Dormir 7-9 horas — la privación de sueño aumenta ojeras, hinchazón y caída palpebral (Sundelin et al., 2013, Sleep — estudio de percepción facial y sueño)')

  return recs
}

function getNoseRecommendations(ratio: number, proportions: ProportionResult): string[] {
  const recs: string[] = []

  if (ratio > 2) {
    recs.push('[ACCIÓN] Nariz proporcionalmente larga — la estructura ósea/cartilaginosa no cambia con ejercicio. Opciones reales: rinoplastia (cambio permanente) o relleno de ácido hialurónico en dorso/punta para corrección visual (rinoplastia no quirúrgica, Kontis & Rivkin, 2009)')
  }

  if (ratio < 1.2) {
    recs.push('[ACCIÓN] Nariz ancha detectada — el ancho nasal está determinado genéticamente. Opciones: rinoplastia de reducción de alas o relleno en dorso nasal para crear ilusión de nariz más estrecha (Beer, 2006, Dermatol Surg)')
  }

  // Breathing optimization (impacts nasal function and indirectly facial development)
  recs.push('[EJERCICIO] Respiración nasal exclusiva: la respiración bucal crónica altera el desarrollo facial (Harari et al., 2010). Practica respiración nasal consciente: inhalar 4 seg por nariz, mantener 4 seg, exhalar 6 seg por nariz. 5 min, 3x/día')
  recs.push('[EJERCICIO] Ejercicio de Buteyko para descongestión nasal: tapar la nariz, caminar 10-20 pasos conteniendo la respiración, soltar y respirar suave por nariz. Repetir 3-5 veces. Mejora permeabilidad nasal (McKeown, 2004)')
  recs.push('[ACCIÓN] Limpieza nasal con solución salina (irrigación tipo Neti pot): reduce inflamación de cornetes, mejora respiración nasal. Estudios muestran beneficio significativo (Rabago et al., 2002, J Fam Pract)')

  const noseToFace = proportions.details.find((d) => d.name === 'Nariz / Ancho rostro')
  if (noseToFace && noseToFace.deviation > 20) {
    recs.push(`[INFO] Tu proporción nariz/rostro es ${noseToFace.value} (ideal: ${noseToFace.ideal}). Desviación del ${noseToFace.deviation}% — la variación poblacional normal es ±15% según Farkas et al., 2005`)
  }

  return recs
}

function getJawRecommendations(ratio: number): string[] {
  const recs: string[] = []

  if (ratio > 0.85) {
    recs.push('[INFO] Mandíbula ancha/cuadrada — asociada con mayor percepción de masculinidad y dominancia (Cunningham et al., 1990). Si deseas suavizar: toxina botulínica en maseteros reduce hipertrofia muscular (Kim et al., 2003, Aesthetic Plast Surg)')
  }

  if (ratio < 0.65) {
    recs.push('[EJERCICIO] Mandíbula estrecha — Ejercicio de resistencia mandibular: colocar el puño bajo el mentón, abrir la boca contra la resistencia del puño, mantener 5 seg, repetir 15 veces, 3 series, 1x/día. Hipertrofia del masetero y pterigoideo (Kiliaridis et al., 1995)')
    recs.push('[EJERCICIO] Masticación bilateral de chicle sin azúcar (chicle duro tipo Falim): 20 min/día, alternando lados cada 5 min. Estudios muestran aumento de grosor del masetero de hasta 10% en 6 meses (Rani & Ravi, 2014)')
    recs.push('[ACCIÓN] Considerar relleno dérmico de ácido hialurónico en ángulo mandibular para mayor definición — efecto inmediato, duración 12-18 meses (Braz & Sakuma, 2012)')
  }

  // Universal jaw recommendations
  recs.push('[EJERCICIO] Mewing (postura lingual correcta): mantener la lengua completa apoyada en el paladar, labios sellados, dientes en contacto suave. 24/7. Respaldado por ortodoncia funcional — la postura lingual influye en desarrollo del tercio medio e inferior (Mew, 2004; Carlson, 2005, Semin Orthod)')
  recs.push('[EJERCICIO] Ejercicio de protrusión mandibular: sacar la mandíbula hacia adelante y arriba, mantener 10 seg, repetir 10 veces. Tonifica platisma y suprahioideos, mejora definición de línea mandibular')
  recs.push('[ACCIÓN] Reducir grasa submentoniana: si hay exceso, un déficit calórico moderado (300-500 kcal/día) reduce grasa facial gradualmente. Meta: 10-15% grasa corporal en hombres, 18-23% en mujeres para máxima definición mandibular (estudio de atractivo facial y composición corporal, Coetzee et al., 2009)')
  recs.push('[ACCIÓN] Postura cervical: mantener oreja alineada con el hombro. La postura anterior de cabeza comprime el tejido submentoniano y oculta la línea mandibular (Yip et al., 2008)')

  return recs
}

function getLipRecommendations(ratio: number): string[] {
  const recs: string[] = []

  // Evidence: ideal upper:lower lip ratio is 1:1.6 (Ricketts, 1982; Anic-Milosevic et al., 2010)
  if (ratio > 2.5) {
    recs.push('[ACCIÓN] Labio superior fino detectado — ratio superior:inferior desproporcionado. Opciones clínicas: relleno de ácido hialurónico (Restylane/Juvederm) en bermellón del labio superior, 0.5-1ml, duración 6-12 meses. Procedimiento más solicitado y con alta satisfacción (Fagien & Cassuto, 2012)')
    recs.push('[EJERCICIO] Ejercicio de labio superior: sonreír ampliamente mostrando dientes superiores, luego fruncir los labios como para besar. Alternar 20 veces, 2x/día. Tonifica el orbicular de los labios')
  }

  if (ratio < 1) {
    recs.push('[INFO] Labio inferior proporcionalmente fino — menos común. Si deseas corregir: relleno de ácido hialurónico en labio inferior con técnica de microcánula para resultado natural')
  }

  recs.push('[EJERCICIO] Ejercicio de resistencia labial: succionar las mejillas hacia adentro (cara de pez), mantener 10 seg, soltar y sonreír amplio. Repetir 15 veces, 2x/día. Trabaja orbicular oris y buccinador')
  recs.push('[ACCIÓN] Hidratación labial con ingredientes activos: buscar bálsamos con ceramidas, ácido hialurónico y manteca de karité. La barrera labial es 3-4 veces más delgada que la piel normal (Kobayashi & Tagami, 2004)')
  recs.push('[ACCIÓN] Exfoliación labial suave 1x/semana con scrub de azúcar + miel, seguido de mascarilla labial nocturna. Mejora textura y apariencia de volumen')
  recs.push('[ACCIÓN] SPF labial obligatorio — los labios carecen de melanina y son altamente susceptibles a fotodaño y pérdida de volumen por UV (Lim & Draelos, 2009)')

  return recs
}

function getCheekRecommendations(ratio: number): string[] {
  const recs: string[] = []

  if (ratio < 0.75) {
    recs.push('[ACCIÓN] Pómulos poco definidos — opciones: relleno de ácido hialurónico en arco cigomático (Juvederm Voluma), efecto lifting inmediato, duración 18-24 meses. Punto de inyección: intersección de línea del trago al ala nasal con línea de la comisura a la oreja (Braz & Sakuma, 2012)')
    recs.push('[EJERCICIO] Ejercicio de pómulos: sonreír ampliamente con labios cerrados, colocar los dedos índice y medio sobre los pómulos, empujar los pómulos hacia arriba contra la resistencia de los dedos. Mantener 10 seg, 15 repeticiones, 2x/día')
  }

  if (ratio > 0.9) {
    recs.push('[INFO] Pómulos prominentes — rasgo altamente atractivo en ambos sexos según estudios de percepción facial (Perrett et al., 1998). Los pómulos altos están asociados con mayor percepción de confiabilidad y atractivo')
  }

  recs.push('[EJERCICIO] Face yoga para zona malar: inflar las mejillas con aire, pasar el aire de una mejilla a otra 20 veces, luego mantener en cada mejilla 10 seg. Estudios de Alam et al. (2018, JAMA Dermatol) demostraron que 30 min/día de ejercicios faciales durante 20 semanas mejoró significativamente la plenitud de mejillas')
  recs.push('[ACCIÓN] Reducción de grasa facial para revelar estructura ósea: si tu % de grasa corporal es >20% (hombres) o >28% (mujeres), la definición de pómulos mejora significativamente con recomposición corporal')
  recs.push('[EJERCICIO] Masaje con gua sha en dirección ascendente sobre el pómulo: 10 pasadas firmes desde nariz hacia oreja, 1x/día. Mejora circulación y drenaje linfático (Braun et al., 2021 — revisión de técnicas de masaje facial)')

  return recs
}

function getForeheadRecommendations(ratio: number): string[] {
  const recs: string[] = []

  if (ratio > 0.4) {
    recs.push('[INFO] Frente amplia (>40% del rostro) — la frente grande está asociada con percepción de inteligencia (Todorov et al., 2015, Trends Cogn Sci). Si deseas equilibrar visualmente:')
    recs.push('[ACCIÓN] Microblading o diseño de cejas ligeramente más gruesas crea ilusión de frente más corta — las cejas más altas y definidas dividen visualmente el tercio superior')
    recs.push('[EJERCICIO] Ejercicio frontal: colocar las yemas de los dedos sobre las cejas, intentar levantar las cejas contra la resistencia de los dedos. 10 seg x 15 reps. Tonifica el frontalis sin crear arrugas')
  }

  if (ratio < 0.25) {
    recs.push('[INFO] Frente corta (<25% del rostro) — puede indicar línea de cabello baja. Opciones: depilación láser de la línea del cabello frontal para elevarla 1-2 cm')
    recs.push('[EJERCICIO] Masaje del cuero cabelludo frontal: con las yemas, realizar movimientos circulares en la zona frontal del cuero cabelludo, 5 min/día. Mejora circulación y puede mejorar la textura del cabello en la línea frontal')
  }

  recs.push('[ACCIÓN] Protección solar facial SPF 50+ diaria — la frente recibe máxima exposición UV, acelerando fotoenvejecimiento y arrugas frontales (Flament et al., 2013, J Eur Acad Dermatol Venereol)')
  recs.push('[ACCIÓN] Retinol 0.5-1% en frente cada noche: gold standard para prevenir y revertir arrugas. Empezar con 0.3% si piel sensible, aumentar gradualmente. Resultados visibles en 12 semanas (Mukherjee et al., 2006)')
  recs.push('[EJERCICIO] Anti-arrugas frontales: colocar ambas palmas sobre la frente, presionar suavemente la piel hacia abajo mientras intentas levantar las cejas. Mantener 10 seg, 10 reps. Fortalece el frontalis de forma isométrica sin crear pliegues')

  return recs
}
