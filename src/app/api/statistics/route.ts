import { NextRequest, NextResponse } from 'next/server'
import { getPropertiesFromSheet, getArchiveDataFromSheet, getUsersFromSheet } from '@/lib/googleSheets'

// 統計データを取得するAPI
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const displayName = searchParams.get('username') // フロントエンドからはusernameパラメータで送られるが実際はdisplay_name
    
    if (!displayName) {
      return NextResponse.json(
        { success: false, error: 'Display name is required' },
        { status: 400 }
      )
    }

    // 現在の日付（日本時間）
    const now = new Date()
    const jstOffset = 9 * 60 * 60 * 1000 // 9時間のオフセット
    const jstNow = new Date(now.getTime() + jstOffset)
    const today = jstNow.toISOString().split('T')[0] // YYYY-MM-DD形式
    const currentMonth = today.substring(0, 7) // YYYY-MM形式

    // 前月の計算
    const currentDate = new Date(jstNow.getFullYear(), jstNow.getMonth(), 1)
    const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`

    // 並列でデータ取得
    const [properties, archiveData, users] = await Promise.all([
      getPropertiesFromSheet(),
      getArchiveDataFromSheet(),
      getUsersFromSheet()
    ])

    // 本日実績（propertiesテーブルから）- updated_byはdisplay_nameで記録されている
    const todayCount = properties.filter(property => {
      if (property.status !== '撮影済' || property.updated_by !== displayName) {
        return false
      }
      
      if (!property.shooting_datetime) {
        return false
      }
      
      try {
        // 撮影日時をJSTで解析
        const shootingDate = new Date(property.shooting_datetime)
        const shootingDateJST = new Date(shootingDate.getTime() + jstOffset)
        const shootingDateStr = shootingDateJST.toISOString().split('T')[0]
        return shootingDateStr === today
      } catch {
        return false
      }
    }).length

    // 月間実績（archiveから + propertiesから）
    const monthlyArchiveCount = archiveData.filter(record => 
      record.photographer_name === displayName && 
      record.completion_month === currentMonth
    ).length

    const monthlyCurrentCount = properties.filter(property => {
      if (property.status !== '撮影済' || property.updated_by !== displayName) {
        return false
      }
      
      if (!property.shooting_datetime) {
        return false
      }
      
      try {
        const shootingDate = new Date(property.shooting_datetime)
        const shootingDateJST = new Date(shootingDate.getTime() + jstOffset)
        const shootingMonth = shootingDateJST.toISOString().substring(0, 7)
        return shootingMonth === currentMonth
      } catch {
        return false
      }
    }).length

    const monthlyTotalCount = monthlyArchiveCount + monthlyCurrentCount

    // 前月の実績データ集計
    const previousMonthStats = new Map<string, { count: number, store: string }>()

    // 前月のアーカイブデータから集計
    archiveData
      .filter(record => record.completion_month === previousMonth)
      .forEach(record => {
        const current = previousMonthStats.get(record.photographer_name) || { count: 0, store: record.photographer_store }
        previousMonthStats.set(record.photographer_name, {
          count: current.count + 1,
          store: record.photographer_store
        })
      })

    // 前月のpropertiesからも集計
    properties
      .filter(property => {
        if (property.status !== '撮影済' || !property.shooting_datetime) {
          return false
        }
        
        try {
          const shootingDate = new Date(property.shooting_datetime)
          const shootingDateJST = new Date(shootingDate.getTime() + jstOffset)
          const shootingMonth = shootingDateJST.toISOString().substring(0, 7)
          return shootingMonth === previousMonth
        } catch {
          return false
        }
      })
      .forEach(property => {
        // updated_byはdisplay_nameなので、usersテーブルでdisplay_nameマッチング
        const user = users.find(u => u.display_name === property.updated_by)
        if (user) {
          const current = previousMonthStats.get(user.display_name) || { count: 0, store: user.store_name }
          previousMonthStats.set(user.display_name, {
            count: current.count + 1,
            store: user.store_name
          })
        }
      })

    // 月間ランキング（TOP5）
    const monthlyStats = new Map<string, { count: number, store: string }>()

    // アーカイブデータから集計
    archiveData
      .filter(record => record.completion_month === currentMonth)
      .forEach(record => {
        const current = monthlyStats.get(record.photographer_name) || { count: 0, store: record.photographer_store }
        monthlyStats.set(record.photographer_name, {
          count: current.count + 1,
          store: record.photographer_store
        })
      })

    // 現在のpropertiesからも集計
    properties
      .filter(property => {
        if (property.status !== '撮影済' || !property.shooting_datetime) {
          return false
        }
        
        try {
          const shootingDate = new Date(property.shooting_datetime)
          const shootingDateJST = new Date(shootingDate.getTime() + jstOffset)
          const shootingMonth = shootingDateJST.toISOString().substring(0, 7)
          return shootingMonth === currentMonth
        } catch {
          return false
        }
      })
      .forEach(property => {
        // updated_byはdisplay_nameなので、usersテーブルでdisplay_nameマッチング
        const user = users.find(u => u.display_name === property.updated_by)
        if (user) {
          const current = monthlyStats.get(user.display_name) || { count: 0, store: user.store_name }
          monthlyStats.set(user.display_name, {
            count: current.count + 1,
            store: user.store_name
          })
        }
      })

    // ランキング作成（TOP5）
    const rankings = Array.from(monthlyStats.entries())
      .map(([name, data]) => {
        const previousCount = previousMonthStats.get(name)?.count || 0
        const monthOverMonth = data.count - previousCount
        
        return {
          photographer_name: name,
          photographer_store: data.store,
          count: data.count,
          previous_month_count: previousCount,
          month_over_month: monthOverMonth
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item, index) => ({
        rank: index + 1,
        ...item
      }))

    return NextResponse.json({
      success: true,
      statistics: {
        today_count: todayCount,
        monthly_count: monthlyTotalCount,
        rankings
      }
    })

  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 