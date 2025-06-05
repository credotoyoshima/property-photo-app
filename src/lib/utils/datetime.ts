// 日本時間を扱うためのユーティリティ関数

// 現在の日本時間を取得（ISO形式の文字列）
export function getJapanTime(): string {
  const now = new Date()
  const japanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return japanTime.toISOString().replace('T', ' ').substring(0, 19) // YYYY-MM-DD HH:MM:SS 形式
}

// 現在の日本時間を取得（Date オブジェクト）
export function getJapanDate(): Date {
  const now = new Date()
  return new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
}

// 指定した Date オブジェクトを日本時間の文字列に変換
export function toJapanTimeString(date: Date): string {
  const japanTime = new Date(date.getTime() + (9 * 60 * 60 * 1000))
  return japanTime.toISOString().replace('T', ' ').substring(0, 19)
}

// 日本時間文字列をフォーマット（表示用）
export function formatJapanTime(dateString?: string): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    // 日本時間での表示用フォーマット（YYYY年MM月DD日 HH:MM）
    const japanDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
    
    const year = japanDate.getFullYear()
    const month = String(japanDate.getMonth() + 1).padStart(2, '0')
    const day = String(japanDate.getDate()).padStart(2, '0')
    const hours = String(japanDate.getHours()).padStart(2, '0')
    const minutes = String(japanDate.getMinutes()).padStart(2, '0')
    
    return `${year}年${month}月${day}日 ${hours}:${minutes}`
  } catch (error) {
    return dateString
  }
}

// 現在の日本時間をYYYY-MM-DD形式で取得
export function getJapanDateString(): string {
  const japanDate = getJapanDate()
  const year = japanDate.getFullYear()
  const month = String(japanDate.getMonth() + 1).padStart(2, '0')
  const day = String(japanDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 日本時間のタイムゾーン情報
export const JAPAN_TIMEZONE = {
  name: 'Asia/Tokyo',
  offset: '+09:00',
  offsetHours: 9
} 