'use client'

import { useEffect, useState } from 'react'
import { getAnalysisById } from '@/lib/db'
import type { Analysis, FeatureAssessment, FacialMeasurement, SkinAssessment } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ScoreGauge } from './score-gauge'
import { ArrowLeft } from 'lucide-react'

type Props = {
  analysisId: string
  onBack: () => void
}

export function DetailView({ analysisId, onBack }: Props) {
  const [data, setData] = useState<{
    analysis: Analysis
    features: FeatureAssessment[]
    measurements: FacialMeasurement[]
    skin: SkinAssessment | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDetail()
  }, [analysisId])

  async function loadDetail() {
    setLoading(true)
    try {
      const result = await getAnalysisById(analysisId)
      setData(result)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return <div className="text-center py-8 text-muted-foreground">Cargando...</div>
  }

  const { analysis, features, measurements, skin } = data

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Button>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <img src={analysis.photo_url} alt="Foto" className="rounded-lg w-full" />
          <p className="text-sm text-muted-foreground text-center">
            {new Date(analysis.created_at).toLocaleDateString('es-ES', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        <div className="space-y-4">
          {/* Scores overview */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap justify-center gap-4">
                <ScoreGauge score={analysis.overall_score ?? 0} label="General" size="lg" />
                <ScoreGauge score={analysis.symmetry_score ?? 0} label="Simetría" />
                <ScoreGauge score={analysis.proportion_score ?? 0} label="Proporciones" />
                <ScoreGauge score={analysis.golden_ratio_score ?? 0} label="Ratio Áureo" />
                <ScoreGauge score={analysis.thirds_score ?? 0} label="Tercios" size="sm" />
                <ScoreGauge score={analysis.fifths_score ?? 0} label="Quintos" size="sm" />
                {skin && <ScoreGauge score={skin.overall_skin_score ?? 0} label="Piel" />}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader><CardTitle className="text-base">Rasgos Faciales</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {features.map((f) => (
                <div key={f.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{f.feature}</span>
                    <span className="font-bold">{f.score}/10</span>
                  </div>
                  <Progress value={(f.score ?? 0) * 10} className="h-2" />
                  <p className="text-sm text-muted-foreground">{f.assessment}</p>
                  {f.recommendations && f.recommendations.length > 0 && (
                    <ul className="text-xs text-muted-foreground ml-3">
                      {f.recommendations.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  )}
                  <Separator />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Measurements */}
          {measurements.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Mediciones</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {measurements.map((m) => (
                    <div key={m.id} className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="truncate">{m.measurement_name}</span>
                      <span className="font-mono ml-2">
                        {m.value}
                        {m.ideal_value && (
                          <span className="text-muted-foreground"> / {m.ideal_value}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skin */}
          {skin && (
            <Card>
              <CardHeader><CardTitle className="text-base">Análisis de Piel</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap justify-center gap-4">
                  <ScoreGauge score={skin.texture_score ?? 0} label="Textura" size="sm" />
                  <ScoreGauge score={skin.uniformity_score ?? 0} label="Uniformidad" size="sm" />
                  <ScoreGauge score={skin.clarity_score ?? 0} label="Claridad" size="sm" />
                  <ScoreGauge score={skin.wrinkle_score ?? 0} label="Suavidad" size="sm" />
                </div>
                <Separator className="my-3" />
                <p className="text-sm text-center text-muted-foreground">
                  Manchas detectadas: <strong>{skin.spots_detected}</strong>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
