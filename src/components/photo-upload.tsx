'use client'

import { useCallback, useRef, useState } from 'react'
import { Camera, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  onImageReady: (imageEl: HTMLImageElement, dataUrl: string) => void
  isAnalyzing: boolean
}

export function PhotoUpload({ onImageReady, isAnalyzing }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [useCamera, setUseCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)
      const img = new Image()
      img.onload = () => onImageReady(img, dataUrl)
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }, [onImageReady])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }, [handleFile])

  const startCamera = async () => {
    setUseCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      alert('No se pudo acceder a la cámara')
      setUseCamera(false)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setPreview(dataUrl)
    stopCamera()

    const img = new Image()
    img.onload = () => onImageReady(img, dataUrl)
    img.src = dataUrl
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setUseCamera(false)
  }

  const clear = () => {
    setPreview(null)
    stopCamera()
  }

  return (
    <Card className="border-dashed border-2">
      <CardContent className="p-6">
        {!preview && !useCamera && (
          <div
            className="flex flex-col items-center gap-4 py-12 cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium">Sube una foto de tu rostro</p>
              <p className="text-sm text-muted-foreground">
                Arrastra y suelta, o haz clic para seleccionar
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                <Upload className="w-4 h-4 mr-2" /> Subir archivo
              </Button>
              <Button variant="outline" onClick={(e) => { e.stopPropagation(); startCamera() }}>
                <Camera className="w-4 h-4 mr-2" /> Usar cámara
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </div>
        )}

        {useCamera && !preview && (
          <div className="flex flex-col items-center gap-4">
            <video ref={videoRef} className="rounded-lg max-h-[400px] w-auto" autoPlay playsInline muted />
            <div className="flex gap-2">
              <Button onClick={capturePhoto}>
                <Camera className="w-4 h-4 mr-2" /> Capturar
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {preview && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img src={preview} alt="Preview" className="rounded-lg max-h-[400px] w-auto" />
              {!isAnalyzing && (
                <button
                  onClick={clear}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Analizando rostro...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
