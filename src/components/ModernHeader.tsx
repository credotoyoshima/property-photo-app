'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getScheduleCount } from '@/utils/shootingSchedule'

interface ModernHeaderProps {
  onSearch: (query: string) => void
  onToggleFilter: () => void
  onRefresh: () => void
  isRefreshing?: boolean
  searchQuery: string
  filterState?: number
  isFilterOn?: boolean
  customButton?: React.ReactNode
  showSearch?: boolean
  showFilter?: boolean
  onLogoClick?: () => void
}

export default function ModernHeader({ 
  onSearch, 
  onToggleFilter, 
  onRefresh, 
  isRefreshing = false,
  searchQuery,
  filterState = 0,
  isFilterOn,
  customButton,
  showSearch = true,
  showFilter = true,
  onLogoClick
}: ModernHeaderProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [scheduledCount, setScheduledCount] = useState(0)
  
  // デバウンス用のタイマー
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 撮影予定数を定期的に更新
  useEffect(() => {
    const updateScheduledCount = () => {
      const count = getScheduleCount()
      setScheduledCount(count)
    }

    // 初期取得
    updateScheduledCount()

    // カスタムイベントリスナーで即座に更新
    const handleScheduleChange = () => {
      updateScheduledCount()
    }

    window.addEventListener('scheduledPropertiesChanged', handleScheduleChange)

    // フォールバック：1秒ごとに更新（念のため）
    const interval = setInterval(updateScheduledCount, 1000)

    return () => {
      window.removeEventListener('scheduledPropertiesChanged', handleScheduleChange)
      clearInterval(interval)
    }
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // フォーム送信時は即座に検索実行
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    onSearch(localSearchQuery)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearchQuery(value)
    
    // 既存のタイマーをクリア
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // デバウンス: 300ms後に検索実行
    searchTimeoutRef.current = setTimeout(() => {
    onSearch(value)
    }, 300)
  }
  
  // クリーンアップ
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleToggle = () => {
    onToggleFilter()
  }

  // フィルター状態のテキストを取得
  const getFilterText = () => {
    // ストアページのトグルモード
    if (isFilterOn !== undefined) {
      return isFilterOn ? '未返却' : '全て'
    }
    
    // マップページの3段階モード
    switch (filterState) {
      case 1: return '未撮影'
      case 2: return scheduledCount > 0 ? `本日 (${scheduledCount})` : '本日'
      default: return '全て'
    }
  }

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ブランドアイコン */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onLogoClick}
              className="w-10 h-10 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
              disabled={!onLogoClick}
            >
              <img 
                src="/credo.png" 
                alt="CREDO Logo" 
                className="w-full h-full object-contain"
              />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold" style={{ color: '#003D75' }}>Credo Maps</h1>
              <p className="text-xs text-gray-500">撮影システム v3.0</p>
            </div>
          </div>

          {/* 検索バー */}
          {showSearch && (
          <div className="flex-1 max-w-xl mx-3 mr-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg 
                  className="h-5 w-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
              </div>
              <Input
                type="text"
                  placeholder="ワード検索..."
                value={localSearchQuery}
                onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 w-full bg-gray-50/50 border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:border-blue-400 focus:outline-none focus-visible:outline-none outline-none transition-all duration-150"
                style={{ 
                  outline: 'none',
                  boxShadow: 'none',
                  border: '1px solid rgb(229 231 235)', // gray-200と同じ色
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onFocus={(e) => {
                  e.target.style.outline = 'none'
                    e.target.style.boxShadow = '0 0 0 1px rgba(0, 61, 117, 0.3)'
                    e.target.style.border = '1px solid rgba(0, 61, 117, 0.5)'
                }}
                onBlur={(e) => {
                  e.target.style.outline = 'none'
                  e.target.style.boxShadow = 'none'
                  e.target.style.border = '1px solid rgb(229 231 235)'
                }}
              />
            </form>
          </div>
          )}

          {/* スペーサー（検索バーが非表示の場合） */}
          {!showSearch && <div className="flex-1" />}

          {/* アクションボタン */}
          <div className="flex items-center space-x-2 ml-1">
            {/* カスタムボタンまたはトグルボタン */}
            {customButton ? customButton : showFilter && (
              // ストアページのトグルスイッチ
              isFilterOn !== undefined ? (
                <button
                  onClick={handleToggle}
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
                    isFilterOn ? 'bg-[#003D75]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-200 ease-in-out ${
                      isFilterOn ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              ) : (
                // マップページの3段階ボタン
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
                  className="w-16 h-8 px-2 py-1 text-xs font-medium transition-all duration-200 hover:bg-gray-100 active:bg-gray-200 focus:ring-0 focus:outline-none rounded-lg flex-shrink-0"
                  style={filterState !== 0 ? { backgroundColor: '#003D75', color: 'white' } : { border: '1px solid rgb(229 231 235)' }}
                >
                  {getFilterText()}
            </Button>
              )
            )}

            {/* 更新ボタン */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-3 transition-all duration-200 hover:bg-transparent active:bg-transparent focus:ring-0 focus:outline-none"
            >
              <svg 
                className={`w-6 h-6 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
} 