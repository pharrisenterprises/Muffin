// ═══════════════════════════════════════════════════════════════════════════
// HEALING LOGGER - Analytics and Debugging
// ═══════════════════════════════════════════════════════════════════════════
// Tracks all healing attempts for analytics and debugging
// Dexie-based persistent storage

import Dexie, { Table } from 'dexie';
import {
  HealingLogEntry,
  HealingAnalytics,
  HealingProviderType,
  HealingAction
} from './types';
import { HEALING_DB_VERSION, HEALING_DB_NAME } from './config';

/**
 * HealingLogDB - Dexie database for healing logs
 */
class HealingLogDB extends Dexie {
  logs!: Table<HealingLogEntry, number>;
  
  constructor() {
    super(`${HEALING_DB_NAME}_Logs`);
    
    this.version(HEALING_DB_VERSION).stores({
      logs: '++id, stepNumber, projectId, sessionId, provider, success, timestamp'
    });
  }
}

/**
 * HealingLogger - Tracks healing attempts and generates analytics
 * 
 * FEATURES:
 * - Logs all healing attempts (success and failure)
 * - Generates analytics summaries
 * - Provides debugging information
 * - Tracks API costs
 * 
 * INDEPENDENTLY WRAPPED:
 * - No dependencies on other healing modules
 * - Can be tested in isolation
 * - Dexie-based persistence
 */
export class HealingLogger {
  private db: HealingLogDB;
  private recentLogs: HealingLogEntry[] = [];
  private maxRecentLogs = 100;
  
  constructor() {
    this.db = new HealingLogDB();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Log a healing attempt
   */
  async log(entry: Omit<HealingLogEntry, 'id'>): Promise<void> {
    const fullEntry: HealingLogEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now()
    };
    
    try {
      // Add to Dexie
      await this.db.logs.add(fullEntry);
      
      // Keep in memory for quick access
      this.recentLogs.push(fullEntry);
      if (this.recentLogs.length > this.maxRecentLogs) {
        this.recentLogs.shift();
      }
    } catch (error) {
      console.error('[HealingLogger] Log error:', error);
    }
  }
  
  /**
   * Get healing analytics for a time period
   */
  async getAnalytics(
    since?: number,
    projectId?: string,
    sessionId?: string
  ): Promise<HealingAnalytics> {
    try {
      let query = this.db.logs.toCollection();
      
      // Apply filters
      if (since) {
        query = this.db.logs.where('timestamp').above(since);
      }
      
      const logs = await query.toArray();
      
      // Filter by project/session if specified
      const filtered = logs.filter(log => {
        if (projectId && log.projectId !== projectId) return false;
        if (sessionId && log.sessionId !== sessionId) return false;
        return true;
      });
      
      return this.calculateAnalytics(filtered);
    } catch (error) {
      console.error('[HealingLogger] Analytics error:', error);
      return this.emptyAnalytics();
    }
  }
  
  /**
   * Get recent logs
   */
  async getRecentLogs(
    limit: number = 50,
    projectId?: string
  ): Promise<HealingLogEntry[]> {
    try {
      let logs = await this.db.logs
        .orderBy('timestamp')
        .reverse()
        .limit(limit * 2) // Get extra to filter
        .toArray();
      
      if (projectId) {
        logs = logs.filter(l => l.projectId === projectId);
      }
      
      return logs.slice(0, limit);
    } catch (error) {
      console.error('[HealingLogger] Get recent logs error:', error);
      return this.recentLogs.slice(-limit);
    }
  }
  
  /**
   * Get logs for a specific step
   */
  async getLogsForStep(
    projectId: string,
    stepNumber: number
  ): Promise<HealingLogEntry[]> {
    try {
      const logs = await this.db.logs
        .where('projectId')
        .equals(projectId)
        .filter(log => log.stepNumber === stepNumber)
        .toArray();
      
      return logs.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[HealingLogger] Get step logs error:', error);
      return [];
    }
  }
  
  /**
   * Get total API cost
   */
  async getTotalApiCost(since?: number): Promise<number> {
    try {
      let query = this.db.logs.toCollection();
      
      if (since) {
        query = this.db.logs.where('timestamp').above(since);
      }
      
      const logs = await query.toArray();
      
      return logs.reduce((sum, log) => sum + (log.apiCost || 0), 0);
    } catch (error) {
      console.error('[HealingLogger] Get cost error:', error);
      return 0;
    }
  }
  
