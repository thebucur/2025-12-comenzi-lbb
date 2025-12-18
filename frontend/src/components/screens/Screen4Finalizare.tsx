import axios from 'axios'
import { useState, useEffect } from 'react'
import { useOrder } from '../../context/OrderContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { resolveColorValue } from '../../constants/colors'
import { getAbsoluteImageUrl } from '../../utils/imageUrl'

function Screen4Finalizare() {
  const { order, updateOrder, resetOrder } = useOrder()
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nextOrderNumber, setNextOrderNumber] = useState<number | null>(null)

  useEffect(() => {
    // Fetch next order number when component mounts
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
    fetchNextOrderNumber()
  }, [])

  const handleEdit = (step: number) => {
    // Mark edit mode so the wizard knows to show the quick return button
    setSearchParams({ step: step.toString(), edit: '1' })
  }

  // Use centralized function
  const getAbsoluteUrl = getAbsoluteImageUrl

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
        alert(`Lipsesc câmpuri obligatorii:\n${missingFields.join('\n')}\n\nVă rugăm să completați toate câmpurile obligatorii.`)
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
      
      // Generate PDF
      await api.post(`/orders/${response.data.id}/generate-pdf`)
      
      // Download the generated PDF
      try {
        const pdfResponse = await api.get(`/orders/${response.data.id}/pdf`, {
          responseType: 'blob',
        })
        
        // Create a blob URL and trigger download
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `comanda-${orderNumber}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url) // Clean up the blob URL
      } catch (pdfError) {
        console.error('Error downloading PDF:', pdfError)
        // Don't block the success flow if PDF download fails
      }
      
      // Clear upload session
      if (uploadSessionId) {
        localStorage.removeItem('currentUploadSession')
      }
      
      alert(`Comanda #${orderNumber} a fost trimisă cu succes!`)
      // Reset and go back to step 1 to take a new order
      resetOrder()
      navigate('/?step=1', { replace: true })
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
      
        alert(errorMessage)
      } else {
        alert('Eroare la trimiterea comenzii. Vă rugăm să încercați din nou.')
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
              <p className="font-bold text-secondary">{new Date(order.pickupDate).toLocaleDateString('ro-RO')}</p>
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
                {order.photos.map((photo, index) => {
                  // Ensure photo URL is absolute (handle both absolute and relative URLs from old orders)
                  const photoUrl = getAbsoluteUrl(photo)
                  return (
                  <div key={index} className="shadow-neumorphic rounded-2xl overflow-hidden">
                    <img
                      src={photoUrl}
                      alt={`Poza ${index + 1}`}
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        console.error('Error loading image:', photo, 'Absolute URL:', photoUrl)
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                )})}
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
    </div>
  )
}

export default Screen4Finalizare
