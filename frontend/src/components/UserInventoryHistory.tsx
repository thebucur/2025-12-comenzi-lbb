import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyInventories, Inventory } from '../services/inventory.api'
import api from '../services/api'
import { formatBucharestDate, toBucharestDateString } from '../utils/date'

function UserInventoryHistory() {
  const navigate = useNavigate()
  const [inventories, setInventories] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const username = localStorage.getItem('authToken') || 'Utilizator'

  useEffect(() => {
    fetchInventories()
  }, [])

  const fetchInventories = async () => {
    try {
      const data = await getMyInventories()
      setInventories(data)
    } catch (error) {
      console.error('Error fetching inventories:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async (inventory: Inventory) => {
    if (!inventory.pdfPath) return
    setDownloadingId(inventory.id)
    try {
      const response = await api.get(`/inventory/pdf/${inventory.id}`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const dateStr = toBucharestDateString(inventory.date)
      link.download = `inventar-${inventory.username}-${dateStr}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download PDF:', error)
    } finally {
      setDownloadingId(null)
    }
  }

  const getEntrySummary = (inventory: Inventory): number => {
    return inventory.entries.length
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
            <h1 className="text-3xl sm:text-5xl font-bold text-gradient">Istoric inventar {username}</h1>
            <p className="text-secondary/70 text-sm sm:text-base mt-2">Inventarele din ultimele 5 zile.</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn-neumorphic px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all duration-300 text-sm sm:text-base"
          >
            ← Înapoi
          </button>
        </div>

        <div className="card-neumorphic overflow-hidden">
          {inventories.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-2xl font-bold text-secondary/50">Nu există inventare</p>
              <p className="text-secondary/60 mt-2">Inventarele din ultimele 5 zile vor apărea aici</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="px-3 py-3 text-left font-bold text-secondary text-xs sm:text-sm">Data</th>
                    <th className="px-3 py-3 text-left font-bold text-secondary text-xs sm:text-sm">Ora trimiterii</th>
                    <th className="px-3 py-3 text-left font-bold text-secondary text-xs sm:text-sm">Produse</th>
                    <th className="px-3 py-3 text-left font-bold text-secondary text-xs sm:text-sm">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/25 border-y border-primary/30">
                  {inventories.map((inventory) => {
                    const dateFormatted = formatBucharestDate(inventory.date, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                    const dateFormattedMobile = (() => {
                      const d = new Date(inventory.date)
                      const day = d.getDate()
                      const month = d.getMonth() + 1
                      return `${day}.${month.toString().padStart(2, '0')}`
                    })()
                    const submittedTime = inventory.submittedAt
                      ? new Date(inventory.submittedAt).toLocaleTimeString('ro-RO', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Bucharest',
                        })
                      : '-'
                    const productCount = getEntrySummary(inventory)

                    return (
                      <tr
                        key={inventory.id}
                        className="hover:bg-accent-pink/25 transition-colors duration-150"
                      >
                        <td className="px-3 py-4 font-bold text-secondary text-xs sm:text-sm">
                          <span className="md:hidden">{dateFormattedMobile}</span>
                          <span className="hidden md:inline">{dateFormatted}</span>
                        </td>
                        <td className="px-3 py-4 text-secondary text-xs sm:text-sm">{submittedTime}</td>
                        <td className="px-3 py-4 text-secondary text-xs sm:text-sm">{productCount} produse</td>
                        <td className="px-3 py-4">
                          {inventory.pdfPath ? (
                            <button
                              onClick={() => downloadPDF(inventory)}
                              disabled={downloadingId === inventory.id}
                              className="px-3 py-1.5 rounded-lg bg-accent-purple/80 hover:bg-accent-purple text-white font-bold text-xs transition-all duration-300 disabled:opacity-50"
                            >
                              {downloadingId === inventory.id ? (
                                <span className="flex items-center gap-1">
                                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  ...
                                </span>
                              ) : (
                                'PDF'
                              )}
                            </button>
                          ) : (
                            <span className="text-secondary/40 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserInventoryHistory
