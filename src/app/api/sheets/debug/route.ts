import { NextResponse } from 'next/server'
import { getRawSheetData } from '@/lib/googleSheets'

// スプレッドシートの生データを取得（デバッグ用）
export async function GET() {
  try {
    const result = await getRawSheetData()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching raw sheet data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch raw sheet data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 