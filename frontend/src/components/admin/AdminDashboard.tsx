import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

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
  installation?: {
    id: string
    name: string
  }
}

interface Installation {
  id: string
  name: string
  location: string | null
  email: string | null
  settings: any
  createdAt: string
}

interface User {
  id: string
  username: string
  installationId: string
  installation: Installation
  createdAt: string
}

interface GlobalConfig {
  id: string
  category: string
  key: string
  value: any
  createdAt: string
}

interface SortimentDecorManagerProps {
  category: 'sortiment' | 'decor'
  configs: GlobalConfig[]
  defaultItems: Record<string, string[]>
  onRefresh: () => void
}

function SortimentDecorManager({ category, configs, defaultItems, onRefresh }: SortimentDecorManagerProps) {
  const [newItemValue, setNewItemValue] = useState('')
  const [showAddItem, setShowAddItem] = useState<string | null>(null)

  const getConfigByKey = (key: string) => {
    return configs.find((c) => c.key === key)
  }

  const getItems = (key: string): string[] => {
    const config = getConfigByKey(key)
    if (config && Array.isArray(config.value)) {
      return config.value as string[]
    }
    return defaultItems[key] || []
  }

  const handleAddItem = async (key: string, item: string) => {
    if (!item.trim()) return

    const config = getConfigByKey(key)
    if (config) {
      // Add to existing config
      try {
        await api.post(`/config/global/${config.id}/items`, { item: item.trim() })
        onRefresh()
        setNewItemValue('')
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
          value: [...items, item.trim()],
        })
        onRefresh()
        setNewItemValue('')
        setShowAddItem(null)
      } catch (error) {
        console.error('Error creating config:', error)
        alert('Eroare la crearea configurației')
      }
    }
  }

  const handleDeleteItem = async (key: string, item: string) => {
    if (!confirm(`Sigur doriți să ștergeți "${item}"?`)) return

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
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="bg-primary/50 px-4 py-2 rounded-xl flex items-center gap-2 group"
                    >
                      {key === 'colors' ? (
                        <div
                          className="w-6 h-6 rounded-full border-2 border-secondary/30"
                          style={{ backgroundColor: item }}
                        />
                      ) : null}
                      <span className="text-secondary font-semibold">{item}</span>
                      <button
                        onClick={() => handleDeleteItem(key, item)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {showAddItem === key ? (
                  <div className="flex gap-2 mt-4">
                    <input
                      type={key === 'colors' ? 'color' : 'text'}
                      value={newItemValue}
                      onChange={(e) => setNewItemValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddItem(key, newItemValue)
                        }
                      }}
                      className="input-neumorphic flex-1 text-secondary"
                      placeholder={key === 'colors' ? 'Selectați culoarea' : 'Adaugă element nou'}
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
                ) : (
                  <button
                    onClick={() => {
                      setShowAddItem(key)
                      setNewItemValue('')
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
  const [activeTab, setActiveTab] = useState<'orders' | 'installations' | 'users' | 'globalConfig'>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [installations, setInstallations] = useState<Installation[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [globalConfigs, setGlobalConfigs] = useState<GlobalConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [filterInstallation, setFilterInstallation] = useState('')
  const [showUserModal, setShowUserModal] = useState(false)
  const [showInstallationModal, setShowInstallationModal] = useState(false)
  const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    email: '',
  })
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    location: '',
    email: '',
  })

  useEffect(() => {
    fetchOrders()
    fetchInstallations()
    if (activeTab === 'users') fetchUsers()
    if (activeTab === 'globalConfig') fetchGlobalConfigs()
  }, [activeTab])

  const fetchOrders = async () => {
    try {
      const params: any = {}
      if (filterDate) {
        params.startDate = filterDate
        params.endDate = filterDate
      }
      if (filterInstallation) {
        params.installationId = filterInstallation
      }
      const response = await api.get('/orders', { params })
      setOrders(response.data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInstallations = async () => {
    try {
      const response = await api.get('/admin/installations')
      setInstallations(response.data)
    } catch (error) {
      console.error('Error fetching installations:', error)
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

  useEffect(() => {
    fetchOrders()
  }, [filterDate, filterInstallation])

  const handleEditInstallation = (installation: Installation) => {
    setEditingInstallation(installation)
    setFormData({
      name: installation.name,
      location: installation.location || '',
      email: installation.email || '',
    })
  }

  const handleSaveInstallation = async () => {
    if (!editingInstallation) return
    try {
      await api.put(`/admin/installations/${editingInstallation.id}`, formData)
      setEditingInstallation(null)
      fetchInstallations()
    } catch (error) {
      console.error('Error saving installation:', error)
      alert('Eroare la salvarea instalației')
    }
  }

  const handleDeleteInstallation = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți această instalație?')) return
    try {
      await api.delete(`/admin/installations/${id}`)
      fetchInstallations()
    } catch (error) {
      console.error('Error deleting installation:', error)
      alert('Eroare la ștergerea instalației')
    }
  }

  const handleCreateUser = () => {
    setEditingUser(null)
    setUserFormData({ username: '', password: '', location: '', email: '' })
    setShowUserModal(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setUserFormData({ 
      username: user.username, 
      password: '', 
      location: user.installation.location || '',
      email: user.installation.email || ''
    })
    setShowUserModal(true)
  }

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        const userUpdateData: any = {
          username: userFormData.username,
        }
        if (userFormData.password && userFormData.password.trim()) {
          userUpdateData.password = userFormData.password
        }
        await api.put(`/admin/users/${editingUser.id}`, userUpdateData)
        await api.put(`/admin/installations/${editingUser.installationId}`, {
          name: userFormData.username,
          location: userFormData.location || null,
          email: userFormData.email || null,
        })
      } else {
        if (!userFormData.username || !userFormData.password) {
          alert('Utilizatorul și parola sunt obligatorii')
          return
        }
        await api.post('/admin/users', {
          username: userFormData.username,
          password: userFormData.password,
          location: userFormData.location || null,
          email: userFormData.email || null,
        })
        fetchInstallations()
      }
      setShowUserModal(false)
      fetchUsers()
    } catch (error: any) {
      console.error('Error saving user:', error)
      const errorMessage = error.response?.data?.error || 'Eroare la salvarea utilizatorului'
      alert(errorMessage)
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
            onClick={() => navigate('/login')}
            className="btn-neumorphic px-6 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all duration-300"
          >
            ← Înapoi
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
              onClick={() => setActiveTab('installations')}
              className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === 'installations'
                  ? 'btn-active scale-105'
                  : 'bg-primary/50 text-secondary hover:scale-102'
              }`}
            >
              🏪 Instalații
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
            {/* Filters */}
            <div className="card-neumorphic">
              <div className="flex flex-wrap gap-4">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="input-neumorphic flex-1 min-w-[200px] text-secondary"
                />
                <select
                  value={filterInstallation}
                  onChange={(e) => setFilterInstallation(e.target.value)}
                  className="input-neumorphic flex-1 min-w-[200px] text-secondary"
                >
                  <option value="">Toate instalațiile</option>
                  {installations.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setFilterDate('')
                    setFilterInstallation('')
                  }}
                  className="btn-neumorphic px-6 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
                >
                  🔄 Resetează
                </button>
              </div>
            </div>

            {/* Orders List */}
            <div className="card-neumorphic overflow-hidden">
              {orders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-2xl font-bold text-secondary/50">Nu există comenzi</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-primary">
                        <th className="px-6 py-4 text-left font-bold text-secondary">Nr.</th>
                        <th className="px-6 py-4 text-left font-bold text-secondary">Client</th>
                        <th className="px-6 py-4 text-left font-bold text-secondary">Telefon</th>
                        <th className="px-6 py-4 text-left font-bold text-secondary">Metodă</th>
                        <th className="px-6 py-4 text-left font-bold text-secondary">Locație</th>
                        <th className="px-6 py-4 text-left font-bold text-secondary">Data</th>
                        <th className="px-6 py-4 text-left font-bold text-secondary">Instalație</th>
                        <th className="px-6 py-4 text-left font-bold text-secondary">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-primary/30 hover:bg-primary/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-accent-purple">#{order.orderNumber}</td>
                          <td className="px-6 py-4 text-secondary">{order.clientName}</td>
                          <td className="px-6 py-4 text-secondary">07{order.phoneNumber}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              order.deliveryMethod === 'ridicare' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {order.deliveryMethod === 'ridicare' ? '🏪 Ridicare' : '🚚 Livrare'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-secondary">{order.location || '-'}</td>
                          <td className="px-6 py-4 text-secondary">
                            {new Date(order.pickupDate).toLocaleDateString('ro-RO')}
                          </td>
                          <td className="px-6 py-4 text-secondary">{order.installation?.name || '-'}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => navigate(`/admin/orders/${order.id}`)}
                              className="btn-active px-4 py-2 rounded-xl font-bold hover:scale-105 transition-all"
                            >
                              Vezi →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Installations Tab */}
        {activeTab === 'installations' && (
          <div className="space-y-6">
            <div className="card-neumorphic">
              <h2 className="text-2xl font-bold text-secondary mb-2">Gestionare instalații</h2>
              <p className="text-secondary/60">Instalațiile sunt create automat când se adaugă utilizatori noi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {installations.map((installation) => (
                <div key={installation.id} className="card-neumorphic hover:scale-105 transition-all duration-300">
                  <h3 className="text-2xl font-bold text-gradient mb-4">{installation.name}</h3>
                  <div className="space-y-3 mb-6">
                    {installation.location && (
                      <div className="bg-primary/50 p-3 rounded-xl">
                        <p className="text-sm text-secondary/60">Locație</p>
                        <p className="font-bold text-secondary">{installation.location}</p>
                      </div>
                    )}
                    {installation.email && (
                      <div className="bg-primary/50 p-3 rounded-xl">
                        <p className="text-sm text-secondary/60">Email</p>
                        <p className="font-bold text-secondary">{installation.email}</p>
                      </div>
                    )}
                    <div className="bg-primary/50 p-3 rounded-xl">
                      <p className="text-sm text-secondary/60">Creat</p>
                      <p className="font-bold text-secondary">
                        {new Date(installation.createdAt).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        handleEditInstallation(installation)
                        setShowInstallationModal(true)
                      }}
                      className="flex-1 btn-neumorphic px-4 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
                    >
                      ✏️ Editează
                    </button>
                    <button
                      onClick={() => handleDeleteInstallation(installation.id)}
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
                      <p className="text-sm text-secondary/60">{user.installation.name}</p>
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
                      '#FF0000', '#FF69B4', '#FF1493', '#FF6347',
                      '#FFD700', '#FFA500', '#32CD32', '#00CED1',
                      '#0000FF', '#8A2BE2', '#FFFFFF', '#000000',
                    ],
                    decorTypes: ['SIMPLU', 'MEDIU', 'COMPLEX', 'PREMIUM'],
                  }}
                  onRefresh={fetchGlobalConfigs}
                />
              </div>
            </div>
          </div>
        )}

        {/* Installation Modal */}
        {showInstallationModal && editingInstallation && (
          <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-md w-full p-8 animate-float">
              <h3 className="text-3xl font-bold text-gradient mb-6">Editează instalație</h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-3 font-bold text-secondary">Nume instalație *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                    placeholder="Ex: Cofetărie Centru"
                  />
                </div>
                <div>
                  <label className="block mb-3 font-bold text-secondary">Locație</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                    placeholder="Ex: București, Centru"
                  />
                </div>
                <div>
                  <label className="block mb-3 font-bold text-secondary">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                    placeholder="exemplu@email.com"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    handleSaveInstallation()
                    setShowInstallationModal(false)
                  }}
                  className="flex-1 btn-active px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all"
                >
                  ✓ Salvează
                </button>
                <button
                  onClick={() => {
                    setShowInstallationModal(false)
                    setEditingInstallation(null)
                  }}
                  className="btn-neumorphic px-6 py-4 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
                >
                  ✕ Anulează
                </button>
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
                {!editingUser && (
                  <>
                    <div>
                      <label className="block mb-3 font-bold text-secondary">Locație (opțional)</label>
                      <input
                        type="text"
                        value={userFormData.location}
                        onChange={(e) => setUserFormData({ ...userFormData, location: e.target.value })}
                        className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                        placeholder="Ex: București, Centru"
                      />
                    </div>
                    <div>
                      <label className="block mb-3 font-bold text-secondary">Email (opțional)</label>
                      <input
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                        placeholder="exemplu@email.com"
                      />
                    </div>
                  </>
                )}
                {editingUser && (
                  <>
                    <div>
                      <label className="block mb-3 font-bold text-secondary">Locație</label>
                      <input
                        type="text"
                        value={userFormData.location}
                        onChange={(e) => setUserFormData({ ...userFormData, location: e.target.value })}
                        className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                        placeholder="Ex: București, Centru"
                      />
                    </div>
                    <div>
                      <label className="block mb-3 font-bold text-secondary">Email</label>
                      <input
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                        placeholder="exemplu@email.com"
                      />
                    </div>
                  </>
                )}
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
