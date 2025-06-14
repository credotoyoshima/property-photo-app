'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUpload } from '@/contexts/UploadContext'

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
  const { user } = useAuth()
  // State管理
  const [isStreaming, setIsStreaming] = useState(false)
  // Mounted guard to avoid SSR document access
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([])
  const [currentView, setCurrentView] = useState<'camera' | 'gallery'>('camera')
  const [selectedCount, setSelectedCount] = useState(0)
  const { isUploading, uploadProgress, setUploading, setProgress } = useUpload()
  // シャッターフラッシュ用ステート
  const [isFlashing, setIsFlashing] = useState(false)
  // フロント/バックカメラ切替用ステート
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  // 画面向き検出用ステート
  const [isLandscape, setIsLandscape] = useState(false)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 利用可能なビデオ入力デバイスのリスト
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  // 初期動作の完了フラグ（enumerateDevices 後に true になる）
  const hasInitializedRef = useRef(false)

  // 選択中のデバイスID（標準カメラ or 広角）
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  // Define environmentDevices and regexes for camera selection
  const backRegex = /back|rear|environment|後置|背面|wide|ultra|広角|ウルトラ/i
  const frontRegex = /front|user|前置/i
  const environmentDevices = videoDevices.filter(device => backRegex.test(device.label))

  // カメラストリーム開始
  const startCamera = async () => {
    try {
      // カメラ設定（デバイス指定 or フェイシングモード切替、高解像度）
      let videoConstraints: MediaTrackConstraints = {
        aspectRatio: 4/3,
        width: { ideal: 1920 },
        height: { ideal: 1440 },
      }
      if (selectedDeviceId) {
        // 選択されたデバイス（0.5×/1.0×）を優先して指定
        videoConstraints.deviceId = { exact: selectedDeviceId }
      } else {
        // デバイス未選択時は facingMode で背面/前面を指定
        videoConstraints.facingMode = facingMode
      }
      const constraints: MediaStreamConstraints = { video: videoConstraints }
      console.log('[CameraModal] getUserMedia constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

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

  // モーダルオープン時にカメラ許可をリクエストし、許可後にデバイスを列挙
  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(tempStream => {
          // 許可用ストリームは即停止
          tempStream.getTracks().forEach(track => track.stop())
          return navigator.mediaDevices.enumerateDevices()
        })
        .then(devices => {
          const videoInputs = devices.filter(d => d.kind === 'videoinput')
          // ラベルに基づき、バックカメラを最優先、それ以外を後回しにソート
          const sortedInputs = [...videoInputs].sort((a, b) => {
            const labelA = a.label
            const labelB = b.label
            const score = (label: string) => {
              if (backRegex.test(label)) return 0
              if (frontRegex.test(label)) return 1
              return 2
            }
            return score(labelA) - score(labelB)
          })
          setVideoDevices(sortedInputs)
          // 最初はバックカメラを選択
          if (sortedInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(sortedInputs[0].deviceId)
          }
          // 初期 enumerate 完了
          hasInitializedRef.current = true
        })
        .catch(error => {
          console.warn('デバイス取得エラー:', error)
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

  // facingMode変更時にカメラを再起動（初期起動後のみ）
  useEffect(() => {
    if (isOpen && hasInitializedRef.current) {
      stopCamera()
      startCamera()
    }
  }, [facingMode, isOpen])

  // カメラストリーム停止
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setIsStreaming(false)
    }
    // video要素のストリーム参照を解除
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // コンポーネントアンマウント時にもカメラ停止
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // モーダルが閉じられた（isOpen が false）ときにもカメラストリームを停止
  useEffect(() => {
    if (!isOpen) {
      stopCamera()
    }
  }, [isOpen])

  // 写真撮影
  const capturePhoto = () => {
    // フラッシュアニメーション
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 200)
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // iPhoneなどの高解像度を抑制（最大1440pxまでリサイズ）
    const MAX_SIDE = 1440
    let w = video.videoWidth
    let h = video.videoHeight
    if (Math.max(w, h) > MAX_SIDE) {
      const scale = MAX_SIDE / Math.max(w, h)
      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }
    canvas.width = w
    canvas.height = h
    ctx.drawImage(video, 0, 0, w, h)

    // Data URLとして取得（JPEG品質を0.85に設定してサイズを抑制）
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

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
      const newArr = prev.filter(p => p.id !== photoId)
      // 選択中カウントを再計算
      setSelectedCount(newArr.filter(p => p.selected).length)
      return newArr
    })
  }

  // 選択された写真を保存
  const handleSave = async () => {
    const selectedPhotos = capturedPhotos.filter(photo => photo.selected)
    if (selectedPhotos.length === 0) {
      alert('保存する写真を選択してください。')
      return
    }

    setUploading(true)
    setProgress({ current: 0, total: selectedPhotos.length })

    try {
      // 選択された写真を1枚ずつ送信し進捗を更新
      for (let i = 0; i < selectedPhotos.length; i++) {
        const photo = selectedPhotos[i]
        const response = await fetch('/api/upload-photos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            propertyId: property.id,
            propertyName: property.property_name,
            roomNumber: property.room_number,
            photos: [{ dataUrl: photo.dataUrl, timestamp: photo.timestamp.toISOString() }],
            updatedBy: user?.name || 'システム'
          })
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `写真${i + 1}のアップロードに失敗しました`)
        }
        // 進捗更新
        setProgress({ current: i + 1, total: selectedPhotos.length })
      }
      // すべての送信完了
      alert(`${property.property_name} ${property.room_number}\n${selectedPhotos.length}枚の写真をアップロードしました。`)
      // 物件ステータスを更新（親コンポーネントに通知）
      if (onStatusUpdate) {
        onStatusUpdate({
          ...property,
          status: '撮影済',
          shooting_datetime: new Date().toISOString(),
          updated_by: user?.name || 'システム'
        })
      }
      handleClose()
    } catch (error) {
      console.error('保存エラー:', error)
      alert(`写真の保存に失敗しました。\n\nエラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    } finally {
      setUploading(false)
      setProgress(null)
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

  // 画面向きイベント監視
  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)')
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches)
    mql.addEventListener('change', handler)
    setIsLandscape(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // 写真配列が変化したら選択数を再計算
  useEffect(() => {
    setSelectedCount(capturedPhotos.filter(photo => photo.selected).length)
  }, [capturedPhotos])

  if (!isOpen || !mounted) return null

  // モーダルを body にポータル化してフッターより前面に表示
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-gray-50 flex flex-col">
      {/* シャッターフラッシュオーバーレイ */}
      <div className={`absolute inset-0 bg-white z-10 pointer-events-none transition-opacity duration-200 ${isFlashing ? 'opacity-100' : 'opacity-0'}`} />
      {/* カメラビューボタンバー */}
      {currentView === 'camera' && (
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center gap-1 z-20">
        <button onClick={handleClose} className="h-8 px-2 bg-black/70 text-white rounded-lg flex items-center justify-center text-xl">×</button>
        {/* フロント/バック切替 */}
        <button
          onClick={() => {
            // デバイス指定モードを解除して必ず facingMode を適用
            setSelectedDeviceId(null)
            setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
          }}
          className="h-8 px-2 bg-black/70 text-white rounded-lg flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline strokeLinecap="round" strokeLinejoin="round" points="23 4 23 10 17 10" />
            <polyline strokeLinecap="round" strokeLinejoin="round" points="1 20 1 14 7 14" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.51 9a9 9 0 0114.13-3.36L23 10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 15a9 9 0 01-14.13 3.36L1 14" />
          </svg>
        </button>
        {environmentDevices.length > 1 && (
          <div className="flex space-x-1 items-center">
            <button
              onClick={() => setSelectedDeviceId(environmentDevices[1].deviceId)}
              className={`h-8 px-2 bg-black/70 rounded-lg flex items-center justify-center ${selectedDeviceId === environmentDevices[1].deviceId ? 'text-yellow-400 text-sm' : 'text-white text-xs'}`}
            >0.5×</button>
            <button
              onClick={() => setSelectedDeviceId(environmentDevices[0].deviceId)}
              className={`h-8 px-2 bg-black/70 rounded-lg flex items-center justify-center ${selectedDeviceId === environmentDevices[0].deviceId ? 'text-yellow-400 text-sm' : 'text-white text-xs'}`}
            >1.0×</button>
          </div>
        )}
        <button onClick={() => setCurrentView('gallery')} className="h-8 px-3 bg-black/70 text-white rounded-lg flex items-center justify-center text-sm">
          ギャラリー ({capturedPhotos.length})
        </button>
      </div>
      )}
      {currentView === 'camera' ? (
        <>
          {/* ビューファインダー */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover pointer-events-none"
          />
          <canvas ref={canvasRef} className="hidden" />
          {/* シャッターボタン */}
          <button
            onClick={capturePhoto}
            className={`${isLandscape
              ? 'absolute top-1/2 right-4 transform -translate-y-1/2'
              : 'absolute bottom-6 left-1/2 transform -translate-x-1/2'
            } w-12 h-12 bg-white rounded-full flex items-center justify-center`}
          >
            <div className="w-10 h-10 border-2 border-black/70 rounded-full"></div>
          </button>
        </>
      ) : (
        // ギャラリービュー (flex layout)
        <div className="absolute inset-0 flex flex-col">
          {/* ギャラリーヘッダー */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200/50 h-16 pl-4 pr-2 flex items-center justify-between">
            <div className="text-gray-800 text-lg font-semibold">{property.property_name} {property.room_number}</div>
            <div className="flex items-center">
              {/* 戻るアイコン */}
              <button
                onClick={() => setCurrentView('camera')}
                aria-label="戻る"
                className="p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7l-7 7" />
                </svg>
              </button>
            </div>
          </div>
          {/* アップロード進捗表示 */}
          {isUploading && uploadProgress && (
            <div className="px-4 py-2 bg-primary text-primary-foreground text-center text-sm font-medium z-20">
              アップロード中… {uploadProgress.current}/{uploadProgress.total}
            </div>
          )}
          {/* ギャラリーグリッドまたは空状態 */}
          {(!isUploading && capturedPhotos.length === 0) ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">写真がまだありません</p>
              <p className="text-gray-400 text-sm">撮影を開始してください</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto px-2 grid grid-cols-3 gap-2 content-start mt-2">
              {capturedPhotos.map(photo => (
                <div key={photo.id} className="relative aspect-square">
                  <img src={photo.dataUrl} className="w-full h-full object-cover rounded" />
                  <button onClick={() => deletePhoto(photo.id)} className="absolute top-1 right-1 p-1 bg-white/50 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <input type="checkbox" checked={photo.selected} onChange={() => togglePhotoSelection(photo.id)} className="absolute top-1 left-1 w-5 h-5" />
                </div>
              ))}
            </div>
          )}
          {/* ギャラリーフッター */}
          <div className="bg-white border-t shadow-lg flex-shrink-0 h-20 flex items-center justify-between px-4">
            <div className="text-gray-800 text-lg">選択中: {selectedCount} / {capturedPhotos.length}</div>
            <div className="flex items-center space-x-2">
              {/* 全選択 */}
              <button onClick={() => { setCapturedPhotos(prev => prev.map(p => ({ ...p, selected: true }))); setSelectedCount(capturedPhotos.length); }} className="h-10 px-4 bg-gray-300 text-black rounded-lg text-sm">全選択</button>
              {/* Google Drive保存 */}
              <button onClick={handleSave} disabled={selectedCount === 0 || isUploading} className="h-10 px-4 bg-[#003D75] text-white rounded-lg text-sm disabled:opacity-50">Driveへ保存</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
} 