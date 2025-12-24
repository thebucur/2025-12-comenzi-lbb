import { useState, useEffect } from 'react'
import api from '../../services/api'

interface InventoryProduct {
  id: string
  categoryId: string
  name: string
  displayOrder: number
  predefinedValues?: number[]
  createdAt: string
  updatedAt: string
}

interface InventoryCategory {
  id: string
  name: string
  units: string[]
  defaultUnit: string
  displayOrder: number
  products: InventoryProduct[]
  createdAt: string
  updatedAt: string
}

interface InventoryProductsManagerProps {
  onRefresh?: () => void
}

function InventoryProductsManager({ onRefresh }: InventoryProductsManagerProps) {
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    units: [] as string[],
    defaultUnit: '',
  })
  const [newUnitInput, setNewUnitInput] = useState('')
  
  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null)
  const [productCategoryId, setProductCategoryId] = useState('')
  const [productFormData, setProductFormData] = useState({
    name: '',
    predefinedValues: [] as number[],
  })
  const [newPredefinedValueInput, setNewPredefinedValueInput] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      console.log('Fetching inventory products categories...')
      const response = await api.get('/inventory-products/categories')
      console.log('Categories loaded:', response.data)
      // Categories are already sorted by displayOrder from backend
      setCategories(response.data || [])
      // Keep categories collapsed by default - don't expand all
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Eroare necunoscută'
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: errorMessage,
      })
      alert(`Eroare la încărcarea categoriilor: ${errorMessage}`)
      setCategories([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleMoveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = categories.findIndex(c => c.id === categoryId)
      if (currentIndex === -1) return

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      
      // Check bounds
      if (newIndex < 0 || newIndex >= categories.length) return

      // Create new order
      const newCategories = [...categories]
      const [movedCategory] = newCategories.splice(currentIndex, 1)
      newCategories.splice(newIndex, 0, movedCategory)

      // Get ordered category IDs
      const categoryIds = newCategories.map(c => c.id)

      // Update order on backend
      await api.post('/inventory-products/categories/reorder', { categoryIds })

      // Refresh categories
      fetchCategories()
      onRefresh?.()
    } catch (error: any) {
      console.error('Error reordering category:', error)
      const errorMessage = error.response?.data?.error || 'Eroare la reordonarea categoriei'
      alert(errorMessage)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // Category handlers
  const handleCreateCategory = () => {
    setEditingCategory(null)
    setCategoryFormData({ name: '', units: [], defaultUnit: '' })
    setShowCategoryModal(true)
  }

  const handleEditCategory = (category: InventoryCategory) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      units: [...category.units],
      defaultUnit: category.defaultUnit,
    })
    setShowCategoryModal(true)
  }

  const handleAddUnit = () => {
    if (!newUnitInput.trim()) return
    
    if (categoryFormData.units.includes(newUnitInput.trim())) {
      alert('Această unitate de măsură există deja')
      return
    }
    
    setCategoryFormData({
      ...categoryFormData,
      units: [...categoryFormData.units, newUnitInput.trim()],
    })
    setNewUnitInput('')
  }

  const handleRemoveUnit = (unit: string) => {
    if (categoryFormData.defaultUnit === unit) {
      alert('Nu puteți șterge unitatea de măsură implicită')
      return
    }
    
    setCategoryFormData({
      ...categoryFormData,
      units: categoryFormData.units.filter((u) => u !== unit),
    })
  }

  const handleSaveCategory = async () => {
    try {
      if (!categoryFormData.name.trim()) {
        alert('Numele categoriei este obligatoriu')
        return
      }

      if (categoryFormData.units.length === 0) {
        alert('Adăugați cel puțin o unitate de măsură')
        return
      }

      if (!categoryFormData.defaultUnit) {
        alert('Selectați o unitate de măsură implicită')
        return
      }

      if (editingCategory) {
        await api.put(`/inventory-products/categories/${editingCategory.id}`, categoryFormData)
      } else {
        await api.post('/inventory-products/categories', categoryFormData)
      }

      setShowCategoryModal(false)
      fetchCategories()
      onRefresh?.()
    } catch (error: any) {
      console.error('Error saving category:', error)
      const errorMessage = error.response?.data?.error || 'Eroare la salvarea categoriei'
      alert(errorMessage)
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Sigur doriți să ștergeți categoria "${categoryName}"? Toate produsele din această categorie vor fi șterse.`)) {
      return
    }

    try {
      await api.delete(`/inventory-products/categories/${categoryId}`)
      fetchCategories()
      onRefresh?.()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      const errorMessage = error.response?.data?.error || 'Eroare la ștergerea categoriei'
      alert(errorMessage)
    }
  }

  // Product handlers
  const handleCreateProduct = (categoryId: string) => {
    setEditingProduct(null)
    setProductCategoryId(categoryId)
    setProductFormData({ name: '', predefinedValues: [] })
    setNewPredefinedValueInput('')
    setShowProductModal(true)
  }

  const handleEditProduct = (product: InventoryProduct) => {
    setEditingProduct(product)
    setProductCategoryId(product.categoryId)
    setProductFormData({ 
      name: product.name,
      predefinedValues: product.predefinedValues || []
    })
    setNewPredefinedValueInput('')
    setShowProductModal(true)
  }

  const handleAddPredefinedValue = () => {
    if (!newPredefinedValueInput.trim()) return
    
    const numValue = parseFloat(newPredefinedValueInput.trim())
    if (isNaN(numValue)) {
      alert('Introduceți o valoare numerică validă')
      return
    }

    if (productFormData.predefinedValues.length >= 4) {
      alert('Puteți adăuga maximum 4 valori predefinite')
      return
    }

    if (productFormData.predefinedValues.includes(numValue)) {
      alert('Această valoare există deja')
      return
    }

    setProductFormData({
      ...productFormData,
      predefinedValues: [...productFormData.predefinedValues, numValue]
    })
    setNewPredefinedValueInput('')
  }

  const handleRemovePredefinedValue = (index: number) => {
    setProductFormData({
      ...productFormData,
      predefinedValues: productFormData.predefinedValues.filter((_, i) => i !== index)
    })
  }

  const handleUpdatePredefinedValue = (index: number, newValue: string) => {
    const numValue = parseFloat(newValue.trim())
    if (isNaN(numValue) && newValue.trim() !== '') {
      return // Don't update if invalid number (unless empty)
    }
    
    const newValues = [...productFormData.predefinedValues]
    if (newValue.trim() === '') {
      // Remove if empty
      newValues.splice(index, 1)
    } else {
      newValues[index] = numValue
    }
    setProductFormData({
      ...productFormData,
      predefinedValues: newValues
    })
  }

  const handleSaveProduct = async () => {
    try {
      if (!productFormData.name.trim()) {
        alert('Numele produsului este obligatoriu')
        return
      }

      const savedCategoryId = productCategoryId

      if (editingProduct) {
        await api.put(`/inventory-products/products/${editingProduct.id}`, productFormData)
      } else {
        await api.post('/inventory-products/products', {
          categoryId: productCategoryId,
          name: productFormData.name,
          predefinedValues: productFormData.predefinedValues,
        })
      }

      setShowProductModal(false)
      await fetchCategories()
      
      // Expand the category where the product was added/edited
      if (savedCategoryId) {
        setExpandedCategories((prev) => {
          const newSet = new Set(prev)
          newSet.add(savedCategoryId)
          return newSet
        })
        
        // Scroll to the category after a short delay to allow DOM update
        setTimeout(() => {
          const categoryElement = document.querySelector(`[data-category-id="${savedCategoryId}"]`)
          if (categoryElement) {
            categoryElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        }, 100)
      }
      
      onRefresh?.()
    } catch (error: any) {
      console.error('Error saving product:', error)
      const errorMessage = error.response?.data?.error || 'Eroare la salvarea produsului'
      alert(errorMessage)
    }
  }

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Sigur doriți să ștergeți produsul "${productName}"?`)) {
      return
    }

    try {
      await api.delete(`/inventory-products/products/${productId}`)
      fetchCategories()
      onRefresh?.()
    } catch (error: any) {
      console.error('Error deleting product:', error)
      const errorMessage = error.response?.data?.error || 'Eroare la ștergerea produsului'
      alert(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="card-neumorphic text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink shadow-glow-purple mb-4 animate-float">
          <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-secondary/60">Se încarcă produsele...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-neumorphic flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary mb-2">Produse Inventar</h2>
          <p className="text-secondary/60">Gestionează categoriile și produsele pentru inventar</p>
        </div>
        <button
          onClick={handleCreateCategory}
          className="btn-active px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all w-full md:w-auto"
        >
          + Adaugă categorie
        </button>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="card-neumorphic text-center py-16">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-2xl font-bold text-secondary/50 mb-2">Nu există categorii</p>
          <p className="text-secondary/40">Adăugați prima categorie pentru a începe</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id)
            
            return (
              <div key={category.id} data-category-id={category.id} className="card-neumorphic">
                {/* Category Header */}
                <div className="mb-4">
                  {/* Title row */}
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="text-2xl hover:scale-110 transition-all"
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <h3 className="text-2xl font-bold text-gradient whitespace-nowrap flex-1">{category.name}</h3>
                  </div>
                  
                  {/* Details row */}
                  <p className="text-secondary/60 text-sm mb-3 ml-9">
                    {category.products.length} produse • Unități: {category.units.join(', ')} • Implicit: {category.defaultUnit}
                  </p>
                  
                  {/* Buttons row */}
                  <div className="flex gap-2 ml-9 md:ml-0 md:justify-end">
                    <button
                      onClick={() => handleMoveCategory(category.id, 'up')}
                      disabled={categories.findIndex(c => c.id === category.id) === 0}
                      className="btn-neumorphic px-3 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      title="Mută în sus"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveCategory(category.id, 'down')}
                      disabled={categories.findIndex(c => c.id === category.id) === categories.length - 1}
                      className="btn-neumorphic px-3 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      title="Mută în jos"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="btn-neumorphic px-4 py-3 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
                      title="Editează categoria"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                      className="px-4 py-3 bg-red-100 text-red-600 rounded-2xl font-bold hover:scale-105 transition-all shadow-neumorphic"
                      title="Șterge categoria"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Products List */}
                {isExpanded && (
                  <div className="bg-primary/30 p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-secondary">Produse</h4>
                      <button
                        onClick={() => handleCreateProduct(category.id)}
                        className="btn-neumorphic px-4 py-2 rounded-xl font-bold text-secondary hover:scale-105 transition-all text-sm"
                      >
                        + Adaugă produs
                      </button>
                    </div>

                    {category.products.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-secondary/50">Nu există produse în această categorie</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {category.products.map((product) => (
                          <div
                            key={product.id}
                            className={`bg-primary/50 px-4 py-3 rounded-xl flex items-center justify-between group hover:bg-primary/70 transition-all ${
                              product.predefinedValues && product.predefinedValues.length > 0
                                ? 'border-2 border-blue-500'
                                : ''
                            }`}
                          >
                            <span className="text-secondary font-semibold">{product.name}</span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="text-blue-500 hover:text-blue-700 transition-colors font-bold text-sm"
                                title="Editează"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                className="text-red-500 hover:text-red-700 transition-colors font-bold text-sm"
                                title="Șterge"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-2xl w-full p-8 animate-float max-h-[90vh] overflow-y-auto">
            <h3 className="text-3xl font-bold text-gradient mb-6">
              {editingCategory ? 'Editează categorie' : 'Adaugă categorie'}
            </h3>
            
            <div className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block mb-3 font-bold text-secondary">Nume categorie *</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                  placeholder="Ex: PRODUSE LA BUCATA"
                />
              </div>

              {/* Units */}
              <div>
                <label className="block mb-3 font-bold text-secondary">Unități de măsură *</label>
                
                {/* Add unit input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newUnitInput}
                    onChange={(e) => setNewUnitInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddUnit()
                      }
                    }}
                    className="input-neumorphic flex-1 text-secondary placeholder:text-secondary/40"
                    placeholder="Ex: buc., kg, tv"
                  />
                  <button
                    onClick={handleAddUnit}
                    className="btn-active px-6 py-2 rounded-xl font-bold hover:scale-105 transition-all"
                  >
                    + Adaugă
                  </button>
                </div>

                {/* Units list */}
                {categoryFormData.units.length > 0 && (
                  <div className="space-y-2">
                    {categoryFormData.units.map((unit) => (
                      <div
                        key={unit}
                        className="bg-primary/50 px-4 py-2 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-secondary font-semibold">{unit}</span>
                          {categoryFormData.defaultUnit === unit && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                              Implicit
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCategoryFormData({ ...categoryFormData, defaultUnit: unit })}
                            disabled={categoryFormData.defaultUnit === unit}
                            className="text-blue-500 hover:text-blue-700 transition-colors font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Setează ca implicit"
                          >
                            ⭐
                          </button>
                          <button
                            onClick={() => handleRemoveUnit(unit)}
                            className="text-red-500 hover:text-red-700 transition-colors font-bold"
                            title="Șterge"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveCategory}
                className="flex-1 btn-active px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all"
              >
                ✓ Salvează
              </button>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="btn-neumorphic px-6 py-4 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
              >
                ✕ Anulează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-8 animate-float">
            <h3 className="text-3xl font-bold text-gradient mb-6">
              {editingProduct ? 'Editează produs' : 'Adaugă produs'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-3 font-bold text-secondary">Nume produs *</label>
                <input
                  type="text"
                  value={productFormData.name}
                  onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
                  placeholder="Ex: Ecler frisca"
                  autoFocus
                />
              </div>

              {/* Predefined Values */}
              <div>
                <label className="block mb-3 font-bold text-secondary">
                  Valori predefinite (max 4)
                </label>
                <p className="text-sm text-secondary/60 mb-3">
                  Aceste valori vor apărea ca butoane când utilizatorul dă click pe câmpul "Necesar"
                </p>
                
                {/* Add value input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="number"
                    step="any"
                    value={newPredefinedValueInput}
                    onChange={(e) => setNewPredefinedValueInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddPredefinedValue()
                      }
                    }}
                    className="input-neumorphic flex-1 text-secondary placeholder:text-secondary/40"
                    placeholder="Ex: 10, 25.5, 100"
                    disabled={productFormData.predefinedValues.length >= 4}
                  />
                  <button
                    onClick={handleAddPredefinedValue}
                    disabled={productFormData.predefinedValues.length >= 4}
                    className="btn-active px-6 py-2 rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    + Adaugă
                  </button>
                </div>

                {/* Values list */}
                {productFormData.predefinedValues.length > 0 && (
                  <div className="space-y-2">
                    {productFormData.predefinedValues.map((value, index) => (
                      <div
                        key={index}
                        className="bg-primary/50 px-4 py-2 rounded-xl flex items-center justify-between"
                      >
                        <input
                          type="number"
                          step="any"
                          value={value}
                          onChange={(e) => handleUpdatePredefinedValue(index, e.target.value)}
                          className="bg-transparent border-none outline-none text-secondary font-semibold flex-1"
                        />
                        <button
                          onClick={() => handleRemovePredefinedValue(index)}
                          className="text-red-500 hover:text-red-700 transition-colors font-bold"
                          title="Șterge"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveProduct}
                className="flex-1 btn-active px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all"
              >
                ✓ Salvează
              </button>
              <button
                onClick={() => setShowProductModal(false)}
                className="btn-neumorphic px-6 py-4 rounded-2xl font-bold text-secondary hover:scale-105 transition-all"
              >
                ✕ Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryProductsManager

