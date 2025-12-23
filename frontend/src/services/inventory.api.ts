import api from './api'

export interface InventoryEntryData {
  receptionDate: string
  quantity: number
  unit: string
  requiredQuantity?: number
  requiredUnit?: string
}

export interface ProductEntry {
  category: string
  productName: string
  isCustomProduct: boolean
  entries: InventoryEntryData[]
}

export interface Inventory {
  id: string
  userId: string
  username: string
  date: string
  submittedAt: string
  pdfPath: string | null
  entries: ProductEntry[]
  createdAt: string
  updatedAt: string
}

export interface SaveInventoryRequest {
  entries: ProductEntry[]
}

export interface InventoryResponse {
  inventory: Inventory | null
  isUpdate?: boolean
}

export interface UserInventoryStatus {
  userId: string
  username: string
  hasSubmitted: boolean
  inventory: Inventory | null
}

export interface InventoriesByDateResponse {
  date: string
  users: UserInventoryStatus[]
}

// Get today's inventory for the logged-in user
export const getTodayInventory = async (): Promise<InventoryResponse> => {
  const response = await api.get<InventoryResponse>('/inventory/today')
  return response.data
}

// Save inventory draft (without generating PDF)
export const saveInventoryDraft = async (data: SaveInventoryRequest): Promise<InventoryResponse> => {
  const response = await api.post<InventoryResponse>('/inventory', data)
  return response.data
}

// Submit inventory and generate PDF
export const submitInventory = async (data: SaveInventoryRequest): Promise<InventoryResponse & { pdfPath?: string }> => {
  const response = await api.post<InventoryResponse & { pdfPath?: string }>('/inventory/submit', data)
  return response.data
}

// Admin: Get inventories by date
export const getInventoriesByDate = async (date: string): Promise<InventoriesByDateResponse> => {
  const response = await api.get<InventoriesByDateResponse>('/inventory/admin/by-date', {
    params: { date }
  })
  return response.data
}

// Get inventory PDF URL
export const getInventoryPDFUrl = (inventoryId: string): string => {
  // Get the base URL without /api
  const baseURL = api.defaults.baseURL?.replace('/api', '') || ''
  return `${baseURL}/api/inventory/pdf/${inventoryId}`
}

