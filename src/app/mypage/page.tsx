'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ModernFooter from '@/components/ModernFooter'
import { Button } from '@/components/ui/button'
import { InlineLoading } from '@/components/ui/loading'
import ModernHeader from '@/components/ModernHeader'

interface Statistics {
  today_count: number
  monthly_count: number
  rankings: Array<{
    rank: number
    photographer_name: string
    photographer_store: string
    count: number
    previous_month_count: number
    month_over_month: number
  }>
}

export default function MyPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuth()
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  // 統計データ取得
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchStatistics()
    }
  }, [isAuthenticated, user])

  const fetchStatistics = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError('')

      const response = await fetch(`/api/statistics?username=${encodeURIComponent(user.name)}`)
      const data = await response.json()

      if (data.success) {
        setStatistics(data.statistics)
      } else {
        setError(data.error || '統計データの取得に失敗しました')
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
      setError('統計データの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const getRoleDisplay = (role: string) => {
    return role === 'admin' ? '管理者' : '一般ユーザー'
  }

  const getRankingIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `${rank}位`
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <InlineLoading text="認証情報を確認中..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ModernHeader を使用（チャットページと同じスタイル） */}
      <ModernHeader
        onSearch={handleSearch}
        searchQuery={searchQuery}
        onRefresh={fetchStatistics}
        isRefreshing={isLoading}
        onToggleFilter={() => {}}
        isFilterOn={false}
        showSearch={false}
        showFilter={false}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 container mx-auto px-6 py-2">
        <div className="space-y-2">
          {/* アカウント情報セクション */}
          <div className="py-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold text-gray-700">アカウント情報</h3>
            </div>
            <div className="bg-white border border-gray-300 rounded">
              <div className="divide-y divide-gray-200">
                <div className="flex items-center py-2 px-3">
                  <span className="text-xs text-gray-600 w-20">ユーザー名:</span>
                  <span className="text-sm text-gray-900">{user.name}</span>
                </div>
                <div className="flex items-center py-2 px-3">
                  <span className="text-xs text-gray-600 w-20">所属店舗:</span>
                  <span className="text-sm text-gray-900">{user.store_name}</span>
                </div>
                <div className="flex items-center py-2 px-3">
                  <span className="text-xs text-gray-600 w-20">権限レベル:</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    user.role === 'admin' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {getRoleDisplay(user.role)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 実績セクション */}
          {isLoading ? (
            <div className="py-2">
              <div className="bg-white border border-gray-300 rounded p-4">
                <InlineLoading text="統計データを読み込み中..." />
              </div>
            </div>
          ) : error ? (
            <div className="py-2">
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-center text-red-700">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            </div>
          ) : statistics && (
            <>
              {/* 実績表示 */}
              <div className="py-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-gray-700">撮影実績</h3>
                </div>
                <div className="bg-white border border-gray-300 rounded">
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="text-center py-2">
                      <div className="text-lg font-bold text-blue-600">
                        {statistics.today_count}
                      </div>
                      <div className="text-xs text-gray-600">本日実績</div>
                    </div>
                    <div className="text-center py-2">
                      <div className="text-lg font-bold" style={{ color: '#003D75' }}>
                        {statistics.monthly_count}
                      </div>
                      <div className="text-xs text-gray-600">月間実績</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ランキングセクション */}
              <div className="py-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-gray-700">
                    月間ランキング ({new Date().getFullYear()}年{new Date().getMonth() + 1}月)
                  </h3>
                </div>
                {statistics.rankings.length > 0 ? (
                  <div className="bg-white border border-gray-300 rounded">
                    <div className="divide-y divide-gray-200">
                      {statistics.rankings.map((ranking) => (
                        <div 
                          key={ranking.rank}
                          className={`flex items-center justify-between py-2 px-3 hover:bg-gray-50 transition-colors ${
                            ranking.rank === 1 
                              ? 'bg-yellow-50' 
                              : ''
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium w-6">
                              {getRankingIcon(ranking.rank)}
                            </div>
                            <div className="text-sm text-gray-900">
                              {ranking.photographer_name} <span className="ml-3 text-sm text-gray-600">{ranking.photographer_store}</span>
                            </div>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {ranking.count}件
                            {ranking.previous_month_count > 0 && ranking.month_over_month !== 0 && (
                              <span className={`ml-2 text-xs ${
                                ranking.month_over_month > 0 
                                  ? 'text-blue-600' 
                                  : 'text-red-600'
                              }`}>
                                ({ranking.month_over_month > 0 ? '+' : ''}{Math.round((ranking.month_over_month / ranking.previous_month_count) * 100)}%)
                              </span>
                            )}
                            {ranking.previous_month_count === 0 && ranking.count > 0 && (
                              <span className="ml-2 text-xs text-blue-600">
                                (NEW)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-300 rounded p-6 text-center">
                    <div className="text-sm text-gray-500">今月の実績がまだありません</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ボタンセクション */}
          <div className="py-2">
            <div className="grid grid-cols-2 gap-2">
              {/* 詳細分析ボタン */}
              <Button
                onClick={() => router.push('/analytics')}
                variant="outline"
                className="py-2 px-3 text-sm text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                詳細分析
              </Button>

              {/* ログアウトボタン */}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="py-2 px-3 text-sm text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 rounded"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* フッター */}
      <ModernFooter
        activeTab="mypage"
        onTabChange={(tab) => {
          if (tab === 'map') router.push('/map')
          if (tab === 'store') router.push('/store')
          if (tab === 'list') router.push('/records')
          if (tab === 'chat') router.push('/chat')
          if (tab === 'mypage') router.push('/mypage')
        }}
      />
    </div>
  )
} 