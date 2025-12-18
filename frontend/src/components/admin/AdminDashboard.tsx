import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import api from '../../services/api'

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

interface User {
  id: string
  username: string
  createdAt: string
}

interface GlobalConfig {
  id: string
  category: string
  key: string
  value: unknown
  createdAt: string
}

interface ColorOption {
  name: string
  value: string
}

interface SortimentDecorManagerProps {
  category: 'sortiment' | 'decor'
  configs: GlobalConfig[]
  defaultItems: Record<string, string[] | ColorOption[]>
  onRefresh: () => void
}

function SortimentDecorManager({ category, configs, defaultItems, onRefresh }: SortimentDecorManagerProps) {
  const [newItemValue, setNewItemValue] = useState('')
  const [newColorName, setNewColorName] = useState('')
  const [showAddItem, setShowAddItem] = useState<string | null>(null)

  const getConfigByKey = (key: string) => {
    return configs.find((c) => c.key === key)
  }

  const getItems = (key: string): (string | ColorOption)[] => {
    const config = getConfigByKey(key)
    if (config && Array.isArray(config.value)) {
      return config.value as (string | ColorOption)[]
    }
    return defaultItems[key] || []
  }

  const getWeightSortValue = (weight: string) => {
    const match = weight.match(/[\d]+(?:[.,]\d+)?/)
    return match ? parseFloat(match[0].replace(',', '.')) : Number.POSITIVE_INFINITY
  }

  const sortItemsIfNeeded = (key: string, items: (string | ColorOption)[]) => {
    if (key !== 'weights') return items

    return [...items].sort((a, b) => {
      const aLabel = getItemDisplay(a)
      const bLabel = getItemDisplay(b)
      const diff = getWeightSortValue(aLabel) - getWeightSortValue(bLabel)
      return diff !== 0 ? diff : aLabel.localeCompare(bLabel)
    })
  }

  const isColorItem = (item: string | ColorOption): item is ColorOption => {
    return typeof item === 'object' && item !== null && 'name' in item && 'value' in item
  }

  const getItemDisplay = (item: string | ColorOption): string => {
    if (isColorItem(item)) {
      return item.name
    }
    return item
  }

  const getItemValue = (item: string | ColorOption): string => {
    if (isColorItem(item)) {
      return item.value
    }
    return item
  }

  const handleAddItem = async (key: string, item: string | ColorOption) => {
    if (key === 'colors') {
      const colorItem = item as ColorOption
      if (!colorItem.name?.trim() || !colorItem.value?.trim()) {
        alert('Numele și culoarea sunt obligatorii')
        return
      }
    } else {
      if (!item || (typeof item === 'string' && !item.trim())) return
    }

    const config = getConfigByKey(key)
    if (config) {
      // Add to existing config
      try {
        await api.post(`/config/global/${config.id}/items`, { item })
        onRefresh()
        setNewItemValue('')
        setNewColorName('')
        setShowAddItem(null)
      } catch (error) {
        console.error('Error adding item:', error)
        alert('Eroare la adăugarea elementului')
      }
    } else {
      // Create new config with this item
      try {
        const items = defaultItems[key] || []
        await api.post('/config/global', {
          category,
          key,
          value: [...items, item],
        })
        onRefresh()
        setNewItemValue('')
        setNewColorName('')
        setShowAddItem(null)
      } catch (error) {
        console.error('Error creating config:', error)
        alert('Eroare la crearea configurației')
      }
    }
  }

  const handleDeleteItem = async (key: string, item: string | ColorOption) => {
    const displayName = getItemDisplay(item)
    if (!confirm(`Sigur doriți să ștergeți "${displayName}"?`)) return

    const config = getConfigByKey(key)
    if (!config) return

    try {
      await api.post(`/config/global/${config.id}/items/delete`, { item })
      onRefresh()
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Eroare la ștergerea elementului')
    }
  }

  const handleInitializeConfig = async (key: string) => {
    const items = defaultItems[key] || []
    if (items.length === 0) return

    try {
      await api.post('/config/global', {
        category,
        key,
        value: items,
      })
      onRefresh()
    } catch (error) {
      console.error('Error initializing config:', error)
      alert('Eroare la inițializarea configurației')
    }
  }

  const getKeyLabel = (key: string) => {
    const labels: Record<string, string> = {
      cakeTypes: 'Tipuri torturi',
      weights: 'Greutăți',
      shapes: 'Forme',
      floors: 'Etaje',
      coatings: 'Îmbrăcăminte',
      colors: 'Culori',
      decorTypes: 'Tipuri decor',
    }
    return labels[key] || key
  }

  return (
    <div className="space-y-6">
      {Object.keys(defaultItems).map((key) => {
        const config = getConfigByKey(key)
        const items = getItems(key)
        const displayItems = sortItemsIfNeeded(key, items)
        const hasConfig = !!config

        return (
          <div key={key} className="bg-primary/30 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-bold text-secondary">{getKeyLabel(key)}</h4>
              {!hasConfig && (
                <button
                  onClick={() => handleInitializeConfig(key)}
                  className="btn-neumorphic px-4 py-2 rounded-xl font-bold text-secondary hover:scale-105 transition-all text-sm"
                >
                  Inițializează cu elementele implicite
                </button>
              )}
            </div>

            {hasConfig ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {displayItems.map((item, index) => {
                    const displayName = getItemDisplay(item)
                    const colorValue = key === 'colors' ? getItemValue(item) : null
                    return (
                      <div
                        key={index}
                        className="bg-primary/50 px-4 py-2 rounded-xl flex items-center gap-2 group"
                      >
                        {key === 'colors' && colorValue ? (
                          <div
                            className="w-6 h-6 rounded-full border-2 border-secondary/30"
                            style={{ backgroundColor: colorValue }}
                          />
                        ) : null}
                        <span className="text-secondary font-semibold">{displayName}</span>
                        <button
                          onClick={() => handleDeleteItem(key, item)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>

                {showAddItem === key ? (
                  <div className="space-y-2 mt-4">
                    {key === 'colors' ? (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newColorName}
                            onChange={(e) => setNewColorName(e.target.value)}
                            placeholder="Nume culoare (ex: ROȘU)"
                            className="input-neumorphic flex-1 text-secondary"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddItem(key, { name: newColorName, value: newItemValue })
                              }
                            }}
                          />
                          <input
                            type="color"
                            value={newItemValue}
                            onChange={(e) => setNewItemValue(e.target.value)}
                            className="w-16 h-10 rounded-xl cursor-pointer"
                            title="Selectați culoarea"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddItem(key, { name: newColorName, value: newItemValue })}
                            className="btn-active px-4 py-2 rounded-xl font-bold hover:scale-105 transition-all"
                          >
                            ✓ Adaugă
                          </button>
                          <button
                            onClick={() => {
                              setShowAddItem(null)
                              setNewItemValue('')
                              setNewColorName('')
                            }}
                            className="btn-neumorphic px-4 py-2 rounded-xl font-bold text-secondary hover:scale-105 transition-all"
                          >
                            ✕ Anulează
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newItemValue}
                          onChange={(e) => setNewItemValue(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddItem(key, newItemValue)
                            }
                          }}
                          className="input-neumorphic flex-1 text-secondary"
                          placeholder="Adaugă element nou"
                        />
                        <button
                          onClick={() => handleAddItem(key, newItemValue)}
                          className="btn-active px-4 py-2 rounded-xl font-bold hover:scale-105 transition-all"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setShowAddItem(null)
                            setNewItemValue('')
                          }}
                          className="btn-neumorphic px-4 py-2 rounded-xl font-bold text-secondary hover:scale-105 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowAddItem(key)
                      setNewItemValue(key === 'colors' ? '#FF0000' : '')
                      setNewColorName('')
                    }}
                    className="btn-neumorphic px-4 py-2 rounded-xl font-bold text-secondary hover:scale-105 transition-all mt-2"
                  >
                    + Adaugă element
                  </button>
                )}
              </div>
            ) : (
              <div className="text-secondary/60 text-sm">
                Configurația nu este inițializată. Folosiți butonul de mai sus pentru a o inițializa cu elementele implicite.
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'globalConfig'>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [globalConfigs, setGlobalConfigs] = useState<GlobalConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [isDownloading, setIsDownloading] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
  })

  const handleAdminLogout = () => {
    localStorage.removeItem('adminAuthToken')
    window.dispatchEvent(new Event('adminAuthChange'))
    navigate('/admin')
  }

  useEffect(() => {
    fetchOrders()
    if (activeTab === 'users') fetchUsers()
    if (activeTab === 'globalConfig') fetchGlobalConfigs()
  }, [activeTab])

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders')
      setOrders(response.data)
      
      // Debug: Log orders with foaie de zahar
      response.data.forEach((order: Order) => {
        const foaieDeZaharPhotos = order.photos?.filter(photo => photo.isFoaieDeZahar) || []
        if (foaieDeZaharPhotos.length > 0) {
          console.log(`Order #${order.orderNumber} has foaie de zahar:`, foaieDeZaharPhotos)
        }
      })
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadFoaieDeZahar = async (orderId: string, orderNumber: number) => {
    try {
      const response = await api.get(`/admin/orders/${orderId}/foaie-de-zahar`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `foaie-de-zahar-order-${orderNumber}.jpg`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading foaie de zahar:', err)
      alert('Eroare la descărcarea foii de zahar')
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchGlobalConfigs = async () => {
    try {
      const response = await api.get('/config/global')
      setGlobalConfigs(response.data)
    } catch (error) {
      console.error('Error fetching global configs:', error)
    }
  }


  const handleCreateUser = () => {
    setEditingUser(null)
    setUserFormData({ username: '', password: '' })
    setShowUserModal(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setUserFormData({ 
      username: user.username, 
      password: '', 
    })
    setShowUserModal(true)
  }

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        const userUpdateData: { username: string; password?: string } = {
          username: userFormData.username,
        }
        if (userFormData.password && userFormData.password.trim()) {
          userUpdateData.password = userFormData.password
        }
        await api.put(`/admin/users/${editingUser.id}`, userUpdateData)
      } else {
        if (!userFormData.username || !userFormData.password) {
          alert('Utilizatorul și parola sunt obligatorii')
          return
        }
        await api.post('/admin/users', {
          username: userFormData.username,
          password: userFormData.password,
        })
      }
      setShowUserModal(false)
      fetchUsers()
    } catch (error: unknown) {
      console.error('Error saving user:', error)
      if (axios.isAxiosError(error)) {
        const apiMessage = (error.response?.data as { error?: string } | undefined)?.error
        const errorMessage = apiMessage || 'Eroare la salvarea utilizatorului'
        alert(errorMessage)
      } else {
        alert('Eroare neașteptată la salvarea utilizatorului')
      }
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți acest utilizator?')) return
    try {
      await api.delete(`/admin/users/${id}`)
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Eroare la ștergerea utilizatorului')
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

  // Checkbox handlers
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  // Bulk PDF download
  const handleBulkDownloadPDFs = async () => {
    if (selectedOrders.size === 0) {
      alert('Selectați cel puțin o comandă pentru descărcare')
      return
    }

    setIsDownloading(true)

    try {
      const zip = new JSZip()
      const selectedOrderList = orders.filter((o) => selectedOrders.has(o.id))

      // Process each selected order
      for (const order of selectedOrderList) {
        try {
          // First, try to generate PDF if it doesn't exist
          try {
            await api.post(`/orders/${order.id}/generate-pdf`)
          } catch (error) {
            // PDF might already exist, continue
            console.log(`PDF generation for order ${order.orderNumber} skipped or already exists`)
          }

          // Download the PDF
          const pdfResponse = await api.get(`/orders/${order.id}/pdf`, {
            responseType: 'blob',
          })

          // Add to zip with proper filename
          const filename = `comanda-${order.orderNumber}.pdf`
          zip.file(filename, pdfResponse.data)
        } catch (error) {
          console.error(`Error processing order ${order.orderNumber}:`, error)
          // Continue with other orders even if one fails
        }
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // Download the zip file
      const url = window.URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `comenzi-${new Date().toISOString().split('T')[0]}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      // Clear selections
      setSelectedOrders(new Set())
    } catch (error) {
      console.error('Error downloading PDFs:', error)
      alert('Eroare la descărcarea PDF-urilor')
    } finally {
      setIsDownloading(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary">
      <div className="absolute top-20 right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-5xl font-bold text-gradient">Panou de administrare</h1>
          <button
            onClick={handleAdminLogout}
            className="btn-neumorphic px-6 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all duration-300"
          >
            ← Deconectare
          </button>
        </div>

        {/* Tabs */}
        <div className="card-neumorphic mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === 'orders'
                  ? 'btn-active scale-105'
                  : 'bg-primary/50 text-secondary hover:scale-102'
              }`}
            >
              📦 Comenzi
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === 'users'
                  ? 'btn-active scale-105'
                  : 'bg-primary/50 text-secondary hover:scale-102'
              }`}
            >
              👥 Utilizatori
            </button>
            <button
              onClick={() => setActiveTab('globalConfig')}
              className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === 'globalConfig'
                  ? 'btn-active scale-105'
                  : 'bg-primary/50 text-secondary hover:scale-102'
              }`}
            >
              ⚙️ Configurare Globală
            </button>
          </div>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Download Button */}
            {orders.length > 0 && (
              <div className="card-neumorphic flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-secondary">Comenzi</h2>
                  <p className="text-secondary/60">
                    {selectedOrders.size > 0 
                      ? `${selectedOrders.size} comandă${selectedOrders.size > 1 ? 'e' : ''} selectată${selectedOrders.size > 1 ? 'e' : ''}`
                      : 'Selectați comenzi pentru descărcare'}
                  </p>
                </div>
                <button
                  onClick={handleBulkDownloadPDFs}
                  disabled={selectedOrders.size === 0 || isDownloading}
                  className="btn-active px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? 'Se creează arhiva...' : 'DESCARCA PDF'}
                </button>
              </div>
            )}

            {/* Orders List */}
            <div className="card-neumorphic overflow-hidden">
              {orders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-2xl font-bold text-secondary/50">Nu există comenzi</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {groupOrdersByDate(orders).map(([dateKey, dateOrders]) => (
                    <div key={dateKey} className="mb-6 last:mb-0">
                      <h3 className="text-left text-xl font-bold text-secondary mb-3 px-4 pt-4">
                        {dateKey}
                      </h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-primary">
                            <th className="px-2 py-2 text-left font-bold text-secondary text-xs">Nt.</th>
                            <th className="px-2 py-2 text-left font-bold text-secondary text-xs">Client</th>
                            <th className="px-2 py-2 text-left font-bold text-secondary text-xs">Telefon</th>
                            <th className="px-2 py-2 text-left font-bold text-secondary text-xs">Livrare</th>
                            <th className="px-2 py-2 text-left font-bold text-secondary text-xs">Livrare pe</th>
                            <th className="px-2 py-2 text-left font-bold text-secondary text-xs">Preluat pe</th>
                            <th className="px-2 py-2 text-left font-bold text-secondary text-xs">Locatie</th>
                            <th className="px-2 py-2 text-left font-bold text-secondary text-xs w-12">
                              <input
                                type="checkbox"
                                checked={dateOrders.every((o) => selectedOrders.has(o.id)) && dateOrders.length > 0}
                                onChange={() => {
                                  const allSelected = dateOrders.every((o) => selectedOrders.has(o.id))
                                  if (allSelected) {
                                    setSelectedOrders((prev) => {
                                      const newSet = new Set(prev)
                                      dateOrders.forEach((o) => newSet.delete(o.id))
                                      return newSet
                                    })
                                  } else {
                                    setSelectedOrders((prev) => {
                                      const newSet = new Set(prev)
                                      dateOrders.forEach((o) => newSet.add(o.id))
                                      return newSet
                                    })
                                  }
                                }}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </th>
                            <th className="px-2 py-2 text-left font-bold text-secondary text-xs">Detalii</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dateOrders.map((order) => {
                            const deliveryText = order.deliveryMethod === 'ridicare' 
                              ? `Ridicare din ${order.location || 'N/A'}`
                              : 'Livrare la adresa'
                            
                            const deliveryDate = order.pickupDate 
                              ? new Date(order.pickupDate).toLocaleDateString('ro-RO')
                              : '-'
                            
                            const createdDate = order.createdAt 
                              ? new Date(order.createdAt).toLocaleDateString('ro-RO')
                              : '-'
                            
                            // Check if any photo has isFoaieDeZahar set to true (explicitly check for true)
                            const hasFoaieDeZahar = order.photos?.some(photo => photo.isFoaieDeZahar === true) || false
                            
                            return (
                              <tr key={order.id} className="border-b border-primary/30 hover:bg-primary/30 transition-colors">
                                <td className="px-2 py-2 font-bold text-accent-purple text-xs">#{order.orderNumber}</td>
                                <td className="px-2 py-2 text-secondary text-xs">{order.clientName}</td>
                                <td className="px-2 py-2 text-secondary text-xs">07{order.phoneNumber}</td>
                                <td className="px-2 py-2 text-secondary text-xs">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block ${
                                    order.deliveryMethod === 'ridicare' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {deliveryText}
                                  </span>
                                </td>
                                <td className="px-2 py-2 text-secondary text-xs">{deliveryDate}</td>
                                <td className="px-2 py-2 text-secondary text-xs">{createdDate}</td>
                                <td className="px-2 py-2 text-secondary text-xs">{order.createdByUsername || order.staffName || '-'}</td>
                                <td className="px-2 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedOrders.has(order.id)}
                                    onChange={() => handleSelectOrder(order.id)}
                                    className="w-4 h-4 cursor-pointer"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex gap-2 items-center">
                                    <button
                                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                                      className="btn-active px-2 py-1 rounded-lg text-xs font-bold hover:scale-105 transition-all"
                                    >
                                      Vezi
                                    </button>
                                    {hasFoaieDeZahar && (
                                      <button
                                        onClick={() => handleDownloadFoaieDeZahar(order.id, order.orderNumber)}
                                        className="bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded-lg text-xs font-bold hover:scale-105 transition-all text-yellow-600"
                                        title="Descarcă foaie de zahar"
                                      >
                                        📄
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Loading Overlay */}
            {isDownloading && (
              <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="glass-card p-8 animate-float">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink shadow-glow-purple mb-4 animate-float">
                      <svg className="animate-spin h-10 w-10 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-gradient">Se creează arhiva PDF...</p>
                    <p className="text-secondary/60 mt-2">Vă rugăm să așteptați</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="card-neumorphic flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-secondary">Gestionare utilizatori</h2>
                <p className="text-secondary/60">Administrează utilizatorii platformei</p>
              </div>
              <button
                onClick={handleCreateUser}
                className="btn-active px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all"
              >
                + Adaugă utilizator
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <div key={user.id} className="card-neumorphic hover:scale-105 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink shadow-glow-purple flex items-center justify-center text-white text-2xl font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-secondary">{user.username}</h3>
                    </div>
                  </div>
                  <div className="bg-primary/50 p-3 rounded-xl mb-4">
                    <p className="text-sm text-secondary/60">Creat</p>
                    <p className="font-bold text-secondary">
                      {new Date(user.createdAt).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="flex-1 btn-neumorphic px-4 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
                    >
                      ✏️ Editează
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="px-4 py-3 bg-red-100 text-red-600 rounded-2xl font-bold hover:scale-105 transition-all shadow-neumorphic"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Config Tab */}
        {activeTab === 'globalConfig' && (
          <div className="space-y-6">
            <div className="card-neumorphic">
              <h2 className="text-2xl font-bold text-secondary mb-2">Configurație globală</h2>
              <p className="text-secondary/60">Gestionează elementele disponibile pentru sortiment și decor</p>
            </div>

            <div className="space-y-6">
              {/* Sortiment Section */}
              <div className="card-neumorphic">
                <h3 className="text-2xl font-bold text-gradient mb-6">🎂 Sortiment</h3>
                <SortimentDecorManager
                  category="sortiment"
                  configs={globalConfigs.filter((c) => c.category === 'sortiment')}
                  defaultItems={{
                    cakeTypes: [
                      'MOUSSE DE CIOCOLATĂ NEAGRĂ',
                      'MOUSSE DE FRUCTE',
                      'MOUSSE DE VANILIE',
                      'MOUSSE DE CAFEA',
                      'MOUSSE DE LĂMÂIE',
                      'MOUSSE DE COCO',
                      'MOUSSE DE MENTĂ',
                      'MOUSSE DE ZMEURĂ',
                      'MOUSSE DE CĂPȘUNI',
                      'MOUSSE DE ANANAS',
                      'MOUSSE DE MANGOSTEEN',
                      'MOUSSE DE PISTACHIO',
                      'MOUSSE DE CARAMEL',
                      'MOUSSE DE BANANĂ',
                      'MOUSSE DE CIREȘE',
                      'MOUSSE DE PORTOCALĂ',
                      'MOUSSE DE MIRABELLE',
                      'ALT TIP',
                    ],
                    weights: ['1 KG', '1.5 KG', '2 KG', '2.5 KG', '3 KG', 'ALTĂ GREUTATE'],
                    shapes: ['ROTUND', 'DREPTUNGHIULAR', 'ALTĂ FORMĂ'],
                    floors: ['1', '2', '3', '4', '5'],
                  }}
                  onRefresh={fetchGlobalConfigs}
                />
              </div>

              {/* Decor Section */}
              <div className="card-neumorphic">
                <h3 className="text-2xl font-bold text-gradient mb-6">🎨 Decor</h3>
                <SortimentDecorManager
                  category="decor"
                  configs={globalConfigs.filter((c) => c.category === 'decor')}
                  defaultItems={{
                    coatings: ['GLAZURĂ', 'FRIȘCĂ', 'CREMĂ', 'NAKED', 'DOAR CAPAC'],
                    colors: [
                      { name: 'ROȘU', value: '#FF0000' },
                      { name: 'ROZ', value: '#FF69B4' },
                      { name: 'ROZ ÎNCHIS', value: '#FF1493' },
                      { name: 'PORTOCALIU', value: '#FF6347' },
                      { name: 'GALBEN', value: '#FFD700' },
                      { name: 'PORTOCALIU DESCHIS', value: '#FFA500' },
                      { name: 'VERDE', value: '#32CD32' },
                      { name: 'TURCOAZ', value: '#00CED1' },
                      { name: 'ALBASTRU', value: '#0000FF' },
                      { name: 'VIOLET', value: '#8A2BE2' },
                      { name: 'ALB', value: '#FFFFFF' },
                      { name: 'NEGRU', value: '#000000' },
                    ],
                    decorTypes: ['SIMPLU', 'MEDIU', 'COMPLEX', 'PREMIUM'],
                  }}
                  onRefresh={fetchGlobalConfigs}
                />
              </div>
            </div>
          </div>
        )}

        {/* User Modal */}
        {showUserModal && (
          <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-md w-full p-8 animate-float">
              <h3 className="text-3xl font-bold text-gradient mb-6">
                {editingUser ? 'Editează utilizator' : 'Adaugă utilizator'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-3 font-bold text-secondary">Utilizator *</label>
                  <input
                    type="text"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                    placeholder="nume_utilizator"
                  />
                </div>
                <div>
                  <label className="block mb-3 font-bold text-secondary">
                    {editingUser ? 'Parolă nouă (lăsați gol pentru a păstra)' : 'Parolă *'}
                  </label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleSaveUser}
                  className="flex-1 btn-active px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all"
                >
                  ✓ Salvează
                </button>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="btn-neumorphic px-6 py-4 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
                >
                  ✕ Anulează
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default AdminDashboard
