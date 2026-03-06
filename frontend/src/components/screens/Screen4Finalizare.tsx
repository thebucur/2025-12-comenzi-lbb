import axios from 'axios'
import { useState, useEffect } from 'react'
import { useOrder } from '../../context/OrderContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { resolveColorValue } from '../../constants/colors'
import { formatBucharestDate } from '../../utils/date'

interface ModalState {
  visible: boolean
  type: 'success' | 'error' | 'warning'
  title: string
  messages: string[]
  onClose?: () => void
}

function Screen4Finalizare() {
  const { order, updateOrder, resetOrder } = useOrder()
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nextOrderNumber, setNextOrderNumber] = useState<number | null>(null)
  const [pdfSettings, setPdfSettings] = useState({ recipientEmail: '', sendEmail: true, downloadPdf: false })
  const [modal, setModal] = useState<ModalState>({ visible: false, type: 'success', title: '', messages: [] })

  const showModal = (type: ModalState['type'], title: string, messages: string[], onClose?: () => void) => {
    setModal({ visible: true, type, title, messages, onClose })
  }

  const closeModal = () => {
    const cb = modal.onClose
    setModal(prev => ({ ...prev, visible: false }))
    cb?.()
  }

  useEffect(() => {
    const fetchNextOrderNumber = async () => {
      try {
        const response = await api.get('/orders/next-number')
        setNextOrderNumber(response.data.nextOrderNumber)
      } catch (error: unknown) {
        console.error('Error fetching next order number:', error)
        if (axios.isAxiosError(error) && error.request && !error.response) {
          console.error('Backend server is not responding. Make sure it is running on port 5000.')
        }
      }
    }
    const fetchPdfSettings = async () => {
      try {
        const response = await api.get('/auth/config')
        const settings = response.data?.pdfSettings?.settings
        if (settings && typeof settings === 'object') {
          setPdfSettings({
            recipientEmail: settings.recipientEmail || '',
            sendEmail: settings.sendEmail !== false,
            downloadPdf: settings.downloadPdf === true,
          })
        }
      } catch (error) {
        console.error('Error fetching PDF settings:', error)
      }
    }
    fetchNextOrderNumber()
    fetchPdfSettings()
  }, [])

  const handleEdit = (step: number) => {
    // Mark edit mode so the wizard knows to show the quick return button
    setSearchParams({ step: step.toString(), edit: '1' })
  }

  // Helper function to convert relative URL to absolute (same as PhotoUpload)
  const getAbsoluteUrl = (relativeUrl: string): string => {
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl
    }
    
    let backendURL: string
    if (import.meta.env.DEV) {
      const currentHostname = window.location.hostname
      if (currentHostname && currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
        backendURL = `http://${currentHostname}:5000`
      } else {
        const localIP = localStorage.getItem('localNetworkIP')
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

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Validate required fields before submission
      const missingFields: string[] = []
      
      if (!order.deliveryMethod) missingFields.push('Metodă de livrare')
      if (!order.staffName) missingFields.push('Nume angajat')
      if (!order.clientName?.trim()) missingFields.push('Nume client')
      if (!order.phoneNumber?.trim()) missingFields.push('Număr telefon')
      if (!order.pickupDate) missingFields.push('Data ridicării')
      
      // Only validate cake fields if noCake is false
      if (!order.noCake) {
        if (!order.cakeType) missingFields.push('Tip tort')
        if (!order.weight) missingFields.push('Greutate')
        if (!order.coating) missingFields.push('Îmbrăcăminte')
        if (!order.decorType) missingFields.push('Tip decor')
      } else {
        // If noCake is true, validate otherProducts
        if (!order.otherProducts?.trim()) missingFields.push('Alte produse')
      }
      
      if (missingFields.length > 0) {
        showModal('warning', 'Câmpuri obligatorii lipsă', [
          ...missingFields,
          '',
          'Vă rugăm să completați toate câmpurile obligatorii.',
        ])
        setIsSubmitting(false)
        return
      }

      // Get upload session ID if photos were uploaded
      const uploadSessionId = localStorage.getItem('currentUploadSession')
      
      // Ensure pickupDate is in ISO format
      let pickupDate = order.pickupDate
      if (pickupDate) {
        // Parse string date and convert to ISO format
        const dateObj = new Date(pickupDate)
        if (!isNaN(dateObj.getTime())) {
          pickupDate = dateObj.toISOString()
        }
      }
      
      // Get username from localStorage (user who is logged in)
      const createdByUsername = localStorage.getItem('authToken') || null
      
      // Prepare order data with proper formatting
      const orderData = {
        deliveryMethod: order.deliveryMethod,
        location: order.location || null,
        address: order.address || null,
        staffName: order.staffName,
        clientName: order.clientName.trim(),
        phoneNumber: order.phoneNumber.trim(),
        pickupDate: pickupDate,
        pickupTime: order.pickupTime || null,
        tomorrowVerification: order.tomorrowVerification || false,
        advance: order.advance ? Number(order.advance) : null,
        noCake: order.noCake || false,
        cakeType: order.cakeType,
        weight: order.weight,
        customWeight: order.customWeight || null,
        shape: order.shape || null,
        floors: order.floors || null,
        otherProducts: order.otherProducts || null,
        coating: order.coating,
        colors: Array.isArray(order.colors) ? order.colors : [],
        decorType: order.decorType,
        decorDetails: order.decorDetails || null,
        observations: order.observations || null,
        uploadSessionId: uploadSessionId || null,
        createdByUsername: createdByUsername,
      }
      
      console.log('Submitting order data:', JSON.stringify(orderData, null, 2))
      
      const response = await api.post('/orders', orderData)
      const orderNumber = response.data.orderNumber
      
      // Extract photos from response and convert to absolute URLs
      const photos = response.data.photos || []
      const photoUrls = photos.map((photo: { url: string }) => getAbsoluteUrl(photo.url))
      
      console.log('Order created with photos:', {
        orderNumber,
        photoCount: photoUrls.length,
        photoUrls,
      })
      
      // Update order with photos before showing summary
      updateOrder({ 
        orderNumber,
        photos: photoUrls,
      })
      
      // Generate PDF și trimitere email (conform setărilor)
      // Email-ul se trimite în background pe server - răspunsul vine imediat
      await api.post(
        `/orders/${response.data.id}/generate-pdf`,
        {
          sendEmail: pdfSettings.sendEmail,
          recipientEmail: pdfSettings.recipientEmail || undefined,
        }
      )

      // Descarcă PDF local dacă e activat
      if (pdfSettings.downloadPdf) {
        try {
          const pdfBlob = await api.get(`/orders/${response.data.id}/pdf`, { responseType: 'blob' })
          const url = window.URL.createObjectURL(new Blob([pdfBlob.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `comanda-${orderNumber}.pdf`)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
        } catch (dlErr) {
          console.error('Eroare la descărcarea PDF:', dlErr)
        }
      }
      
      // Clear upload session
      if (uploadSessionId) {
        localStorage.removeItem('currentUploadSession')
      }
      
      const parts: string[] = [`Comanda #${orderNumber} a fost trimisă cu succes!`]
      if (pdfSettings.sendEmail) {
        parts.push('Emailul cu PDF se trimite în fundal.')
      }
      if (pdfSettings.downloadPdf) {
        parts.push('PDF-ul a fost descărcat.')
      }
      showModal('success', 'Comandă trimisă!', parts, () => {
        resetOrder()
        navigate('/?step=1', { replace: true })
      })
    } catch (error: unknown) {
      console.error('Error submitting order:', error)
      if (axios.isAxiosError(error)) {
        console.error('Error response:', error.response)
        console.error('Error response data:', error.response?.data)
        console.error('Error request:', error.request)
      
        // Extract detailed error message
        let errorMessage = 'Eroare la trimiterea comenzii. Vă rugăm să încercați din nou.'
      
        if (error.response) {
          // Server responded with error status
          const responseData = error.response.data as { error?: string; message?: string; missingFields?: string[]; details?: unknown }
          const serverError = responseData?.error || responseData?.message
          
          if (responseData?.missingFields) {
            errorMessage = `Lipsesc câmpuri obligatorii:\n${responseData.missingFields.join('\n')}`
          } else if (serverError) {
            errorMessage = `Eroare server: ${serverError}`
          } else if (error.response.status === 400) {
            errorMessage = 'Date invalide. Vă rugăm să verificați toate câmpurile.'
          } else if (error.response.status === 500) {
            const details = responseData?.details
            errorMessage = `Eroare internă server: ${serverError || 'Eroare necunoscută'}`
            if (details && process.env.NODE_ENV === 'development') {
              console.error('Error details:', details)
            }
          } else {
            errorMessage = `Eroare ${error.response.status}: ${error.response.statusText}`
          }
        } else if (error.request) {
          // Request was made but no response received
          const apiBaseURL = api.defaults.baseURL || 'http://localhost:5000/api'
          errorMessage = `Nu s-a primit răspuns de la server.\n\nURL încercat: ${apiBaseURL}\n\nVerifică:\n1. Backend-ul rulează (port 5000)\n2. Rulează: cd backend && npm run dev\n3. Conexiunea la internet\n4. Firewall-ul permite conexiuni pe portul 5000`
          console.error('No response received. Is backend running?')
          console.error('API Base URL:', apiBaseURL)
          console.error('Full error:', error)
        } else {
          // Something else happened
          errorMessage = `Eroare: ${error.message}`
        }
      
        showModal('error', 'Eroare', [errorMessage])
      } else {
        showModal('error', 'Eroare', ['Eroare la trimiterea comenzii. Vă rugăm să încercați din nou.'])
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink shadow-glow-purple mb-6 animate-float">
          <span className="text-5xl">✓</span>
        </div>
        <h2 className="text-4xl font-bold text-gradient mb-3 flex items-center justify-center gap-3 flex-wrap">
          <span>Rezumat comanda</span>
          {((order.orderNumber ?? nextOrderNumber) && (
            <span className="px-4 py-1 rounded-full bg-primary/70 text-accent-purple shadow-neumorphic text-xl font-extrabold">
              #{order.orderNumber ?? nextOrderNumber}
            </span>
          )) || (
            <span className="px-4 py-1 rounded-full bg-primary/50 text-secondary/60 text-xl">
              #încarcare...
            </span>
          )}
        </h2>
        <p className="text-secondary/70 text-lg">Verificați detaliile comenzii înainte de trimitere</p>
      </div>

      {/* Summary Card 1: Ridicare/Livrare */}
      <div className="card-neumorphic relative">
        <button
          onClick={() => handleEdit(1)}
          className="absolute top-6 right-6 btn-neumorphic px-4 py-2 rounded-xl font-bold text-accent-purple hover:scale-105 transition-all duration-300"
        >
          ✏️ EDITEAZĂ
        </button>
        <h3 className="text-2xl font-bold text-gradient mb-6">📦 Ridicare / Livrare</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-primary/50 p-4 rounded-2xl">
            <p className="text-sm text-secondary/60 mb-1">Metodă</p>
            <p className="font-bold text-secondary">
              {order.deliveryMethod === 'ridicare' ? '🏪 Ridicare din cofetărie' : '🚚 Livrare la adresă'}
            </p>
          </div>
          
          {order.deliveryMethod === 'ridicare' && order.location && (
            <div className="bg-primary/50 p-4 rounded-2xl">
              <p className="text-sm text-secondary/60 mb-1">Locație</p>
              <p className="font-bold text-secondary">{order.location}</p>
            </div>
          )}
          
          {order.deliveryMethod === 'livrare' && order.address && (
            <div className="bg-primary/50 p-4 rounded-2xl md:col-span-2">
              <p className="text-sm text-secondary/60 mb-1">Adresă</p>
              <p className="font-bold text-secondary">{order.address}</p>
            </div>
          )}
          
          {order.staffName && (
            <div className="bg-primary/50 p-4 rounded-2xl">
              <p className="text-sm text-secondary/60 mb-1">Preia comanda</p>
              <p className="font-bold text-secondary">{order.staffName}</p>
            </div>
          )}
          
          {order.clientName && (
            <div className="bg-primary/50 p-4 rounded-2xl">
              <p className="text-sm text-secondary/60 mb-1">Client</p>
              <p className="font-bold text-secondary">{order.clientName}</p>
            </div>
          )}
          
          {order.phoneNumber && (
            <div className="bg-primary/50 p-4 rounded-2xl">
              <p className="text-sm text-secondary/60 mb-1">Telefon</p>
              <p className="font-bold text-secondary">07{order.phoneNumber}</p>
            </div>
          )}
          
          {order.pickupDate && (
            <div className="bg-primary/50 p-4 rounded-2xl">
              <p className="text-sm text-secondary/60 mb-1">Data</p>
              <p className="font-bold text-secondary">
                {formatBucharestDate(order.pickupDate)}
                {order.pickupTime && ` — ${order.pickupTime}`}
              </p>
            </div>
          )}
          
          {order.advance !== null && order.advance > 0 && (
            <div className="bg-primary/50 p-4 rounded-2xl">
              <p className="text-sm text-secondary/60 mb-1">Avans</p>
              <p className="font-bold text-secondary">{order.advance} RON</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Card 2: Tort */}
      <div className="card-neumorphic relative">
        <button
          onClick={() => handleEdit(2)}
          className="absolute top-6 right-6 btn-neumorphic px-4 py-2 rounded-xl font-bold text-accent-purple hover:scale-105 transition-all duration-300"
        >
          ✏️ EDITEAZĂ
        </button>
        <h3 className="text-2xl font-bold text-gradient mb-6">🎂 Sortiment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.noCake ? (
            <div className="bg-primary/50 p-4 rounded-2xl md:col-span-2">
              <p className="text-sm text-secondary/60 mb-1">Tort</p>
              <p className="font-bold text-secondary">🚫 NU ARE TORT</p>
            </div>
          ) : (
            <>
              {order.cakeType && (
                <div className="bg-primary/50 p-4 rounded-2xl md:col-span-2">
                  <p className="text-sm text-secondary/60 mb-1">Tip tort</p>
                  <p className="font-bold text-secondary">{order.cakeType}</p>
                </div>
              )}
              
              {order.weight && (
                <div className="bg-primary/50 p-4 rounded-2xl">
                  <p className="text-sm text-secondary/60 mb-1">Greutate</p>
                  <p className="font-bold text-secondary">{order.weight === 'ALTĂ GREUTATE' ? order.customWeight : order.weight}</p>
                </div>
              )}
              
              {order.shape && (
                <div className="bg-primary/50 p-4 rounded-2xl">
                  <p className="text-sm text-secondary/60 mb-1">Formă</p>
                  <p className="font-bold text-secondary">{order.shape}</p>
                </div>
              )}
              
              {order.floors && (
                <div className="bg-primary/50 p-4 rounded-2xl">
                  <p className="text-sm text-secondary/60 mb-1">Etaje</p>
                  <p className="font-bold text-secondary">{order.floors} {parseInt(order.floors) === 1 ? 'etaj' : 'etaje'}</p>
                </div>
              )}
            </>
          )}
          
          {order.otherProducts && (
            <div className="bg-primary/50 p-4 rounded-2xl md:col-span-2">
              <p className="text-sm text-secondary/60 mb-1">Alte produse</p>
              <p className="font-bold text-secondary">{order.otherProducts}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Card 3: Decor - Hidden when noCake */}
      {!order.noCake && (
        <div className="card-neumorphic relative">
          <button
            onClick={() => handleEdit(3)}
            className="absolute top-6 right-6 btn-neumorphic px-4 py-2 rounded-xl font-bold text-accent-purple hover:scale-105 transition-all duration-300"
          >
            ✏️ EDITEAZĂ
          </button>
          <h3 className="text-2xl font-bold text-gradient mb-6">🎨 Decor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.coating && (
            <div className="bg-primary/50 p-4 rounded-2xl">
              <p className="text-sm text-secondary/60 mb-1">Îmbrăcat în</p>
              <p className="font-bold text-secondary">{order.coating}</p>
            </div>
          )}
          
          {order.colors.length > 0 && (
            <div className="bg-primary/50 p-4 rounded-2xl">
              <p className="text-sm text-secondary/60 mb-1">Culori</p>
              <div className="flex gap-3 mt-2 flex-wrap">
                {order.colors.map((color, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 rounded-xl shadow-neumorphic bg-white/70 flex items-center gap-2"
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-secondary/20 shadow-sm"
                      style={{ backgroundColor: resolveColorValue(color) }}
                    />
                    <span className="text-sm font-semibold text-secondary">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {order.decorType && (
            <div className="bg-primary/50 p-4 rounded-2xl">
              <p className="text-sm text-secondary/60 mb-1">Tip decor</p>
              <p className="font-bold text-secondary">{order.decorType}</p>
            </div>
          )}
          
          {order.decorDetails && (
            <div className="bg-primary/50 p-4 rounded-2xl md:col-span-2">
              <p className="text-sm text-secondary/60 mb-1">Detalii decor</p>
              <p className="font-bold text-secondary">{order.decorDetails}</p>
            </div>
          )}
          
          {order.observations && (
            <div className="bg-primary/50 p-4 rounded-2xl md:col-span-2">
              <p className="text-sm text-secondary/60 mb-1">Observații</p>
              <p className="font-bold text-secondary">{order.observations}</p>
            </div>
          )}
          
          {order.photos.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-sm text-secondary/60 mb-3">Poze încărcate ({order.photos.length})</p>
              <div className="grid grid-cols-4 gap-4">
                {order.photos.map((photo, index) => (
                  <div key={index} className="shadow-neumorphic rounded-2xl overflow-hidden">
                    <img
                      src={getAbsoluteUrl(photo)}
                      alt={`Poza ${index + 1}`}
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        console.error('Error loading image:', photo, 'Full URL:', getAbsoluteUrl(photo))
                        const target = e.target as HTMLImageElement
                        target.style.border = '2px solid red'
                        target.alt = `Eroare la încărcarea pozei ${index + 1}`
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-center mt-12">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`px-16 py-6 rounded-3xl font-bold text-2xl transition-all duration-300 ${
            isSubmitting
              ? 'bg-gray-300 text-gray-400 cursor-not-allowed shadow-neumorphic-inset'
              : 'btn-active hover:scale-105 shadow-glow-purple'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-3">
              <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Se trimite...
            </span>
          ) : (
            <span className="flex items-center gap-3">
              🚀 TRIMITE COMANDA
            </span>
          )}
        </button>
      </div>

      {/* Custom Modal */}
      {modal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative card-neumorphic max-w-md w-full animate-[modalIn_0.3s_ease-out]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 ${
                modal.type === 'success'
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                  : modal.type === 'warning'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                  : 'bg-gradient-to-r from-red-400 to-rose-500 shadow-[0_0_20px_rgba(248,113,113,0.4)]'
              }`}>
                <span className="text-4xl text-white">
                  {modal.type === 'success' ? '✓' : modal.type === 'warning' ? '!' : '✕'}
                </span>
              </div>

              <h3 className={`text-2xl font-bold mb-4 ${
                modal.type === 'success' ? 'text-gradient' : modal.type === 'warning' ? 'text-amber-600' : 'text-red-500'
              }`}>
                {modal.title}
              </h3>

              <div className="space-y-2 mb-8 w-full">
                {modal.messages.map((msg, i) => (
                  msg === ''
                    ? <div key={i} className="h-2" />
                    : <p key={i} className="text-secondary/80 text-base leading-relaxed">{msg}</p>
                ))}
              </div>

              <button
                onClick={closeModal}
                className={`px-10 py-3 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 ${
                  modal.type === 'success'
                    ? 'btn-active shadow-glow-purple'
                    : modal.type === 'warning'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                    : 'bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-[0_0_20px_rgba(248,113,113,0.3)]'
                }`}
              >
                {modal.type === 'success' ? 'OK' : 'Am înțeles'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Screen4Finalizare
