'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { MAP_CONFIG } from '@/lib/utils/constants'
import { MapLoading } from '@/components/ui/loading'

// Key Agent interface
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

interface StoreGoogleMapProps {
  keyAgents: KeyAgent[]
  properties: Property[]
  selectedAgentPhone?: string | null
  onAgentSelect?: (agentPhone: string | null) => void
  onPropertyUpdate?: (property: Property) => void
  className?: string
}

interface AgentDetailCardProps {
  agent: KeyAgent
  properties: Property[]
  selectedPropertyIds: number[]
  onClose: () => void
  onPropertyUpdate: (property: Property) => void
  onPropertySelect: (propertyId: number) => void
  onBackToAgent?: () => void
}

// 業者詳細カード
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
  const handleKeyAction = async (property: Property, action: 'rent' | 'return' | 'reset') => {
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

export default function StoreGoogleMap({ 
  keyAgents, 
  properties, 
  selectedAgentPhone, 
  onAgentSelect,
  onPropertyUpdate,
  className = ''
}: StoreGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])
  const [propertyMarkers, setPropertyMarkers] = useState<google.maps.Marker[]>([])
  const [currentLocationMarker, setCurrentLocationMarker] = useState<google.maps.Marker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<KeyAgent | null>(null)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([])

  // 選択された業者の物件を取得
  const selectedAgentProperties = selectedAgent 
    ? properties.filter(p => p.key_agent_phone === selectedAgent.phone_number)
    : []

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
    if (!navigator.geolocation || !true) return // showCurrentLocationはストアページでは常にtrue

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
  }, [])

  // カスタムマーカーアイコンの作成（業者用）
  const createAgentMarkerIcon = useCallback((isSelected: boolean = false) => {
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

  // カスタムマーカーアイコンの作成（物件用・Googleライクな赤ピン）
  const createPropertyMarkerIcon = useCallback(() => {
    const size = 32
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="propertyShadow" x="-25%" y="-15%" width="150%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.4)"/>
            </filter>
            <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#EA4335;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#C5221F;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <!-- ピンの影 -->
          <ellipse cx="16" cy="28" rx="4" ry="1.5" fill="rgba(0,0,0,0.3)"/>
          
          <!-- ピンの本体（Googleライク） -->
          <path d="M16 3C11.58 3 8 6.58 8 11c0 6.5 8 15 8 15s8-8.5 8-15c0-4.42-3.58-8-8-8z" 
                fill="url(#redGradient)" 
                filter="url(#propertyShadow)" 
                stroke="white" 
                stroke-width="1"/>
          
          <!-- 内側の白い円 -->
          <circle cx="16" cy="11" r="3" fill="white"/>
          
          <!-- 中央の赤い点 -->
          <circle cx="16" cy="11" r="1.5" fill="#EA4335"/>
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
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          panControl: false,
          gestureHandling: 'greedy',
          clickableIcons: false,
          disableDoubleClickZoom: false,
          keyboardShortcuts: false,
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
        mapInstance.addListener('click', () => {
          setSelectedAgent(null)
          if (onAgentSelect) {
            onAgentSelect(null)
          }
        })
        
        getCurrentLocation()
      } catch (err) {
        console.error('Google Maps初期化エラー:', err)
        setError('Google Mapsの読み込みに失敗しました')
        setIsLoading(false)
      }
    }

    initMap()
  }, [getCurrentLocation, onAgentSelect])

  // 現在位置マーカーの作成
  useEffect(() => {
    if (!map || !userLocation || !window.google) return

    if (currentLocationMarker) {
      currentLocationMarker.setMap(null)
    }

    const marker = new google.maps.Marker({
      position: userLocation,
      map,
      title: '現在位置',
      icon: createCurrentLocationIcon(),
      zIndex: 500 // 業者マーカーより下に配置
    })

    setCurrentLocationMarker(marker)

    return () => {
      if (marker) {
        marker.setMap(null)
      }
    }
  }, [map, userLocation, createCurrentLocationIcon])

  // 業者マーカーの作成・更新
  useEffect(() => {
    if (!map || !window.google) return

    // 既存のマーカーをクリア
    markers.forEach(marker => marker.setMap(null))

    const newMarkers: google.maps.Marker[] = []

    keyAgents.forEach(agent => {
      const isSelected = agent.phone_number === selectedAgentPhone
      const marker = new google.maps.Marker({
        position: { lat: agent.latitude, lng: agent.longitude },
        map,
        title: agent.agent_name,
        icon: createAgentMarkerIcon(isSelected),
        zIndex: isSelected ? 2000 : 1000,
        animation: null
      })

      // マーカークリックイベント
      marker.addListener('click', (event: google.maps.MapMouseEvent) => {
        // イベント伝播を停止して、地図クリックイベントの発火を防ぐ
        event.stop()
        
        // 小さな遅延で実行することで、地図クリックイベントとの競合を回避
        setTimeout(() => {
          // 即座に選択状態を更新（ダイレクト選択を可能にする）
          setSelectedAgent(agent)
          if (onAgentSelect) {
            onAgentSelect(agent.phone_number)
          }
        }, 10)
      })

      newMarkers.push(marker)
    })

    setMarkers(newMarkers)

    // 初回のみ地図の表示範囲を調整（マーカーが存在しない場合のみ、かつ現在位置が取得できていない場合のみ）
    if (keyAgents.length > 0 && markers.length === 0 && !userLocation) {
      const bounds = new google.maps.LatLngBounds()
      
      // 業者位置を含める
      keyAgents.forEach(agent => {
        bounds.extend({ lat: agent.latitude, lng: agent.longitude })
      })
      
      map.fitBounds(bounds, 50)
      
      // ズームレベルが高すぎる場合は調整（一度だけ）
      const listener = google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom()! > 16) map.setZoom(16)
        google.maps.event.removeListener(listener)
      })
    }
  }, [map, keyAgents, selectedAgentPhone, onAgentSelect, createAgentMarkerIcon, userLocation])

  // 現在位置を中央に配置（業者表示より優先）
  useEffect(() => {
    if (!map || !userLocation) return

    // 固定のズームレベル（業者の有無に関係なく常に同じ）
    const zoomLevel = 15
    
    // 瞬間的に現在位置を中央に配置（アニメーションなし）
    map.setCenter(userLocation)
    map.setZoom(zoomLevel)
  }, [map, userLocation])

  // 選択された業者にフォーカス（ズームレベル16固定）
  useEffect(() => {
    if (!map || !selectedAgentPhone) return

    const selectedAgent = keyAgents.find(agent => agent.phone_number === selectedAgentPhone)
    if (selectedAgent) {
      // ズームレベル16で中央に配置
      map.setCenter({ lat: selectedAgent.latitude, lng: selectedAgent.longitude })
      map.setZoom(16)
    }
  }, [map, selectedAgentPhone, keyAgents])

  // 選択された物件のマーカーを作成・更新
  useEffect(() => {
    if (!map || !window.google) return

    // 既存の物件マーカーをクリア
    propertyMarkers.forEach(marker => marker.setMap(null))

    const newPropertyMarkers: google.maps.Marker[] = []

    // 選択された物件のマーカーを作成
    selectedPropertyIds.forEach(propertyId => {
      const property = properties.find(p => p.id === propertyId)
      if (property) {
        const marker = new google.maps.Marker({
          position: { lat: property.latitude, lng: property.longitude },
          map,
          title: `${property.property_name} ${property.room_number}`,
          icon: createPropertyMarkerIcon(),
          zIndex: 1500, // 業者マーカーより上、現在位置マーカーより下
          animation: null
        })

        newPropertyMarkers.push(marker)
      }
    })

    setPropertyMarkers(newPropertyMarkers)

    return () => {
      newPropertyMarkers.forEach(marker => marker.setMap(null))
    }
  }, [map, selectedPropertyIds, properties, createPropertyMarkerIcon])

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
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && <MapLoading message="地図を読み込み中..." />}
      
      <div 
        ref={mapRef} 
        className={`w-full overflow-hidden shadow-lg transition-all duration-300 ease-in-out ${
          selectedAgent ? 'transform -translate-y-32' : ''
        }`}
        style={{ 
          height: '100%',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
        tabIndex={-1}
      />
      
      {/* 現在位置ボタン */}
      {userLocation && (
        <button
          onClick={() => {
            if (map && userLocation) {
              animateTo(userLocation.lat, userLocation.lng, 15)
            }
          }}
          className={`absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white hover:scale-105 active:scale-95 ${
            selectedAgent ? 'transform -translate-y-32' : ''
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#003D75' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      {/* 業者詳細カード */}
      {selectedAgent && (
        <AgentDetailCard 
          agent={selectedAgent}
          properties={selectedAgentProperties}
          selectedPropertyIds={selectedPropertyIds}
          onClose={() => {
            setSelectedAgent(null)
            if (onAgentSelect) {
              onAgentSelect(null)
            }
          }}
          onPropertyUpdate={onPropertyUpdate || (() => {})}
          onPropertySelect={(propertyId) => {
            setSelectedPropertyIds(prev => 
              prev.includes(propertyId) 
                ? prev.filter(id => id !== propertyId)  // 選択解除
                : [propertyId]  // 新しく選択（他の選択は解除）
            )
          }}
          onBackToAgent={() => {
            if (map && selectedAgent) {
              // 業者位置にズームレベル16で移動
              map.setCenter({ lat: selectedAgent.latitude, lng: selectedAgent.longitude })
              map.setZoom(16)
            }
          }}
        />
      )}
    </div>
  )
} 