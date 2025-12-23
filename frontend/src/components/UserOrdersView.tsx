import { useEffect, useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getDateRecencyClass } from '../utils/dateRecency'

interface Photo {
  id: string
  url: string
  path: string | null
  isFoaieDeZahar: boolean
  createdAt: string
}

interface Order {
  id: string
  orderNumber: number
  clientName: string
  phoneNumber: string
  deliveryMethod: string
  location: string | null
  pickupDate: string
  staffName: string
  createdAt: string
  createdByUsername: string | null
  pickedUpBy?: {
    id: string
    username: string
  } | null
  photos?: Photo[]
}

function UserOrdersView() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const username = localStorage.getItem('authToken') || 'Utilizator'

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/my-orders')
      setOrders(response.data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group orders by date
  const groupOrdersByDate = (ordersList: Order[]) => {
    const grouped = new Map<string, Order[]>()
    
    ordersList.forEach((order) => {
      const date = new Date(order.createdAt)
      const dateKey = date.toLocaleDateString('ro-RO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)!.push(order)
    })
    
    // Sort orders within each group by createdAt descending (latest first)
    grouped.forEach((groupOrders) => {
      groupOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    })
    
    // Convert to array and sort by date descending (latest first)
    return Array.from(grouped.entries()).sort((a, b) => {
      const dateA = new Date(a[1][0].createdAt)
      const dateB = new Date(b[1][0].createdAt)
      return dateB.getTime() - dateA.getTime()
    })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary">
      <div className="absolute top-20 right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-12 gap-4">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold text-gradient">Comenzi {username}</h1>
            <p className="text-secondary/70 text-sm sm:text-base mt-2">Click pe comanda pentru detalii.</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn-neumorphic px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all duration-300 text-sm sm:text-base"
          >
            ← Înapoi
          </button>
        </div>

        {/* Orders List */}
        <div className="card-neumorphic overflow-hidden">
          {orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-2xl font-bold text-secondary/50">Nu există comenzi</p>
              <p className="text-secondary/60 mt-2">Comenzile sunt vizibile până la data livrării + 1 zi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="px-3 py-3 text-left font-bold text-secondary text-xs sm:text-sm">Nr.</th>
                    <th className="px-2 py-3 text-left font-bold text-secondary text-xs sm:text-sm">Nume</th>
                    <th className="px-3 py-3 text-left font-bold text-secondary text-xs sm:text-sm">Data comenzii</th>
                    <th className="px-3 py-3 text-left font-bold text-secondary text-xs sm:text-sm">Data livrării</th>
                    <th className="px-3 py-3 text-left font-bold text-secondary text-xs sm:text-sm">Preluat de</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/25 border-y border-primary/30">
                  {groupOrdersByDate(orders).map(([dateKey, dateOrders]) => (
                    <Fragment key={dateKey}>
                      <tr className="bg-transparent">
                        <td colSpan={5} className="px-4 py-3 text-left text-base sm:text-xl font-bold text-secondary">
                          {dateKey}
                        </td>
                      </tr>
                      {dateOrders.map((order) => {
                        // Format date without year: "DD MMMM" (e.g., "15 decembrie")
                        const formatDateWithoutYear = (dateString: string) => {
                          const date = new Date(dateString)
                          return date.toLocaleDateString('ro-RO', { 
                            day: 'numeric', 
                            month: 'long'
                          })
                        }
                        
                        const deliveryDate = order.pickupDate 
                          ? formatDateWithoutYear(order.pickupDate)
                          : '-'
                        const deliveryDateClass = getDateRecencyClass(order.pickupDate)
                        
                        const createdDate = order.createdAt 
                          ? formatDateWithoutYear(order.createdAt)
                          : '-'
                        const createdDateClass = getDateRecencyClass(order.createdAt)
                        
                        return (
                          <tr 
                            key={order.id} 
                            className="hover:bg-accent-pink/25 transition-colors duration-150 cursor-pointer active:bg-accent-pink/40"
                            onClick={() => navigate(`/my-orders/${order.id}`)}
                          >
                            <td className="px-3 py-3 font-bold text-accent-purple text-xs sm:text-sm">#{order.orderNumber}</td>
                            <td className="px-2 py-3 font-bold text-secondary text-xs sm:text-sm">{order.clientName}</td>
                            <td className={`px-3 py-3 text-secondary text-xs sm:text-sm ${createdDateClass}`}>{createdDate}</td>
                            <td className={`px-3 py-3 text-secondary text-xs sm:text-sm ${deliveryDateClass}`}>{deliveryDate}</td>
                            <td className="px-3 py-3 text-secondary text-xs sm:text-sm">{order.staffName || '-'}</td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserOrdersView

