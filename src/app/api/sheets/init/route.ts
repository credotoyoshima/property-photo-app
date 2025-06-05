import { NextResponse } from 'next/server'
import { initializeSpreadsheet } from '@/lib/googleSheets'

// スプレッドシートを初期化
export async function POST() {
  try {
    const result = await initializeSpreadsheet()
    return NextResponse.json({ 
      success: true, 
      message: 'Spreadsheet initialized successfully' 
    })
  } catch (error) {
    console.error('Error initializing spreadsheet:', error)
    return NextResponse.json(
      { error: 'Failed to initialize spreadsheet' },
      { status: 500 }
    )
  }
} 