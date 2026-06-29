'use client'

import { useState, useCallback, useEffect } from 'react'
import { PhotoUpload } from '@/components/photo-upload'
import { AnalysisResults } from '@/components/analysis-results'
import { HistoryPanel } from '@/components/history-panel'
import { ProgressChart } from '@/components/progress-chart'
import { DetailView } from '@/components/detail-view'
import { AuthForm } from '@/components/auth-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { analyzeFace, type AnalysisResult } from '@/lib/facial-analysis'
import { analyzeSkin, type SkinAnalysisResult } from '@/lib/skin-analysis'
import { saveAnalysis } from '@/lib/db'
import { getSession, signOut, onAuthStateChange } from '@/lib/auth'
import { Scan, History, TrendingUp, LogOut } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [facialResult, setFacialResult] = useState<AnalysisResult | null>(null)
  const [skinResult, setSkinResult] = useState<SkinAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null)

  useEffect(() => {
    getSession().then((s) => {
      setSession(s)
      setAuthLoading(false)
    })

    const { data: { subscription } } = onAuthStateChange((s) => {
      setSession(s as Session | null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleImageReady = useCallback(async (imageEl: HTMLImageElement, dataUrl: string) => {
    setIsAnalyzing(true)
    setError(null)
    setFacialResult(null)
    setSkinResult(null)

    try {
      const facial = await analyzeFace(imageEl)
      setFacialResult(facial)

      const skin = analyzeSkin(imageEl, facial.landmarks)
      setSkinResult(skin)

      await saveAnalysis(dataUrl, facial, skin)
      setRefreshTrigger((prev) => prev + 1)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Error durante el análisis')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setSession(null)
    setFacialResult(null)
    setSkinResult(null)
    setSelectedAnalysis(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <AuthForm onSuccess={() => getSession().then(setSession)} />
  }

  if (selectedAnalysis) {
    return (
      <main className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">FaceMetrics</h1>
              <p className="text-sm text-muted-foreground">Análisis Facial con Inteligencia Artificial</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">{session.user.email}</span>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-6">
          <DetailView analysisId={selectedAnalysis} onBack={() => setSelectedAnalysis(null)} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">FaceMetrics</h1>
            <p className="text-sm text-muted-foreground">Análisis Facial con Inteligencia Artificial</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{session.user.email}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="analyze" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="analyze"><Scan className="w-4 h-4 mr-1" /> Analizar</TabsTrigger>
            <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> Historial</TabsTrigger>
            <TabsTrigger value="progress"><TrendingUp className="w-4 h-4 mr-1" /> Progreso</TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <PhotoUpload onImageReady={handleImageReady} isAnalyzing={isAnalyzing} />
            </div>

            {error && (
              <div className="max-w-2xl mx-auto p-4 bg-destructive/10 text-destructive rounded-lg text-center">
                {error}
              </div>
            )}

            {facialResult && skinResult && (
              <div className="max-w-4xl mx-auto">
                <AnalysisResults facial={facialResult} skin={skinResult} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="max-w-2xl mx-auto">
              <HistoryPanel onSelect={setSelectedAnalysis} refreshTrigger={refreshTrigger} />
            </div>
          </TabsContent>

          <TabsContent value="progress">
            <div className="max-w-4xl mx-auto">
              <ProgressChart refreshTrigger={refreshTrigger} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
