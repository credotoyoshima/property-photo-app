'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { MAP_CONFIG } from '@/lib/utils/constants'
import { MapLoading, InlineLoading } from '@/components/ui/loading'
import { useAuth } from '@/hooks/useAuth'
import { addToSchedule, removeFromSchedule, isInSchedule, getScheduledProperties, autoRemoveCompletedProperty } from '@/utils/shootingSchedule'
import { useRouter } from 'next/navigation'

// Key Agent interface (for agent detail card)
interface KeyAgent {
  phone_number: string
  agent_name: string
  address: string
  latitude: number
  longitude: number
  created_at: string
  updated_at: string
}

// Property interface for key management
interface KeyProperty {
  id: number
  property_name: string
  room_number: string
  address: string
  latitude: number
  longitude: number
  key_agent_phone?: string
  key_rental_status: 'available' | 'rented'
  key_rented_at?: string
  key_returned_at?: string
  key_rented_by?: string
}

interface Property {
  id: number
  property_name: string
  room_number: string
  address: string
  latitude: number
  longitude: number
  status: string
  rent?: number
  common_fee?: number
  floor_area?: number
  construction_date?: string
  original_agent?: string
  phone_number?: string
  confirmation_date?: string
  access_method?: string
  memo?: string
  last_updated: string
  shooting_datetime?: string
  updated_by?: string
  recruitment_status?: string
  vacancy_date?: string
  key_agent_phone?: string
  key_rental_status?: string
  key_rented_at?: string
  key_returned_at?: string
  key_rented_by?: string
  deleted?: boolean  // AB列の削除フラグ
}

interface PropertyGroup {
  id: string
  property_name: string
  address: string
  latitude: number
  longitude: number
  rooms: Property[]
  representativeStatus: string
}

interface EnhancedGoogleMapProps {
  properties: Property[]
  selectedPropertyId?: number | null
  onPropertySelect?: (propertyId: number | null) => void
  onPropertyUpdate?: (updatedProperty: Property) => void
  onLaunchCamera?: (property: Property) => void
  className?: string
  showCurrentLocation?: boolean
}

interface PropertyEditScreenProps {
  property: Property
  onClose: () => void
  onSave: (property: Property) => void
  onPropertyUpdate?: (property: Property) => void
  onLaunchCamera?: (property: Property) => void
}

