import { NextRequest, NextResponse } from 'next/server'
import { addUser, getUserByUsername } from '@/lib/googleSheets'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password, display_name, role, store_name } = await request.json()

    // 必須項目チェック
    if (!username || !password || !display_name || !store_name) {
      return NextResponse.json(
        { success: false, message: 'ユーザー名、パスワード、表示名、店舗名は必須です' },
        { status: 400 }
      )
    }

    // ユーザー名の重複チェック
    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'このユーザー名は既に使用されています' },
        { status: 409 }
      )
    }

    // 店舗名の検証
    const validStores = ['塚口店', '西宮北口店', '岡本店', '三宮駅前店', '明石店']
    if (!validStores.includes(store_name)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `店舗名は以下のいずれかを選択してください: ${validStores.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // 権限の検証
    const validRoles = ['admin', 'user']
    const userRole = role || 'user'
    if (!validRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: '権限は admin または user を選択してください' },
        { status: 400 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = hashPassword(password)

    // 新規ユーザーを作成
    const result = await addUser({
      username,
      password_hash: hashedPassword,
      display_name,
      role: userRole,
      store_name
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '新規ユーザーを作成しました',
        user: {
          id: result.id,
          username,
          display_name,
          role: userRole,
          store_name
        }
      })
    } else {
      throw new Error('ユーザー作成に失敗しました')
    }

  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'ユーザー作成中にエラーが発生しました',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 