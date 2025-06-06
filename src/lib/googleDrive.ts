import { google } from 'googleapis'

// Google Drive APIクライアントの初期化
export function getGoogleDriveClient() {
  // Google Sheetsと同じ認証情報を使用
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
    // 改行文字を正規化
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
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
    ],
  })

  return google.drive({ version: 'v3', auth })
}

// 指定された親フォルダID（指定されたGoogle Driveフォルダ）
const PARENT_FOLDER_ID = '1sA7Bf9lRpWAPMug-ueCLhh2KvZSzVxXM'

// フォルダが存在するかチェックし、なければ作成
export async function ensureFolderExists(folderName: string): Promise<string> {
  try {
    const drive = getGoogleDriveClient()
    
    // 既存のフォルダを検索
    const response = await drive.files.list({
      q: `name='${folderName}' and parents in '${PARENT_FOLDER_ID}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    })
    
    if (response.data.files && response.data.files.length > 0) {
      // フォルダが既に存在する場合はそのIDを返す
      return response.data.files[0].id!
    }
    
    // フォルダが存在しない場合は新規作成
    const createResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [PARENT_FOLDER_ID],
      },
      fields: 'id',
    })
    
    return createResponse.data.id!
  } catch (error) {
    console.error('Error ensuring folder exists:', error)
    throw new Error('フォルダの作成に失敗しました')
  }
}

// ファイルをGoogle Driveにアップロード
export async function uploadFileToGoogleDrive(
  file: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<string> {
  try {
    const drive = getGoogleDriveClient()
    
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: Buffer.from(file),
      },
      fields: 'id, webViewLink',
    })
    
    return response.data.id!
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error)
    throw new Error('ファイルのアップロードに失敗しました')
  }
}

// 物件名と部屋番号からフォルダ名を生成
export function generateFolderName(propertyName: string, roomNumber: string): string {
  // ファイル名として使用できない文字を除去・置換
  const sanitizeName = (name: string) => {
    return name
      .replace(/[<>:"/\\|?*]/g, '_') // ファイル名に使用できない文字を_に置換
      .replace(/\s+/g, '_') // スペースを_に置換
      .trim()
  }
  
  const sanitizedPropertyName = sanitizeName(propertyName)
  const sanitizedRoomNumber = sanitizeName(roomNumber)
  
  return `${sanitizedPropertyName}_${sanitizedRoomNumber}`
} 