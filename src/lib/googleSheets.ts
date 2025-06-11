import { google } from 'googleapis'
import { getJapanTime } from './utils/datetime'

// Google Sheets APIクライアントの初期化
export function getGoogleSheetsClient() {
  // 既存の環境変数名に対応
  let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  let clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  
  // デバッグ情報を追加
  console.log('Environment variables check:')
  console.log('GOOGLE_SHEETS_PRIVATE_KEY exists:', !!process.env.GOOGLE_SHEETS_PRIVATE_KEY)
  console.log('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY exists:', !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
  console.log('GOOGLE_SHEETS_CLIENT_EMAIL exists:', !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL)
  console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL exists:', !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
  console.log('GOOGLE_SHEETS_SPREADSHEET_ID exists:', !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID)
  
  // GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEYがbase64エンコードされたJSONの場合の処理
  if (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
    try {
      console.log('Decoding base64 service account JSON...')
      const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, 'base64').toString('utf-8')
      const serviceAccount = JSON.parse(decoded)
      
      if (serviceAccount.private_key && serviceAccount.client_email) {
        privateKey = serviceAccount.private_key
        clientEmail = serviceAccount.client_email
        console.log('Successfully extracted credentials from service account JSON')
        console.log('Client email from JSON:', clientEmail)
      }
    } catch (error) {
      console.error('Error parsing service account JSON:', error)
    }
  }
  
  if (privateKey) {
    console.log('Private key starts with:', privateKey.substring(0, 50) + '...')
    // 改行文字を正規化
    privateKey = privateKey.replace(/\\n/g, '\n')
  }
  
  if (clientEmail) {
    console.log('Client email:', clientEmail)
  }
  
  if (!privateKey || !clientEmail) {
    const missingVars = []
    if (!privateKey) missingVars.push('GOOGLE_SHEETS_PRIVATE_KEY or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
    if (!clientEmail) missingVars.push('GOOGLE_SHEETS_CLIENT_EMAIL or GOOGLE_SERVICE_ACCOUNT_EMAIL')
    
    throw new Error(`Google Sheets API credentials are not configured. Missing: ${missingVars.join(', ')}`)
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      private_key: privateKey,
      client_email: clientEmail,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}

// スプレッドシートから物件データを取得
export async function getPropertiesFromSheet() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // プロパティシートからデータを取得（全列を取得）
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Properties!A2:Z', // ヘッダー行を除く、全列を取得
    })

    const rows = response.data.values || []
    
    return rows.map((row, index) => {
      // データベース設計図に基づく正しい列構造マッピング
      
      // 数値変換のためのヘルパー関数
      const parseNumber = (value: any): number | null => {
        if (!value || value === '') return null
        const stringValue = value.toString().replace(/[,\s]/g, '') // カンマと空白を除去
        const parsed = parseFloat(stringValue)
        return isNaN(parsed) ? null : parsed
      }
      
      const parseInteger = (value: any): number | null => {
        const parsed = parseNumber(value)
        return parsed !== null ? Math.round(parsed) : null
      }
      
      return {
        id: row[0]?.toString() || (index + 1).toString(), // A列: string id
        property_name: row[1] || '',                    // B列: property_name
        room_number: row[2] || '',                      // C列: room_number
        address: row[3] || '',                          // D列: address
        latitude: parseFloat(row[4]) || 35.6762,        // E列: latitude
        longitude: parseFloat(row[5]) || 139.6503,      // F列: longitude
        status: row[6] || '未撮影',                     // G列: status
        memo: row[7] || '',                             // H列: memo
        original_agent: row[8] || '',                   // I列: original_agent
        phone_number: row[9] || '',                     // J列: phone_number
        confirmation_date: row[10] || '',               // K列: confirmation_date
        construction_date: row[11] || '',               // L列: construction_date
        access_method: row[12] || '',                   // M列: access_method
        floor_area: parseNumber(row[13]),               // N列: floor_area
        rent: parseInteger(row[14]),                    // O列: rent
        common_fee: parseInteger(row[15]),              // P列: common_fee
        shooting_datetime: row[16] || null,             // Q列: shooting_datetime
        updated_by: row[17] || '',                      // R列: updated_by
        key_agent_phone: row[18] || '',                 // S列: key_agent_phone
        key_rental_status: row[19] || 'available',      // T列: key_rental_status
        key_rented_at: row[20] || '',                   // U列: key_rented_at
        key_returned_at: row[21] || '',                 // V列: key_returned_at
        key_rented_by: row[22] || '',                   // W列: key_rented_by
        recruitment_status: row[23] || '',              // X列: recruitment_status
        vacancy_date: row[24] || '',                    // Y列: vacancy_date
        last_updated: getJapanTime(),                   // 計算値（実際の列ではない）- 日本時間に変更
      }
    })
  } catch (error) {
    console.error('Error fetching properties from Google Sheets:', error)
    throw error
  }
}

