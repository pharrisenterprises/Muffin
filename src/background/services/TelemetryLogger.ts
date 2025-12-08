/**
 * @fileoverview Telemetry Logger Service
 * @description Collects and stores telemetry data about strategy execution.
 * Tracks which strategies succeed/fail, confidence scores, execution times.
 * Uses IndexedDB for persistent storage and analytics.
 * 
 * @module services/TelemetryLogger
 * @version 1.0.0
 * @since Phase 4
 */

import type { StrategyType } from '../../types';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

/**
 * Telemetry logger configuration.
 */
export interface TelemetryLoggerConfig {
  enabled: boolean;
  maxEvents: number;
  retentionDays: number;
  batchSize: number;
  flushIntervalMs: number;
  dbName: string;
}

const DEFAULT_CONFIG: TelemetryLoggerConfig = {
  enabled: true,
  maxEvents: 10000,
  retentionDays: 30,
  batchSize: 10,
  flushIntervalMs: 5000,
  dbName: 'muffin_telemetry'
};

/**
 * Strategy evaluation result.
 */
export interface StrategyEvaluation {
  type: StrategyType;
  found: boolean;
  confidence: number;
  duration: number;
  error?: string;
}

/**
 * Telemetry event for a single action.
 */
export interface TelemetryEvent {
  id: string;
  runId: string;
  stepIndex: number;
  actionType: 'click' | 'type' | 'select' | 'navigate' | 'scroll';
  timestamp: number;
  strategiesEvaluated: StrategyEvaluation[];
  usedStrategy: StrategyType;
  usedConfidence: number;
  success: boolean;
  error?: string;
  duration: number;
  pageDomain: string;
}

/**
 * Aggregated metrics for a strategy type.
 */
export interface StrategyMetrics {
  type: StrategyType;
  totalEvaluations: number;
  timesFound: number;
  timesUsed: number;
  timesSucceeded: number;
  averageConfidence: number;
  averageEvaluationTime: number;
  successRate: number;
  findRate: number;
}

/**
 * Summary of a test run.
 */
export interface RunSummary {
  runId: string;
  startTime: number;
  endTime: number;
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  passRate: number;
  strategyUsage: Partial<Record<StrategyType, number>>;
  averageStepDuration: number;
  domains: string[];
}

/**
 * Time range filter.
 */
export interface TimeRange {
  start: number;
  end: number;
}

/**
 * Query options for retrieving events.
 */
export interface TelemetryQueryOptions {
  runId?: string;
  strategyType?: StrategyType;
  success?: boolean;
  timeRange?: TimeRange;
  limit?: number;
  offset?: number;
}

/**
 * Active run tracking.
 */
export interface ActiveRun {
  runId: string;
  startTime: number;
  stepsCompleted: number;
  currentStep: number;
}

// ============================================================================
// SECTION 2: TELEMETRY LOGGER CLASS
// ============================================================================

export class TelemetryLogger {
  private config: TelemetryLoggerConfig;
  private db: IDBDatabase | null = null;
  private eventBuffer: TelemetryEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private activeRuns: Map<string, ActiveRun> = new Map();
  private pendingActions: Map<string, Partial<TelemetryEvent>> = new Map();
  private initPromise: Promise<void> | null = null;

