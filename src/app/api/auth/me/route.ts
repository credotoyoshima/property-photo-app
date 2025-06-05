import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/lib/googleSheets'
import { verifyToken } from '@/lib/auth'

// 現在のユーザー情報を取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const tokenResult = verifyToken(token)
    
    if (!tokenResult.valid || !tokenResult.userId) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const user = await getUserById(tokenResult.userId)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // パスワードハッシュは返さない
    const safeUser = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      store_name: user.store_name,
      created_at: user.created_at,
      last_login: user.last_login,
      is_active: user.is_active,
      last_chat_read_at: user.last_chat_read_at
    }

    return NextResponse.json({
      success: true,
      user: safeUser
    })

  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch user information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 