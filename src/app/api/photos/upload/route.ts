import { NextRequest, NextResponse } from 'next/server'
import { uploadMultipleImagesToDrive, getImagesFromPropertyFolder } from '@/lib/googleDrive'

// 複数画像のアップロード
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // フォームデータから必要な情報を取得
    const propertyName = formData.get('propertyName') as string
    const roomNumber = formData.get('roomNumber') as string
    const photographerName = formData.get('photographerName') as string
    const gpsLat = formData.get('gpsLat') as string
    const gpsLng = formData.get('gpsLng') as string
    
    if (!propertyName || !roomNumber || !photographerName) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }

    // アップロードされたファイルを取得
    const files: File[] = []
    const fileEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith('file'))
    
    for (const [, value] of fileEntries) {
      if (value instanceof File) {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'アップロードするファイルがありません' },
        { status: 400 }
      )
    }

    // GPS位置情報の準備
    let gpsLocation: { latitude: number, longitude: number } | undefined
    if (gpsLat && gpsLng) {
      gpsLocation = {
        latitude: parseFloat(gpsLat),
        longitude: parseFloat(gpsLng),
      }
    }

    // Google Driveにアップロード
    const result = await uploadMultipleImagesToDrive(
      files,
      propertyName,
      roomNumber,
      photographerName,
      gpsLocation
    )

    return NextResponse.json({
      success: true,
      summary: result.summary,
      results: result.results,
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { 
        error: 'アップロードに失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 物件フォルダの画像一覧を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyName = searchParams.get('propertyName')
    const roomNumber = searchParams.get('roomNumber')

    if (!propertyName || !roomNumber) {
      return NextResponse.json(
        { error: '物件名と部屋番号が必要です' },
        { status: 400 }
      )
    }

    const images = await getImagesFromPropertyFolder(propertyName, roomNumber)

    return NextResponse.json({
      success: true,
      images,
      count: images.length,
    })

  } catch (error) {
    console.error('Get images API error:', error)
    return NextResponse.json(
      { 
        error: '画像一覧の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 