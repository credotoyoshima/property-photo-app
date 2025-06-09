import { google } from 'googleapis'
import { Readable } from 'stream'

// Google Drive API設定
const SCOPES = ['https://www.googleapis.com/auth/drive']
const PARENT_FOLDER_ID = '1sA7Bf9lRpWAPMug-ueCLhh2KvZSzVxXM' // 指定されたフォルダID

// 認証クライアントを作成
const getAuthClient = () => {
  const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    project_id: process.env.GOOGLE_PROJECT_ID,
  }

  return new google.auth.GoogleAuth({
    credentials,
    projectId: process.env.GOOGLE_PROJECT_ID,
    scopes: SCOPES,
  })
}

// Google Drive APIクライアントを取得
const getDriveClient = async () => {
  const auth = getAuthClient()
  return google.drive({ version: 'v3', auth })
}

// 指定した名前のフォルダが存在するかチェック
export const checkFolderExists = async (folderName: string): Promise<string | null> => {
  try {
    const drive = await getDriveClient()
    
    // フォルダ名と親フォルダIDで検索（Drive APIクエリ構文修正）
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${PARENT_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
    })

    const folders = response.data.files || []
    return folders.length > 0 ? (folders[0].id || null) : null
  } catch (error: any) {
    // APIエラー内容を詳細にログ出力して再スロー
    console.error(`フォルダ存在チェックエラー: ${error.message}`, error)
    throw new Error(`フォルダの存在確認に失敗しました: ${error.message}`)
  }
}

// フォルダを作成
export const createFolder = async (folderName: string): Promise<string> => {
  try {
    const drive = await getDriveClient()
    
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [PARENT_FOLDER_ID],
    }

    const response = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    })

    const folderId = response.data.id
    if (!folderId) {
      throw new Error('フォルダIDの取得に失敗しました')
    }

    return folderId
  } catch (error) {
    console.error('フォルダ作成エラー:', error)
    throw new Error('フォルダの作成に失敗しました')
  }
}

// フォルダを取得または作成
export const getOrCreateFolder = async (folderName: string): Promise<string> => {
  try {
    // まず既存のフォルダをチェック
    let folderId = await checkFolderExists(folderName)
    
    if (!folderId) {
      // フォルダが存在しない場合は作成
      folderId = await createFolder(folderName)
    }

    return folderId
  } catch (error) {
    console.error('フォルダ取得/作成エラー:', error)
    throw error
  }
}

// ファイルをアップロード
export const uploadFile = async (
  fileData: string, // Data URL
  fileName: string,
  folderId: string
): Promise<string> => {
  try {
    const drive = await getDriveClient()
    
    // Data URLからBufferに変換
    const base64Data = fileData.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    // BufferをReadableストリームに変換
    const bufferStream = Readable.from([buffer])
    
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    }

    const media = {
      mimeType: 'image/jpeg',
      body: bufferStream,
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    })

    const fileId = response.data.id
    if (!fileId) {
      throw new Error('ファイルIDの取得に失敗しました')
    }

    return fileId
  } catch (error: any) {
    // 詳細なエラー内容をログ出力
    console.error(`ファイルアップロードAPIエラー (${fileName}): ${error.message}`, error)
    // エラーメッセージにAPIからの詳細を含める
    throw new Error(`ファイル "${fileName}" のアップロードに失敗しました: ${error.message}`)
  }
}

// 複数ファイルを一括アップロード
export const uploadMultipleFiles = async (
  files: { dataUrl: string; fileName: string }[],
  folderId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> => {
  const concurrency = 5
  const results: string[] = new Array(files.length)
  let currentIndex = 0

  // ワーカー関数: 次のファイルを取得してアップロード
  const worker = async () => {
    while (true) {
      const idx = currentIndex++
      if (idx >= files.length) break

      const { dataUrl, fileName } = files[idx]
      try {
        const fileId = await uploadFile(dataUrl, fileName, folderId)
        results[idx] = fileId
        if (onProgress) onProgress(idx + 1, files.length)
      } catch (error) {
        console.error(`ファイル ${fileName} のアップロードに失敗:`, error)
        throw error
      }
    }
  }

  // 同時に指定件数をワーカー起動
  await Promise.all(Array(concurrency).fill(null).map(() => worker()))
  return results
}

// 物件用のフォルダ作成とファイルアップロード（メイン関数）
export const uploadPropertyPhotos = async (
  propertyName: string,
  roomNumber: string,
  photos: { dataUrl: string; timestamp: Date }[],
  onProgress?: (completed: number, total: number) => void
): Promise<{
  folderId: string
  fileIds: string[]
  folderName: string
}> => {
  try {
    // フォルダ名を生成
    const folderName = `${propertyName}_${roomNumber}`
    
    // フォルダを取得または作成
    const folderId = await getOrCreateFolder(folderName)
    
    // ファイル名を生成（タイムスタンプベース）
    const files = photos.map((photo, index) => ({
      dataUrl: photo.dataUrl,
      fileName: `${folderName}_${photo.timestamp.toISOString().replace(/[:.]/g, '-')}_${String(index + 1).padStart(2, '0')}.jpg`
    }))
    
    // ファイルを一括アップロード
    const fileIds = await uploadMultipleFiles(files, folderId, onProgress)
    
    return {
      folderId,
      fileIds,
      folderName
    }
  } catch (error) {
    console.error('物件写真アップロードエラー:', error)
    throw error
  }
}

// Google DriveのフォルダURLを生成
export const generateFolderUrl = (folderId: string): string => {
  return `https://drive.google.com/drive/folders/${folderId}`
} 