import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'ログアウトしました'
    })

    // 認証トークンクッキーを削除
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // 即座に期限切れ
      path: '/', // 追加: クッキーのパスをルートに設定
    })

    return response
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { success: false, message: 'ログアウト中にエラーが発生しました' },
      { status: 500 }
    )
  }
} 