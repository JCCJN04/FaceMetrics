'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAnalyses } from '@/lib/db'
import type { Analysis } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp } from 'lucide-react'

type Props = {
  refreshTrigger: number
}

export function ProgressChart({ refreshTrigger }: Props) {
  const [data, setData] = useState<{ date: string; general: number; simetria: number; proporciones: number; piel: number }[]>([])

  useEffect(() => {
    loadData()
  }, [refreshTrigger])

  async function loadData() {
    try {
      const analyses = await getAnalyses()
      const chartData = analyses
        .reverse()
        .map((a) => ({
          date: new Date(a.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          general: a.overall_score ?? 0,
          simetria: a.symmetry_score ?? 0,
          proporciones: a.proportion_score ?? 0,
          piel: a.skin_score ?? 0,
        }))
      setData(chartData)
    } catch (err) {
      console.error('Error loading chart data:', err)
    }
  }

  if (data.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Se necesitan al menos 2 análisis para mostrar tendencias
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-4 h-4" />
          Progreso en el Tiempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis domain={[0, 10]} className="text-xs" />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Line type="monotone" dataKey="general" stroke="#8b5cf6" strokeWidth={2} name="General" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="simetria" stroke="#22c55e" strokeWidth={1.5} name="Simetría" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="proporciones" stroke="#3b82f6" strokeWidth={1.5} name="Proporciones" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="piel" stroke="#f59e0b" strokeWidth={1.5} name="Piel" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
