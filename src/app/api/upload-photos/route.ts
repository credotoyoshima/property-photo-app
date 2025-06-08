import { NextRequest, NextResponse } from 'next/server'
import { uploadPropertyPhotos, generateFolderUrl } from '@/lib/googleDrive'
import { updatePropertyStatus } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      propertyId, 
      propertyName, 
      roomNumber, 
      photos, 
      updatedBy 
    } = body

    // バリデーション
    if (!propertyId || !propertyName || !roomNumber || !photos || !Array.isArray(photos)) {
      return NextResponse.json(
        { success: false, error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }

    if (photos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'アップロードする写真がありません' },
        { status: 400 }
      )
    }

    console.log(`写真アップロード開始: ${propertyName}_${roomNumber} (${photos.length}枚)`)

    // Google Driveに写真をアップロード
    const uploadResult = await uploadPropertyPhotos(
      propertyName,
      roomNumber,
      photos.map((photo: any) => ({
        dataUrl: photo.dataUrl,
        timestamp: new Date(photo.timestamp)
      }))
    )

    // Google DriveフォルダのURLを生成
    const folderUrl = generateFolderUrl(uploadResult.folderId)

    console.log(`写真アップロード成功: ${uploadResult.folderName}`)
    console.log(`フォルダURL: ${folderUrl}`)

    // 物件のステータスを「撮影済」に更新
    try {
      await updatePropertyStatus(
        propertyId,
        '撮影済',
        new Date().toISOString(),
        updatedBy
      )
      console.log('物件ステータスを「撮影済」に更新しました')
    } catch (statusError) {
      console.warn('ステータス更新に失敗しましたが、写真アップロードは成功しました', statusError)
    }

    return NextResponse.json({
      success: true,
      message: `${photos.length}枚の写真をアップロードしました`,
      data: {
        folderId: uploadResult.folderId,
        folderName: uploadResult.folderName,
        folderUrl,
        uploadedFiles: uploadResult.fileIds.length,
        propertyId
      }
    })

  } catch (error) {
    console.error('写真アップロードエラー:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '写真のアップロードに失敗しました' 
      },
      { status: 500 }
    )
  }
} 