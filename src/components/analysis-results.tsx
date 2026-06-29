'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScoreGauge } from './score-gauge'
import type { AnalysisResult } from '@/lib/facial-analysis'
import type { SkinAnalysisResult } from '@/lib/skin-analysis'
import { Eye, Ruler, Sparkles, TriangleAlert, Smile } from 'lucide-react'

type Props = {
  facial: AnalysisResult
  skin: SkinAnalysisResult
}

function getScoreLabel(score: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (score >= 8) return { label: 'Excelente', variant: 'default' }
  if (score >= 6) return { label: 'Bueno', variant: 'secondary' }
  if (score >= 4) return { label: 'Promedio', variant: 'outline' }
  return { label: 'Mejorable', variant: 'destructive' }
}

export function AnalysisResults({ facial, skin }: Props) {
  const overall = getScoreLabel(facial.overallScore)

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Puntuación General
            <Badge variant={overall.variant}>{overall.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-6">
            <ScoreGauge score={facial.overallScore} label="General" size="lg" />
            <ScoreGauge score={facial.symmetry.score} label="Simetría" />
            <ScoreGauge score={facial.proportions.score} label="Proporciones" />
            <ScoreGauge score={facial.goldenRatio.score} label="Ratio Áureo" />
            <ScoreGauge score={skin.overallScore} label="Piel" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="features">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="features"><Smile className="w-4 h-4 mr-1" /> Rasgos</TabsTrigger>
          <TabsTrigger value="proportions"><Ruler className="w-4 h-4 mr-1" /> Medidas</TabsTrigger>
          <TabsTrigger value="skin"><Eye className="w-4 h-4 mr-1" /> Piel</TabsTrigger>
          <TabsTrigger value="recommendations"><TriangleAlert className="w-4 h-4 mr-1" /> Consejos</TabsTrigger>
        </TabsList>

        {/* Features Tab */}
        <TabsContent value="features">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {facial.features.map((feat) => {
                const sl = getScoreLabel(feat.score)
                return (
                  <div key={feat.feature} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{feat.feature}</span>
                        <Badge variant={sl.variant} className="text-xs">{sl.label}</Badge>
                      </div>
                      <span className="font-bold">{feat.score}/10</span>
                    </div>
                    <Progress value={feat.score * 10} className="h-2" />
                    <p className="text-sm text-muted-foreground">{feat.assessment}</p>
                    <Separator />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proportions Tab */}
        <TabsContent value="proportions">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Ratios & Proportions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Proporciones Faciales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {facial.proportions.details.map((d) => (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{d.name}</span>
                      <span className="font-mono">{d.value} <span className="text-muted-foreground">(ideal: {d.ideal})</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.max(0, 100 - d.deviation)} className="h-1.5" />
                      <span className="text-xs text-muted-foreground w-12">{d.deviation}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Golden Ratio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ratio Áureo (φ = 1.618)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {facial.goldenRatio.ratios.map((r) => (
                  <div key={r.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{r.name}</span>
                      <span className="font-mono">{r.value} <span className="text-muted-foreground">(φ: {r.ideal})</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.max(0, 100 - r.deviation)} className="h-1.5" />
                      <span className="text-xs text-muted-foreground w-12">{r.deviation}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Thirds */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Regla de los Tercios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <ScoreGauge score={facial.thirds.score} label="Tercios" size="sm" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Superior</span>
                      <span className="font-mono">{facial.thirds.upper}% <span className="text-muted-foreground">(ideal: 33.3%)</span></span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Medio</span>
                      <span className="font-mono">{facial.thirds.middle}% <span className="text-muted-foreground">(ideal: 33.3%)</span></span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Inferior</span>
                      <span className="font-mono">{facial.thirds.lower}% <span className="text-muted-foreground">(ideal: 33.3%)</span></span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fifths */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Regla de los Quintos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <ScoreGauge score={facial.fifths.score} label="Quintos" size="sm" />
                  <div className="flex-1 space-y-1">
                    {facial.fifths.sections.map((s, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>Sección {i + 1}</span>
                        <span className="font-mono">{s}% <span className="text-muted-foreground">(ideal: 20%)</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Skin Tab */}
        <TabsContent value="skin">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap justify-center gap-6 mb-6">
                <ScoreGauge score={skin.textureScore} label="Textura" size="sm" />
                <ScoreGauge score={skin.uniformityScore} label="Uniformidad" size="sm" />
                <ScoreGauge score={skin.clarityScore} label="Claridad" size="sm" />
                <ScoreGauge score={skin.wrinkleScore} label="Suavidad" size="sm" />
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Manchas detectadas</span>
                  <p className="font-bold text-lg">{skin.spotsDetected}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Brillo promedio</span>
                  <p className="font-bold text-lg">{Math.round(skin.details.avgBrightness)}/255</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Varianza de color</span>
                  <p className="font-bold text-lg">{Math.round(skin.details.brightnessVariance)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Densidad de bordes</span>
                  <p className="font-bold text-lg">{skin.details.edgeDensity.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          <div className="space-y-4">
            {facial.features.map((feat) => (
              <Card key={feat.feature}>
                <CardContent className="pt-6 space-y-2">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    {feat.feature}
                    <Badge variant="outline" className="text-xs">{feat.score}/10</Badge>
                  </h4>
                  <ul className="space-y-2 ml-1">
                    {feat.recommendations.map((rec, i) => {
                      const isExercise = rec.startsWith('[EJERCICIO]')
                      const isAction = rec.startsWith('[ACCIÓN]')
                      const isInfo = rec.startsWith('[INFO]')
                      const cleanRec = rec.replace(/^\[(EJERCICIO|ACCIÓN|INFO)\]\s*/, '')
                      return (
                        <li key={i} className="text-sm flex gap-2 items-start">
                          <Badge
                            variant={isExercise ? 'default' : isAction ? 'secondary' : 'outline'}
                            className="text-[10px] shrink-0 mt-0.5"
                          >
                            {isExercise ? 'EJERCICIO' : isAction ? 'ACCIÓN' : 'INFO'}
                          </Badge>
                          <span className="text-muted-foreground">{cleanRec}</span>
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))}

            {/* Science-based skin recommendations */}
            <Card>
              <CardContent className="pt-6 space-y-2">
                <h4 className="font-medium mb-3">Piel</h4>
                <ul className="space-y-2 ml-1">
                  {skin.textureScore < 7 && (
                    <>
                      <li className="text-sm flex gap-2 items-start">
                        <Badge className="text-[10px] shrink-0 mt-0.5">EJERCICIO</Badge>
                        <span className="text-muted-foreground">Exfoliación química con AHA (ácido glicólico 5-10%) 2-3 noches/semana. Superior a exfoliación física — penetra uniformemente sin microdesgarros (Tang & Yang, 2018, J Cosmet Dermatol). Aplicar tras limpieza, esperar 20 min, aplicar hidratante</span>
                      </li>
                      <li className="text-sm flex gap-2 items-start">
                        <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">ACCIÓN</Badge>
                        <span className="text-muted-foreground">Masaje facial con rodillo de jade/gua sha: 5 min/día en dirección ascendente. Alam et al. (2018, JAMA Dermatol) demostró mejora significativa en textura y plenitud facial con ejercicio/masaje facial consistente</span>
                      </li>
                    </>
                  )}
                  {skin.uniformityScore < 7 && (
                    <>
                      <li className="text-sm flex gap-2 items-start">
                        <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">ACCIÓN</Badge>
                        <span className="text-muted-foreground">Sérum de vitamina C (ácido L-ascórbico 15-20%) cada mañana: inhibe tirosinasa → reduce hiperpigmentación. Estudios muestran mejora del 73% en uniformidad tras 12 semanas (Traikovich, 1999; Farris, 2005, Dermatol Surg)</span>
                      </li>
                      <li className="text-sm flex gap-2 items-start">
                        <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">ACCIÓN</Badge>
                        <span className="text-muted-foreground">Niacinamida 5% (vitamina B3): aplicar 2x/día. Reduce transferencia de melanosomas a queratinocitos, mejora tono desigual. Estudios con 5% niacinamida muestran reducción significativa de manchas en 8 semanas (Hakozaki et al., 2002)</span>
                      </li>
                    </>
                  )}
                  {skin.spotsDetected > 5 && (
                    <li className="text-sm flex gap-2 items-start">
                      <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">ACCIÓN</Badge>
                      <span className="text-muted-foreground">SPF 50+ de amplio espectro (UVA+UVB) DIARIO, incluso en interiores y días nublados. Re-aplicar cada 2 horas si hay exposición. El 80% del fotoenvejecimiento es prevenible con protección solar consistente (Hughes et al., 2013, Annals Int Med — estudio de 4.5 años). Buscar filtros: óxido de zinc, Tinosorb S/M</span>
                    </li>
                  )}
                  {skin.wrinkleScore < 7 && (
                    <>
                      <li className="text-sm flex gap-2 items-start">
                        <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">ACCIÓN</Badge>
                        <span className="text-muted-foreground">Retinol/tretinoína nocturno: gold standard anti-aging con más de 700 estudios. Empezar con retinol 0.3%, subir a 0.5%, luego 1% cada 4-6 semanas. Aumenta producción de colágeno tipo I y III (Kang et al., 2005, J Invest Dermatol). Aplicar 20 min post-limpieza sobre piel seca</span>
                      </li>
                      <li className="text-sm flex gap-2 items-start">
                        <Badge className="text-[10px] shrink-0 mt-0.5">EJERCICIO</Badge>
                        <span className="text-muted-foreground">Face yoga anti-arrugas de Alam et al. (JAMA Dermatol 2018): 30 min/día de ejercicios faciales durante 20 semanas redujo la edad percibida en 3 años. Ejercicios clave: inflar mejillas, sonrisa con resistencia, presión frontal isométrica</span>
                      </li>
                    </>
                  )}
                  <li className="text-sm flex gap-2 items-start">
                    <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">ACCIÓN</Badge>
                    <span className="text-muted-foreground">Rutina mínima efectiva basada en evidencia: 1) Limpiador suave pH 5.5, 2) Vitamina C mañana, 3) Hidratante con ceramidas + ácido hialurónico, 4) SPF 50+ mañana, 5) Retinol noche. Esta combinación cubre los 3 pilares del cuidado cutáneo: protección, reparación y prevención (Baumann, 2007)</span>
                  </li>
                  <li className="text-sm flex gap-2 items-start">
                    <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">INFO</Badge>
                    <span className="text-muted-foreground">Factores sistémicos con impacto probado en calidad de piel: sueño 7-9h (Oyetakin-White, 2015), hidratación 2-3L agua/día, reducir azúcar refinada (glicación del colágeno — Danby, 2010), omega-3 (2g/día reduce inflamación cutánea — Pilkington et al., 2011), no fumar (acelera envejecimiento 2-4x — Morita, 2007)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
