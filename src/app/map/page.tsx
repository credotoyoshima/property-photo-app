'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ModernHeader from '@/components/ModernHeader'
import ModernFooter from '@/components/ModernFooter'
import EnhancedGoogleMap from '@/components/EnhancedGoogleMap'
import CameraModal from '@/components/CameraModal'
import { AuthGuard } from '@/components/AuthGuard'
import { getScheduledProperties, autoRemoveCompletedProperty } from '@/utils/shootingSchedule'
import { useUpload } from '@/contexts/UploadContext'

// Property interface
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
}

// MVP情報の型定義
interface MVPData {
  today: {
    name: string
    store: string
    count: number
  } | null
  monthly: {
    name: string
    store: string
    count: number
  } | null
}

// MVPカードコンポーネント
function MVPCard({ mvpData, isVisible }: { 
  mvpData: MVPData | null
  isVisible: boolean
}) {
  return (
    <div className="relative">
      {/* MVPカード */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isVisible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-white border border-gray-300 px-4 py-2 shadow-sm">
          <div className="flex items-center justify-center space-x-4 text-sm whitespace-nowrap overflow-hidden">
            {/* 本日のMVP */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <span className="text-gray-600 text-xs sm:text-sm">本日MVP</span>
              {mvpData?.today ? (
                <span className="font-medium text-blue-600 text-xs sm:text-sm">
                  {mvpData.today.name} {mvpData.today.count}件
                </span>
              ) : (
                <span className="text-gray-400 text-xs sm:text-sm">データなし</span>
              )}
            </div>

            {/* 区切り線 */}
            <div className="h-4 w-px bg-gray-300 flex-shrink-0"></div>

            {/* 月間MVP */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <span className="text-gray-600 text-xs sm:text-sm">月間MVP</span>
              {mvpData?.monthly ? (
                <span className="font-medium text-xs sm:text-sm" style={{ color: '#003D75' }}>
                  {mvpData.monthly.name} {mvpData.monthly.count}件
                </span>
              ) : (
                <span className="text-gray-400 text-xs sm:text-sm">データなし</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MapPage() {
  const { isUploading, uploadProgress } = useUpload()
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'map' | 'store' | 'list' | 'chat' | 'mypage'>('map')
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraProperty, setCameraProperty] = useState<Property | null>(null)
  // フィルター状態をローカルストレージから初期化
  const [isFilterOn, setIsFilterOn] = useState(() => {
    try {
      const stored = localStorage.getItem('mapFilterState')
      return stored !== null ? parseInt(stored, 10) : 0
    } catch {
      return 0
    }
  })
  const [mvpData, setMVPData] = useState<MVPData | null>(null)
  const [isMVPCardVisible, setIsMVPCardVisible] = useState(true)

  const router = useRouter()

  // フィルター状態をローカルストレージに保存
  useEffect(() => {
    try {
      localStorage.setItem('mapFilterState', String(isFilterOn))
    } catch (e) {
      console.error('Failed to save map filter state:', e)
    }
  }, [isFilterOn])

  // データ取得（最適化版）
  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // 並列でプロパティとMVPデータを取得
      const [propertiesRes, mvpRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/mvp')
      ])
      
      if (propertiesRes.ok) {
        const data = await propertiesRes.json()
        const allProperties = data.properties || data
        setProperties(allProperties)
      }
      
      if (mvpRes.ok) {
        const mvpData = await mvpRes.json()
        if (mvpData.success) {
          setMVPData(mvpData.mvp)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 初期データ読み込み
  useEffect(() => {
    fetchData()
  }, [])

  // 検索処理
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // リフレッシュ処理（統合版）
  const handleRefresh = useCallback(async () => {
    await fetchData()
  }, [])

  // データ更新処理
  const handlePropertyUpdate = useCallback((updatedProperty: Property) => {
    setProperties(prev => 
      prev.map(p => p.id === updatedProperty.id ? updatedProperty : p)
    )
  }, [])

  // 物件選択処理
  const handlePropertySelect = useCallback((propertyId: number | null) => {
    setSelectedPropertyId(propertyId)
  }, [])

  // モーダル制御: カメラ起動
  const handleLaunchCameraOnMap = useCallback((property: Property) => {
    setCameraProperty(property)
    setIsCameraOpen(true)
  }, [])

  // カメラモーダルを閉じる
  const handleCloseCameraOnMap = () => {
    setIsCameraOpen(false)
    setCameraProperty(null)
  }

  // カメラ撮影後のステータス更新
  const handleCameraStatusUpdateOnMap = (updatedProperty: Property) => {
    // 撮影完了時に撮影予定から自動削除
    const removed = autoRemoveCompletedProperty(updatedProperty.id)
    if (removed) {
      // 撮影予定変更イベントを発火
      window.dispatchEvent(new CustomEvent('scheduledPropertiesChanged'))
    }
    // プロパティリストを更新
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p))
    // モーダルを閉じる
    setIsCameraOpen(false)
    setCameraProperty(null)
  }

  // 検索によるフィルタリング
  const filteredProperties = properties.filter(property => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      property.property_name.toLowerCase().includes(query) ||
      property.address.toLowerCase().includes(query) ||
      property.room_number.toLowerCase().includes(query) ||
      property.original_agent?.toLowerCase().includes(query)
    )
  }).filter(property => {
    // フィルター状態に応じて表示を制御
    if (isFilterOn === 1) {
      // 未撮影物件のみ表示
      return property.status === '未撮影' || property.status === ''
    } else if (isFilterOn === 2) {
      // 撮影予定物件のみ表示
      const scheduledProperties = getScheduledProperties()
      return scheduledProperties.some(scheduled => scheduled.id === property.id)
    }
    // すべて表示
    return true
  })

  // タブ変更ハンドラー
  const handleTabChange = useCallback((tab: 'map' | 'store' | 'list' | 'chat' | 'mypage') => {
    if (tab === 'map') {
      // Already on map page
    } else if (tab === 'store') {
      router.push('/store')
    } else if (tab === 'list') {
      router.push('/records')
    } else if (tab === 'chat') {
      router.push('/chat')
    } else if (tab === 'mypage') {
      router.push('/mypage')
    } else {
      console.log(`${tab} page is not implemented yet`)
    }
  }, [router])

  const handleToggleFilter = () => {
    setIsFilterOn(prev => prev === 2 ? 0 : prev + 1)
  }

  const handleToggleMVPCard = () => {
    setIsMVPCardVisible(prev => !prev)
  }

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-gray-50">
        <ModernHeader 
          onSearch={handleSearch}
          searchQuery={searchQuery}
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
          onToggleFilter={handleToggleFilter}
          filterState={isFilterOn}
          onLogoClick={handleToggleMVPCard}
        />
        
        {/* アップロード進捗バー */}
        {isUploading && uploadProgress && (
          <div className="w-full bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
            アップロード中… {uploadProgress.current}/{uploadProgress.total}
          </div>
        )}
        
        {/* MVPカード */}
        <MVPCard
          mvpData={mvpData}
          isVisible={isMVPCardVisible}
        />
        
        <main className="flex-1 relative pb-20">
          <EnhancedGoogleMap
            properties={filteredProperties}
            selectedPropertyId={selectedPropertyId}
            onPropertySelect={handlePropertySelect}
            onPropertyUpdate={handlePropertyUpdate}
            onLaunchCamera={handleLaunchCameraOnMap}
            showCurrentLocation={true}
            className="w-full h-full"
          />
        </main>
        
        <ModernFooter 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        {isCameraOpen && cameraProperty && (
          <CameraModal
            property={cameraProperty}
            isOpen={isCameraOpen}
            onClose={handleCloseCameraOnMap}
            onSave={async () => {}}
            onStatusUpdate={handleCameraStatusUpdateOnMap}
          />
        )}
      </div>
    </AuthGuard>
  )
} 