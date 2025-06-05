'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loading, LoadingSpinner } from '@/components/ui/loading'
import { APP_CONFIG, PROPERTY_STATUS, MAP_CONFIG } from '@/lib/utils/constants'
import { getJapanTime, formatJapanTime, getJapanDateString } from '@/lib/utils/datetime'

export default function TestPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [envData, setEnvData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testSheetsConnection = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sheets/debug')
      const data = await response.json()
      setDebugData(data)
      
      if (data.error) {
        alert(`エラー: ${data.details}`)
      } else {
        alert(`成功: ${data.data.length}行のデータを取得しました`)
      }
    } catch (error) {
      alert('エラー: 接続に失敗しました')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkEnvironmentVariables = async () => {
    try {
      const response = await fetch('/api/env-check')
      const data = await response.json()
      setEnvData(data)
      
      if (data.error) {
        alert(`エラー: ${data.details}`)
      } else {
        alert('環境変数の状態を取得しました')
      }
    } catch (error) {
      alert('エラー: 環境変数の確認に失敗しました')
      console.error(error)
    }
  }

  const testPropertiesAPI = async () => {
    try {
      const response = await fetch('/api/properties')
      const data = await response.json()
      alert(data.warning ? `警告: ${data.warning}` : `成功: ${data.properties.length}件の物件を取得`)
      console.log('Properties data:', data)
    } catch (error) {
      alert('エラー: 接続に失敗しました')
      console.error(error)
    }
  }

  const initializeSheet = async () => {
    try {
      const response = await fetch('/api/sheets/init', {
        method: 'POST'
      })
      const data = await response.json()
      alert(data.success ? '成功: スプレッドシートを初期化しました' : `エラー: ${data.error}`)
    } catch (error) {
      alert('エラー: 初期化に失敗しました')
      console.error(error)
    }
  }

  // 新しい認証機能のテスト用関数を追加
  const initializeUsersSheet = async () => {
    try {
      const response = await fetch('/api/sheets/init-users', {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        alert(`成功: ユーザーテーブルが初期化されました\n\n初期ユーザー:\n${data.initialUsers.map((u: any) => `- ${u.username} / ${u.password} (${u.role})`).join('\n')}`)
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error) {
      alert('エラー: ユーザーテーブル初期化に失敗しました')
      console.error(error)
    }
  }

  const testAuth = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'password123'
        }),
      })
      const data = await response.json()
      if (data.success) {
        alert(`認証テスト成功!\nユーザー: ${data.user.display_name}\n権限: ${data.user.role}`)
      } else {
        alert(`認証テスト失敗: ${data.message}`)
      }
    } catch (error) {
      alert('認証テストエラー')
      console.error(error)
    }
  }

  const testUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.users) {
        alert(`ユーザー一覧 (${data.users.length}件):\n${data.users.map((u: any) => `- ${u.username} (${u.display_name}) - ${u.role}`).join('\n')}`)
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error) {
      alert('ユーザー一覧取得エラー')
      console.error(error)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">テストページ</h1>
      
      {/* 基本情報テスト */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">基本情報</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p><strong>アプリ名:</strong> {APP_CONFIG.name}</p>
          <p><strong>バージョン:</strong> {APP_CONFIG.version}</p>
          <p><strong>説明:</strong> {APP_CONFIG.description}</p>
        </div>
      </section>

      {/* 定数テスト */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">定数テスト</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p><strong>撮影状況:</strong></p>
          <ul className="ml-4">
            <li>未撮影: {PROPERTY_STATUS.NOT_SHOT}</li>
            <li>撮影済み: {PROPERTY_STATUS.COMPLETED}</li>
          </ul>
          <p className="mt-2"><strong>地図設定:</strong></p>
          <ul className="ml-4">
            <li>デフォルト中心: {MAP_CONFIG.DEFAULT_CENTER.lat}, {MAP_CONFIG.DEFAULT_CENTER.lng}</li>
            <li>デフォルトズーム: {MAP_CONFIG.DEFAULT_ZOOM}</li>
          </ul>
        </div>
      </section>

      {/* ボタンテスト */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">ボタンテスト</h2>
        <div className="space-x-2 space-y-2">
          <Button>デフォルト</Button>
          <Button variant="secondary">セカンダリ</Button>
          <Button variant="outline">アウトライン</Button>
          <Button variant="destructive">削除</Button>
          <Button variant="ghost">ゴースト</Button>
          <Button variant="link">リンク</Button>
        </div>
        <div className="mt-4 space-x-2">
          <Button size="sm">小</Button>
          <Button size="default">デフォルト</Button>
          <Button size="lg">大</Button>
        </div>
      </section>

      {/* ローディングテスト */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">ローディングテスト</h2>
        <div className="space-y-4">
          <div>
            <p className="mb-2">スピナーサイズ:</p>
            <div className="flex items-center space-x-4">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
            </div>
          </div>
          <div>
            <p className="mb-2">ローディングコンポーネント:</p>
            <Loading message="テスト読み込み中..." />
          </div>
        </div>
      </section>

      {/* 環境変数テスト */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">環境変数テスト</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
          <p><strong>NEXTAUTH_URL:</strong> {process.env.NEXTAUTH_URL || '未設定'}</p>
          <p><strong>Google Maps API Key:</strong> {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '設定済み' : '未設定'}</p>
          
          <div className="mt-4">
            <Button
              onClick={checkEnvironmentVariables}
              variant="outline"
              size="sm"
            >
              サーバー側環境変数を確認
            </Button>
          </div>
        </div>
      </section>

      {/* 環境変数詳細表示 */}
      {envData && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">環境変数詳細</h2>
          <div className="bg-white border rounded-lg p-4">
            {envData.error ? (
              <div className="text-red-600">
                <p><strong>エラー:</strong> {envData.error}</p>
                <p><strong>詳細:</strong> {envData.details}</p>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold mb-2">Google Sheets API設定状況</h3>
                <div className="space-y-2">
                  <div>
                    <strong>GOOGLE_SHEETS_PRIVATE_KEY:</strong>
                    <span className={envData.environment.GOOGLE_SHEETS_PRIVATE_KEY.exists ? 'text-green-600' : 'text-red-600'}>
                      {envData.environment.GOOGLE_SHEETS_PRIVATE_KEY.exists ? ' ✓ 設定済み' : ' ✗ 未設定'}
                    </span>
                    {envData.environment.GOOGLE_SHEETS_PRIVATE_KEY.exists && (
                      <div className="text-sm text-gray-600">
                        長さ: {envData.environment.GOOGLE_SHEETS_PRIVATE_KEY.length} 文字<br/>
                        プレビュー: {envData.environment.GOOGLE_SHEETS_PRIVATE_KEY.preview}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <strong>GOOGLE_SHEETS_CLIENT_EMAIL:</strong>
                    <span className={envData.environment.GOOGLE_SHEETS_CLIENT_EMAIL.exists ? 'text-green-600' : 'text-red-600'}>
                      {envData.environment.GOOGLE_SHEETS_CLIENT_EMAIL.exists ? ' ✓ 設定済み' : ' ✗ 未設定'}
                    </span>
                    {envData.environment.GOOGLE_SHEETS_CLIENT_EMAIL.exists && (
                      <div className="text-sm text-gray-600">
                        値: {envData.environment.GOOGLE_SHEETS_CLIENT_EMAIL.value}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <strong>GOOGLE_SHEETS_SPREADSHEET_ID:</strong>
                    <span className={envData.environment.GOOGLE_SHEETS_SPREADSHEET_ID.exists ? 'text-green-600' : 'text-red-600'}>
                      {envData.environment.GOOGLE_SHEETS_SPREADSHEET_ID.exists ? ' ✓ 設定済み' : ' ✗ 未設定'}
                    </span>
                    {envData.environment.GOOGLE_SHEETS_SPREADSHEET_ID.exists && (
                      <div className="text-sm text-gray-600">
                        値: {envData.environment.GOOGLE_SHEETS_SPREADSHEET_ID.value}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <strong>検出されたGoogle関連環境変数:</strong>
                    <div className="text-sm text-gray-600">
                      {envData.environment.allEnvKeys.length > 0 
                        ? envData.environment.allEnvKeys.join(', ')
                        : 'なし'
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Google Sheets接続テスト */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Google Sheets接続テスト</h2>
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">接続状況</h3>
            <div className="space-y-2 space-x-2">
              <Button
                onClick={testPropertiesAPI}
                variant="outline"
                size="sm"
              >
                物件データ取得テスト
              </Button>
              
              <Button
                onClick={testSheetsConnection}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? 'テスト中...' : 'スプレッドシート生データ取得'}
              </Button>
              
              <Button
                onClick={initializeSheet}
                variant="outline"
                size="sm"
              >
                スプレッドシート初期化
              </Button>
            </div>
          </div>

          {/* デバッグデータ表示 */}
          {debugData && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-2">スプレッドシート生データ</h3>
              {debugData.error ? (
                <div className="text-red-600">
                  <p><strong>エラー:</strong> {debugData.error}</p>
                  <p><strong>詳細:</strong> {debugData.details}</p>
                </div>
              ) : (
                <div>
                  <p><strong>範囲:</strong> {debugData.range}</p>
                  <p><strong>行数:</strong> {debugData.data.length}</p>
                  <div className="mt-2">
                    <h4 className="font-medium">データ:</h4>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(debugData.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 認証機能テスト */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">認証機能テスト</h2>
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">ユーザー管理</h3>
            <div className="space-y-2 space-x-2">
              <Button
                onClick={initializeUsersSheet}
                variant="outline"
                size="sm"
              >
                ユーザーテーブル初期化
              </Button>
              
              <Button
                onClick={testUsers}
                variant="outline"
                size="sm"
              >
                ユーザー一覧取得
              </Button>
              
              <Button
                onClick={testAuth}
                variant="outline"
                size="sm"
              >
                認証テスト (admin/password123)
              </Button>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">初期ユーザー情報</h4>
              <div className="text-sm text-blue-700">
                <p><strong>管理者:</strong> admin / password123</p>
                <p><strong>スタッフ:</strong> staff01 / test123</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 日本時間テスト */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">日本時間テスト</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">タイムゾーン機能</h3>
          <div className="space-y-2">
            <p><strong>現在の日本時間:</strong> {getJapanTime()}</p>
            <p><strong>フォーマット済み:</strong> {formatJapanTime(getJapanTime())}</p>
            <p><strong>日付のみ:</strong> {getJapanDateString()}</p>
            <p><strong>UTC時間:</strong> {new Date().toISOString()}</p>
          </div>
          
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">タイムゾーン情報</h4>
            <div className="text-sm text-green-700">
              <p><strong>タイムゾーン:</strong> Asia/Tokyo (JST)</p>
              <p><strong>UTC オフセット:</strong> +09:00</p>
              <p><strong>データベース形式:</strong> YYYY-MM-DD HH:MM:SS</p>
              <p><strong>表示形式:</strong> YYYY年MM月DD日 HH:MM</p>
            </div>
          </div>
        </div>
      </section>

      {/* ナビゲーションテスト */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">ナビゲーションテスト</h2>
        <div className="space-x-2">
          <Link href="/">
            <Button variant="outline">
              ホームに戻る
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">
              ログインページ
            </Button>
          </Link>
          <Link href="/debug">
            <Button variant="outline">
              デバッグページ
            </Button>
          </Link>
          <Link href="/map">
            <Button variant="outline">
              地図ページ
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
} 