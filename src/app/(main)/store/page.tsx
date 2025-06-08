'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ModernHeader from '@/components/ModernHeader'
import ModernFooter from '@/components/ModernFooter'
import StoreGoogleMap from '@/components/StoreGoogleMap'
import { AuthGuard } from '@/components/AuthGuard'

// Key Agent interface based on key_agents database diagram
interface KeyAgent {
  phone_number: string // Primary key
  agent_name: string
  address: string
  latitude: number
  longitude: number
  created_at: string
  updated_at: string
}

// Property interface for key management
interface Property {
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

export default function StorePage() {
  const [keyAgents, setKeyAgents] = useState<KeyAgent[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgentPhone, setSelectedAgentPhone] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'map' | 'store' | 'list' | 'chat' | 'mypage'>('store')
  const [isFilterOn, setIsFilterOn] = useState(false) // 鍵ステータスフィルター

  const router = useRouter()

  // データ取得
  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // 業者データと物件データを並列で取得
      const [agentsResponse, propertiesResponse] = await Promise.all([
        fetch('/api/key-agents'),
        fetch('/api/properties')
      ])

      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        setKeyAgents(agentsData)
      }

      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json()
        // API レスポンスが {properties: [...]} 形式の場合に対応
        const allProperties = propertiesData.properties || propertiesData
        // 鍵管理情報がある物件のみフィルタリング
        const keyManagedProperties = allProperties.filter((p: Property) => p.key_agent_phone)
        setProperties(keyManagedProperties)
      }
    } catch (error) {
      console.error('Error fetching store data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 初期データ読み込み
  useEffect(() => {
    fetchData()
  }, [])

  // URL クエリパラメータから選択された業者を取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const selectedAgent = urlParams.get('selected_agent')
      if (selectedAgent) {
        setSelectedAgentPhone(decodeURIComponent(selectedAgent))
        // URLのクエリパラメータをクリア（必要に応じて）
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  // 検索処理
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // データ更新処理
  const handleDataUpdate = useCallback((updatedProperty: Property) => {
    setProperties(prev => 
      prev.map(p => p.id === updatedProperty.id ? updatedProperty : p)
    )
  }, [])

  // 検索によるフィルタリング
  const filteredAgents = keyAgents.filter(agent => {
    // 検索クエリによるフィルタリング
    let matchesSearch = true
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const agentMatch = agent.agent_name.toLowerCase().includes(query)
      
      // この業者が管理している物件名でも検索
      const managedProperties = properties.filter(p => p.key_agent_phone === agent.phone_number)
      const propertyMatch = managedProperties.some(p => 
        p.property_name.toLowerCase().includes(query)
      )
      
      matchesSearch = agentMatch || propertyMatch
    }

    // 鍵ステータスフィルターによるフィルタリング
    let matchesKeyFilter = true
    if (isFilterOn) {
      // 借用中の物件がある業者のみ表示
      const hasRentedKeys = properties.some(p => 
        p.key_agent_phone === agent.phone_number && p.key_rental_status === 'rented'
      )
      matchesKeyFilter = hasRentedKeys
    }
    
    return matchesSearch && matchesKeyFilter
  })

  // タブ変更ハンドラー
  const handleTabChange = useCallback((tab: 'map' | 'store' | 'list' | 'chat' | 'mypage') => {
    if (tab === 'map') {
      router.push('/map')
    } else if (tab === 'list') {
      router.push('/records')
    } else if (tab === 'chat') {
      router.push('/chat')
    } else if (tab === 'mypage') {
      router.push('/mypage')
    } else if (tab === 'store') {
      // Already on store page
    } else {
      // Other tabs not implemented yet
      console.log(`${tab} page is not implemented yet`)
    }
  }, [router])

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-gray-50">
        <ModernHeader 
          onSearch={handleSearch}
          searchQuery={searchQuery}
          onRefresh={fetchData}
          isRefreshing={isLoading}
          onToggleFilter={() => setIsFilterOn(prev => !prev)}
          isFilterOn={isFilterOn}
        />
        
        <main className="flex-1 relative pb-20">
          <StoreGoogleMap
            keyAgents={filteredAgents}
            properties={properties}
            selectedAgentPhone={selectedAgentPhone}
            onAgentSelect={setSelectedAgentPhone}
            onPropertyUpdate={handleDataUpdate}
            className="w-full h-full"
          />
        </main>
        
        <ModernFooter 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    </AuthGuard>
  )
} 