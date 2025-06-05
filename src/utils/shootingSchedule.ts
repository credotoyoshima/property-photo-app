// 撮影予定物件の管理ユーティリティ

export interface ScheduledProperty {
  id: number
  propertyName: string
  roomNumber: string
  address: string
  addedAt: string
}

const STORAGE_KEY = 'shooting_schedule'

// 撮影予定リストを取得
export const getScheduledProperties = (): ScheduledProperty[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('撮影予定データの取得エラー:', error)
    return []
  }
}

// 撮影予定に物件を追加
export const addToSchedule = (property: {
  id: number
  property_name: string
  room_number: string
  address: string
}): boolean => {
  try {
    const currentSchedule = getScheduledProperties()
    
    // 既に追加済みかチェック
    const isAlreadyAdded = currentSchedule.some(item => item.id === property.id)
    if (isAlreadyAdded) {
      return false // 既に追加済み
    }

    const newItem: ScheduledProperty = {
      id: property.id,
      propertyName: property.property_name,
      roomNumber: property.room_number,
      address: property.address,
      addedAt: new Date().toISOString()
    }

    const updatedSchedule = [...currentSchedule, newItem]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSchedule))
    return true // 追加成功
  } catch (error) {
    console.error('撮影予定への追加エラー:', error)
    return false
  }
}

// 撮影予定から物件を削除
export const removeFromSchedule = (propertyId: number): boolean => {
  try {
    const currentSchedule = getScheduledProperties()
    const updatedSchedule = currentSchedule.filter(item => item.id !== propertyId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSchedule))
    return true
  } catch (error) {
    console.error('撮影予定からの削除エラー:', error)
    return false
  }
}

// 物件が撮影予定に追加されているかチェック
export const isInSchedule = (propertyId: number): boolean => {
  try {
    const currentSchedule = getScheduledProperties()
    return currentSchedule.some(item => item.id === propertyId)
  } catch (error) {
    console.error('撮影予定チェックエラー:', error)
    return false
  }
}

// 撮影予定をクリア（翌日のリセット用）
export const clearSchedule = (): boolean => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('撮影予定のクリアエラー:', error)
    return false
  }
}

// 撮影予定の件数を取得
export const getScheduleCount = (): number => {
  return getScheduledProperties().length
}

// 撮影完了時の自動削除（ステータスが「撮影済」になった物件を撮影予定から削除）
export const autoRemoveCompletedProperty = (propertyId: number): boolean => {
  try {
    const currentSchedule = getScheduledProperties()
    const wasInSchedule = currentSchedule.some(item => item.id === propertyId)
    
    if (wasInSchedule) {
      const updatedSchedule = currentSchedule.filter(item => item.id !== propertyId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSchedule))
      console.log(`撮影完了により物件ID ${propertyId} を撮影予定から自動削除しました`)
      return true
    }
    
    return false // 撮影予定にない場合はfalse
  } catch (error) {
    console.error('撮影完了時の自動削除エラー:', error)
    return false
  }
} 