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

// Get current user's inventories from the last 5 days
export const getMyInventories = async (): Promise<Inventory[]> => {
  const response = await api.get<Inventory[]>('/inventory/my-inventories')
  return response.data
}

// Get inventory PDF URL
export const getInventoryPDFUrl = (inventoryId: string): string => {
  // Get the base URL without /api
  const baseURL = api.defaults.baseURL?.replace('/api', '') || ''
  return `${baseURL}/api/inventory/pdf/${inventoryId}`
}

export interface DictatedEntry {
  productName: string
  category: string
  receptionDate: string
  quantity: number
  unit: string
  isNecesar: boolean
  action: 'add' | 'remove'
}

export interface ProcessInventoryVoiceResponse {
  transcript: string
  entries: DictatedEntry[]
}

export const processInventoryVoice = async (audioBlob: Blob): Promise<ProcessInventoryVoiceResponse> => {
  const formData = new FormData()
  const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm'
  formData.append('audio', audioBlob, `recording.${ext}`)
  const response = await api.post<ProcessInventoryVoiceResponse>('/ai/process-inventory-voice', formData, {
    timeout: 120000,
  })
  return response.data
}

