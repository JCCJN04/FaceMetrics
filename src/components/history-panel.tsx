'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { getAnalyses, deleteAnalysis } from '@/lib/db'
import type { Analysis } from '@/lib/supabase'
import { History, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

type Props = {
  onSelect: (id: string) => void
  refreshTrigger: number
}

export function HistoryPanel({ onSelect, refreshTrigger }: Props) {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalyses()
  }, [refreshTrigger])

  async function loadAnalyses() {
    setLoading(true)
    try {
      const data = await getAnalyses()
      setAnalyses(data)
    } catch (err) {
      console.error('Error loading analyses:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este análisis?')) return
    await deleteAnalysis(id)
    await loadAnalyses()
  }

  function getTrend(index: number): 'up' | 'down' | 'neutral' {
    if (index >= analyses.length - 1) return 'neutral'
    const current = analyses[index].overall_score ?? 0
    const prev = analyses[index + 1].overall_score ?? 0
    if (current > prev + 0.3) return 'up'
    if (current < prev - 0.3) return 'down'
    return 'neutral'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cargando historial...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4" />
          Historial de Análisis
          <Badge variant="secondary" className="ml-auto">{analyses.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay análisis aún. ¡Sube una foto para comenzar!
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {analyses.map((a, i) => {
                const trend = getTrend(i)
                return (
                  <div key={a.id}>
                    <button
                      className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-3"
                      onClick={() => onSelect(a.id)}
                    >
                      <img
                        src={a.photo_url}
                        alt="Análisis"
                        className="w-12 h-12 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{a.overall_score?.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">/10</span>
                          {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                          {trend === 'neutral' && <Minus className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(a.id, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </button>
                    {i < analyses.length - 1 && <Separator />}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
