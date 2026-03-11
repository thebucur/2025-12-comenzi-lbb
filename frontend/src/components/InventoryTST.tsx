import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { INVENTORY_CATEGORIES } from '../constants/inventoryProducts'
import { 
  InventoryEntryData,
  DictatedEntry
} from '../services/inventory.api'
import api from '../services/api'
import { getTodayString, formatBucharestDate, toBucharestDateString } from '../utils/date'
import VoiceDictationModule from './VoiceDictationModule'

interface ProductFormData {
  id?: string
  category: string
  productName: string
  isCustomProduct: boolean
  entries: InventoryEntryData[]
}

interface InventoryProduct {
  name: string
  id: string
  predefinedValues?: number[]
}

interface InventoryCategory {
  id: string
  name: string
  units: string[]
  defaultUnit: string
  displayOrder: number
  products: InventoryProduct[]
}

function InventoryTST() {
  const navigate = useNavigate()
  const username = localStorage.getItem('authToken') || 'Unknown'
  const today = formatBucharestDate(new Date())
  
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [productEntries, setProductEntries] = useState<ProductFormData[]>([])
  const [loading, setLoading] = useState(true)
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const bottomBarRef = useRef<HTMLDivElement | null>(null)
  const [bottomBarReady, setBottomBarReady] = useState(false)
  
  const predefinedValuesMap = useRef<Map<string, number[]>>(new Map())
  
  const [focusedRequiredQuantityField, setFocusedRequiredQuantityField] = useState<{
    category: string
    productName: string
  } | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (categories.length > 0) {
      setProductEntries(createAllDefaultProducts())
      setLoading(false)
    }
  }, [categories])

  const loadCategories = async () => {
    try {
      const response = await api.get('/inventory-products/categories/public')
      const transformedCategories: InventoryCategory[] = response.data.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        units: cat.units,
        defaultUnit: cat.defaultUnit,
        displayOrder: cat.displayOrder || 0,
        products: cat.products.map((p: any) => ({
          name: p.name,
          id: p.id,
          predefinedValues: p.predefinedValues || []
        })).sort((a: InventoryProduct, b: InventoryProduct) => a.name.localeCompare(b.name))
      })).sort((a: InventoryCategory, b: InventoryCategory) => a.displayOrder - b.displayOrder)
      
      predefinedValuesMap.current.clear()
      transformedCategories.forEach(category => {
        category.products.forEach(product => {
          if (product.predefinedValues && product.predefinedValues.length > 0) {
            const key = `${category.name}-${product.name}`
            predefinedValuesMap.current.set(key, product.predefinedValues)
          }
        })
      })
      
      setCategories(transformedCategories)
    } catch (error) {
      console.error('Error loading categories from API, using fallback:', error)
      const fallbackCategories: InventoryCategory[] = INVENTORY_CATEGORIES.map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        units: cat.units,
        defaultUnit: cat.defaultUnit,
        displayOrder: index,
        products: cat.products.map((name: string) => ({ name, id: '', predefinedValues: [] }))
      }))
      setCategories(fallbackCategories)
      predefinedValuesMap.current.clear()
    }
  }

  useEffect(() => {
    if (!bottomBarReady) return

    const bottomBar = bottomBarRef.current
    if (!bottomBar) return

    let animationFrameId: number | null = null
    let cleanupFunctions: (() => void)[] = []
    let checkScrollPosition: (() => void) | null = null

    const getScrollInfo = () => {
      const rootElement = document.getElementById('root')
      
      if (rootElement) {
        const scrollHeight = rootElement.scrollHeight
        const clientHeight = rootElement.clientHeight
        const scrollTop = rootElement.scrollTop
        
        if (scrollHeight > clientHeight) {
          return { scrollTop, scrollHeight, clientHeight, element: rootElement }
        }
      }
      
      const docScrollHeight = document.documentElement.scrollHeight
      const docClientHeight = window.innerHeight
      const docScrollTop = document.documentElement.scrollTop || window.pageYOffset || 0
      
      if (docScrollHeight > docClientHeight) {
        return { scrollTop: docScrollTop, scrollHeight: docScrollHeight, clientHeight: docClientHeight, element: document.documentElement }
      }
      
      return {
        scrollTop: document.body.scrollTop || window.pageYOffset || 0,
        scrollHeight: document.body.scrollHeight || document.documentElement.scrollHeight,
        clientHeight: window.innerHeight || document.documentElement.clientHeight,
        element: document.body
      }
    }

    checkScrollPosition = () => {
      const currentBottomBar = bottomBarRef.current
      if (!currentBottomBar) return

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }

      animationFrameId = requestAnimationFrame(() => {
        const bar = bottomBarRef.current
        if (!bar) return

        const scrollInfo = getScrollInfo()
        const { scrollTop, scrollHeight, clientHeight } = scrollInfo
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
        const nearBottom = distanceFromBottom < 300

        if (nearBottom) {
          const barHeight = bar.offsetHeight || 100
          bar.style.transform = `translate3d(0, ${barHeight}px, 0)`
          bar.style.transition = 'transform 0.3s ease-out'
        } else {
          bar.style.transform = 'translate3d(0, 0, 0)'
          bar.style.transition = 'transform 0.3s ease-out'
        }
      })
    }

    const rootElement = document.getElementById('root')
    
    if (rootElement) {
      rootElement.addEventListener('scroll', checkScrollPosition, { passive: true })
      cleanupFunctions.push(() => rootElement.removeEventListener('scroll', checkScrollPosition))
    }
    
    window.addEventListener('scroll', checkScrollPosition, { passive: true })
    window.addEventListener('resize', checkScrollPosition, { passive: true })
    document.addEventListener('scroll', checkScrollPosition, { passive: true })
    
    cleanupFunctions.push(() => {
      window.removeEventListener('scroll', checkScrollPosition!)
      window.removeEventListener('resize', checkScrollPosition!)
      document.removeEventListener('scroll', checkScrollPosition!)
    })
    
    setTimeout(() => {
      if (checkScrollPosition) checkScrollPosition()
    }, 200)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [bottomBarReady])

  const createAllDefaultProducts = (): ProductFormData[] => {
    const allProducts: ProductFormData[] = []
    categories.forEach(category => {
      category.products.forEach(product => {
        allProducts.push({
          id: `${category.name}-${product.name}`,
          category: category.name,
          productName: product.name,
          isCustomProduct: false,
          entries: [
            {
              receptionDate: getTodayString(),
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

  const getProductEntry = (category: string, productName: string): ProductFormData | undefined => {
    return productEntries.find(
      e => e.category === category && e.productName === productName
    )
  }

  const addProductEntry = (category: string, productName: string, unit: string, isCustom = false, afterIndex?: number) => {
    const existing = getProductEntry(category, productName)
    if (existing) {
      const updated = productEntries.map(e => {
        if (e.category === category && e.productName === productName) {
          const newEntry = {
            receptionDate: getTodayString(),
            quantity: 0,
            unit,
            requiredQuantity: 0,
            requiredUnit: unit
          }
          
          if (afterIndex !== undefined && afterIndex >= 0) {
            const newEntries = [...e.entries]
            newEntries.splice(afterIndex + 1, 0, newEntry)
            return { ...e, entries: newEntries }
          } else {
            return { ...e, entries: [...e.entries, newEntry] }
          }
        }
        return e
      })
      setProductEntries(updated)
    } else {
      setProductEntries([
        ...productEntries,
        {
          id: `${category}-${productName}-${Date.now()}-${Math.random()}`,
          category,
          productName,
          isCustomProduct: isCustom,
          entries: [
            {
              receptionDate: getTodayString(),
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
          return null
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
    const adjustedDateStr = toBucharestDateString(date)
    const todayStr = getTodayString()
    return adjustedDateStr > todayStr ? todayStr : adjustedDateStr
  }

  const formatDateShort = (dateString: string): string => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.getMonth() + 1
    return `${day}.${month.toString().padStart(2, '0')}`
  }

  const getDateBackgroundColor = (dateString: string): string | null => {
    const MS_PER_DAY = 1000 * 60 * 60 * 24
    const parsed = new Date(dateString)
    const todayStr = getTodayString()
    const targetStr = toBucharestDateString(parsed)
    const todayStart = new Date(todayStr + 'T00:00:00')
    const targetStart = new Date(targetStr + 'T00:00:00')
    
    const diffDays = Math.floor((todayStart.getTime() - targetStart.getTime()) / MS_PER_DAY)
    
    if (diffDays === 1) return '#ffff00'
    if (diffDays >= 2) return '#ef4444'
    return null
  }

  const getPredefinedValues = (category: string, productName: string): number[] => {
    const key = `${category}-${productName}`
    return predefinedValuesMap.current.get(key) || []
  }

  const handlePredefinedValueSelect = (value: number, category: string, productName: string) => {
    updateProductEntry(category, productName, 0, 'requiredQuantity', value)
    setFocusedRequiredQuantityField(null)
  }

  const handleNextCategory = () => {
    if (categories.length === 0) return
    
    const getScrollElement = () => {
      const rootElement = document.getElementById('root')
      if (rootElement && rootElement.scrollHeight > rootElement.clientHeight) {
        return {
          element: rootElement,
          scrollTop: rootElement.scrollTop,
          scrollTo: (top: number) => rootElement.scrollTo({ top, behavior: 'smooth' })
        }
      }
      return {
        element: document.documentElement,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop,
        scrollTo: (top: number) => window.scrollTo({ top, behavior: 'smooth' })
      }
    }
    
    const scrollInfo = getScrollElement()
    let currentVisibleIndex = -1
    
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i]
      const categoryElement = categoryRefs.current[category.id]
      
      if (categoryElement) {
        const rect = categoryElement.getBoundingClientRect()
        if (rect.top >= -50 && rect.top <= window.innerHeight / 2) {
          currentVisibleIndex = i
          break
        }
      }
    }
    
    const startIndex = currentVisibleIndex >= 0 ? currentVisibleIndex : -1
    const nextIndex = (startIndex + 1) % categories.length
    
    const nextCategory = categories[nextIndex]
    const categoryElement = categoryRefs.current[nextCategory.id]
    
    if (categoryElement) {
      const rect = categoryElement.getBoundingClientRect()
      const scrollToPosition = scrollInfo.scrollTop + rect.top - 20
      scrollInfo.scrollTo(Math.max(0, scrollToPosition))
    }
  }

  const handleReset = () => {
    setProductEntries(createAllDefaultProducts())
  }

  const handleDictationEntries = useCallback((dictatedEntries: DictatedEntry[]) => {
    setProductEntries(prev => {
      const updated = [...prev]

      for (const entry of dictatedEntries) {
        const existingIdx = updated.findIndex(
          p => p.category === entry.category && p.productName === entry.productName && !p.isCustomProduct
        )

        if (entry.action === 'remove') {
          if (existingIdx >= 0) {
            const existing = updated[existingIdx]
            if (entry.isNecesar) {
              if (existing.entries[0]) {
                const removeQty = entry.quantity || 0
                if (removeQty === 0) {
                  existing.entries[0].requiredQuantity = 0
                } else {
                  existing.entries[0].requiredQuantity = Math.max(0, (existing.entries[0].requiredQuantity || 0) - removeQty)
                }
              }
            } else {
              if (entry.quantity === 0) {
                existing.entries = existing.entries.map(e => ({ ...e, quantity: 0 }))
              } else {
                let remaining = entry.quantity
                for (let i = existing.entries.length - 1; i >= 0 && remaining > 0; i--) {
                  const sub = Math.min(existing.entries[i].quantity, remaining)
                  existing.entries[i].quantity -= sub
                  remaining -= sub
                }
              }
            }
            updated[existingIdx] = { ...existing, entries: [...existing.entries] }
          }
          continue
        }

        if (existingIdx >= 0) {
          const existing = updated[existingIdx]
          if (entry.isNecesar) {
            const firstEntry = existing.entries[0]
            if (firstEntry) {
              firstEntry.requiredQuantity = entry.quantity
              firstEntry.requiredUnit = entry.unit
            }
          } else {
            const cat = categories.find(c => c.name === entry.category)
            const hasDataInFirst = existing.entries[0] && existing.entries[0].quantity > 0
            if (hasDataInFirst) {
              existing.entries.push({
                receptionDate: entry.receptionDate,
                quantity: entry.quantity,
                unit: entry.unit,
                requiredQuantity: 0,
                requiredUnit: cat?.defaultUnit || entry.unit,
              })
            } else if (existing.entries[0]) {
              existing.entries[0].receptionDate = entry.receptionDate
              existing.entries[0].quantity = entry.quantity
              existing.entries[0].unit = entry.unit
            }
          }
          updated[existingIdx] = { ...existing, entries: [...existing.entries] }
        } else {
          const cat = categories.find(c => c.name === entry.category)
          const newProduct: ProductFormData = {
            id: `${entry.category}-${entry.productName}-${Date.now()}-${Math.random()}`,
            category: entry.category,
            productName: entry.productName,
            isCustomProduct: true,
            entries: [{
              receptionDate: entry.receptionDate,
              quantity: entry.isNecesar ? 0 : entry.quantity,
              unit: entry.isNecesar ? (cat?.defaultUnit || entry.unit) : entry.unit,
              requiredQuantity: entry.isNecesar ? entry.quantity : 0,
              requiredUnit: entry.isNecesar ? entry.unit : (cat?.defaultUnit || entry.unit),
            }],
          }
          updated.push(newProduct)
        }
      }

      return updated
    })
  }, [categories])

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

      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">
            SANDBOX INVENTAR {username} - {today}
          </h1>
          <p className="text-secondary/60 mt-1 text-sm">Pagină de test cu dictare vocală — nu salvează nimic pe server</p>
        </div>

        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-neumorphic px-6 py-3 rounded-xl font-bold text-sm text-secondary hover:scale-105 transition-all duration-300"
            >
              ← ÎNAPOI
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl bg-rose-100 hover:bg-rose-200 font-bold text-sm text-rose-600 hover:scale-105 transition-all duration-300"
            >
              RESETARE
            </button>
          </div>

          {/* Voice Dictation Module */}
          <VoiceDictationModule
            categories={categories}
            onEntriesConfirmed={handleDictationEntries}
          />

          {categories.map((category) => {
            const categoryProducts = productEntries.filter(e => e.category === category.name)
            
            return (
              <div 
                key={category.id} 
                ref={(el) => { categoryRefs.current[category.id] = el }}
                className="card-neumorphic"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-secondary">
                    {category.name}
                  </h3>
                  <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                    <div style={{ width: '150px' }}></div>
                    <div className="flex items-center justify-center" style={{ width: '154px' }}>
                      <span className="text-sm font-bold text-secondary whitespace-nowrap">INVENTAR</span>
                    </div>
                    <div className="w-7"></div>
                    <div className="flex items-center justify-center px-2" style={{ width: '180px' }}>
                      <span className="text-sm font-bold text-secondary whitespace-nowrap">NECESAR</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {categoryProducts.map((product, productIndex) => {
                    if (!product.entries || product.entries.length === 0) {
                      return null
                    }

                    const productId = product.id || `${product.category}-${product.productName}-${productIndex}`

                    return (
                      <div key={productId} className="relative">
                        {productIndex > 0 && (
                          <div className="border-t border-secondary/20 my-2"></div>
                        )}
                        
                        {/* Mobile layout */}
                        <div className="md:hidden">
                          <div className="mb-2">
                            {product.isCustomProduct ? (
                              <input
                                type="text"
                                value={product.productName}
                                onChange={(e) => updateProductName(productId, e.target.value)}
                                placeholder="Nume produs"
                                className="w-full px-3 py-2 rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-base font-bold text-secondary bg-white"
                              />
                            ) : (
                              <h4 className="font-bold text-secondary text-lg">
                                {product.productName}
                              </h4>
                            )}
                          </div>

                          {product.entries.map((entry, entryIndex) => {
                            const receptionDate = entry.receptionDate || getTodayString()
                            const unit = entry.unit || category.defaultUnit
                            const quantity = entry.quantity || 0

                            return (
                              <div
                                key={`${productId}-${entryIndex}`}
                                className="mb-2"
                              >
                                <div className="flex items-center gap-1.5 w-full">
                                  <button
                                    onClick={() => updateProductEntry(
                                      product.category, product.productName, entryIndex, 'receptionDate',
                                      adjustDate(receptionDate, -1)
                                    )}
                                    className="rounded-lg bg-primary/50 hover:bg-primary flex items-center justify-center text-secondary font-bold transition-colors flex-shrink-0 text-base"
                                    style={{ width: '36px', height: '40px' }}
                                  >
                                    −
                                  </button>
                                  <input
                                    type="date"
                                    value={receptionDate}
                                    onChange={(e) => updateProductEntry(
                                      product.category, product.productName, entryIndex, 'receptionDate', e.target.value
                                    )}
                                    max={getTodayString()}
                                    className="hidden"
                                    id={`date-mobile-tst-${product.category}-${product.productName}-${entryIndex}`}
                                  />
                                  <label
                                    htmlFor={`date-mobile-tst-${product.category}-${product.productName}-${entryIndex}`}
                                    className="rounded-lg border-2 border-secondary/20 hover:border-secondary/50 cursor-pointer text-xs font-bold text-center flex-shrink-0"
                                    style={{ 
                                      width: '60px', height: '40px', padding: '6px 4px', 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      backgroundColor: getDateBackgroundColor(receptionDate) || 'white',
                                      color: getDateBackgroundColor(receptionDate) === '#ef4444' ? 'white' : '#2B2D42'
                                    }}
                                  >
                                    {formatDateShort(receptionDate)}
                                  </label>
                                  <button
                                    onClick={() => updateProductEntry(
                                      product.category, product.productName, entryIndex, 'receptionDate',
                                      adjustDate(receptionDate, 1)
                                    )}
                                    className="rounded-lg bg-primary/50 hover:bg-primary flex items-center justify-center text-secondary font-bold transition-colors flex-shrink-0 text-base"
                                    style={{ width: '36px', height: '40px' }}
                                  >
                                    +
                                  </button>

                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={quantity || ''}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9,]/g, '')
                                      const numValue = parseFloat(value.replace(',', '.')) || 0
                                      updateProductEntry(product.category, product.productName, entryIndex, 'quantity', numValue)
                                    }}
                                    placeholder="0"
                                    className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-center text-sm font-bold bg-white flex-1 min-w-0"
                                    style={{ height: '40px', padding: '6px 8px', maxWidth: '80px' }}
                                  />

                                  <select
                                    value={unit}
                                    onChange={(e) => updateProductEntry(
                                      product.category, product.productName, entryIndex, 'unit', e.target.value
                                    )}
                                    className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-sm font-bold bg-white flex-1 min-w-0"
                                    style={{ height: '40px', padding: '6px 8px', maxWidth: '80px' }}
                                  >
                                    {category.units.map(unitOption => (
                                      <option key={unitOption} value={unitOption}>{unitOption}</option>
                                    ))}
                                  </select>

                                  {entryIndex === 0 ? (
                                    <button
                                      onClick={() => addProductEntry(product.category, product.productName, category.defaultUnit, false, entryIndex)}
                                      className="rounded-lg bg-accent-purple/50 hover:bg-accent-purple/70 flex items-center justify-center text-secondary font-bold transition-colors flex-shrink-0 text-lg"
                                      style={{ width: '40px', height: '40px' }}
                                      title="Adaugă un nou rând"
                                    >
                                      +
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => removeProductEntry(product.category, product.productName, entryIndex)}
                                      className="rounded-lg bg-rose-500/80 hover:bg-rose-600 flex items-center justify-center text-white transition-colors flex-shrink-0 text-lg font-bold"
                                      style={{ width: '40px', height: '40px' }}
                                      title="Șterge acest rând"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}

                          {product.entries.length > 0 && (() => {
                            const predefinedValues = getPredefinedValues(product.category, product.productName)
                            const showPopup = focusedRequiredQuantityField?.category === product.category && 
                                            focusedRequiredQuantityField?.productName === product.productName
                            return (
                              <div className="flex items-center gap-2 rounded-lg bg-blue-100/60 p-2 relative" style={{ overflow: 'visible' }}>
                                <span className="text-xs text-secondary font-bold flex-shrink-0" style={{ width: '70px' }}>Necesar:</span>
                                <div className="relative flex-1 min-w-0" style={{ maxWidth: '80px', overflow: 'visible' }}>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={product.entries[0].requiredQuantity || ''}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9,]/g, '')
                                      const numValue = parseFloat(value.replace(',', '.')) || 0
                                      updateProductEntry(product.category, product.productName, 0, 'requiredQuantity', numValue)
                                    }}
                                    onFocus={() => {
                                      if (predefinedValues.length > 0) {
                                        setFocusedRequiredQuantityField({ category: product.category, productName: product.productName })
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const relatedTarget = e.relatedTarget as HTMLElement
                                      if (!relatedTarget || !relatedTarget.closest('.predefined-values-popup')) {
                                        setTimeout(() => { setFocusedRequiredQuantityField(null) }, 150)
                                      }
                                    }}
                                    placeholder="0"
                                    className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-center text-sm font-bold bg-white w-full"
                                    style={{ height: '40px', padding: '6px 8px' }}
                                  />
                                  {showPopup && predefinedValues.length > 0 && (
                                    <div 
                                      className="absolute flex gap-2 p-2 rounded-xl backdrop-blur-md predefined-values-popup"
                                      style={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                        minWidth: '120px',
                                        bottom: 'calc(100% + 8px)',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        zIndex: 1000
                                      }}
                                    >
                                      {predefinedValues.map((value, index) => (
                                        <button
                                          key={index}
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handlePredefinedValueSelect(value, product.category, product.productName)
                                          }}
                                          className="px-3 py-2 rounded-lg bg-accent-purple/90 hover:bg-accent-purple text-white font-bold text-sm shadow-lg transition-all hover:scale-105 whitespace-nowrap"
                                        >
                                          {value}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <select
                                  value={product.entries[0].requiredUnit || category.defaultUnit}
                                  onChange={(e) => updateProductEntry(product.category, product.productName, 0, 'requiredUnit', e.target.value)}
                                  className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-sm font-bold bg-white flex-1 min-w-0"
                                  style={{ height: '40px', padding: '6px 8px', maxWidth: '80px' }}
                                >
                                  {category.units.map(unitOption => (
                                    <option key={unitOption} value={unitOption}>{unitOption}</option>
                                  ))}
                                </select>
                              </div>
                            )
                          })()}
                        </div>

                        {/* Desktop layout */}
                        <div className="relative hidden md:block" style={{ gap: '4px', display: 'flex', flexDirection: 'column' }}>
                          {product.entries.map((entry, entryIndex) => {
                            const receptionDate = entry.receptionDate || getTodayString()
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
                                <div className="hidden md:grid items-center" style={{ 
                                  gridTemplateColumns: '1fr 150px 154px 28px 180px',
                                  gap: '8px'
                                }}>
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

                                <div className="flex items-center" style={{ gap: '4px' }}>
                                  <button
                                    onClick={() => updateProductEntry(
                                      product.category, product.productName, entryIndex, 'receptionDate',
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
                                      product.category, product.productName, entryIndex, 'receptionDate', e.target.value
                                    )}
                                    max={getTodayString()}
                                    className="hidden"
                                    id={`date-tst-${product.category}-${product.productName}-${entryIndex}`}
                                  />
                                  <label
                                    htmlFor={`date-tst-${product.category}-${product.productName}-${entryIndex}`}
                                    className="rounded-lg border-2 border-secondary/20 hover:border-secondary/50 cursor-pointer text-xs font-medium text-center"
                                    style={{ 
                                      width: '55px', height: '28px', padding: '4px 6px', 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      backgroundColor: getDateBackgroundColor(receptionDate) || 'white',
                                      color: getDateBackgroundColor(receptionDate) === '#ef4444' ? 'white' : '#2B2D42'
                                    }}
                                  >
                                    {formatDateShort(receptionDate)}
                                  </label>
                                  <button
                                    onClick={() => updateProductEntry(
                                      product.category, product.productName, entryIndex, 'receptionDate',
                                      adjustDate(receptionDate, 1)
                                    )}
                                    className="rounded-lg bg-primary/50 hover:bg-primary flex items-center justify-center text-secondary font-bold transition-colors text-xs"
                                    style={{ width: '24px', height: '28px' }}
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="flex items-center" style={{ gap: '4px' }}>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={quantity || ''}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9,]/g, '')
                                      const numValue = parseFloat(value.replace(',', '.')) || 0
                                      updateProductEntry(product.category, product.productName, entryIndex, 'quantity', numValue)
                                    }}
                                    placeholder="0"
                                    className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-center text-xs bg-white"
                                    style={{ width: '48px', height: '28px', padding: '4px 6px' }}
                                  />
                                  <select
                                    value={unit}
                                    onChange={(e) => updateProductEntry(
                                      product.category, product.productName, entryIndex, 'unit', e.target.value
                                    )}
                                    className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-xs bg-white"
                                    style={{ width: '70px', height: '28px', padding: '4px 8px' }}
                                  >
                                    {category.units.map(unitOption => (
                                      <option key={unitOption} value={unitOption}>{unitOption}</option>
                                    ))}
                                  </select>
                                </div>

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

                                {entryIndex === 0 ? (() => {
                                  const predefinedValues = getPredefinedValues(product.category, product.productName)
                                  const showPopup = focusedRequiredQuantityField?.category === product.category && 
                                                  focusedRequiredQuantityField?.productName === product.productName
                                  return (
                                    <div className="flex items-center rounded-lg bg-blue-100/60 relative" style={{ padding: '4px 8px', gap: '4px' }}>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          value={requiredQuantity || ''}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9,]/g, '')
                                            const numValue = parseFloat(value.replace(',', '.')) || 0
                                            updateProductEntry(product.category, product.productName, entryIndex, 'requiredQuantity', numValue)
                                          }}
                                          onFocus={() => {
                                            if (predefinedValues.length > 0) {
                                              setFocusedRequiredQuantityField({ category: product.category, productName: product.productName })
                                            }
                                          }}
                                          onBlur={(e) => {
                                            const relatedTarget = e.relatedTarget as HTMLElement
                                            if (!relatedTarget || !relatedTarget.closest('.predefined-values-popup')) {
                                              setTimeout(() => { setFocusedRequiredQuantityField(null) }, 150)
                                            }
                                          }}
                                          placeholder="0"
                                          className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-center text-xs bg-white"
                                          style={{ width: '48px', height: '28px', padding: '4px 6px' }}
                                        />
                                        {showPopup && predefinedValues.length > 0 && (
                                          <div 
                                            className="absolute flex gap-2 z-50 p-2 rounded-xl backdrop-blur-md predefined-values-popup"
                                            style={{ 
                                              backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                              minWidth: '120px',
                                              bottom: 'calc(100% + 8px)',
                                              left: '50%',
                                              transform: 'translateX(-50%)'
                                            }}
                                          >
                                            {predefinedValues.map((value, index) => (
                                              <button
                                                key={index}
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault()
                                                  e.stopPropagation()
                                                  handlePredefinedValueSelect(value, product.category, product.productName)
                                                }}
                                                className="px-3 py-2 rounded-lg bg-accent-purple/90 hover:bg-accent-purple text-white font-bold text-xs shadow-lg transition-all hover:scale-105 whitespace-nowrap"
                                              >
                                                {value}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <select
                                        value={requiredUnit}
                                        onChange={(e) => updateProductEntry(
                                          product.category, product.productName, entryIndex, 'requiredUnit', e.target.value
                                        )}
                                        className="rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-xs bg-white"
                                        style={{ width: '70px', height: '28px', padding: '4px 8px' }}
                                      >
                                        {category.units.map(unitOption => (
                                          <option key={unitOption} value={unitOption}>{unitOption}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )
                                })() : (
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

                  <div className="mt-4 pt-2">
                    <button
                      onClick={() => {
                        const newProductName = ''
                        addProductEntry(category.name, newProductName, category.defaultUnit, true)
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-accent-purple/20 hover:bg-accent-purple/30 border-2 border-dashed border-secondary/30 transition-all duration-300 font-bold text-sm text-secondary"
                    >
                      + ADAUGA PRODUS
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile Floating Bottom Bar - Rendered via Portal */}
        {typeof window !== 'undefined' && createPortal(
          <div 
            ref={(el) => {
              bottomBarRef.current = el
              if (el) {
                setBottomBarReady(true)
              }
            }}
            className="md:hidden"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              background: 'linear-gradient(to top, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 25%, rgba(255, 255, 255, 0.5) 60%, rgba(255, 255, 255, 0) 100%)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transform: 'translate3d(0, 0, 0)',
              WebkitTransform: 'translate3d(0, 0, 0)',
              transition: 'transform 0.3s ease-out',
              paddingTop: '2.25rem',
              paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0))`,
              width: '100%',
              boxSizing: 'border-box',
              pointerEvents: 'auto',
              touchAction: 'none'
            }}
          >
            <div 
              className="container mx-auto px-4 flex flex-col gap-2"
              style={{ paddingBottom: '0.75rem' }}
            >
              <div className="flex gap-3">
                <button
                  onClick={handleNextCategory}
                  className="flex-1 px-4 py-3 rounded-xl bg-accent-purple/80 hover:bg-accent-purple text-white font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  URMĂTOAREA CATEGORIE
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-secondary font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  ÎNCHIDE
                </button>
              </div>
              <button
                onClick={handleReset}
                className="w-full px-4 py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold text-xs transition-all duration-300 shadow-md hover:shadow-lg"
              >
                RESETARE
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}

export default InventoryTST
