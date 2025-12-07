# TelemetryLogger Content Specification

**File ID:** C5  
**File Path:** `src/background/services/TelemetryLogger.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Collects and stores telemetry data about strategy execution during playback to enable analysis and optimization. Tracks which strategies succeed/fail, their confidence scores, execution times, and failure reasons. Stores data locally using IndexedDB for post-run analysis, strategy health dashboards, and identifying patterns in flaky tests. Essential for understanding system behavior and improving strategy selection over time.

---

## Dependencies

### Uses (imports from)
- `../../types/strategy`: StrategyType, LocatorStrategy, FallbackChain
- `../../types/telemetry`: TelemetryEvent, StrategyMetrics, RunSummary

### Used By (exports to)
- `../DecisionEngine`: Logs strategy execution results
- `../../pages/TestRunner.tsx`: Retrieves run statistics
- `../../pages/Analytics.tsx`: Displays strategy health dashboard

---

## Interfaces

```typescript
/**
 * Telemetry logger configuration
 */
interface TelemetryLoggerConfig {
  /** Whether telemetry is enabled (default: true) */
  enabled: boolean;
  /** Maximum events to store (default: 10000) */
  maxEvents: number;
  /** Event retention period in days (default: 30) */
  retentionDays: number;
  /** Batch size for writes (default: 10) */
  batchSize: number;
  /** Flush interval in ms (default: 5000) */
  flushIntervalMs: number;
  /** IndexedDB database name (default: 'muffin_telemetry') */
  dbName: string;
}

/**
 * Telemetry event for a single action
 */
interface TelemetryEvent {
  /** Unique event ID */
  id: string;
  /** Run ID (groups events from same test run) */
  runId: string;
  /** Step index in the test */
  stepIndex: number;
  /** Action type */
  actionType: 'click' | 'type' | 'select' | 'navigate' | 'scroll';
  /** Timestamp */
  timestamp: number;
  /** All strategies that were evaluated */
  strategiesEvaluated: StrategyEvaluation[];
  /** Strategy that was used */
  usedStrategy: StrategyType;
  /** Used strategy confidence */
  usedConfidence: number;
  /** Whether action succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Total duration in ms */
  duration: number;
  /** Page URL (domain only for privacy) */
  pageDomain: string;
}

/**
 * Strategy evaluation result in telemetry
 */
interface StrategyEvaluation {
  /** Strategy type */
  type: StrategyType;
  /** Whether element was found */
  found: boolean;
  /** Confidence score */
  confidence: number;
  /** Evaluation duration in ms */
  duration: number;
  /** Error if failed */
  error?: string;
}

/**
 * Aggregated metrics for a strategy type
 */
interface StrategyMetrics {
  /** Strategy type */
  type: StrategyType;
  /** Total times evaluated */
  totalEvaluations: number;
  /** Times element was found */
  timesFound: number;
  /** Times actually used (highest confidence) */
  timesUsed: number;
  /** Times used and action succeeded */
  timesSucceeded: number;
  /** Average confidence when found */
  averageConfidence: number;
  /** Average evaluation time in ms */
  averageEvaluationTime: number;
  /** Success rate (timesSucceeded / timesUsed) */
  successRate: number;
  /** Find rate (timesFound / totalEvaluations) */
  findRate: number;
}

/**
 * Summary of a test run
 */
interface RunSummary {
  /** Run ID */
  runId: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Total steps */
  totalSteps: number;
  /** Successful steps */
  successfulSteps: number;
  /** Failed steps */
  failedSteps: number;
  /** Pass rate */
  passRate: number;
  /** Strategy breakdown */
  strategyUsage: Record<StrategyType, number>;
  /** Average step duration */
  averageStepDuration: number;
  /** Page domains visited */
  domains: string[];
}

/**
 * Time range filter
 */
interface TimeRange {
  /** Start timestamp */
  start: number;
  /** End timestamp */
  end: number;
}

/**
 * Query options for retrieving events
 */
