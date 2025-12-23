import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { INVENTORY_CATEGORIES } from '../constants/inventoryProducts'
import { 
  getTodayInventory, 
  submitInventory, 
  saveInventoryDraft,
  InventoryEntryData 
} from '../services/inventory.api'
import api from '../services/api'

interface ProductFormData {
  id?: string // Unique ID for stable keys
  category: string
  productName: string
  isCustomProduct: boolean
  entries: InventoryEntryData[]
}

interface InventoryCategory {
  id: string
  name: string
  units: string[]
  defaultUnit: string
  displayOrder: number
  products: string[] // Product names as strings
}

function InventoryForm() {
  const navigate = useNavigate()
  const username = localStorage.getItem('authToken') || 'Unknown'
  const today = new Date().toLocaleDateString('ro-RO')
  
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [productEntries, setProductEntries] = useState<ProductFormData[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false)
  const [showEditConfirmation, setShowEditConfirmation] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialLoadRef = useRef(true)

  // Load categories from API
  useEffect(() => {
    loadCategories()
  }, [])

  // Load today's inventory after categories are loaded
  useEffect(() => {
    if (categories.length > 0) {
      loadTodayInventory()
    }
  }, [categories])

  const loadCategories = async () => {
    try {
      const response = await api.get('/inventory-products/categories/public')
      // Transform API response to match expected format
      const transformedCategories: InventoryCategory[] = response.data.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        units: cat.units,
        defaultUnit: cat.defaultUnit,
        displayOrder: cat.displayOrder || 0,
        products: cat.products.map((p: any) => p.name).sort()
      })).sort((a: InventoryCategory, b: InventoryCategory) => a.displayOrder - b.displayOrder)
      
      setCategories(transformedCategories)
    } catch (error) {
      console.error('Error loading categories from API, using fallback:', error)
      // Fallback to hardcoded categories if API fails
      const fallbackCategories: InventoryCategory[] = INVENTORY_CATEGORIES.map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        units: cat.units,
        defaultUnit: cat.defaultUnit,
        displayOrder: index,
        products: cat.products
      }))
      setCategories(fallbackCategories)
    }
  }

  // Auto-save effect - saves draft after 1 second of inactivity
  useEffect(() => {
    // Skip auto-save on initial load
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      return
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      await autoSaveDraft()
    }, 1000) // Save 1 second after last change

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [productEntries])

  // Auto-save function
  const autoSaveDraft = async () => {
    try {
      setAutoSaving(true)
      const validEntries = productEntries.filter(e => 
        e.entries.some(entry => (entry.quantity && entry.quantity > 0) || (entry.requiredQuantity && entry.requiredQuantity > 0))
      )
      
      if (validEntries.length > 0) {
        await saveInventoryDraft({ entries: validEntries })
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Failed to auto-save draft:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  // Helper function to create all default products from loaded categories
  const createAllDefaultProducts = (): ProductFormData[] => {
    const allProducts: ProductFormData[] = []
    categories.forEach(category => {
      category.products.forEach(productName => {
        allProducts.push({
          id: `${category.name}-${productName}`,
          category: category.name,
          productName,
          isCustomProduct: false,
          entries: [
            {
              receptionDate: new Date().toISOString().split('T')[0],
              quantity: 0,
              unit: category.defaultUnit,
              requiredQuantity: 0,
              requiredUnit: category.defaultUnit
            }
          ]
        })
      })
    })
    return allProducts
  }

  const loadTodayInventory = async () => {
    try {
      const response = await getTodayInventory()
      
      // Always start with all default products
      const allDefaultProducts = createAllDefaultProducts()
      
      if (response.inventory) {
        setHasExistingSubmission(true)
        
        // Convert loaded inventory to form data
        const loadedEntries = response.inventory.entries.map(entry => ({
          id: entry.isCustomProduct 
            ? `${entry.category}-${entry.productName}-${Date.now()}-${Math.random()}`
            : `${entry.category}-${entry.productName}`,
          category: entry.category,
          productName: entry.productName,
          isCustomProduct: entry.isCustomProduct,
          entries: entry.entries.map(e => ({
            receptionDate: e.receptionDate,
            quantity: e.quantity,
            unit: e.unit,
            requiredQuantity: e.requiredQuantity || 0,
            requiredUnit: e.requiredUnit || e.unit
          }))
        }))

        // Merge loaded entries with default products
        // For default products that have saved data, use the saved data
        // For default products without saved data, keep the default
        const mergedProducts = allDefaultProducts.map(defaultProduct => {
          const loadedProduct = loadedEntries.find(
            lp => lp.category === defaultProduct.category && 
                  lp.productName === defaultProduct.productName &&
                  !lp.isCustomProduct
          )
          return loadedProduct || defaultProduct
        })

        // Add custom products that are not in default list
        const customProducts = loadedEntries.filter(lp => lp.isCustomProduct)
        mergedProducts.push(...customProducts)

        setProductEntries(mergedProducts)
      } else {
        // No saved inventory, use all default products
        setProductEntries(allDefaultProducts)
      }
    } catch (error) {
      console.error('Failed to load inventory:', error)
      // On error, still show all default products
      const allDefaultProducts = createAllDefaultProducts()
      setProductEntries(allDefaultProducts)
    } finally {
      setLoading(false)
    }
  }

  const getProductEntry = (category: string, productName: string): ProductFormData | undefined => {
    return productEntries.find(
      e => e.category === category && e.productName === productName
    )
  }

  const addProductEntry = (category: string, productName: string, unit: string, isCustom = false, afterIndex?: number) => {
    const existing = getProductEntry(category, productName)
    if (existing) {
      // Add another entry to existing product
      const updated = productEntries.map(e => {
        if (e.category === category && e.productName === productName) {
          const newEntry = {
            receptionDate: new Date().toISOString().split('T')[0],
            quantity: 0,
            unit,
            requiredQuantity: 0,
            requiredUnit: unit
          }
          
          if (afterIndex !== undefined && afterIndex >= 0) {
            // Insert after specific index
            const newEntries = [...e.entries]
            newEntries.splice(afterIndex + 1, 0, newEntry)
            return { ...e, entries: newEntries }
          } else {
            // Add to end
            return {
              ...e,
              entries: [...e.entries, newEntry]
            }
          }
        }
        return e
      })
      setProductEntries(updated)
    } else {
      // Add new product entry
      setProductEntries([
        ...productEntries,
        {
          id: `${category}-${productName}-${Date.now()}-${Math.random()}`,
          category,
          productName,
          isCustomProduct: isCustom,
          entries: [
            {
              receptionDate: new Date().toISOString().split('T')[0],
              quantity: 0,
              unit,
              requiredQuantity: 0,
              requiredUnit: unit
            }
          ]
        }
      ])
    }
  }

  const updateProductEntry = (
    category: string,
    productName: string,
    entryIndex: number,
    field: keyof InventoryEntryData,
    value: any
  ) => {
    const updated = productEntries.map(e => {
      if (e.category === category && e.productName === productName) {
        const newEntries = [...e.entries]
        newEntries[entryIndex] = { ...newEntries[entryIndex], [field]: value }
        return { ...e, entries: newEntries }
      }
      return e
    })
    setProductEntries(updated)
  }

  const updateProductName = (productId: string, newProductName: string) => {
    const updated = productEntries.map(e => {
      if (e.id === productId) {
        return { ...e, productName: newProductName }
      }
      return e
    })
    setProductEntries(updated)
  }

  const removeProductEntry = (category: string, productName: string, entryIndex: number) => {
    const updated = productEntries.map(e => {
      if (e.category === category && e.productName === productName) {
        const newEntries = e.entries.filter((_, i) => i !== entryIndex)
        if (newEntries.length === 0) {
          return null // Will be filtered out below
        }
        return { ...e, entries: newEntries }
      }
      return e
    }).filter(Boolean) as ProductFormData[]
    setProductEntries(updated)
  }

  const adjustDate = (currentDate: string, days: number): string => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + days)
    const adjustedDateStr = date.toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]
    // Don't allow dates in the future
    return adjustedDateStr > todayStr ? todayStr : adjustedDateStr
  }

  const formatDateShort = (dateString: string): string => {
    const date = new Date(dateString)
    const day = date.getDate()
    const monthNames = ['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOI', 'DEC']
    const month = monthNames[date.getMonth()]
    return `${day} ${month}`
  }

  // Function to download PDF
  const downloadPDF = async (inventoryId: string, username: string, date: string) => {
    try {
      // Fetch the PDF with authentication using the API endpoint
      const response = await api.get(`/inventory/pdf/${inventoryId}`, {
        responseType: 'blob',
      })
      
      // Create a blob from the response
      const blob = new Blob([response.data], { type: 'application/pdf' })
      
      // Create a temporary URL and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename
      const dateStr = new Date(date).toISOString().split('T')[0]
      link.download = `inventory-${username}-${dateStr}.pdf`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download PDF:', error)
      // Don't show error to user, just log it
    }
  }

  const handleSubmit = async () => {
    if (hasExistingSubmission && !showEditConfirmation) {
      setShowEditConfirmation(true)
      return
    }

    setSubmitting(true)
    try {
      // Filter to include entries with quantity > 0 OR requiredQuantity > 0
      // This ensures necesar-only items are saved
      const validEntries = productEntries
        .map(e => ({
          ...e,
          entries: e.entries.filter(entry => 
            (entry.quantity && entry.quantity > 0) || 
            (entry.requiredQuantity && entry.requiredQuantity > 0)
          )
        }))
        .filter(e => e.entries.length > 0)

      if (validEntries.length === 0) {
        alert('Please add at least one product with inventory quantity or necesar quantity')
        setSubmitting(false)
        return
      }

      const response = await submitInventory({ entries: validEntries })
      
      // Download PDF if inventory was created/updated
      if (response.inventory?.id) {
        await downloadPDF(
          response.inventory.id,
          response.inventory.username,
          response.inventory.date
        )
      }
      
      alert('Inventory submitted successfully!')
      navigate('/')
    } catch (error) {
      console.error('Failed to submit inventory:', error)
      alert('Failed to submit inventory. Please try again.')
    } finally {
      setSubmitting(false)
      setShowEditConfirmation(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary flex items-center justify-center">
        <div className="text-2xl font-bold text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary">
      <div className="absolute top-20 right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Title - centered */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">
            INVENTAR/NECESAR {username} - {today}
          </h1>
        </div>

        {/* Categories with back button aligned */}
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Back button - aligned with cards */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="btn-neumorphic px-6 py-3 rounded-xl font-bold text-secondary hover:scale-105 transition-all duration-300"
            >
              ← ÎNAPOI
            </button>
          </div>
          {categories.map(category => {
            const categoryProducts = productEntries.filter(e => e.category === category.name)
            
            return (
              <div key={category.id} className="card-neumorphic">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-secondary">
                    {category.name}
                  </h3>
                  {/* Headers for Date, INVENTAR and NECESAR aligned with category header */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Spacer for Date column */}
                    <div style={{ width: '150px' }}></div>
                    {/* INVENTAR header */}
                    <div className="flex items-center justify-center" style={{ width: '154px' }}>
                      <span className="text-sm font-bold text-secondary whitespace-nowrap">INVENTAR</span>
                    </div>
                    {/* Spacer for + button */}
                    <div className="w-7"></div>
                    {/* NECESAR header */}
                    <div className="flex items-center justify-center px-2" style={{ width: '180px' }}>
                      <span className="text-sm font-bold text-secondary whitespace-nowrap">NECESAR</span>
                    </div>
                  </div>
                </div>

                {/* All products - vertical list */}
                <div className="space-y-2">
                  {categoryProducts.map((product, productIndex) => {
                    // Ensure product has at least one entry
                    if (!product.entries || product.entries.length === 0) {
                      return null
                    }

                    const productId = product.id || `${product.category}-${product.productName}-${productIndex}`

                    return (
                      <div key={productId} className="relative">
                        {/* Separator line between products */}
                        {productIndex > 0 && (
                          <div className="border-t border-secondary/20 my-2"></div>
                        )}
                        
                        <div className="relative" style={{ gap: '4px', display: 'flex', flexDirection: 'column' }}>
                          {product.entries.map((entry, entryIndex) => {
                            // Ensure entry has required fields
                            const receptionDate = entry.receptionDate || new Date().toISOString().split('T')[0]
                            const unit = entry.unit || category.defaultUnit
                            const quantity = entry.quantity || 0
                            const requiredUnit = entry.requiredUnit || category.defaultUnit
                            const requiredQuantity = entry.requiredQuantity || 0

                            return (
                              <div
                                key={`${productId}-${entryIndex}`}
                                className="rounded-xl relative"
                                style={{ padding: '8px 12px' }}
                              >
                                {/* Grid layout for perfect alignment */}
                                <div className="grid items-center" style={{ 
                                  gridTemplateColumns: '1fr 150px 154px 28px 180px',
                                  gap: '8px'
                                }}>
                                {/* Product name column */}
                                <div className="min-w-0">
                                  {entryIndex === 0 && (
                                    product.isCustomProduct ? (
                                      <input
                                        type="text"
                                        value={product.productName}
                                        onChange={(e) => updateProductName(productId, e.target.value)}
                                        placeholder="Nume produs"
                                        className="w-full px-2 py-1 rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-sm font-semibold text-secondary bg-white"
                                      />
                                    ) : (
                                      <h4 className="font-semibold text-secondary text-sm truncate">
                                        {product.productName}
                                      </h4>
                                    )
                                  )}
                                </div>

                                {/* Date column */}
                                <div className="flex items-center" style={{ gap: '4px' }}>
                                  <button
                                    onClick={() => updateProductEntry(
                                      product.category,
                                      product.productName,
                                      entryIndex,
                                      'receptionDate',
                                      adjustDate(receptionDate, -1)
                                    )}
                                    className="rounded-lg bg-primary/50 hover:bg-primary flex items-center justify-center text-secondary font-bold transition-colors text-xs"
                                    style={{ width: '24px', height: '28px' }}
                                  >
                                    −
                                  </button>
                                  <input
                                    type="date"
                                    value={receptionDate}
                                    onChange={(e) => updateProductEntry(
                                      product.category,
                                      product.productName,
                                      entryIndex,
                                      'receptionDate',
                                      e.target.value
                                    )}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="hidden"
                                    id={`date-${product.category}-${product.productName}-${entryIndex}`}
                                  />
                                  <label
                                    htmlFor={`date-${product.category}-${product.productName}-${entryIndex}`}
                                    className="rounded-lg border-2 border-secondary/20 hover:border-secondary/50 cursor-pointer text-xs font-medium text-secondary text-center bg-white"
                                    style={{ width: '70px', height: '28px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    {formatDateShort(receptionDate)}
                                  </label>
                                  <button
                                    onClick={() => updateProductEntry(
                                      product.category,
                                      product.productName,
                                      entryIndex,
                                      'receptionDate',
                                      adjustDate(receptionDate, 1)
                                    )}
                                    className="rounded-lg bg-primary/50 hover:bg-primary flex items-center justify-center text-secondary font-bold transition-colors text-xs"
                                    style={{ width: '24px', height: '28px' }}
                                  >
                                    +
                                  </button>
                                </div>

                                {/* INVENTAR column */}
                                <div className="flex items-center" style={{ gap: '4px' }}>
                                  <select
                                    value={unit}
                                    onChange={(e) => updateProductEntry(
                                      product.category,
                                      product.productName,
                                      entryIndex,
                                      'unit',
                                      e.target.value
                                    )}
                                    className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-xs bg-white"
                                    style={{ width: '70px', height: '28px', padding: '4px 8px' }}
                                  >
                                    {category.units.map(unitOption => (
                                      <option key={unitOption} value={unitOption}>{unitOption}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={quantity || ''}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9,]/g, '')
                                      const numValue = parseFloat(value.replace(',', '.')) || 0
                                      updateProductEntry(
                                        product.category,
                                        product.productName,
                                        entryIndex,
                                        'quantity',
                                        numValue
                                      )
                                    }}
                                    placeholder="0"
                                    className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-center text-xs bg-white"
                                    style={{ width: '64px', height: '28px', padding: '4px 8px' }}
                                  />
                                </div>

                                {/* Button column */}
                                <div className="flex items-center justify-center">
                                  {entryIndex === 0 ? (
                                    <button
                                      onClick={() => addProductEntry(product.category, product.productName, category.defaultUnit, false, entryIndex)}
                                      className="rounded-lg bg-accent-purple/50 hover:bg-accent-purple/70 flex items-center justify-center text-secondary font-bold transition-colors"
                                      style={{ width: '28px', height: '28px' }}
                                      title="Adaugă un nou rând pentru acest produs"
                                    >
                                      +
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => removeProductEntry(product.category, product.productName, entryIndex)}
                                      className="rounded-lg bg-rose-500/80 hover:bg-rose-600 flex items-center justify-center text-white transition-colors"
                                      style={{ width: '28px', height: '28px' }}
                                      title="Șterge acest rând"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>

                                {/* NECESAR column - only show on first row */}
                                {entryIndex === 0 ? (
                                  <div className="flex items-center rounded-lg bg-blue-100/60" style={{ padding: '4px 8px', gap: '4px' }}>
                                    <select
                                      value={requiredUnit}
                                      onChange={(e) => updateProductEntry(
                                        product.category,
                                        product.productName,
                                        entryIndex,
                                        'requiredUnit',
                                        e.target.value
                                      )}
                                      className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-xs bg-white"
                                      style={{ width: '70px', height: '28px', padding: '4px 8px' }}
                                    >
                                      {category.units.map(unitOption => (
                                        <option key={unitOption} value={unitOption}>{unitOption}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={requiredQuantity || ''}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9,]/g, '')
                                        const numValue = parseFloat(value.replace(',', '.')) || 0
                                        updateProductEntry(
                                          product.category,
                                          product.productName,
                                          entryIndex,
                                          'requiredQuantity',
                                          numValue
                                        )
                                      }}
                                      placeholder="0"
                                      className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-center text-xs bg-white"
                                      style={{ width: '64px', height: '28px', padding: '4px 8px' }}
                                    />
                                  </div>
                                ) : (
                                  <div></div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        </div>
                      </div>
                    )
                  })}

                  {/* Add Product button at the end of each category */}
                  <div className="mt-4 pt-2">
                    <button
                      onClick={() => {
                        const newProductName = ''
                        addProductEntry(category.name, newProductName, category.defaultUnit, true)
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-accent-purple/20 hover:bg-accent-purple/30 border-2 border-dashed border-secondary/30 transition-all duration-300 font-bold text-secondary"
                    >
                      + ADAUGA PRODUS
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="max-w-7xl mx-auto mt-8">
          {/* Auto-save status */}
          <div className="text-center mb-4">
            {autoSaving ? (
              <div className="text-sm text-secondary/60 flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Se salvează...
              </div>
            ) : lastSaved ? (
              <div className="text-sm text-secondary/60">
                ✓ Salvat automat la {lastSaved.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            ) : null}
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-active px-12 py-4 rounded-2xl font-bold text-xl hover:scale-105 transition-all duration-300 shadow-glow-purple"
            >
              {submitting ? 'SE TRIMITE...' : 'TRIMITE INVENTAR'}
            </button>
          </div>
        </div>

        {/* Edit Confirmation Modal */}
        {showEditConfirmation && (
          <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-md w-full p-8 animate-float">
              <h3 className="text-2xl font-bold text-gradient mb-6 text-center">
                Editare Inventar
              </h3>
              <p className="text-center text-secondary/70 mb-6">
                Inventarul pentru {today} a fost deja transmis. Doriti sa-l editati?
              </p>
              
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleSubmit}
                  className="btn-active px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300"
                >
                  DA
                </button>
                <button
                  onClick={() => setShowEditConfirmation(false)}
                  className="btn-neumorphic px-8 py-4 rounded-2xl font-bold text-lg text-secondary hover:scale-105 transition-all duration-300"
                >
                  NU
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryForm

