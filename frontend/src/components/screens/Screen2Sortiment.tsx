import { useState } from 'react'
import { useOrder } from '../../context/OrderContext'
import { CakeType, Weight, Shape, Floors } from '../../types/order.types'
import { useInstallationConfig } from '../../hooks/useInstallationConfig'

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

function Screen2Sortiment() {
  const { order, updateOrder } = useOrder()
  const config = useInstallationConfig()
  const [showOtherProducts, setShowOtherProducts] = useState(false)

  // Use config values or fallback to defaults
  const cakeTypes = (config?.sortiment?.cakeTypes as CakeType[]) || defaultCakeTypes
  const weights = (config?.sortiment?.weights as Weight[]) || defaultWeights
  const shapes = (config?.sortiment?.shapes as Shape[]) || defaultShapes
  const floors = (config?.sortiment?.floors as Floors[]) || defaultFloors

  const showShapeSection = order.weight === '2 KG' || order.weight === '2.5 KG' || order.weight === '3 KG' || order.weight === 'ALTĂ GREUTATE'
  const showFloorsSection = order.weight === '3 KG' || order.weight === 'ALTĂ GREUTATE'

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h2 className="text-4xl font-bold text-center text-gradient mb-12">Sortiment</h2>

      {/* Cake Types Grid */}
      <div className="card-neumorphic">
        <h3 className="text-xl font-bold text-secondary mb-6">🎂 Tipuri de torturi</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cakeTypes.map((type) => (
            <button
              key={type}
              onClick={() => updateOrder({ cakeType: type })}
              className={`p-4 rounded-2xl font-semibold transition-all duration-300 text-sm ${
                type === 'MOUSSE DE CIOCOLATĂ NEAGRĂ'
                  ? 'md:col-span-2'
                  : ''
              } ${
                order.cakeType === type
                  ? 'btn-active scale-105'
                  : 'btn-neumorphic hover:scale-102'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Weight Section */}
      <div className="card-neumorphic">
        <h3 className="text-xl font-bold text-secondary mb-6">⚖️ Greutate</h3>
        <div className="flex flex-wrap gap-4">
          {weights.map((weight) => (
            <button
              key={weight}
              onClick={() => {
                updateOrder({ weight })
                if (weight !== '2 KG' && weight !== '2.5 KG' && weight !== '3 KG' && weight !== 'ALTĂ GREUTATE') {
                  updateOrder({ shape: null, floors: null })
                }
                if (weight !== '3 KG' && weight !== 'ALTĂ GREUTATE') {
                  updateOrder({ floors: null })
                }
              }}
              className={`px-8 py-4 rounded-full font-bold transition-all duration-300 ${
                order.weight === weight
                  ? 'btn-active scale-105'
                  : 'btn-neumorphic hover:scale-102'
              }`}
            >
              {weight}
            </button>
          ))}
        </div>
        {order.weight === 'ALTĂ GREUTATE' && (
          <input
            type="text"
            value={order.customWeight}
            onChange={(e) => updateOrder({ customWeight: e.target.value })}
            placeholder="Specificați greutatea (ex: 4.5 KG)"
            className="input-neumorphic mt-6 w-full text-secondary placeholder:text-secondary/40"
          />
        )}
      </div>

      {/* Shape Section (only if 2kg or more) */}
      {showShapeSection && (
        <div className="card-neumorphic animate-float">
          <h3 className="text-xl font-bold text-secondary mb-6">📐 Formă</h3>
          <div className="flex flex-wrap gap-4">
            {shapes.map((shape) => (
              <button
                key={shape}
                onClick={() => updateOrder({ shape })}
                className={`px-8 py-4 rounded-full font-bold transition-all duration-300 ${
                  order.shape === shape
                    ? 'btn-active scale-105'
                    : 'btn-neumorphic hover:scale-102'
                }`}
              >
                {shape === 'ROTUND' && '⭕ '}
                {shape === 'DREPTUNGHIULAR' && '▭ '}
                {shape === 'ALTĂ FORMĂ' && '✨ '}
                {shape}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floors Section (only if 3kg or alta greutate) */}
      {showFloorsSection && (
        <div className="card-neumorphic animate-float" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-xl font-bold text-secondary mb-6">🏢 Număr Etaje</h3>
          <div className="flex flex-wrap gap-4">
            {floors.map((floor) => (
              <button
                key={floor}
                onClick={() => updateOrder({ floors: floor })}
                className={`px-8 py-4 rounded-full font-bold transition-all duration-300 ${
                  order.floors === floor
                    ? 'btn-active scale-105'
                    : 'btn-neumorphic hover:scale-102'
                }`}
              >
                {floor} {parseInt(floor) === 1 ? 'ETAJ' : 'ETAJE'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Other Products Section */}
      <div className="card-neumorphic">
        <h3 className="text-xl font-bold text-secondary mb-6">🍰 Alte produse</h3>
        {!showOtherProducts ? (
          <button
            onClick={() => setShowOtherProducts(true)}
            className="btn-neumorphic px-8 py-4 rounded-2xl font-bold text-secondary hover:scale-105 transition-all duration-300"
          >
            + ADAUGĂ ALTE PRODUSE
          </button>
        ) : (
          <div className="space-y-4">
            <textarea
              value={order.otherProducts}
              onChange={(e) => updateOrder({ otherProducts: e.target.value })}
              placeholder="Introduceți alte produse comandate (prăjituri, tarte, etc.)..."
              className="input-neumorphic w-full text-secondary placeholder:text-secondary/40 min-h-[120px]"
              rows={5}
            />
            <button
              onClick={() => {
                setShowOtherProducts(false)
                if (!order.otherProducts.trim()) {
                  updateOrder({ otherProducts: '' })
                }
              }}
              className="text-secondary/60 hover:text-red-500 transition-colors font-semibold"
            >
              ✕ Șterge secțiunea
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Screen2Sortiment
