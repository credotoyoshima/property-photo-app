export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const { propertyName, roomNumber, imageData } = await request.json();

    // 認証情報の読み込み
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    const scopes = process.env.GOOGLE_DRIVE_SCOPE?.split(',') || ['https://www.googleapis.com/auth/drive.file'];

    if (!privateKey || !clientEmail || !rootFolderId) {
      // 環境変数の不足を詳細に返却
      const missing: string[] = [];
      if (!privateKey) missing.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
      if (!clientEmail) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
      if (!rootFolderId) missing.push('GOOGLE_DRIVE_ROOT_FOLDER_ID');
      return NextResponse.json(
        { error: `Missing environment variables: ${missing.join(', ')}` },
        { status: 500 }
      );
    }

    // Google Driveクライアントの初期化
    const auth = new google.auth.JWT(clientEmail, undefined, privateKey, scopes);
    const drive = google.drive({ version: 'v3', auth });

    // フォルダ名とファイル名の生成
    const folderName = `${propertyName}_${roomNumber}`;
    let folderId: string;

    // フォルダが存在するか検索
    const listRes = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${rootFolderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    if (listRes.data.files && listRes.data.files.length > 0) {
      folderId = listRes.data.files[0].id!;
    } else {
      // フォルダを作成
      const createRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        },
        fields: 'id',
      });
      folderId = createRes.data.id!;
    }

    // 画像データの処理
    const base64Data = imageData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // 画像ファイルをアップロード
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${propertyName}_${roomNumber}_${timestamp}.jpg`;
    const uploadRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: 'image/jpeg',
        body: buffer,
      },
      fields: 'id, webViewLink',
    });

    return NextResponse.json({ success: true, fileId: uploadRes.data.id, link: uploadRes.data.webViewLink });
  } catch (error: any) {
    console.error('Upload error:', error);
    // 詳細なエラーメッセージを返却
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 