export interface User {
  id: number
  username: string
  display_name: string
  role: 'admin' | 'user'
  created_at: string
  last_login?: string
  is_active: boolean
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface CreateUserData {
  username: string
  password: string
  display_name: string
  role?: 'admin' | 'user'
} 