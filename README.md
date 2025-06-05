# Property Photo App

不動産物件の撮影管理アプリケーション

## 機能

- 物件一覧の表示と管理
- Google Maps上での物件位置表示
- 撮影ステータスの更新
- Google Sheetsとの連携によるデータ管理

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **地図**: Google Maps API
- **データ管理**: Google Sheets API
- **認証**: NextAuth.js
- **状態管理**: Zustand

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Google Sheets API
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# App Environment
NODE_ENV=development
```

### 3. Google Sheets API設定

#### 3.1 Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. Google Sheets APIを有効化
3. サービスアカウントを作成
4. サービスアカウントのJSONキーをダウンロード

#### 3.2 スプレッドシートの準備

1. Google Sheetsで新しいスプレッドシートを作成
2. シート名を「Properties」に変更
3. 以下の列構造でヘッダー行を作成：

| 列 | フィールド名 | 型 | 説明 |
|---|---|---|---|
| A | id | 数値 | 物件ID |
| B | property_name | 文字列 | 物件名 |
| C | room_number | 文字列 | 部屋番号 |
| D | address | 文字列 | 住所 |
| E | latitude | 数値 | 緯度 |
| F | longitude | 数値 | 経度 |
| G | status | 文字列 | ステータス（未撮影/撮影済み） |
| H | memo | 文字列 | メモ（オプション） |
| I | original_agent | 文字列 | 元付業者（オプション） |
| J | phone_number | 文字列 | 電話番号（オプション） |
| K | confirmation_date | 文字列 | 確認日（オプション） |
| L | construction_date | 文字列 | 建築日（オプション） |
| M | access_method | 文字列 | アクセス方法（オプション） |
| N | floor_area | 文字列 | 床面積（オプション） |
| O | rent | 文字列 | 家賃（オプション） |
| P | common_fee | 文字列 | 共益費（オプション） |
| Q | shooting_deadline | 文字列 | 撮影期限（オプション） |
| R | updated_by | 文字列 | 更新者（オプション） |

#### 3.3 スプレッドシートの共有

1. 作成したスプレッドシートを開く
2. 「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを追加
4. 「編集者」権限を付与

#### 3.4 環境変数の設定

1. ダウンロードしたJSONキーから以下の値を取得：
   - `private_key` → `GOOGLE_SHEETS_PRIVATE_KEY`
   - `client_email` → `GOOGLE_SHEETS_CLIENT_EMAIL`
2. スプレッドシートのURLからスプレッドシートIDを取得：
   - URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
   - `{SPREADSHEET_ID}` → `GOOGLE_SHEETS_SPREADSHEET_ID`

### 4. Google Maps API設定

1. [Google Cloud Console](https://console.cloud.google.com/)でMaps JavaScript APIを有効化
2. APIキーを作成
3. APIキーを`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`に設定

### 5. 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## 使用方法

### 1. ログイン

- テスト用ログイン情報：
  - ユーザー名: `test`
  - パスワード: `test`

### 2. 物件管理

- `/map` - 地図上での物件表示と管理
- `/test` - 接続テストとデバッグ

### 3. データ管理

- スプレッドシートに直接データを入力
- アプリケーションから自動的に読み込まれます
- ステータス更新はアプリケーションから可能

## トラブルシューティング

### Google Sheets接続エラー

1. `/test`ページで「スプレッドシート生データ取得」をクリック
2. エラーメッセージを確認
3. 環境変数の設定を再確認
4. サービスアカウントの権限を確認

### 一般的なエラー

- **認証エラー**: サービスアカウントの設定を確認
- **権限エラー**: スプレッドシートの共有設定を確認
- **データが表示されない**: スプレッドシートの構造を確認

## API エンドポイント

- `GET /api/properties` - 物件一覧取得
- `POST /api/properties` - 新規物件追加
- `PATCH /api/properties/[id]` - 物件ステータス更新
- `POST /api/sheets/init` - スプレッドシート初期化
- `GET /api/sheets/debug` - デバッグ用生データ取得

## 開発

### ビルド

```bash
npm run build
```

### リント

```bash
npm run lint
```

### 型チェック

```bash
npm run type-check
```

## ライセンス

MIT License
