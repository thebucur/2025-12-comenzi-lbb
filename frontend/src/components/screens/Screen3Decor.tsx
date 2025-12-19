import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { useOrder } from '../../context/OrderContext'
import { Coating } from '../../types/order.types'
import { useInstallationConfig } from '../../hooks/useInstallationConfig'
import QRCode from 'qrcode'
import { ColorOption, normalizeColorOptions, resolveColorValue } from '../../constants/colors'
import { getLocalNetworkUrl, getLocalNetworkIP } from '../../utils/network'
import api from '../../services/api'
import axios from 'axios'
import { getAbsoluteImageUrl } from '../../utils/imageUrl'

// Default values (fallback if config not available)
const defaultCoatings: Coating[] = ['GLAZURĂ', 'FRIȘCĂ', 'CREMĂ', 'NAKED', 'DOAR CAPAC']
const defaultDecorTypes = ['SIMPLU', 'MEDIU', 'COMPLEX', 'PREMIUM']

// Type for upload modal
type UploadModalType = 'photos' | 'foaieDeZahar' | null

function Screen3Decor() {
  const { order, updateOrder } = useOrder()
  const config = useInstallationConfig()
  const [showQRCode, setShowQRCode] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [isRecording, setIsRecording] = useState<string | null>(null)
  const [localIP, setLocalIP] = useState<string>(getLocalNetworkIP() || '')
  const [showIPInput, setShowIPInput] = useState(false)
  const [isLocalUploading, setIsLocalUploading] = useState(false)
  const [isFoaieDeZaharUploading, setIsFoaieDeZaharUploading] = useState(false)
  const [uploadModalType, setUploadModalType] = useState<UploadModalType>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const currentTextareaRef = useRef<'decorDetails' | 'observations' | null>(null)
  const photoPollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const foaieDeZaharInputRef = useRef<HTMLInputElement | null>(null)
  // Track deleted photos to prevent polling from re-adding them
  const deletedPhotosRef = useRef<Set<string>>(new Set())
  // Track failed image URLs to prevent re-adding them
  const failedImageUrlsRef = useRef<Set<string>>(new Set())
  // Track failed images for UI display
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  // Use centralized function
  const getAbsoluteUrl = getAbsoluteImageUrl

  // Poll for photos and foaie de zahar by session ID
  const startPhotoPolling = (sessionId: string) => {
    // Clear any existing interval
    if (photoPollIntervalRef.current) {
      clearInterval(photoPollIntervalRef.current)
    }

    // Poll every 2 seconds for new photos and foaie de zahar
    photoPollIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/upload/${sessionId}/photos`)
        const photos = response.data.photos || []
        const foaieDeZahar = response.data.foaieDeZahar || null
        
        // Handle regular photos
        if (photos.length > 0) {
          // Convert relative URLs to absolute URLs
          const absolutePhotoUrls = photos.map((photo: { url: string }) => getAbsoluteUrl(photo.url))
          
          // Filter out deleted photos and failed images
          const filteredPhotoUrls = absolutePhotoUrls.filter((url: string) => 
            !deletedPhotosRef.current.has(url) && !failedImageUrlsRef.current.has(url)
          )
          
          // Update order with new photos (merge with existing, but respect deleted photos and failed images)
          const existingPhotos = order.photos || []
          const newPhotos = filteredPhotoUrls.filter((url: string) => !existingPhotos.includes(url))
          
          if (newPhotos.length > 0) {
            console.log(`📸 Found ${newPhotos.length} new photos for session ${sessionId}`)
            updateOrder({
              photos: [...existingPhotos, ...newPhotos]
            })
          } else {
            // Sync with backend - remove photos that were deleted locally, failed to load, or don't exist in backend
            const photosToKeep = existingPhotos.filter((url: string) => 
              filteredPhotoUrls.includes(url) || deletedPhotosRef.current.has(url) || failedImageUrlsRef.current.has(url)
            )
            if (photosToKeep.length !== existingPhotos.length) {
              console.log(`Removing ${existingPhotos.length - photosToKeep.length} photos that are no longer valid`)
              updateOrder({ photos: photosToKeep })
            }
          }
        }
        
        // Handle foaie de zahar
        if (foaieDeZahar && foaieDeZahar.url) {
          const absoluteFoaieDeZaharUrl = getAbsoluteUrl(foaieDeZahar.url)
          
          console.log(`📄 Polling found foaie de zahar for session ${sessionId}:`, {
            relativeUrl: foaieDeZahar.url,
            absoluteUrl: absoluteFoaieDeZaharUrl,
            currentFoaieDeZahar: order.foaieDeZaharPhoto,
            isDifferent: order.foaieDeZaharPhoto !== absoluteFoaieDeZaharUrl,
          })
          
          // Only update if it's different from current
          if (order.foaieDeZaharPhoto !== absoluteFoaieDeZaharUrl) {
            console.log(`📄 Updating foaie de zahar in order context`)
            updateOrder({
              foaieDeZaharPhoto: absoluteFoaieDeZaharUrl
            })
          }
        } else {
          // Debug: log when foaie de zahar is not found
          console.log(`📄 No foaie de zahar found in polling response for session ${sessionId}`, {
            responseData: response.data,
            foaieDeZahar: response.data?.foaieDeZahar,
          })
        }
      } catch (error) {
        // Silently fail - session might not exist yet or no photos uploaded
        console.debug('No photos found or error fetching:', error)
      }
    }, 2000)
  }

  // Start polling automatically if sessionId exists in localStorage
  useEffect(() => {
    const checkAndStartPolling = () => {
      const existingSessionId = localStorage.getItem('currentUploadSession')
      if (existingSessionId) {
        console.log(`Starting/restarting polling for session: ${existingSessionId}`)
        startPhotoPolling(existingSessionId)
      }
    }
    
    // Start polling on mount if session exists
    checkAndStartPolling()
    
    // Listen for storage changes (when PhotoUpload syncs sessionId in another tab)
    const handleStorageChange = () => {
      checkAndStartPolling()
    }
    
    // Listen for custom event (when PhotoUpload syncs sessionId in same tab)
    const handleUploadSessionChanged = (event: CustomEvent) => {
      console.log(`Upload session changed event received: ${event.detail.sessionId}`)
      checkAndStartPolling()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('uploadSessionChanged', handleUploadSessionChanged as EventListener)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('uploadSessionChanged', handleUploadSessionChanged as EventListener)
    }
  }, []) // Run once on mount

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (photoPollIntervalRef.current) {
        clearInterval(photoPollIntervalRef.current)
      }
    }
  }, [])

  // Use config values or fallback to defaults
  const coatings = (config?.decor?.coatings as Coating[]) || defaultCoatings
  const colors = normalizeColorOptions(config?.decor?.colors as Array<string | ColorOption>)
  const decorTypes = config?.decor?.decorTypes || defaultDecorTypes

  const isColorSelected = (color: ColorOption) => {
    return order.colors.some(
      (selected) =>
        selected.toLowerCase() === color.name.toLowerCase() ||
        selected.toLowerCase() === color.value.toLowerCase()
    )
  }

  const handleColorClick = (color: ColorOption) => {
    const colorKey = color.name || color.value

    if (isColorSelected(color)) {
      updateOrder({
        colors: order.colors.filter(
          (selected) =>
            selected.toLowerCase() !== colorKey.toLowerCase() &&
            selected.toLowerCase() !== color.value.toLowerCase()
        ),
      })
    } else if (order.colors.length < 2) {
      updateOrder({ colors: [...order.colors, colorKey] })
    }
  }

  const generateQRCode = async (type: 'photos' | 'foaieDeZahar' = 'photos') => {
    try {
      // Use the same session ID for both photos and foaie de zahar
      // This ensures all uploads are linked to the same session
      let sessionId = localStorage.getItem('currentUploadSession')
      
      if (!sessionId) {
        // Generate a new session ID if none exists
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('currentUploadSession', sessionId)
        console.log(`Created new upload session: ${sessionId}`)
      } else {
        console.log(`Using existing upload session: ${sessionId}`)
      }
      
      // Use local network URL instead of localhost for mobile access
      let baseUrl = getLocalNetworkUrl();
      
      // Ensure baseUrl is a complete, valid URL
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        // If baseUrl doesn't start with http/https, use window.location.origin
        baseUrl = window.location.origin
      }
      
      // Remove trailing slash if present
      baseUrl = baseUrl.replace(/\/$/, '')
      
      // Use query parameter to indicate upload type (frontend route is /upload/:sessionId)
      const uploadUrl = type === 'foaieDeZahar' 
        ? `${baseUrl}/upload/${sessionId}?type=foaie-de-zahar`
        : `${baseUrl}/upload/${sessionId}`;
      
      console.log(`Generating QR code for ${type}:`, {
        sessionId,
        uploadUrl,
        baseUrl,
        isValidUrl: uploadUrl.startsWith('http://') || uploadUrl.startsWith('https://'),
      })
      
      // Validate URL before generating QR code
      try {
        new URL(uploadUrl) // This will throw if URL is invalid
      } catch (error) {
        console.error('Invalid URL generated for QR code:', uploadUrl, error)
        alert('Eroare: URL invalid pentru QR code. Verifică configurația.')
        return
      }
      
      // Check if we need to warn about localhost
      const localIP = getLocalNetworkIP();
      if (!localIP && import.meta.env.DEV) {
        console.warn('⚠️ Mobile QR scanning may not work!');
        console.warn('To enable mobile access, set your local IP address:');
        console.warn('In browser console, run: localStorage.setItem("localNetworkIP", "YOUR_IP_HERE")');
        console.warn('Example: localStorage.setItem("localNetworkIP", "192.168.1.100")');
        console.warn('Find your IP: Windows: ipconfig | findstr IPv4');
      }
      
      // Generate QR code with error correction level for better scanning
      const dataUrl = await QRCode.toDataURL(uploadUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      console.log(`QR code generated successfully for URL: ${uploadUrl}`)
      console.log(`QR code data URL length: ${dataUrl.length} characters`)
      
      setQrCodeDataUrl(dataUrl);
      setShowQRCode(true);
      setUploadModalType(null); // Close the upload type modal
      
      // Start polling for new photos and foaie de zahar
      // Make sure polling is started with the correct session ID
      console.log(`Starting photo polling for session: ${sessionId}`)
      startPhotoPolling(sessionId)
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const ensureUploadSession = () => {
    let sessionId = localStorage.getItem('currentUploadSession')
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('currentUploadSession', sessionId)
      startPhotoPolling(sessionId)
    }
    return sessionId
  }

  const handleLocalUploadClick = () => {
    ensureUploadSession()
    setUploadModalType(null) // Close the modal
    fileInputRef.current?.click()
  }

  const handleLocalFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const sessionId = ensureUploadSession()
    setIsLocalUploading(true)

    try {
      const formData = new FormData()
      for (const file of Array.from(files)) {
        formData.append('photos', file, file.name)
      }

      const response = await api.post(`/upload/${sessionId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const responsePhotos: Array<{ url: string }> = response.data?.photos || []
      const urlsFromResponse = responsePhotos.length > 0
        ? responsePhotos.map((p) => getAbsoluteUrl(p.url))
        : response.data?.url
          ? [getAbsoluteUrl(response.data.url)]
          : []

      const unique = urlsFromResponse.filter((url) => !order.photos.includes(url))
      if (unique.length > 0) {
        updateOrder({ photos: [...order.photos, ...unique] })
      }
    } finally {
      setIsLocalUploading(false)
      event.target.value = ''
    }
  }

  const handleFoaieDeZaharClick = () => {
    ensureUploadSession()
    setUploadModalType(null) // Close the modal
    foaieDeZaharInputRef.current?.click()
  }

  const handleFoaieDeZaharSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Only allow single file
    const file = files[0]
    const sessionId = ensureUploadSession()
    setIsFoaieDeZaharUploading(true)

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name}: Nu este o imagine validă`)
        return
      }

      const formData = new FormData()
      formData.append('photo', file, file.name)

      const response = await api.post(`/upload/${sessionId}/foaie-de-zahar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (response.data?.url) {
        const absoluteUrl = getAbsoluteUrl(response.data.url)
        updateOrder({ foaieDeZaharPhoto: absoluteUrl })
        alert('Foaia de zahar a fost încărcată cu succes!')
      } else {
        alert('Eroare: Nu s-a primit URL pentru fotografie')
      }
    } catch (error: unknown) {
      console.error('Error uploading foaie de zahar:', error)
      if (axios.isAxiosError(error)) {
        const apiMessage = (error.response?.data as { error?: string } | undefined)?.error
        const errorMessage = apiMessage || error.message || 'Eroare necunoscută'
        alert(`Eroare la încărcarea foii de zahar: ${errorMessage}`)
      } else {
        alert('Eroare la încărcarea foii de zahar: Eroare necunoscută')
      }
    } finally {
      setIsFoaieDeZaharUploading(false)
      event.target.value = ''
    }
  }

  const startVoiceInput = (type: 'decorDetails' | 'observations') => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Recunoașterea vocală nu este disponibilă în acest browser')
      return
    }

    const speechWindow = window as Window & {
      webkitSpeechRecognition?: typeof SpeechRecognition
      SpeechRecognition?: typeof SpeechRecognition
    }
    const SpeechRecognitionCtor = speechWindow.webkitSpeechRecognition || speechWindow.SpeechRecognition
    if (!SpeechRecognitionCtor) {
      alert('Recunoașterea vocală nu este disponibilă în acest browser')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'ro-RO'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsRecording(type)
      currentTextareaRef.current = type
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      if (type === 'decorDetails') {
        updateOrder({ decorDetails: order.decorDetails + ' ' + transcript })
      } else {
        updateOrder({ observations: order.observations + ' ' + transcript })
      }
      setIsRecording(null)
      currentTextareaRef.current = null
    }

    recognition.onerror = () => {
      setIsRecording(null)
      currentTextareaRef.current = null
    }

    recognition.onend = () => {
      setIsRecording(null)
      currentTextareaRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(null)
      currentTextareaRef.current = null
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h2 className="text-4xl font-bold text-center text-gradient mb-12">Decor</h2>

      {/* Coating Grid */}
      <div className="card-neumorphic">
        <h3 className="text-xl font-bold text-secondary mb-6">✨ Îmbrăcat în</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {coatings.map((coating) => (
            <button
              key={coating}
              onClick={() => updateOrder({ coating })}
              className={`p-6 rounded-2xl font-bold transition-all duration-300 ${
                order.coating === coating
                  ? 'btn-active scale-105'
                  : 'btn-neumorphic hover:scale-102'
              }`}
            >
              {coating}
            </button>
          ))}
        </div>
      </div>

      {/* Color Grid (max 2 selections) */}
      <div className="card-neumorphic">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-secondary">🎨 Culoare</h3>
          {order.colors.length > 0 && (
            <span className="text-sm font-semibold text-accent-purple">
              {order.colors.length}/2 selectate
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {colors.map((color) => {
            const isSelected = isColorSelected(color)
            const isDisabled = !isSelected && order.colors.length >= 2
            return (
              <button
                key={`${color.name}-${color.value}`}
                onClick={() => handleColorClick(color)}
                disabled={isDisabled}
                className={`w-full p-5 rounded-2xl transition-all duration-300 text-left ${
                  isSelected
                    ? 'btn-active scale-105 shadow-glow-purple'
                    : isDisabled
                    ? 'opacity-40 cursor-not-allowed shadow-neumorphic-inset'
                    : 'btn-neumorphic hover:scale-105'
                }`}
                title={color.name}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-secondary">{color.name}</span>
                  <span
                    className="w-5 h-5 rounded-full border border-secondary/20 shadow-sm"
                    style={{ backgroundColor: resolveColorValue(color.value, colors) }}
                  />
                </div>
                {isSelected && (
                  <p className="mt-2 text-xs font-semibold text-secondary/70">Selectat ({order.colors.length}/2)</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Decor Type Toggle */}
      <div className="card-neumorphic">
        <h3 className="text-xl font-bold text-secondary mb-6">💎 Tip decor</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {decorTypes.map((type) => (
            <button
              key={type}
              onClick={() => updateOrder({ decorType: type })}
              className={`p-8 rounded-3xl transition-all duration-300 ${
                order.decorType === type
                  ? 'btn-active scale-105'
                  : 'btn-neumorphic hover:scale-102'
              }`}
            >
              <div className="text-2xl font-bold">{type}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Text Areas with Voice Input */}
      <div className="space-y-6">
        <div className="card-neumorphic">
          <label className="block mb-4 text-xl font-bold text-secondary">📝 Detalii decor</label>
          <div className="relative">
            <textarea
              value={order.decorDetails}
              onChange={(e) => updateOrder({ decorDetails: e.target.value })}
              className="input-neumorphic w-full text-secondary placeholder:text-secondary/40 min-h-[150px] pr-16"
              rows={6}
              placeholder="Descrieți decorațiunile dorite (text, figurine, flori, etc.)..."
            />
            <button
              onClick={() => isRecording === 'decorDetails' ? stopVoiceInput() : startVoiceInput('decorDetails')}
              className={`absolute right-4 top-4 p-4 rounded-2xl transition-all duration-300 ${
                isRecording === 'decorDetails'
                  ? 'bg-red-500 text-white shadow-glow-purple animate-pulse'
                  : 'btn-neumorphic hover:scale-110'
              }`}
              title="Input vocal"
            >
              🎤
            </button>
          </div>
        </div>

        <div className="card-neumorphic">
          <label className="block mb-4 text-xl font-bold text-secondary">💬 Observații</label>
          <div className="relative">
            <textarea
              value={order.observations}
              onChange={(e) => updateOrder({ observations: e.target.value })}
              className="input-neumorphic w-full text-secondary placeholder:text-secondary/40 min-h-[150px] pr-16"
              rows={6}
              placeholder="Notați orice alte observații importante..."
            />
            <button
              onClick={() => isRecording === 'observations' ? stopVoiceInput() : startVoiceInput('observations')}
              className={`absolute right-4 top-4 p-4 rounded-2xl transition-all duration-300 ${
                isRecording === 'observations'
                  ? 'bg-red-500 text-white shadow-glow-purple animate-pulse'
                  : 'btn-neumorphic hover:scale-110'
              }`}
              title="Input vocal"
            >
              🎤
            </button>
          </div>
        </div>
      </div>

      {/* Photo Upload Section */}
      <div className="card-neumorphic">
        <h3 className="text-xl font-bold text-secondary mb-6">📸 Poze model</h3>
        
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleLocalFilesSelected}
        />
        <input
          ref={foaieDeZaharInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFoaieDeZaharSelected}
        />
        
        {/* Two main buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => setUploadModalType('photos')}
            disabled={order.photos.length >= 3 || isLocalUploading}
            className={`flex-1 px-8 py-6 rounded-2xl font-bold text-xl hover:scale-105 transition-all duration-300 ${
              order.photos.length >= 3 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'btn-active'
            }`}
          >
            {isLocalUploading ? 'Se încarcă...' : `📸 ÎNCARCĂ POZE (${order.photos.length}/3)`}
          </button>
          <button
            onClick={() => setUploadModalType('foaieDeZahar')}
            disabled={!!order.foaieDeZaharPhoto || isFoaieDeZaharUploading}
            className={`flex-1 px-8 py-6 rounded-2xl font-bold text-xl hover:scale-105 transition-all duration-300 ${
              order.foaieDeZaharPhoto 
                ? 'bg-green-100 text-green-700 border-2 border-green-500' 
                : 'bg-yellow-500/20 border-2 border-yellow-500/50 text-secondary'
            }`}
          >
            {isFoaieDeZaharUploading ? 'Se încarcă...' : order.foaieDeZaharPhoto ? '✅ FOAIE DE ZAHAR ÎNCĂRCATĂ' : '📄 ÎNCARCĂ FOAIE DE ZAHAR'}
          </button>
        </div>

        {/* Upload Type Modal */}
        {uploadModalType && (
          <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-md w-full p-8 animate-float">
              <h3 className="text-2xl font-bold text-gradient mb-6 text-center">
                {uploadModalType === 'photos' ? '📸 Încarcă Poze' : '📄 Încarcă Foaie de Zahar'}
              </h3>
              <p className="text-center text-secondary/70 mb-6">
                {uploadModalType === 'photos' 
                  ? `Alege metoda de încărcare (max 3 poze, ${3 - order.photos.length} disponibile)`
                  : 'Alege metoda de încărcare (1 imagine, neccomprimată)'
                }
              </p>
              
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => generateQRCode(uploadModalType)}
                  className="btn-active px-8 py-6 rounded-2xl font-bold text-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  📱 CLIENT
                  <span className="text-sm font-normal opacity-80">(Scanează QR)</span>
                </button>
                <button
                  onClick={uploadModalType === 'photos' ? handleLocalUploadClick : handleFoaieDeZaharClick}
                  className="btn-neumorphic px-8 py-6 rounded-2xl font-bold text-xl text-secondary hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  💻 LOCAL
                  <span className="text-sm font-normal opacity-80">(Din device)</span>
                </button>
              </div>
              
              <button
                onClick={() => setUploadModalType(null)}
                className="mt-6 w-full btn-neumorphic py-4 rounded-2xl font-bold text-secondary hover:scale-102 transition-all"
              >
                ✕ Anulează
              </button>
            </div>
          </div>
        )}

        {order.foaieDeZaharPhoto && (() => {
          const foaieDeZaharUrl = order.foaieDeZaharPhoto
          return (
          <div className="mt-4 p-4 bg-yellow-500/20 border-2 border-yellow-500/50 rounded-2xl">
            <p className="text-sm font-bold text-secondary mb-2">✅ Foaie de zahar încărcată</p>
            <div className="relative inline-block">
              <img
                src={getAbsoluteUrl(foaieDeZaharUrl)}
                alt="Foaie de zahar"
                className="w-32 h-32 object-cover rounded-lg border-2 border-yellow-500/50"
                onError={(e) => {
                  console.error('Error loading foaie de zahar image:', foaieDeZaharUrl, 'Absolute URL:', getAbsoluteUrl(foaieDeZaharUrl))
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
              <button
                onClick={() => updateOrder({ foaieDeZaharPhoto: null })}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-all"
              >
                ✕
              </button>
            </div>
          </div>
          )
        })()}

        {showQRCode && (
          <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-lg w-full p-8 animate-float">
              <h3 className="text-2xl font-bold text-gradient mb-6 text-center">📱 Scanați codul QR</h3>
              <p className="text-center text-secondary/70 mb-6">
                Folosiți camera telefonului pentru a scana codul și a încărca imaginea
              </p>
              
              {!getLocalNetworkIP() && import.meta.env.DEV && (
                <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-400 text-sm mb-2">
                    ⚠️ Pentru acces de pe telefon, setați adresa IP locală:
                  </p>
                  {showIPInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={localIP}
                        onChange={(e) => setLocalIP(e.target.value)}
                        placeholder="ex: 192.168.1.100"
                        className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600"
                      />
                      <button
                        onClick={() => {
                          if (localIP) {
                            localStorage.setItem('localNetworkIP', localIP)
                            setShowIPInput(false)
                            // Regenerate QR code with new IP
                            generateQRCode('photos')
                          }
                        }}
                        className="px-4 py-2 bg-neon-pink rounded-lg font-semibold hover:bg-neon-pink/90"
                      >
                        Salvează
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowIPInput(true)}
                      className="text-yellow-400 text-sm underline"
                    >
                      Setează IP local
                    </button>
                  )}
                  <p className="text-yellow-400/70 text-xs mt-2">
                    Găsiți IP-ul: Windows PowerShell → ipconfig | findstr IPv4
                  </p>
                </div>
              )}
              
              <div className="flex justify-center mb-6 bg-white p-6 rounded-3xl shadow-neumorphic">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-72 h-72" />
              </div>
              <button
                onClick={() => setShowQRCode(false)}
                className="btn-neumorphic w-full py-4 rounded-2xl font-bold text-secondary hover:scale-102 transition-all"
              >
                Închide
              </button>
            </div>
          </div>
        )}

        {order.photos.length > 0 && (
          <div className="mt-8">
            <h4 className="text-lg font-bold text-secondary mb-4">Poze încărcate ({order.photos.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {order.photos.map((photo, index) => {
                // Ensure photo URL is absolute (handle both absolute and relative URLs from old orders)
                const photoUrl = getAbsoluteUrl(photo)
                const isFailed = failedImages.has(photo)
                
                return (
                <div key={`${photo}-${index}`} className="relative group">
                  <div className="shadow-neumorphic rounded-2xl overflow-hidden bg-gray-800 min-h-[160px] flex items-center justify-center relative">
                    {!isFailed ? (
                      <img
                        src={photoUrl}
                        alt={`Poza ${index + 1}`}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          console.error('❌ Error loading image:', photo, 'Absolute URL:', photoUrl)
                          // Mark this URL as failed to prevent polling from re-adding it
                          failedImageUrlsRef.current.add(photo)
                          setFailedImages(prev => new Set(prev).add(photo))
                          // Remove from order after a short delay
                          setTimeout(() => {
                            const failedPhotoIndex = order.photos.findIndex(p => p === photo)
                            if (failedPhotoIndex >= 0) {
                              console.warn(`Removing failed image from order: ${photo}`)
                              const newPhotos = order.photos.filter((_, i) => i !== failedPhotoIndex)
                              updateOrder({ photos: newPhotos })
                              setFailedImages(prev => {
                                const next = new Set(prev)
                                next.delete(photo)
                                return next
                              })
                            }
                          }, 2000)
                        }}
                        onLoad={() => {
                          // If image loads successfully, remove from failed list (in case it was retried)
                          if (failedImageUrlsRef.current.has(photo)) {
                            console.log(`✅ Image loaded successfully after previous failure: ${photo}`)
                            failedImageUrlsRef.current.delete(photo)
                            setFailedImages(prev => {
                              const next = new Set(prev)
                              next.delete(photo)
                              return next
                            })
                          }
                        }}
                      />
                    ) : (
                      <div className="text-center p-4 text-gray-400">
                        <p className="text-sm">❌ Imagine indisponibilă</p>
                        <p className="text-xs mt-1">Se elimină...</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const photoToDelete = order.photos[index]
                      // Mark photo as deleted to prevent polling from re-adding it
                      if (photoToDelete) {
                        deletedPhotosRef.current.add(photoToDelete)
                      }
                      const newPhotos = order.photos.filter((_, i) => i !== index)
                      updateOrder({ photos: newPhotos })
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-all duration-300 opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              )})}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Screen3Decor
