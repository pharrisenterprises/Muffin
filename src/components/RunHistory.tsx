/**
 * RunHistory - List of recent test runs
 * 
 * Shows:
 * - Run status (passed/failed/partial)
 * - Duration and timing
 * - Step counts
 * - Strategies used
 */

import { StrategyBadge, type StrategyType } from './StrategyBadge';
import type { RunSummary } from '../types/analytics';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RunHistoryProps {
  runs: RunSummary[];
  maxRuns?: number;
}

interface RunRowProps {
  run: RunSummary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getStatusConfig(status: RunSummary['status']) {
  switch (status) {
    case 'passed':
      return { icon: '✅', color: '#16a34a', bg: '#dcfce7', label: 'Passed' };
    case 'failed':
      return { icon: '❌', color: '#dc2626', bg: '#fee2e2', label: 'Failed' };
    case 'partial':
      return { icon: '⚠️', color: '#ca8a04', bg: '#fef3c7', label: 'Partial' };
    case 'cancelled':
      return { icon: '⏹️', color: '#6b7280', bg: '#f3f4f6', label: 'Cancelled' };
    default:
      return { icon: '○', color: '#6b7280', bg: '#f3f4f6', label: 'Unknown' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ROW
// ═══════════════════════════════════════════════════════════════════════════════

function RunRow({ run }: RunRowProps) {
  const statusConfig = getStatusConfig(run.status);
  const passRate = run.steps.total > 0 
    ? (run.steps.passed / run.steps.total) * 100 
    : 0;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      marginBottom: '8px'
    }}>
      {/* Status Icon */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        backgroundColor: statusConfig.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px'
      }}>
        {statusConfig.icon}
      </div>
      
      {/* Run Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: 500, 
          fontSize: '14px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {run.testName || run.runId}
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          display: 'flex',
          gap: '12px',
          marginTop: '2px'
        }}>
          <span>{formatTimeAgo(run.startTime)}</span>
          <span>{formatDuration(run.duration)}</span>
        </div>
      </div>
      
      {/* Steps Progress */}
      <div style={{ textAlign: 'center', minWidth: '80px' }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 500,
          color: statusConfig.color
        }}>
          {run.steps.passed}/{run.steps.total}
        </div>
        <div style={{
          width: '60px',
          height: '4px',
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
          marginTop: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${passRate}%`,
            height: '100%',
            backgroundColor: statusConfig.color,
            transition: 'width 0.3s'
          }} />
        </div>
      </div>
      
      {/* Strategies Used */}
      <div style={{ 
        display: 'flex', 
        gap: '4px',
        flexWrap: 'wrap',
        maxWidth: '120px',
        justifyContent: 'flex-end'
      }}>
        {run.strategiesUsed.slice(0, 3).map((strategy, i) => (
          <StrategyBadge 
            key={i}
            strategyType={strategy as StrategyType}
            size="sm"
          />
        ))}
        {run.strategiesUsed.length > 3 && (
          <span style={{ fontSize: '10px', color: '#6b7280' }}>
            +{run.strategiesUsed.length - 3}
          </span>
        )}
      </div>
      
      {/* Fallback Count */}
      {run.fallbackCount > 0 && (
        <div style={{
          fontSize: '11px',
          color: '#f59e0b',
          backgroundColor: '#fef3c7',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          {run.fallbackCount} fallback{run.fallbackCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function RunHistory({ runs, maxRuns = 10 }: RunHistoryProps) {
  const displayedRuns = runs.slice(0, maxRuns);
  
  if (displayedRuns.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏃</div>
        <div>No runs yet</div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>
          Run a test to see history
        </div>
      </div>
    );
  }
  
  // Calculate summary stats
  const passedRuns = displayedRuns.filter(r => r.status === 'passed').length;
  const totalSteps = displayedRuns.reduce((sum, r) => sum + r.steps.total, 0);
  const passedSteps = displayedRuns.reduce((sum, r) => sum + r.steps.passed, 0);
  
  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          Recent Runs
        </h3>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          {passedRuns}/{displayedRuns.length} passed
          <span style={{ margin: '0 8px' }}>•</span>
          {passedSteps}/{totalSteps} steps
        </div>
      </div>
      
      {/* Run List */}
      <div>
        {displayedRuns.map(run => (
          <RunRow key={run.runId} run={run} />
        ))}
      </div>
      
      {runs.length > maxRuns && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          Showing {maxRuns} of {runs.length} runs
        </div>
      )}
    </div>
  );
}
