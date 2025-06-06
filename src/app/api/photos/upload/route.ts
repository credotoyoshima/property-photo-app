import { NextRequest, NextResponse } from 'next/server'
import { uploadFileToGoogleDrive, ensureFolderExists, generateFolderName } from '@/lib/googleDrive'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const propertyName = formData.get('propertyName') as string
    const roomNumber = formData.get('roomNumber') as string
    const photoIndex = formData.get('photoIndex') as string
    
    if (!file || !propertyName || !roomNumber) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }
    
    // ファイルをBufferに変換
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // フォルダ名を生成
    const folderName = generateFolderName(propertyName, roomNumber)
    
    // フォルダを作成または取得
    const folderId = await ensureFolderExists(folderName)
    
    // ファイル名を生成（タイムスタンプ付き）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = photoIndex 
      ? `photo_${photoIndex}_${timestamp}.${fileExtension}`
      : `photo_${timestamp}.${fileExtension}`
    
    // Google Driveにアップロード
    const fileId = await uploadFileToGoogleDrive(
      buffer,
      fileName,
      file.type,
      folderId
    )
    
    return NextResponse.json({
      success: true,
      fileId,
      fileName,
      folderName,
      message: '写真をGoogle Driveにアップロードしました'
    })
    
  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json(
      { error: 'アップロードに失敗しました' },
      { status: 500 }
    )
  }
} 