'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { createPortal } from 'react-dom'

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

interface CapturedPhoto {
  id: string
  dataUrl: string
  timestamp: Date
  selected: boolean
}

interface CameraModalProps {
  property: Property
  isOpen: boolean
  onClose: () => void
  onSave: (photos: CapturedPhoto[]) => Promise<void>
  onStatusUpdate?: (property: Property) => void
}

export default function CameraModal({ property, isOpen, onClose, onSave, onStatusUpdate }: CameraModalProps) {
  // State管理
  const [isStreaming, setIsStreaming] = useState(false)
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([])
  const [currentView, setCurrentView] = useState<'camera' | 'gallery'>('camera')
  const [isUploading, setIsUploading] = useState(false)
  const [selectedCount, setSelectedCount] = useState(0)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 利用可能なビデオ入力デバイスのリスト
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  // 選択中のデバイスID（標準カメラ or 広角）
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  // カメラストリーム開始
  const startCamera = async () => {
    try {
      // カメラストリーム取得: deviceId指定か、なければ背面カメラ(facingMode)でフォールバック
      const videoConstraints: any = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'environment'
      }
      if (selectedDeviceId) {
        videoConstraints.deviceId = { exact: selectedDeviceId }
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsStreaming(true)
      }
    } catch (error) {
      console.error('カメラアクセスエラー:', error)
      alert('カメラにアクセスできません。ブラウザの設定を確認してください。')
    }
  }

  // モーダルオープン時にカメラを開始／停止
  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [isOpen])

  // モーダルオープン時に利用可能なビデオデバイスを取得
  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoInputs = devices.filter(d => d.kind === 'videoinput')
        setVideoDevices(videoInputs)
        // 最初は標準の背面カメラを選択
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId)
        }
      })
    }
  }, [isOpen])

  // 選択デバイス変更時はカメラを再起動
  useEffect(() => {
    if (isOpen && selectedDeviceId) {
      stopCamera()
      startCamera()
    }
  }, [selectedDeviceId, isOpen])

  // カメラストリーム停止
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setIsStreaming(false)
    }
  }

  // 写真撮影
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Canvasにビデオフレームを描画
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    // Data URLとして取得
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    
    const newPhoto: CapturedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataUrl,
      timestamp: new Date(),
      selected: true // デフォルトで選択状態
    }

    setCapturedPhotos(prev => [...prev, newPhoto])
    setSelectedCount(prev => prev + 1)
  }

  // 写真選択状態の切り替え
  const togglePhotoSelection = (photoId: string) => {
    setCapturedPhotos(prev => 
      prev.map(photo => {
        if (photo.id === photoId) {
          const newSelected = !photo.selected
          setSelectedCount(prevCount => newSelected ? prevCount + 1 : prevCount - 1)
          return { ...photo, selected: newSelected }
        }
        return photo
      })
    )
  }

  // 写真削除
  const deletePhoto = (photoId: string) => {
    setCapturedPhotos(prev => {
      const photoToDelete = prev.find(p => p.id === photoId)
      if (photoToDelete?.selected) {
        setSelectedCount(prevCount => prevCount - 1)
      }
      return prev.filter(p => p.id !== photoId)
    })
  }

  // 選択された写真を保存
  const handleSave = async () => {
    const selectedPhotos = capturedPhotos.filter(photo => photo.selected)
    if (selectedPhotos.length === 0) {
      alert('保存する写真を選択してください。')
      return
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: selectedPhotos.length })

    try {
      // APIエンドポイントに写真データを送信
      const response = await fetch('/api/upload-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: property.id,
          propertyName: property.property_name,
          roomNumber: property.room_number,
          photos: selectedPhotos.map(photo => ({
            dataUrl: photo.dataUrl,
            timestamp: photo.timestamp.toISOString()
          }))
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'アップロードに失敗しました')
      }

      const result = await response.json()
      
      if (result.success) {
        // 成功メッセージを表示
        alert(`${property.property_name} ${property.room_number}\n保存完了しました。`)
        
        // 物件ステータスを更新（親コンポーネントに通知）
        if (onStatusUpdate) {
          onStatusUpdate({
            ...property,
            status: '撮影済',
            shooting_datetime: new Date().toISOString(),
            updated_by: 'カメラアプリ'
          })
        }
        
        handleClose()
      } else {
        throw new Error(result.error || 'アップロードに失敗しました')
      }
    } catch (error) {
      console.error('保存エラー:', error)
      alert(`写真の保存に失敗しました。\n\nエラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  // モーダルを閉じる
  const handleClose = () => {
    stopCamera()
    setCapturedPhotos([])
    setSelectedCount(0)
    setCurrentView('camera')
    onClose()
  }

  // currentViewが'camera'に戻ったとき、既存のストリームを再度videoにセット
  useEffect(() => {
    if (currentView === 'camera' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [currentView])

  if (!isOpen) return null

  // モーダルを body にポータル化してフッターより前面に表示
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 text-white">
          <div>
            <h2 className="text-lg font-semibold">
              {property.property_name} {property.room_number}
            </h2>
            <p className="text-sm opacity-80">
              撮影済み: {capturedPhotos.length}枚 | 選択中: {selectedCount}枚
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="absolute top-16 left-0 right-0 z-10">
        <div className="flex bg-black/30 backdrop-blur-sm">
          <button
            onClick={() => setCurrentView('camera')}
            className={`flex-1 py-3 text-center text-white font-medium ${
              currentView === 'camera' ? 'bg-blue-600' : 'hover:bg-white/10'
            } transition-colors`}
          >
            📷 カメラ
          </button>
          <button
            onClick={() => setCurrentView('gallery')}
            className={`flex-1 py-3 text-center text-white font-medium ${
              currentView === 'gallery' ? 'bg-blue-600' : 'hover:bg-white/10'
            } transition-colors`}
          >
            🖼️ ギャラリー ({capturedPhotos.length})
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="pt-28 pb-24 h-full">
        {currentView === 'camera' ? (
          // カメラビュー
          <div className="relative h-full">
            {/* カメラデバイス選択ボタン（複数カメラ対応: 標準/広角切り替え） */}
            {videoDevices.length > 1 && (
              <div className="absolute top-4 right-4 z-20 flex space-x-2">
                {videoDevices.map((device, idx) => (
                  <button
                    key={device.deviceId}
                    onClick={() => setSelectedDeviceId(device.deviceId)}
                    className={`px-2 py-1 text-xs rounded ${
                      selectedDeviceId === device.deviceId
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/30 text-black'
                    }`}
                  >
                    {device.label || `カメラ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* 撮影ボタン */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <button
                onClick={capturePhoto}
                disabled={!isStreaming}
                className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 hover:border-blue-500 disabled:opacity-50 transition-colors shadow-lg active:scale-95"
              >
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <div className="w-16 h-16 bg-red-500 rounded-full"></div>
                </div>
              </button>
            </div>

            {/* 連続撮影モード表示 */}
            {capturedPhotos.length > 0 && (
              <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                連続撮影モード: {capturedPhotos.length}/40
              </div>
            )}
          </div>
        ) : (
          // ギャラリービュー
          <div className="h-full overflow-y-auto p-4">
            {capturedPhotos.length === 0 ? (
              <div className="flex items-center justify-center h-full text-white text-center">
                <div>
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg mb-2">まだ写真がありません</p>
                  <p className="text-sm opacity-80">カメラタブで撮影を開始してください</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 写真グリッド */}
                <div className="grid grid-cols-3 gap-2">
                  {capturedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`relative aspect-square rounded-lg overflow-hidden ${
                        photo.selected ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`撮影写真 ${photo.timestamp.toLocaleTimeString()}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => togglePhotoSelection(photo.id)}
                      />
                      
                      {/* 選択チェックボックス */}
                      <div className="absolute top-2 right-2">
                        <input
                          type="checkbox"
                          checked={photo.selected}
                          onChange={() => togglePhotoSelection(photo.id)}
                          className="w-5 h-5 rounded"
                        />
                      </div>

                      {/* 削除ボタン */}
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      {/* タイムスタンプ */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                        {photo.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* フッターアクション */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="text-white border-white hover:bg-white/10"
          >
            キャンセル
          </Button>
          
          <div className="flex space-x-3">
            {currentView === 'gallery' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapturedPhotos(prev => {
                      const newPhotos = prev.map(photo => ({ ...photo, selected: true }))
                      setSelectedCount(newPhotos.length)
                      return newPhotos
                    })
                  }}
                  className="text-white border-white hover:bg-white/10"
                >
                  全選択
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={selectedCount === 0 || isUploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isUploading 
                    ? (uploadProgress 
                        ? `アップロード中... (${uploadProgress.current}/${uploadProgress.total})` 
                        : '保存中...'
                      )
                    : `Google Driveに保存 (${selectedCount}枚)`
                  }
                </Button>
              </>
            )}
            
            {currentView === 'camera' && capturedPhotos.length > 0 && (
              <Button
                onClick={() => setCurrentView('gallery')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                写真確認 ({capturedPhotos.length}枚)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
} 