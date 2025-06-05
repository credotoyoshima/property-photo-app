import { NextRequest, NextResponse } from 'next/server'
import { getUsersFromSheet, addUser } from '@/lib/googleSheets'
import { hashPassword } from '@/lib/auth'

// ユーザー一覧を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    
    const users = await getUsersFromSheet()
    
    if (filter === 'filtered') {
      // フィルター済みデータを返す（GET_FILTERED相当）
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
    }
    
    // パスワードハッシュを除いて返す
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      store_name: user.store_name,
      created_at: user.created_at,
      last_login: user.last_login,
      is_active: user.is_active
    }))
    
    return NextResponse.json({ users: safeUsers })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// 新しいユーザーを追加
export async function POST(request: NextRequest) {
  try {
    const { username, password, display_name, role, store_name } = await request.json()

    // 入力値検証
    if (!username || !password || !display_name) {
      return NextResponse.json(
        { error: 'ユーザー名、パスワード、表示名は必須です' },
        { status: 400 }
      )
    }

    // パスワードの最小要件チェック
    if (password.length < 4) {
      return NextResponse.json(
        { error: 'パスワードは4文字以上である必要があります' },
        { status: 400 }
      )
    }

    // ユーザー名の重複チェック
    const existingUsers = await getUsersFromSheet()
    const isUsernameTaken = existingUsers.some(user => user.username === username)
    
    if (isUsernameTaken) {
      return NextResponse.json(
        { error: 'このユーザー名は既に使用されています' },
        { status: 409 }
      )
    }

    // パスワードをハッシュ化
    const password_hash = hashPassword(password)

    // ユーザーを追加
    const result = await addUser({
      username,
      password_hash,
      display_name,
      role: role || 'user',
      store_name: store_name || ''
    })

    return NextResponse.json({
      success: true,
      message: 'ユーザーが作成されました',
      user_id: result.id
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'ユーザー作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
} 