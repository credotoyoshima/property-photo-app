import { NextRequest, NextResponse } from 'next/server'
import { getUsersFromSheet, getGoogleSheetsClient } from '@/lib/googleSheets'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, newPassword } = await request.json()

    if (!username || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'ユーザー名と新しいパスワードは必須です' },
        { status: 400 }
      )
    }

    // ユーザーを検索
    const users = await getUsersFromSheet()
    const user = users.find(u => u.username === username)
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = hashPassword(newPassword)

    // スプレッドシートを更新
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 該当する行を見つけて更新（ユーザーIDを使用）
    const rowNumber = user.id + 1 // ヘッダー行があるため+1
    
    // password_hash (C列) を更新
    const passwordRange = `users!C${rowNumber}`
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: passwordRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[hashedPassword]],
      },
    })

    return NextResponse.json({
      success: true,
      message: `${username}のパスワードを更新しました`,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name
      }
    })
  } catch (error) {
    console.error('Password update error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'パスワード更新中にエラーが発生しました',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 