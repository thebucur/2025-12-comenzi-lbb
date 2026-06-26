import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOrder } from '../../context/OrderContext'
import { CakeType, Weight, Shape, Floors, OrderCake } from '../../types/order.types'
import { useInstallationConfig } from '../../hooks/useInstallationConfig'
import PhotoUploader from '../PhotoUploader'

// Default values (fallback if config not available)
const defaultCakeTypes: CakeType[] = [
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
]

const defaultWeights: Weight[] = ['1 KG', '1.5 KG', '2 KG', '2.5 KG', '3 KG', 'ALTĂ GREUTATE']
const defaultShapes: Shape[] = ['ROTUND', 'DREPTUNGHIULAR', 'ALTĂ FORMĂ']
const defaultFloors: Floors[] = ['1', '2', '3', '4', '5']

const CAKE_TAB = 0
const OTHER_TAB = 1

function Screen2Sortiment() {
  const { order, updateOrder } = useOrder()
  const config = useInstallationConfig()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')

  const cake = order.cakes[0]
  const [activeTab, setActiveTab] = useState<number>(
    () => (tabParam === 'alte-produse' ? OTHER_TAB : CAKE_TAB),
  )

  useEffect(() => {
    if (tabParam === 'alte-produse') setActiveTab(OTHER_TAB)
    else if (tabParam === 'tort') setActiveTab(CAKE_TAB)
  }, [tabParam])

  const getWeightSortValue = (weight: string) => {
    const match = weight.match(/[\d]+(?:[.,]\d+)?/)
    return match ? parseFloat(match[0].replace(',', '.')) : Number.POSITIVE_INFINITY
  }

  const sortedWeights = useMemo(
    () =>
      [...((config?.sortiment?.weights as Weight[]) || defaultWeights)].sort((a, b) => {
        const diff = getWeightSortValue(a) - getWeightSortValue(b)
        return diff !== 0 ? diff : a.localeCompare(b)
      }),
    [config?.sortiment?.weights],
  )

  const cakeTypes = (config?.sortiment?.cakeTypes as CakeType[]) || defaultCakeTypes
  const weights = sortedWeights
  const shapes = (config?.sortiment?.shapes as Shape[]) || defaultShapes
  const floors = (config?.sortiment?.floors as Floors[]) || defaultFloors

  const updateCake = (patch: Partial<OrderCake>) => {
    const next = order.cakes.map((c, i) => (i === 0 ? { ...c, ...patch } : c))
    updateOrder({ cakes: next })
  }

  const w = cake?.weight
  const showShapeSection =
    w === '2 KG' || w === '2.5 KG' || w === '3 KG' || w === 'ALTĂ GREUTATE'
  const showFloorsSection = w === '3 KG' || w === 'ALTĂ GREUTATE'

  const setWeight = (weight: Weight) => {
    const patch: Partial<OrderCake> = { weight }
    if (
      weight !== '2 KG' &&
      weight !== '2.5 KG' &&
      weight !== '3 KG' &&
      weight !== 'ALTĂ GREUTATE'
    ) {
      patch.shape = null
      patch.floors = null
    } else if (weight !== '3 KG' && weight !== 'ALTĂ GREUTATE') {
      patch.floors = null
    }
    updateCake(patch)
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 [scrollbar-gutter:stable]">
      <h2 className="text-4xl font-bold text-center text-gradient mb-12">Produse</h2>

      <div className="card-neumorphic w-full min-w-0 max-w-full p-0 overflow-hidden">
        {/* Tab strip */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-secondary/15">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 flex-1" role="tablist" aria-label="Produse comandate">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === CAKE_TAB}
              onClick={() => setActiveTab(CAKE_TAB)}
              className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 ${
                activeTab === CAKE_TAB ? 'btn-active scale-[1.02]' : 'bg-primary/50 text-secondary hover:scale-102'
              }`}
            >
              🎂 TORT
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === OTHER_TAB}
              onClick={() => setActiveTab(OTHER_TAB)}
              className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 ${
                activeTab === OTHER_TAB ? 'btn-active scale-[1.02]' : 'bg-primary/50 text-secondary hover:scale-102'
              }`}
            >
              🍰 ALTE PRODUSE
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8 space-y-8">
          {activeTab === CAKE_TAB && cake && (
            <div className="card-neumorphic space-y-6">
              <div>
                <h3 className="text-xl font-bold text-secondary mb-6">🎂 Tipuri de torturi</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {cakeTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateCake({ cakeType: type })}
                      className={`p-4 rounded-2xl font-semibold transition-all duration-300 text-sm ${
                        type === 'MOUSSE DE CIOCOLATĂ NEAGRĂ' ? 'md:col-span-2' : ''
                      } ${cake.cakeType === type ? 'btn-active scale-105' : 'btn-neumorphic hover:scale-102'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card-neumorphic">
                <h3 className="text-xl font-bold text-secondary mb-6">⚖️ Greutate</h3>
                <div className="flex flex-wrap gap-4">
                  {weights.map((weight) => (
                    <button
                      key={weight}
                      type="button"
                      onClick={() => setWeight(weight)}
                      className={`px-8 py-4 rounded-full font-bold transition-all duration-300 ${
                        w === weight ? 'btn-active scale-105' : 'btn-neumorphic hover:scale-102'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
                {w === 'ALTĂ GREUTATE' && (
                  <input
                    type="text"
                    value={cake.customWeight}
                    onChange={(e) => updateCake({ customWeight: e.target.value })}
                    placeholder="Specificați greutatea (ex: 4.5 KG)"
                    className="input-neumorphic mt-6 w-full text-secondary placeholder:text-secondary/40"
                  />
                )}
              </div>

              {showShapeSection && (
                <div className="card-neumorphic animate-float">
                  <h3 className="text-xl font-bold text-secondary mb-6">📐 Formă</h3>
                  <div className="flex flex-wrap gap-4">
                    {shapes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateCake({ shape: s })}
                        className={`px-8 py-4 rounded-full font-bold transition-all duration-300 ${
                          cake.shape === s ? 'btn-active scale-105' : 'btn-neumorphic hover:scale-102'
                        }`}
                      >
                        {s === 'ROTUND' && '⭕ '}
                        {s === 'DREPTUNGHIULAR' && '▭ '}
                        {s === 'ALTĂ FORMĂ' && '✨ '}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showFloorsSection && (
                <div className="card-neumorphic animate-float" style={{ animationDelay: '0.1s' }}>
                  <h3 className="text-xl font-bold text-secondary mb-6">🏢 Număr Etaje</h3>
                  <div className="flex flex-wrap gap-4">
                    {floors.map((floor) => (
                      <button
                        key={floor}
                        type="button"
                        onClick={() => updateCake({ floors: floor })}
                        className={`px-8 py-4 rounded-full font-bold transition-all duration-300 ${
                          cake.floors === floor ? 'btn-active scale-105' : 'btn-neumorphic hover:scale-102'
                        }`}
                      >
                        {floor} {parseInt(floor, 10) === 1 ? 'ETAJ' : 'ETAJE'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === OTHER_TAB && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-secondary">🍰 Alte produse</h3>
                <p className="text-secondary/70 text-sm">
                  Prăjituri, tarte sau alte produse. Completați doar dacă există.
                </p>
                <textarea
                  value={order.otherProducts}
                  onChange={(e) => updateOrder({ otherProducts: e.target.value })}
                  placeholder="Introduceți produsele comandate (prăjituri, tarte, etc.)..."
                  className="input-neumorphic w-full text-secondary placeholder:text-secondary/40 min-h-[120px]"
                  rows={5}
                />
              </div>

              <PhotoUploader
                title="📸 Poze"
                description="Atașați poze pentru această comandă (max 2)."
                isOtherProducts
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Screen2Sortiment
