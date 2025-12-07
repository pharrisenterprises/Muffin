# types/telemetry.ts Content Specification

**File ID:** E5  
**File Path:** `src/types/telemetry.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Defines all TypeScript types and interfaces for the telemetry and analytics subsystem. Consolidates telemetry-related types used by TelemetryLogger, DecisionEngine, TestRunner, and Analytics dashboard. Includes event types, strategy metrics, run summaries, and query options. Ensures type safety for all telemetry collection, storage, and analysis operations.

---

## Dependencies

### Uses (imports from)
- `./strategy`: StrategyType, ActionEventType

### Used By (exports to)
- `../background/services/TelemetryLogger`: All telemetry types
- `../background/services/DecisionEngine`: Event logging types
- `../pages/TestRunner.tsx`: Run tracking types
- `../pages/Analytics.tsx`: Dashboard types

---

## Type Definitions

```typescript
import { StrategyType, ActionEventType } from './strategy';

/**
 * ============================================================================
 * TELEMETRY EVENT TYPES
 * ============================================================================
 */

/**
 * Telemetry event for a single action execution
 */
export interface TelemetryEvent {
  /** Unique event ID */
  id: string;
  /** Run ID (groups events from same test run) */
  runId: string;
  /** Step index in the test */
  stepIndex: number;
  /** Action type */
  actionType: ActionEventType;
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
  /** Additional context */
  context?: TelemetryContext;
}

/**
 * Strategy evaluation result in telemetry
 */
