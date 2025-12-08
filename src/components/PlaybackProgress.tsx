/**
 * @fileoverview Playback Progress Component
 * @description Shows test execution progress with step details.
 * 
 * @module components/PlaybackProgress
 * @version 1.0.0
 * @since Phase 4
 */

import React from 'react';
import { StrategyBadge, StrategyType } from './StrategyBadge';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StepProgress {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  strategyUsed?: StrategyType;
  duration?: number;
  error?: string;
}

export interface PlaybackProgressProps {
  steps: StepProgress[];
  currentStep: number;
  isRunning: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PlaybackProgress: React.FC<PlaybackProgressProps> = ({
  steps,
  currentStep,
  isRunning,
  className = ''
}) => {
  const passed = steps.filter(s => s.status === 'passed').length;
  const failed = steps.filter(s => s.status === 'failed').length;
  const progressPercent = steps.length > 0 ? (currentStep / steps.length) * 100 : 0;

  const statusColors = {
    pending: '#9ca3af',
    running: '#3b82f6',
    passed: '#10b981',
    failed: '#ef4444'
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-gray-500">
            {passed} passed, {failed} failed
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: failed > 0 ? '#ef4444' : '#10b981'
            }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="max-h-64 overflow-y-auto space-y-1">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`
              flex items-center gap-2 p-2 rounded text-sm
              ${index === currentStep - 1 && isRunning ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-gray-50'}
            `}
          >
            {/* Status indicator */}
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                step.status === 'running' ? 'animate-pulse' : ''
              }`}
              style={{ backgroundColor: statusColors[step.status] }}
            />

            {/* Step info */}
            <div className="flex-1 min-w-0">
              <span className="font-mono text-gray-600">{step.type}</span>
            </div>

            {/* Strategy badge */}
            {step.strategyUsed && (
              <StrategyBadge
                strategyType={step.strategyUsed}
                showConfidence={false}
                size="sm"
              />
            )}

            {/* Duration */}
            {step.duration !== undefined && (
              <span className="text-xs text-gray-400">
                {step.duration}ms
              </span>
            )}

            {/* Status icon */}
            <span className="flex-shrink-0">
              {step.status === 'passed' && '✅'}
              {step.status === 'failed' && '❌'}
              {step.status === 'running' && '⏳'}
              {step.status === 'pending' && '○'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaybackProgress;