interface TelemetryQueryOptions {
  /** Filter by run ID */
  runId?: string;
  /** Filter by strategy type */
  strategyType?: StrategyType;
  /** Filter by success/failure */
  success?: boolean;
  /** Filter by time range */
  timeRange?: TimeRange;
  /** Maximum results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Active run tracking
 */
interface ActiveRun {
  /** Run ID */
  runId: string;
  /** Start timestamp */
  startTime: number;
  /** Steps completed */
  stepsCompleted: number;
  /** Current step index */
  currentStep: number;
}
```

---

## Functions

```typescript
/**
 * TelemetryLogger - Collects strategy execution telemetry
 */
class TelemetryLogger {
  private config: TelemetryLoggerConfig;
  private db: IDBDatabase | null;
  private eventBuffer: TelemetryEvent[];
  private flushTimer: number | null;
  private activeRuns: Map<string, ActiveRun>;
  private pendingActions: Map<string, Partial<TelemetryEvent>>;

  /**
   * Create new TelemetryLogger instance
   * @param config - Logger configuration
   */
  constructor(config?: Partial<TelemetryLoggerConfig>);

  /**
   * Initialize the logger (opens IndexedDB)
   * @returns Promise resolving when ready
   */
  async initialize(): Promise<void>;

  /**
   * Start a new test run
   * @param runId - Unique run identifier
   * @returns Run ID
   */
  startRun(runId?: string): string;

  /**
   * End a test run
   * @param runId - Run ID to end
   * @returns Promise resolving to run summary
   */
  async endRun(runId: string): Promise<RunSummary>;

  /**
   * Start tracking an action (before execution)
   * @param data - Initial action data
   * @returns Action ID for correlation
   */
  startAction(data: {
    runId?: string;
    stepIndex?: number;
    actionType: TelemetryEvent['actionType'];
    strategyCount?: number;
  }): string;

  /**
   * End an action with results
   * @param actionId - Action ID from startAction
   * @param result - Action result data
   * @returns Promise resolving when logged
   */
  async endAction(
    actionId: string,
    result: {
      success: boolean;
      usedStrategy?: StrategyType;
      confidence?: number;
      evaluationResults?: {
        results: StrategyEvaluation[];
      };
      executionDuration?: number;
      error?: string;
    }
  ): Promise<void>;

  /**
   * Log a complete telemetry event
   * @param event - Event to log
   * @returns Promise resolving when logged
   */
  async logEvent(event: Omit<TelemetryEvent, 'id'>): Promise<string>;

  /**
   * Get events matching query
   * @param options - Query options
   * @returns Promise resolving to matching events
   */
  async getEvents(options?: TelemetryQueryOptions): Promise<TelemetryEvent[]>;

  /**
   * Get aggregated metrics for all strategy types
   * @param timeRange - Optional time range filter
   * @returns Promise resolving to strategy metrics
   */
  async getStrategyMetrics(timeRange?: TimeRange): Promise<StrategyMetrics[]>;

  /**
   * Get metrics for a specific strategy type
   * @param type - Strategy type
   * @param timeRange - Optional time range filter
   * @returns Promise resolving to strategy metrics
   */
  async getMetricsForStrategy(
    type: StrategyType,
    timeRange?: TimeRange
  ): Promise<StrategyMetrics>;

  /**
   * Get run summary by ID
   * @param runId - Run ID
   * @returns Promise resolving to run summary
   */
  async getRunSummary(runId: string): Promise<RunSummary | null>;

  /**
   * Get all run summaries
   * @param timeRange - Optional time range filter
   * @returns Promise resolving to run summaries
   */
  async getRunSummaries(timeRange?: TimeRange): Promise<RunSummary[]>;

  /**
   * Get recent failures
   * @param limit - Maximum results (default: 20)
   * @returns Promise resolving to failed events
   */
  async getRecentFailures(limit?: number): Promise<TelemetryEvent[]>;

  /**
   * Get strategy health score
   * @param type - Strategy type
   * @returns Promise resolving to health score (0-100)
   */
  async getStrategyHealth(type: StrategyType): Promise<number>;

  /**
   * Clear old events
   * @param olderThan - Clear events older than this timestamp
   * @returns Promise resolving to count of cleared events
   */
  async clearOldEvents(olderThan?: number): Promise<number>;

  /**
   * Export telemetry data
   * @param options - Query options for filtering
   * @returns Promise resolving to JSON export
   */
  async export(options?: TelemetryQueryOptions): Promise<string>;

