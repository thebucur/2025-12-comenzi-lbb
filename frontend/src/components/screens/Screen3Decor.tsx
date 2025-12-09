import { useState, useRef } from 'react'
import { useOrder } from '../../context/OrderContext'
import { Coating } from '../../types/order.types'
import { useInstallationConfig } from '../../hooks/useInstallationConfig'
import QRCode from 'qrcode'

// Default values (fallback if config not available)
const defaultCoatings: Coating[] = ['GLAZURĂ', 'FRIȘCĂ', 'CREMĂ', 'NAKED', 'DOAR CAPAC']

const defaultColors = [
  '#FF0000', '#FF69B4', '#FF1493', '#FF6347',
  '#FFD700', '#FFA500', '#32CD32', '#00CED1',
  '#0000FF', '#8A2BE2', '#FFFFFF', '#000000',
]

const defaultDecorTypes = ['SIMPLU', 'MEDIU', 'COMPLEX', 'PREMIUM']

function Screen3Decor() {
  const { order, updateOrder } = useOrder()
  const config = useInstallationConfig()
  const [showQRCode, setShowQRCode] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [isRecording, setIsRecording] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const currentTextareaRef = useRef<'decorDetails' | 'observations' | null>(null)

  // Use config values or fallback to defaults
  const coatings = (config?.decor?.coatings as Coating[]) || defaultCoatings
  const colors = config?.decor?.colors || defaultColors
  const decorTypes = config?.decor?.decorTypes || defaultDecorTypes

  const handleColorClick = (color: string) => {
    if (order.colors.includes(color)) {
      updateOrder({ colors: order.colors.filter(c => c !== color) })
    } else if (order.colors.length < 2) {
      updateOrder({ colors: [...order.colors, color] })
    }
  }

  const generateQRCode = async () => {
    try {
      // Generate a session ID for this upload session
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const uploadUrl = `${window.location.origin}/upload/${sessionId}`
      const dataUrl = await QRCode.toDataURL(uploadUrl)
      setQrCodeDataUrl(dataUrl)
      setShowQRCode(true)
      
      // Store session ID for later use when order is submitted
      localStorage.setItem('currentUploadSession', sessionId)
      
      // Poll for new photos (simple approach - in production use WebSockets)
      const pollInterval = setInterval(async () => {
        try {
          // This would need an endpoint to get photos by session ID
          // For now, photos will be linked when order is created
        } catch (error) {
          console.error('Error polling for photos:', error)
        }
      }, 2000)
      
      // Store interval to clear it later
      (window as any).photoPollInterval = pollInterval
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const startVoiceInput = (type: 'decorDetails' | 'observations') => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Recunoașterea vocală nu este disponibilă în acest browser')
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
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
        <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
          {colors.map((color) => {
            const isSelected = order.colors.includes(color)
            const isDisabled = !isSelected && order.colors.length >= 2
            return (
              <button
                key={color}
                onClick={() => handleColorClick(color)}
                disabled={isDisabled}
                className={`relative w-full h-20 rounded-2xl transition-all duration-300 ${
                  isSelected
                    ? 'ring-4 ring-accent-purple scale-110 shadow-glow-purple'
                    : isDisabled
                    ? 'opacity-30 cursor-not-allowed shadow-neumorphic-inset'
                    : 'shadow-neumorphic hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
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
        <button
          onClick={generateQRCode}
          className="btn-active px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300"
        >
          📱 SCANEAZĂ CODUL QR PENTRU POZE
        </button>

        {showQRCode && (
          <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-lg w-full p-8 animate-float">
              <h3 className="text-2xl font-bold text-gradient mb-6 text-center">Scanați codul QR</h3>
              <p className="text-center text-secondary/70 mb-6">
                Folosiți camera telefonului pentru a scana codul și a încărca poze
              </p>
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
              {order.photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <div className="shadow-neumorphic rounded-2xl overflow-hidden">
                    <img
                      src={photo}
                      alt={`Poza ${index + 1}`}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const newPhotos = order.photos.filter((_, i) => i !== index)
                      updateOrder({ photos: newPhotos })
                    }}
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
    </div>
  )
}

export default Screen3Decor