function PropertyEditScreen({ property, onClose, onSave, onPropertyUpdate, onLaunchCamera }: PropertyEditScreenProps) {
  const router = useRouter()
  const [memo, setMemo] = useState(property.memo || '')
  const [originalMemo, setOriginalMemo] = useState(property.memo || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(property.status || '未撮影')
  const [keyAgentInfo, setKeyAgentInfo] = useState<{
    phone_number: string
    agent_name: string
    address: string
    latitude: number
    longitude: number
  } | null>(null)
  const [isLoadingKeyAgent, setIsLoadingKeyAgent] = useState(false)
  const [isMarkingDelete, setIsMarkingDelete] = useState(false)
  const [isDeleteScheduled, setIsDeleteScheduled] = useState<boolean>(property.deleted ?? false)

  // ログインユーザー情報を取得
  const { user } = useAuth()

  // 鍵預かり業者情報を取得
  const fetchKeyAgentInfo = async (phone: string) => {
    setIsLoadingKeyAgent(true)
    try {
      const response = await fetch(`/api/key-agents/${encodeURIComponent(phone)}`)
      if (response.ok) {
        const agentData = await response.json()
        setKeyAgentInfo(agentData)
      } else {
        console.warn('鍵預かり業者情報の取得に失敗しました')
        setKeyAgentInfo(null)
      }
    } catch (error) {
      console.error('鍵預かり業者情報の取得エラー:', error)
      setKeyAgentInfo(null)
    } finally {
      setIsLoadingKeyAgent(false)
    }
  }

  // 案内方法に「鍵取り」が含まれていてkey_agent_phoneがある場合、業者情報を取得
  useEffect(() => {
    if (property.access_method?.includes('鍵取り') && property.key_agent_phone) {
      fetchKeyAgentInfo(property.key_agent_phone)
    } else {
      setKeyAgentInfo(null)
    }
  }, [property.access_method, property.key_agent_phone])

  const handleSave = async () => {
    // メモが変更されていない場合は保存しない
    if (memo === originalMemo) {
      return
    }

    setIsSaving(true)
    try {
      // 楽観的更新：まず現在の値でローカルを更新
      const optimisticProperty = { ...property, memo }
      
      // 実際のAPIコールでスプレッドシートのH列（memo）を更新
      const response = await fetch(`/api/properties/${property.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memo,
          updated_by: 'ユーザー', // 必要に応じてログインユーザー名に変更
        }),
      })

      if (!response.ok) {
        throw new Error('メモの保存に失敗しました')
      }

      const updatedProperty = await response.json()
      
      // 保存成功時にオリジナル値を更新
      setOriginalMemo(memo)
      
      // 親コンポーネントに更新を通知（即座に画面に反映）
      onSave(updatedProperty)
      
      console.log('メモが正常に保存され、画面に反映されました')
    } catch (error) {
      console.error('メモ保存エラー:', error)
      // エラー時は元の値に戻す
      setMemo(originalMemo)
      // エラーハンドリング - 必要に応じてユーザーにエラーメッセージを表示
    } finally {
      setIsSaving(false)
    }
  }

  // メモ欄からフォーカスが外れた時の自動保存
  const handleMemoBlur = () => {
    if (memo !== originalMemo) {
      handleSave()
    }
  }

  // ステータス切り替え処理
  const handleStatusToggle = async () => {
    if (isUpdatingStatus) return
    
    setIsUpdatingStatus(true)
    const newStatus = currentStatus === '未撮影' ? '撮影済' : '未撮影'
    const previousStatus = currentStatus
    
    try {
      // 楽観的更新：即座にUIを更新
      setCurrentStatus(newStatus)
      
      // APIでステータスを更新
      const response = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          updated_by: user?.name || 'システム', // ログインユーザーのdisplay_nameを使用
        }),
      })

      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました')
      }

      const updatedProperty = await response.json()
      
      // 撮影完了時の自動削除処理
      if (newStatus === '撮影済') {
        const wasRemoved = autoRemoveCompletedProperty(property.id)
        if (wasRemoved) {
          console.log('撮影完了により撮影予定から自動削除されました')
          // カスタムイベントを発火してヘッダーの数字を更新
          window.dispatchEvent(new CustomEvent('scheduledPropertiesChanged'))
        }
      }
      
      // 親コンポーネントに更新を通知
      onSave(updatedProperty)
      
      console.log(`ステータスが「${newStatus}」に更新されました`)
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      // エラー時は元のステータスに戻す
      setCurrentStatus(previousStatus)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // カメラ起動処理
  const handleLaunchCamera = () => {
    // カメラ起動処理: onLaunchCameraがあれば呼び出し、なければ従来の遷移
    if (onLaunchCamera) {
      onLaunchCamera(property)
    } else {
      router.push(`/properties/${property.id}`)
    }
  }

  // 撮影した写真を保存する処理（廃止予定 - 実際の処理はCameraModal内で実行）
  const handleSavePhotos = async (photos: any[]) => {
    // この関数は使用されなくなりました
    console.log('保存する写真:', photos)
    return Promise.resolve()
  }

  // 物件のステータスが更新された時の処理
  const handlePropertyStatusUpdate = (updatedProperty: Property) => {
    // 親コンポーネントに更新を通知
    if (onPropertyUpdate) {
      onPropertyUpdate(updatedProperty)
    }
    
    // ローカル状態も更新
    setCurrentStatus(updatedProperty.status || '未撮影')
    
    // カメラページに遷移したため、モーダル制御は不要
    
    console.log('物件ステータスが更新されました:', updatedProperty.status)
  }

  // ナビ開始機能
  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`
    window.open(url, '_blank')
  }

  // 電話発信機能
  const handlePhoneCall = () => {
    if (property.phone_number) {
      // 電話番号から不要な文字を除去（ハイフン、スペース、括弧など）
      const cleanPhoneNumber = property.phone_number.replace(/[-\s()]/g, '')
      window.location.href = `tel:${cleanPhoneNumber}`
    } else {
      alert('電話番号が設定されていません')
    }
  }

  // 鍵預かり業者への電話発信
  const handleKeyAgentPhoneCall = () => {
    if (keyAgentInfo?.phone_number) {
      const cleanPhoneNumber = keyAgentInfo.phone_number.replace(/[-\s()]/g, '')
      window.location.href = `tel:${cleanPhoneNumber}`
    } else {
      alert('業者の電話番号が取得できませんでした')
    }
  }

  // 鍵預かり業者のナビ開始
  const handleKeyAgentNavigate = () => {
    if (keyAgentInfo?.latitude && keyAgentInfo?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${keyAgentInfo.latitude},${keyAgentInfo.longitude}`
      window.location.href = url
    } else if (keyAgentInfo?.address) {
      // 座標が取得できない場合は住所で検索
      const encodedAddress = encodeURIComponent(keyAgentInfo.address)
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
      window.location.href = url
    } else {
      alert('業者の位置情報が取得できませんでした')
    }
  }

  // ストア機能への移動（業者選択状態）
  const handleMoveToStore = () => {
    if (keyAgentInfo?.phone_number) {
      const url = `/store?selected_agent=${encodeURIComponent(keyAgentInfo.phone_number)}`
      window.location.href = url
    } else {
      alert('業者情報が取得できませんでした')
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-'
    return `¥${amount.toLocaleString()}`
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ja-JP', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      })
    } catch {
      return dateStr
    }
  }

  const formatShootingDateTime = (dateTimeStr?: string) => {
    if (!dateTimeStr || dateTimeStr === 'Invalid Date') return ''
    try {
      const date = new Date(dateTimeStr)
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status === '' || !status ? '未撮影' : status
    const isUpdating = isUpdatingStatus
    
    return (
      <button
        onClick={handleStatusToggle}
        disabled={isUpdating}
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
          normalizedStatus === '未撮影' 
            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 ring-2 ring-blue-200' 
            : 'text-red-600 bg-red-50 hover:bg-red-100 ring-2 ring-red-200'
        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
        style={{ writingMode: 'horizontal-tb', textOrientation: 'mixed' }}
      >
        {isUpdating ? (
          <>
            <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            更新中...
          </>
        ) : (
          <>
            {normalizedStatus}
            <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </>
        )}
      </button>
    )
  }

  // 削除フラグ設定・取消トグルハンドラ
  const handleMarkDelete = async () => {
    const confirmMessage = isDeleteScheduled ? '削除予定をキャンセルしますか？' : 'この部屋を削除しますか？'
    if (!confirm(confirmMessage)) return
    try {
      setIsMarkingDelete(true)
      const method = isDeleteScheduled ? 'DELETE' : 'POST'
      const response = await fetch(`/api/properties/${property.id}/delete`, { method })
      if (!response.ok) throw new Error()
      setIsDeleteScheduled(prev => !prev)
      // プロパティの最新情報を取得し、親コンポーネントに更新を通知
      const propRes = await fetch(`/api/properties/${property.id}`)
      if (propRes.ok) {
        const updatedProperty = await propRes.json()
        onPropertyUpdate && onPropertyUpdate(updatedProperty)
      }
      const alertMsg = isDeleteScheduled ? '削除予定をキャンセルしました' : '削除予定を設定しました'
      alert(alertMsg)
    } catch (error) {
      console.error(error)
      const errorMsg = isDeleteScheduled ? '削除予定のキャンセルに失敗しました' : '削除予定の設定に失敗しました'
      alert(errorMsg)
    } finally {
      setIsMarkingDelete(false)
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getStatusBadge(currentStatus)}
          </div>
          <div className="flex items-center space-x-2">
            {/* ナビ開始ボタン */}
            <button 
              onClick={handleNavigate}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>
            
            {/* 電話ボタン */}
            <button 
              onClick={handlePhoneCall}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            
            {/* カメラボタン */}
            <button 
              onClick={handleLaunchCamera}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            {/* 閉じるボタン */}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content - フレックスレイアウトで残り領域を使用 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 pb-24">
          <div className="grid grid-cols-1 gap-1 max-w-2xl mx-auto">
            {/* 物件名とステータスを1行に表示 */}
            <div className="bg-gray-50 rounded-lg p-3 mb-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">{property.property_name}</h2>
                <div className="flex items-center">
                  {property.recruitment_status && property.recruitment_status !== '-' ? (
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${
                      property.recruitment_status === '無物' 
                        ? 'text-gray-700 bg-gray-200 border-gray-400'
                        : 'text-yellow-800 bg-yellow-200 border-yellow-400'
                    }`}>
                      {property.recruitment_status}
                    </span>
                  ) : (
                    <span className="text-gray-900">-</span>
                  )}
                </div>
              </div>
              {/* 部屋番号と日付を1行に表示 */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="font-medium text-gray-600">部屋番号: </span>
                  <span className="text-gray-900 ml-1">{property.room_number}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-900">{formatDate(property.vacancy_date)}</span>
                </div>
              </div>
            </div>

            {/* 住所・物件確認日 - 2列表示 */}
            <div className="grid grid-cols-2 gap-4 pl-2">
              <div className="py-1">
                <h3 className="text-xs font-bold text-gray-600 mb-0.5">住所</h3>
                <p className="text-sm text-gray-900 overflow-hidden whitespace-nowrap text-ellipsis" title={property.address}>
                  {property.address}
                </p>
              </div>
              <div className="py-1">
                <h3 className="text-xs font-bold text-gray-600 mb-0.5">物件確認日</h3>
                <p className="text-sm text-gray-900">{formatDate(property.confirmation_date)}</p>
              </div>
            </div>

            {/* 区切り線 */}
            <div className="border-t border-gray-200 my-0.5 mx-2"></div>

            {/* 賃料・共益費 - 常に2列表示 */}
            <div className="grid grid-cols-2 gap-4 pl-2">
              <div className="py-1">
                <h3 className="text-xs font-bold text-gray-600 mb-0.5">賃料</h3>
                <p className="text-sm text-gray-900">{formatCurrency(property.rent)}</p>
              </div>
              <div className="py-1">
                <h3 className="text-xs font-bold text-gray-600 mb-0.5">共益費</h3>
                <p className="text-sm text-gray-900">{formatCurrency(property.common_fee)}</p>
              </div>
            </div>

            {/* 区切り線 */}
            <div className="border-t border-gray-200 my-0.5 mx-2"></div>

            {/* 床面積・築年月日 - 常に2列表示 */}
            <div className="grid grid-cols-2 gap-4 pl-2">
              <div className="py-1">
                <h3 className="text-xs font-bold text-gray-600 mb-0.5">床面積</h3>
                <p className="text-sm text-gray-900">{property.floor_area ? `${property.floor_area}㎡` : '-'}</p>
              </div>
              <div className="py-1">
                <h3 className="text-xs font-bold text-gray-600 mb-0.5">築年月日</h3>
                <p className="text-sm text-gray-900">{formatDate(property.construction_date)}</p>
              </div>
            </div>

            {/* 区切り線 */}
            <div className="border-t border-gray-200 my-0.5 mx-2"></div>

            {/* 元付業者・電話番号 - 2列表示 */}
            <div className="grid grid-cols-2 gap-4 pl-2">
              <div className="py-1">
                <h3 className="text-xs font-bold text-gray-600 mb-0.5">元付業者</h3>
                <p className="text-sm text-gray-900 overflow-hidden whitespace-nowrap text-ellipsis" title={property.original_agent || '-'}>
                  {property.original_agent || '-'}
                </p>
              </div>
              <div className="py-1">
                <h3 className="text-xs font-bold text-gray-600 mb-0.5">電話番号</h3>
                <p className="text-sm text-gray-900">{property.phone_number || '-'}</p>
              </div>
            </div>

            {/* 区切り線 */}
            <div className="border-t border-gray-200 my-0.5 mx-2"></div>

            {/* 案内方法 */}
            <div className="py-1 pl-2">
              <h3 className="text-xs font-bold text-gray-600 mb-0.5">案内方法</h3>
              <p className="text-sm text-gray-900">{property.access_method || '-'}</p>
            </div>

            {/* 鍵預かり業者（案内方法に「鍵取り」が含まれている場合のみ表示） */}
            {property.access_method?.includes('鍵取り') && property.key_agent_phone && (
              <>
                {/* 区切り線 */}
                <div className="border-t border-gray-200 my-0.5 mx-2"></div>
                
                <div className="py-1 pl-2">
                  <h3 className="text-xs font-bold text-gray-600 mb-0.5">鍵預かり業者</h3>
                  {isLoadingKeyAgent ? (
                    <InlineLoading text="読み込み中..." className="text-sm text-gray-500" size="xs" />
                  ) : keyAgentInfo ? (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-900 flex-1">{keyAgentInfo.agent_name}</p>
                      <div className="flex items-center space-x-1 ml-2">
                        {/* ストア移動ボタン（ピンアイコン） */}
                        <button 
                          onClick={handleMoveToStore}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                          title="ストアで表示"
                        >
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        
                        {/* ナビ開始ボタン（地図アイコン） */}
                        <button 
                          onClick={handleKeyAgentNavigate}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                          title="道案内"
                        >
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </button>
                        
                        {/* 電話ボタン */}
                        <button 
                          onClick={handleKeyAgentPhoneCall}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                          title="電話をかける"
                        >
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">業者情報が見つかりません</p>
                  )}
                </div>
              </>
            )}

            {/* 区切り線 */}
            <div className="border-t border-gray-200 my-0.5 mx-2"></div>

            {/* メモ */}
            <div className="py-1 mt-1 px-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-600">メモ</h3>
                {isSaving && (
                  <InlineLoading text="保存中..." className="text-xs text-blue-600" />
                )}
              </div>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                onBlur={handleMemoBlur}
                rows={4}
                className={`w-full p-2 text-sm border rounded resize-none focus:ring-1 focus:outline-none transition-colors ${
                  isSaving
                    ? 'border-blue-300 focus:ring-blue-400 focus:border-blue-400'
                    : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'
                }`}
                placeholder="メモを入力してください..."
                disabled={isSaving}
              />
              {currentStatus === '撮影済' && property.shooting_datetime && property.updated_by && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">
                    撮影日時: {formatShootingDateTime(property.shooting_datetime)} | 撮影者: {property.updated_by}
                  </p>
                </div>
              )}
              {/* 管理者のみ表示: 削除トグルボタン */}
              {user?.role === 'admin' && (
                <div className="mt-4">
                  <button
                    onClick={handleMarkDelete}
                    disabled={isMarkingDelete}
                    className={isDeleteScheduled
                      ? "w-full border border-gray-300 bg-gray-100 text-gray-600 px-4 py-2 rounded text-sm text-center"
                      : "w-full border border-red-300 bg-red-50 text-red-600 px-4 py-2 rounded text-sm text-center"
                    }
                  >
                    {isDeleteScheduled ? 'この部屋の削除予定をキャンセルする' : 'この部屋を削除する'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PropertyDetailCardProps {
  propertyGroup: PropertyGroup
  onClose: () => void
  onEdit: (property: Property) => void
  onBackToProperty?: () => void
  initialSelectedRoomId?: number | null
}

function PropertyDetailCard({ propertyGroup, onClose, onEdit, onBackToProperty, initialSelectedRoomId }: PropertyDetailCardProps) {
  const rooms = propertyGroup.rooms.sort((a, b) => a.room_number.localeCompare(b.room_number))
  
  // 選択された部屋のstate（初期値の優先順位：1.initialSelectedRoomId, 2.案内方法orメモがある部屋, 3.最初の部屋）
  const getInitialRoom = () => {
    if (initialSelectedRoomId) {
      const roomById = rooms.find(room => room.id === initialSelectedRoomId)
      if (roomById) return roomById
    }
    return rooms.find(room => room.access_method || room.memo) || rooms[0]
  }
  
  const [selectedRoom, setSelectedRoom] = useState<Property>(getInitialRoom())
  const [keyAgentInfo, setKeyAgentInfo] = useState<{
    phone_number: string
    agent_name: string
    address: string
    latitude: number
    longitude: number
  } | null>(null)
  const [isLoadingKeyAgent, setIsLoadingKeyAgent] = useState(false)
  const [isInShootingSchedule, setIsInShootingSchedule] = useState(false)

  // プロパティ状態更新時に選択中ルームを最新情報に同期
  useEffect(() => {
    setSelectedRoom(prev => {
      const updated = propertyGroup.rooms.find(room => room.id === prev.id)
      return updated || prev
    })
  }, [propertyGroup.rooms])

  // 撮影予定の状態を確認
  useEffect(() => {
    setIsInShootingSchedule(isInSchedule(selectedRoom.id))
  }, [selectedRoom.id])

  // propertyGroupが変更された時に選択された部屋をリセット（一番左側の部屋を選択）
  useEffect(() => {
    const newSelectedRoom = getInitialRoom()
    setSelectedRoom(newSelectedRoom)
  }, [propertyGroup.id]) // propertyGroup.idの変更を監視

  // 鍵預かり業者情報を取得
  const fetchKeyAgentInfo = async (phone: string) => {
    setIsLoadingKeyAgent(true)
    try {
      const response = await fetch(`/api/key-agents/${encodeURIComponent(phone)}`)
      if (response.ok) {
        const agentData = await response.json()
        setKeyAgentInfo(agentData)
      } else {
        console.warn('鍵預かり業者情報の取得に失敗しました')
        setKeyAgentInfo(null)
      }
    } catch (error) {
      console.error('鍵預かり業者情報の取得エラー:', error)
      setKeyAgentInfo(null)
    } finally {
      setIsLoadingKeyAgent(false)
    }
  }

  // 選択された部屋が変更された時、鍵預かり業者情報を取得
  useEffect(() => {
    if (selectedRoom.access_method?.includes('鍵取り') && selectedRoom.key_agent_phone) {
      // 案内方法が鍵取りの場合は鍵預かり業者情報を取得
      fetchKeyAgentInfo(selectedRoom.key_agent_phone)
    } else {
      setKeyAgentInfo(null)
    }
  }, [selectedRoom])

  // ナビ開始機能
  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${propertyGroup.latitude},${propertyGroup.longitude}`
    window.open(url, '_blank')
  }

  // 電話発信機能
  const handlePhoneCall = () => {
    if (selectedRoom.phone_number) {
      // 電話番号から不要な文字を除去（ハイフン、スペース、括弧など）
      const cleanPhoneNumber = selectedRoom.phone_number.replace(/[-\s()]/g, '')
      window.location.href = `tel:${cleanPhoneNumber}`
    } else {
      alert('電話番号が設定されていません')
    }
  }

  // 鍵預かり業者への電話発信
  const handleKeyAgentPhoneCall = () => {
    if (keyAgentInfo?.phone_number) {
      const cleanPhoneNumber = keyAgentInfo.phone_number.replace(/[-\s()]/g, '')
      window.location.href = `tel:${cleanPhoneNumber}`
    } else {
      alert('業者の電話番号が取得できませんでした')
    }
  }

  // 鍵預かり業者のナビ開始
  const handleKeyAgentNavigate = () => {
    if (keyAgentInfo?.latitude && keyAgentInfo?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${keyAgentInfo.latitude},${keyAgentInfo.longitude}`
      window.location.href = url
    } else if (keyAgentInfo?.address) {
      // 座標が取得できない場合は住所で検索
      const encodedAddress = encodeURIComponent(keyAgentInfo.address)
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
      window.location.href = url
    } else {
      alert('業者の位置情報が取得できませんでした')
    }
  }

  // ストア機能への移動（業者選択状態）
  const handleMoveToStore = () => {
    if (keyAgentInfo?.phone_number) {
      const url = `/store?selected_agent=${encodeURIComponent(keyAgentInfo.phone_number)}`
      window.location.href = url
    } else {
      alert('業者情報が取得できませんでした')
    }
  }

  // 撮影予定のトグル処理
  const handleToggleShootingSchedule = () => {
    if (isInShootingSchedule) {
      // 撮影予定から削除
      const success = removeFromSchedule(selectedRoom.id)
      if (success) {
        setIsInShootingSchedule(false)
        // 成功時の軽いフィードバック（オプション）
        console.log('撮影予定から削除しました')
        // カスタムイベントを発火してヘッダーの数字を更新
        window.dispatchEvent(new CustomEvent('scheduledPropertiesChanged'))
      } else {
        alert('撮影予定からの削除に失敗しました')
      }
    } else {
      // 撮影予定に追加
      const success = addToSchedule({
        id: selectedRoom.id,
        property_name: propertyGroup.property_name,
        room_number: selectedRoom.room_number,
        address: propertyGroup.address
      })
      if (success) {
        setIsInShootingSchedule(true)
        // 成功時の軽いフィードバック（オプション）
        console.log('撮影予定に追加しました')
        // カスタムイベントを発火してヘッダーの数字を更新
        window.dispatchEvent(new CustomEvent('scheduledPropertiesChanged'))
      } else {
        alert('既に撮影予定に追加されています')
      }
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pb-footer">
      {/* Background Overlay - カード上部のみカバー */}
      <div 
        className="absolute inset-x-0 top-0 bottom-0" 
        style={{ top: 'calc(50vh - 20px)' }}
        onClick={onClose}
      />
      
      {/* Card */}
      <div className="relative w-full bg-white rounded-t-2xl shadow-xl max-h-[50vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-4 pt-3 pb-0.5">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {propertyGroup.property_name}
              </h2>
            </div>
            
            <div className="flex items-center space-x-1 ml-2">
              {/* 物件位置に戻るボタン */}
              <button 
                onClick={onBackToProperty}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="物件位置に戻る"
              >
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* 編集ボタン */}
              <button 
                onClick={() => onEdit(selectedRoom)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              {/* ナビ開始ボタン */}
              <button 
                onClick={handleNavigate}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
              
              {/* 撮影予定追加/削除ボタン（撮影済物件には非表示） */}
              {selectedRoom.status !== '撮影済' && (
              <button 
                  onClick={handleToggleShootingSchedule}
                  className={`p-2 rounded-full transition-colors ${
                    isInShootingSchedule 
                      ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={isInShootingSchedule ? '撮影予定から削除' : '撮影予定に追加'}
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-1 pb-4 space-y-2 overflow-y-auto">
          {/* Address */}
          <div>
            <p className="text-sm text-gray-900">{propertyGroup.address}</p>
          </div>

          {/* Room Numbers */}
          <div>
            <div className="flex flex-wrap gap-1">
              {rooms.map((room, index) => {
                const normalizedStatus = room.status === '' || !room.status ? '未撮影' : room.status
                const isSelected = selectedRoom.id === room.id
                const isDeletedFlag = (room as any).deleted || false
                // 削除予定が設定されている部屋は黄色表示
                if (isDeletedFlag) {
                  return (
                    <button
                      key={`${room.id}-${room.room_number}-${index}`}
                      onClick={() => setSelectedRoom(room)}
                      className={`text-sm font-medium px-2 py-0.5 rounded cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'text-white bg-yellow-500 ring-2 ring-yellow-300'
                          : 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                      }`}
                    >
                      {room.room_number}
                    </button>
                  )
                }
                return (
                  <button
                    key={`${room.id}-${room.room_number}-${index}`}
                    onClick={() => setSelectedRoom(room)}
                    className={`text-sm font-medium px-2 py-0.5 rounded cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? normalizedStatus === '未撮影'
                          ? 'text-white bg-blue-600 ring-2 ring-blue-300' 
                          : 'text-white bg-red-600 ring-2 ring-red-300'
                        : normalizedStatus === '未撮影'
                          ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                          : 'text-red-600 bg-red-50 hover:bg-red-100'
                    }`}
                  >
                    {room.room_number}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          {(selectedRoom.access_method && selectedRoom.access_method.trim() !== '') || 
           (selectedRoom.memo && selectedRoom.memo.trim() !== '') ? (
            <div className="py-2">
              <div className="border-t border-gray-200"></div>
            </div>
          ) : null}

          {/* Access Method */}
          {selectedRoom.access_method && selectedRoom.access_method.trim() !== '' && (
            <div>
              <h3 className="text-xs font-bold text-gray-600 mb-1">案内方法</h3>
              <p className="text-sm text-gray-900">{selectedRoom.access_method}</p>
            </div>
          )}

          {/* 鍵預かり業者（案内方法に「鍵取り」が含まれている場合のみ表示） */}
          {selectedRoom.access_method?.includes('鍵取り') && selectedRoom.key_agent_phone && (
            <div>
              <h3 className="text-xs font-bold text-gray-600 mb-1">鍵預かり業者</h3>
              {isLoadingKeyAgent ? (
                <InlineLoading text="読み込み中..." className="text-sm text-gray-500" size="xs" />
              ) : keyAgentInfo ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-900 flex-1">{keyAgentInfo.agent_name}</p>
                  <div className="flex items-center space-x-1 ml-2">
                    {/* ストア移動ボタン（ピンアイコン） */}
                    <button 
                      onClick={handleMoveToStore}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      title="ストアで表示"
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    
                    {/* ナビ開始ボタン（地図アイコン） */}
                    <button 
                      onClick={handleKeyAgentNavigate}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      title="道案内"
                    >
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </button>
                    
                    {/* 電話ボタン */}
                    <button 
                      onClick={handleKeyAgentPhoneCall}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      title="電話をかける"
                    >
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">業者情報が見つかりません</p>
              )}
            </div>
          )}

          {/* Memo */}
          {selectedRoom.memo && selectedRoom.memo.trim() !== '' && (
            <div>
              <h3 className="text-xs font-bold text-gray-600 mb-1">メモ</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedRoom.memo}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface AgentDetailCardProps {
  agent: KeyAgent
  properties: KeyProperty[]
  selectedPropertyIds: number[]
  onClose: () => void
  onPropertyUpdate: (property: KeyProperty) => void
  onPropertySelect: (propertyId: number) => void
  onBackToAgent?: () => void
}

// 業者詳細カード（ストアページから移植）
function AgentDetailCard({ agent, properties, selectedPropertyIds, onClose, onPropertyUpdate, onPropertySelect, onBackToAgent }: AgentDetailCardProps) {
  const [isUpdating, setIsUpdating] = useState<number | null>(null)

  // 道案内機能
  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${agent.latitude},${agent.longitude}`
    window.open(url, '_blank')
  }

  // 電話発信機能
  const handlePhoneCall = () => {
    const cleanPhoneNumber = agent.phone_number.replace(/[-\s()]/g, '')
    window.location.href = `tel:${cleanPhoneNumber}`
  }

  // 鍵のレンタル/返却/リセット処理
  const handleKeyAction = async (property: KeyProperty, action: 'rent' | 'return' | 'reset') => {
    if (isUpdating === property.id) return
    
    setIsUpdating(property.id)
    
    try {
      const response = await fetch(`/api/properties/${property.id}/key-action`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
        }),
      })

      if (!response.ok) {
        const actionText = action === 'rent' ? 'レンタル' : action === 'return' ? '返却' : 'リセット'
        throw new Error(`鍵の${actionText}に失敗しました`)
      }

      const updatedProperty = await response.json()
      onPropertyUpdate(updatedProperty)
      
    } catch (error) {
      console.error('Key action error:', error)
      const actionText = action === 'rent' ? 'レンタル' : action === 'return' ? '返却' : 'リセット'
      alert(`鍵の${actionText}に失敗しました`)
    } finally {
      setIsUpdating(null)
    }
  }

  // 日時フォーマット
  const formatDateTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return ''
    try {
      const date = new Date(dateTimeStr)
      return date.toLocaleString('ja-JP', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pb-footer">
      {/* Background Overlay - カード上部のみカバー */}
      <div 
        className="absolute inset-x-0 top-0 bottom-0" 
        style={{ top: 'calc(30vh - 20px)' }}
        onClick={onClose}
      />
      
      {/* Card */}
      <div className="relative w-full bg-white rounded-t-2xl shadow-xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {agent.agent_name}
            </h2>
            
            <div className="flex items-center space-x-2 ml-2">
              {/* 業者位置に戻るボタン */}
              <button 
                onClick={onBackToAgent}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="業者位置に戻る"
              >
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* 道案内ボタン */}
              <button 
                onClick={handleNavigate}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
              
              {/* 電話ボタン */}
              <button 
                onClick={handlePhoneCall}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 truncate overflow-hidden whitespace-nowrap flex-1 pr-4" title={agent.address}>
              {agent.address}
            </p>
            <p className="text-sm text-gray-600 flex-shrink-0">
              {agent.phone_number}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-2 pb-4 overflow-y-auto max-h-96">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">預かり物件</h3>
            
            {properties.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">預かり物件はありません</p>
            ) : (
              <div className="space-y-2">
                {properties.map((property) => (
                  <div 
                    key={property.id}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      selectedPropertyIds.includes(property.id)
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                        : property.key_rental_status === 'rented' 
                          ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => onPropertySelect(property.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {property.property_name} {property.room_number}
                          </p>
                          {selectedPropertyIds.includes(property.id) && (
                            <svg className="w-4 h-4 ml-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {property.key_rental_status === 'rented' && property.key_rented_at && (
                          <p className="text-xs text-red-600">
                            借用中 | {formatDateTime(property.key_rented_at)}
                          </p>
                        )}
                        {property.key_rental_status === 'available' && property.key_returned_at && (
                          <p className="text-xs text-gray-600">
                            返却完了 | {formatDateTime(property.key_returned_at)}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* 借りる・返却・リセットボタン */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // 親のクリックイベントを防ぐ
                            if (property.key_rental_status === 'rented') {
                              handleKeyAction(property, 'return')
                            } else if (property.key_rental_status === 'available' && property.key_returned_at) {
                              handleKeyAction(property, 'reset')
                            } else {
                              handleKeyAction(property, 'rent')
                            }
                          }}
                          disabled={isUpdating === property.id}
                          className={`w-16 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            property.key_rental_status === 'rented'
                              ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
                              : property.key_rental_status === 'available' && property.key_returned_at
                                ? 'bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50'
                                : 'bg-blue-400 text-white hover:bg-blue-500 disabled:opacity-50'
                          }`}
                        >
                          {isUpdating === property.id ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </span>
                          ) : (
                            <>
                              {property.key_rental_status === 'rented' ? (
                                <div className="flex items-center justify-center">
                                  <span>返却</span>
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              ) : property.key_rental_status === 'available' && property.key_returned_at ? (
                                <>リセット</>
                              ) : (
                                <>借りる</>
                              )}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EnhancedGoogleMap({ 
  properties, 
  selectedPropertyId, 
  onPropertySelect,
  onPropertyUpdate,
  onLaunchCamera,
  className = '',
  showCurrentLocation = true
}: EnhancedGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])
  const [keyAgentMarkers, setKeyAgentMarkers] = useState<google.maps.Marker[]>([])
  const [currentLocationMarker, setCurrentLocationMarker] = useState<google.maps.Marker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [selectedPropertyGroup, setSelectedPropertyGroup] = useState<PropertyGroup | null>(null)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [previousSelectedPropertyGroup, setPreviousSelectedPropertyGroup] = useState<PropertyGroup | null>(null)
  const [previousSelectedRoomId, setPreviousSelectedRoomId] = useState<number | null>(null)

  // 業者カード関連の状態
  const [selectedAgent, setSelectedAgent] = useState<KeyAgent | null>(null)
  const [agentProperties, setAgentProperties] = useState<KeyProperty[]>([])
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([])
  const [isLoadingAgentData, setIsLoadingAgentData] = useState(false)
  const [selectedAgentPhone, setSelectedAgentPhone] = useState<string | null>(null)

  // 編集画面を開く
  const handleEditProperty = (property: Property) => {
    // 現在選択されているプロパティグループを保存
    setPreviousSelectedPropertyGroup(selectedPropertyGroup)
    // 編集する部屋のIDを保存
    setPreviousSelectedRoomId(property.id)
    setEditingProperty(property)
    setSelectedPropertyGroup(null) // カードを閉じる
  }

  // 編集画面を閉じる
  const handleCloseEdit = () => {
    setEditingProperty(null)
    // 編集前に表示されていたカードを復元
    if (previousSelectedPropertyGroup) {
      setSelectedPropertyGroup(previousSelectedPropertyGroup)
      // 選択していた部屋IDはカード復元時に使用するため、ここではクリアしない
    }
  }

  // 物件を保存
  const handleSaveProperty = (updatedProperty: Property) => {
    // ここで実際のデータ更新処理を行う
    console.log('物件データを保存:', updatedProperty)
    
    // 編集画面を閉じる
    setEditingProperty(null)
    
    // 元のプロパティグループがあれば、更新された物件データで更新
    if (previousSelectedPropertyGroup) {
      const updatedGroup = { ...previousSelectedPropertyGroup }
      
      // 該当する部屋のデータを更新
      const roomIndex = updatedGroup.rooms.findIndex(room => room.id === updatedProperty.id)
      if (roomIndex !== -1) {
        updatedGroup.rooms[roomIndex] = updatedProperty
        
        // 代表ステータスを再計算
        const hasUnshot = updatedGroup.rooms.some(room => {
          const status = room.status === '' || !room.status ? '未撮影' : room.status
          return status === '未撮影'
        })
        updatedGroup.representativeStatus = hasUnshot ? '未撮影' : '撮影済'
      }
      
      // 更新されたプロパティグループでカードを復元
      setSelectedPropertyGroup(updatedGroup)
      setPreviousSelectedPropertyGroup(null)
      // 部屋選択状態は次のカード表示で使用するため、ここではクリアしない
    }
    
    // 親コンポーネントに更新を通知
    if (onPropertyUpdate) {
      onPropertyUpdate(updatedProperty)
    }
  }

  // スムーズなカメラアニメーション関数
  const animateTo = useCallback((targetLat: number, targetLng: number, targetZoom: number = 16) => {
    if (!map) return

    const currentCenter = map.getCenter()
    const currentZoom = map.getZoom() || 10
    
    if (!currentCenter) return

    const startLat = currentCenter.lat()
    const startLng = currentCenter.lng()
    const startZoom = currentZoom

    // アニメーションの設定
    const duration = 1500 // 1.5秒
    const startTime = performance.now()

    // イージング関数（イーズアウト）
    const easeOutQuart = (t: number): number => {
      return 1 - Math.pow(1 - t, 4)
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutQuart(progress)

      // 座標とズームを補間
      const currentLat = startLat + (targetLat - startLat) * easedProgress
      const currentLng = startLng + (targetLng - startLng) * easedProgress
      const currentZoomInterpolated = startZoom + (targetZoom - startZoom) * easedProgress

      // 地図を更新
      map.setCenter({ lat: currentLat, lng: currentLng })
      map.setZoom(currentZoomInterpolated)

      // アニメーション継続判定
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [map])

  // 現在位置の取得
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation || !showCurrentLocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(location)
      },
      (error) => {
        console.warn('位置情報の取得に失敗しました:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5分間キャッシュ
      }
    )
  }, [showCurrentLocation])

  // カスタムピンアイコンの作成
  const createCustomMarkerIcon = useCallback((status: string, isSelected: boolean = false, propertyGroup?: PropertyGroup) => {
    // ステータスが空白の場合は未撮影として扱う
    const normalizedStatus = status === '' || !status ? '未撮影' : status
    
    const size = isSelected ? 40 : 32  // サイズを少し大きくする
    // 通常は未撮影=青、撮影済=赤
    let color = normalizedStatus === '未撮影' ? '#3B82F6' : '#EF4444'
    let shadowColor = normalizedStatus === '未撮影' ? '#1D4ED8' : '#DC2626'
    
    // 削除フラグがある場合は黄色系にする
    const hasDeleteFlag = propertyGroup?.rooms.some(room => (room as any).deleted) || false
    if (hasDeleteFlag) {
      color = '#FACC15'        // 黄
      shadowColor = '#CA8A04' // 濃い黄
    }
    
    // 表示用ステータスを変更
    const displayStatus = normalizedStatus === '撮影済み' ? '撮影済' : normalizedStatus
    
    // 撮影予定に含まれているかチェック
    const scheduledProperties = getScheduledProperties()
    const hasScheduledRoom = propertyGroup?.rooms.some(room => 
      scheduledProperties.some(scheduled => scheduled.id === room.id.toString())
    ) || false
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-25%" y="-15%" width="150%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
            </filter>
            <linearGradient id="pinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${shadowColor};stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <!-- ピンの影 -->
          <ellipse cx="18" cy="32" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/>
          
          <!-- ピンの本体 -->
          <path d="M18 4C13.03 4 9 8.03 9 13c0 7.25 9 17 9 17s9-9.75 9-17c0-4.97-4.03-9-9-9z" 
                fill="url(#pinGradient)" 
                filter="url(#shadow)" 
                stroke="white" 
                stroke-width="1.5"/>
          
          <!-- 内側の円 -->
          <circle cx="18" cy="13" r="4" fill="white" opacity="0.9"/>
          
          <!-- ステータスアイコン -->
          ${normalizedStatus === '未撮影'
            ? `<circle cx="18" cy="13" r="2.5" fill="${color}"/>
               <text x="18" y="15.5" text-anchor="middle" fill="white" font-size="3" font-weight="bold">!</text>`
            : `<circle cx="18" cy="13" r="2.5" fill="${color}"/>
               <path d="M16.5 13 L17.5 14 L19.5 12" stroke="white" stroke-width="0.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          }
          
          <!-- 撮影予定の星アイコン（右上に配置） -->
          ${hasScheduledRoom ? `
            <circle cx="28" cy="8" r="6" fill="#FFD700" stroke="#FFA500" stroke-width="1" opacity="0.95"/>
            <path d="M28 5 L28.8 7.4 L31.5 7.4 L29.35 9.1 L30.15 11.5 L28 9.8 L25.85 11.5 L26.65 9.1 L24.5 7.4 L27.2 7.4 Z" 
                  fill="white" 
                  stroke="#FFA500" 
                  stroke-width="0.3"/>
          ` : ''}
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size - 4)
    }
  }, [])

  // 緑色の鍵預かり業者マーカーアイコンの作成（ストアページと同じデザイン）
  const createKeyAgentMarkerIcon = useCallback((isSelected: boolean = false) => {
    const size = isSelected ? 40 : 36
    const color = '#10B981' // 緑色で業者を表示
    const shadowColor = '#059669'
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-25%" y="-15%" width="150%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
            </filter>
            <linearGradient id="agentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${shadowColor};stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <!-- ピンの影 -->
          <ellipse cx="18" cy="32" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/>
          
          <!-- ピンの本体 -->
          <path d="M18 4C13.03 4 9 8.03 9 13c0 7.25 9 17 9 17s9-9.75 9-17c0-4.97-4.03-9-9-9z" 
                fill="url(#agentGradient)" 
                filter="url(#shadow)" 
                stroke="white" 
                stroke-width="1.5"/>
          
          <!-- 内側の円 -->
          <circle cx="18" cy="13" r="4" fill="white" opacity="0.9"/>
          
          <!-- 鍵アイコン -->
          <path d="M16 11.5a2 2 0 012-2 2 2 0 012 2 2 2 0 01-1 1.732V15h-2v-1.768A2 2 0 0116 11.5z" fill="${color}"/>
          <rect x="17" y="14" width="2" height="1" fill="${color}"/>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size - 4)
    }
  }, [])

  // 現在位置マーカーの作成
  const createCurrentLocationIcon = useCallback(() => {
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <radialGradient id="blueGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#60A5FA;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#2563EB;stop-opacity:1" />
            </radialGradient>
          </defs>
          
          <!-- 外側の脈動する円 -->
          <circle cx="20" cy="20" r="16" fill="#3B82F6" opacity="0.4">
            <animate attributeName="r" values="12;18;12" dur="2.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          
          <!-- 中間の円 -->
          <circle cx="20" cy="20" r="12" fill="#2563EB" opacity="0.6">
            <animate attributeName="r" values="10;14;10" dur="2.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          
          <!-- 内側のコア（完全に青塗り） -->
          <circle cx="20" cy="20" r="7" fill="url(#blueGradient)" filter="url(#glow)" stroke="#ffffff" stroke-width="2"/>
          <circle cx="20" cy="20" r="4" fill="#1D4ED8"/>
          <circle cx="20" cy="20" r="2" fill="#ffffff"/>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 20)
    }
  }, [])

  // Google Maps APIの初期化
  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        
        if (!apiKey) {
          setError('Google Maps API キーが設定されていません')
          setIsLoading(false)
          return
        }

        if (apiKey === 'your_google_maps_api_key_here' || apiKey === 'demo') {
          setError('Google Maps API キーを設定してください')
          setIsLoading(false)
          return
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places']
        })

        const google = await loader.load()
        
        if (!mapRef.current) return

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: MAP_CONFIG.DEFAULT_CENTER,
          zoom: MAP_CONFIG.DEFAULT_ZOOM,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ],
          disableDefaultUI: true, // すべてのデフォルトコントロールを非表示
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          panControl: false, // パンコントロール（移動ボタン）を明示的に無効化
          gestureHandling: 'greedy',
          clickableIcons: false,
          disableDoubleClickZoom: false,
          keyboardShortcuts: false // キーボードショートカットも無効化
        })

        setMap(mapInstance)
        setIsLoading(false)
        
        // Google Mapsのガイド/チュートリアルUIを非表示にする
        const style = document.createElement('style')
        style.textContent = `
          .dismissible-promo,
          .widget-promo,
          .gm-style .dismissible-promo,
          .gm-style .widget-promo,
          [data-value="Directions"],
          [data-value="Search nearby"],
          .gm-fullscreen-control + div,
          .gm-compass,
          .compass {
            display: none !important;
          }
        `
        document.head.appendChild(style)
        
        // 地図クリック時の選択解除
        mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
          // マーカー以外の場所をクリックした場合、選択を解除
          setSelectedPropertyGroup(null)
          setSelectedAgent(null) // 業者カードも閉じる
          setAgentProperties([]) // 業者物件データもクリア
          setSelectedPropertyIds([]) // 選択された物件IDもクリア
          setSelectedAgentPhone(null) // 業者選択状態もクリア
          if (onPropertySelect) {
            onPropertySelect(null) // 選択解除
          }
        })
        
        // 現在位置の取得
        getCurrentLocation()
      } catch (err) {
        console.error('Google Maps初期化エラー:', err)
        setError('Google Mapsの読み込みに失敗しました')
        setIsLoading(false)
      }
    }

    initMap()
  }, [getCurrentLocation, onPropertySelect])

  // 現在位置マーカーの作成
  useEffect(() => {
    if (!map || !userLocation || !window.google) return

    // 既存の現在位置マーカーをクリア
    if (currentLocationMarker) {
      currentLocationMarker.setMap(null)
    }

    const marker = new google.maps.Marker({
      position: userLocation,
      map,
      title: '現在位置',
      icon: createCurrentLocationIcon(),
      zIndex: 500 // 物件マーカーより下に配置
    })

    setCurrentLocationMarker(marker)

    return () => {
      if (marker) {
        marker.setMap(null)
      }
    }
  }, [map, userLocation, createCurrentLocationIcon])

  // 物件マーカーの作成・更新
  useEffect(() => {
    if (!map || !window.google) return

    // 既存のマーカーをクリア
    markers.forEach(marker => marker.setMap(null))

    // 物件をグループ化（useEffect内で直接実行）
    const groups = new Map<string, PropertyGroup>()
    
    properties.forEach(property => {
      const key = `${property.property_name}_${property.address}`
      
      if (groups.has(key)) {
        const group = groups.get(key)!
        
        // 同じ部屋番号の重複をチェック
        const existingRoom = group.rooms.find(room => room.room_number === property.room_number)
        if (!existingRoom) {
          group.rooms.push(property)
        } else {
          // 重複する場合は、より新しいデータまたは完全なデータを優先
          const newRoomHasMoreData = (property.access_method || property.memo) && !(existingRoom.access_method || existingRoom.memo)
          if (newRoomHasMoreData || property.id > existingRoom.id) {
            // 既存の部屋データを新しいデータで置き換え
            const roomIndex = group.rooms.findIndex(room => room.room_number === property.room_number)
            group.rooms[roomIndex] = property
          }
        }
        
        // 代表ステータスを更新（未撮影があれば未撮影を優先）
        const hasUnshot = group.rooms.some(room => {
          const status = room.status === '' || !room.status ? '未撮影' : room.status
          return status === '未撮影'
        })
        group.representativeStatus = hasUnshot ? '未撮影' : '撮影済'
      } else {
        const normalizedStatus = property.status === '' || !property.status ? '未撮影' : property.status
        groups.set(key, {
          id: key,
          property_name: property.property_name,
          address: property.address,
          latitude: property.latitude,
          longitude: property.longitude,
          rooms: [property],
          representativeStatus: normalizedStatus
        })
      }
    })
    
    const propertyGroups = Array.from(groups.values())

    const newMarkers: google.maps.Marker[] = []

    propertyGroups.forEach(group => {
      const isSelected = group.rooms.some(room => room.id === selectedPropertyId)
      const marker = new google.maps.Marker({
        position: { lat: group.latitude, lng: group.longitude },
        map,
        title: `${group.property_name} (${group.rooms.length}室)`,
        icon: createCustomMarkerIcon(group.representativeStatus, isSelected, group),
        zIndex: isSelected ? 2000 : 1000,
        animation: null
      })

      // マーカークリックイベント
      marker.addListener('click', (event: google.maps.MapMouseEvent) => {
        // イベント伝播を停止して、地図クリックイベントの発火を防ぐ
        event.stop()
        
        // 小さな遅延で実行することで、地図クリックイベントとの競合を回避
        setTimeout(() => {
          // 業者カードが表示されている場合は閉じる
          setSelectedAgent(null)
          setAgentProperties([])
          setSelectedPropertyIds([])
          setSelectedAgentPhone(null)
          
          // 即座に選択状態を更新（ダイレクト選択を可能にする）
          setSelectedPropertyGroup(group)
          if (onPropertySelect && group.rooms.length > 0) {
            onPropertySelect(group.rooms[0].id)
          }
        }, 10)
      })

      newMarkers.push(marker)
    })

    setMarkers(newMarkers)

    // 初回のみ地図の表示範囲を調整（マーカーが存在しない場合のみ、かつ現在位置が取得できていない場合のみ）
    if (properties.length > 0 && markers.length === 0 && !userLocation) {
      const bounds = new google.maps.LatLngBounds()
      
      // 物件位置を含める
      propertyGroups.forEach(group => {
        bounds.extend({ lat: group.latitude, lng: group.longitude })
      })
      
      map.fitBounds(bounds, 50)
      
      // ズームレベルが高すぎる場合は調整（一度だけ）
      const listener = google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom()! > 16) map.setZoom(16)
        google.maps.event.removeListener(listener)
      })
    }
  }, [map, properties, selectedPropertyId, onPropertySelect, createCustomMarkerIcon, userLocation])

  // 現在位置を中央に配置（物件表示より優先）
  useEffect(() => {
    if (!map || !userLocation) return

    // 固定のズームレベル（物件の有無に関係なく常に同じ）
    const zoomLevel = 15
    
    // 瞬間的に現在位置を中央に配置（アニメーションなし）
    map.setCenter(userLocation)
    map.setZoom(zoomLevel)
  }, [map, userLocation])

  // 撮影予定物件の鍵預かり業者マーカーの作成・更新
  useEffect(() => {
    if (!map || !window.google) return

    let isMounted = true // マウント状態を追跡

    // 既存の鍵預かり業者マーカーをクリア
    keyAgentMarkers.forEach(marker => marker.setMap(null))

    // 撮影予定物件を取得
    const scheduledProperties = getScheduledProperties()
    const keyAgentMap = new Map<string, {
      phone: string
      name: string
      latitude: number
      longitude: number
      propertyCount: number
    }>()

    // 撮影予定物件の中で鍵預かり業者がある物件を処理
    scheduledProperties.forEach((scheduledProperty) => {
      const property = properties.find(p => String(p.id) === scheduledProperty.id)
      if (property && property.key_agent_phone && property.access_method?.includes('鍵取り')) {
        // 業者情報を収集（同一業者の物件数もカウント）
        const key = property.key_agent_phone
        if (keyAgentMap.has(key)) {
          const agent = keyAgentMap.get(key)!
          agent.propertyCount += 1
        } else {
          // 業者の詳細情報は非同期で取得する必要があるため、ここでは基本情報のみ
          // 実際の座標は property.latitude, property.longitude を使用
          keyAgentMap.set(key, {
            phone: property.key_agent_phone,
            name: '鍵預かり業者',
            latitude: property.latitude, // 暫定的に物件座標を使用
            longitude: property.longitude,
            propertyCount: 1
          })
        }
      }
    })

    // 鍵預かり業者マーカーを作成
    const newKeyAgentMarkers: google.maps.Marker[] = []
    
    // 非同期でマーカーを作成
    const createMarkers = async () => {
      const agentEntries = Array.from(keyAgentMap.values())
      
      for (const agent of agentEntries) {
        if (!isMounted) break // アンマウントされた場合は処理を停止
        
        try {
          // 業者の詳細情報を取得
          const response = await fetch(`/api/key-agents/${encodeURIComponent(agent.phone)}`)
          if (response.ok && isMounted) {
            const agentData = await response.json()
            
            const marker = new google.maps.Marker({
              position: { lat: agentData.latitude, lng: agentData.longitude },
              map,
              title: `${agentData.agent_name} (撮影予定物件: ${agent.propertyCount}件)`,
              icon: createKeyAgentMarkerIcon(false),
              zIndex: 1500 // 物件マーカーと現在位置の間
            })

            // マーカークリックで業者詳細カードを表示
            marker.addListener('click', (event: google.maps.MapMouseEvent) => {
              // イベント伝播を停止して、地図クリックイベントの発火を防ぐ
              event.stop()
              
              // 小さな遅延で実行することで、地図クリックイベントとの競合を回避
              setTimeout(() => {
                // 既存の物件カードを閉じる
                setSelectedPropertyGroup(null)
                // 業者選択状態を設定
                setSelectedAgentPhone(agentData.phone_number)
                // 業者データを取得してカードを表示
                fetchAgentData(agentData.phone_number)
              }, 10)
            })

            newKeyAgentMarkers.push(marker)
          }
        } catch (error) {
          console.error('鍵預かり業者情報の取得エラー:', error)
        }
      }
      
      if (isMounted) {
        setKeyAgentMarkers(newKeyAgentMarkers)
      }
    }

    createMarkers()

    // クリーンアップ
    return () => {
      isMounted = false
      newKeyAgentMarkers.forEach(marker => marker.setMap(null))
    }
  }, [map, properties, createKeyAgentMarkerIcon])

  // 選択された物件にフォーカス（ズームレベル16固定）
  useEffect(() => {
    if (!map || !selectedPropertyId) return

    const selectedProperty = properties.find(p => p.id === selectedPropertyId)
    if (selectedProperty) {
      // ズームレベル16で中央に配置
      map.setCenter({ lat: selectedProperty.latitude, lng: selectedProperty.longitude })
      map.setZoom(16)
    }
  }, [map, selectedPropertyId, properties])

  // 選択された業者にフォーカス（ズームレベル16固定）
  useEffect(() => {
    if (!map || !selectedAgentPhone) return

    // キャッシュからエージェントデータを取得
    const findAgentByPhone = async () => {
      try {
        // 既にメモリ内にある業者データから検索（最適化）
        const keyAgentMarkers = document.querySelectorAll('[data-agent-phone]')
        for (const marker of keyAgentMarkers) {
          const agentPhone = marker.getAttribute('data-agent-phone')
          if (agentPhone === selectedAgentPhone) {
            const lat = parseFloat(marker.getAttribute('data-lat') || '0')
            const lng = parseFloat(marker.getAttribute('data-lng') || '0')
            if (lat && lng) {
              map.setCenter({ lat, lng })
              map.setZoom(16)
              return
            }
          }
        }

        // フォールバック: API呼び出し
        const response = await fetch(`/api/key-agents/${encodeURIComponent(selectedAgentPhone)}`)
        if (response.ok) {
          const agentData = await response.json()
          map.setCenter({ lat: agentData.latitude, lng: agentData.longitude })
          map.setZoom(16)
        }
      } catch (error) {
        console.error('業者位置の取得エラー:', error)
      }
    }

    findAgentByPhone()
  }, [map, selectedAgentPhone])

  // 業者データ取得関数
  const fetchAgentData = async (agentPhone: string) => {
    setIsLoadingAgentData(true)
    try {
      // 業者情報と業者が管理している物件を並列で取得
      const [agentResponse, propertiesResponse] = await Promise.all([
        fetch(`/api/key-agents/${encodeURIComponent(agentPhone)}`),
        fetch('/api/properties')
      ])

      if (agentResponse.ok) {
        const agentData = await agentResponse.json()
        setSelectedAgent(agentData)
      }

      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json()
        const allProperties = propertiesData.properties || propertiesData
        // この業者が管理している物件のみフィルタリング
        const managedProperties = allProperties.filter((p: KeyProperty) => p.key_agent_phone === agentPhone)
        setAgentProperties(managedProperties)
      }
    } catch (error) {
      console.error('業者データの取得エラー:', error)
      alert('業者情報の取得に失敗しました')
    } finally {
      setIsLoadingAgentData(false)
    }
  }

  // 業者カードを閉じる
  const handleCloseAgentCard = () => {
    setSelectedAgent(null)
    setAgentProperties([])
    setSelectedPropertyIds([])
    setSelectedAgentPhone(null) // 業者選択状態もクリア
  }

  // 業者位置に戻る
  const handleBackToAgent = () => {
    if (map && selectedAgent) {
      animateTo(selectedAgent.latitude, selectedAgent.longitude, 16)
    }
  }

  // 業者が管理する物件の更新
  const handleAgentPropertyUpdate = (updatedProperty: KeyProperty) => {
    setAgentProperties(prev => 
      prev.map(p => p.id === updatedProperty.id ? updatedProperty : p)
    )
  }

  // 業者が管理する物件の選択
  const handleAgentPropertySelect = (propertyId: number) => {
    setSelectedPropertyIds(prev => {
      const isSelected = prev.includes(propertyId)
      if (isSelected) {
        // 既に選択されている場合は選択解除
        return []
      } else {
        // 新しい物件を選択（単一選択）
        return [propertyId]
      }
    })
    
    // 選択された物件の位置に移動
    const property = agentProperties.find(p => p.id === propertyId)
    if (property && map) {
      animateTo(property.latitude, property.longitude, 16)
    }
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-red-50 to-red-100 border border-red-200 p-8 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-6">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-red-800 mb-3">Google Maps API設定が必要です</h3>
          <p className="text-red-600 mb-6">{error}</p>
          
          <div className="bg-white rounded-xl p-6 text-left max-w-md mx-auto">
            <h4 className="font-semibold text-gray-800 mb-3">設定手順:</h4>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Google Cloud Consoleでプロジェクトを作成</li>
              <li>Maps JavaScript APIを有効化</li>
              <li>APIキーを作成</li>
              <li>プロジェクトルートに.env.localファイルを作成</li>
              <li>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=あなたのAPIキー を追加</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && <MapLoading message="地図を読み込み中..." />}
      
      <div 
        ref={mapRef} 
        className={`w-full h-full overflow-hidden shadow-lg transition-all duration-300 ease-in-out ${
          selectedPropertyGroup || selectedAgent ? 'transform -translate-y-32' : ''
        }`}
        style={{ 
          height: '100%',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
        tabIndex={-1}
      />
      
      {/* 現在位置ボタン */}
      {showCurrentLocation && userLocation && (
        <button
          onClick={() => {
            if (map && userLocation) {
              // カスタムアニメーションで「ぐわーん」と現在位置に移動
              animateTo(userLocation.lat, userLocation.lng, 15)
            }
          }}
          className={`absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white hover:scale-105 active:scale-95 ${
            selectedPropertyGroup || selectedAgent ? 'transform -translate-y-32' : ''
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#003D75' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      {/* Property Detail Card */}
      {selectedPropertyGroup && (
        <PropertyDetailCard 
          propertyGroup={selectedPropertyGroup} 
          onClose={() => {
            setSelectedPropertyGroup(null)
            setPreviousSelectedRoomId(null) // 部屋選択状態をクリア
            if (onPropertySelect) {
              onPropertySelect(null)
            }
          }} 
          onEdit={handleEditProperty}
          onBackToProperty={() => {
            if (map && selectedPropertyGroup) {
              // 物件位置にズームレベル16で移動
              map.setCenter({ lat: selectedPropertyGroup.latitude, lng: selectedPropertyGroup.longitude })
              map.setZoom(16)
            }
          }}
          initialSelectedRoomId={previousSelectedRoomId}
        />
      )}

      {/* Property Edit Screen */}
      {editingProperty && (
        <PropertyEditScreen 
          property={editingProperty} 
          onClose={handleCloseEdit}
          onSave={handleSaveProperty}
          onPropertyUpdate={onPropertyUpdate}
          onLaunchCamera={onLaunchCamera}
        />
      )}

      {/* Agent Detail Card */}
      {selectedAgent && (
        <AgentDetailCard 
          agent={selectedAgent} 
          properties={agentProperties} 
          selectedPropertyIds={selectedPropertyIds} 
          onClose={handleCloseAgentCard} 
          onPropertyUpdate={handleAgentPropertyUpdate} 
          onPropertySelect={handleAgentPropertySelect} 
          onBackToAgent={handleBackToAgent}
        />
      )}
    </div>
  )
} 