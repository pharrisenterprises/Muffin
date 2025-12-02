/**
 * LoopStartDropdown Component
 * 
 * Dropdown for selecting which step begins the CSV loop for rows 2+.
 * Steps before the loop start are only executed on the first CSV row.
 * 
 * Build Card: UI-007
 */

import type { Step } from '../../types/vision';

// ============================================================================
// TYPES
// ============================================================================

export interface LoopStartDropdownProps {
  /** Array of recording steps */
  steps: Step[];
  /** Current loop start index (0-based) */
  value: number;
  /** Callback when loop start changes */
  onChange: (index: number) => void;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LoopStartDropdown - Select which step starts the CSV loop.
 * 
 * @example
 * ```tsx
 * <LoopStartDropdown
 *   steps={recording.steps}
 *   value={recording.loopStartIndex}
 *   onChange={(index) => updateRecording({ loopStartIndex: index })}
 * />
 * ```
 */
export function LoopStartDropdown({
  steps,
  value,
  onChange,
  disabled = false,
  className = '',
}: LoopStartDropdownProps): JSX.Element {
  /**
   * Handle dropdown change.
   */
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    if (!isNaN(newIndex) && newIndex >= 0 && newIndex < steps.length) {
      onChange(newIndex);
    }
  };

  /**
   * Generate step label for dropdown option.
   */
  const getStepLabel = (step: Step, index: number): string => {
    const stepNum = index + 1; // 1-indexed for display
    const label = step.label || step.event || `Step ${stepNum}`;
    const truncatedLabel = label.length > 25 ? `${label.substring(0, 22)}...` : label;
    return `Step ${stepNum}: ${truncatedLabel}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label 
        htmlFor="loop-start-dropdown"
        className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
      >
        CSV Loop Start:
      </label>
      <select
        id="loop-start-dropdown"
        value={value}
        onChange={handleChange}
        disabled={disabled || steps.length === 0}
        className="
          px-3 py-1.5 text-sm
          border border-gray-300 dark:border-gray-600
          rounded-md
          bg-white dark:bg-gray-700
          text-gray-900 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          min-w-[180px]
        "
        title="Select which step begins the loop for CSV rows 2 and beyond"
      >
        {steps.length === 0 ? (
          <option value={0}>No steps recorded</option>
        ) : (
          steps.map((step, index) => (
            <option key={step.id || index} value={index}>
              {index === 0 ? 'Loop from Step 1 (all steps)' : getStepLabel(step, index)}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default LoopStartDropdown;