export interface StrategyEvaluation {
  /** Strategy type */
  type: StrategyType;
  /** Whether element was found */
  found: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Evaluation duration in ms */
  duration: number;
  /** Error if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Additional telemetry context
 */
export interface TelemetryContext {
  /** Browser info */
  browser?: string;
  /** Extension version */
  extensionVersion?: string;
  /** Test name */
  testName?: string;
  /** Environment tag */
  environment?: string;
  /** Custom tags */
  tags?: Record<string, string>;
}

/**
 * Telemetry event types
 */
export type TelemetryEventType =
  | 'action_started'
  | 'action_completed'
  | 'action_failed'
  | 'strategy_evaluated'
  | 'run_started'
  | 'run_completed'
  | 'error_occurred';

/**
 * ============================================================================
 * STRATEGY METRICS TYPES
 * ============================================================================
 */

/**
 * Aggregated metrics for a strategy type
 */
export interface StrategyMetrics {
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
  /** Usage rate (timesUsed / totalEvaluations) */
  usageRate: number;
}

/**
 * Strategy metrics over time
 */
export interface StrategyMetricsTimeSeries {
  /** Strategy type */
  type: StrategyType;
  /** Time buckets */
  buckets: MetricsBucket[];
  /** Bucket size in ms */
  bucketSize: number;
  /** Overall metrics for period */
  overall: StrategyMetrics;
}

/**
 * Metrics bucket (time period)
 */
export interface MetricsBucket {
  /** Bucket start timestamp */
  startTime: number;
  /** Bucket end timestamp */
  endTime: number;
  /** Evaluations in bucket */
  evaluations: number;
  /** Successes in bucket */
  successes: number;
  /** Success rate for bucket */
  successRate: number;
  /** Average confidence in bucket */
  averageConfidence: number;
}

/**
 * Strategy health score
 */
export interface StrategyHealth {
  /** Strategy type */
  type: StrategyType;
  /** Health score (0-100) */
  score: number;
  /** Health status */
  status: HealthStatus;
  /** Factors contributing to score */
  factors: HealthFactor[];
  /** Recommendations */
  recommendations: string[];
  /** Calculated at */
  calculatedAt: number;
}

/**
 * Health status levels
 */
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

/**
 * Health factor
 */
export interface HealthFactor {
  /** Factor name */
  name: string;
  /** Factor value (0-100) */
  value: number;
  /** Factor weight in overall score */
  weight: number;
  /** Description */
  description: string;
}

/**
 * ============================================================================
 * RUN SUMMARY TYPES
 * ============================================================================
 */

/**
 * Summary of a test run
 */
export interface RunSummary {
  /** Run ID */
  runId: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Run duration in ms */
  duration: number;
  /** Total steps */
  totalSteps: number;
  /** Successful steps */
  successfulSteps: number;
  /** Failed steps */
  failedSteps: number;
  /** Skipped steps */
  skippedSteps: number;
  /** Pass rate (0-1) */
  passRate: number;
  /** Strategy breakdown */
  strategyUsage: Record<StrategyType, number>;
  /** Average step duration */
  averageStepDuration: number;
  /** Page domains visited */
  domains: string[];
  /** Test name (if provided) */
  testName?: string;
  /** Run status */
  status: RunStatus;
  /** Failure reasons */
  failureReasons?: FailureReason[];
}

/**
 * Run status
 */
export type RunStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'aborted'
  | 'timeout';

/**
 * Failure reason breakdown
 */
export interface FailureReason {
  /** Reason category */
  category: FailureCategory;
  /** Count of failures */
  count: number;
  /** Example error message */
  exampleError?: string;
  /** Steps that failed for this reason */
  stepIndices: number[];
}

/**
 * Failure categories
 */
export type FailureCategory =
  | 'element_not_found'
  | 'timeout'
  | 'action_failed'
  | 'assertion_failed'
  | 'navigation_failed'
  | 'network_error'
  | 'unknown';

/**
 * Active run tracking
 */
export interface ActiveRun {
  /** Run ID */
  runId: string;
  /** Start timestamp */
  startTime: number;
  /** Steps completed */
  stepsCompleted: number;
  /** Steps failed */
  stepsFailed: number;
  /** Current step index */
  currentStep: number;
  /** Total expected steps */
  totalSteps?: number;
  /** Current status */
  status: RunStatus;
}

/**
 * ============================================================================
 * QUERY TYPES
 * ============================================================================
 */

/**
 * Time range filter
 */
export interface TimeRange {
  /** Start timestamp */
  start: number;
  /** End timestamp */
  end: number;
}

/**
 * Predefined time ranges
 */
export type PredefinedTimeRange =
  | 'last_hour'
  | 'last_24h'
  | 'last_7d'
  | 'last_30d'
  | 'all_time';

/**
 * Query options for retrieving events
 */
export interface TelemetryQueryOptions {
  /** Filter by run ID */
  runId?: string;
  /** Filter by strategy type */
  strategyType?: StrategyType;
  /** Filter by success/failure */
  success?: boolean;
  /** Filter by action type */
  actionType?: ActionEventType;
  /** Filter by time range */
  timeRange?: TimeRange;
  /** Filter by page domain */
  pageDomain?: string;
  /** Maximum results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort field */
  sortBy?: TelemetrySortField;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Sort fields for telemetry queries
 */
export type TelemetrySortField =
  | 'timestamp'
  | 'duration'
  | 'confidence'
  | 'stepIndex';

/**
 * Query result with pagination
 */
export interface TelemetryQueryResult {
  /** Events matching query */
  events: TelemetryEvent[];
  /** Total matching events (before limit) */
  total: number;
  /** Whether more results available */
  hasMore: boolean;
  /** Current offset */
  offset: number;
  /** Limit used */
  limit: number;
}

/**
 * ============================================================================
 * ANALYTICS TYPES
 * ============================================================================
 */

/**
 * Dashboard summary data
 */
export interface DashboardSummary {
  /** Time period */
  timeRange: TimeRange;
  /** Total runs */
  totalRuns: number;
  /** Total actions */
  totalActions: number;
  /** Overall success rate */
  overallSuccessRate: number;
  /** Strategy metrics */
  strategyMetrics: StrategyMetrics[];
  /** Top failure reasons */
  topFailures: FailureReason[];
  /** Most active domains */
  topDomains: DomainStats[];
  /** Performance trend */
  performanceTrend: PerformanceTrend;
}

/**
 * Domain statistics
 */
export interface DomainStats {
  /** Domain name */
  domain: string;
  /** Action count */
  actionCount: number;
  /** Success rate */
  successRate: number;
  /** Average duration */
  averageDuration: number;
}

/**
 * Performance trend
 */
export interface PerformanceTrend {
  /** Trend direction */
  direction: 'improving' | 'stable' | 'declining';
  /** Percentage change */
  percentageChange: number;
  /** Comparison period */
  comparisonPeriod: string;
  /** Current success rate */
  currentRate: number;
  /** Previous success rate */
  previousRate: number;
}

/**
 * Strategy comparison data
 */
export interface StrategyComparison {
  /** Strategies being compared */
  strategies: StrategyType[];
  /** Time range */
  timeRange: TimeRange;
  /** Metrics for each strategy */
  metrics: Map<StrategyType, StrategyMetrics>;
  /** Winner by category */
  winners: {
    successRate: StrategyType;
    speed: StrategyType;
    reliability: StrategyType;
  };
}

/**
 * ============================================================================
 * EXPORT TYPES
 * ============================================================================
 */

/**
 * Export format
 */
export type ExportFormat = 'json' | 'csv' | 'html';

/**
 * Export options
 */
export interface ExportOptions {
  /** Export format */
  format: ExportFormat;
  /** Query options */
  query?: TelemetryQueryOptions;
  /** Include raw events */
  includeEvents?: boolean;
  /** Include run summaries */
  includeRunSummaries?: boolean;
  /** Include metrics */
  includeMetrics?: boolean;
  /** Compress output */
  compress?: boolean;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Export data (string or base64 for compressed) */
  data: string;
  /** Format used */
  format: ExportFormat;
  /** Event count included */
  eventCount: number;
  /** Run count included */
  runCount: number;
  /** Export timestamp */
  exportedAt: number;
  /** File size in bytes */
  sizeBytes: number;
}

/**
 * ============================================================================
 * CONFIGURATION TYPES
 * ============================================================================
 */

/**
 * Telemetry logger configuration
 */
export interface TelemetryLoggerConfig {
  /** Whether telemetry is enabled */
  enabled: boolean;
  /** Maximum events to store */
  maxEvents: number;
  /** Event retention period in days */
  retentionDays: number;
  /** Batch size for writes */
  batchSize: number;
  /** Flush interval in ms */
  flushIntervalMs: number;
  /** IndexedDB database name */
  dbName: string;
  /** Whether to log to console */
  debugLogging: boolean;
}

/**
 * Default telemetry config
 */
export const DEFAULT_TELEMETRY_CONFIG: TelemetryLoggerConfig = {
  enabled: true,
  maxEvents: 10000,
  retentionDays: 30,
  batchSize: 10,
  flushIntervalMs: 5000,
  dbName: 'muffin_telemetry',
  debugLogging: false
};

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Generate unique telemetry ID
 */
export function generateTelemetryId(): string {
  return `tel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique run ID
 */
export function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert predefined time range to TimeRange
 */
export function predefinedToTimeRange(predefined: PredefinedTimeRange): TimeRange {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  switch (predefined) {
    case 'last_hour':
      return { start: now - hour, end: now };
    case 'last_24h':
      return { start: now - day, end: now };
    case 'last_7d':
      return { start: now - 7 * day, end: now };
    case 'last_30d':
      return { start: now - 30 * day, end: now };
    case 'all_time':
      return { start: 0, end: now };
  }
}

/**
 * Calculate success rate from counts
 */
export function calculateSuccessRate(succeeded: number, total: number): number {
  if (total === 0) return 0;
  return succeeded / total;
}

/**
 * Get health status from score
 */
export function getHealthStatus(score: number): HealthStatus {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  if (score > 0) return 'critical';
  return 'unknown';
}

/**
 * Calculate strategy health score
 */
export function calculateHealthScore(metrics: StrategyMetrics): number {
  // Weighted combination of success rate (60%), find rate (30%), speed (10%)
  const successWeight = 0.6;
  const findWeight = 0.3;
  const speedWeight = 0.1;

  // Normalize speed (faster is better, assume 100ms is optimal, 1000ms is poor)
  const speedScore = Math.max(0, 1 - (metrics.averageEvaluationTime - 100) / 900);

  const score = (
    metrics.successRate * successWeight +
    metrics.findRate * findWeight +
    speedScore * speedWeight
  ) * 100;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Group events by run ID
 */
export function groupEventsByRun(events: TelemetryEvent[]): Map<string, TelemetryEvent[]> {
  const grouped = new Map<string, TelemetryEvent[]>();

  for (const event of events) {
    const existing = grouped.get(event.runId) || [];
    existing.push(event);
    grouped.set(event.runId, existing);
  }

  return grouped;
}

/**
 * Calculate metrics from events
 */
export function calculateMetricsFromEvents(
  events: TelemetryEvent[],
  strategyType: StrategyType
): StrategyMetrics {
  let totalEvaluations = 0;
  let timesFound = 0;
  let timesUsed = 0;
  let timesSucceeded = 0;
  let totalConfidence = 0;
  let totalEvalTime = 0;
  let foundCount = 0;

  for (const event of events) {
    const evaluation = event.strategiesEvaluated.find(e => e.type === strategyType);
    if (evaluation) {
      totalEvaluations++;
      totalEvalTime += evaluation.duration;

      if (evaluation.found) {
        timesFound++;
        totalConfidence += evaluation.confidence;
        foundCount++;
      }
    }

    if (event.usedStrategy === strategyType) {
      timesUsed++;
      if (event.success) {
        timesSucceeded++;
      }
    }
  }

  return {
    type: strategyType,
    totalEvaluations,
    timesFound,
    timesUsed,
    timesSucceeded,
    averageConfidence: foundCount > 0 ? totalConfidence / foundCount : 0,
    averageEvaluationTime: totalEvaluations > 0 ? totalEvalTime / totalEvaluations : 0,
    successRate: timesUsed > 0 ? timesSucceeded / timesUsed : 0,
    findRate: totalEvaluations > 0 ? timesFound / totalEvaluations : 0,
    usageRate: totalEvaluations > 0 ? timesUsed / totalEvaluations : 0
  };
}

/**
 * Create empty metrics for strategy
 */
export function createEmptyMetrics(type: StrategyType): StrategyMetrics {
  return {
    type,
    totalEvaluations: 0,
    timesFound: 0,
    timesUsed: 0,
    timesSucceeded: 0,
    averageConfidence: 0,
    averageEvaluationTime: 0,
    successRate: 0,
    findRate: 0,
    usageRate: 0
  };
}
```

---

## Usage Examples

### Logging Telemetry Event
```typescript
import { TelemetryEvent, generateTelemetryId } from '../types/telemetry';

const event: TelemetryEvent = {
  id: generateTelemetryId(),
  runId: 'run_123',
  stepIndex: 0,
  actionType: 'click',
  timestamp: Date.now(),
  strategiesEvaluated: [
    { type: 'cdp_semantic', found: true, confidence: 0.95, duration: 50 },
    { type: 'dom_selector', found: true, confidence: 0.85, duration: 20 }
  ],
  usedStrategy: 'cdp_semantic',
  usedConfidence: 0.95,
  success: true,
  duration: 150,
  pageDomain: 'example.com'
};
```

### Querying Telemetry
```typescript
import { TelemetryQueryOptions, predefinedToTimeRange } from '../types/telemetry';

const query: TelemetryQueryOptions = {
  timeRange: predefinedToTimeRange('last_7d'),
  success: false,
  limit: 100,
  sortBy: 'timestamp',
  sortOrder: 'desc'
};
```

---

## Acceptance Criteria

- [ ] TelemetryEvent with all action fields
- [ ] StrategyEvaluation for per-strategy tracking
- [ ] StrategyMetrics for aggregated statistics
- [ ] RunSummary for test run tracking
- [ ] TimeRange and query options
- [ ] Health score types and calculation
- [ ] Export format types
- [ ] Configuration types with defaults
- [ ] Utility functions for common operations
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **No events for strategy**: Return empty metrics
2. **Zero evaluations**: Handle division by zero
3. **Negative time ranges**: Validate in query
4. **Very large event counts**: Pagination required
5. **Missing run ID**: Use 'untracked'
6. **Concurrent runs**: Track separately
7. **Clock skew**: Use consistent timestamps
8. **Corrupted events**: Skip in aggregation
9. **Export timeout**: Chunk large exports
10. **Memory pressure**: Limit query results

---

## Estimated Lines

350-400 lines
