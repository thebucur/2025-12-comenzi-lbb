import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { resolveColorValue, normalizeColorOptions, type ColorOption } from '../../constants/colors'
import { getAbsoluteImageUrl } from '../../utils/imageUrl'
import { getDateRecencyClass } from '../../utils/dateRecency'
import { formatBucharestDate, formatBucharestTime } from '../../utils/date'
import { useInstallationConfig } from '../../hooks/useInstallationConfig'

const defaultCakeTypes = ['MOUSSE DE CIOCOLATĂ NEAGRĂ', 'MOUSSE DE FRUCTE', 'MOUSSE DE VANILIE', 'MOUSSE DE CAFEA', 'MOUSSE DE LĂMÂIE', 'MOUSSE DE COCO', 'MOUSSE DE MENTĂ', 'MOUSSE DE ZMEURĂ', 'MOUSSE DE CĂPȘUNI', 'MOUSSE DE ANANAS', 'MOUSSE DE MANGOSTEEN', 'MOUSSE DE PISTACHIO', 'MOUSSE DE CARAMEL', 'MOUSSE DE BANANĂ', 'MOUSSE DE CIREȘE', 'MOUSSE DE PORTOCALĂ', 'MOUSSE DE MIRABELLE', 'ALT TIP']
const defaultWeights = ['1 KG', '1.5 KG', '2 KG', '2.5 KG', '3 KG', 'ALTĂ GREUTATE']
const defaultShapes = ['ROTUND', 'DREPTUNGHIULAR', 'ALTĂ FORMĂ']
const defaultFloors = ['1', '2', '3', '4', '5']
const defaultCoatings = ['GLAZURĂ', 'FRIȘCĂ', 'CREMĂ', 'NAKED', 'DOAR CAPAC']
const defaultDecorTypes = ['SIMPLU', 'MEDIU', 'COMPLEX', 'PREMIUM']

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
  createdByUsername: string | null
  pickupDate: string
  pickupTime: string | null
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

