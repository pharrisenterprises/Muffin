// ═══════════════════════════════════════════════════════════════════════════
// HEALING CACHE - Dexie-Based Persistent Storage
// ═══════════════════════════════════════════════════════════════════════════
// Stores successful healings for reuse - reduces API calls
// Independently wrapped with Dexie for persistence

import Dexie, { Table } from 'dexie';
import {
  HealingCacheEntry,
  HealingCacheConfig
} from './types';
import {
  DEFAULT_HEALING_CACHE_CONFIG,
  HEALING_DB_VERSION,
  HEALING_DB_NAME
} from './config';

/**
 * HealingCacheDB - Dexie database for healing cache
 */
class HealingCacheDB extends Dexie {
  healings!: Table<HealingCacheEntry, number>;
  
  constructor() {
    super(HEALING_DB_NAME);
    
    this.version(HEALING_DB_VERSION).stores({
      healings: '++id, cacheKey, pageURLPattern, stepType, fieldLabel, expiresAt, lastUsedAt'
    });
  }
}

/**
 * HealingCache - Manages cached healing results
 * 
 * FEATURES:
 * - Dexie-based persistent storage (survives browser restarts)
 * - LRU eviction when max entries reached
 * - Success rate tracking
 * - TTL expiration (24 hours)
 * - Composite cache key for accurate matching
 * 
 * INDEPENDENTLY WRAPPED:
 * - No dependencies on other healing modules
 * - Can be tested in isolation
 * - Clear API boundaries
 */
export class HealingCache {
  private db: HealingCacheDB;
  private config: HealingCacheConfig;
  private memoryCache: Map<string, HealingCacheEntry>;
  
