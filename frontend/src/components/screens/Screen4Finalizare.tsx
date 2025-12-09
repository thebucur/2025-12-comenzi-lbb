import { useState, useEffect } from 'react'
import { useOrder } from '../../context/OrderContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'

function Screen4Finalizare() {
  const { order, updateOrder, resetOrder } = useOrder()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nextOrderNumber, setNextOrderNumber] = useState<number | null>(null)

  useEffect(() => {
    // Fetch next order number when component mounts
    const fetchNextOrderNumber = async () => {
      try {
        const response = await api.get('/orders/next-number')
        setNextOrderNumber(response.data.nextOrderNumber)
      } catch (error) {
        console.error('Error fetching next order number:', error)
      }
    }
    fetchNextOrderNumber()
  }, [])

  const handleEdit = (step: number) => {
    setSearchParams({ step: step.toString() })
    window.location.reload() // Reload to update the wizard step
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Get upload session ID if photos were uploaded
      const uploadSessionId = localStorage.getItem('currentUploadSession')
      const orderData = { ...order, uploadSessionId }
      
      const response = await api.post('/orders', orderData)
      const orderNumber = response.data.orderNumber
      updateOrder({ orderNumber })
      
      // Generate and send PDF
      await api.post(`/orders/${response.data.id}/generate-pdf`)
      
      // Clear upload session
      if (uploadSessionId) {
        localStorage.removeItem('currentUploadSession')
      }
      
      alert(`Comanda #${orderNumber} a fost trimisă cu succes!`)
      // Reset and go back to start
      resetOrder()
      navigate('/')
    } catch (error) {
      console.error('Error submitting order:', error)
      alert('Eroare la trimiterea comenzii. Vă rugăm să încercați din nou.')
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
        <h2 className="text-4xl font-bold text-gradient mb-4">
          {order.orderNumber 
            ? `Comanda #${order.orderNumber}` 
            : nextOrderNumber 
            ? `Comanda #${nextOrderNumber}`
            : 'Rezumat comanda'}
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
          
          {order.otherProducts && (
            <div className="bg-primary/50 p-4 rounded-2xl md:col-span-2">
              <p className="text-sm text-secondary/60 mb-1">Alte produse</p>
              <p className="font-bold text-secondary">{order.otherProducts}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Card 3: Decor */}
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
              <div className="flex gap-2 mt-2">
                {order.colors.map((color, idx) => (
                  <div 
                    key={idx} 
                    className="w-12 h-12 rounded-xl shadow-neumorphic"
                    style={{ backgroundColor: color }}
                  />
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
                      src={photo}
                      alt={`Poza ${index + 1}`}
                      className="w-full h-24 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
