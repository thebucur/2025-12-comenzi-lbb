export type DeliveryMethod = 'ridicare' | 'livrare'

export type Location = 'TIMKEN' | 'WINMARKT' | 'AFI PLOIESTI' | 'REPUBLICII' | 'CARAIMAN'

export type CakeType = 
  | 'MOUSSE DE CIOCOLATĂ NEAGRĂ'
  | 'MOUSSE DE FRUCTE'
  | 'MOUSSE DE VANILIE'
  | 'MOUSSE DE CAFEA'
  | 'MOUSSE DE LĂMÂIE'
  | 'MOUSSE DE COCO'
  | 'MOUSSE DE MENTĂ'
  | 'MOUSSE DE ZMEURĂ'
  | 'MOUSSE DE CĂPȘUNI'
  | 'MOUSSE DE ANANAS'
  | 'MOUSSE DE MANGOSTEEN'
  | 'MOUSSE DE PISTACHIO'
  | 'MOUSSE DE CARAMEL'
  | 'MOUSSE DE BANANĂ'
  | 'MOUSSE DE CIREȘE'
  | 'MOUSSE DE PORTOCALĂ'
  | 'MOUSSE DE MIRABELLE'
  | 'ALT TIP'

// Allow dynamic weights coming from config (including ranges like "1-1.5 KG")
export type Weight = string

export type Shape = 'ROTUND' | 'DREPTUNGHIULAR' | 'ALTĂ FORMĂ'

export type Floors = '1' | '2' | '3' | '4' | '5'

export type Coating = 'GLAZURĂ' | 'FRIȘCĂ' | 'CREMĂ' | 'NAKED' | 'DOAR CAPAC'

export type DecorType = string

export interface Order {
  // Screen 1 - Ridicare
  deliveryMethod: DeliveryMethod | null
  location: Location | null
  address: string
  staffName: string | null
  clientName: string
  phoneNumber: string
  pickupDate: string
  tomorrowVerification: boolean
  advance: number | null
  
  // Screen 2 - Sortiment
  noCake: boolean
  cakeType: CakeType | null
  weight: Weight | null
  customWeight: string
  shape: Shape | null
  floors: Floors | null
  otherProducts: string
  
  // Screen 3 - Decor
  coating: Coating | null
  colors: string[]
  decorType: DecorType | null
  decorDetails: string
  observations: string
  photos: string[]
  foaieDeZaharPhoto: string | null
  
  // Screen 4 - Finalizare
  orderNumber: string | null
}

export interface OrderContextType {
  order: Order
  updateOrder: (updates: Partial<Order>) => void
  resetOrder: () => void
  validateStep: (step: number) => boolean
}














