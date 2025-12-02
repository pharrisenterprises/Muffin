/**
 * GlobalDelayInput Component
 * 
 * Number input for setting the global delay between steps.
 * This delay is applied AFTER each step completes (unless overridden by per-step delay).
 * 
 * Build Card: UI-008
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface GlobalDelayInputProps {
  /** Current delay value in milliseconds */
  value: number;
  /** Callback when delay changes */
  onChange: (delayMs: number) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_DELAY = 0;
const MAX_DELAY = 60000; // 60 seconds
const DEBOUNCE_MS = 300;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * GlobalDelayInput - Input for global delay between steps.
 * 
 * @example
 * ```tsx
 * <GlobalDelayInput
 *   value={recording.globalDelayMs}
 *   onChange={(ms) => updateRecording({ globalDelayMs: ms })}
 * />
 * ```
 */
export function GlobalDelayInput({
  value,
  onChange,
  disabled = false,
  className = '',
}: GlobalDelayInputProps): JSX.Element {
  // Local state for immediate UI updates
  const [localValue, setLocalValue] = useState<string>(value.toString());
  
  // Sync local state when prop changes externally
  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  /**
   * Debounced onChange handler.
   */
  const debouncedOnChange = useCallback(
    (() => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return (newValue: number) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onChange(newValue);
        }, DEBOUNCE_MS);
      };
    })(),
    [onChange]
  );

  /**
   * Handle input change.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);

    // Parse and validate
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(MIN_DELAY, Math.min(MAX_DELAY, numValue));
      debouncedOnChange(clampedValue);
    }
  };

  /**
   * Handle blur - ensure valid value.
   */
  const handleBlur = () => {
    const numValue = parseInt(localValue, 10);
    if (isNaN(numValue) || numValue < MIN_DELAY) {
      setLocalValue(MIN_DELAY.toString());
      onChange(MIN_DELAY);
    } else if (numValue > MAX_DELAY) {
      setLocalValue(MAX_DELAY.toString());
      onChange(MAX_DELAY);
    } else {
      setLocalValue(numValue.toString());
      onChange(numValue);
    }
  };

  /**
   * Handle keyboard shortcuts.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label 
        htmlFor="global-delay-input"
        className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
      >
        Delay:
      </label>
      <div className="relative">
        <input
          id="global-delay-input"
          type="number"
          min={MIN_DELAY}
          max={MAX_DELAY}
          step={100}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="
            w-20 px-2 py-1.5 text-sm text-right
            border border-gray-300 dark:border-gray-600
            rounded-md
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            pr-8
          "
          title="Delay in milliseconds between each step (0-60000)"
        />
        <span 
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none"
        >
          ms
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GlobalDelayInput;
