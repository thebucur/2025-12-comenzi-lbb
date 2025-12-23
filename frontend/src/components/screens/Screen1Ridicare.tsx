import { useState, useEffect } from 'react'
import { useOrder } from '../../context/OrderContext'
import { Location } from '../../types/order.types'
import { getTodayString, toBucharestDateString } from '../../utils/date'

const locations: Location[] = ['TIMKEN', 'WINMARKT', 'AFI PLOIESTI', 'REPUBLICII', 'CARAIMAN']
const defaultStaffNames = ['ALINA', 'DANA', 'MIRELA', 'LIVIA']

function Screen1Ridicare() {
  const { order, updateOrder } = useOrder()
  const userId = localStorage.getItem('userId') || 'default'
  const staffNamesKey = `staffNames_${userId}`
  
  // Load staff names from localStorage for this user, or use defaults
  const [staffNames, setStaffNames] = useState<string[]>(() => {
    const savedStaffNames = localStorage.getItem(staffNamesKey)
    return savedStaffNames ? JSON.parse(savedStaffNames) : defaultStaffNames
  })
  
  const [showStaffSettings, setShowStaffSettings] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [showTomorrowAlert, setShowTomorrowAlert] = useState(false)
  
  // Save staff names to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(staffNamesKey, JSON.stringify(staffNames))
  }, [staffNames, staffNamesKey])

  const isTodayOrTomorrow = (date: string) => {
    const todayStr = getTodayString()
    const selectedDateStr = toBucharestDateString(date)
    
    // Get tomorrow's date in Bucharest timezone
    const todayDate = new Date(todayStr + 'T00:00:00')
    const tomorrowDate = new Date(todayDate)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrowStr = toBucharestDateString(tomorrowDate)
    
    return selectedDateStr === todayStr || selectedDateStr === tomorrowStr
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value
    updateOrder({ pickupDate: date })
    
    if (isTodayOrTomorrow(date) && !order.tomorrowVerification) {
      setShowTomorrowAlert(true)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.startsWith('07')) {
      value = value.substring(2)
    }
    if (value.length > 8) {
      value = value.substring(0, 8)
    }
    updateOrder({ phoneNumber: value })
  }

  const handleAddStaff = () => {
    if (newStaffName.trim() && !staffNames.includes(newStaffName.trim().toUpperCase())) {
      setStaffNames([...staffNames, newStaffName.trim().toUpperCase()])
      setNewStaffName('')
    }
  }

  const handleDeleteStaff = (name: string) => {
    setStaffNames(staffNames.filter(n => n !== name))
    if (order.staffName === name) {
      updateOrder({ staffName: null })
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h2 className="text-4xl font-bold text-center text-gradient mb-12">Ridicare / Livrare</h2>

      {/* Delivery Method Toggle */}
      <div className="card-neumorphic">
        <h3 className="text-xl font-bold text-secondary mb-6">📦 Metodă de primire</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => updateOrder({ deliveryMethod: 'ridicare' })}
            className={`p-8 rounded-3xl transition-all duration-300 ${
              order.deliveryMethod === 'ridicare'
                ? 'btn-active scale-105'
                : 'btn-neumorphic hover:scale-102'
            }`}
          >
            <div className="text-4xl mb-3">🏪</div>
            <div className="text-xl font-bold">Ridicare din cofetărie</div>
          </button>
          <button
            onClick={() => updateOrder({ deliveryMethod: 'livrare' })}
            className={`p-8 rounded-3xl transition-all duration-300 ${
              order.deliveryMethod === 'livrare'
                ? 'btn-active scale-105'
                : 'btn-neumorphic hover:scale-102'
            }`}
          >
            <div className="text-4xl mb-3">🚚</div>
            <div className="text-xl font-bold">Livrare la adresă</div>
          </button>
        </div>
      </div>

      {/* Location Grid (only for ridicare) */}
      {order.deliveryMethod === 'ridicare' && (
        <div className="card-neumorphic">
          <h3 className="text-xl font-bold text-secondary mb-6">📍 Locație ridicare</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {locations.map((location) => (
              <button
                key={location}
                onClick={() => updateOrder({ location })}
                className={`p-6 rounded-2xl font-bold transition-all duration-300 ${
                  order.location === location
                    ? 'btn-active scale-105'
                    : 'btn-neumorphic hover:scale-102'
                }`}
              >
                {location}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Address Collection (only for livrare) */}
      {order.deliveryMethod === 'livrare' && (
        <div className="card-neumorphic">
          <h3 className="text-xl font-bold text-secondary mb-6">📍 Adresă livrare</h3>
          <textarea
            value={order.address}
            onChange={(e) => updateOrder({ address: e.target.value })}
            placeholder="Introduceți adresa completă de livrare..."
            className="input-neumorphic w-full text-secondary placeholder:text-secondary/40 min-h-[120px]"
            rows={4}
          />
        </div>
      )}

      {/* Staff Grid */}
      <div className="card-neumorphic">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-secondary">👤 Preluată de</h3>
          <button
            onClick={() => setShowStaffSettings(true)}
            className="btn-neumorphic px-4 py-2 rounded-xl text-secondary hover:text-accent-purple transition-all hover:scale-105"
          >
            ⚙️ Setări
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {staffNames.map((name) => (
            <button
              key={name}
              onClick={() => updateOrder({ staffName: name })}
              className={`p-6 rounded-2xl font-bold transition-all duration-300 ${
                order.staffName === name
                  ? 'btn-active scale-105'
                  : 'btn-neumorphic hover:scale-102'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Settings Modal */}
      {showStaffSettings && (
        <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-8 animate-float">
            <h3 className="text-2xl font-bold text-gradient mb-6">Gestionare nume personal</h3>
            <div className="space-y-3 mb-6">
              {staffNames.map((name) => (
                <div key={name} className="flex items-center justify-between bg-primary/50 p-4 rounded-2xl">
                  <span className="font-semibold text-secondary">{name}</span>
                  <button
                    onClick={() => handleDeleteStaff(name)}
                    className="text-red-500 hover:text-red-600 font-bold transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Nume nou..."
                className="input-neumorphic flex-1 text-secondary placeholder:text-secondary/40"
                onKeyPress={(e) => e.key === 'Enter' && handleAddStaff()}
              />
              <button
                onClick={handleAddStaff}
                className="btn-active px-6 py-3 rounded-2xl font-bold"
              >
                + Adaugă
              </button>
            </div>
            <button
              onClick={() => setShowStaffSettings(false)}
              className="btn-neumorphic w-full py-3 rounded-2xl font-bold text-secondary hover:scale-102"
            >
              Închide
            </button>
          </div>
        </div>
      )}

      {/* Input Fields */}
      <div className="card-neumorphic space-y-6">
        <h3 className="text-xl font-bold text-secondary mb-6">ℹ️ Detalii client</h3>
        
        <div>
          <label className="block mb-3 font-bold text-secondary">
            Numele clientului <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={order.clientName}
            onChange={(e) => updateOrder({ clientName: e.target.value })}
            className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
            placeholder="Introduceți numele clientului..."
          />
        </div>

        <div>
          <label className="block mb-3 font-bold text-secondary">
            Număr de telefon <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="btn-neumorphic px-6 py-4 rounded-2xl font-bold text-secondary">07</div>
            <input
              type="text"
              value={order.phoneNumber}
              onChange={handlePhoneChange}
              className="input-neumorphic flex-1 text-secondary placeholder:text-secondary/40"
              placeholder="12345678"
              maxLength={8}
            />
          </div>
          {order.phoneNumber && order.phoneNumber.length < 8 && (
            <p className="mt-2 text-sm text-red-500 font-semibold">⚠️ Număr de telefon incomplet</p>
          )}
        </div>

        <div>
          <label className="block mb-3 font-bold text-secondary">
            Data ridicare/livrare <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={order.pickupDate}
            onChange={handleDateChange}
            onKeyDown={(e) => {
              // Block typing; allow navigation keys only
              const allowedKeys = ['Tab', 'Shift', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
              if (!allowedKeys.includes(e.key)) {
                e.preventDefault()
              }
            }}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onFocus={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
            inputMode="none"
            min={getTodayString()}
            className="input-neumorphic w-full text-secondary cursor-pointer"
          />
        </div>

        <div>
          <label className="block mb-3 font-bold text-secondary">💰 Avans (opțional)</label>
          <input
            type="number"
            value={order.advance || ''}
            onChange={(e) => updateOrder({ advance: e.target.value ? parseFloat(e.target.value) : null })}
            className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
            placeholder="0.00 RON"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Tomorrow Alert */}
      {showTomorrowAlert && (
        <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-8 animate-float">
            <div className="text-6xl text-center mb-6">⚠️</div>
            <h3 className="text-2xl font-bold text-center text-amber-600 mb-4">
              VERIFICAȚI DISPONIBILITATEA LIVRĂRII ÎN LABORATOR!
            </h3>
            <p className="text-center text-secondary/70 mb-6">
              Comanda este pentru astăzi sau mâine. Asigurați-vă că este fezabilă.
            </p>
            <button
              onClick={() => {
                updateOrder({ tomorrowVerification: true })
                setShowTomorrowAlert(false)
              }}
              className="btn-active w-full py-4 rounded-2xl font-bold text-lg"
            >
              ✓ AM VERIFICAT
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Screen1Ridicare
