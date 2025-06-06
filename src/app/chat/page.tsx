'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ModernHeader from '@/components/ModernHeader'
import ModernFooter from '@/components/ModernFooter'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface ChatMessage {
  id: number
  sender_username: string
  message_text: string
  sent_at: string
  expires_at: string
  is_deleted: boolean
}

// スケルトンローディングコンポーネント
function ChatSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`space-y-1 ${i % 2 === 0 ? '' : 'flex justify-end'}`}>
          {i % 2 === 1 && (
            <div className="h-3 bg-gray-300 rounded w-20 mb-1"></div>
          )}
          <div className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className="h-3 bg-gray-300 rounded w-12"></div>
            <div className={`h-10 rounded-2xl ${
              i % 2 === 0 ? 'bg-gray-300 w-32' : 'bg-blue-300 w-28'
            }`}></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ChatPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  // メッセージリストの最下部にスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // メッセージの取得
  const loadMessages = async () => {
    try {
      const response = await fetch('/api/chat/messages')
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  // 初期データ読み込み（高速化版）
  useEffect(() => {
    const initializeChat = async () => {
      // 認証されていない場合は何もしない
      if (!isAuthenticated || !user) return

      setLoading(false)
      setIsInitialLoad(false)

      // メッセージデータの取得
      await loadMessages()
    }

    if (!authLoading) {
      initializeChat()
    }
  }, [isAuthenticated, user, authLoading])

  // メッセージが更新されたら最下部にスクロール
  useEffect(() => {
    if (!loading) {
      scrollToBottom()
    }
  }, [messages, loading])

  const loadChatData = async () => {
    // リフレッシュ時は軽量化
    setIsRefreshing(true)
    try {
      await loadMessages()
    } finally {
      setIsRefreshing(false)
    }
  }

  // 既読マーク（非同期・エラー無視）
  const markAsRead = async () => {
    try {
      fetch('/api/chat/mark-read', { method: 'POST' }).catch(() => {
        // エラーを無視（ユーザー体験に影響しない）
      })
    } catch (error) {
      // エラーを無視
    }
  }

  // メッセージ送信（楽観的更新で高速化）
  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !user) return

    const messageText = newMessage.trim()
    const tempId = Date.now()
    
    // 楽観的更新：即座にUIを更新
    const optimisticMessage: ChatMessage = {
      id: tempId,
      sender_username: user.name,
      message_text: messageText,
      sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      is_deleted: false
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    setSending(true)

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => 
          prev.map(msg => msg.id === tempId ? data.message : msg)
        )
      } else {
        // エラー時は楽観的メッセージを削除
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        setNewMessage(messageText)
        const errorData = await response.json()
        alert(errorData.error || 'メッセージの送信に失敗しました')
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      setNewMessage(messageText)
      console.error('Failed to send message:', error)
      alert('メッセージの送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  // エンターキーでメッセージ送信
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 日時フォーマット
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨日 ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) + ' ' +
             date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }
  }

  // 検索処理
  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  // リフレッシュ処理
  const handleRefresh = async () => {
    await loadChatData()
  }

  // タブ変更処理
  const handleTabChange = (tab: 'map' | 'store' | 'list' | 'chat' | 'mypage') => {
    if (tab === 'map') router.push('/map')
    if (tab === 'store') router.push('/store')
    if (tab === 'list') router.push('/records')
    if (tab === 'chat') router.push('/chat')
    if (tab === 'mypage') router.push('/mypage')
  }

  // 初回読み込み時に既読マークを付ける（非同期）
  useEffect(() => {
    if (!loading && messages.length > 0) {
      markAsRead()
    }
  }, [loading, messages])

  // 認証状態のチェック
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null // useEffectでリダイレクトされる
  }

  // 検索でフィルタリングされたメッセージ
  const filteredMessages = messages.filter(message => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      message.message_text.toLowerCase().includes(query) ||
      message.sender_username.toLowerCase().includes(query)
    )
  })

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* ModernHeader を使用 */}
      <div className="flex-shrink-0">
        <ModernHeader
          onSearch={handleSearch}
          searchQuery={searchQuery}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onToggleFilter={() => {}}
          isFilterOn={false}
          showSearch={false}
          showFilter={false}
        />
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto" 
           style={{ 
             height: 'calc(100vh - 60px - 80px - 80px)', // ヘッダー60px - 入力エリア80px - フッター80px
             maxHeight: 'calc(100vh - 220px)'
           }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          {loading && messages.length === 0 ? (
            // スケルトンローディング表示
            <ChatSkeleton />
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">まだメッセージがありません</p>
              <p className="text-gray-400 text-sm mt-2">チャットを開始しましょう</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredMessages.map((message) => {
                // より厳密な比較（空白文字を除去）
                const isOwnMessage = user ? message.sender_username?.trim() === user.name?.trim() : false
                
                // デバッグ用ログ（一時的）
                console.log('Debug - Current User:', `"${user?.name}"`)
                console.log('Debug - Message Sender:', `"${message.sender_username}"`)
                console.log('Debug - Is Own Message:', isOwnMessage)
                console.log('---')
                
                return (
                  <div key={message.id} className="space-y-1">
                    {/* 送信者名（相手のメッセージのみ表示） */}
                    {!isOwnMessage && (
                      <div className="text-xs text-gray-500 px-2 text-left">
                        {message.sender_username}
                      </div>
                    )}
                    
                    {/* メッセージと時間 */}
                    <div className={`flex items-end gap-2 ${
                      isOwnMessage ? 'justify-end' : 'justify-start'
                    }`}>
                      {/* 時間（送信メッセージの場合は左側） */}
                      {isOwnMessage && (
                        <div className="text-xs text-gray-400 mb-1">
                          {formatTime(message.sent_at)}
                        </div>
                      )}
                      
                      {/* 吹き出し型メッセージ */}
                      <div className={`relative max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        isOwnMessage
                          ? 'text-white shadow-sm'
                          : 'text-gray-800 shadow-sm border border-gray-300'
                      }`}
                      style={isOwnMessage ? { backgroundColor: '#003D75' } : { backgroundColor: '#d1d5db' }}
                      >
                        {/* 吹き出しの三角形（SVG版） */}
                        {isOwnMessage ? (
                          // 送信メッセージ（右上の三角形・右上45度）
                          <svg
                            className="absolute top-1 right-[-6px] w-4 h-4"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M16 0L0 8L8 16L16 0Z"
                              fill="#003D75"
                            />
                          </svg>
                        ) : (
                          // 受信メッセージ（左上の三角形・左上45度）
                          <svg
                            className="absolute top-1 left-[-7px] w-4 h-4"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M0 0L16 8L8 16L0 0Z"
                              fill="#d1d5db"
                            />
                          </svg>
                        )}
                        
                        <div className="text-sm leading-relaxed break-words">
                          {message.message_text}
                        </div>
                      </div>
                      
                      {/* 時間（受信メッセージの場合は右側） */}
                      {!isOwnMessage && (
                        <div className="text-xs text-gray-400 mb-1">
                          {formatTime(message.sent_at)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* メッセージ入力エリア */}
      <div className="flex-shrink-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="メッセージを入力..."
              className="flex-1 rounded-full px-4 py-3 border-gray-300"
              style={{
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0, 61, 117, 0.5)'
                e.target.style.boxShadow = '0 0 0 2px rgba(0, 61, 117, 0.2)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgb(209 213 219)' // gray-300
                e.target.style.boxShadow = 'none'
              }}
              disabled={sending}
              maxLength={200}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              size="sm"
              className="rounded-full px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#003D75' }}
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="flex-shrink-0">
        <ModernFooter
          activeTab="chat"
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  )
} 