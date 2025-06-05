import { NextRequest, NextResponse } from 'next/server'
import { updateUserLastChatRead, getUserById } from '@/lib/googleSheets'
import { verifyToken } from '@/lib/auth'

// チャットメッセージを既読にマーク
export async function POST(request: NextRequest) {
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

    // ユーザーの最終チャット閲覧時刻を現在時刻に更新
    const result = await updateUserLastChatRead(user.id)

    return NextResponse.json({
      success: true,
      last_chat_read_at: result.last_chat_read_at
    })

  } catch (error) {
    console.error('Error marking chat as read:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to mark chat as read',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 