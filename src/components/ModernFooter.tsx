'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ModernFooterProps {
  activeTab: 'map' | 'store' | 'list' | 'chat' | 'mypage'
  onTabChange: (tab: 'map' | 'store' | 'list' | 'chat' | 'mypage') => void
}

export default function ModernFooter({ activeTab, onTabChange }: ModernFooterProps) {
  const [hasUnread, setHasUnread] = useState(false)

  // 軽量な未読チェック
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const response = await fetch('/api/chat/has-unread')
        const data = await response.json()
        setHasUnread(data.hasUnread || false)
      } catch (error) {
        console.error('Failed to check unread messages:', error)
        setHasUnread(false)
      }
    }

    // 段階的読み込み：3秒後に初回チェック
    const initialTimer = setTimeout(checkUnread, 3000)
    
    // その後は30秒間隔でチェック（業務連絡なので低頻度でOK）
    const interval = setInterval(checkUnread, 30000)
    
    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [])

  const tabs = [
    {
      id: 'map' as const,
      label: 'マップ',
      icon: (isActive: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke={isActive ? '#003D75' : 'currentColor'} strokeWidth={isActive ? 2.5 : 2} viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
          />
        </svg>
      )
    },
    {
      id: 'store' as const,
      label: 'ストア',
      icon: (isActive: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke={isActive ? '#003D75' : 'currentColor'} strokeWidth={isActive ? 2.5 : 2} viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
          />
        </svg>
      )
    },
    {
      id: 'list' as const,
      label: 'リスト',
      icon: (isActive: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke={isActive ? '#003D75' : 'currentColor'} strokeWidth={isActive ? 2.5 : 2} viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M4 6h16M4 10h16M4 14h16M4 18h16" 
          />
        </svg>
      )
    },
    {
      id: 'chat' as const,
      label: 'チャット',
      icon: (isActive: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke={isActive ? '#003D75' : 'currentColor'} strokeWidth={isActive ? 2.5 : 2} viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
          />
        </svg>
      )
    },
    {
      id: 'mypage' as const,
      label: 'マイページ',
      icon: (isActive: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke={isActive ? '#003D75' : 'currentColor'} strokeWidth={isActive ? 2.5 : 2} viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
          />
        </svg>
      )
    }
  ]

  return (
    <footer className="bg-white/95 backdrop-blur-md border-t border-gray-200/50 sticky bottom-0 z-50 shadow-lg">
      <div className="px-3 sm:px-4">
        <div className="flex items-center justify-around h-20 max-w-xl mx-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const isChat = tab.id === 'chat'
            return (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center space-y-1 p-3 w-20 h-16 rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? ''
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                style={isActive ? { 
                  color: '#003D75',
                  backgroundColor: 'rgba(0, 61, 117, 0.1)'
                } : {}}
              >
                <div className={`${isActive ? 'transform scale-110' : ''} relative`}>
                  {tab.icon(isActive)}
                  {/* 未読バッジ */}
                  {isChat && hasUnread && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  isActive ? '' : 'text-gray-500'
                }`}
                style={isActive ? { color: '#003D75' } : {}}
                >
                  {tab.label}
                </span>
              </Button>
            )
          })}
        </div>
      </div>
    </footer>
  )
} 