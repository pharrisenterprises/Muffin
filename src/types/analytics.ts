/**
 * Analytics Types
 * 
 * Types for telemetry data and dashboard components
 */

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY METRICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface StrategyMetrics {
  /** Total number of step executions */
  totalExecutions: number;
  
  /** Breakdown by strategy type */
  byStrategy: Record<string, StrategyStats>;
  
  /** Time period for metrics */
  period: {
    start: number;
    end: number;
    days: number;
  };
}

export interface StrategyStats {
  /** Number of times this strategy was used */
  uses: number;
  
  /** Number of successful executions */
  successes: number;
  
  /** Success rate (0-1) */
  successRate: number;
  
  /** Average execution time in ms */
  avgDuration: number;
  
  /** Number of times this was a fallback (not primary) */
  fallbackUses: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

export interface RunSummary {
  /** Unique run identifier */
  runId: string;
  
  /** Test name/project */
  testName: string;
  
  /** Start timestamp */
  startTime: number;
  
  /** End timestamp */
  endTime: number;
  
  /** Total duration in ms */
  duration: number;
  
  /** Run status */
  status: 'passed' | 'failed' | 'partial' | 'cancelled';
  
  /** Step statistics */
  steps: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  
  /** Strategies used in this run */
  strategiesUsed: string[];
  
  /** Number of fallbacks triggered */
  fallbackCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface DashboardData {
  metrics: StrategyMetrics | null;
  recentRuns: RunSummary[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}