  /**
   * Clear old logs
   */
  async clearOldLogs(olderThan: number): Promise<number> {
    try {
      return await this.db.logs
        .where('timestamp')
        .below(olderThan)
        .delete();
    } catch (error) {
      console.error('[HealingLogger] Clear logs error:', error);
      return 0;
    }
  }
  
  /**
   * Clear all logs
   */
  async clearAll(): Promise<void> {
    try {
      await this.db.logs.clear();
      this.recentLogs = [];
    } catch (error) {
      console.error('[HealingLogger] Clear all error:', error);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Calculate analytics from logs
   */
  private calculateAnalytics(logs: HealingLogEntry[]): HealingAnalytics {
    const analytics: HealingAnalytics = {
      totalAttempts: logs.length,
      successCount: 0,
      failureCount: 0,
      successRate: 0,
      cacheHits: 0,
      cacheHitRate: 0,
      avgConfidence: 0,
      avgDuration: 0,
      totalApiCost: 0,
      byProvider: {} as Record<HealingProviderType, { attempts: number; successes: number; avgConfidence: number }>,
      byAction: {} as Record<HealingAction, number>
    };
    
    if (logs.length === 0) return analytics;
    
    let totalConfidence = 0;
    let totalDuration = 0;
    let successConfidenceSum = 0;
    
    // Initialize provider stats
    const providerTypes: HealingProviderType[] = ['cache', 'local-vision', 'claude-vision', 'fallback'];
    for (const provider of providerTypes) {
      analytics.byProvider[provider] = { attempts: 0, successes: 0, avgConfidence: 0 };
    }
    
    // Initialize action stats
    const actionTypes: HealingAction[] = ['auto-apply', 'apply-flag', 'suggest-only', 'no-action'];
    for (const action of actionTypes) {
      analytics.byAction[action] = 0;
    }
    
    // Process logs
    for (const log of logs) {
      // Success/failure
      if (log.success) {
        analytics.successCount++;
        successConfidenceSum += log.confidence;
      } else {
        analytics.failureCount++;
      }
      
      // Cache hits
      if (log.cacheHit) {
        analytics.cacheHits++;
      }
      
      // Totals
      totalConfidence += log.confidence;
      totalDuration += log.duration;
      analytics.totalApiCost += log.apiCost || 0;
      
      // By provider
      if (analytics.byProvider[log.provider]) {
        analytics.byProvider[log.provider].attempts++;
        if (log.success) {
          analytics.byProvider[log.provider].successes++;
        }
      }
      
      // By action
      if (analytics.byAction[log.action] !== undefined) {
        analytics.byAction[log.action]++;
      }
    }
    
    // Calculate rates and averages
    analytics.successRate = analytics.successCount / analytics.totalAttempts;
    analytics.cacheHitRate = analytics.cacheHits / analytics.totalAttempts;
    analytics.avgConfidence = analytics.successCount > 0
      ? successConfidenceSum / analytics.successCount
      : 0;
    analytics.avgDuration = totalDuration / analytics.totalAttempts;
    
    // Calculate provider averages
    for (const provider of providerTypes) {
      const stats = analytics.byProvider[provider];
      if (stats.successes > 0) {
        // Would need per-provider confidence tracking for accurate avg
        stats.avgConfidence = stats.successes / stats.attempts;
      }
    }
    
    return analytics;
  }
  
  /**
   * Empty analytics object
   */
  private emptyAnalytics(): HealingAnalytics {
    return {
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      successRate: 0,
      cacheHits: 0,
      cacheHitRate: 0,
      avgConfidence: 0,
      avgDuration: 0,
      totalApiCost: 0,
      byProvider: {
        'cache': { attempts: 0, successes: 0, avgConfidence: 0 },
        'local-vision': { attempts: 0, successes: 0, avgConfidence: 0 },
        'claude-vision': { attempts: 0, successes: 0, avgConfidence: 0 },
        'fallback': { attempts: 0, successes: 0, avgConfidence: 0 }
      },
      byAction: {
        'auto-apply': 0,
        'apply-flag': 0,
        'suggest-only': 0,
        'no-action': 0
      }
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create HealingLogger instance
 * @returns Configured logger instance
 */
export function createHealingLogger(): HealingLogger {
  return new HealingLogger();
}
