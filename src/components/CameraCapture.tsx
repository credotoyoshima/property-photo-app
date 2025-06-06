'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { uploadMultipleImagesToDrive } from '@/lib/googleDrive'

interface CameraCaptureProps {
  propertyName: string
  roomNumber: string
  photographerName: string
  onUploadComplete: (summary: { total: number, success: number, failed: number }) => void
  onClose: () => void
}

interface CapturedImage {
  file: File
  preview: string
  timestamp: Date
  gpsLocation?: { latitude: number, longitude: number }
}

export default function CameraCapture({
  propertyName,
  roomNumber,
  photographerName,
  onUploadComplete,
  onClose
}: CameraCaptureProps) {
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number, longitude: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // GPS位置情報を取得
  const getCurrentLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          console.log('GPS位置情報を取得しました:', position.coords)
        },
        (error) => {
          console.warn('GPS位置情報の取得に失敗:', error)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  // 初期化時にGPS位置情報を取得
  useState(() => {
    getCurrentLocation()
  })

  // 写真撮影処理
  const handleCapture = useCallback(() => {
    if (!fileInputRef.current) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.multiple = false

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        // プレビュー用のURLを作成
        const preview = URL.createObjectURL(file)
        
        // 撮影画像を配列に追加
        const newImage: CapturedImage = {
          file,
          preview,
          timestamp: new Date(),
          gpsLocation: gpsLocation || undefined,
        }

        setCapturedImages(prev => [...prev, newImage])
        console.log(`撮影完了: ${capturedImages.length + 1}枚目`)
        
                 // 連続撮影は手動で行う（自動連続撮影は削除）
         // ユーザーが手動で「写真を撮影」ボタンを押すパターンに変更
      } catch (error) {
        console.error('撮影処理でエラーが発生:', error)
        alert('撮影に失敗しました。もう一度お試しください。')
      }
    }

    input.click()
  }, [capturedImages.length, gpsLocation])

  // 撮影画像を削除
  const handleRemoveImage = useCallback((index: number) => {
    setCapturedImages(prev => {
      const newImages = [...prev]
      // プレビューURLを解放
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }, [])

  // 全ての画像をGoogle Driveにアップロード
  const handleUploadAll = useCallback(async () => {
    if (capturedImages.length === 0) {
      alert('撮影された画像がありません。')
      return
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: capturedImages.length })

    try {
      const files = capturedImages.map(img => img.file)
      
      // バッチアップロード実行
      const result = await uploadMultipleImagesToDrive(
        files,
        propertyName,
        roomNumber,
        photographerName,
        gpsLocation || undefined
      )

      // アップロード完了の通知
      onUploadComplete(result.summary)

      // 成功時は画像をクリア
      if (result.summary.success > 0) {
        setCapturedImages(prev => {
          // プレビューURLを全て解放
          prev.forEach(img => URL.revokeObjectURL(img.preview))
          return []
        })
      }

      // 結果を表示
      if (result.summary.failed > 0) {
        alert(`アップロード完了: 成功 ${result.summary.success}件、失敗 ${result.summary.failed}件`)
      } else {
        alert(`${result.summary.success}枚の画像をアップロードしました！`)
      }

    } catch (error) {
      console.error('アップロードに失敗:', error)
      alert('画像のアップロードに失敗しました。ネットワーク接続を確認してください。')
    } finally {
      setIsUploading(false)
      setUploadProgress({ current: 0, total: 0 })
    }
  }, [capturedImages, propertyName, roomNumber, photographerName, gpsLocation, onUploadComplete])

  // 全ての画像を削除
  const handleClearAll = useCallback(() => {
    if (capturedImages.length === 0) return

    if (confirm(`撮影済みの${capturedImages.length}枚の画像を全て削除しますか？`)) {
      setCapturedImages(prev => {
        // プレビューURLを全て解放
        prev.forEach(img => URL.revokeObjectURL(img.preview))
        return []
      })
    }
  }, [capturedImages.length])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">📷 物件撮影</h2>
              <p className="text-blue-100">{propertyName} {roomNumber}</p>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-white hover:bg-blue-700"
              disabled={isUploading}
            >
              ✕
            </Button>
          </div>
        </div>

        {/* 撮影状況 */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">撮影済み: {capturedImages.length}枚</span>
            <span className="text-sm text-gray-600">
              推奨: 40-50枚 {gpsLocation ? '📍GPS取得済み' : '📍GPS未取得'}
            </span>
          </div>
          
          {/* 進捗バー */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((capturedImages.length / 50) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* アップロード進捗 */}
        {isUploading && (
          <div className="p-4 bg-yellow-50 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">アップロード中...</span>
              <span className="text-sm">{uploadProgress.current}/{uploadProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: uploadProgress.total > 0 
                    ? `${(uploadProgress.current / uploadProgress.total) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
          </div>
        )}

        {/* 画像一覧 */}
        <div className="p-4 flex-1 overflow-y-auto max-h-96">
          {capturedImages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📷</div>
              <p>まだ画像が撮影されていません</p>
              <p className="text-sm mt-2">「写真を撮影」ボタンをタップして撮影を開始してください</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {capturedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.preview}
                    alt={`撮影画像 ${index + 1}`}
                    className="w-full h-16 object-cover rounded border-2 border-gray-200"
                  />
                  <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs px-1 rounded-br">
                    {index + 1}
                  </div>
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isUploading}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 操作ボタン */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={handleCapture}
              disabled={isUploading}
              className="w-full"
            >
              📷 写真を撮影
            </Button>
            
            <Button
              onClick={handleUploadAll}
              disabled={capturedImages.length === 0 || isUploading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isUploading ? '📤 アップロード中...' : `📤 ${capturedImages.length}枚をアップロード`}
            </Button>
            
            <Button
              onClick={handleClearAll}
              variant="outline"
              disabled={capturedImages.length === 0 || isUploading}
              className="w-full"
            >
              🗑️ 全て削除
            </Button>
            
            <Button
              onClick={getCurrentLocation}
              variant="outline"
              disabled={isUploading}
              className="w-full"
            >
              {gpsLocation ? '📍 GPS更新' : '📍 GPS取得'}
            </Button>
          </div>
          
          {/* 撮影のヒント */}
          <div className="mt-3 text-xs text-gray-600 bg-blue-50 p-2 rounded">
            💡 <strong>撮影のコツ:</strong> 部屋全体→細部の順で撮影。十分な明るさを確保し、手ブレに注意してください。
          </div>
        </div>
      </div>

      {/* 隠れたファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={false}
        style={{ display: 'none' }}
      />
    </div>
  )
} 