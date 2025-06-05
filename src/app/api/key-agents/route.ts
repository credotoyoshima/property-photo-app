import { NextRequest, NextResponse } from 'next/server'
import { getGoogleSheetsClient } from '@/lib/googleSheets'

export async function GET(request: NextRequest) {
  try {
    const sheets = await getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not configured')
    }

    // key_agentsシートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'key_agents!A:G', // A:G列（phone_number, agent_name, address, latitude, longitude, created_at, updated_at）
    })

    const rows = response.data.values
    
    if (!rows || rows.length === 0) {
      return NextResponse.json([])
    }

    // ヘッダー行をスキップし、データを処理
    const keyAgents = []
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      
      // 必須フィールドのチェック
      if (!row[0] || !row[1] || !row[2] || !row[3] || !row[4]) {
        continue // 不完全なデータはスキップ
      }

      try {
        const agent = {
          phone_number: row[0]?.toString().trim() || '',
          agent_name: row[1]?.toString().trim() || '',
          address: row[2]?.toString().trim() || '',
          latitude: parseFloat(row[3]?.toString() || '0'),
          longitude: parseFloat(row[4]?.toString() || '0'),
          created_at: row[5]?.toString() || '',
          updated_at: row[6]?.toString() || ''
        }

        // 緯度経度の妥当性チェック
        if (isNaN(agent.latitude) || isNaN(agent.longitude) || 
            agent.latitude === 0 || agent.longitude === 0) {
          console.warn(`Invalid coordinates for agent: ${agent.agent_name}`)
          continue
        }

        keyAgents.push(agent)
      } catch (error) {
        console.warn(`Error processing agent data at row ${i + 1}:`, error)
        continue
      }
    }

    return NextResponse.json(keyAgents)
    
  } catch (error) {
    console.error('Error fetching key agents:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch key agents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 新しい業者を追加するPOSTエンドポイント
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone_number, agent_name, address, latitude, longitude } = body

    // バリデーション
    if (!phone_number || !agent_name || !address || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude' },
        { status: 400 }
      )
    }

    const sheets = await getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not configured')
    }

    const now = new Date().toISOString()
    
    // 新しい行を追加
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'key_agents!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          phone_number.toString().trim(),
          agent_name.toString().trim(),
          address.toString().trim(),
          parseFloat(latitude).toString(),
          parseFloat(longitude).toString(),
          now,
          now
        ]]
      }
    })

    const newAgent = {
      phone_number: phone_number.toString().trim(),
      agent_name: agent_name.toString().trim(),
      address: address.toString().trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      created_at: now,
      updated_at: now
    }

    return NextResponse.json(newAgent, { status: 201 })
    
  } catch (error) {
    console.error('Error creating key agent:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create key agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 