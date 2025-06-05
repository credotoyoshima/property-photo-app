'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { InlineLoading } from '@/components/ui/loading'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // ログインページでスクロールを完全に無効化
  useEffect(() => {
    // ページ表示時にスクロールを無効化
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    // コンポーネントアンマウント時に元に戻す
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        // 認証成功 - ユーザー情報をセット
        login({
          id: data.user.id.toString(),
          name: data.user.display_name,
          role: data.user.role,
          store_name: data.user.store_name,
          loginTime: data.user.last_login,
          rememberMe: rememberMe
        })
        
        router.push('/map')
      } else {
        setError(data.message || 'ログインに失敗しました')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: 'username' | 'password') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
    // エラーをクリア
    if (error) setError('')
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 py-8 overflow-hidden">
      <div className="max-w-sm w-full">
        {/* メインカード */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 px-8 py-6 max-h-full overflow-y-auto">
        {/* ヘッダー */}
          <div className="text-center mb-6 mt-3">
            {/* ロゴ - ファイルは public/credologologin.png に配置 */}
            <div className="w-16 h-16 mx-auto mb-4 mt-2 overflow-hidden">
              <img 
                src="/credologologin.png"
                alt="CREDO Logo" 
                className="w-full h-full object-contain"
              />
          </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#003D75' }}>Credo Maps</h1>
            <p className="text-gray-600 text-sm">撮影システム v3.0</p>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto mt-4"></div>
        </div>

        {/* エラーメッセージ */}
        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200/50 rounded-xl">
            <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
                <span className="text-red-700 text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* ログインフォーム */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
          <div>
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
              ユーザーID
            </label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange('username')}
                  className="w-full px-4 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-0 transition-all duration-200 placeholder-gray-400"
                  style={{ 
                    backgroundColor: 'white',
                    color: '#374151',
                    borderColor: '#003D75',
                    fontWeight: '500',
                    height: '50px'
                  }}
              placeholder="ユーザーIDを入力"
              required
              disabled={isLoading}
            />
          </div>

          <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
                  className="w-full px-4 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-0 transition-all duration-200 placeholder-gray-400"
                  style={{ 
                    backgroundColor: 'white',
                    color: '#374151',
                    borderColor: '#003D75',
                    fontWeight: '500',
                    height: '50px'
                  }}
              placeholder="パスワードを入力"
              required
              disabled={isLoading}
            />
              </div>
            </div>

            {/* ログイン状態を保存するチェックボックス */}
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-2 focus:ring-0 focus:outline-none"
                style={{
                  borderColor: '#003D75',
                  accentColor: '#003D75'
                }}
                disabled={isLoading}
              />
              <label htmlFor="rememberMe" className="ml-3 text-sm font-medium text-gray-700">
                ログイン状態を保存する
              </label>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !formData.username || !formData.password}
              className="w-full text-base font-semibold mt-6 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:transform-none"
              style={{
                background: isLoading || !formData.username || !formData.password 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #003D75 0%, #002855 100%)',
                height: '50px'
              }}
          >
            {isLoading ? (
              <InlineLoading text="ログイン中..." />
            ) : (
                'ログイン'
            )}
          </Button>
        </form>

        {/* フッター */}
          <div className="text-center mt-8 pt-6 border-t border-gray-200/50">
            <p className="text-xs text-gray-400 mt-1">©2025 Pinhane-YA co.,ltd.</p>
          </div>
        </div>
        
        {/* 装飾的な背景要素 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  )
} 