  /**
   * Flush buffered events to storage
   * @returns Promise resolving when flushed
   */
  async flush(): Promise<void>;

  /**
   * Close the logger
   */
  async close(): Promise<void>;

  // Private helper methods
  private generateId(): string;
  private getCurrentPageDomain(): string;
  private openDatabase(): Promise<IDBDatabase>;
  private scheduleFlush(): void;
  private pruneOldEvents(): Promise<void>;
  private calculateMetrics(events: TelemetryEvent[], type: StrategyType): StrategyMetrics;
}

export {
  TelemetryLogger,
  TelemetryLoggerConfig,
  TelemetryEvent,
  StrategyEvaluation,
  StrategyMetrics,
  RunSummary,
  TelemetryQueryOptions,
  TimeRange
};
```

---

## Key Implementation Details

### Constructor and Initialization
```typescript
constructor(config?: Partial<TelemetryLoggerConfig>) {
  this.config = {
    enabled: config?.enabled ?? true,
    maxEvents: config?.maxEvents ?? 10000,
    retentionDays: config?.retentionDays ?? 30,
    batchSize: config?.batchSize ?? 10,
    flushIntervalMs: config?.flushIntervalMs ?? 5000,
    dbName: config?.dbName ?? 'muffin_telemetry'
  };

  this.db = null;
  this.eventBuffer = [];
  this.flushTimer = null;
  this.activeRuns = new Map();
  this.pendingActions = new Map();
}

async initialize(): Promise<void> {
  if (!this.config.enabled) {
    console.log('[TelemetryLogger] Telemetry disabled');
    return;
  }

  try {
    this.db = await this.openDatabase();
    console.log('[TelemetryLogger] Initialized');

    // Schedule periodic flush
    this.scheduleFlush();

    // Prune old events on startup
    await this.pruneOldEvents();
  } catch (error) {
    console.error('[TelemetryLogger] Initialization failed:', error);
    throw error;
  }
}

private openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(this.config.dbName, 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Events store
      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('runId', 'runId', { unique: false });
        eventStore.createIndex('timestamp', 'timestamp', { unique: false });
        eventStore.createIndex('usedStrategy', 'usedStrategy', { unique: false });
        eventStore.createIndex('success', 'success', { unique: false });
      }

      // Runs store
      if (!db.objectStoreNames.contains('runs')) {
        const runStore = db.createObjectStore('runs', { keyPath: 'runId' });
        runStore.createIndex('startTime', 'startTime', { unique: false });
      }
    };
  });
}
```

### Run Management
```typescript
startRun(runId?: string): string {
  const id = runId || this.generateId();

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
  const run = this.activeRuns.get(runId);
  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }

  // Flush any pending events
  await this.flush();

  // Get all events for this run
  const events = await this.getEvents({ runId });

  // Calculate summary
  const successfulSteps = events.filter(e => e.success).length;
  const failedSteps = events.filter(e => !e.success).length;

  const strategyUsage: Record<string, number> = {};
  for (const event of events) {
    strategyUsage[event.usedStrategy] = (strategyUsage[event.usedStrategy] || 0) + 1;
  }

  const totalDuration = events.reduce((sum, e) => sum + e.duration, 0);
  const averageStepDuration = events.length > 0 ? totalDuration / events.length : 0;

  const domains = [...new Set(events.map(e => e.pageDomain))];

  const summary: RunSummary = {
    runId,
    startTime: run.startTime,
    endTime: Date.now(),
    totalSteps: events.length,
    successfulSteps,
    failedSteps,
    passRate: events.length > 0 ? successfulSteps / events.length : 0,
    strategyUsage: strategyUsage as Record<StrategyType, number>,
    averageStepDuration,
    domains
  };

  // Store run summary
  if (this.db) {
    const transaction = this.db.transaction(['runs'], 'readwrite');
    const store = transaction.objectStore('runs');
    store.put(summary);
  }

  // Clean up active run
  this.activeRuns.delete(runId);

  console.log(`[TelemetryLogger] Ended run: ${runId}, ${successfulSteps}/${events.length} passed`);
  return summary;
}
```

### Action Tracking
```typescript
startAction(data: {
  runId?: string;
  stepIndex?: number;
  actionType: TelemetryEvent['actionType'];
  strategyCount?: number;
}): string {
  const actionId = this.generateId();

  // Find active run or use provided
  let runId = data.runId;
  if (!runId && this.activeRuns.size > 0) {
    runId = this.activeRuns.keys().next().value;
  }

  this.pendingActions.set(actionId, {
    runId: runId || 'untracked',
    stepIndex: data.stepIndex ?? 0,
    actionType: data.actionType,
    timestamp: Date.now(),
    pageDomain: this.getCurrentPageDomain()
  });

  return actionId;
}

