import { supabase, type Analysis, type FeatureAssessment, type FacialMeasurement, type SkinAssessment } from './supabase'
import type { AnalysisResult } from './facial-analysis'
import type { SkinAnalysisResult } from './skin-analysis'

async function uploadPhoto(dataUrl: string, userId: string): Promise<string> {
  // Convert base64 data URL to blob
  const res = await fetch(dataUrl)
  const blob = await res.blob()

  const ext = blob.type === 'image/png' ? 'png' : 'jpg'
  const fileName = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('photos')
    .upload(fileName, blob, { contentType: blob.type, upsert: false })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(fileName)

  return publicUrl
}

export async function saveAnalysis(
  photoDataUrl: string,
  facialResult: AnalysisResult,
  skinResult: SkinAnalysisResult
): Promise<string> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Upload photo to storage bucket
  const photoUrl = await uploadPhoto(photoDataUrl, user.id)

  // Insert main analysis
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .insert({
      user_id: user.id,
      photo_url: photoUrl,
      overall_score: facialResult.overallScore,
      symmetry_score: facialResult.symmetry.score,
      proportion_score: facialResult.proportions.score,
      golden_ratio_score: facialResult.goldenRatio.score,
      thirds_score: facialResult.thirds.score,
      fifths_score: facialResult.fifths.score,
      skin_score: skinResult.overallScore,
    })
    .select('id')
    .single()

  if (analysisError) throw analysisError
  const analysisId = analysis.id

  // Insert feature assessments
  const featureRows = facialResult.features.map((f) => ({
    analysis_id: analysisId,
    feature: f.feature,
    score: f.score,
    assessment: f.assessment,
    recommendations: f.recommendations,
  }))

  const { error: featError } = await supabase.from('feature_assessments').insert(featureRows)
  if (featError) throw featError

  // Insert measurements
  const measurementRows = [
    ...facialResult.proportions.details.map((d) => ({
      analysis_id: analysisId,
      measurement_name: d.name,
      value: d.value,
      ideal_value: d.ideal,
      deviation_percent: d.deviation,
      unit: 'ratio',
    })),
    ...facialResult.goldenRatio.ratios.map((r) => ({
      analysis_id: analysisId,
      measurement_name: `Golden: ${r.name}`,
      value: r.value,
      ideal_value: r.ideal,
      deviation_percent: r.deviation,
      unit: 'ratio',
    })),
  ]

  const { error: measError } = await supabase.from('facial_measurements').insert(measurementRows)
  if (measError) throw measError

  // Insert skin assessment
  const { error: skinError } = await supabase.from('skin_assessments').insert({
    analysis_id: analysisId,
    texture_score: skinResult.textureScore,
    uniformity_score: skinResult.uniformityScore,
    clarity_score: skinResult.clarityScore,
    spots_detected: skinResult.spotsDetected,
    wrinkle_score: skinResult.wrinkleScore,
    overall_skin_score: skinResult.overallScore,
    details: skinResult.details,
  })
  if (skinError) throw skinError

  return analysisId
}

export async function getAnalyses(): Promise<Analysis[]> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getAnalysisById(id: string) {
  const [analysisRes, featuresRes, measurementsRes, skinRes] = await Promise.all([
    supabase.from('analyses').select('*').eq('id', id).single(),
    supabase.from('feature_assessments').select('*').eq('analysis_id', id),
    supabase.from('facial_measurements').select('*').eq('analysis_id', id),
    supabase.from('skin_assessments').select('*').eq('analysis_id', id).single(),
  ])

  if (analysisRes.error) throw analysisRes.error

  return {
    analysis: analysisRes.data as Analysis,
    features: (featuresRes.data || []) as FeatureAssessment[],
    measurements: (measurementsRes.data || []) as FacialMeasurement[],
    skin: skinRes.data as SkinAssessment | null,
  }
}

export async function deleteAnalysis(id: string): Promise<void> {
  // Get photo URL to delete from storage
  const { data: analysis } = await supabase
    .from('analyses')
    .select('photo_url')
    .eq('id', id)
    .single()

  if (analysis?.photo_url) {
    // Extract path from public URL: .../object/public/photos/userId/file.jpg -> userId/file.jpg
    const match = analysis.photo_url.match(/\/photos\/(.+)$/)
    if (match) {
      await supabase.storage.from('photos').remove([match[1]])
    }
  }

  const { error } = await supabase.from('analyses').delete().eq('id', id)
  if (error) throw error
}
