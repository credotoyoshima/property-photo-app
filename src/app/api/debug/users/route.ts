import { NextRequest, NextResponse } from 'next/server'
import { getUsersFromSheet, initializeUsersSpreadsheet } from '@/lib/googleSheets'

export async function GET(request: NextRequest) {
  try {
    console.log('Debug: Getting users from sheet...')
    const users = await getUsersFromSheet()
    
    return NextResponse.json({
      success: true,
      message: 'ユーザー情報を取得しました',
      users: users,
      count: users.length
    })
  } catch (error) {
    console.error('Debug users error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'ユーザー情報の取得に失敗しました', 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Debug: Initializing users spreadsheet...')
    const result = await initializeUsersSpreadsheet()
    
    return NextResponse.json({
      success: true,
      message: 'usersスプレッドシートを初期化しました',
      result: result
    })
  } catch (error) {
    console.error('Debug users init error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'usersスプレッドシートの初期化に失敗しました', 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 