'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface ContinuousCameraProps {
  propertyName: string
  roomNumber: string
  onClose: () => void
  onPhotoUploaded: (result: { fileName: string; folderName: string }) => void
}

export function ContinuousCamera({ 
  propertyName, 
  roomNumber, 
  onClose, 
  onPhotoUploaded 
}: ContinuousCameraProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)
  const [uploadResults, setUploadResults] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTakePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('propertyName', propertyName)
      formData.append('roomNumber', roomNumber)
      formData.append('photoIndex', (photoCount + 1).toString())

      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('アップロードに失敗しました')
      }

      const result = await response.json()
      
      if (result.success) {
        const newCount = photoCount + 1
        setPhotoCount(newCount)
        setUploadResults(prev => [...prev, result.fileName])
        onPhotoUploaded(result)
        
        // 成功メッセージを表示
        const message = `写真 ${newCount}/50 をGoogle Driveにアップロードしました`
        // toast や alert の代わりに簡単な通知
        console.log(message)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('写真のアップロードに失敗しました')
    } finally {
      setIsUploading(false)
      // ファイル入力をリセットして同じファイルでも再選択できるようにする
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-2">連続撮影モード</h2>
          <p className="text-gray-600 mb-2">
            {propertyName} {roomNumber}
          </p>
          <p className="text-sm text-gray-500">
            撮影済み: {photoCount}/50枚
          </p>
        </div>

        {/* 隠されたファイル入力 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="space-y-4">
          {/* 撮影ボタン */}
          <Button
            onClick={handleTakePhoto}
            disabled={isUploading}
            className="w-full py-4 text-lg"
            size="lg"
          >
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>アップロード中...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>📷</span>
                <span>写真を撮影</span>
              </div>
            )}
          </Button>

          {/* 進捗表示 */}
          {photoCount > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">撮影進捗</span>
                <span className="text-sm text-gray-600">{photoCount}/50</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((photoCount / 50) * 100, 100)}%` }}
                ></div>
              </div>
              {photoCount >= 50 && (
                <p className="text-green-600 text-sm mt-2 font-medium">
                  ✅ 推奨撮影枚数に達しました！
                </p>
              )}
            </div>
          )}

          {/* 最近のアップロード結果 */}
          {uploadResults.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm font-medium text-green-800 mb-1">
                最新のアップロード:
              </p>
              <p className="text-xs text-green-600">
                {uploadResults[uploadResults.length - 1]}
              </p>
            </div>
          )}

          {/* 終了ボタン */}
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
            disabled={isUploading}
          >
            撮影終了
          </Button>

          {/* 説明文 */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>• 撮影した写真は自動的にGoogle Driveに保存されます</p>
            <p>• 推奨撮影枚数は40-50枚です</p>
            <p>• 撮影後すぐに次の写真を撮影できます</p>
          </div>
        </div>
      </div>
    </div>
  )
} 