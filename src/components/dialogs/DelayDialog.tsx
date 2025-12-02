/**
 * DelayDialog Component
 * 
 * Modal dialog for setting per-step delays.
 * Allows users to configure a delay in seconds before a step executes.
 */

import { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface DelayDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Initial delay value in seconds */
  initialDelay?: number;
  /** Callback when delay is saved */
  onSave: (delaySeconds: number | undefined) => void;
  /** Step label for context (optional) */
  stepLabel?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_DELAY = 0;
const MAX_DELAY = 3600; // 1 hour
const DEFAULT_DELAY = 5;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * DelayDialog - Modal for setting step delays.
 * 
 * @example
 * ```tsx
 * <DelayDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   initialDelay={step.delaySeconds}
 *   onSave={(delay) => updateStepDelay(stepIndex, delay)}
 * />
 * ```
 */
export function DelayDialog({
  open,
  onClose,
  initialDelay,
  onSave,
  stepLabel,
}: DelayDialogProps): JSX.Element | null {
  const [delay, setDelay] = useState<string>(
    initialDelay?.toString() || DEFAULT_DELAY.toString()
  );
  const [error, setError] = useState<string>('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDelay(initialDelay?.toString() || DEFAULT_DELAY.toString());
      setError('');
    }
  }, [open, initialDelay]);

  // Don't render if not open
  if (!open) {
    return null;
  }

  /**
   * Validate and parse the delay value.
   */
  const validateDelay = (value: string): number | null => {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      setError('Please enter a valid number');
      return null;
    }
    
    if (num < MIN_DELAY) {
      setError(`Delay must be at least ${MIN_DELAY} seconds`);
      return null;
    }
    
    if (num > MAX_DELAY) {
      setError(`Delay cannot exceed ${MAX_DELAY} seconds (1 hour)`);
      return null;
    }
    
    setError('');
    return num;
  };

  /**
   * Handle delay input change.
   */
  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDelay(value);
    if (value) {
      validateDelay(value);
    } else {
      setError('');
    }
  };

  /**
   * Handle save button click.
   */
  const handleSave = () => {
    if (!delay || delay === '0') {
      // Clear delay (set to undefined)
      onSave(undefined);
      onClose();
      return;
    }

    const validatedDelay = validateDelay(delay);
    if (validatedDelay !== null) {
      onSave(validatedDelay);
      onClose();
    }
  };

  /**
   * Handle clear button click.
   */
  const handleClear = () => {
    onSave(undefined);
    onClose();
  };

  /**
   * Handle keyboard events.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delay-dialog-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div 
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <h2 
          id="delay-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
        >
          Set Delay Before Step
        </h2>

        {stepLabel && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Step: {stepLabel}
          </p>
        )}

        {/* Input */}
        <div className="mb-4">
          <label 
            htmlFor="delay-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Delay (seconds)
          </label>
          <input
            id="delay-input"
            type="number"
            min={MIN_DELAY}
            max={MAX_DELAY}
            step="0.5"
            value={delay}
            onChange={handleDelayChange}
            className={`
              w-full px-3 py-2 border rounded-md
              text-gray-900 dark:text-white
              bg-white dark:bg-gray-700
              ${error 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }
              focus:outline-none focus:ring-2
            `}
            autoFocus
          />
          {error && (
            <p className="mt-1 text-sm text-red-500">{error}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter 0 or leave empty to remove delay. Max: {MAX_DELAY}s (1 hour)
          </p>
        </div>

        {/* Quick presets */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick presets:</p>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 5, 10, 30, 60].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDelay(preset.toString())}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {preset}s
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {initialDelay !== undefined && initialDelay > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Remove Delay
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!!error}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DelayDialog;
