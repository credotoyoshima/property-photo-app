import { google } from 'googleapis'

// Google Drive APIクライアントの初期化
export function getGoogleDriveClient() {
  // 既存のGoogle Sheets認証情報を流用
  let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  let clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  
  // GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEYがbase64エンコードされたJSONの場合の処理
  if (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
    try {
      const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, 'base64').toString('utf-8')
      const serviceAccount = JSON.parse(decoded)
      
      if (serviceAccount.private_key && serviceAccount.client_email) {
        privateKey = serviceAccount.private_key
        clientEmail = serviceAccount.client_email
      }
    } catch (error) {
      console.error('Error parsing service account JSON:', error)
    }
  }
  
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  }
  
  if (!privateKey || !clientEmail) {
    throw new Error('Google Drive API credentials are not configured')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      private_key: privateKey,
      client_email: clientEmail,
    },
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.folder'
    ],
  })

  return google.drive({ version: 'v3', auth })
}

// メインフォルダのID（指定されたGoogle Driveフォルダ）
const MAIN_FOLDER_ID = '1sA7Bf9lRpWAPMug-ueCLhh2KvZSzVxXM'

// 物件別フォルダを作成または取得
export async function getOrCreatePropertyFolder(propertyName: string, roomNumber: string) {
  try {
    const drive = getGoogleDriveClient()
    const folderName = `${propertyName}_${roomNumber}`
    
    // 既存フォルダを検索
    const searchResponse = await drive.files.list({
      q: `name='${folderName}' and parents in '${MAIN_FOLDER_ID}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    })
    
    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      // 既存フォルダが見つかった場合
      const folderId = searchResponse.data.files[0].id!
      console.log(`既存フォルダを使用: ${folderName} (ID: ${folderId})`)
      return folderId
    }
    
    // 新しいフォルダを作成
    const createResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [MAIN_FOLDER_ID],
      },
      fields: 'id, name',
    })
    
    const folderId = createResponse.data.id!
    console.log(`新しいフォルダを作成: ${folderName} (ID: ${folderId})`)
    return folderId
  } catch (error) {
    console.error('Error creating/getting property folder:', error)
    throw error
  }
}

// 画像をGoogle Driveにアップロード
export async function uploadImageToDrive(
  file: File,
  propertyName: string,
  roomNumber: string,
  metadata: {
    photographerName: string
    shootingDate: string
    gpsLocation?: { latitude: number, longitude: number }
    imageIndex: number
    totalImages: number
  }
) {
  try {
    const drive = getGoogleDriveClient()
    
    // 物件別フォルダを取得/作成
    const folderId = await getOrCreatePropertyFolder(propertyName, roomNumber)
    
    // ファイル名を生成（撮影順序を含む）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${String(metadata.imageIndex).padStart(3, '0')}_${timestamp}_${file.name}`
    
    // ファイルをBuffer形式に変換
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // メタデータの準備
    const description = JSON.stringify({
      propertyName,
      roomNumber,
      photographerName: metadata.photographerName,
      shootingDate: metadata.shootingDate,
      gpsLocation: metadata.gpsLocation,
      imageIndex: metadata.imageIndex,
      totalImages: metadata.totalImages,
    })
    
    // Google Driveにアップロード
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        description: description,
      },
      media: {
        mimeType: file.type,
        body: buffer,
      },
      fields: 'id, name, size, createdTime',
    })
    
    console.log(`画像アップロード完了: ${fileName} (ID: ${response.data.id})`)
    
    return {
      fileId: response.data.id!,
      fileName: response.data.name!,
      fileSize: response.data.size!,
      uploadTime: response.data.createdTime!,
    }
  } catch (error) {
    console.error('Error uploading image to Drive:', error)
    throw error
  }
}

// 複数画像の一括アップロード（バッチ処理）
export async function uploadMultipleImagesToDrive(
  files: File[],
  propertyName: string,
  roomNumber: string,
  photographerName: string,
  gpsLocation?: { latitude: number, longitude: number }
) {
  const results = []
  const shootingDate = new Date().toISOString()
  const totalImages = files.length
  
  console.log(`${totalImages}枚の画像のアップロードを開始します...`)
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    try {
      const result = await uploadImageToDrive(file, propertyName, roomNumber, {
        photographerName,
        shootingDate,
        gpsLocation,
        imageIndex: i + 1,
        totalImages,
      })
      
      results.push({
        success: true,
        index: i + 1,
        fileName: file.name,
        result,
      })
      
      console.log(`進捗: ${i + 1}/${totalImages} - ${file.name} アップロード完了`)
    } catch (error) {
      console.error(`画像 ${i + 1}/${totalImages} のアップロードに失敗:`, error)
      
      results.push({
        success: false,
        index: i + 1,
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
    
    // API制限回避のための短い待機時間
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  
  console.log(`アップロード完了: 成功 ${successCount}件、失敗 ${failCount}件`)
  
  return {
    results,
    summary: {
      total: totalImages,
      success: successCount,
      failed: failCount,
    },
  }
}

// フォルダ内の画像一覧を取得
export async function getImagesFromPropertyFolder(propertyName: string, roomNumber: string) {
  try {
    const drive = getGoogleDriveClient()
    const folderName = `${propertyName}_${roomNumber}`
    
    // フォルダを検索
    const folderResponse = await drive.files.list({
      q: `name='${folderName}' and parents in '${MAIN_FOLDER_ID}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    })
    
    if (!folderResponse.data.files || folderResponse.data.files.length === 0) {
      return []
    }
    
    const folderId = folderResponse.data.files[0].id!
    
    // フォルダ内の画像ファイルを取得
    const filesResponse = await drive.files.list({
      q: `parents in '${folderId}' and (mimeType contains 'image/') and trashed=false`,
      fields: 'files(id, name, size, createdTime, description, webViewLink)',
      orderBy: 'name',
    })
    
    return filesResponse.data.files || []
  } catch (error) {
    console.error('Error getting images from property folder:', error)
    throw error
  }
} 