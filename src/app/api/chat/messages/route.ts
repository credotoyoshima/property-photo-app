import { NextRequest, NextResponse } from 'next/server'
import { getChatMessagesFromSheet, getUserById } from '@/lib/googleSheets'
import { verifyToken } from '@/lib/auth'

// チャットメッセージ一覧を取得
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

    // チャットメッセージを取得
    const messages = await getChatMessagesFromSheet()

    return NextResponse.json({
      success: true,
      messages,
      total: messages.length
    })

  } catch (error) {
    console.error('Error fetching chat messages:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch chat messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 