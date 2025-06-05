'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ModernFooter from '@/components/ModernFooter'
import ModernHeader from '@/components/ModernHeader'
import { InlineLoading } from '@/components/ui/loading'

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <InlineLoading text="認証情報を確認中..." />
      </div>
    )
  }

  const isAdmin = user.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ModernHeader */}
      <ModernHeader
        onSearch={() => {}}
        searchQuery=""
        onRefresh={() => {}}
        isRefreshing={false}
        onToggleFilter={() => {}}
        isFilterOn={false}
        showSearch={false}
        showFilter={false}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 container mx-auto px-6 py-4">
        <div className="max-w-2xl mx-auto">
          {isAdmin ? (
            // 管理者向け表示
            <div className="bg-white border border-gray-300 rounded p-8 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">詳細分析</h1>
                <p className="text-lg text-gray-600">現在作成中です。</p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                <div className="flex items-center text-blue-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">
                    高度な分析機能を開発中です。しばらくお待ちください。
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push('/mypage')}
                className="px-6 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                マイページに戻る
              </button>
            </div>
          ) : (
            // 一般ユーザー向け表示（煽り）
            <div className="bg-white border border-gray-300 rounded p-8 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">詳細分析</h1>
                <p className="text-lg text-red-600 font-medium mb-2">閲覧するには、レベルが足りません。</p>
                <p className="text-base text-gray-700">早く出世しましょう。</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
                <div className="flex items-center text-yellow-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-sm">
                    <div className="font-medium">管理者権限が必要です</div>
                    <div className="mt-1">もっと頑張って実績を積んで、昇進を目指しましょう！</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  💪 今月の実績を増やそう<br/>
                  📈 ランキング上位を目指そう<br/>
                  🏆 管理者の信頼を勝ち取ろう
                </div>
                
                <button
                  onClick={() => router.push('/mypage')}
                  className="px-6 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                >
                  マイページに戻る
                </button>
              </div>
            </div>
          )}
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