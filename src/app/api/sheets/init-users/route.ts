import { NextResponse } from 'next/server'
import { initializeBothSpreadsheets, addUser } from '@/lib/googleSheets'
import { hashPassword } from '@/lib/auth'

// ユーザースプレッドシートを初期化し、初期ユーザーを作成
export async function POST() {
  try {
    // 両方のスプレッドシート（properties と users）を初期化
    await initializeBothSpreadsheets()

    // 初期管理者ユーザーを作成
    const adminPassword = hashPassword('password123')
    await addUser({
      username: 'admin',
      password_hash: adminPassword,
      display_name: '管理者',
      role: 'admin',
      store_name: '本社'
    })

    // テスト用ユーザーを作成
    const testPassword = hashPassword('test123')
    await addUser({
      username: 'staff01',
      password_hash: testPassword,
      display_name: '撮影スタッフ01',
      role: 'user',
      store_name: '東京店'
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Spreadsheets initialized and initial users created successfully',
      initialUsers: [
        { username: 'admin', password: 'password123', role: 'admin' },
        { username: 'staff01', password: 'test123', role: 'user' }
      ]
    })
  } catch (error) {
    console.error('Error initializing user spreadsheet:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initialize user spreadsheet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 