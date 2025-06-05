import { NextRequest, NextResponse } from 'next/server'
import { getPropertiesFromSheet, addProperty } from '@/lib/googleSheets'

// 物件一覧を取得
export async function GET() {
  try {
    const properties = await getPropertiesFromSheet()
    return NextResponse.json({ properties })
  } catch (error) {
    console.error('Error fetching properties:', error)
    
    // フォールバック: モックデータを返す
    const mockProperties = [
      {
        id: 1,
        property_name: 'サンプル物件A',
        room_number: '101',
        address: '東京都渋谷区渋谷1-1-1',
        latitude: 35.6580,
        longitude: 139.7016,
        status: '未撮影',
        last_updated: new Date().toISOString(),
      },
      {
        id: 2,
        property_name: 'サンプル物件B',
        room_number: '205',
        address: '東京都新宿区新宿2-2-2',
        latitude: 35.6896,
        longitude: 139.7006,
        status: '撮影済み',
        last_updated: new Date().toISOString(),
      },
    ]
    
    return NextResponse.json({ 
      properties: mockProperties,
      warning: 'Using mock data - Google Sheets connection failed'
    })
  }
}

// 新しい物件を追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { property_name, room_number, address, latitude, longitude, status } = body

    // バリデーション
    if (!property_name || !room_number || !address) {
      return NextResponse.json(
        { error: 'Property name, room number, and address are required' },
        { status: 400 }
      )
    }

    const result = await addProperty({
      property_name,
      room_number,
      address,
      latitude: latitude || 35.6762,
      longitude: longitude || 139.6503,
      status: status || '未撮影',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error adding property:', error)
    return NextResponse.json(
      { error: 'Failed to add property' },
      { status: 500 }
    )
  }
} 