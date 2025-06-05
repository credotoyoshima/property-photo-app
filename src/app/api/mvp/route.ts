import { NextRequest, NextResponse } from 'next/server'
import { getPropertiesFromSheet, getArchiveDataFromSheet, getUsersFromSheet } from '@/lib/googleSheets'

// MVP情報を取得するAPI
export async function GET(request: NextRequest) {
  try {
    // 現在の日付（日本時間）
    const now = new Date()
    const jstOffset = 9 * 60 * 60 * 1000 // 9時間のオフセット
    const jstNow = new Date(now.getTime() + jstOffset)
    const today = jstNow.toISOString().split('T')[0] // YYYY-MM-DD形式
    const currentMonth = today.substring(0, 7) // YYYY-MM形式

    // 並列でデータ取得
    const [properties, archiveData, users] = await Promise.all([
      getPropertiesFromSheet(),
      getArchiveDataFromSheet(),
      getUsersFromSheet()
    ])

    // 本日の実績集計
    const todayStats = new Map<string, { count: number, store: string }>()

    properties
      .filter(property => {
        if (property.status !== '撮影済' || !property.shooting_datetime) {
          return false
        }
        
        try {
          const shootingDate = new Date(property.shooting_datetime)
          const shootingDateJST = new Date(shootingDate.getTime() + jstOffset)
          const shootingDateStr = shootingDateJST.toISOString().split('T')[0]
          return shootingDateStr === today
        } catch {
          return false
        }
      })
      .forEach(property => {
        // updated_byはdisplay_nameなので、usersテーブルでdisplay_nameマッチング
        const user = users.find(u => u.display_name === property.updated_by)
        if (user) {
          const current = todayStats.get(user.display_name) || { count: 0, store: user.store_name }
          todayStats.set(user.display_name, {
            count: current.count + 1,
            store: user.store_name
          })
        }
      })

    // 月間実績集計
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

    // 本日のMVP（最高実績）
    let todayMVP = null
    if (todayStats.size > 0) {
      const todayTop = Array.from(todayStats.entries())
        .sort(([, a], [, b]) => b.count - a.count)[0]
      
      if (todayTop && todayTop[1].count > 0) {
        todayMVP = {
          name: todayTop[0],
          store: todayTop[1].store,
          count: todayTop[1].count
        }
      }
    }

    // 月間MVP（最高実績）
    let monthlyMVP = null
    if (monthlyStats.size > 0) {
      const monthlyTop = Array.from(monthlyStats.entries())
        .sort(([, a], [, b]) => b.count - a.count)[0]
      
      if (monthlyTop && monthlyTop[1].count > 0) {
        monthlyMVP = {
          name: monthlyTop[0],
          store: monthlyTop[1].store,
          count: monthlyTop[1].count
        }
      }
    }

    return NextResponse.json({
      success: true,
      mvp: {
        today: todayMVP,
        monthly: monthlyMVP
      }
    })

  } catch (error) {
    console.error('Error fetching MVP data:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch MVP data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 