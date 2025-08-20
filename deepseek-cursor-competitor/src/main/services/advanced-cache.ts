import { EventEmitter } from 'events'
import * as crypto from 'crypto'

export interface CacheEntry<T = any> {
  key: string
  value: T
  timestamp: Date
  accessCount: number
  lastAccessed: Date
  ttl?: number // Time to live in milliseconds
  tags?: string[]
  size?: number // Estimated size in bytes
}

export interface CacheStats {
  totalEntries: number
  totalSize: number // bytes
  hitRate: number // percentage
  totalHits: number
  totalMisses: number
  oldestEntry?: Date
  newestEntry?: Date
  avgAccessCount: number
}

export interface CacheConfiguration {
  maxEntries: number
  maxSize: number // bytes
  defaultTtl: number // milliseconds
  cleanupInterval: number // milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'ttl'
}

/**
 * Advanced multi-level caching system for IDE performance optimization
 * Provides intelligent caching for LSP responses, context data, and AI results
 */
export class AdvancedCacheService extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map()
  private accessOrder: string[] = [] // For LRU
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalAccesses: 0
  }
  
  private config: CacheConfiguration = {
    maxEntries: 10000,
    maxSize: 100 * 1024 * 1024, // 100MB
    defaultTtl: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    evictionPolicy: 'lru'
  }
  
  private cleanupTimer: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(config?: Partial<CacheConfiguration>) {
    super()
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Start the cache service
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.startCleanupTimer()
    this.emit('started')
  }

  /**
   * Stop the cache service
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    this.stopCleanupTimer()
    this.emit('stopped')
  }

  /**
   * Get value from cache
   */
  get<T = any>(key: string): T | undefined {
    this.stats.totalAccesses++
    
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      this.emit('miss', key)
      return undefined
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.delete(key)
      this.stats.misses++
      this.emit('miss', key)
      return undefined
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = new Date()
    
    // Update LRU order
    this.updateAccessOrder(key)
    
    this.stats.hits++
    this.emit('hit', key, entry.value)
    
    return entry.value as T
  }

  /**
   * Set value in cache
   */
  set<T = any>(
    key: string, 
    value: T, 
    options?: {
      ttl?: number
      tags?: string[]
      priority?: 'low' | 'medium' | 'high'
    }
  ): void {
    const size = this.estimateSize(value)
    const ttl = options?.ttl || this.config.defaultTtl
    
    // Check if we need to evict entries
    this.ensureCapacity(size)
    
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: new Date(),
      accessCount: 1,
      lastAccessed: new Date(),
      ttl,
      tags: options?.tags,
      size
    }
    
    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.delete(key, false)
    }
    
    this.cache.set(key, entry)
    this.updateAccessOrder(key)
    
    this.emit('set', key, value, entry)
  }

  /**
   * Delete entry from cache
   */
  delete(key: string, emit = true): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    this.cache.delete(key)
    this.removeFromAccessOrder(key)
    
    if (emit) {
      this.emit('delete', key, entry)
    }
    
    return true
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const count = this.cache.size
    this.cache.clear()
    this.accessOrder = []
    this.emit('cleared', count)
  }

  /**
   * Get or set with a factory function
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    options?: {
      ttl?: number
      tags?: string[]
      priority?: 'low' | 'medium' | 'high'
    }
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== undefined) {
      return cached
    }
    
    const value = await factory()
    this.set(key, value, options)
    return value
  }

  /**
   * Invalidate entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let count = 0
    const toDelete: string[] = []
    
    for (const [key, entry] of this.cache) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        toDelete.push(key)
      }
    }
    
    for (const key of toDelete) {
      this.delete(key)
      count++
    }
    
    this.emit('invalidatedByTags', tags, count)
    return count
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalSize = 0
    let oldestEntry: Date | undefined
    let newestEntry: Date | undefined
    let totalAccessCount = 0
    
    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0
      totalAccessCount += entry.accessCount
      
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp
      }
      
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp
      }
    }
    
    const hitRate = this.stats.totalAccesses > 0 
      ? (this.stats.hits / this.stats.totalAccesses) * 100 
      : 0
    
    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry,
      newestEntry,
      avgAccessCount: this.cache.size > 0 ? Math.round(totalAccessCount / this.cache.size) : 0
    }
  }

  /**
   * Get cache entries by pattern
   */
  getByPattern(pattern: string): Array<{ key: string; value: any }> {
    const regex = new RegExp(pattern)
    const results: Array<{ key: string; value: any }> = []
    
    for (const [key, entry] of this.cache) {
      if (regex.test(key)) {
        results.push({ key, value: entry.value })
      }
    }
    
    return results
  }

  /**
   * Warm up cache with data
   */
  async warmUp(
    dataProvider: () => Promise<Array<{ key: string; value: any; options?: any }>>
  ): Promise<number> {
    try {
      const data = await dataProvider()
      let count = 0
      
      for (const item of data) {
        this.set(item.key, item.value, item.options)
        count++
      }
      
      this.emit('warmedUp', count)
      return count
      
    } catch (error) {
      this.emit('warmUpError', error)
      return 0
    }
  }

  /**
   * Export cache data
   */
  export(): Array<{ key: string; value: any; metadata: Omit<CacheEntry, 'value'> }> {
    const exported: Array<{ key: string; value: any; metadata: Omit<CacheEntry, 'value'> }> = []
    
    for (const [key, entry] of this.cache) {
      const { value, ...metadata } = entry
      exported.push({ key, value, metadata })
    }
    
    return exported
  }

  /**
   * Import cache data
   */
  import(data: Array<{ key: string; value: any; metadata?: any }>): number {
    let count = 0
    
    for (const item of data) {
      this.set(item.key, item.value, {
        ttl: item.metadata?.ttl,
        tags: item.metadata?.tags
      })
      count++
    }
    
    this.emit('imported', count)
    return count
  }

  /**
   * Private methods
   */
  private estimateSize(value: any): number {
    try {
      return Buffer.byteLength(JSON.stringify(value), 'utf8')
    } catch {
      return 1024 // Default estimate
    }
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    
    // Add to end (most recently used)
    this.accessOrder.push(key)
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  private ensureCapacity(newEntrySize: number): void {
    // Check entry count limit
    while (this.cache.size >= this.config.maxEntries) {
      this.evictOne()
    }
    
    // Check size limit
    const currentSize = this.getCurrentSize()
    if (currentSize + newEntrySize > this.config.maxSize) {
      const bytesToFree = (currentSize + newEntrySize) - this.config.maxSize
      this.evictBySize(bytesToFree)
    }
  }

  private getCurrentSize(): number {
    let size = 0
    for (const entry of this.cache.values()) {
      size += entry.size || 0
    }
    return size
  }

  private evictOne(): void {
    let keyToEvict: string | undefined
    
    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder[0] // Least recently used
        break
        
      case 'lfu':
        let minAccessCount = Infinity
        for (const [key, entry] of this.cache) {
          if (entry.accessCount < minAccessCount) {
            minAccessCount = entry.accessCount
            keyToEvict = key
          }
        }
        break
        
      case 'ttl':
        let oldestTime = Infinity
        for (const [key, entry] of this.cache) {
          const age = Date.now() - entry.timestamp.getTime()
          if (age > oldestTime) {
            oldestTime = age
            keyToEvict = key
          }
        }
        break
    }
    
    if (keyToEvict) {
      this.delete(keyToEvict)
      this.stats.evictions++
      this.emit('evicted', keyToEvict, this.config.evictionPolicy)
    }
  }

  private evictBySize(bytesToFree: number): void {
    let freedBytes = 0
    const keysToEvict: string[] = []
    
    // Sort by eviction policy preference
    const sortedKeys = Array.from(this.cache.keys()).sort((a, b) => {
      const entryA = this.cache.get(a)!
      const entryB = this.cache.get(b)!
      
      switch (this.config.evictionPolicy) {
        case 'lru':
          return this.accessOrder.indexOf(a) - this.accessOrder.indexOf(b)
        case 'lfu':
          return entryA.accessCount - entryB.accessCount
        case 'ttl':
          return entryA.timestamp.getTime() - entryB.timestamp.getTime()
        default:
          return 0
      }
    })
    
    for (const key of sortedKeys) {
      if (freedBytes >= bytesToFree) break
      
      const entry = this.cache.get(key)
      if (entry) {
        freedBytes += entry.size || 0
        keysToEvict.push(key)
      }
    }
    
    for (const key of keysToEvict) {
      this.delete(key)
      this.stats.evictions++
    }
    
    this.emit('evictedBySize', keysToEvict.length, freedBytes)
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    for (const [key, entry] of this.cache) {
      if (entry.ttl && now - entry.timestamp.getTime() > entry.ttl) {
        expiredKeys.push(key)
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key)
    }
    
    if (expiredKeys.length > 0) {
      this.emit('cleanup', expiredKeys.length)
    }
  }

  /**
   * Helper methods for specific use cases
   */
  
  /**
   * Cache LSP responses
   */
  cacheLSPResponse(method: string, params: any, response: any, ttl = 5 * 60 * 1000): void {
    const key = `lsp:${method}:${this.hashParams(params)}`
    this.set(key, response, { ttl, tags: ['lsp'] })
  }

  /**
   * Get cached LSP response
   */
  getCachedLSPResponse<T = any>(method: string, params: any): T | undefined {
    const key = `lsp:${method}:${this.hashParams(params)}`
    return this.get<T>(key)
  }

  /**
   * Cache context data
   */
  cacheContext(query: string, context: any, ttl = 10 * 60 * 1000): void {
    const key = `context:${crypto.createHash('md5').update(query).digest('hex')}`
    this.set(key, context, { ttl, tags: ['context'] })
  }

  /**
   * Get cached context
   */
  getCachedContext<T = any>(query: string): T | undefined {
    const key = `context:${crypto.createHash('md5').update(query).digest('hex')}`
    return this.get<T>(key)
  }

  /**
   * Cache AI responses
   */
  cacheAIResponse(prompt: string, response: any, ttl = 30 * 60 * 1000): void {
    const key = `ai:${crypto.createHash('md5').update(prompt).digest('hex')}`
    this.set(key, response, { ttl, tags: ['ai'] })
  }

  /**
   * Get cached AI response
   */
  getCachedAIResponse<T = any>(prompt: string): T | undefined {
    const key = `ai:${crypto.createHash('md5').update(prompt).digest('hex')}`
    return this.get<T>(key)
  }

  private hashParams(params: any): string {
    return crypto.createHash('md5').update(JSON.stringify(params)).digest('hex')
  }
}
