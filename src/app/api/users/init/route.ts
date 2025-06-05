import { NextRequest, NextResponse } from 'next/server'
import { addUser, initializeUsersSpreadsheet } from '@/lib/googleSheets'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // usersシートの初期化
    await initializeUsersSpreadsheet()

    // テスト用ユーザーを作成
    const testUsers = [
      {
        username: 'admin',
        password: 'password123',
        display_name: '室管理者',
        role: 'admin',
        store_name: '本社'
      },
      {
        username: '田中太郎',
        password: 'tanaka123',
        display_name: '田中太郎',
        role: 'user',
        store_name: '甲風園店'
      },
      {
        username: '佐藤花子',
        password: 'sato123',
        display_name: '佐藤花子',
        role: 'user',
        store_name: '西宮北口店'
      },
      {
        username: '山田次郎',
        password: 'yamada123',
        display_name: '山田次郎',
        role: 'user',
        store_name: '甲風園店'
      },
      {
        username: '鈴木一郎',
        password: 'suzuki123',
        display_name: '鈴木一郎',
        role: 'user',
        store_name: '夙川店'
      }
    ]

    const results = []
    for (const user of testUsers) {
      const hashedPassword = hashPassword(user.password)
      const result = await addUser({
        username: user.username,
        password_hash: hashedPassword,
        display_name: user.display_name,
        role: user.role,
        store_name: user.store_name
      })
      results.push({ username: user.username, result })
    }

    return NextResponse.json({
      success: true,
      message: 'テストユーザーを作成しました',
      users: results
    })
  } catch (error) {
    console.error('User initialization error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'ユーザー初期化中にエラーが発生しました', 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 