  constructor(config?: Partial<TelemetryLoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.openDatabase();
    await this.initPromise;

    this.scheduleFlush();
    console.log('[TelemetryLogger] Initialized');
  }

  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, 1);

      request.onerror = () => {
        console.error('[TelemetryLogger] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Events store
        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('runId', 'runId', { unique: false });
          eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventsStore.createIndex('usedStrategy', 'usedStrategy', { unique: false });
          eventsStore.createIndex('success', 'success', { unique: false });
        }

        // Runs store
        if (!db.objectStoreNames.contains('runs')) {
          const runsStore = db.createObjectStore('runs', { keyPath: 'runId' });
          runsStore.createIndex('startTime', 'startTime', { unique: false });
        }
      };
    });
  }

  // ==========================================================================
  // RUN MANAGEMENT
  // ==========================================================================

  startRun(runId?: string): string {
    const id = runId ?? this.generateId();

    this.activeRuns.set(id, {
      runId: id,
      startTime: Date.now(),
      stepsCompleted: 0,
      currentStep: 0
    });

    console.log(`[TelemetryLogger] Started run: ${id}`);
    return id;
  }

  async endRun(runId: string): Promise<RunSummary> {
    await this.flush();

    const activeRun = this.activeRuns.get(runId);
    const endTime = Date.now();

    // Get all events for this run
    const events = await this.getEvents({ runId });

    // Calculate summary
    const successfulSteps = events.filter(e => e.success).length;
    const totalSteps = events.length;

    const strategyUsage: Partial<Record<StrategyType, number>> = {};
    const domains = new Set<string>();
    let totalDuration = 0;

    for (const event of events) {
      strategyUsage[event.usedStrategy] = (strategyUsage[event.usedStrategy] ?? 0) + 1;
      domains.add(event.pageDomain);
      totalDuration += event.duration;
    }

    const summary: RunSummary = {
      runId,
      startTime: activeRun?.startTime ?? endTime,
      endTime,
      totalSteps,
      successfulSteps,
      failedSteps: totalSteps - successfulSteps,
      passRate: totalSteps > 0 ? successfulSteps / totalSteps : 0,
      strategyUsage,
      averageStepDuration: totalSteps > 0 ? totalDuration / totalSteps : 0,
      domains: Array.from(domains)
    };

    // Store summary
    if (this.db) {
      const transaction = this.db.transaction(['runs'], 'readwrite');
      const store = transaction.objectStore('runs');
      store.put(summary);
    }

    this.activeRuns.delete(runId);
    console.log(`[TelemetryLogger] Ended run: ${runId}, pass rate: ${(summary.passRate * 100).toFixed(1)}%`);

    return summary;
  }

  // ==========================================================================
  // ACTION TRACKING
  // ==========================================================================

  startAction(data: {
    runId?: string;
    stepIndex?: number;
    actionType: TelemetryEvent['actionType'];
    pageDomain?: string;
  }): string {
    const actionId = this.generateId();

    this.pendingActions.set(actionId, {
      id: actionId,
      runId: data.runId ?? 'default',
      stepIndex: data.stepIndex ?? 0,
      actionType: data.actionType,
      timestamp: Date.now(),
      pageDomain: data.pageDomain ?? 'unknown',
      strategiesEvaluated: []
    });

    return actionId;
  }

  async endAction(
    actionId: string,
    result: {
      success: boolean;
      usedStrategy?: StrategyType;
      confidence?: number;
      evaluationResults?: { results: StrategyEvaluation[] };
      executionDuration?: number;
      error?: string;
    }
  ): Promise<void> {
    const pending = this.pendingActions.get(actionId);
    if (!pending) {
      console.warn(`[TelemetryLogger] No pending action found: ${actionId}`);
      return;
    }

    const event: TelemetryEvent = {
      id: pending.id ?? actionId,
      runId: pending.runId ?? 'default',
      stepIndex: pending.stepIndex ?? 0,
      actionType: pending.actionType ?? 'click',
      timestamp: pending.timestamp ?? Date.now(),
      strategiesEvaluated: result.evaluationResults?.results ?? [],
      usedStrategy: result.usedStrategy ?? 'dom_selector',
      usedConfidence: result.confidence ?? 0,
      success: result.success,
      error: result.error,
      duration: result.executionDuration ?? (Date.now() - (pending.timestamp ?? Date.now())),
      pageDomain: pending.pageDomain ?? 'unknown'
    };

    this.pendingActions.delete(actionId);
    await this.logEvent(event);

    // Update active run
    const activeRun = this.activeRuns.get(event.runId);
    if (activeRun) {
      activeRun.stepsCompleted++;
      activeRun.currentStep = event.stepIndex;
    }
  }

  // ==========================================================================
  // EVENT LOGGING
  // ==========================================================================

  async logEvent(event: TelemetryEvent | Omit<TelemetryEvent, 'id'>): Promise<string> {
    if (!this.config.enabled) return '';

    const fullEvent: TelemetryEvent = {
      ...event,
      id: 'id' in event ? event.id : this.generateId()
    };

    this.eventBuffer.push(fullEvent);

    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flush();
    }

    return fullEvent.id;
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  async getEvents(options?: TelemetryQueryOptions): Promise<TelemetryEvent[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction(['events'], 'readonly');
      const store = transaction.objectStore('events');
      const request = store.getAll();

      request.onsuccess = () => {
        let events = request.result as TelemetryEvent[];

        // Apply filters
        if (options?.runId) {
          events = events.filter(e => e.runId === options.runId);
        }
        if (options?.strategyType) {
          events = events.filter(e => e.usedStrategy === options.strategyType);
        }
        if (options?.success !== undefined) {
          events = events.filter(e => e.success === options.success);
        }
        if (options?.timeRange) {
          events = events.filter(
            e => e.timestamp >= options.timeRange!.start && e.timestamp <= options.timeRange!.end
          );
        }

        // Sort by timestamp descending
        events.sort((a, b) => b.timestamp - a.timestamp);

        // Apply pagination
        if (options?.offset) {
          events = events.slice(options.offset);
        }
        if (options?.limit) {
          events = events.slice(0, options.limit);
        }

        resolve(events);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getRunSummary(runId: string): Promise<RunSummary | null> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction(['runs'], 'readonly');
      const store = transaction.objectStore('runs');
      const request = store.get(runId);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async getRunSummaries(timeRange?: TimeRange): Promise<RunSummary[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction(['runs'], 'readonly');
      const store = transaction.objectStore('runs');
      const request = store.getAll();

      request.onsuccess = () => {
        let runs = request.result as RunSummary[];

        if (timeRange) {
          runs = runs.filter(
            r => r.startTime >= timeRange.start && r.startTime <= timeRange.end
          );
        }

        runs.sort((a, b) => b.startTime - a.startTime);
        resolve(runs);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ==========================================================================
  // METRICS
  // ==========================================================================

  async getStrategyMetrics(timeRange?: TimeRange): Promise<StrategyMetrics[]> {
    const events = await this.getEvents({ timeRange });

    const strategyTypes: StrategyType[] = [
      'cdp_semantic',
      'cdp_power',
      'dom_selector',
      'css_selector',
      'vision_ocr',
      'coordinates'
    ];

    return strategyTypes.map(type => this.calculateMetrics(events, type));
  }

  async getMetricsForStrategy(type: StrategyType, timeRange?: TimeRange): Promise<StrategyMetrics> {
    const events = await this.getEvents({ timeRange });
    return this.calculateMetrics(events, type);
  }

  private calculateMetrics(events: TelemetryEvent[], type: StrategyType): StrategyMetrics {
    let totalEvaluations = 0;
    let timesFound = 0;
    let timesUsed = 0;
    let timesSucceeded = 0;
    let totalConfidence = 0;
    let totalEvalTime = 0;
    let foundCount = 0;

    for (const event of events) {
      const evaluation = event.strategiesEvaluated.find(e => e.type === type);
      if (evaluation) {
        totalEvaluations++;
        totalEvalTime += evaluation.duration;

        if (evaluation.found) {
          timesFound++;
          totalConfidence += evaluation.confidence;
          foundCount++;
        }
      }

      if (event.usedStrategy === type) {
        timesUsed++;
        if (event.success) {
          timesSucceeded++;
        }
      }
    }

    return {
      type,
      totalEvaluations,
      timesFound,
      timesUsed,
      timesSucceeded,
      averageConfidence: foundCount > 0 ? totalConfidence / foundCount : 0,
      averageEvaluationTime: totalEvaluations > 0 ? totalEvalTime / totalEvaluations : 0,
      successRate: timesUsed > 0 ? timesSucceeded / timesUsed : 0,
      findRate: totalEvaluations > 0 ? timesFound / totalEvaluations : 0
    };
  }

  async getStrategyHealth(type: StrategyType): Promise<number> {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const metrics = await this.getMetricsForStrategy(type, {
      start: oneWeekAgo,
      end: Date.now()
    });

    const successWeight = 0.6;
    const findWeight = 0.4;

    const health = (metrics.successRate * successWeight + metrics.findRate * findWeight) * 100;
    return Math.round(health);
  }

  // ==========================================================================
  // MAINTENANCE
  // ==========================================================================

  async flush(): Promise<void> {
    if (!this.db || this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      const transaction = this.db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');

      for (const event of eventsToFlush) {
        store.put(event);
      }

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      console.log(`[TelemetryLogger] Flushed ${eventsToFlush.length} events`);
    } catch (error) {
      this.eventBuffer.unshift(...eventsToFlush);
      console.error('[TelemetryLogger] Flush failed:', error);
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch(err => console.error('[TelemetryLogger] Scheduled flush failed:', err));
    }, this.config.flushIntervalMs);
  }

  async clearOldEvents(olderThan?: number): Promise<number> {
    if (!this.db) return 0;

    const cutoff = olderThan ?? Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    let count = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          count++;
          cursor.continue();
        } else {
          console.log(`[TelemetryLogger] Cleared ${count} old events`);
          resolve(count);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async export(options?: TelemetryQueryOptions): Promise<string> {
    const events = await this.getEvents(options);
    const runs = await this.getRunSummaries();

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      eventCount: events.length,
      events,
      runs
    }, null, 2);
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    console.log('[TelemetryLogger] Closed');
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: TelemetryLogger | null = null;

export function getTelemetryLogger(config?: Partial<TelemetryLoggerConfig>): TelemetryLogger {
  if (!instance) {
    instance = new TelemetryLogger(config);
  }
  return instance;
}
