import { useState, useRef, useEffect, useCallback } from 'react'
import { processInventoryVoice, DictatedEntry } from '../services/inventory.api'
import DictationReviewModal from './DictationReviewModal'

interface InventoryCategory {
  id: string
  name: string
  units: string[]
  defaultUnit: string
  products: { name: string; id: string }[]
}

interface VoiceDictationModuleProps {
  categories: InventoryCategory[]
  onEntriesConfirmed: (entries: DictatedEntry[]) => void
}

type RecordingState = 'idle' | 'recording' | 'processing'

export default function VoiceDictationModule({ categories, onEntriesConfirmed }: VoiceDictationModuleProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string>('')
  const [entries, setEntries] = useState<DictatedEntry[]>([])
  const [showReviewModal, setShowReviewModal] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const peakLevelRef = useRef<number>(0)
  const silenceCheckRef = useRef<number | null>(null)

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (silenceCheckRef.current) {
      clearInterval(silenceCheckRef.current)
      silenceCheckRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    mediaRecorderRef.current = null
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!analyserRef.current) return
      animationRef.current = requestAnimationFrame(draw)
      analyserRef.current.getByteFrequencyData(dataArray)

      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w === 0 || h === 0) return

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }

      ctx.clearRect(0, 0, w, h)

      const barCount = 60
      const step = Math.floor(bufferLength / barCount)
      const barWidth = w / barCount
      const gap = 1.5

      for (let i = 0; i < barCount; i++) {
        let sum = 0
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j]
        }
        const avg = sum / step
        const barHeight = Math.max(2, (avg / 255) * h * 0.85)

        const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight)
        gradient.addColorStop(0, '#A855F7')
        gradient.addColorStop(1, '#D946EF')
        ctx.fillStyle = gradient
        ctx.fillRect(
          i * barWidth + gap / 2,
          (h - barHeight) / 2,
          barWidth - gap,
          barHeight
        )
      }
    }

    draw()
  }, [])

  const drawIdleWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }

    ctx.clearRect(0, 0, w, h)
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#d1d2db'
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
  }, [])

  useEffect(() => {
    if (state === 'idle') {
      drawIdleWaveform()
    }
  }, [state, drawIdleWaveform])

  const startRecording = async () => {
    setError(null)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.3
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const mType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: mType })
        const recordedPeakLevel = peakLevelRef.current

        cleanup()

        const SILENCE_THRESHOLD = 8
        if (recordedPeakLevel < SILENCE_THRESHOLD) {
          setError('Nu s-a detectat niciun sunet. Vorbește mai tare sau verifică microfonul.')
          setState('idle')
          return
        }

        setState('processing')

        try {
          const result = await processInventoryVoice(blob)
          if (!result.transcript.trim()) {
            setError('Nu s-a detectat vorbire în înregistrare. Încearcă din nou și vorbește clar.')
            setState('idle')
            return
          }
          setTranscript(result.transcript)
          setEntries(result.entries)
          setShowReviewModal(true)
          setState('idle')
        } catch (err: any) {
          console.error('Voice processing failed:', err)
          let errorMsg = 'Procesarea vocii a eșuat. Încearcă din nou.'
          if (err?.response?.data?.error) {
            errorMsg = err.response.data.error
          } else if (err?.code === 'ECONNABORTED') {
            errorMsg = 'Timeout - procesarea a durat prea mult. Încearcă o înregistrare mai scurtă.'
          } else if (!err?.response) {
            errorMsg = 'Nu s-a putut contacta serverul. Verifică conexiunea.'
          } else if (err?.response?.status === 500) {
            errorMsg = 'Eroare server. Verifică dacă OPENAI_API_KEY este configurat.'
          }
          setError(errorMsg)
          setState('idle')
        }
      }

      peakLevelRef.current = 0
      silenceCheckRef.current = window.setInterval(() => {
        if (!analyserRef.current) return
        const buffer = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(buffer)
        let sum = 0
        for (let i = 0; i < buffer.length; i++) sum += buffer[i]
        const avg = sum / buffer.length
        if (avg > peakLevelRef.current) peakLevelRef.current = avg
      }, 100)

      recorder.start(250)
      setState('recording')
      drawWaveform()
    } catch (err: any) {
      console.error('Microphone access error:', err)
      cleanup()
      if (err.name === 'NotAllowedError') {
        setError('Accesul la microfon a fost refuzat. Permite accesul din setările browserului.')
      } else {
        setError('Nu s-a putut accesa microfonul.')
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const handleConfirm = (confirmedEntries: DictatedEntry[]) => {
    onEntriesConfirmed(confirmedEntries)
    setShowReviewModal(false)
    setTranscript('')
    setEntries([])
  }

  const handleCancel = () => {
    setShowReviewModal(false)
    setTranscript('')
    setEntries([])
  }

  return (
    <>
      <div className="card-neumorphic mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-bold text-secondary">DICTARE VOCALĂ</h3>
          {state === 'recording' && (
            <span className="text-xs font-bold text-rose-500 animate-pulse">REC</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Microphone / Stop button */}
          <button
            onClick={state === 'recording' ? stopRecording : startRecording}
            disabled={state === 'processing'}
            className={`flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 ${
              state === 'recording'
                ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30'
                : state === 'processing'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30 hover:scale-110'
            }`}
            style={{ width: '56px', height: '56px' }}
          >
            {state === 'processing' ? (
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : state === 'recording' ? (
              /* Stop icon */
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              /* Microphone icon */
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          {/* Waveform canvas */}
          <canvas
            ref={canvasRef}
            className="flex-1 rounded-xl"
            style={{
              height: '56px',
              minWidth: 0,
              backgroundColor: state === 'recording' ? 'rgba(168, 85, 247, 0.05)' : 'transparent',
              border: state === 'recording' ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid #e5e7eb',
            }}
          />
        </div>

        {state === 'processing' && (
          <p className="text-sm text-secondary/60 font-bold mt-2 text-center">
            Se procesează înregistrarea...
          </p>
        )}

        {state === 'idle' && !error && (
          <p className="text-xs text-secondary/40 mt-2">
            Apasă microfonul și dictează produsele cu cantități. Spune "necesar" pentru coloana NECESAR.
          </p>
        )}

        {error && (
          <p className="text-sm text-rose-500 font-bold mt-2">{error}</p>
        )}
      </div>

      {showReviewModal && (
        <DictationReviewModal
          transcript={transcript}
          entries={entries}
          categories={categories}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  )
}
