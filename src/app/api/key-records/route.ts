import { NextRequest, NextResponse } from 'next/server'
import { getPropertiesFromSheet, getUsersFromSheet, getKeyAgentsFromSheet } from '@/lib/googleSheets'

// 鍵未返却リストを取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole')
    const shooterName = searchParams.get('shooterName')

    // 全物件データ、ユーザーデータ、鍵業者データを取得
    const [allProperties, allUsers, allKeyAgents] = await Promise.all([
      getPropertiesFromSheet(),
      getUsersFromSheet(),
      getKeyAgentsFromSheet()
    ])
    
    // 鍵が貸し出し中（未返却）の物件のみフィルタリング
    const keyRecords = allProperties
      .filter(property => {
        // key_rental_statusが"rented"で、key_rented_byが設定されている物件のみ
        return property.key_rental_status === 'rented' && 
               property.key_rented_by
      })
      .map(property => {
        // 担当者の詳細情報を取得（store_nameのため）
        const user = allUsers.find(u => u.display_name === property.key_rented_by || u.username === property.key_rented_by)
        
        // 鍵業者名を取得（key_agent_phoneとphone_numberで紐づけ）
        const keyAgent = allKeyAgents.find(agent => agent.phone_number === property.key_agent_phone)
        
        return {
          id: property.id,
          property_name: property.property_name,
          room_number: property.room_number,
          key_holder: keyAgent?.agent_name || property.original_agent || '不明', // 鍵預かり業者名
          photographer: property.key_rented_by, // 担当者
          store_name: user?.store_name || '不明', // 店舗名
          key_rented_at: property.key_rented_at // 貸し出し日時（ソート用）
        }
      })
      .sort((a, b) => {
        // 貸し出し日時の新しい順でソート
        const dateA = new Date(a.key_rented_at || 0)
        const dateB = new Date(b.key_rented_at || 0)
        return dateB.getTime() - dateA.getTime()
      })

    // ロールに基づくフィルタリング（削除：一般ユーザーも全店舗・全スタッフの鍵借用情報を見れるように）
    let filteredRecords = keyRecords

    // 一般ユーザーも全鍵借用データを閲覧可能に変更
    // if (userRole !== 'admin' && shooterName) {
    //   // 一般ユーザーの場合は自分の貸し出し分のみ
    //   filteredRecords = keyRecords.filter(record => 
    //     record.photographer === shooterName
    //   )
    // }

    return NextResponse.json({
      success: true,
      records: filteredRecords,
      total: filteredRecords.length
    })

  } catch (error) {
    console.error('Error fetching key records:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch key records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 