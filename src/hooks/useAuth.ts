'use client'

import { useState, useEffect } from 'react'

export interface User {
  id: string
  name: string
  role: string
  store_name: string
  loginTime: string
  rememberMe?: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // ページロード時にローカルストレージから認証状態を復元
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser')
        if (stored) {
          const userData = JSON.parse(stored)
          
          // ログイン時間が有効期限内かチェック
          const loginTime = new Date(userData.loginTime)
          const now = new Date()
          const diffHours = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)
          
          // rememberMeがtrueの場合は30日、falseの場合は24時間
          const expirationHours = userData.rememberMe ? 24 * 30 : 24
          
          if (diffHours < expirationHours) {
            setUser(userData)
          } else {
            // 有効期限切れの場合はログアウト
            localStorage.removeItem('currentUser')
            sessionStorage.removeItem('currentUser')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        localStorage.removeItem('currentUser')
        sessionStorage.removeItem('currentUser')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    const userDataWithTimestamp = {
      ...userData,
      loginTime: userData.loginTime || new Date().toISOString()
    }
    
    if (userData.rememberMe) {
      // ログイン状態を保存する場合：localStorageに長期保存
      localStorage.setItem('currentUser', JSON.stringify(userDataWithTimestamp))
      sessionStorage.removeItem('currentUser') // セッションストレージからは削除
    } else {
      // ログイン状態を保存しない場合：セッションストレージのみ
      sessionStorage.setItem('currentUser', JSON.stringify(userDataWithTimestamp))
      localStorage.removeItem('currentUser') // localStorageからは削除
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('currentUser')
    sessionStorage.removeItem('currentUser')
  }

  const updateLastActivity = () => {
    if (user) {
      const updatedUser = {
        ...user,
        lastActivity: new Date().toISOString()
      }
      setUser(updatedUser)
      
      // 現在の保存場所に応じて更新
      if (user.rememberMe) {
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      } else {
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser))
      }
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateLastActivity
  }
} 