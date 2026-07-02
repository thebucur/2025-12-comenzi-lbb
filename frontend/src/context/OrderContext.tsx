/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode } from 'react'
import { Order, OrderCake } from '../types/order.types'
import { orderStep2SortimentValid } from '../utils/cakeOrder'
import { isCompletePhoneNumber } from '../utils/phone'

export function makeEmptyCake(): OrderCake {
  return {
    id: crypto.randomUUID(),
    cakeType: null,
    customCakeType: '',
    weight: null,
    customWeight: '',
    shape: null,
    floors: null,
  }
}

function freshOrder(): Order {
  return {
    idempotencyKey: crypto.randomUUID(),
    deliveryMethod: null,
    location: null,
    address: '',
    staffName: null,
    clientName: '',
    phoneNumber: '',
    pickupDate: '',
    pickupTime: '',
    tomorrowVerification: false,
    advance: null,
    cakes: [makeEmptyCake()],
    otherProducts: '',
    coating: null,
    colors: [],
    decorType: null,
    decorDetails: '',
    observations: '',
    photos: [],
    otherProductPhotos: [],
    foaieDeZaharPhoto: null,
    hasPastry: false,
    orderNumber: null,
  }
}

interface OrderContextType {
  order: Order
  updateOrder: (updates: Partial<Order>) => void
  resetOrder: () => void
  validateStep: (step: number) => boolean
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

export function OrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<Order>(freshOrder)

  const updateOrder = (updates: Partial<Order>) => {
    setOrder((prev) => ({ ...prev, ...updates }))
  }

  const resetOrder = () => {
    setOrder(freshOrder())
  }

  const hasAnyCake = (o: Order) =>
    o.cakes.some(
      (c) => c.cakeType || c.weight || c.customWeight?.trim() || c.shape || c.floors,
    )

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!order.deliveryMethod) return false
        if (order.deliveryMethod === 'ridicare' && !order.location) return false
        if (order.deliveryMethod === 'livrare' && !order.address.trim()) return false
        if (!order.staffName) return false
        if (!order.clientName.trim()) return false
        if (!isCompletePhoneNumber(order.phoneNumber)) return false
        if (!order.pickupDate) return false
        return true
      case 2:
        return orderStep2SortimentValid(order)
      case 3:
        // Skip decoration validation if there is no cake on the order
        if (!hasAnyCake(order)) return true
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
