'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FullScreenLoading } from '@/components/ui/loading'
import { AuthGuard, UserInfo } from '@/components/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import CameraCapture from '@/components/CameraCapture'

interface Property {
  id: number
  property_name: string
  room_number: string
  address: string
  latitude: number
  longitude: number
  status: string
  memo?: string
  original_agent?: string
  phone_number?: string
  confirmation_date?: string
  construction_date?: string
  access_method?: string
  floor_area?: number
  rent?: number
  common_fee?: number
  shooting_datetime?: string
  updated_by?: string
  last_updated: string
}

interface Props {
  params: Promise<{ id: string }>
}

export default function PropertyDetailPage({ params }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [isEditingMemo, setIsEditingMemo] = useState(false)
  const [editedMemo, setEditedMemo] = useState('')
  const [isSavingMemo, setIsSavingMemo] = useState(false)
  const [showCamera, setShowCamera] = useState(false)

  // paramsを解決
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setPropertyId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  // propertyIdが設定されたらデータを取得
  useEffect(() => {
    if (propertyId) {
      fetchProperty()
    }
  }, [propertyId])

  const fetchProperty = async () => {
    if (!propertyId) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/properties/${propertyId}`)
      
      if (!response.ok) {
        throw new Error('物件データの取得に失敗しました')
      }
      
      const data = await response.json()
      setProperty(data)
    } catch (err) {
      console.error('Error fetching property:', err)
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!property || !user) return
    
    try {
      setIsUpdating(true)
      
      const response = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          shooting_datetime: newStatus === '撮影済み' ? new Date().toISOString() : null,
          updated_by: user.name
        }),
      })

      if (!response.ok) {
        throw new Error('ステータス更新に失敗しました')
      }

      const updatedProperty = await response.json()
      setProperty(updatedProperty)
      
      alert(`撮影ステータスを「${newStatus}」に更新しました（更新者: ${user.name}）`)
    } catch (error) {
      console.error('Error updating status:', error)
      alert('ステータスの更新に失敗しました')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNavigate = () => {
    if (!property) return
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`
    window.open(url, '_blank')
  }

  const handleLaunchCamera = () => {
    setShowCamera(true)
  }

  const handleUploadComplete = (summary: { total: number, success: number, failed: number }) => {
    console.log('アップロード完了:', summary)
    setShowCamera(false)
    
    // 撮影完了時に自動でステータスを「撮影済み」に更新
    if (summary.success > 0 && property?.status === '未撮影') {
      handleStatusUpdate('撮影済み')
    }
  }

  const handleEditMemo = () => {
    setEditedMemo(property?.memo || '')
    setIsEditingMemo(true)
  }

  const handleCancelMemoEdit = () => {
    setIsEditingMemo(false)
    setEditedMemo('')
  }

  const handleSaveMemo = async () => {
    if (!property || !user) return
    
    try {
      setIsSavingMemo(true)
      
      const response = await fetch(`/api/properties/${property.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          memo: editedMemo,
          updated_by: user.name,
        }),
      })

      if (!response.ok) {
        throw new Error('メモの更新に失敗しました')
      }

      const updatedProperty = await response.json()
      setProperty(updatedProperty)
      setIsEditingMemo(false)
      setEditedMemo('')
      
      alert(`メモを更新しました（更新者: ${user.name}）`)
    } catch (error) {
      console.error('Error updating memo:', error)
      alert('メモの更新に失敗しました')
    } finally {
      setIsSavingMemo(false)
    }
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <FullScreenLoading message="物件データを読み込み中" />
      </AuthGuard>
    )
  }

  if (error || !property) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">エラーが発生しました</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => router.back()}>戻る</Button>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="px-4 sm:px-0 max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {property.property_name} {property.room_number}
            </h1>
            <p className="text-gray-600">{property.address}</p>
          </div>
          <div className="flex items-center space-x-4">
            <UserInfo />
            <Button variant="outline" onClick={() => router.back()}>
              戻る
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 基本情報 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">基本情報</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">物件名</span>
                <span className="font-medium">{property.property_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">部屋番号</span>
                <span className="font-medium">{property.room_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">住所</span>
                <span className="font-medium text-right max-w-64">{property.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">撮影ステータス</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  (property.status === '未撮影' || property.status === '' || !property.status)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {property.status === '撮影済み' ? '撮影済' : (property.status === '' || !property.status) ? '未撮影' : property.status}
                </span>
              </div>
              {property.shooting_datetime && (
                <div className="flex justify-between">
                  <span className="text-gray-600">撮影日時</span>
                  <span className="font-medium">
                    {property.shooting_datetime === 'Invalid Date' || !property.shooting_datetime 
                      ? '未設定' 
                      : new Date(property.shooting_datetime).toLocaleString('ja-JP')
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 詳細情報 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">詳細情報</h2>
            <div className="space-y-3">
              {property.floor_area && (
                <div className="flex justify-between">
                  <span className="text-gray-600">床面積</span>
                  <span className="font-medium">{property.floor_area.toFixed(2)}㎡</span>
                </div>
              )}
              {property.rent && (
                <div className="flex justify-between">
                  <span className="text-gray-600">賃料</span>
                  <span className="font-medium">{property.rent.toLocaleString()}円</span>
                </div>
              )}
              {property.common_fee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">共益費</span>
                  <span className="font-medium">{property.common_fee.toLocaleString()}円</span>
                </div>
              )}
              {property.original_agent && (
                <div className="flex justify-between">
                  <span className="text-gray-600">元付業者</span>
                  <span className="font-medium">{property.original_agent}</span>
                </div>
              )}
              {property.phone_number && (
                <div className="flex justify-between">
                  <span className="text-gray-600">電話番号</span>
                  <span className="font-medium">{property.phone_number}</span>
                </div>
              )}
              {property.confirmation_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">物確日</span>
                  <span className="font-medium">{property.confirmation_date}</span>
                </div>
              )}
              {property.construction_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">築年月</span>
                  <span className="font-medium">{property.construction_date}</span>
                </div>
              )}
              {property.access_method && (
                <div className="flex justify-between">
                  <span className="text-gray-600">案内方法</span>
                  <span className="font-medium">{property.access_method}</span>
                </div>
              )}
            </div>
          </div>

          {/* メモ */}
          {(property.memo || isEditingMemo) && (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">メモ・注意事項</h2>
                {!isEditingMemo && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleEditMemo}
                    className="text-sm"
                  >
                    ✏️ 編集
                  </Button>
                )}
              </div>
              
              {isEditingMemo ? (
                <div className="space-y-4">
                  <textarea
                    value={editedMemo}
                    onChange={(e) => setEditedMemo(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="撮影に関する注意事項やメモを入力してください..."
                    disabled={isSavingMemo}
                  />
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleSaveMemo}
                      disabled={isSavingMemo}
                      className="flex-1 sm:flex-none"
                    >
                      {isSavingMemo ? '保存中...' : '💾 保存'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancelMemoEdit}
                      disabled={isSavingMemo}
                      className="flex-1 sm:flex-none"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <p className="text-gray-700 whitespace-pre-wrap min-h-[2.5rem] p-2 bg-gray-50 rounded border border-transparent hover:border-gray-300 cursor-pointer transition-colors"
                     onClick={handleEditMemo}
                  >
                    {property.memo || (
                      <span className="text-gray-400 italic">
                        メモを追加するにはここをタップしてください...
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* メモがない場合の追加ボタン */}
          {!property.memo && !isEditingMemo && (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <div className="text-center">
                <button
                  onClick={handleEditMemo}
                  className="inline-flex items-center px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  メモ・注意事項を追加
                </button>
              </div>
            </div>
          )}

          {/* アクション */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">アクション</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button
                onClick={handleNavigate}
                className="w-full"
              >
                📍 ナビで案内
              </Button>
              <Button
                onClick={handleLaunchCamera}
                variant="outline"
                className="w-full"
              >
                📷 写真撮影
              </Button>
              <Button
                onClick={() => handleStatusUpdate(property.status === '未撮影' ? '撮影済み' : '未撮影')}
                disabled={isUpdating}
                variant={property.status === '未撮影' ? 'default' : 'outline'}
                className="w-full"
              >
                {isUpdating 
                  ? '更新中...' 
                  : property.status === '未撮影' 
                    ? '✅ 撮影完了' 
                    : '🔄 未撮影に戻す'
                }
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* カメラ撮影モーダル */}
      {showCamera && property && user && (
        <CameraCapture
          propertyName={property.property_name}
          roomNumber={property.room_number}
          photographerName={user.name}
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowCamera(false)}
        />
      )}
    </AuthGuard>
  )
} 