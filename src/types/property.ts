export interface Property {
  id: number
  property_name: string
  room_number: string
  address: string
  latitude?: number
  longitude?: number
  status: '未撮影' | '撮影済み'
  memo?: string
  original_agent?: string
  phone_number?: string
  confirmation_date?: string
  construction_date?: string
  access_method?: string
  floor_area?: number
  rent?: number
  common_fee?: number
  shooting_datetime?: string
  updated_by?: string
}

export interface CreatePropertyData {
  property_name: string
  room_number: string
  address: string
  memo?: string
  original_agent?: string
  phone_number?: string
  confirmation_date?: string
  construction_date?: string
  access_method?: string
  floor_area?: number
  rent?: number
  common_fee?: number
}

export interface UpdatePropertyData extends Partial<CreatePropertyData> {
  id: number
  status?: '未撮影' | '撮影済み'
  shooting_datetime?: string
  updated_by?: string
}

export interface PropertyFilters {
  status?: 'all' | '未撮影' | '撮影済み'
  date?: string
  search?: string
} 