async endAction(
  actionId: string,
  result: {
    success: boolean;
    usedStrategy?: StrategyType;
    confidence?: number;
    evaluationResults?: {
      results: StrategyEvaluation[];
    };
    executionDuration?: number;
    error?: string;
  }
): Promise<void> {
  const pending = this.pendingActions.get(actionId);
  if (!pending) {
    console.warn(`[TelemetryLogger] No pending action for ID: ${actionId}`);
    return;
  }

  this.pendingActions.delete(actionId);

  const duration = Date.now() - (pending.timestamp || Date.now());

  const event: Omit<TelemetryEvent, 'id'> = {
    runId: pending.runId || 'untracked',
    stepIndex: pending.stepIndex || 0,
    actionType: pending.actionType!,
    timestamp: pending.timestamp || Date.now(),
    strategiesEvaluated: result.evaluationResults?.results || [],
    usedStrategy: result.usedStrategy || 'coordinates',
    usedConfidence: result.confidence || 0,
    success: result.success,
    error: result.error,
    duration: result.executionDuration || duration,
    pageDomain: pending.pageDomain || 'unknown'
  };

  await this.logEvent(event);

  // Update active run stats
  const run = this.activeRuns.get(event.runId);
  if (run) {
    run.stepsCompleted++;
    run.currentStep = event.stepIndex;
  }
}

async logEvent(event: Omit<TelemetryEvent, 'id'>): Promise<string> {
  if (!this.config.enabled) {
    return '';
  }

  const fullEvent: TelemetryEvent = {
    ...event,
    id: this.generateId()
  };

  this.eventBuffer.push(fullEvent);

  // Flush if buffer is full
  if (this.eventBuffer.length >= this.config.batchSize) {
    await this.flush();
  }

  return fullEvent.id;
}
```

### Querying Events
```typescript
async getEvents(options?: TelemetryQueryOptions): Promise<TelemetryEvent[]> {
  if (!this.db) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = this.db!.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');
    const events: TelemetryEvent[] = [];

    let request: IDBRequest;

    // Use index if filtering by specific field
    if (options?.runId) {
      const index = store.index('runId');
      request = index.openCursor(IDBKeyRange.only(options.runId));
    } else if (options?.timeRange) {
      const index = store.index('timestamp');
      request = index.openCursor(IDBKeyRange.bound(
        options.timeRange.start,
        options.timeRange.end
      ));
    } else {
      request = store.openCursor();
    }

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      
      if (cursor) {
        const telemetryEvent = cursor.value as TelemetryEvent;
        let include = true;

        // Apply filters
        if (options?.strategyType && telemetryEvent.usedStrategy !== options.strategyType) {
          include = false;
        }
        if (options?.success !== undefined && telemetryEvent.success !== options.success) {
          include = false;
        }

        if (include) {
          events.push(telemetryEvent);
        }

        // Check limit
        if (options?.limit && events.length >= options.limit) {
          resolve(events);
          return;
        }

        cursor.continue();
      } else {
        // Apply offset and limit
        let result = events;
        if (options?.offset) {
          result = result.slice(options.offset);
        }
        if (options?.limit) {
          result = result.slice(0, options.limit);
        }
        resolve(result);
      }
    };

    request.onerror = () => reject(request.error);
  });
}
```

### Metrics Calculation
```typescript
async getStrategyMetrics(timeRange?: TimeRange): Promise<StrategyMetrics[]> {
  const events = await this.getEvents({ timeRange });
  const types: StrategyType[] = [
    'cdp_semantic', 'cdp_power', 'dom_selector',
    'evidence_scoring', 'css_selector', 'vision_ocr', 'coordinates'
  ];

  return types.map(type => this.calculateMetrics(events, type));
}