  constructor(config?: Partial<HealingCacheConfig>) {
    this.config = { ...DEFAULT_HEALING_CACHE_CONFIG, ...config };
    this.db = new HealingCacheDB();
    this.memoryCache = new Map();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Get cached healing for a step
   * @param pageURLPattern Page URL pattern
   * @param stepType Step type (click, input, etc.)
   * @param fieldLabel Step label
   * @param selectorHash Hash of original selector
   * @returns Cached healing if valid, undefined otherwise
   */
  async get(
    pageURLPattern: string,
    stepType: string,
    fieldLabel: string,
    selectorHash: string
  ): Promise<HealingCacheEntry | undefined> {
    if (!this.config.enabled) return undefined;
    
    const cacheKey = this.createCacheKey(pageURLPattern, stepType, fieldLabel, selectorHash);
    
    // Check memory cache first
    const memoryCached = this.memoryCache.get(cacheKey);
    if (memoryCached && this.isValid(memoryCached)) {
      return memoryCached;
    }
    
    // Check Dexie
    try {
      const entry = await this.db.healings
        .where('cacheKey')
        .equals(cacheKey)
        .first();
      
      if (entry && this.isValid(entry)) {
        // Update memory cache
        this.memoryCache.set(cacheKey, entry);
        return entry;
      }
      
      // Clean up expired entry
      if (entry) {
        await this.delete(cacheKey);
      }
      
      return undefined;
    } catch (error) {
      console.error('[HealingCache] Get error:', error);
      return undefined;
    }
  }
  
  /**
   * Add or update cached healing
   * @param entry Cache entry to store
   */
  async set(entry: Omit<HealingCacheEntry, 'id' | 'cacheKey'>): Promise<void> {
    if (!this.config.enabled) return;
    
    const cacheKey = this.createCacheKey(
      entry.pageURLPattern,
      entry.stepType,
      entry.fieldLabel,
      entry.selectorHash
    );
    
    const fullEntry: HealingCacheEntry = {
      ...entry,
      cacheKey,
      createdAt: entry.createdAt || Date.now(),
      lastUsedAt: Date.now(),
      successCount: entry.successCount || 1,
      failureCount: entry.failureCount || 0,
      expiresAt: Date.now() + this.config.ttlMs
    };
    
    try {
      // Check for existing
      const existing = await this.db.healings
        .where('cacheKey')
        .equals(cacheKey)
        .first();
      
      if (existing) {
        // Update existing
        await this.db.healings.update(existing.id!, {
          ...fullEntry,
          successCount: existing.successCount + 1,
          createdAt: existing.createdAt
        });
      } else {
        // Add new
        await this.db.healings.add(fullEntry);
        
        // Check if eviction needed
        await this.evictIfNeeded();
      }
      
      // Update memory cache
      this.memoryCache.set(cacheKey, fullEntry);
    } catch (error) {
      console.error('[HealingCache] Set error:', error);
    }
  }
  
  /**
   * Record successful use of cached healing
   * @param cacheKey Cache key
   */
  async recordSuccess(cacheKey: string): Promise<void> {
    try {
      const entry = await this.db.healings
        .where('cacheKey')
        .equals(cacheKey)
        .first();
      
      if (entry) {
        await this.db.healings.update(entry.id!, {
          successCount: entry.successCount + 1,
          lastUsedAt: Date.now(),
          expiresAt: Date.now() + this.config.ttlMs // Extend TTL
        });
        
        // Update memory cache
        const cached = this.memoryCache.get(cacheKey);
        if (cached) {
          cached.successCount++;
          cached.lastUsedAt = Date.now();
          cached.expiresAt = Date.now() + this.config.ttlMs;
        }
      }
    } catch (error) {
      console.error('[HealingCache] Record success error:', error);
    }
  }
  
  /**
   * Record failed use of cached healing
   * @param cacheKey Cache key
   */
  async recordFailure(cacheKey: string): Promise<void> {
    try {
      const entry = await this.db.healings
        .where('cacheKey')
        .equals(cacheKey)
        .first();
      
      if (entry) {
        const newFailureCount = entry.failureCount + 1;
        
        // Check if success rate too low - delete if so
        const successRate = entry.successCount / (entry.successCount + newFailureCount);
        
        if (successRate < this.config.minSuccessRate && newFailureCount >= 3) {
          await this.delete(cacheKey);
        } else {
          await this.db.healings.update(entry.id!, {
            failureCount: newFailureCount,
            lastUsedAt: Date.now()
          });
          
          // Update memory cache
          const cached = this.memoryCache.get(cacheKey);
          if (cached) {
            cached.failureCount = newFailureCount;
            cached.lastUsedAt = Date.now();
          }
        }
      }
    } catch (error) {
      console.error('[HealingCache] Record failure error:', error);
    }
  }
  
  /**
   * Delete cached healing
   * @param cacheKey Cache key
   */
  async delete(cacheKey: string): Promise<void> {
    try {
      await this.db.healings
        .where('cacheKey')
        .equals(cacheKey)
        .delete();
      
      this.memoryCache.delete(cacheKey);
    } catch (error) {
      console.error('[HealingCache] Delete error:', error);
    }
  }
  
  /**
   * Clear all cached healings
   */
  async clear(): Promise<void> {
    try {
      await this.db.healings.clear();
      this.memoryCache.clear();
    } catch (error) {
      console.error('[HealingCache] Clear error:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    averageSuccessRate: number;
  }> {
    try {
      const all = await this.db.healings.toArray();
      const now = Date.now();
      
      let validCount = 0;
      let expiredCount = 0;
      let totalSuccessRate = 0;
      
      for (const entry of all) {
        if (entry.expiresAt > now) {
          validCount++;
          const rate = entry.successCount / (entry.successCount + entry.failureCount);
          totalSuccessRate += rate;
        } else {
          expiredCount++;
        }
      }
      
      return {
        totalEntries: all.length,
        validEntries: validCount,
        expiredEntries: expiredCount,
        averageSuccessRate: validCount > 0 ? totalSuccessRate / validCount : 0
      };
    } catch (error) {
      console.error('[HealingCache] Get stats error:', error);
      return {
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        averageSuccessRate: 0
      };
    }
  }
  
  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    try {
      const now = Date.now();
      
      const deleted = await this.db.healings
        .where('expiresAt')
        .below(now)
        .delete();
      
      // Clean memory cache
      for (const [key, entry] of this.memoryCache) {
        if (entry.expiresAt <= now) {
          this.memoryCache.delete(key);
        }
      }
      
      return deleted;
    } catch (error) {
      console.error('[HealingCache] Cleanup error:', error);
      return 0;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Create composite cache key
   */
  private createCacheKey(
    pageURLPattern: string,
    stepType: string,
    fieldLabel: string,
    selectorHash: string
  ): string {
    return `${pageURLPattern}:${stepType}:${fieldLabel}:${selectorHash}`;
  }
  
  /**
   * Check if cache entry is valid
   */
  private isValid(entry: HealingCacheEntry): boolean {
    // Check expiration
    if (entry.expiresAt <= Date.now()) {
      return false;
    }
    
    // Check success rate
    const totalAttempts = entry.successCount + entry.failureCount;
    if (totalAttempts >= 3) {
      const successRate = entry.successCount / totalAttempts;
      if (successRate < this.config.minSuccessRate) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Evict oldest entries if max reached (LRU)
   */
  private async evictIfNeeded(): Promise<void> {
    try {
      const count = await this.db.healings.count();
      
      if (count > this.config.maxEntries) {
        // Delete oldest entries (by lastUsedAt)
        const toDelete = count - this.config.maxEntries + 10; // Delete a few extra
        
        const oldest = await this.db.healings
          .orderBy('lastUsedAt')
          .limit(toDelete)
          .primaryKeys();
        
        await this.db.healings.bulkDelete(oldest);
        
        // Clean memory cache
        for (const key of this.memoryCache.keys()) {
          const entry = this.memoryCache.get(key);
          if (entry && oldest.includes(entry.id!)) {
            this.memoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('[HealingCache] Eviction error:', error);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create HealingCache instance
 * @param config Optional configuration
 * @returns Configured cache instance
 */
export function createHealingCache(
  config?: Partial<HealingCacheConfig>
): HealingCache {
  return new HealingCache(config);
}
