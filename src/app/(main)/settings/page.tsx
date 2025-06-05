'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { APP_CONFIG } from '@/lib/utils/constants'
import { formatJapanTime, getJapanTime } from '@/lib/utils/datetime'

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const handleSync = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/properties/sync', {
        method: 'POST',
      })
      
      if (response.ok) {
        const syncTime = getJapanTime()
        setLastSync(syncTime)
        alert(`データ同期が完了しました\n時刻: ${formatJapanTime(syncTime)}`)
      } else {
        throw new Error('同期に失敗しました')
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('同期中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      // セッションクリア（実装に応じて調整）
      localStorage.clear()
      window.location.href = '/login'
    }
  }

  return (
    <div className="px-4 sm:px-0 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">設定</h1>
        <p className="text-gray-600">アプリケーションの設定を管理します</p>
      </div>

      <div className="space-y-6">
        {/* アプリ情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">アプリ情報</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">アプリ名</span>
              <span className="font-medium">{APP_CONFIG.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">バージョン</span>
              <span className="font-medium">{APP_CONFIG.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">最終同期</span>
              <span className="font-medium">
                {lastSync || '未実行'}
              </span>
            </div>
          </div>
        </div>

        {/* データ同期 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">データ同期</h2>
          <p className="text-gray-600 mb-4">
            Google Sheetsとのデータ同期を手動で実行します
          </p>
          <Button 
            onClick={handleSync}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? '同期中...' : 'データ同期を実行'}
          </Button>
        </div>

        {/* 機能設定 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">機能設定</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">位置情報の使用</div>
                <div className="text-sm text-gray-600">
                  現在地から近い物件を優先表示
                </div>
              </div>
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600"
                defaultChecked
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">オフラインモード</div>
                <div className="text-sm text-gray-600">
                  ネットワーク接続がない場合の動作
                </div>
              </div>
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600"
                defaultChecked
              />
            </div>
          </div>
        </div>

        {/* アカウント */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">アカウント</h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              現在ログインしているユーザー情報とアカウント管理
            </p>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50"
            >
              ログアウト
            </Button>
          </div>
        </div>

        {/* ヘルプ・サポート */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">ヘルプ・サポート</h2>
          <div className="space-y-3">
            <a 
              href="/test" 
              className="block text-blue-600 hover:text-blue-800"
            >
              テストページ
            </a>
            <a 
              href="/debug" 
              className="block text-blue-600 hover:text-blue-800"
            >
              デバッグ情報
            </a>
            <div className="text-sm text-gray-500 pt-2">
              問題が発生した場合は、デバッグ情報を確認してください
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 