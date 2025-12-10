// ═══════════════════════════════════════════════════════════════════════════════
// SP-B1: VerificationPanel Component
// Displays verification progress and steps needing repair
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useVerificationState } from '../hooks';
import type { StepVerificationState, VerificationStatus, VerificationSummary } from '../types';

/**
 * Props for VerificationPanel
 */
interface VerificationPanelProps {
  /** Callback when user clicks repair on a step */
  onRepairStep?: (stepIndex: number) => void;
  /** Callback when verification is complete and user wants to proceed */
  onComplete?: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Status badge colors and labels
 */
const STATUS_CONFIG: Record<VerificationStatus, { color: string; bg: string; label: string }> = {
  pending: { color: '#6b7280', bg: '#f3f4f6', label: 'Pending' },
  verifying: { color: '#3b82f6', bg: '#dbeafe', label: 'Verifying...' },
  verified: { color: '#10b981', bg: '#d1fae5', label: 'Verified' },
  flagged: { color: '#ef4444', bg: '#fee2e2', label: 'Flagged' },
  repaired: { color: '#8b5cf6', bg: '#ede9fe', label: 'Repaired' },
  skipped: { color: '#6b7280', bg: '#f3f4f6', label: 'Skipped' }
};

/**
 * Individual step row in verification list
 */
const StepRow: React.FC<{
  result: StepVerificationState;
  onRepair?: () => void;
}> = ({ result, onRepair }) => {
  const config = STATUS_CONFIG[result.status];
  const showRepairButton = result.status === 'flagged';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: result.status === 'flagged' ? '#fffbeb' : 'transparent'
    }}>
      {/* Step info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <span style={{ 
          fontWeight: 500, 
          color: '#374151',
          minWidth: '60px'
        }}>
          Step {result.stepIndex + 1}
        </span>
        
        {/* Status badge */}
        <span style={{
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 500,
          color: config.color,
          backgroundColor: config.bg
        }}>
          {config.label}
        </span>

        {/* Working strategy indicator */}
        {result.workingStrategy && (
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {result.workingStrategy.type}: {Math.round(result.confidence * 100)}%
          </span>
        )}
      </div>

      {/* Repair button */}
      {showRepairButton && onRepair && (
        <button
          onClick={onRepair}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#ffffff',
            backgroundColor: '#f59e0b',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Repair
        </button>
      )}

      {/* Flag reason */}
      {result.status === 'flagged' && result.flagReason && (
        <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px' }}>
          {result.flagReason}
        </span>
      )}
    </div>
  );
};

/**
 * Progress bar component
 */
const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '4px',
        fontSize: '12px',
        color: '#6b7280'
      }}>
        <span>Verifying steps...</span>
        <span>{current} / {total}</span>
      </div>
      <div style={{
        height: '8px',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: '#3b82f6',
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
};

/**
 * Summary section showing verification counts
 */
const Summary: React.FC<{ summary: VerificationSummary }> = ({ summary }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '12px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      marginBottom: '16px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '20px', fontWeight: 600, color: '#10b981' }}>{summary.verifiedCount}</div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>Verified</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '20px', fontWeight: 600, color: '#ef4444' }}>{summary.flaggedCount}</div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>Flagged</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '20px', fontWeight: 600, color: '#8b5cf6' }}>{summary.repairedCount}</div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>Repaired</div>
      </div>
      {summary.skippedCount > 0 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#6b7280' }}>{summary.skippedCount}</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Skipped</div>
        </div>
      )}
    </div>
  );
};

/**
 * VerificationPanel - Main verification progress display
 */
export const VerificationPanel: React.FC<VerificationPanelProps> = ({
  onRepairStep,
  onComplete,
  className
}) => {
  const { 
    session,
    isVerifying, 
    isComplete,
    error 
  } = useVerificationState();

  // Don't render if no session
  if (!session) {
    return null;
  }

  const hasStepsNeedingRepair = session.steps.some(step => step.status === 'flagged');
  const isAwaitingRepair = !isComplete && hasStepsNeedingRepair;

  return (
    <div 
      className={className}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '14px', 
          fontWeight: 600,
          color: '#111827'
        }}>
          {isVerifying && '🔍 Verifying Recording...'}
          {isAwaitingRepair && '⚠️ Steps Need Repair'}
          {isComplete && '✅ Verification Complete'}
          {session.status === 'idle' && '📋 Verification Ready'}
        </h3>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Error display */}
        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#fee2e2',
            borderRadius: '4px',
            color: '#dc2626',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {/* Progress bar (during verification) */}
        {isVerifying && (
          <ProgressBar 
            current={session.steps.filter(s => s.status !== 'pending').length} 
            total={session.steps.length} 
          />
        )}

        {/* Summary (when not verifying) */}
        {!isVerifying && session.steps.length > 0 && (
          <Summary summary={session.summary} />
        )}

        {/* Awaiting repair message */}
        {isAwaitingRepair && hasStepsNeedingRepair && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            color: '#92400e',
            fontSize: '13px'
          }}>
            {session.steps.filter(s => s.status === 'flagged').length} step(s) need your attention before saving.
          </div>
        )}

        {/* Step results list */}
        {session.steps.length > 0 && (
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {session.steps.map((result) => (
              <StepRow
                key={result.stepIndex}
                result={result}
                onRepair={
                  result.status === 'flagged' && onRepairStep
                    ? () => onRepairStep(result.stepIndex)
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {/* Complete button */}
        {isComplete && onComplete && (
          <button
            onClick={onComplete}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Continue to Save
          </button>
        )}
      </div>
    </div>
  );
};

export default VerificationPanel;

// ═══════════════════════════════════════════════════════════════════════════════
// END SP-B1
// ═══════════════════════════════════════════════════════════════════════════════
