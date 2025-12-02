/**
 * StepList Component
 * 
 * Displays the list of all steps in a recording.
 * Wraps StepRow components with proper list semantics.
 */

import type { Step, Recording } from '../../types/vision';
import { StepRow } from './StepRow';

// ============================================================================
// TYPES
// ============================================================================

export interface StepListProps {
  /** The recording containing steps */
  recording: Recording;
  /** Callback to update a step */
  onUpdateStep: (stepIndex: number, updates: Partial<Step>) => void;
  /** Callback to delete a step */
  onDeleteStep: (stepIndex: number) => void;
  /** Currently selected step index */
  selectedStepIndex?: number;
  /** Callback when a step is selected */
  onSelectStep?: (stepIndex: number) => void;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * StepList - List of all recording steps.
 */
export function StepList({
  recording,
  onUpdateStep,
  onDeleteStep,
  selectedStepIndex,
  onSelectStep,
  disabled = false,
  className = '',
}: StepListProps): JSX.Element {
  const { steps, loopStartIndex } = recording;

  if (steps.length === 0) {
    return (
      <div 
        className={`
          p-8 text-center text-gray-500 dark:text-gray-400
          border border-dashed border-gray-300 dark:border-gray-700
          rounded-lg
          ${className}
        `}
      >
        <p className="text-lg mb-2">No steps recorded yet</p>
        <p className="text-sm">
          Click the Record button to start recording your workflow.
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`
        border border-gray-200 dark:border-gray-700
        rounded-lg overflow-hidden
        ${className}
      `}
      role="table"
      aria-label="Recording steps"
    >
      {/* Header */}
      <div 
        className="
          flex items-center gap-3 px-3 py-2
          bg-gray-50 dark:bg-gray-800
          border-b border-gray-200 dark:border-gray-700
          text-xs font-medium text-gray-500 dark:text-gray-400 uppercase
        "
        role="row"
      >
        <div className="w-8 text-center">#</div>
        <div className="flex-1">Step</div>
        <div className="w-32 text-center">Badges</div>
        <div className="w-10"></div>
      </div>

      {/* Rows */}
      <div role="rowgroup">
        {steps.map((step, index) => (
          <StepRow
            key={step.id || index}
            step={step}
            stepIndex={index}
            loopStartIndex={loopStartIndex}
            onUpdateStep={onUpdateStep}
            onDeleteStep={onDeleteStep}
            isSelected={selectedStepIndex === index}
            onClick={onSelectStep}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Footer with step count */}
      <div 
        className="
          px-3 py-2
          bg-gray-50 dark:bg-gray-800
          border-t border-gray-200 dark:border-gray-700
          text-xs text-gray-500 dark:text-gray-400
        "
      >
        {steps.length} step{steps.length !== 1 ? 's' : ''} recorded
        {loopStartIndex > 0 && (
          <span className="ml-2">
            • Loop starts at step {loopStartIndex + 1}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default StepList;
