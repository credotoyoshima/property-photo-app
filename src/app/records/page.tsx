'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import ModernHeader from '@/components/ModernHeader'
import ModernFooter from '@/components/ModernFooter'
import { Button } from '@/components/ui/button'
import { InlineLoading } from '@/components/ui/loading'

interface ShootingRecord {
  id: number
  property_name: string
  room_number: string
  address: string
  latitude: number
  longitude: number
  shooting_datetime: string
  photographer: string
  memo: string
  rent: number | null
  floor_area: number | null
  original_agent: string
  phone_number: string
}

interface KeyRecord {
  id: number
  property_name: string
  room_number: string
  key_holder: string // 鍵預かり業者名
  photographer: string
  store_name: string
  key_rented_at?: string // 貸し出し日時（ソート用）
}

interface FilterOptions {
  stores: string[]
  staff: Array<{
    id: number
    name: string
    store_name: string
    role: string
  }>
}

type ListType = 'shooting' | 'keys'

// スケルトンローディングコンポーネント
function RecordsSkeleton() {
  return (
    <div className="space-y-2">
      {/* フィルター部分のスケルトン */}
      <div className="py-2">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-12 mb-1"></div>
            <div className="h-7 bg-gray-200 rounded"></div>
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
            <div className="h-7 bg-gray-200 rounded"></div>
          </div>
          <div className="ml-2">
            <div className="h-7 w-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      
      {/* ヘッダー部分のスケルトン */}
      <div className="flex items-center justify-between py-1">
        <div className="h-4 bg-gray-300 rounded w-24"></div>
        <div className="h-4 bg-gray-300 rounded w-16"></div>
      </div>
      
      {/* リスト項目のスケルトン */}
      <div className="divide-y divide-gray-300 border-t border-b border-gray-300">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="py-3 animate-pulse">
            <div className="flex items-center">
              <div className="w-16 h-4 bg-gray-200 rounded mr-4"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded mr-2"></div>
              <div className="w-12 h-4 bg-gray-200 rounded mr-4"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ShootingRecordsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [records, setRecords] = useState<ShootingRecord[]>([])
  const [keyRecords, setKeyRecords] = useState<KeyRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'map' | 'store' | 'list' | 'chat' | 'mypage'>('list')
  const [listType, setListType] = useState<ListType>('shooting')

  // 新しいフィルター状態
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ stores: [], staff: [] })
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [selectedStaff, setSelectedStaff] = useState<string>('')

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  // キャッシュ機能付きAPI呼び出し
  const fetchWithCache = async (url: string, cacheKey: string, ttl: number = 300000) => { // 5分キャッシュ
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < ttl) {
        return data
      }
    }

    const response = await fetch(url)
    const data = await response.json()
    
    if (data.success) {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    }
    
    return data
  }

  // 段階的データ読み込み
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeData()
    }
  }, [isAuthenticated, user])

  // フィルターのデフォルト値設定（フィルターオプション読み込み後）
  useEffect(() => {
    if (filterOptions.stores.length > 0 && filterOptions.staff.length > 0 && user) {
      // 初回のみデフォルト値を設定（既に選択されている場合はスキップ）
      if (!selectedStore && !selectedStaff) {
        if (user.role === 'admin') {
          // 管理者：全店舗・全担当者（現在のデフォルト設定を維持）
          setSelectedStore('')
          setSelectedStaff('')
        } else {
          // 一般ユーザー：自分の店舗・自分の名前をデフォルトに
          if (user.store_name) {
            setSelectedStore(user.store_name)
          }
          if (user.name) {
            setSelectedStaff(user.name)
          }
        }
      }
    }
  }, [filterOptions.stores.length, filterOptions.staff.length, user, selectedStore, selectedStaff])

  const initializeData = async () => {
    try {
      setIsLoading(true)
      setError('')

      // キャッシュされたフィルターオプションがあれば即座に表示
      const cachedFilters = localStorage.getItem('recordsFilterOptions')
      if (cachedFilters) {
        const { data } = JSON.parse(cachedFilters)
        if (data.success) {
          setFilterOptions({
            stores: data.stores,
            staff: data.staff
          })
        }
      }

      const params = new URLSearchParams({
        userRole: user?.role || 'user',
        shooterName: user?.name || ''
      })

      // 並列でAPI呼び出し
      const [shootingResult, keyResult, filterResult] = await Promise.all([
        fetchWithCache(`/api/shooting-records?${params}`, 'shootingRecords', 60000), // 1分キャッシュ
        fetchWithCache(`/api/key-records?${params}`, 'keyRecords', 60000),
        fetchWithCache('/api/users/filter', 'recordsFilterOptions', 300000) // 5分キャッシュ
      ])

      // データ設定
      if (shootingResult.success) {
        setRecords(shootingResult.records)
      } else {
        setError(shootingResult.error || '撮影実績の取得に失敗しました')
      }

      if (keyResult.success) {
        setKeyRecords(keyResult.records)
      }

      if (filterResult.success) {
        setFilterOptions({
          stores: filterResult.stores,
          staff: filterResult.staff
        })
      }

    } catch (error) {
      console.error('Error initializing data:', error)
      setError('データの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // メモ化された filteredRecords（パフォーマンス向上）
  const filteredRecords = useMemo(() => {
    let filtered = records

    // 当日フィルター（最適化）
    const today = new Date()
    const todayString = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    const start = new Date(todayString + 'T00:00:00+09:00')
    const end = new Date(todayString + 'T23:59:59+09:00')

    filtered = filtered.filter(record => {
      const recordDate = new Date(record.shooting_datetime)
      const recordDateJST = new Date(recordDate.getTime() + (recordDate.getTimezoneOffset() * 60000) + (9 * 3600000))
      const recordDateOnly = new Date(recordDateJST.getFullYear(), recordDateJST.getMonth(), recordDateJST.getDate())
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      
      return recordDateOnly >= startDateOnly && recordDateOnly <= endDateOnly
    })

    // 店舗フィルター
    if (selectedStore) {
      filtered = filtered.filter(record => {
        const staff = filterOptions.staff.find(s => s.name === record.photographer)
        return staff?.store_name === selectedStore
      })
    }

    // 担当者フィルター
    if (selectedStaff) {
      filtered = filtered.filter(record => record.photographer === selectedStaff)
    }

    // 検索クエリ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(record =>
        record.property_name.toLowerCase().includes(query) ||
        record.address.toLowerCase().includes(query) ||
        record.photographer.toLowerCase().includes(query) ||
        record.room_number.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [records, selectedStore, selectedStaff, searchQuery, filterOptions.staff])

  // メモ化された filteredKeyRecords
  const filteredKeyRecords = useMemo(() => {
    let filtered = keyRecords

    // 店舗フィルター
    if (selectedStore) {
      filtered = filtered.filter(record => record.store_name === selectedStore)
    }

    // 担当者フィルター
    if (selectedStaff) {
      filtered = filtered.filter(record => record.photographer === selectedStaff)
    }

    // 検索クエリ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(record =>
        record.property_name.toLowerCase().includes(query) ||
        record.key_holder.toLowerCase().includes(query) ||
        record.photographer.toLowerCase().includes(query) ||
        record.room_number.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [keyRecords, selectedStore, selectedStaff, searchQuery])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // キャッシュをクリアして新しいデータを取得
    localStorage.removeItem('shootingRecords')
    localStorage.removeItem('keyRecords')
    localStorage.removeItem('recordsFilterOptions')
    
    try {
      await initializeData()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTabChange = (tab: 'map' | 'store' | 'list' | 'chat' | 'mypage') => {
    if (tab === 'map') {
      router.push('/map')
    } else if (tab === 'store') {
      router.push('/store')
    } else if (tab === 'chat') {
      router.push('/chat')
    } else if (tab === 'mypage') {
      router.push('/mypage')
    } else if (tab === 'list') {
      // Already on list page
    } else {
      console.log(`${tab} page is not implemented yet`)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ja-JP', {
        month: '2-digit',
        day: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const clearFilters = () => {
    setSelectedStore('')
    setSelectedStaff('')
  }

  const handleToggleListType = () => {
    setListType(listType === 'shooting' ? 'keys' : 'shooting')
  }

  const getCurrentRecords = () => {
    return listType === 'shooting' ? filteredRecords : filteredKeyRecords
  }

  const getCurrentListTitle = () => {
    return listType === 'shooting' ? '撮影完了リスト' : '鍵未返却リスト'
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
      <ModernHeader 
        onSearch={handleSearch}
        onToggleFilter={handleToggleListType}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        searchQuery={searchQuery}
        isFilterOn={listType === 'keys'}
      />
      
      <div className="flex-1 container mx-auto px-6 py-2">
        {isLoading ? (
          // スケルトンローディング表示
          <RecordsSkeleton />
        ) : (
          /* 統合コンポーネント - 囲み線削除 */
          <div className="space-y-2">
            {/* セクション2: フィルター（店舗・担当者のみ） */}
            <div className="py-2">
              {/* 店舗・担当者選択 */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">店舗</label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="">全店舗</option>
                    {filterOptions.stores.map(store => (
                      <option key={store} value={store}>{store}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">担当者</label>
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="">全担当者</option>
                    {filterOptions.staff.map(staff => (
                      <option key={staff.id} value={staff.name}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto px-2 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-all duration-150 focus:ring-0 focus:outline-none"
                  >
                    クリア
                  </Button>
                </div>
              </div>
            </div>

            {/* セクション3: エラー表示 */}
            {error && (
              <div className="bg-red-50 rounded-xl p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-red-700 font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* セクション5: 空状態表示 */}
            {getCurrentRecords().length === 0 && !error && (
              <div>
                {/* 固定ヘッダー（0件の時も表示） */}
                <div className="sticky top-16 z-10 bg-gray-50 px-0 py-1 mb-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-700">{getCurrentListTitle()}</h3>
                    <div className="text-xs font-bold text-gray-600">
                      総件数: <span className="text-sm font-medium text-red-600">0</span>件
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-8 text-center border-t border-b border-gray-300">
                  <div className="text-gray-500 text-base">
                    {listType === 'shooting' ? '本日の撮影実績がありません。' : '鍵未返却の物件がありません。'}
                  </div>
                </div>
              </div>
            )}

            {/* セクション6: リスト表示 */}
            {getCurrentRecords().length > 0 && !error && (
              <div>
                {/* 固定ヘッダー */}
                <div className="sticky top-16 z-10 bg-gray-50 px-0 py-1 mb-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-700">{getCurrentListTitle()}</h3>
                    <div className="text-xs font-bold text-gray-600">
                      総件数: <span className="text-sm font-medium text-red-600">{getCurrentRecords().length}</span>件
                    </div>
                  </div>
                </div>
                
                {/* スクロール可能なリスト */}
                <div className="divide-y divide-gray-300 max-h-96 overflow-y-auto border-t border-b border-gray-300">
                  {listType === 'shooting' ? (
                    // 撮影完了リスト
                    filteredRecords.map((record, index) => (
                      <div 
                        key={record.id} 
                        className="py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center text-sm">
                          <div className="w-16 text-gray-700 font-medium">
                            {formatDate(record.shooting_datetime)}
                          </div>
                          <div className="flex-1 text-gray-900 truncate pr-2">
                            {record.property_name}
                          </div>
                          <div className="w-12 text-gray-600 text-center">
                            {record.room_number || '-'}
                          </div>
                          <div className="w-16 text-gray-600 text-right">
                            {record.photographer}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // 鍵未返却リスト
                    filteredKeyRecords.map((record, index) => (
                      <div 
                        key={record.id} 
                        className="py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center text-sm">
                          <div className="flex-1 text-gray-900 truncate pr-2">
                            {record.key_holder}
                          </div>
                          <div className="flex-1 text-gray-900 truncate pr-2">
                            {record.property_name}
                          </div>
                          <div className="w-10 text-gray-600 text-right text-xs">
                            {record.room_number || '-'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ModernFooter 
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  )
} 