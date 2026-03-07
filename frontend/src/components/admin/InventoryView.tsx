import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { INVENTORY_CATEGORIES } from '../../constants/inventoryProducts'
import { formatBucharestDate, toBucharestDateString, getTodayString } from '../../utils/date'

function InventoryView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [inventory, setInventory] = useState<any>(null)
  const [inventoryCategories, setInventoryCategories] = useState<any[]>([])
  const [hideEmptyFields, setHideEmptyFields] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showPDFMissingPopup, setShowPDFMissingPopup] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printResult, setPrintResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    if (!id) {
      navigate('/dashboard?tab=inventory')
      return
    }

    const loadInventory = async () => {
      try {
        setLoading(true)
        
        // Load inventory data
        const inventoryResponse = await api.get(`/inventory/${id}`)
        setInventory(inventoryResponse.data)

        // Load categories
        try {
          const categoriesResponse = await api.get('/inventory-products/categories/public')
          const transformedCategories = categoriesResponse.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            units: cat.units,
            defaultUnit: cat.defaultUnit,
            displayOrder: cat.displayOrder || 0,
            products: cat.products.map((p: any) => p.name).sort()
          })).sort((a: any, b: any) => a.displayOrder - b.displayOrder)
          setInventoryCategories(transformedCategories)
        } catch (error) {
          console.error('Error loading categories, using fallback:', error)
          // Fallback to hardcoded categories
          const fallbackCategories = INVENTORY_CATEGORIES.map((cat, index) => ({
            id: cat.id,
            name: cat.name,
            units: cat.units,
            defaultUnit: cat.defaultUnit,
            displayOrder: index,
            products: cat.products
          }))
          setInventoryCategories(fallbackCategories)
        }
      } catch (error) {
        console.error('Error loading inventory:', error)
        alert('Eroare la încărcarea inventarului')
        navigate('/dashboard?tab=inventory')
      } finally {
        setLoading(false)
      }
    }

    loadInventory()
  }, [id, navigate])

  // Create a map of submitted entries by category and product name
  const submittedEntriesMap = new Map<string, Map<string, any>>()
  if (inventory?.entries) {
    inventory.entries.forEach((entry: any) => {
      if (!submittedEntriesMap.has(entry.category)) {
        submittedEntriesMap.set(entry.category, new Map())
      }
      submittedEntriesMap.get(entry.category)!.set(entry.productName, entry)
    })
  }

  // Format date as "DD.MM" (e.g., "22.12")
  const formatDateShort = (dateStr: string): string => {
    const date = new Date(dateStr)
    const day = date.getDate()
    const month = date.getMonth() + 1 // Month is 0-indexed, so add 1
    return `${day}.${month.toString().padStart(2, '0')}`
  }

  // Format unit abbreviations
  const formatUnit = (unit: string): string => {
    if (unit === 'tava') return 'tv'
    if (unit === 'platou') return 'plt'
    return unit
  }

  // Get date highlight color (same logic as PDF)
  const getDateHighlightColor = (dateInput?: string | Date | null): string | null => {
    if (!dateInput) return null

    const parsed = dateInput instanceof Date ? dateInput : new Date(dateInput)
    if (isNaN(parsed.getTime())) return null

    const todayStr = getTodayString()
    const targetStr = toBucharestDateString(parsed)
    const todayStart = new Date(todayStr + 'T00:00:00')
    const targetStart = new Date(targetStr + 'T00:00:00')

    const MS_PER_DAY = 24 * 60 * 60 * 1000
    const diffDays = Math.floor((todayStart.getTime() - targetStart.getTime()) / MS_PER_DAY)

    if (diffDays === 1) return '#ffff00' // yellow for yesterday
    if (diffDays >= 2) return '#ef4444' // red for two days ago or older
    return null
  }

  const handleDownloadPDF = async () => {
    if (!inventory) return
    try {
      const response = await api.get(`/inventory/pdf/${inventory.id}`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const dateStr = toBucharestDateString(inventory.date)
      link.download = `inventory-${inventory.username}-${dateStr}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Failed to download PDF:', error)
      // Check if error is 404 (PDF not found)
      if (error.response?.status === 404) {
        setShowPDFMissingPopup(true)
      } else {
        alert('Eroare la descărcarea PDF-ului')
      }
    }
  }

  const handleGeneratePDF = async () => {
    if (!inventory) return
    setIsGeneratingPDF(true)
    try {
      // Generate PDF
      await api.post(`/inventory/${inventory.id}/generate-pdf`)
      
      // Reload inventory to get updated PDF path
      const inventoryResponse = await api.get(`/inventory/${inventory.id}`)
      setInventory(inventoryResponse.data)
      
      // Close popup
      setShowPDFMissingPopup(false)
      
      // Download the newly generated PDF
      const response = await api.get(`/inventory/pdf/${inventory.id}`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const dateStr = toBucharestDateString(inventory.date)
      link.download = `inventory-${inventory.username}-${dateStr}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Eroare la generarea PDF-ului')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handlePrintClick = () => {
    setPrintResult(null)
    setShowPrintModal(true)
  }

  const handleConfirmSendEmail = async () => {
    if (!inventory) return
    setSendingEmail(true)
    try {
      await api.post(`/inventory/${inventory.id}/generate-pdf`, { sendEmail: true })
      const dateStr = toBucharestDateString(inventory.date)
      setPrintResult({ type: 'success', message: `Inventarul ${inventory.username} din ${dateStr} a fost trimis pe email cu succes!` })
    } catch (err: any) {
      console.error('Error sending inventory email:', err)
      setPrintResult({ type: 'error', message: err.response?.data?.error || 'Eroare la trimiterea inventarului pe email' })
    } finally {
      setSendingEmail(false)
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

  if (!inventory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-secondary">Inventarul nu a fost găsit</p>
          <button
            onClick={() => navigate('/dashboard?tab=inventory')}
            className="btn-active px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all mt-4"
          >
            ← Înapoi la Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary">
      <div className="absolute top-20 right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gradient">
            Inventar - {inventory.username} - {formatBucharestDate(inventory.date)}
          </h1>
          <button
            onClick={() => navigate('/dashboard?tab=inventory')}
            className="btn-neumorphic px-6 py-3 rounded-xl font-bold text-secondary hover:scale-105 transition-all"
          >
            ← Înapoi
          </button>
        </div>

        {/* Top Action Buttons */}
        <div className="card-neumorphic mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setHideEmptyFields(!hideEmptyFields)}
              className="btn-neumorphic px-4 py-2 rounded-xl font-bold text-secondary hover:scale-105 transition-all"
            >
              {hideEmptyFields ? 'ARATA TOATE CAMPURILE' : 'ASCUNDE CAMPURI GOALE'}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn-active px-4 py-2 rounded-xl font-bold hover:scale-105 transition-all"
            >
              DOWNLOAD PDF
            </button>
            <button
              onClick={handlePrintClick}
              className="bg-green-500/20 border-2 border-green-500/50 px-4 py-2 rounded-xl font-bold text-green-700 hover:scale-105 transition-all inline-flex items-center gap-2"
            >
              🖨️ PRINT
            </button>
          </div>
        </div>

        {/* Inventory Content - Table Format like PDF */}
        <div className="space-y-6">
          {inventoryCategories.length > 0 ? (
            inventoryCategories.map((category) => {
              const categoryName = category.name
              const categorySubmittedEntries = submittedEntriesMap.get(categoryName)

              // Get all products for this category
              const allProducts = category.products || []
              
              // Filter products based on hideEmptyFields
              const productsToShow = hideEmptyFields
                ? allProducts.filter((productName: string) => {
                    const submittedEntry = categorySubmittedEntries?.get(productName)
                    if (!submittedEntry) return false
                    const productEntries = Array.isArray(submittedEntry.entries) ? submittedEntry.entries : []
                    return productEntries.some((e: any) => 
                      (e.quantity && e.quantity > 0) || (e.requiredQuantity && e.requiredQuantity > 0)
                    )
                  })
                : allProducts

              if (productsToShow.length === 0) return null

              return (
                <div key={category.id} className="card-neumorphic">
                  {/* Category Header */}
                  <h4 className="text-lg font-bold text-red-600 mb-3">{categoryName}</h4>
                  
                  {/* Table Header */}
                  <div className="grid grid-cols-[40%_32%_28%] gap-2 mb-2 pb-2 border-b-2 border-primary/30">
                    <div className="font-bold text-secondary text-sm">PRODUS</div>
                    <div className="font-bold text-secondary text-sm text-center">INV</div>
                    <div className="font-bold text-secondary text-sm text-center">NEC</div>
                  </div>

                  {/* Products Table */}
                  <div className="space-y-1">
                    {productsToShow.map((productName: string) => {
                      const submittedEntry = categorySubmittedEntries?.get(productName)
                      const productEntries = submittedEntry && Array.isArray(submittedEntry.entries) 
                        ? submittedEntry.entries 
                        : []
                      
                      // Check if product has any data (quantity > 0 or requiredQuantity > 0)
                      const hasData = productEntries.some((e: any) => 
                        (e.quantity && e.quantity > 0) || (e.requiredQuantity && e.requiredQuantity > 0)
                      )
                      
                      // Filter entries based on hideEmptyFields
                      const entriesToShow = hideEmptyFields
                        ? productEntries.filter((e: any) => 
                            (e.quantity && e.quantity > 0) || (e.requiredQuantity && e.requiredQuantity > 0)
                          )
                        : productEntries.length > 0 
                          ? productEntries 
                          : [{ quantity: 0, requiredQuantity: 0, unit: category.defaultUnit }]

                      if (entriesToShow.length === 0) return null

                      return (
                        <div key={productName}>
                          {entriesToShow.map((entry: any, entryIdx: number) => {
                            const hasInventar = entry.quantity && entry.quantity > 0
                            const hasNecesar = entry.requiredQuantity && entry.requiredQuantity > 0
                            
                            // Build INV text and get highlight color
                            let invText = ''
                            const dateHighlight = hasInventar && entry.receptionDate 
                              ? getDateHighlightColor(entry.receptionDate) 
                              : null
                            
                            if (hasInventar && entry.receptionDate) {
                              const dateShort = formatDateShort(entry.receptionDate)
                              invText = `${dateShort}  ${entry.quantity} ${formatUnit(entry.unit || category.defaultUnit)}`
                            }
                            
                            // Build NEC text
                            const necText = hasNecesar 
                              ? `${entry.requiredQuantity} ${formatUnit(entry.requiredUnit || entry.unit || category.defaultUnit)}`
                              : ''

                            // Show product name only on first row
                            const showProductName = entryIdx === 0

                            // Determine text color based on highlight
                            const isRedHighlight = dateHighlight?.toLowerCase() === '#ef4444'
                            const invTextColor = dateHighlight ? (isRedHighlight ? '#FFFFFF' : '#000000') : ''
                            const invBgColor = dateHighlight || ''

                            return (
                              <div 
                                key={entryIdx}
                                className="grid grid-cols-[40%_32%_28%] gap-2 py-1 text-sm hover:bg-primary/10"
                                style={{ 
                                  borderBottom: entryIdx === entriesToShow.length - 1 ? '0.3px solid #d3d3d3' : 'none'
                                }}
                              >
                                <div className={`${hasData ? 'font-bold text-secondary' : 'font-medium text-secondary/50'}`}>
                                  {showProductName ? productName : ''}
                                </div>
                                <div 
                                  className="text-center font-medium"
                                  style={{
                                    backgroundColor: invBgColor,
                                    color: invTextColor || '#000000',
                                    fontWeight: dateHighlight ? 'bold' : 'normal'
                                  }}
                                >
                                  {invText}
                                </div>
                                <div className="text-secondary text-center font-bold">
                                  {necText}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}

                    {/* Custom products not in default list */}
                    {categorySubmittedEntries && Array.from(categorySubmittedEntries.entries()).map(([productName, entry]) => {
                      if (category.products.includes(productName)) return null // Already shown above
                      
                      const productEntries = Array.isArray(entry.entries) ? entry.entries : []
                      
                      // Check if product has any data (quantity > 0 or requiredQuantity > 0)
                      const hasData = productEntries.some((e: any) => 
                        (e.quantity && e.quantity > 0) || (e.requiredQuantity && e.requiredQuantity > 0)
                      )
                      
                      const entriesToShow = hideEmptyFields
                        ? productEntries.filter((e: any) => 
                            (e.quantity && e.quantity > 0) || (e.requiredQuantity && e.requiredQuantity > 0)
                          )
                        : productEntries.length > 0 
                          ? productEntries 
                          : [{ quantity: 0, requiredQuantity: 0, unit: category.defaultUnit }]

                      if (entriesToShow.length === 0) return null

                      return (
                        <div key={productName}>
                          {entriesToShow.map((entryData: any, entryIdx: number) => {
                            const hasInventar = entryData.quantity && entryData.quantity > 0
                            const hasNecesar = entryData.requiredQuantity && entryData.requiredQuantity > 0
                            
                            // Build INV text and get highlight color
                            let invText = ''
                            const dateHighlight = hasInventar && entryData.receptionDate 
                              ? getDateHighlightColor(entryData.receptionDate) 
                              : null
                            
                            if (hasInventar && entryData.receptionDate) {
                              const dateShort = formatDateShort(entryData.receptionDate)
                              invText = `${dateShort}  ${entryData.quantity} ${formatUnit(entryData.unit || category.defaultUnit)}`
                            }
                            
                            const necText = hasNecesar 
                              ? `${entryData.requiredQuantity} ${formatUnit(entryData.requiredUnit || entryData.unit || category.defaultUnit)}`
                              : ''

                            const showProductName = entryIdx === 0

                            // Determine text color based on highlight
                            const isRedHighlight = dateHighlight?.toLowerCase() === '#ef4444'
                            const invTextColor = dateHighlight ? (isRedHighlight ? '#FFFFFF' : '#000000') : ''
                            const invBgColor = dateHighlight || ''

                            return (
                              <div 
                                key={entryIdx}
                                className="grid grid-cols-[40%_32%_28%] gap-2 py-1 text-sm hover:bg-primary/10"
                                style={{ 
                                  borderBottom: entryIdx === entriesToShow.length - 1 ? '0.3px solid #d3d3d3' : 'none'
                                }}
                              >
                                <div className={`${hasData ? 'font-bold text-secondary' : 'font-medium text-secondary/50'}`}>
                                  {showProductName ? productName : ''}
                                </div>
                                <div 
                                  className="text-center font-medium"
                                  style={{
                                    backgroundColor: invBgColor,
                                    color: invTextColor || '#000000',
                                    fontWeight: dateHighlight ? 'bold' : 'normal'
                                  }}
                                >
                                  {invText}
                                </div>
                                <div className="text-secondary text-center font-bold">
                                  {necText}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="card-neumorphic text-center py-12">
              <p className="text-secondary/60">Se încarcă categoriile...</p>
            </div>
          )}
        </div>

        {/* Bottom Action Buttons */}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={handleDownloadPDF}
            className="btn-active px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all"
          >
            DOWNLOAD PDF
          </button>
          <button
            onClick={handlePrintClick}
            className="bg-green-500/20 border-2 border-green-500/50 px-6 py-3 rounded-xl font-bold text-green-700 hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            🖨️ PRINT
          </button>
        </div>
      </div>

      {/* PDF Missing Popup */}
      {showPDFMissingPopup && (
        <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-8 animate-float">
            <h3 className="text-2xl font-bold text-secondary mb-4">
              Inventarul final încă nu a fost transmis.
            </h3>
            <div className="flex gap-4 mt-8">
              <button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="flex-1 btn-active px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPDF ? 'Se generează...' : 'Generează PDF acum'}
              </button>
              <button
                onClick={() => setShowPDFMissingPopup(false)}
                className="btn-neumorphic px-6 py-4 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {sendingEmail ? (
                    <h3 className="text-3xl font-bold text-gradient mb-4">Se trimite...</h3>
                  ) : (
                    <>
                      <h3 className="text-3xl font-bold text-gradient mb-4">Trimite pe email</h3>
                      <p className="text-secondary/80 text-lg">
                        Inventarul <span className="font-bold text-secondary">{inventory.username}</span> din <span className="font-bold text-secondary">{formatBucharestDate(inventory.date)}</span> va fi generat ca PDF și trimis pe email.
                      </p>
                    </>
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
    </div>
  )
}

export default InventoryView

