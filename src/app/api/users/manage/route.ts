import { NextRequest, NextResponse } from 'next/server'
import { getUsersFromSheet, getGoogleSheetsClient, getUserByUsername } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const { action, username, data } = await request.json()

    // アクション検証
    const validActions = ['deactivate', 'activate', 'update_store', 'update_role']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, message: '無効なアクションです' },
        { status: 400 }
      )
    }

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'ユーザー名は必須です' },
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

    // スプレッドシート接続
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    const rowNumber = user.id + 1 // ヘッダー行があるため+1
    
    let updateResult;
    
    switch (action) {
      case 'deactivate':
        // I列（is_active）をFALSEに
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `users!I${rowNumber}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['FALSE']] },
        })
        updateResult = { message: `${username}を無効化しました` }
        break;

      case 'activate':
        // I列（is_active）をTRUEに
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `users!I${rowNumber}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['TRUE']] },
        })
        updateResult = { message: `${username}を有効化しました` }
        break;

      case 'update_store':
        if (!data?.store_name) {
          throw new Error('店舗名が指定されていません')
        }
        const validStores = ['塚口店', '西宮北口店', '岡本店', '三宮駅前店', '明石店']
        if (!validStores.includes(data.store_name)) {
          throw new Error('無効な店舗名です')
        }
        // F列（store_name）を更新
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `users!F${rowNumber}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[data.store_name]] },
        })
        updateResult = { message: `${username}の店舗を${data.store_name}に変更しました` }
        break;

      case 'update_role':
        if (!data?.role) {
          throw new Error('権限が指定されていません')
        }
        const validRoles = ['admin', 'user']
        if (!validRoles.includes(data.role)) {
          throw new Error('無効な権限です')
        }
        // E列（role）を更新
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `users!E${rowNumber}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[data.role]] },
        })
        updateResult = { message: `${username}の権限を${data.role}に変更しました` }
        break;
    }

    return NextResponse.json({
      success: true,
      ...updateResult,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name
      }
    })

  } catch (error) {
    console.error('User management error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'ユーザー管理中にエラーが発生しました',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 