// 単一物件をIDで取得（最適化版）
export async function getPropertyById(propertyId: string) {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // ID列を検索してシート内の行番号を特定
    const idColumnRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Properties!A2:A',
    })
    const idRows = idColumnRes.data.values || []
    const rowIndex = idRows.findIndex(r => r[0] === propertyId)
    if (rowIndex === -1) {
      return null
    }
    const rowNumber = rowIndex + 2 // ヘッダー行を除くため+2

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Properties!A${rowNumber}:Z${rowNumber}`,
    })

    const rows = response.data.values || []
    if (rows.length === 0) {
      return null
    }
    
    const row = rows[0]
    
    // 数値変換のためのヘルパー関数
    const parseNumber = (value: any): number | null => {
      if (!value || value === '') return null
      const stringValue = value.toString().replace(/[,\s]/g, '')
      const parsed = parseFloat(stringValue)
      return isNaN(parsed) ? null : parsed
    }
    
    const parseInteger = (value: any): number | null => {
      const parsed = parseNumber(value)
      return parsed !== null ? Math.round(parsed) : null
    }
    
    return {
      id: row[0]?.toString() || propertyId,
      property_name: row[1] || '',
      room_number: row[2] || '',
      address: row[3] || '',
      latitude: parseFloat(row[4]) || 35.6762,
      longitude: parseFloat(row[5]) || 139.6503,
      status: row[6] || '未撮影',
      memo: row[7] || '',
      original_agent: row[8] || '',
      phone_number: row[9] || '',
      confirmation_date: row[10] || '',
      construction_date: row[11] || '',
      access_method: row[12] || '',
      floor_area: parseNumber(row[13]),
      rent: parseInteger(row[14]),
      common_fee: parseInteger(row[15]),
      shooting_datetime: row[16] || null,
      updated_by: row[17] || '',
      key_agent_phone: row[18] || '',
      key_rental_status: row[19] || 'available',
      key_rented_at: row[20] || '',
      key_returned_at: row[21] || '',
      key_rented_by: row[22] || '',
      recruitment_status: row[23] || '',
      vacancy_date: row[24] || '',
      last_updated: getJapanTime(),
    }
  } catch (error) {
    console.error('Error fetching property by ID:', error)
    throw error
  }
}

// 物件の撮影ステータスを更新
export async function updatePropertyStatus(propertyId: string, status: string, shooting_datetime?: string, updatedBy: string = 'システム') {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 物件情報を取得し、文字列IDで行番号を算出
    const properties = await getPropertiesFromSheet()
    const index = properties.findIndex(p => p.id === propertyId)
    if (index === -1) {
      throw new Error('Property not found')
    }
    const rowNumber = index + 2 // ヘッダー行を除くため+2

    // ステータス (G列) を更新
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Properties!G${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[status]] }
    })
    
    const now = getJapanTime()
    
    if (status === '撮影済') {
      // 撮影済の場合：shooting_datetimeとupdated_byを設定
      const shootingTime = shooting_datetime || getJapanTime()
      
      // ユーザー名からdisplay_nameを取得
      let displayName = updatedBy
      try {
        const user = await getUserByUsername(updatedBy)
        if (user && user.display_name) {
          displayName = user.display_name
        }
      } catch (error) {
        console.warn('ユーザー情報の取得に失敗:', error)
        // エラーの場合は元のupdatedByを使用
      }

      // shooting_datetime (Q列) を更新
      const shootingDateRange = `Properties!Q${rowNumber}`
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: shootingDateRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[shootingTime]],
        },
      })

      // updated_by (R列) を更新
      const updatedByRange = `Properties!R${rowNumber}`
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updatedByRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[displayName]],
        },
      })
    } else if (status === '未撮影') {
      // 未撮影の場合：shooting_datetimeとupdated_byをクリア
      const shootingDateRange = `Properties!Q${rowNumber}`
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: shootingDateRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['']],
        },
      })

      const updatedByRange = `Properties!R${rowNumber}`
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updatedByRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['']],
        },
      })
    }

    // 更新後の物件データを取得して返す
    const updatedProperty = await getPropertyById(propertyId)
    return updatedProperty
  } catch (error) {
    console.error('Error updating property status:', error)
    throw error
  }
}

// 新しい物件を追加
export async function addProperty(property: {
  property_name: string
  room_number: string
  address: string
  latitude: number
  longitude: number
  status?: string
}) {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 次のIDを取得
    const existingProperties = await getPropertiesFromSheet()
    const nextId = Math.max(...existingProperties.map(p => p.id), 0) + 1

    // 新しい行を追加
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Properties!A:R',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          nextId,                              // A列: id
          property.property_name,              // B列: property_name
          property.room_number,                // C列: room_number
          property.address,                    // D列: address
          property.latitude,                   // E列: latitude
          property.longitude,                  // F列: longitude
          property.status || '未撮影',         // G列: status
          '',                                  // H列: memo
          '',                                  // I列: original_agent
          '',                                  // J列: phone_number
          '',                                  // K列: confirmation_date
          '',                                  // L列: construction_date
          '',                                  // M列: access_method
          '',                                  // N列: floor_area
          '',                                  // O列: rent
          '',                                  // P列: common_fee
          '',                                  // Q列: shooting_datetime
          'システム',                          // R列: updated_by
        ]],
      },
    })

    return { success: true, id: nextId }
  } catch (error) {
    console.error('Error adding property:', error)
    throw error
  }
}

// スプレッドシートの初期化（ヘッダー行を作成）
export async function initializeSpreadsheet() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // ヘッダー行を設定（データベース設計図に合わせた正しい列構造）
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Properties!A1:R1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'id',                    // A列
          'property_name',         // B列
          'room_number',           // C列
          'address',               // D列
          'latitude',              // E列
          'longitude',             // F列
          'status',                // G列
          'memo',                  // H列
          'original_agent',        // I列
          'phone_number',          // J列
          'confirmation_date',     // K列
          'construction_date',     // L列
          'access_method',         // M列
          'floor_area',            // N列
          'rent',                  // O列
          'common_fee',            // P列
          'shooting_datetime',     // Q列
          'updated_by',            // R列
        ]],
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error initializing spreadsheet:', error)
    throw error
  }
}

// デバッグ用：スプレッドシートの生データを取得
export async function getRawSheetData() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 全データを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Properties!A1:Z10', // 最初の10行を取得
    })

    return {
      success: true,
      data: response.data.values || [],
      range: response.data.range,
    }
  } catch (error) {
    console.error('Error fetching raw sheet data:', error)
    throw error
  }
}

// 環境変数の状態を確認する関数
export function checkEnvironmentVariables() {
  return {
    GOOGLE_SHEETS_PRIVATE_KEY: {
      exists: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      length: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.length || 0,
      preview: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.substring(0, 50) + '...' || 'Not set'
    },
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: {
      exists: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      length: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.length || 0,
      preview: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.substring(0, 50) + '...' || 'Not set'
    },
    GOOGLE_SHEETS_CLIENT_EMAIL: {
      exists: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      value: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || 'Not set'
    },
    GOOGLE_SERVICE_ACCOUNT_EMAIL: {
      exists: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      value: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'Not set'
    },
    GOOGLE_SHEETS_SPREADSHEET_ID: {
      exists: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      value: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 'Not set'
    },
    NODE_ENV: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.startsWith('GOOGLE_'))
  }
}

// 物件の全情報を更新
export async function updateProperty(propertyId: number, updateData: {
  property_name?: string
  room_number?: string
  address?: string
  latitude?: number
  longitude?: number
  status?: string
  memo?: string
  original_agent?: string
  phone_number?: string
  confirmation_date?: string
  construction_date?: string
  access_method?: string
  floor_area?: number | null
  rent?: number | null
  common_fee?: number | null
}) {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 現在の物件データを取得
    const currentProperty = await getPropertyById(propertyId.toString())
    if (!currentProperty) {
      throw new Error('Property not found')
    }

    // 該当する行を見つけて更新
    const rowNumber = propertyId + 1 // ヘッダー行があるため+1
    
    // 更新データをマージ
    const mergedData = {
      ...currentProperty,
      ...updateData,
    }
    
    // 行全体を更新
    const range = `Properties!A${rowNumber}:R${rowNumber}`
    const values = [
      mergedData.id,                                          // A列: id
      mergedData.property_name || '',                         // B列: property_name
      mergedData.room_number || '',                           // C列: room_number
      mergedData.address || '',                               // D列: address
      mergedData.latitude || 35.6762,                         // E列: latitude
      mergedData.longitude || 139.6503,                       // F列: longitude
      mergedData.status || '未撮影',                          // G列: status
      mergedData.memo || '',                                  // H列: memo
      mergedData.original_agent || '',                        // I列: original_agent
      mergedData.phone_number || '',                          // J列: phone_number
      mergedData.confirmation_date || '',                     // K列: confirmation_date
      mergedData.construction_date || '',                     // L列: construction_date
      mergedData.access_method || '',                         // M列: access_method
      mergedData.floor_area || '',                            // N列: floor_area
      mergedData.rent || '',                                  // O列: rent
      mergedData.common_fee || '',                            // P列: common_fee
      mergedData.shooting_datetime || '',                     // Q列: shooting_datetime
      'システム',                                             // R列: updated_by
    ]
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [values],
      },
    })

    // 更新後の物件データを取得して返す
    const updatedProperty = await getPropertyById(propertyId.toString())
    return updatedProperty
  } catch (error) {
    console.error('Error updating property:', error)
    throw error
  }
}

// メモのみを更新
export async function updatePropertyMemo(propertyId: string, memo: string, updatedBy: string = 'システム') {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 物件情報を取得し文字列IDで行番号を算出
    const properties = await getPropertiesFromSheet()
    const index = properties.findIndex(p => p.id === propertyId)
    if (index === -1) {
      throw new Error('Property not found')
    }
    const rowNumber = index + 2 // ヘッダー行を除くため+2
    
    // メモ (H列) のみを更新
    const memoRange = `Properties!H${rowNumber}`
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: memoRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[memo]],
      },
    })

    // 更新後の物件データを取得して返す
    const updatedProperty = await getPropertyById(propertyId)
    return updatedProperty
  } catch (error) {
    console.error('Error updating property memo:', error)
    throw error
  }
}

// ユーザー認証関連の関数を追加

// ユーザーテーブルからデータを取得
export async function getUsersFromSheet() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // usersシートからデータを取得（J列のlast_chat_read_atも含める）
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'users!A2:J', // ヘッダー行を除く、A〜J列を取得
    })

    const rows = response.data.values || []
    
    return rows.map((row, index) => ({
      id: parseInt(row[0]) || index + 1,           // A列: id
      username: row[1] || '',                      // B列: username
      password_hash: row[2] || '',                 // C列: password_hash
      display_name: row[3] || '',                  // D列: display_name
      role: row[4] || 'user',                      // E列: role
      store_name: row[5] || '',                    // F列: store_name
      created_at: row[6] || '',                    // G列: created_at
      last_login: row[7] || '',                    // H列: last_login
      is_active: row[8] === 'TRUE' || row[8] === '1' || row[8] === true, // I列: is_active
      last_chat_read_at: row[9] || '',             // J列: last_chat_read_at
    }))
  } catch (error) {
    console.error('Error fetching users from Google Sheets:', error)
    throw error
  }
}

// ユーザー名でユーザーを検索
export async function getUserByUsername(username: string) {
  try {
    const users = await getUsersFromSheet()
    return users.find(user => user.username === username && user.is_active) || null
  } catch (error) {
    console.error('Error fetching user by username:', error)
    throw error
  }
}

// ユーザーIDでユーザーを検索
export async function getUserById(userId: number) {
  try {
    const users = await getUsersFromSheet()
    return users.find(user => user.id === userId && user.is_active) || null
  } catch (error) {
    console.error('Error fetching user by ID:', error)
    throw error
  }
}

// ユーザーのログイン日時を更新
export async function updateUserLastLogin(userId: number) {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 該当する行を見つけて更新
    const rowNumber = userId + 1 // ヘッダー行があるため+1
    
    // last_login (H列) を更新 - 日本時間を使用
    const lastLoginRange = `users!H${rowNumber}`
    const now = getJapanTime()
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: lastLoginRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[now]],
      },
    })

    return { success: true, last_login: now }
  } catch (error) {
    console.error('Error updating user last login:', error)
    throw error
  }
}

// 新しいユーザーを追加
export async function addUser(userData: {
  username: string
  password_hash: string
  display_name: string
  role?: string
  store_name: string
}) {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 次のIDを取得
    const existingUsers = await getUsersFromSheet()
    const nextId = Math.max(...existingUsers.map(u => u.id), 0) + 1

    // 新しい行を追加
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'users!A:J',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          nextId,                              // A列: id
          userData.username,                   // B列: username
          userData.password_hash,              // C列: password_hash
          userData.display_name,               // D列: display_name
          userData.role || 'user',             // E列: role
          userData.store_name,                 // F列: store_name
          getJapanTime(),                      // G列: created_at
          '',                                  // H列: last_login
          'TRUE',                              // I列: is_active
          '',                                  // J列: last_chat_read_at
        ]],
      },
    })

    return { success: true, id: nextId }
  } catch (error) {
    console.error('Error adding user:', error)
    throw error
  }
}

// usersスプレッドシートの初期化（ヘッダー行を作成）
export async function initializeUsersSpreadsheet() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // ヘッダー行を設定（J列のlast_chat_read_atも含める）
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'users!A1:J1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'id',                    // A列
          'username',              // B列
          'password_hash',         // C列
          'display_name',          // D列
          'role',                  // E列
          'store_name',            // F列
          'created_at',            // G列
          'last_login',            // H列
          'is_active',             // I列
          'last_chat_read_at',     // J列
        ]],
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error initializing users spreadsheet:', error)
    throw error
  }
}

// 既存のスプレッドシートの初期化関数を更新してusersシートも含める
export async function initializeBothSpreadsheets() {
  try {
    await initializeSpreadsheet() // Properties シート
    await initializeUsersSpreadsheet() // Users シート
    return { success: true }
  } catch (error) {
    console.error('Error initializing both spreadsheets:', error)
    throw error
  }
}

// 鍵管理のステータス更新機能を追加
export async function updatePropertyKeyStatus(propertyId: string, action: 'rent' | 'return' | 'reset', rented_by?: string) {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 物件情報を取得して対象の行を特定（文字列IDで検索）
    const properties = await getPropertiesFromSheet()
    const index = properties.findIndex(p => p.id === propertyId)
    if (index === -1) {
      return null
    }
    const property = properties[index]
    // 行番号を計算（ヘッダー行を除くため+2）
    const rowNumber = index + 2
    
    const now = getJapanTime()
    
    if (action === 'rent') {
      // 鍵をレンタルする場合
      const updates = [
        // 鍵レンタル状態を更新（T列）
        {
          range: `Properties!T${rowNumber}`,
          values: [['rented']]
        },
        // レンタル日時を更新（U列）
        {
          range: `Properties!U${rowNumber}`,
          values: [[now]]
        },
        // レンタル者を更新（W列）
        {
          range: `Properties!W${rowNumber}`,
          values: [[rented_by || '']]
        },
        // 返却日時をクリア（V列）
        {
          range: `Properties!V${rowNumber}`,
          values: [['']]
        }
      ]

      // バッチで更新
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates
        }
      })

    } else if (action === 'return') {
      // 鍵を返却する場合
      const updates = [
        // 鍵レンタル状態を更新（T列）
        {
          range: `Properties!T${rowNumber}`,
          values: [['available']]
        },
        // 返却日時を更新（V列）
        {
          range: `Properties!V${rowNumber}`,
          values: [[now]]
        }
      ]

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates
        }
      })
    } else if (action === 'reset') {
      // 鍵の状態をリセットする場合
      const updates = [
        // 鍵レンタル状態を更新（T列）
        {
          range: `Properties!T${rowNumber}`,
          values: [['available']]
        },
        // レンタル日時をクリア（U列）
        {
          range: `Properties!U${rowNumber}`,
          values: [['']]
        },
        // 返却日時をクリア（V列）
        {
          range: `Properties!V${rowNumber}`,
          values: [['']]
        },
        // レンタル者をクリア（W列）
        {
          range: `Properties!W${rowNumber}`,
          values: [['']]
        }
      ]

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates
        }
      })
    }

    // 更新後の物件情報を返す
    let updatedProperty: any
    if (action === 'reset') {
      updatedProperty = {
        ...property,
        key_rental_status: 'available',
        key_rented_at: '',
        key_returned_at: '',
        key_rented_by: ''
      }
    } else {
      updatedProperty = {
        ...property,
        key_rental_status: action === 'rent' ? 'rented' : 'available',
        key_rented_at: action === 'rent' ? now : property.key_rented_at,
        key_returned_at: action === 'return' ? now : property.key_returned_at,
        key_rented_by: action === 'rent' ? rented_by || '' : property.key_rented_by
      }
    }

    return updatedProperty

  } catch (error) {
    console.error('Error updating property key status:', error)
    throw error
  }
}

// 鍵管理業者データを取得
export async function getKeyAgentsFromSheet() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // key_agentsシートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'key_agents!A:G', // A:G列（phone_number, agent_name, address, latitude, longitude, created_at, updated_at）
    })

    const rows = response.data.values || []
    
    // ヘッダー行を除いて処理
    return rows.slice(1).map((row, index) => ({
      phone_number: row[0] || '',        // A列: phone_number
      agent_name: row[1] || '',          // B列: agent_name
      address: row[2] || '',             // C列: address
      latitude: parseFloat(row[3]) || 0, // D列: latitude
      longitude: parseFloat(row[4]) || 0,// E列: longitude
      created_at: row[5] || '',          // F列: created_at
      updated_at: row[6] || ''           // G列: updated_at
    }))
  } catch (error) {
    console.error('Error fetching key agents from Google Sheets:', error)
    throw error
  }
}

// チャットメッセージデータを取得
export async function getChatMessagesFromSheet() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // chat_messagesシートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'chat_messages!A:F', // A:F列（id, sender_username, message_text, sent_at, expires_at, is_deleted）
    })

    const rows = response.data.values || []
    
    // ヘッダー行を除いて処理
    return rows.slice(1)
      .map((row, index) => ({
        id: parseInt(row[0]) || index + 1,        // A列: id
        sender_username: row[1] || '',            // B列: sender_username
        message_text: row[2] || '',               // C列: message_text
        sent_at: row[3] || '',                    // D列: sent_at
        expires_at: row[4] || '',                 // E列: expires_at
        is_deleted: row[5] === 'TRUE' || row[5] === true // F列: is_deleted
      }))
      .filter(message => !message.is_deleted && message.message_text) // 削除されていない有効なメッセージのみ
      .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()) // 送信時刻順
  } catch (error) {
    console.error('Error fetching chat messages from Google Sheets:', error)
    throw error
  }
}

// 最新のチャットメッセージを1件取得（未読判定用）
export async function getLatestChatMessage() {
  try {
    const messages = await getChatMessagesFromSheet()
    return messages.length > 0 ? messages[messages.length - 1] : null
  } catch (error) {
    console.error('Error fetching latest chat message:', error)
    return null
  }
}

// 新しいチャットメッセージを追加
export async function addChatMessage(senderUsername: string, messageText: string) {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 次のIDを取得
    const existingMessages = await getChatMessagesFromSheet()
    const nextId = Math.max(...existingMessages.map(m => m.id), 0) + 1

    const now = getJapanTime()
    const expiresAt = new Date(new Date(now).getTime() + (48 * 60 * 60 * 1000)).toISOString() // 48時間後

    // 新しい行を追加
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'chat_messages!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          nextId,           // A列: id
          senderUsername,   // B列: sender_username
          messageText,      // C列: message_text
          now,              // D列: sent_at
          expiresAt,        // E列: expires_at
          'FALSE'           // F列: is_deleted
        ]],
      },
    })

    return { 
      success: true, 
      id: nextId,
      message: {
        id: nextId,
        sender_username: senderUsername,
        message_text: messageText,
        sent_at: now,
        expires_at: expiresAt,
        is_deleted: false
      }
    }
  } catch (error) {
    console.error('Error adding chat message:', error)
    throw error
  }
}

// ユーザーの最終チャット閲覧時刻を更新
export async function updateUserLastChatRead(userId: number) {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // 該当する行を見つけて更新
    const rowNumber = userId + 1 // ヘッダー行があるため+1
    
    // last_chat_read_at (J列) を更新
    const lastChatReadRange = `users!J${rowNumber}`
    const now = getJapanTime()
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: lastChatReadRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[now]],
      },
    })

    return { success: true, last_chat_read_at: now }
  } catch (error) {
    console.error('Error updating user last chat read:', error)
    throw error
  }
}

// chat_messagesスプレッドシートの初期化（ヘッダー行を作成）
export async function initializeChatSpreadsheet() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    // ヘッダー行を設定
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'chat_messages!A1:F1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'id',             // A列
          'sender_username', // B列
          'message_text',   // C列
          'sent_at',        // D列
          'expires_at',     // E列
          'is_deleted'      // F列
        ]],
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error initializing chat spreadsheet:', error)
    throw error
  }
}

// アーカイブデータを取得
export async function getArchiveDataFromSheet() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is not configured')
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'archive!A:O', // A列からO列まで全データ取得
    })

    const rows = response.data.values || []
    
    if (rows.length <= 1) {
      return [] // ヘッダー行のみまたはデータなし
    }

    // ヘッダー行をスキップしてデータを処理
    return rows.slice(1).map((row: any[], index: number) => ({
      archive_id: parseInt(row[0]) || index + 1,           // A列: archive_id
      original_property_id: parseInt(row[1]) || 0,         // B列: original_property_id
      property_name: row[2] || '',                         // C列: property_name
      room_number: row[3] || '',                           // D列: room_number
      address: row[4] || '',                               // E列: address
      photographer_name: row[5] || '',                     // F列: photographer_name
      photographer_store: row[6] || '',                    // G列: photographer_store
      shooting_date: row[7] || '',                         // H列: shooting_date
      shooting_datetime: row[8] || '',                     // I列: shooting_datetime
      completion_month: row[9] || '',                      // J列: completion_month
      completion_year: parseInt(row[10]) || 0,             // K列: completion_year
      archived_at: row[11] || '',                          // L列: archived_at
      rent: parseInt(row[12]) || null,                     // M列: rent
      floor_area: parseFloat(row[13]) || null,             // N列: floor_area
      original_agent: row[14] || '',                       // O列: original_agent
    }))
  } catch (error) {
    console.error('Error fetching archive data from Google Sheets:', error)
    throw error
  }
} 