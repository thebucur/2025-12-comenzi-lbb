import { useState, useMemo } from 'react'
import { DictatedEntry } from '../services/inventory.api'

interface InventoryCategory {
  id: string
  name: string
  units: string[]
  defaultUnit: string
  products: { name: string; id: string }[]
}

interface DictationReviewModalProps {
  transcript: string
  entries: DictatedEntry[]
  categories: InventoryCategory[]
  onConfirm: (entries: DictatedEntry[]) => void
  onCancel: () => void
}

export default function DictationReviewModal({
  transcript,
  entries: initialEntries,
  categories,
  onConfirm,
  onCancel,
}: DictationReviewModalProps) {
  const [entries, setEntries] = useState<DictatedEntry[]>(
    initialEntries.length > 0
      ? initialEntries
      : [{ productName: '', category: '', receptionDate: new Date().toISOString().slice(0, 10), quantity: 0, unit: '', isNecesar: false, action: 'add' }]
  )

  const allProducts = useMemo(() => {
    const products: { name: string; category: string; units: string[]; defaultUnit: string }[] = []
    categories.forEach(cat => {
      cat.products.forEach(p => {
        products.push({ name: p.name, category: cat.name, units: cat.units, defaultUnit: cat.defaultUnit })
      })
    })
    return products
  }, [categories])

  const getCategoryForProduct = (productName: string): InventoryCategory | undefined => {
    return categories.find(cat => cat.products.some(p => p.name === productName))
  }

  const getUnitsForEntry = (entry: DictatedEntry): string[] => {
    const cat = categories.find(c => c.name === entry.category)
    if (cat) return cat.units
    const productCat = getCategoryForProduct(entry.productName)
    if (productCat) return productCat.units
    const allUnits = new Set<string>()
    categories.forEach(c => c.units.forEach(u => allUnits.add(u)))
    return Array.from(allUnits)
  }

  const updateEntry = (index: number, field: keyof DictatedEntry, value: any) => {
    setEntries(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

      if (field === 'productName') {
        const match = allProducts.find(p => p.name === value)
        if (match) {
          updated[index].category = match.category
          if (!match.units.includes(updated[index].unit)) {
            updated[index].unit = match.defaultUnit
          }
        }
      }

      return updated
    })
  }

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index))
  }

  const addEmptyEntry = () => {
    const defaultCat = categories[0]
    setEntries(prev => [...prev, {
      productName: '',
      category: defaultCat?.name || '',
      receptionDate: new Date().toISOString().slice(0, 10),
      quantity: 0,
      unit: defaultCat?.defaultUnit || 'buc.',
      isNecesar: false,
      action: 'add',
    }])
  }

  const validEntries = entries.filter(e => e.productName && (e.quantity > 0 || e.action === 'remove'))
  const addCount = validEntries.filter(e => e.action === 'add').length
  const removeCount = validEntries.filter(e => e.action === 'remove').length

  return (
    <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div
        className="glass-card w-full max-w-3xl p-6 md:p-8 my-4"
        style={{ animation: 'modalIn 0.3s ease-out' }}
      >
        <h3 className="text-2xl font-bold text-gradient mb-4 text-center">
          REZUMAT DICTARE
        </h3>

        {/* Transcript */}
        {transcript && (
          <div className="mb-4 p-3 rounded-xl bg-purple-50/80 border border-purple-200/50">
            <p className="text-xs font-bold text-secondary/50 mb-1">TRANSCRIPT:</p>
            <p className="text-sm text-secondary/80 italic">"{transcript}"</p>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-secondary/60 mb-4">Nu s-au putut identifica produse din dictare.</p>
            <button
              onClick={addEmptyEntry}
              className="px-4 py-2 rounded-xl bg-accent-purple/20 hover:bg-accent-purple/30 border-2 border-dashed border-secondary/30 font-bold text-sm text-secondary transition-all"
            >
              + ADAUGĂ MANUAL
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary/60 font-bold border-b border-secondary/10">
                    <th className="pb-2 pr-2"></th>
                    <th className="pb-2 pr-2">PRODUS</th>
                    <th className="pb-2 pr-2">DATA</th>
                    <th className="pb-2 pr-2">CANT.</th>
                    <th className="pb-2 pr-2">UM</th>
                    <th className="pb-2 pr-2">TIP</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const availableUnits = getUnitsForEntry(entry)
                    const isRemoval = entry.action === 'remove'
                    return (
                      <tr key={idx} className={`border-b border-secondary/5 ${isRemoval ? 'bg-rose-50/60' : ''}`}>
                        <td className="py-2 pr-2">
                          <button
                            onClick={() => updateEntry(idx, 'action', isRemoval ? 'add' : 'remove')}
                            className={`w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${
                              isRemoval
                                ? 'bg-rose-100 text-rose-600 border-2 border-rose-300'
                                : 'bg-emerald-100 text-emerald-600 border-2 border-emerald-300'
                            }`}
                            title={isRemoval ? 'Ștergere - click pentru a schimba în adăugare' : 'Adăugare - click pentru a schimba în ștergere'}
                          >
                            {isRemoval ? '−' : '+'}
                          </button>
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            value={entry.productName}
                            onChange={(e) => updateEntry(idx, 'productName', e.target.value)}
                            className={`w-full px-2 py-1.5 rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-sm font-semibold bg-white ${isRemoval ? 'line-through text-rose-500' : ''}`}
                          >
                            <option value="">-- Selectează --</option>
                            {categories.map(cat => (
                              <optgroup key={cat.id} label={cat.name}>
                                {cat.products.map(p => (
                                  <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="date"
                            value={entry.receptionDate}
                            onChange={(e) => updateEntry(idx, 'receptionDate', e.target.value)}
                            className="px-2 py-1.5 rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-sm bg-white"
                            style={{ width: '140px' }}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-1">
                            {isRemoval && <span className="text-rose-500 font-bold">−</span>}
                            <input
                              type="text"
                              inputMode="decimal"
                              value={entry.quantity || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9,]/g, '')
                                updateEntry(idx, 'quantity', parseFloat(val.replace(',', '.')) || 0)
                              }}
                              placeholder={isRemoval ? 'tot' : '0'}
                              className={`px-2 py-1.5 rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-center text-sm font-bold bg-white ${isRemoval ? 'text-rose-500' : ''}`}
                              style={{ width: '60px' }}
                            />
                          </div>
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            value={entry.unit}
                            onChange={(e) => updateEntry(idx, 'unit', e.target.value)}
                            className="px-2 py-1.5 rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-sm bg-white"
                            style={{ width: '80px' }}
                          >
                            {availableUnits.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          {isRemoval ? (
                            <span className="px-3 py-1.5 rounded-lg font-bold text-xs bg-rose-100 text-rose-600 border-2 border-rose-300 inline-block">
                              ȘTERGERE
                            </span>
                          ) : (
                            <button
                              onClick={() => updateEntry(idx, 'isNecesar', !entry.isNecesar)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                entry.isNecesar
                                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                  : 'bg-green-100 text-green-700 border-2 border-green-300'
                              }`}
                            >
                              {entry.isNecesar ? 'NECESAR' : 'INVENTAR'}
                            </button>
                          )}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => removeEntry(idx)}
                            className="w-8 h-8 rounded-lg bg-rose-500/80 hover:bg-rose-600 flex items-center justify-center text-white transition-colors font-bold"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 mb-4">
              {entries.map((entry, idx) => {
                const availableUnits = getUnitsForEntry(entry)
                const isRemoval = entry.action === 'remove'
                return (
                  <div key={idx} className={`p-3 rounded-xl border space-y-2 ${isRemoval ? 'bg-rose-50/80 border-rose-200' : 'bg-white/80 border-secondary/10'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateEntry(idx, 'action', isRemoval ? 'add' : 'remove')}
                          className={`w-7 h-7 rounded-lg font-bold text-base flex items-center justify-center transition-all ${
                            isRemoval
                              ? 'bg-rose-100 text-rose-600 border-2 border-rose-300'
                              : 'bg-emerald-100 text-emerald-600 border-2 border-emerald-300'
                          }`}
                        >
                          {isRemoval ? '−' : '+'}
                        </button>
                        {isRemoval ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-600">
                            ȘTERGERE
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            entry.isNecesar
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {entry.isNecesar ? 'NECESAR' : 'INVENTAR'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isRemoval && (
                          <button
                            onClick={() => updateEntry(idx, 'isNecesar', !entry.isNecesar)}
                            className="text-xs text-secondary/50 underline"
                          >
                            schimbă
                          </button>
                        )}
                        <button
                          onClick={() => removeEntry(idx)}
                          className="w-7 h-7 rounded-lg bg-rose-500/80 hover:bg-rose-600 flex items-center justify-center text-white text-sm font-bold"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <select
                      value={entry.productName}
                      onChange={(e) => updateEntry(idx, 'productName', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-sm font-bold bg-white ${isRemoval ? 'line-through text-rose-500' : ''}`}
                    >
                      <option value="">-- Selectează produs --</option>
                      {categories.map(cat => (
                        <optgroup key={cat.id} label={cat.name}>
                          {cat.products.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={entry.receptionDate}
                        onChange={(e) => updateEntry(idx, 'receptionDate', e.target.value)}
                        className="flex-1 px-2 py-2 rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-sm bg-white"
                      />
                      <div className="flex items-center gap-1">
                        {isRemoval && <span className="text-rose-500 font-bold">−</span>}
                        <input
                          type="text"
                          inputMode="decimal"
                          value={entry.quantity || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9,]/g, '')
                            updateEntry(idx, 'quantity', parseFloat(val.replace(',', '.')) || 0)
                          }}
                          placeholder={isRemoval ? 'tot' : '0'}
                          className={`px-2 py-2 rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-center text-sm font-bold bg-white ${isRemoval ? 'text-rose-500' : ''}`}
                          style={{ width: '60px' }}
                        />
                      </div>
                      <select
                        value={entry.unit}
                        onChange={(e) => updateEntry(idx, 'unit', e.target.value)}
                        className="px-2 py-2 rounded-lg border-2 border-secondary/20 focus:border-secondary/50 text-sm bg-white"
                        style={{ width: '70px' }}
                      >
                        {availableUnits.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add row */}
            <button
              onClick={addEmptyEntry}
              className="w-full px-4 py-2.5 rounded-xl bg-accent-purple/20 hover:bg-accent-purple/30 border-2 border-dashed border-secondary/30 font-bold text-sm text-secondary transition-all mb-4"
            >
              + ADAUGĂ PRODUS
            </button>
          </>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={() => onConfirm(validEntries)}
            disabled={validEntries.length === 0}
            className="btn-active px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            SALVEAZĂ ({addCount > 0 ? `+${addCount}` : ''}{addCount > 0 && removeCount > 0 ? ' / ' : ''}{removeCount > 0 ? `−${removeCount}` : ''} {validEntries.length === 1 ? 'produs' : 'produse'})
          </button>
          <button
            onClick={onCancel}
            className="btn-neumorphic px-8 py-3 rounded-2xl font-bold text-base text-secondary hover:scale-105 transition-all duration-300"
          >
            ANULEAZĂ
          </button>
        </div>
      </div>
    </div>
  )
}
