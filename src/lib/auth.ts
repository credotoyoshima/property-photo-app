import crypto from 'crypto'
import { getUserByUsername, updateUserLastLogin } from './googleSheets'
import { getJapanTime } from './utils/datetime'

// パスワードをハッシュ化
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// パスワードを検証
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const hashedInput = hashPassword(password)
  return hashedInput === hashedPassword
}

// ユーザー認証
export async function authenticateUser(username: string, password: string) {
  try {
    // ユーザーを検索
    const user = await getUserByUsername(username)
    
    if (!user) {
      return { success: false, message: 'ユーザーが見つかりません' }
    }

    if (!user.is_active) {
      return { success: false, message: 'アカウントが無効です' }
    }

    // パスワードを検証
    const isPasswordValid = verifyPassword(password, user.password_hash)
    
    if (!isPasswordValid) {
      return { success: false, message: 'パスワードが正しくありません' }
    }

    // ログイン日時を更新
    await updateUserLastLogin(user.id)

    // 認証成功 - データベース設計図に合わせたユーザー情報を返す
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        store_name: user.store_name,
        last_login: getJapanTime()
      }
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return { success: false, message: '認証中にエラーが発生しました' }
  }
}

// JWTトークンを生成（簡易版）
export function generateToken(userId: number): string {
  const payload = {
    userId,
    timestamp: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24時間
  }
  
  const tokenData = Buffer.from(JSON.stringify(payload)).toString('base64')
  return tokenData
}

// トークンを検証（簡易版）
export function verifyToken(token: string): { valid: boolean; userId?: number } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    
    if (payload.expires < Date.now()) {
      return { valid: false }
    }
    
    return { valid: true, userId: payload.userId }
  } catch (error) {
    return { valid: false }
  }
} 