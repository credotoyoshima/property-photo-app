import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getUserById } from '@/lib/googleSheets'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, message: '認証トークンがありません' },
        { status: 401 }
      )
    }

    const tokenResult = verifyToken(token)
    
    if (!tokenResult.valid || !tokenResult.userId) {
      return NextResponse.json(
        { success: false, message: '無効なトークンです' },
        { status: 401 }
      )
    }

    // ユーザー情報を取得
    const user = await getUserById(tokenResult.userId)
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'ユーザーが見つかりません' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        store_name: user.store_name,
        last_login: user.last_login
      },
      message: '認証済み'
    })
  } catch (error) {
    console.error('Auth verify error:', error)
    return NextResponse.json(
      { success: false, message: '認証確認中にエラーが発生しました' },
      { status: 500 }
    )
  }
} 