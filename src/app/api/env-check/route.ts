import { NextResponse } from 'next/server'
import { checkEnvironmentVariables } from '@/lib/googleSheets'

// 環境変数の状態を確認
export async function GET() {
  try {
    const envStatus = checkEnvironmentVariables()
    return NextResponse.json({
      success: true,
      environment: envStatus
    })
  } catch (error) {
    console.error('Error checking environment variables:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check environment variables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 