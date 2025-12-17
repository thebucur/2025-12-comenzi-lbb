import { createContext, useContext, useState, ReactNode } from 'react'
import { Order } from '../types/order.types'

const initialOrder: Order = {
  deliveryMethod: null,
  location: null,
  address: '',
  staffName: null,
  clientName: '',
  phoneNumber: '',
  pickupDate: '',
  tomorrowVerification: false,
  advance: null,
  noCake: false,
  cakeType: null,
  weight: null,
  customWeight: '',
  shape: null,
  floors: null,
  otherProducts: '',
  coating: null,
  colors: [],
  decorType: null,
  decorDetails: '',
  observations: '',
  photos: [],
  orderNumber: null,
}

interface OrderContextType {
  order: Order
  updateOrder: (updates: Partial<Order>) => void
  resetOrder: () => void
  validateStep: (step: number) => boolean
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

export function OrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<Order>(initialOrder)

  const updateOrder = (updates: Partial<Order>) => {
    setOrder((prev) => ({ ...prev, ...updates }))
  }

  const resetOrder = () => {
    setOrder(initialOrder)
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!order.deliveryMethod) return false
        if (order.deliveryMethod === 'ridicare' && !order.location) return false
        if (order.deliveryMethod === 'livrare' && !order.address.trim()) return false
        if (!order.staffName) return false
        if (!order.clientName.trim()) return false
        if (!order.phoneNumber.trim() || order.phoneNumber.length < 8) return false
        if (!order.pickupDate) return false
        return true
      case 2:
        // If no cake is selected, only validate that otherProducts is filled
        if (order.noCake) {
          if (!order.otherProducts.trim()) return false
          return true
        }
        // Normal cake validation
        if (!order.cakeType) return false
        if (!order.weight) return false
        if ((order.weight === '2 KG' || order.weight === '2.5 KG' || order.weight === '3 KG' || order.weight === 'ALTĂ GREUTATE') && !order.shape) return false
        if ((order.weight === '3 KG' || order.weight === 'ALTĂ GREUTATE') && !order.floors) return false
        return true
      case 3:
        // Skip decoration validation if no cake
        if (order.noCake) return true
        if (!order.coating) return false
        if (!order.decorType) return false
        return true
      default:
        return true
    }
  }

  return (
    <OrderContext.Provider value={{ order, updateOrder, resetOrder, validateStep }}>
      {children}
    </OrderContext.Provider>
  )
}

export function useOrder() {
  const context = useContext(OrderContext)
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider')
  }
  return context
}

