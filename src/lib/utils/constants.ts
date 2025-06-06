export const APP_CONFIG = {
  name: 'Credo Maps',
  version: '3.0.0',
  description: '撮影システム v3.0',
} as const

export const PROPERTY_STATUS = {
  NOT_SHOT: '未撮影',
  COMPLETED: '撮影済み',
} as const

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const

export const API_ENDPOINTS = {
  PROPERTIES: '/api/properties',
  GEOCODING: '/api/geocoding',
  SHEETS: '/api/sheets',
  AUTH: '/api/auth',
} as const

export const GOOGLE_SHEETS_CONFIG = {
  PROPERTIES_RANGE: 'properties!A:R',
  USERS_RANGE: 'users!A:H',
} as const

export const MAP_CONFIG = {
  DEFAULT_CENTER: { lat: 35.6762, lng: 139.6503 }, // 東京駅
  DEFAULT_ZOOM: 12,
  MARKER_COLORS: {
    NOT_SHOT: '#ef4444', // red
    COMPLETED: '#22c55e', // green
  },
} as const 