function AdminOrderView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const config = useInstallationConfig()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<OrderData>>({})
  const [saving, setSaving] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printResult, setPrintResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const cakeTypes = (config?.sortiment?.cakeTypes as string[]) || defaultCakeTypes
  const weights = (config?.sortiment?.weights as string[]) || defaultWeights
  const shapes = (config?.sortiment?.shapes as string[]) || defaultShapes
  const floors = (config?.sortiment?.floors as string[]) || defaultFloors
  const coatings = (config?.decor?.coatings as string[]) || defaultCoatings
  const colorOptions: ColorOption[] = normalizeColorOptions(config?.decor?.colors as Array<string | ColorOption>)
  const decorTypes = (config?.decor?.decorTypes as string[]) || defaultDecorTypes

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/admin/orders/${id}`)
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

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/orders/${id}/pdf`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `comanda-${order?.orderNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Error downloading PDF:', err)
      alert('Eroare la descărcarea PDF-ului')
    }
  }

  const openEditModal = () => {
    if (!order) return
    const pickupDateStr = order.pickupDate ? new Date(order.pickupDate).toISOString().slice(0, 10) : ''
    setEditForm({
      clientName: order.clientName,
      phoneNumber: order.phoneNumber,
      createdByUsername: order.createdByUsername ?? '',
      deliveryMethod: order.deliveryMethod,
      location: order.location ?? '',
      address: order.address ?? '',
      staffName: order.staffName,
      pickupDate: pickupDateStr,
      pickupTime: order.pickupTime ?? '',
      advance: order.advance ?? undefined,
      cakeType: order.cakeType ?? '',
      weight: order.weight ?? '',
      shape: order.shape ?? '',
      floors: order.floors ?? '',
      otherProducts: order.otherProducts ?? '',
      coating: order.coating ?? '',
      colors: order.colors ?? [],
      decorType: order.decorType ?? '',
      decorDetails: order.decorDetails ?? '',
      observations: order.observations ?? '',
    })
    setShowEditModal(true)
  }

  const handlePrintClick = () => {
    setPrintResult(null)
    setShowPrintModal(true)
  }

  const handleConfirmSendEmail = async () => {
    if (!id || !order) return
    setSendingEmail(true)
    try {
      await api.post(`/orders/${id}/generate-pdf`, { sendEmail: true })
      setPrintResult({ type: 'success', message: `Comanda #${order.orderNumber} a fost trimisă pe email cu succes!` })
    } catch (err: any) {
      console.error('Error sending order email:', err)
      setPrintResult({ type: 'error', message: err.response?.data?.error || 'Eroare la trimiterea comenzii pe email' })
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!id || !order) return
    setSaving(true)
    try {
      const payload = {
        ...editForm,
        pickupDate: editForm.pickupDate ? new Date(editForm.pickupDate as string).toISOString() : order.pickupDate,
        advance: editForm.advance != null ? Number(editForm.advance) : null,
        createdByUsername: editForm.createdByUsername || null,
        location: editForm.location || null,
        address: editForm.address || null,
        pickupTime: editForm.pickupTime || null,
        cakeType: editForm.cakeType || null,
        weight: editForm.weight || null,
        shape: editForm.shape || null,
        floors: editForm.floors || null,
        otherProducts: editForm.otherProducts || null,
        coating: editForm.coating || null,
        decorType: editForm.decorType || null,
        decorDetails: editForm.decorDetails || null,
        observations: editForm.observations || null,
        colors: Array.isArray(editForm.colors) ? editForm.colors : (typeof editForm.colors === 'string' ? (editForm.colors as string).split(',').map((c) => c.trim()).filter(Boolean) : []),
      }
      const { data } = await api.put(`/admin/orders/${id}`, payload)
      setOrder(data)
      setShowEditModal(false)
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.error || err.response?.data?.message || 'Eroare la salvarea comenzii')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadFoaieDeZahar = async () => {
    if (!id || !order) return
    try {
      const response = await api.get(`/admin/orders/${id}/foaie-de-zahar`, {
        responseType: 'blob',
      })
      
      // Check if response is actually a blob or an error JSON
      if (response.data.type && response.data.type.includes('application/json')) {
        // Response is JSON error, parse it
        const text = await response.data.text()
        const errorData = JSON.parse(text)
        alert(`Eroare: ${errorData.message || errorData.error || 'Eroare necunoscută la descărcarea foii de zahar'}`)
        return
      }
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition']
      let filename = `foaie-de-zahar-order-${order.orderNumber}.jpg`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Error downloading foaie de zahar:', err)
      
      // Try to extract error message from response
      let errorMessage = 'Eroare la descărcarea foii de zahar'
      if (err.response) {
        if (err.response.data) {
          try {
            // If error response is blob, try to parse it
            if (err.response.data instanceof Blob) {
              const text = await err.response.data.text()
              const errorData = JSON.parse(text)
              errorMessage = errorData.message || errorData.error || errorMessage
            } else if (typeof err.response.data === 'object') {
              errorMessage = err.response.data.message || err.response.data.error || errorMessage
            }
          } catch (parseError) {
            // If parsing fails, use status text
            errorMessage = err.response.statusText || errorMessage
          }
        } else {
          errorMessage = err.response.statusText || errorMessage
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      alert(errorMessage)
    }
  }

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
            onClick={() => navigate('/dashboard')}
            className="mt-6 btn-neumorphic px-6 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
          >
            ← Înapoi la panou
          </button>
        </div>
      </div>
    )
  }

  const createdDateClass = getDateRecencyClass(order.createdAt)
  const pickupDateClass = getDateRecencyClass(order.pickupDate)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary">
      <div className="absolute top-20 right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-neumorphic px-6 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            ← Înapoi la panou
          </button>
          <button
            onClick={openEditModal}
            className="btn-active px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            ✏️ Editează
          </button>
          <button
            onClick={handlePrintClick}
            className="bg-green-500/20 border-2 border-green-500/50 px-6 py-3 rounded-2xl font-bold text-green-700 hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            🖨️ Print
          </button>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink shadow-glow-purple mb-6 animate-float">
            <span className="text-5xl">📋</span>
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-2">Comandă #{order.orderNumber}</h1>
          <p className={`text-secondary/60 text-lg ${createdDateClass}`}>
            Creată la {formatBucharestDate(order.createdAt)} 
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
              {order.createdByUsername && (
                <div className="bg-primary/50 p-4 rounded-2xl">
                  <p className="text-sm text-secondary/60 mb-1">Locație preluare</p>
                  <p className="font-bold text-secondary text-lg">{order.createdByUsername}</p>
                </div>
              )}
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
                <p className="text-sm text-secondary/60 mb-1">Preluat pe</p>
                <p className={`font-bold text-secondary text-lg ${createdDateClass}`}>
                  {formatBucharestDate(order.createdAt)} — {formatBucharestTime(order.createdAt)}
                </p>
              </div>
              <div className="bg-primary/50 p-4 rounded-2xl">
                <p className="text-sm text-secondary/60 mb-1">Data ridicare/livrare</p>
                <p className={`font-bold text-secondary text-lg ${pickupDateClass}`}>
                  {formatBucharestDate(order.pickupDate)}
                  {order.pickupTime && ` — ${order.pickupTime}`}
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

          {/* Photos */}
          {order.photos.filter(p => !p.isFoaieDeZahar).length > 0 && (
            <div className="card-neumorphic space-y-4 lg:col-span-2">
              <h2 className="text-3xl font-bold text-gradient mb-6">📸 Poze încărcate ({order.photos.filter(p => !p.isFoaieDeZahar).length})</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {order.photos.filter(p => !p.isFoaieDeZahar).map((photo, index) => (
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

        {/* PDF Download and Foaie de Zahar Download */}
        <div className="mt-12 flex justify-center gap-4 flex-wrap">
          <button
            onClick={handleDownloadPDF}
            className="btn-active px-12 py-6 rounded-3xl font-bold text-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descarcă PDF
          </button>
          {order.photos.some(p => p.isFoaieDeZahar) && (
            <button
              onClick={handleDownloadFoaieDeZahar}
              className="bg-yellow-500/20 border-2 border-yellow-500/50 px-12 py-6 rounded-3xl font-bold text-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3 text-yellow-600"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              📄 Descarcă Foaie de Zahar
            </button>
          )}
        </div>

        {/* Print confirmation modal */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-md w-full p-8 animate-float">
              <div className="text-center mb-6">
                {!printResult ? (
                  <>
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4">
                      {sendingEmail ? (
                        <svg className="animate-spin h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <span className="text-4xl">🖨️</span>
                      )}
                    </div>
                    <h3 className="text-3xl font-bold text-gradient mb-4">
                      {sendingEmail ? 'Se trimite...' : 'Trimite comanda pe email'}
                    </h3>
                    {!sendingEmail && (
                      <p className="text-secondary/80 text-lg">
                        Comanda <span className="font-bold text-secondary">#{order.orderNumber}</span> va fi generată ca PDF și trimisă pe email.
                      </p>
                    )}
                  </>
                ) : printResult.type === 'success' ? (
                  <>
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold text-gradient mb-4">Trimis cu succes!</h3>
                    <p className="text-secondary/80 text-lg">{printResult.message}</p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-4">
                      <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold text-gradient mb-4">Eroare</h3>
                    <p className="text-secondary/80 text-lg">{printResult.message}</p>
                  </>
                )}
              </div>
              <div className="flex gap-4 mt-8">
                {!printResult && !sendingEmail && (
                  <button
                    onClick={handleConfirmSendEmail}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all"
                  >
                    ✓ Trimite
                  </button>
                )}
                <button
                  onClick={() => setShowPrintModal(false)}
                  disabled={sendingEmail}
                  className="flex-1 btn-neumorphic px-6 py-4 rounded-2xl font-bold text-secondary hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {printResult ? 'Închide' : '✕ Anulează'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit order modal - aligned with site modals, no horizontal scroll */}
        {showEditModal && (
          <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto overflow-x-hidden">
            <div className="glass-card w-full max-w-lg my-8 p-8 overflow-hidden flex flex-col max-h-[90vh]">
              <h3 className="text-2xl font-bold text-gradient mb-6 shrink-0">Editează comanda</h3>
              <div className="space-y-6 overflow-y-auto overflow-x-hidden min-w-0 pr-1">
                <div>
                  <h4 className="text-lg font-bold text-secondary mb-3">📦 Detalii comandă</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Client *</label>
                      <input
                        type="text"
                        value={editForm.clientName ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, clientName: e.target.value }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Telefon *</label>
                      <input
                        type="text"
                        value={editForm.phoneNumber ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                        placeholder="07..."
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Locație preluare</label>
                      <input
                        type="text"
                        value={editForm.createdByUsername ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, createdByUsername: e.target.value }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Livrare *</label>
                      <select
                        value={editForm.deliveryMethod ?? 'ridicare'}
                        onChange={(e) => setEditForm((f) => ({ ...f, deliveryMethod: e.target.value }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      >
                        <option value="ridicare">Ridicare</option>
                        <option value="livrare">Livrare</option>
                      </select>
                    </div>
                    {(editForm.deliveryMethod === 'ridicare') && (
                      <div className="min-w-0">
                        <label className="block text-sm font-medium text-secondary/80 mb-1">Locație ridicare</label>
                        <input
                          type="text"
                          value={editForm.location ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                          className="input-neumorphic w-full text-secondary min-w-0"
                          placeholder="ex: TIMKEN, WINMARKT"
                        />
                      </div>
                    )}
                    {(editForm.deliveryMethod === 'livrare') && (
                      <div className="sm:col-span-2 min-w-0">
                        <label className="block text-sm font-medium text-secondary/80 mb-1">Adresă livrare</label>
                        <input
                          type="text"
                          value={editForm.address ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                          className="input-neumorphic w-full text-secondary min-w-0"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Preia comanda *</label>
                      <input
                        type="text"
                        value={editForm.staffName ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, staffName: e.target.value }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Data ridicare/livrare *</label>
                      <input
                        type="date"
                        value={editForm.pickupDate ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, pickupDate: e.target.value }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Ora (opțional)</label>
                      <input
                        type="text"
                        value={editForm.pickupTime ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, pickupTime: e.target.value }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                        placeholder="ex: 14:00"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Avans (RON)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.advance ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, advance: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-secondary mb-3">🎂 Detalii tort</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Tip tort</label>
                      <select
                        value={editForm.cakeType ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, cakeType: e.target.value || undefined }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      >
                        <option value="">— Selectează —</option>
                        {cakeTypes.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Greutate</label>
                      <select
                        value={editForm.weight ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value || undefined }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      >
                        <option value="">— Selectează —</option>
                        {weights.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Formă</label>
                      <select
                        value={editForm.shape ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, shape: e.target.value || undefined }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      >
                        <option value="">— Selectează —</option>
                        {shapes.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Etaje</label>
                      <select
                        value={editForm.floors ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, floors: e.target.value || undefined }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      >
                        <option value="">— Selectează —</option>
                        {floors.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Alte produse</label>
                      <textarea
                        value={editForm.otherProducts ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, otherProducts: e.target.value }))}
                        className="input-neumorphic w-full text-secondary min-h-[80px] min-w-0"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-secondary mb-3">🎨 Detalii decor</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Îmbrăcăminte</label>
                      <select
                        value={editForm.coating ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, coating: e.target.value || undefined }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      >
                        <option value="">— Selectează —</option>
                        {coatings.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Culoare 1</label>
                      <select
                        value={Array.isArray(editForm.colors) ? (editForm.colors[0] ?? '') : ''}
                        onChange={(e) => {
                          const v = e.target.value
                          const current = Array.isArray(editForm.colors) ? editForm.colors : []
                          const next = v ? [v, current[1]].filter(Boolean) : (current[1] ? [current[1]] : [])
                          setEditForm((f) => ({ ...f, colors: next }))
                        }}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      >
                        <option value="">— Selectează —</option>
                        {colorOptions.map((opt) => (
                          <option key={opt.name} value={opt.name}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Culoare 2</label>
                      <select
                        value={Array.isArray(editForm.colors) ? (editForm.colors[1] ?? '') : ''}
                        onChange={(e) => {
                          const v = e.target.value
                          const current = Array.isArray(editForm.colors) ? editForm.colors : []
                          const next = v ? [current[0], v].filter(Boolean) : (current[0] ? [current[0]] : [])
                          setEditForm((f) => ({ ...f, colors: next }))
                        }}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      >
                        <option value="">— Selectează —</option>
                        {colorOptions.map((opt) => (
                          <option key={opt.name} value={opt.name}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Tip decor</label>
                      <select
                        value={editForm.decorType ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, decorType: e.target.value || undefined }))}
                        className="input-neumorphic w-full text-secondary min-w-0"
                      >
                        <option value="">— Selectează —</option>
                        {decorTypes.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Detalii decor</label>
                      <textarea
                        value={editForm.decorDetails ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, decorDetails: e.target.value }))}
                        className="input-neumorphic w-full text-secondary min-h-[80px] min-w-0"
                        rows={2}
                      />
                    </div>
                    <div className="sm:col-span-2 min-w-0">
                      <label className="block text-sm font-medium text-secondary/80 mb-1">Observații</label>
                      <textarea
                        value={editForm.observations ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, observations: e.target.value }))}
                        className="input-neumorphic w-full text-secondary min-h-[80px] min-w-0"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-6 shrink-0">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 btn-active px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all disabled:opacity-50"
                >
                  {saving ? 'Se salvează...' : '✓ Salvează'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="btn-neumorphic px-6 py-4 rounded-2xl font-bold text-secondary hover:scale-105 transition-all disabled:opacity-50"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminOrderView
