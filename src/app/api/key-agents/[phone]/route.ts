import { NextRequest, NextResponse } from 'next/server'
import { getKeyAgentsFromSheet } from '@/lib/googleSheets'

// 個別の鍵業者情報を取得（最適化版）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const resolvedParams = await params
    const phoneNumber = decodeURIComponent(resolvedParams.phone)
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // 全業者データを取得（キャッシュ化されている）
    const keyAgents = await getKeyAgentsFromSheet()
    
    // 電話番号で検索
    const agent = keyAgents.find(agent => agent.phone_number === phoneNumber)
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Key agent not found' },
        { status: 404 }
      )
          }

          return NextResponse.json(agent)
    
  } catch (error) {
    console.error('Error fetching key agent:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch key agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 