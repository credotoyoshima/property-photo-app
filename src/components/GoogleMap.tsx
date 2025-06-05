'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { MAP_CONFIG } from '@/lib/utils/constants'

interface Property {
  id: number
  property_name: string
  room_number: string
  address: string
  latitude: number
  longitude: number
  status: string
}

interface GoogleMapProps {
  properties: Property[]
  selectedPropertyId?: number | null
  onPropertySelect?: (propertyId: number) => void
  className?: string
}

export default function GoogleMap({ 
  properties, 
  selectedPropertyId, 
  onPropertySelect,
  className = '' 
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

        // デモ用のダミーキーをチェック
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
            }
          ]
        })

        setMap(mapInstance)
        setIsLoading(false)
      } catch (err) {
        console.error('Google Maps初期化エラー:', err)
        setError('Google Mapsの読み込みに失敗しました')
        setIsLoading(false)
      }
    }

    initMap()
  }, [])

  // マーカーの作成・更新
  useEffect(() => {
    if (!map || !window.google) return

    // 既存のマーカーをクリア
    markers.forEach(marker => marker.setMap(null))

    const newMarkers: google.maps.Marker[] = []

    properties.forEach(property => {
      const marker = new google.maps.Marker({
        position: { lat: property.latitude, lng: property.longitude },
        map,
        title: `${property.property_name} ${property.room_number}`,
        icon: {
          url: property.status === '未撮影' 
            ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">!</text>
              </svg>
            `)
            : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#22c55e" stroke="#ffffff" stroke-width="2"/>
                <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
              </svg>
            `),
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12)
        }
      })

      // マーカークリックイベント
      marker.addListener('click', () => {
        if (onPropertySelect) {
          onPropertySelect(property.id)
        }
      })

      // 情報ウィンドウ
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
              ${property.property_name}
            </h3>
            <p style="margin: 0 0 4px 0; color: #666;">
              部屋番号: ${property.room_number}
            </p>
            <p style="margin: 0 0 8px 0; color: #666;">
              ${property.address}
            </p>
            <span style="
              display: inline-block;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              color: white;
              background-color: ${property.status === '未撮影' ? '#ef4444' : '#22c55e'};
            ">
              ${property.status}
            </span>
          </div>
        `
      })

      marker.addListener('click', () => {
        infoWindow.open(map, marker)
      })

      newMarkers.push(marker)
    })

    setMarkers(newMarkers)

    // 地図の表示範囲を調整
    if (properties.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      properties.forEach(property => {
        bounds.extend({ lat: property.latitude, lng: property.longitude })
      })
      map.fitBounds(bounds)
      
      // ズームレベルが高すぎる場合は調整
      const listener = google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom()! > 16) map.setZoom(16)
        google.maps.event.removeListener(listener)
      })
    }
  }, [map, properties, onPropertySelect])

  // 選択された物件にフォーカス
  useEffect(() => {
    if (!map || !selectedPropertyId) return

    const selectedProperty = properties.find(p => p.id === selectedPropertyId)
    if (selectedProperty) {
      map.panTo({ lat: selectedProperty.latitude, lng: selectedProperty.longitude })
      map.setZoom(16)
    }
  }, [map, selectedPropertyId, properties])

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Google Maps API設定が必要です</h3>
          <p className="text-red-600 mb-4">{error}</p>
          
          <div className="bg-white rounded-lg p-4 text-left">
            <h4 className="font-semibold text-gray-800 mb-2">設定手順:</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Google Cloud Consoleでプロジェクトを作成</li>
              <li>Maps JavaScript APIを有効化</li>
              <li>APIキーを作成</li>
              <li>プロジェクトルートに.env.localファイルを作成</li>
              <li>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=あなたのAPIキー を追加</li>
            </ol>
          </div>
          
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">デモ表示</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {properties.map(property => (
                <div key={property.id} className="bg-white p-2 rounded border">
                  <div className="font-medium">{property.property_name}</div>
                  <div className="text-gray-600">{property.room_number}</div>
                  <div className={`inline-block px-2 py-1 rounded text-xs ${
                    property.status === '未撮影' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {property.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">地図を読み込み中...</p>
          </div>
        </div>
      )}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
    </div>
  )
} 