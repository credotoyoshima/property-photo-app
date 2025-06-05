// 物件情報の型定義
export interface Property {
  id: number
  property_name: string
  room_number: string
  address: string
  latitude: number
  longitude: number
  status: '未撮影' | '撮影済み'
  last_updated: string
  // 追加フィールド
  memo?: string
  original_agent?: string
  phone_number?: string
  confirmation_date?: string
  construction_date?: string
  access_method?: string
  floor_area?: string
  rent?: string
  common_fee?: string
  shooting_deadline?: string
  updated_by?: string
}

// ユーザー情報の型定義
export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'photographer' | 'viewer'
}

// API レスポンスの型定義
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 物件一覧のAPIレスポンス
export interface PropertiesResponse {
  properties: Property[]
  warning?: string
}

// 物件ステータス更新のリクエスト
export interface UpdateStatusRequest {
  status: '未撮影' | '撮影済み'
}

// 新規物件追加のリクエスト
export interface AddPropertyRequest {
  property_name: string
  room_number: string
  address: string
  latitude?: number
  longitude?: number
  status?: '未撮影' | '撮影済み'
} 