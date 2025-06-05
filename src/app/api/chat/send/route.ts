import { NextRequest, NextResponse } from 'next/server'
import { addChatMessage, getUserById } from '@/lib/googleSheets'
import { verifyToken } from '@/lib/auth'

// チャットメッセージを送信
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

    // リクエストボディを取得
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      )
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message is too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    // メッセージを追加（display_nameを使用）
    const result = await addChatMessage(user.display_name, message.trim())

    return NextResponse.json({
      success: true,
      message: result.message
    })

  } catch (error) {
    console.error('Error sending chat message:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 