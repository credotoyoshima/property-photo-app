# データベース設計とログイン機能セットアップガイド

## 概要
このガイドでは、Google Sheetsをデータベースとして使用し、ID・パスワード認証機能を備えた物件撮影管理システムのセットアップ方法を説明します。

## データベース構造

### 1. Propertiesシート（物件情報）
```
A列: id              - 物件ID（自動連番）
B列: property_name   - 物件名
C列: room_number     - 部屋番号
D列: address         - 住所
E列: latitude        - 緯度
F列: longitude       - 経度
G列: status          - 撮影状況（未撮影/撮影済み）
H列: memo            - メモ・注意事項
I列: original_agent  - 元付業者
J列: phone_number    - 電話番号
K列: confirmation_date - 物確日
L列: construction_date - 築年月
M列: access_method   - 案内方法
N列: floor_area      - 床面積（㎡）
O列: rent            - 賃料（円）
P列: common_fee      - 共益費（円）
Q列: shooting_datetime - 撮影日時（日本時間）
R列: updated_by      - 更新者
```

### 2. Usersシート（ユーザー管理）
```
A列: id              - ユーザーID（自動連番）
B列: username        - ユーザー名（ログイン用ID）
C列: password_hash   - パスワードハッシュ（SHA256）
D列: display_name    - 表示名
E列: role            - 権限（admin/user）
F列: created_at      - 作成日時（日本時間）
G列: last_login      - 最終ログイン日時（日本時間）
H列: is_active       - アクティブフラグ（TRUE/FALSE）
```

## 日本時間対応

### タイムゾーン設定
- **タイムゾーン**: Asia/Tokyo (JST)
- **UTCオフセット**: +09:00
- **データベース形式**: YYYY-MM-DD HH:MM:SS
- **表示形式**: YYYY年MM月DD日 HH:MM

### 対応箇所
- ユーザーのログイン時間記録
- 物件の撮影日時記録
- システムの各種タイムスタンプ
- フロントエンドでの時刻表示

### 実装詳細
日本時間は `src/lib/utils/datetime.ts` で管理されており、以下の関数が提供されています：

- `getJapanTime()`: 現在の日本時間（文字列形式）
- `getJapanDate()`: 現在の日本時間（Dateオブジェクト）
- `formatJapanTime()`: 表示用フォーマット
- `getJapanDateString()`: 日付のみ（YYYY-MM-DD形式）

## セットアップ手順

### 1. Google Sheetsの準備

#### 1.1 スプレッドシート作成
1. Google Sheetsで新しいスプレッドシートを作成
2. シート名を以下に変更：
   - Sheet1 → `Properties`
   - 新しいシートを追加して `users` に名前変更

#### 1.2 Google Sheets APIの設定
1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクト作成
2. Google Sheets APIを有効化
3. サービスアカウント作成
4. サービスアカウントのJSONキーをダウンロード
5. スプレッドシートをサービスアカウントと共有（編集者権限）

#### 1.3 環境変数設定
`.env.local`に以下を設定：
```env
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
```

### 2. データベース初期化

#### 2.1 開発サーバー起動
```bash
npm run dev
```

#### 2.2 テストページでデータベース初期化
1. `http://localhost:3000/test` にアクセス
2. 「環境変数テスト」で設定確認
3. 「ユーザーテーブル初期化」ボタンをクリック
4. 成功すると初期ユーザーが作成されます

### 3. 初期ユーザー情報

システム初期化後、以下のユーザーが作成されます：

| ユーザーID | パスワード | 表示名 | 権限 |
|-----------|-----------|-------|-----|
| admin | password123 | 管理者 | admin |
| staff01 | test123 | 撮影スタッフ01 | user |

### 4. ログイン機能の使用

#### 4.1 ログイン
1. `http://localhost:3000/login` にアクセス
2. ユーザーIDとパスワードを入力
3. ログイン成功後、マップページにリダイレクト

#### 4.2 セキュリティ機能
- パスワードはSHA256でハッシュ化して保存
- 認証トークンはHTTPOnlyクッキーで管理
- セッション有効期限は24時間
- 不正なアクセス時の適切なエラーメッセージ

### 5. ユーザー管理

#### 5.1 新しいユーザーの追加
APIエンドポイント `POST /api/users` を使用：
```json
{
  "username": "new_user",
  "password": "password123",
  "display_name": "新しいユーザー",
  "role": "user"
}
```

#### 5.2 ユーザー一覧の取得
APIエンドポイント `GET /api/users` でユーザー一覧を取得可能

### 6. データ管理

#### 6.1 物件データの管理
- Google Sheetsで直接編集可能
- APIエンドポイントからも操作可能
- 撮影状況の更新はアプリから行う

#### 6.2 データ同期
- リアルタイムでGoogle Sheetsと同期
- オフライン時はローカルキャッシュを使用
- ネットワーク復旧時に自動同期

### 7. セキュリティ考慮事項

#### 7.1 パスワードポリシー
- 最小4文字（開発環境用、本番では8文字以上推奨）
- SHA256ハッシュ化で保存

#### 7.2 認証トークン
- 24時間の有効期限
- HTTPOnlyクッキーで管理
- セッション固定攻撃の防止

#### 7.3 権限管理
- admin: 全機能アクセス可能
- user: 物件撮影管理のみ

### 8. トラブルシューティング

#### 8.1 よくあるエラー
- **認証エラー**: サービスアカウントの設定確認
- **権限エラー**: スプレッドシートの共有設定確認
- **データが表示されない**: シート名とカラム構造確認

#### 8.2 デバッグ方法
1. `/test` ページで各機能をテスト
2. ブラウザの開発者ツールでネットワークタブ確認
3. サーバーログでエラー詳細確認

### 9. 本番環境での注意事項

#### 9.1 セキュリティ強化
- より強力なパスワードポリシー
- HTTPS必須
- CORS設定の適切な管理

#### 9.2 パフォーマンス
- キャッシュ戦略の実装
- 大量データでの動作確認
- レート制限の設定

## API エンドポイント一覧

### 認証関連
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト

### ユーザー管理
- `GET /api/users` - ユーザー一覧取得
- `POST /api/users` - 新規ユーザー作成

### 物件管理
- `GET /api/properties` - 物件一覧取得
- `POST /api/properties` - 新規物件追加
- `PATCH /api/properties/[id]` - 物件情報更新

### システム管理
- `POST /api/sheets/init` - Propertiesシート初期化
- `POST /api/sheets/init-users` - Usersシート初期化
- `GET /api/sheets/debug` - デバッグ用データ取得 