/**
 * StrategyChart - Visual breakdown of strategy performance
 * 
 * Shows:
 * - Usage distribution (bar chart)
 * - Success rates (percentage bars)
 * - Fallback frequency
 */

import { StrategyBadge, type StrategyType } from './StrategyBadge';
import type { StrategyStats } from '../types/analytics';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface StrategyChartProps {
  data: Record<string, StrategyStats>;
  totalExecutions: number;
}

interface StrategyRowProps {
  strategyType: string;
  stats: StrategyStats;
  maxUses: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY ROW
// ═══════════════════════════════════════════════════════════════════════════════

function StrategyRow({ strategyType, stats, maxUses }: StrategyRowProps) {
  const usagePercent = maxUses > 0 ? (stats.uses / maxUses) * 100 : 0;
  const successPercent = stats.successRate * 100;
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '120px 1fr 80px 80px 60px',
      gap: '12px',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid #f3f4f6'
    }}>
      {/* Strategy Badge */}
      <div>
        <StrategyBadge 
          strategyType={strategyType as StrategyType} 
          size="sm"
        />
        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#374151' }}>
          {strategyType.replace(/_/g, ' ')}
        </span>
      </div>
      
      {/* Usage Bar */}
      <div style={{ position: 'relative', height: '24px' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${usagePercent}%`,
          backgroundColor: '#3b82f6',
          borderRadius: '4px',
          transition: 'width 0.3s ease'
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          zIndex: -1
        }} />
      </div>
      
      {/* Usage Count */}
      <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 500 }}>
        {stats.uses} uses
      </div>
      
      {/* Success Rate */}
      <div style={{ 
        textAlign: 'right', 
        fontSize: '13px',
        color: successPercent >= 80 ? '#16a34a' : 
               successPercent >= 50 ? '#ca8a04' : '#dc2626'
      }}>
        {successPercent.toFixed(0)}%
      </div>
      
      {/* Avg Duration */}
      <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>
        {stats.avgDuration.toFixed(0)}ms
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function StrategyChart({ data, totalExecutions }: StrategyChartProps) {
  // Sort strategies by usage (descending)
  const sortedStrategies = Object.entries(data)
    .sort((a, b) => b[1].uses - a[1].uses);
  
  const maxUses = sortedStrategies.length > 0 
    ? sortedStrategies[0][1].uses 
    : 0;
  
  if (sortedStrategies.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
        <div>No strategy data yet</div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>
          Run some tests to see metrics
        </div>
      </div>
    );
  }
  
  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      padding: '16px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          Strategy Performance
        </h3>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          {totalExecutions} total executions
        </span>
      </div>
      
      {/* Column Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 80px 80px 60px',
        gap: '12px',
        padding: '8px 0',
        borderBottom: '2px solid #e5e7eb',
        fontSize: '11px',
        fontWeight: 600,
        color: '#6b7280',
        textTransform: 'uppercase'
      }}>
        <div>Strategy</div>
        <div>Usage</div>
        <div style={{ textAlign: 'right' }}>Count</div>
        <div style={{ textAlign: 'right' }}>Success</div>
        <div style={{ textAlign: 'right' }}>Avg</div>
      </div>
      
      {/* Strategy Rows */}
      {sortedStrategies.map(([type, stats]) => (
        <StrategyRow
          key={type}
          strategyType={type}
          stats={stats}
          maxUses={maxUses}
        />
      ))}
      
      {/* Summary Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '12px',
        color: '#6b7280'
      }}>
        <div>
          <strong>{sortedStrategies.length}</strong> strategies used
        </div>
        <div>
          Primary success rate:{' '}
          <strong style={{ color: '#16a34a' }}>
            {sortedStrategies.length > 0 
              ? (sortedStrategies[0][1].successRate * 100).toFixed(0)
              : 0}%
          </strong>
        </div>
      </div>
    </div>
  );
}
