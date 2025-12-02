/**
 * StepRow Component
 * 
 * Displays a single step in the recording with:
 * - Step number and label
 * - Event type and target
 * - Badges (Vision, Loop Start, Conditional, Delay)
 * - Three-dot menu for actions
 */

import type { Step, ConditionalConfig } from '../../types/vision';
import { StepBadges } from '../badges/StepBadges';
import { StepRowMenu } from './StepRowMenu';

// ============================================================================
// TYPES
// ============================================================================

export interface StepRowProps {
  /** The step data */
  step: Step;
  /** Step index in the recording (0-based) */
  stepIndex: number;
  /** Loop start index from recording settings */
  loopStartIndex: number;
  /** Callback to update step */
  onUpdateStep: (stepIndex: number, updates: Partial<Step>) => void;
  /** Callback to delete step */
  onDeleteStep: (stepIndex: number) => void;
  /** Whether the row is selected */
  isSelected?: boolean;
  /** Callback when row is clicked */
  onClick?: (stepIndex: number) => void;
  /** Whether controls are disabled */
  disabled?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get display text for event type.
 */
function getEventDisplay(event: string): string {
  const eventMap: Record<string, string> = {
    'open': 'Navigate',
    'click': 'Click',
    'input': 'Type',
    'dropdown': 'Select',
    'conditional-click': 'Conditional',
  };
  return eventMap[event] || event;
}

/**
 * Get target display (URL, selector, or label).
 */
function getTargetDisplay(step: Step): string {
  if (step.event === 'open' && step.url) {
    try {
      const url = new URL(step.url);
      return url.hostname + url.pathname.substring(0, 30);
    } catch {
      return step.url.substring(0, 40);
    }
  }
  
  if (step.event === 'conditional-click' && step.conditionalConfig?.searchTerms) {
    return `Looking for: "${step.conditionalConfig.searchTerms.slice(0, 2).join('", "')}"${step.conditionalConfig.searchTerms.length > 2 ? '...' : ''}`;
  }
  
  if (step.ocrText) {
    return `Text: "${step.ocrText.substring(0, 30)}"`;
  }
  
  if (step.selector) {
    return step.selector.substring(0, 40);
  }
  
  return step.label || 'Unknown target';
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * StepRow - Single step display with badges and actions.
 */
export function StepRow({
  step,
  stepIndex,
  loopStartIndex,
  onUpdateStep,
  onDeleteStep,
  isSelected = false,
  onClick,
  disabled = false,
}: StepRowProps): JSX.Element {
  /**
   * Handle delay update from menu.
   */
  const handleUpdateDelay = (index: number, delaySeconds: number | undefined) => {
    onUpdateStep(index, { delaySeconds });
  };

  /**
   * Handle conditional config update from menu.
   */
  const handleUpdateConditionalConfig = (index: number, config: ConditionalConfig) => {
    onUpdateStep(index, { conditionalConfig: config });
  };

  /**
   * Handle row click.
   */
  const handleRowClick = () => {
    if (onClick) {
      onClick(stepIndex);
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-3
        border-b border-gray-200 dark:border-gray-700
        ${isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/20' 
          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
        }
        ${onClick ? 'cursor-pointer' : ''}
        transition-colors
      `}
      onClick={handleRowClick}
      role="row"
      aria-selected={isSelected}
    >
      {/* Step Number */}
      <div 
        className="
          flex-shrink-0 w-8 h-8
          flex items-center justify-center
          rounded-full
          bg-gray-100 dark:bg-gray-700
          text-sm font-medium text-gray-600 dark:text-gray-400
        "
        aria-label={`Step ${stepIndex + 1}`}
      >
        {stepIndex + 1}
      </div>

      {/* Step Info */}
      <div className="flex-1 min-w-0">
        {/* Label and Event */}
        <div className="flex items-center gap-2 mb-1">
          {step.label && (
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {step.label}
            </span>
          )}
          <span 
            className={`
              px-1.5 py-0.5 text-xs rounded
              ${step.event === 'conditional-click' 
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }
            `}
          >
            {getEventDisplay(step.event)}
          </span>
        </div>

        {/* Target */}
        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {getTargetDisplay(step)}
        </div>

        {/* Value (for input/dropdown steps) */}
        {step.value && step.event !== 'conditional-click' && (
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
            Value: "{step.value.substring(0, 50)}{step.value.length > 50 ? '...' : ''}"
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex-shrink-0">
        <StepBadges
          step={step}
          stepIndex={stepIndex}
          loopStartIndex={loopStartIndex}
        />
      </div>

      {/* Menu */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <StepRowMenu
          step={step}
          stepIndex={stepIndex}
          onUpdateDelay={handleUpdateDelay}
          onUpdateConditionalConfig={handleUpdateConditionalConfig}
          onDeleteStep={onDeleteStep}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default StepRow;
