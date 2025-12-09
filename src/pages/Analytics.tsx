/**
 * Analytics Page - Telemetry Dashboard
 * 
 * Displays:
 * - Strategy performance metrics
 * - Recent run history
 * - Overall statistics
 */

import { useState, useEffect, useCallback } from 'react';
import { StrategyChart } from '../components/StrategyChart';
import { RunHistory } from '../components/RunHistory';
import type { DashboardData, StrategyMetrics, RunSummary } from '../types/analytics';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function Analytics() {
  const [data, setData] = useState<DashboardData>({
    metrics: null,
    recentRuns: [],
    loading: true,
    error: null,
    lastUpdated: null
  });
  
  const [timeRange, setTimeRange] = useState<number>(30); // days
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────
  
  const fetchAnalytics = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await new Promise<{
        metrics: StrategyMetrics | null;
        recentRuns: RunSummary[];
        error?: string;
      }>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'GET_ANALYTICS', days: timeRange },
          (res) => {
            if (chrome.runtime.lastError) {
              resolve({ 
                metrics: null, 
                recentRuns: [], 
                error: chrome.runtime.lastError.message 
              });
            } else {
              resolve(res || { metrics: null, recentRuns: [] });
            }
          }
        );
      });
      
      if (response.error) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to fetch analytics'
        }));
      } else {
        setData({
          metrics: response.metrics,
          recentRuns: response.recentRuns || [],
          loading: false,
          error: null,
          lastUpdated: Date.now()
        });
      }
    } catch (err) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    }
  }, [timeRange]);
  
  // Fetch on mount and time range change
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  
  return (
    <div style={{
      padding: '16px',
      minHeight: '100vh',
      backgroundColor: '#f9fafb'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Analytics Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Strategy performance and test run history
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              backgroundColor: '#ffffff'
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={fetchAnalytics}
            disabled={data.loading}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              cursor: data.loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {data.loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>
      
      {/* Error State */}
      {data.error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          marginBottom: '16px',
          fontSize: '13px'
        }}>
          ⚠️ {data.error}
        </div>
      )}
      
      {/* Loading State */}
      {data.loading && !data.metrics && (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div>Loading analytics...</div>
        </div>
      )}
      
      {/* Dashboard Content */}
      {!data.loading && (
        <>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <SummaryCard
              label="Total Executions"
              value={data.metrics?.totalExecutions || 0}
              icon="⚡"
            />
            <SummaryCard
              label="Strategies Used"
              value={Object.keys(data.metrics?.byStrategy || {}).length}
              icon="🎯"
            />
            <SummaryCard
              label="Recent Runs"
              value={data.recentRuns.length}
              icon="🏃"
            />
            <SummaryCard
              label="Success Rate"
              value={calculateOverallSuccessRate(data.metrics)}
              suffix="%"
              icon="✅"
            />
          </div>
          
          {/* Strategy Chart */}
          <div style={{ marginBottom: '20px' }}>
            <StrategyChart
              data={data.metrics?.byStrategy || {}}
              totalExecutions={data.metrics?.totalExecutions || 0}
            />
          </div>
          
          {/* Run History */}
          <RunHistory runs={data.recentRuns} maxRuns={10} />
          
          {/* Last Updated */}
          {data.lastUpdated && (
            <div style={{
              textAlign: 'center',
              padding: '16px',
              fontSize: '11px',
              color: '#9ca3af'
            }}>
              Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface SummaryCardProps {
  label: string;
  value: number | string;
  icon: string;
  suffix?: string;
}

function SummaryCard({ label, value, icon, suffix }: SummaryCardProps) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '8px'
      }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{label}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 600 }}>
        {value}{suffix}
      </div>
    </div>
  );
}

function calculateOverallSuccessRate(metrics: StrategyMetrics | null): number {
  if (!metrics || !metrics.byStrategy) return 0;
  
  let totalSuccesses = 0;
  let totalUses = 0;
  
  for (const stats of Object.values(metrics.byStrategy)) {
    totalSuccesses += stats.successes;
    totalUses += stats.uses;
  }
  
  return totalUses > 0 ? Math.round((totalSuccesses / totalUses) * 100) : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default Analytics;
