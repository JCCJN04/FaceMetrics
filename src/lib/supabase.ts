import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Analysis = {
  id: string
  created_at: string
  photo_url: string
  overall_score: number | null
  symmetry_score: number | null
  proportion_score: number | null
  golden_ratio_score: number | null
  thirds_score: number | null
  fifths_score: number | null
  skin_score: number | null
  notes: string | null
}

export type FeatureAssessment = {
  id: string
  analysis_id: string
  feature: string
  score: number | null
  assessment: string | null
  recommendations: string[] | null
}

export type FacialMeasurement = {
  id: string
  analysis_id: string
  measurement_name: string
  value: number | null
  ideal_value: number | null
  deviation_percent: number | null
  unit: string
}

export type SkinAssessment = {
  id: string
  analysis_id: string
  texture_score: number | null
  uniformity_score: number | null
  clarity_score: number | null
  spots_detected: number
  wrinkle_score: number | null
  overall_skin_score: number | null
  details: Record<string, unknown> | null
}