async getMetricsForStrategy(
  type: StrategyType,
  timeRange?: TimeRange
): Promise<StrategyMetrics> {
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
    // Check if this strategy was evaluated
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

    // Check if this strategy was used
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
  // Health score based on recent performance (last 7 days)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const metrics = await this.getMetricsForStrategy(type, {
    start: oneWeekAgo,
    end: Date.now()
  });

  // Health = weighted combination of success rate and find rate
  const successWeight = 0.6;
  const findWeight = 0.4;

  const health = (metrics.successRate * successWeight + metrics.findRate * findWeight) * 100;
  return Math.round(health);
}
```

### Maintenance and Export
```typescript
async flush(): Promise<void> {
  if (!this.db || this.eventBuffer.length === 0) {
    return;
  }

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
    // Put events back in buffer on error
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
  }, this.config.flushIntervalMs) as unknown as number;
}

async clearOldEvents(olderThan?: number): Promise<number> {
  if (!this.db) return 0;

  const cutoff = olderThan || Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
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

private async pruneOldEvents(): Promise<void> {
  // Also enforce max events
  const events = await this.getEvents();
  if (events.length > this.config.maxEvents) {
    // Delete oldest events
    const toDelete = events.length - this.config.maxEvents;
    const sortedByTime = [...events].sort((a, b) => a.timestamp - b.timestamp);
    const oldestEvents = sortedByTime.slice(0, toDelete);

    if (this.db) {
      const transaction = this.db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');

      for (const event of oldestEvents) {
        store.delete(event.id);
      }
    }

    console.log(`[TelemetryLogger] Pruned ${toDelete} excess events`);
  }

  // Also clear by retention period
  await this.clearOldEvents();
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

private getCurrentPageDomain(): string {
  // Extract domain for privacy
  try {
    // In background context, we don't have direct access to current page
    // This would be passed in from the content script
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
```

---

## Integration Points

### With DecisionEngine
```typescript
// DecisionEngine logs telemetry
class DecisionEngine {
  constructor(private telemetryLogger: TelemetryLogger) {}

  async executeAction(request: ActionRequest): Promise<ActionExecutionResult> {
    const actionId = this.telemetryLogger.startAction({
      runId: request.runId,
      stepIndex: request.stepIndex,
      actionType: request.actionType
    });

    try {
      const result = await this.doExecute(request);

      await this.telemetryLogger.endAction(actionId, {
        success: result.success,
        usedStrategy: result.usedStrategy.type,
        confidence: result.usedStrategy.confidence,
        evaluationResults: result.evaluationResults,
        error: result.error
      });

      return result;
    } catch (error) {
      await this.telemetryLogger.endAction(actionId, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
```

### With Analytics Dashboard
```typescript
// Analytics component retrieves metrics
async function loadStrategyHealth() {
  const metrics = await telemetryLogger.getStrategyMetrics();
  
  // Display in dashboard
  for (const metric of metrics) {
    console.log(`${metric.type}: ${(metric.successRate * 100).toFixed(1)}% success rate`);
  }
}
```

---

## Acceptance Criteria

- [ ] Initializes IndexedDB database correctly
- [ ] startRun/endRun tracks test runs
- [ ] startAction/endAction tracks individual actions
- [ ] logEvent stores telemetry events
- [ ] getEvents retrieves with filters
- [ ] getStrategyMetrics calculates aggregates
- [ ] getStrategyHealth returns health score
- [ ] Batched writes with configurable flush
- [ ] Automatic pruning of old events
- [ ] Export functionality works
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **IndexedDB unavailable**: Graceful degradation
2. **Database full**: Prune oldest events
3. **Concurrent writes**: Transaction handling
4. **Run not ended**: Handle orphan runs
5. **No events for strategy**: Return zero metrics
6. **Browser restart**: Persist data properly
7. **Private browsing**: May not have IndexedDB
8. **Large export**: Stream if needed
9. **Corrupted data**: Handle parse errors
10. **Clock skew**: Use consistent timestamps

---

## Estimated Lines

400-480 lines
