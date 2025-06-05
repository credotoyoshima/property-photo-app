import { NextRequest, NextResponse } from 'next/server'
import { getLatestChatMessage, getUserById } from '@/lib/googleSheets'
import { verifyToken } from '@/lib/auth'

// 未読メッセージの有無を軽量チェック
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ hasUnread: false })
    }

    const tokenResult = verifyToken(token)
    
    if (!tokenResult.valid || !tokenResult.userId) {
      return NextResponse.json({ hasUnread: false })
    }

    const user = await getUserById(tokenResult.userId)
    
    if (!user) {
      return NextResponse.json({ hasUnread: false })
    }

    // 最新1件のメッセージのみ取得（高速）
    const latestMessage = await getLatestChatMessage()
    
    if (!latestMessage) {
      return NextResponse.json({ hasUnread: false })
    }

    // 未読判定ロジック
    const lastReadAt = user.last_chat_read_at ? 
      new Date(user.last_chat_read_at) : new Date(0)

    const hasUnread = new Date(latestMessage.sent_at) > lastReadAt &&
                      latestMessage.sender_username !== user.display_name &&
                      !latestMessage.is_deleted

    return NextResponse.json({ hasUnread })

  } catch (error) {
    console.error('Error checking unread messages:', error)
    return NextResponse.json({ hasUnread: false })
  }
} 