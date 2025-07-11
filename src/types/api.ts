export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface GeocodeResponse {
  latitude: number
  longitude: number
  formatted_address: string
}

export interface SyncStatus {
  lastSync: string
  pendingChanges: number
  isOnline: boolean
} 