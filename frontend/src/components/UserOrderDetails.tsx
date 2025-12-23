import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { resolveColorValue } from '../constants/colors'
import { getAbsoluteImageUrl } from '../utils/imageUrl'

// Use centralized function
const getAbsoluteUrl = getAbsoluteImageUrl

interface Photo {
  id: string
  url: string
  path: string | null
  isFoaieDeZahar: boolean
  createdAt: string
}

interface OrderData {
  id: string
  orderNumber: string
  clientName: string
  phoneNumber: string
  deliveryMethod: string
  location: string | null
  address: string | null
  staffName: string
  pickupDate: string
  advance: number | null
  cakeType: string
  weight: string
  shape: string | null
  floors: string | null
  otherProducts: string | null
  coating: string
  colors: string[]
  decorType: string
  decorDetails: string
  observations: string
  photos: Photo[]
  createdAt: string
}

function UserOrderDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/orders/${id}`)
        setOrder(response.data)
      } catch (err) {
        setError('Eroare la încărcarea comenzii')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchOrder()
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink shadow-glow-purple mb-4 animate-float">
            <svg className="animate-spin h-10 w-10 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-2xl font-bold text-gradient">Se încarcă...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary flex items-center justify-center">
        <div className="card-neumorphic max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-2xl font-bold text-red-500">{error || 'Comanda nu a fost găsită'}</p>
          <button
            onClick={() => navigate('/my-orders')}
            className="mt-6 btn-neumorphic px-6 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
          >
            ← Înapoi la comenzi
          </button>
        </div>
      </div>
    )
  }

  // Get foaie de zahar photos
  const foaieDeZaharPhotos = order.photos.filter(p => p.isFoaieDeZahar)
  const regularPhotos = order.photos.filter(p => !p.isFoaieDeZahar)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary">
      <div className="absolute top-20 right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <button
          onClick={() => navigate('/my-orders')}
          className="mb-8 btn-neumorphic px-6 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all inline-flex items-center gap-2"
        >
          ← Înapoi la comenzi
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink shadow-glow-purple mb-6 animate-float">
            <span className="text-5xl">📋</span>
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-2">Comandă #{order.orderNumber}</h1>
          <p className="text-secondary/60 text-lg">
            Creată la {new Date(order.createdAt).toLocaleDateString('ro-RO')} 
            {' '}{new Date(order.createdAt).toLocaleTimeString('ro-RO')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Order Details */}
          <div className="card-neumorphic space-y-4">
            <h2 className="text-3xl font-bold text-gradient mb-6">📦 Detalii comandă</h2>
            <div className="space-y-3">
              <div className="bg-primary/50 p-4 rounded-2xl">
                <p className="text-sm text-secondary/60 mb-1">Client</p>
                <p className="font-bold text-secondary text-lg">{order.clientName}</p>
              </div>
              <div className="bg-primary/50 p-4 rounded-2xl">
                <p className="text-sm text-secondary/60 mb-1">Telefon</p>
                <p className="font-bold text-secondary text-lg">07{order.phoneNumber}</p>
              </div>
              <div className="bg-primary/50 p-4 rounded-2xl">
                <p className="text-sm text-secondary/60 mb-1">Livrare</p>
                <p className="font-bold text-secondary text-lg">
                  {order.deliveryMethod === 'ridicare' 
                    ? `🏪 Ridicare din ${order.location || 'N/A'}`
                    : '🚚 Livrare la adresa'}
                </p>
              </div>
              {order.address && order.deliveryMethod === 'livrare' && (
                <div className="bg-primary/50 p-4 rounded-2xl">
                  <p className="text-sm text-secondary/60 mb-1">Adresă livrare</p>
                  <p className="font-bold text-secondary text-lg">{order.address}</p>
                </div>
              )}
              <div className="bg-primary/50 p-4 rounded-2xl">
                <p className="text-sm text-secondary/60 mb-1">Preia comanda</p>
                <p className="font-bold text-secondary text-lg">{order.staffName}</p>
              </div>
              <div className="bg-primary/50 p-4 rounded-2xl">
                <p className="text-sm text-secondary/60 mb-1">Data ridicare/livrare</p>
                <p className="font-bold text-secondary text-lg">
                  {new Date(order.pickupDate).toLocaleDateString('ro-RO')}
                </p>
              </div>
              {order.advance && order.advance > 0 && (
                <div className="bg-primary/50 p-4 rounded-2xl">
                  <p className="text-sm text-secondary/60 mb-1">Avans</p>
                  <p className="font-bold text-accent-purple text-lg">{order.advance} RON</p>
                </div>
              )}
            </div>
          </div>

          {/* Cake Details */}
          <div className="card-neumorphic space-y-4">
            <h2 className="text-3xl font-bold text-gradient mb-6">🎂 Detalii tort</h2>
            <div className="space-y-3">
              <div className="bg-primary/50 p-4 rounded-2xl">
                <p className="text-sm text-secondary/60 mb-1">Tip tort</p>
                <p className="font-bold text-secondary text-lg">{order.cakeType}</p>
              </div>
              <div className="bg-primary/50 p-4 rounded-2xl">
                <p className="text-sm text-secondary/60 mb-1">Greutate</p>
                <p className="font-bold text-secondary text-lg">{order.weight}</p>
              </div>
              {order.shape && (
                <div className="bg-primary/50 p-4 rounded-2xl">
                  <p className="text-sm text-secondary/60 mb-1">Formă</p>
                  <p className="font-bold text-secondary text-lg">{order.shape}</p>
                </div>
              )}
              {order.floors && (
                <div className="bg-primary/50 p-4 rounded-2xl">
                  <p className="text-sm text-secondary/60 mb-1">Număr etaje</p>
                  <p className="font-bold text-secondary text-lg">{order.floors} {parseInt(order.floors) === 1 ? 'etaj' : 'etaje'}</p>
                </div>
              )}
              {order.otherProducts && (
                <div className="bg-primary/50 p-4 rounded-2xl md:col-span-2">
                  <p className="text-sm text-secondary/60 mb-1">Alte produse</p>
                  <p className="font-bold text-secondary text-lg">{order.otherProducts}</p>
                </div>
              )}
            </div>
          </div>

          {/* Decor Details */}
          <div className="card-neumorphic space-y-4 lg:col-span-2">
            <h2 className="text-3xl font-bold text-gradient mb-6">🎨 Detalii decor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-primary/50 p-4 rounded-2xl">
                <p className="text-sm text-secondary/60 mb-1">Îmbrăcat în</p>
                <p className="font-bold text-secondary text-lg">{order.coating}</p>
              </div>
              {order.colors.length > 0 && (
                <div className="bg-primary/50 p-4 rounded-2xl">
                  <p className="text-sm text-secondary/60 mb-3">Culori selectate</p>
                  <div className="flex gap-3 flex-wrap">
                    {order.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl shadow-neumorphic bg-white/70 flex items-center gap-2"
                        title={color}
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
              <div className="bg-primary/50 p-4 rounded-2xl">
                <p className="text-sm text-secondary/60 mb-1">Tip decor</p>
                <p className="font-bold text-secondary text-lg">{order.decorType}</p>
              </div>
              {order.decorDetails && (
                <div className="bg-primary/50 p-4 rounded-2xl md:col-span-2">
                  <p className="text-sm text-secondary/60 mb-2">Detalii decor</p>
                  <p className="font-bold text-secondary text-lg">{order.decorDetails}</p>
                </div>
              )}
              {order.observations && (
                <div className="bg-primary/50 p-4 rounded-2xl md:col-span-2">
                  <p className="text-sm text-secondary/60 mb-2">Observații</p>
                  <p className="font-bold text-secondary text-lg">{order.observations}</p>
                </div>
              )}
            </div>
          </div>

          {/* Foaie de Zahar */}
          {foaieDeZaharPhotos.length > 0 && (
            <div className="card-neumorphic space-y-4 lg:col-span-2">
              <h2 className="text-3xl font-bold text-gradient mb-6">📄 Foaie de zahar</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {foaieDeZaharPhotos.map((photo, index) => (
                  <div key={photo.id || index} className="shadow-neumorphic rounded-2xl overflow-hidden group">
                    <img
                      src={getAbsoluteUrl(photo.url)}
                      alt={`Foaie de zahar ${index + 1}`}
                      className="w-full h-64 object-contain bg-primary/20 group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        console.error('Error loading image:', photo.url, 'Full URL:', getAbsoluteUrl(photo.url))
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Photos */}
          {regularPhotos.length > 0 && (
            <div className="card-neumorphic space-y-4 lg:col-span-2">
              <h2 className="text-3xl font-bold text-gradient mb-6">📸 Poze încărcate ({regularPhotos.length})</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {regularPhotos.map((photo, index) => (
                  <div key={photo.id || index} className="shadow-neumorphic rounded-2xl overflow-hidden group">
                    <img
                      src={getAbsoluteUrl(photo.url)}
                      alt={`Poza ${index + 1}`}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        console.error('Error loading image:', photo.url, 'Full URL:', getAbsoluteUrl(photo.url))
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserOrderDetails

