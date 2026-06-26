import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import axios from 'axios'
import api from '../services/api'
import { useOrder } from '../context/OrderContext'
import { getLocalNetworkUrl, getLocalNetworkIP } from '../utils/network'

const MAX_CAKE_PHOTOS = 3
const MAX_OTHER_PRODUCT_PHOTOS = 2

const buildAbsoluteUrl = (relativeUrl: string): string => {
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl
  }

  let backendURL: string
  if (import.meta.env.DEV) {
    const currentHostname = window.location.hostname
    if (currentHostname && currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
      backendURL = `http://${currentHostname}:5000`
    } else {
      const localIP = getLocalNetworkIP()
      if (localIP) {
        backendURL = `http://${localIP}:5000`
      } else {
        const envURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
        backendURL = envURL.replace(/\/api$/, '').replace(/\/$/, '')
      }
    }
  } else {
    const envURL = import.meta.env.VITE_API_URL || window.location.origin
    backendURL = envURL.replace(/\/api$/, '').replace(/\/$/, '')
  }

  const url = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`
  return `${backendURL}${url}`
}

const normalizeUrlForComparison = (url: string): string => {
  try {
    const urlObj = new URL(url, window.location.origin)
    return urlObj.pathname
  } catch {
    const match = url.match(/\/uploads\/([^/?]+)/)
    return match ? match[1] : url
  }
}

interface PhotoUploaderProps {
  /** Optional heading shown above the controls. Defaults to "📸 Poze model". */
  title?: string
  /** Optional helper text shown below the heading. */
  description?: string
  /** When true, photos are tagged for the "alte produse" PDF section. */
  isOtherProducts?: boolean
}

function PhotoUploader({ title = '📸 Poze', description, isOtherProducts = false }: PhotoUploaderProps) {
  const { order, updateOrder } = useOrder()
  const [isUploading, setIsUploading] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [showPickerModal, setShowPickerModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deletedRef = useRef<Set<string>>(new Set())

  const photoList = isOtherProducts ? order.otherProductPhotos : order.photos
  const photosField = isOtherProducts ? 'otherProductPhotos' as const : 'photos' as const
  const maxPhotos = isOtherProducts ? MAX_OTHER_PRODUCT_PHOTOS : MAX_CAKE_PHOTOS

  const ensureSession = (): string => {
    let sessionId = localStorage.getItem('currentUploadSession')
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem('currentUploadSession', sessionId)
      window.dispatchEvent(new CustomEvent('uploadSessionChanged', { detail: { sessionId } }))
    }
    return sessionId
  }

  const startPolling = (sessionId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/upload/${sessionId}/photos`)
        const sessionPhotos = isOtherProducts
          ? response.data.otherProductPhotos || []
          : response.data.photos || []
        if (sessionPhotos.length === 0) return

        const absoluteUrls = sessionPhotos.map((p: { url: string }) => buildAbsoluteUrl(p.url))
        const deletedPaths = new Set(
          Array.from(deletedRef.current).map(normalizeUrlForComparison),
        )
        const existingPaths = new Set(photoList.map(normalizeUrlForComparison))
        const newOnes = absoluteUrls.filter((url: string) => {
          const norm = normalizeUrlForComparison(url)
          return !deletedPaths.has(norm) && !existingPaths.has(norm)
        })
        if (newOnes.length > 0) {
          const merged = [...photoList, ...newOnes].slice(0, maxPhotos)
          updateOrder({ [photosField]: merged })
        }
      } catch {
        // Session may not exist yet; ignore.
      }
    }, 2000)
  }

  useEffect(() => {
    const sessionId = localStorage.getItem('currentUploadSession')
    if (sessionId) startPolling(sessionId)

    const handleChanged = () => {
      const sid = localStorage.getItem('currentUploadSession')
      if (sid) startPolling(sid)
    }
    const handleCleared = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      deletedRef.current.clear()
    }
    window.addEventListener('uploadSessionChanged', handleChanged)
    window.addEventListener('uploadSessionCleared', handleCleared)
    return () => {
      window.removeEventListener('uploadSessionChanged', handleChanged)
      window.removeEventListener('uploadSessionCleared', handleCleared)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLocalClick = () => {
    ensureSession()
    setShowPickerModal(false)
    fileInputRef.current?.click()
  }

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const remainingSlots = maxPhotos - photoList.length
    if (remainingSlots <= 0) return

    const sessionId = ensureSession()
    setIsUploading(true)
    try {
      const formData = new FormData()
      for (const file of Array.from(files).slice(0, remainingSlots)) {
        formData.append('photos', file, file.name)
      }
      const uploadPath = isOtherProducts
        ? `/upload/${sessionId}?otherProducts=true`
        : `/upload/${sessionId}`
      const response = await api.post(uploadPath, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const responsePhotos: Array<{ url: string }> = response.data?.photos || []
      const urls = responsePhotos.length > 0
        ? responsePhotos.map((p) => buildAbsoluteUrl(p.url))
        : response.data?.url
          ? [buildAbsoluteUrl(response.data.url)]
          : []

      const unique = urls.filter((url) => !photoList.includes(url))
      if (unique.length > 0) {
        updateOrder({ [photosField]: [...photoList, ...unique].slice(0, maxPhotos) })
      }
    } catch (err) {
      console.error('Local upload failed', err)
      if (axios.isAxiosError(err)) {
        const apiMessage = (err.response?.data as { error?: string } | undefined)?.error
        alert(`Eroare la încărcare: ${apiMessage || err.message}`)
      } else {
        alert('Eroare la încărcare')
      }
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const generateQR = async () => {
    setIsGeneratingQR(true)
    try {
      const sessionId = ensureSession()
      let baseUrl = getLocalNetworkUrl()
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = window.location.origin
      }
      baseUrl = baseUrl.replace(/\/$/, '')
      const uploadUrl = isOtherProducts
        ? `${baseUrl}/upload/${sessionId}?type=other-products`
        : `${baseUrl}/upload/${sessionId}`

      const { toDataURL } = await import('qrcode')
      const dataUrl = await toDataURL(uploadUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 300,
        color: { dark: '#000000', light: '#FFFFFF' },
      })
      setQrDataUrl(dataUrl)
      setShowPickerModal(false)
      setShowQR(true)
      startPolling(sessionId)
    } catch (err) {
      console.error('Error generating QR code', err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Eroare la generarea codului QR: ${msg}`)
    } finally {
      setIsGeneratingQR(false)
    }
  }

  const removePhoto = (index: number) => {
    const toDelete = photoList[index]
    if (toDelete) {
      deletedRef.current.add(toDelete)
    }
    updateOrder({ [photosField]: photoList.filter((_, i) => i !== index) })
  }

  const reachedLimit = photoList.length >= maxPhotos

  return (
    <div className="card-neumorphic">
      <h3 className="text-xl font-bold text-secondary mb-3">{title}</h3>
      {description && (
        <p className="text-secondary/70 text-sm mb-4">{description}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <button
        type="button"
        onClick={() => setShowPickerModal(true)}
        disabled={reachedLimit || isUploading}
        className={`w-full px-8 py-6 rounded-2xl font-bold text-xl transition-all duration-300 ${
          reachedLimit
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'btn-active hover:scale-105'
        }`}
      >
        {isUploading ? 'Se încarcă...' : `📸 ÎNCARCĂ POZE (${photoList.length}/${maxPhotos})`}
      </button>

      {showPickerModal && (
        <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-8 animate-float">
            <h3 className="text-2xl font-bold text-gradient mb-6 text-center">📸 Încarcă Poze</h3>
            <p className="text-center text-secondary/70 mb-6">
              Alege metoda de încărcare (max {maxPhotos} poze, {maxPhotos - photoList.length} disponibile)
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={generateQR}
                disabled={isGeneratingQR}
                className="btn-active px-8 py-6 rounded-2xl font-bold text-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGeneratingQR ? (
                  <>
                    <span className="animate-pulse">⏳</span>
                    Se generează...
                  </>
                ) : (
                  <>
                    📱 CLIENT
                    <span className="text-sm font-normal opacity-80">(Scanează QR)</span>
                  </>
                )}
              </button>
              <button
                onClick={handleLocalClick}
                className="btn-neumorphic px-8 py-6 rounded-2xl font-bold text-xl text-secondary hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
              >
                💻 LOCAL
                <span className="text-sm font-normal opacity-80">(Din device)</span>
              </button>
            </div>
            <button
              onClick={() => setShowPickerModal(false)}
              className="mt-6 w-full btn-neumorphic py-4 rounded-2xl font-bold text-secondary hover:scale-102 transition-all"
            >
              ✕ Anulează
            </button>
          </div>
        </div>
      )}

      {showQR && (
        <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-lg w-full p-8 animate-float">
            <h3 className="text-2xl font-bold text-gradient mb-6 text-center">📱 Scanați codul QR</h3>
            <p className="text-center text-secondary/70 mb-6">
              Folosiți camera telefonului pentru a scana codul și a încărca imaginea
            </p>
            <div className="flex justify-center mb-6 bg-white p-6 rounded-3xl shadow-neumorphic">
              <img src={qrDataUrl} alt="QR Code" className="w-72 h-72" />
            </div>
            <button
              onClick={() => setShowQR(false)}
              className="btn-neumorphic w-full py-4 rounded-2xl font-bold text-secondary hover:scale-102 transition-all"
            >
              Închide
            </button>
          </div>
        </div>
      )}

      {photoList.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-secondary/60 mb-3">Poze încărcate ({photoList.length})</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photoList.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="shadow-neumorphic rounded-2xl overflow-hidden">
                  <img
                    src={buildAbsoluteUrl(photo)}
                    alt={`Poza ${index + 1}`}
                    className="w-full h-40 object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-all duration-300 opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoUploader
