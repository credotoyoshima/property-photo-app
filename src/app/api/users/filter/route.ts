import { NextRequest, NextResponse } from 'next/server'
import { getUsersFromSheet } from '@/lib/googleSheets'

// ユーザー一覧を取得（フィルター用）
export async function GET(request: NextRequest) {
  try {
    const users = await getUsersFromSheet()
    
    // アクティブなユーザーのみフィルター
    const activeUsers = users.filter(user => user.is_active)
    
    // 店舗一覧を取得（重複除去）
    const stores = [...new Set(activeUsers.map(user => user.store_name).filter(Boolean))]
    
    // スタッフ一覧を取得
    const staff = activeUsers.map(user => ({
      id: user.id,
      name: user.display_name,
      store_name: user.store_name,
      role: user.role
    }))

    return NextResponse.json({
      success: true,
      stores: stores.sort(),
      staff: staff.sort((a, b) => a.name.localeCompare(b.name))
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 