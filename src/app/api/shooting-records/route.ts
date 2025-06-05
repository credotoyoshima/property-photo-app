import { NextRequest, NextResponse } from 'next/server'
import { getPropertiesFromSheet } from '@/lib/googleSheets'

// 撮影実績一覧を取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole')
    const shooterName = searchParams.get('shooterName')

    // 全物件データを取得
    const allProperties = await getPropertiesFromSheet()
    
    // 撮影済みの物件のみフィルタリング
    const shootingRecords = allProperties
      .filter(property => {
        // 撮影済みの物件のみ
        return property.status === '撮影済' && 
               property.shooting_datetime && 
               property.updated_by
      })
      .map(property => ({
        id: property.id,
        property_name: property.property_name,
        room_number: property.room_number,
        address: property.address,
        latitude: property.latitude,
        longitude: property.longitude,
        shooting_datetime: property.shooting_datetime,
        photographer: property.updated_by,
        memo: property.memo,
        rent: property.rent,
        floor_area: property.floor_area,
        original_agent: property.original_agent,
        phone_number: property.phone_number
      }))
      .sort((a, b) => {
        // 撮影日時の新しい順でソート
        const dateA = new Date(a.shooting_datetime || 0)
        const dateB = new Date(b.shooting_datetime || 0)
        return dateB.getTime() - dateA.getTime()
      })

    // ロールに基づくフィルタリング（削除：一般ユーザーも全店舗・全スタッフの撮影物件を見れるように）
    let filteredRecords = shootingRecords

    // 一般ユーザーも全撮影データを閲覧可能に変更
    // if (userRole !== 'admin' && shooterName) {
    //   // 一般ユーザーの場合は自分の撮影分のみ
    //   filteredRecords = shootingRecords.filter(record => 
    //     record.photographer === shooterName
    //   )
    // }

    return NextResponse.json({
      success: true,
      records: filteredRecords,
      total: filteredRecords.length
    })

  } catch (error) {
    console.error('Error fetching shooting records:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch shooting records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 