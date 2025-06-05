interface CacheItem<T> {
  data: T
  timestamp: number
  expires: number
}

interface PropertiesCache {
  allProperties: Property[]
  keyAgents: KeyAgent[]
  users: any[]
  timestamp: number
}

// キャッシュ設定
const CACHE_CONFIG = {
  PROPERTIES_TTL: 5 * 60 * 1000,      // 5分
  KEY_AGENTS_TTL: 10 * 60 * 1000,     // 10分  
  USERS_TTL: 15 * 60 * 1000,          // 15分
  MVP_TTL: 2 * 60 * 1000,             // 2分
  CHAT_TTL: 30 * 1000,                // 30秒
} as const

class DataCacheManager {
  private cache = new Map<string, CacheItem<any>>()
  private propertiesCache: PropertiesCache | null = null

  // メインデータを一括取得・キャッシュ
  async getMainData(): Promise<PropertiesCache> {
    const now = Date.now()
    
    // キャッシュが有効なら返す
    if (this.propertiesCache && (now - this.propertiesCache.timestamp) < CACHE_CONFIG.PROPERTIES_TTL) {
      return this.propertiesCache
    }

    // 並列で一括取得
    try {
      const [propertiesRes, keyAgentsRes, usersRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/key-agents'), 
        fetch('/api/users')
      ])

      const [properties, keyAgents, users] = await Promise.all([
        propertiesRes.json(),
        keyAgentsRes.json(),
        usersRes.json()
      ])

      this.propertiesCache = {
        allProperties: properties.properties || properties,
        keyAgents: keyAgents || [],
        users: users || [],
        timestamp: now
      }

      return this.propertiesCache
    } catch (error) {
      console.error('Failed to fetch main data:', error)
      // フォールバック: 古いキャッシュを返す
      if (this.propertiesCache) {
        return this.propertiesCache
      }
      throw error
    }
  }

  // 物件をIDで高速取得
  async getPropertyById(id: number): Promise<Property | null> {
    const data = await this.getMainData()
    return data.allProperties.find(p => p.id === id) || null
  }

  // 業者を電話番号で高速取得
  async getKeyAgentByPhone(phone: string): Promise<KeyAgent | null> {
    const data = await this.getMainData()
    return data.keyAgents.find(a => a.phone_number === phone) || null
  }

  // 軽量データのキャッシュ
  async getCachedData<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(key)

    if (cached && now < cached.expires) {
      return cached.data
    }

    const data = await fetcher()
    this.cache.set(key, {
      data,
      timestamp: now,
      expires: now + ttl
    })

    return data
  }

  // キャッシュクリア
  invalidateCache(key?: string) {
    if (key) {
      this.cache.delete(key)
      if (key === 'properties') {
        this.propertiesCache = null
      }
    } else {
      this.cache.clear()
      this.propertiesCache = null
    }
  }

  // メモリ使用量の最適化
  cleanup() {
    const now = Date.now()
    
    // 期限切れのキャッシュを削除
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }

    // プロパティキャッシュの期限チェック
    if (this.propertiesCache && (now - this.propertiesCache.timestamp) > CACHE_CONFIG.PROPERTIES_TTL) {
      this.propertiesCache = null
    }
  }
}

// シングルトンインスタンス
export const dataCache = new DataCacheManager()

// 定期的なクリーンアップ
if (typeof window !== 'undefined') {
  setInterval(() => dataCache.cleanup(), 60000) // 1分毎
}

// 型定義
interface Property {
  id: number
  property_name: string
  room_number: string
  address: string
  latitude: number
  longitude: number
  status: string
  key_agent_phone?: string
  key_rental_status?: string
  // ... 他の属性
}

interface KeyAgent {
  phone_number: string
  agent_name: string
  address: string
  latitude: number
  longitude: number
} 