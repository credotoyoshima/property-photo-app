import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // 入力値検証
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'ユーザー名とパスワードは必須です' },
        { status: 400 }
      )
    }

    // ユーザー認証
    const authResult = await authenticateUser(username, password)

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 401 }
      )
    }

    // トークン生成
    const token = generateToken(authResult.user!.id)

    // レスポンス作成（store_nameを含む）
    const response = NextResponse.json({
      success: true,
      user: {
        id: authResult.user!.id,
        username: authResult.user!.username,
        display_name: authResult.user!.display_name,
        role: authResult.user!.role,
        store_name: authResult.user!.store_name,
        last_login: authResult.user!.last_login
      },
      message: 'ログインしました'
    })

    // HTTPOnlyクッキーにトークンを設定
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24時間
    })

    return response
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
} 