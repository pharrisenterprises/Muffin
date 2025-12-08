/**
 * ConditionalConfigDialog Component
 * 
 * Modal dialog for configuring conditional click steps.
 * Allows users to set search terms, timeout, and interaction type.
 * 
 * Build Card: UI-006
 */

import { useState, useEffect } from 'react';
import type { ConditionalConfig } from '../../types/vision';
import { DEFAULT_CONDITIONAL_CONFIG } from '../../lib/defaults';

// ============================================================================
// TYPES
// ============================================================================

export interface ConditionalConfigDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Initial configuration */
  initialConfig?: ConditionalConfig | null;
  /** Callback when configuration is saved */
  onSave: (config: ConditionalConfig) => void;
  /** Whether this is for a new step (vs editing existing) */
  isNew?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_TIMEOUT = 1;
const MAX_TIMEOUT = 600; // 10 minutes
const MIN_POLL_INTERVAL = 100;
const MAX_POLL_INTERVAL = 10000;

const INTERACTION_TYPES = [
  { value: 'click', label: 'Click Button' },
  { value: 'dropdown', label: 'Select Dropdown Option' },
  { value: 'input', label: 'Enter Text' },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ConditionalConfigDialog - Modal for configuring conditional clicks.
 * 
 * @example
 * ```tsx
 * <ConditionalConfigDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   initialConfig={step.conditionalConfig}
 *   onSave={(config) => updateConditionalConfig(stepIndex, config)}
 * />
 * ```
 */
export function ConditionalConfigDialog({
  open,
  onClose,
  initialConfig,
  onSave,
  isNew = false,
}: ConditionalConfigDialogProps): JSX.Element | null {
  // Form state
  const [searchTermsInput, setSearchTermsInput] = useState('');
  const [timeout, setTimeout] = useState('120');
  const [pollInterval, setPollInterval] = useState('1000');
  const [interactionType, setInteractionType] = useState<'click' | 'input' | 'dropdown'>('click');
  const [dropdownOption, setDropdownOption] = useState('');
  const [inputValue, setInputValue] = useState('');
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      const config = initialConfig || DEFAULT_CONDITIONAL_CONFIG;
      setSearchTermsInput(config.searchTerms?.join(', ') || 'Allow, Keep');
      setTimeout(config.timeoutSeconds?.toString() || '120');
      setPollInterval(config.pollIntervalMs?.toString() || '1000');
      setInteractionType(config.interactionType || 'click');
      setDropdownOption(config.dropdownOption || '');
      setInputValue(config.inputValue || '');
      setErrors({});
    }
  }, [open, initialConfig]);

  // Don't render if not open
  if (!open) {
    return null;
  }

  /**
   * Validate the form.
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate search terms
    const terms = searchTermsInput.split(',').map(s => s.trim()).filter(Boolean);
    if (terms.length === 0) {
      newErrors.searchTerms = 'Enter at least one search term';
    }

    // Validate timeout
    const timeoutNum = parseInt(timeout);
    if (isNaN(timeoutNum) || timeoutNum < MIN_TIMEOUT) {
      newErrors.timeout = `Timeout must be at least ${MIN_TIMEOUT} second`;
    } else if (timeoutNum > MAX_TIMEOUT) {
      newErrors.timeout = `Timeout cannot exceed ${MAX_TIMEOUT} seconds`;
    }

    // Validate poll interval
    const pollNum = parseInt(pollInterval);
    if (isNaN(pollNum) || pollNum < MIN_POLL_INTERVAL) {
      newErrors.pollInterval = `Poll interval must be at least ${MIN_POLL_INTERVAL}ms`;
    } else if (pollNum > MAX_POLL_INTERVAL) {
      newErrors.pollInterval = `Poll interval cannot exceed ${MAX_POLL_INTERVAL}ms`;
    }

    // Validate dropdown option if interaction type is dropdown
    if (interactionType === 'dropdown' && !dropdownOption.trim()) {
      newErrors.dropdownOption = 'Enter the dropdown option to select';
    }

    // Validate input value if interaction type is input
    if (interactionType === 'input' && !inputValue.trim()) {
      newErrors.inputValue = 'Enter the text to input';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle save button click.
   */
  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const config: ConditionalConfig = {
      enabled: true,
      searchTerms: searchTermsInput.split(',').map(s => s.trim()).filter(Boolean),
      timeoutSeconds: parseInt(timeout) || 120,
      pollIntervalMs: parseInt(pollInterval) || 1000,
      interactionType,
      ...(interactionType === 'dropdown' && { dropdownOption: dropdownOption.trim() }),
      ...(interactionType === 'input' && { inputValue: inputValue.trim() }),
    };

    onSave(config);
    onClose();
  };

  /**
   * Handle keyboard events.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conditional-dialog-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div 
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <h2 
          id="conditional-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
        >
          {isNew ? 'Add Conditional Click' : 'Configure Conditional Click'}
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          This step will continuously scan the screen and click buttons matching the search terms until timeout.
        </p>

        {/* Form */}
        <div className="space-y-4">
          {/* Search Terms */}
          <div>
            <label 
              htmlFor="search-terms"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Search Terms (comma-separated)
            </label>
            <input
              id="search-terms"
              type="text"
              value={searchTermsInput}
              onChange={(e) => setSearchTermsInput(e.target.value)}
              placeholder="Allow, Keep, Continue, Accept"
              className={`
                w-full px-3 py-2 border rounded-md
                text-gray-900 dark:text-white
                bg-white dark:bg-gray-700
                ${errors.searchTerms 
                  ? 'border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
              autoFocus
            />
            {errors.searchTerms && (
              <p className="mt-1 text-sm text-red-500">{errors.searchTerms}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Button text to look for (case-insensitive, partial match)
            </p>
          </div>

          {/* Timeout */}
          <div>
            <label 
              htmlFor="timeout"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Timeout (seconds)
            </label>
            <input
              id="timeout"
              type="number"
              min={MIN_TIMEOUT}
              max={MAX_TIMEOUT}
              value={timeout}
              onChange={(e) => setTimeout(e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-md
                text-gray-900 dark:text-white
                bg-white dark:bg-gray-700
                ${errors.timeout 
                  ? 'border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            />
            {errors.timeout && (
              <p className="mt-1 text-sm text-red-500">{errors.timeout}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Time since last successful click before giving up ({MIN_TIMEOUT}-{MAX_TIMEOUT}s)
            </p>
          </div>

          {/* Poll Interval */}
          <div>
            <label 
              htmlFor="poll-interval"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Poll Interval (ms)
            </label>
            <input
              id="poll-interval"
              type="number"
              min={MIN_POLL_INTERVAL}
              max={MAX_POLL_INTERVAL}
              step={100}
              value={pollInterval}
              onChange={(e) => setPollInterval(e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-md
                text-gray-900 dark:text-white
                bg-white dark:bg-gray-700
                ${errors.pollInterval 
                  ? 'border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            />
            {errors.pollInterval && (
              <p className="mt-1 text-sm text-red-500">{errors.pollInterval}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              How often to scan the screen (higher = less CPU usage)
            </p>
          </div>

          {/* Interaction Type */}
          <div>
            <label 
              htmlFor="interaction-type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Interaction Type
            </label>
            <select
              id="interaction-type"
              value={interactionType}
              onChange={(e) => setInteractionType(e.target.value as typeof interactionType)}
              className="
                w-full px-3 py-2 border rounded-md
                text-gray-900 dark:text-white
                bg-white dark:bg-gray-700
                border-gray-300 dark:border-gray-600
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            >
              {INTERACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Option (conditional) */}
          {interactionType === 'dropdown' && (
            <div>
              <label 
                htmlFor="dropdown-option"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Dropdown Option to Select
              </label>
              <input
                id="dropdown-option"
                type="text"
                value={dropdownOption}
                onChange={(e) => setDropdownOption(e.target.value)}
                placeholder="Option text to select"
                className={`
                  w-full px-3 py-2 border rounded-md
                  text-gray-900 dark:text-white
                  bg-white dark:bg-gray-700
                  ${errors.dropdownOption 
                    ? 'border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                `}
              />
              {errors.dropdownOption && (
                <p className="mt-1 text-sm text-red-500">{errors.dropdownOption}</p>
              )}
            </div>
          )}

          {/* Input Value (conditional) */}
          {interactionType === 'input' && (
            <div>
              <label 
                htmlFor="input-value"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Text to Input
              </label>
              <input
                id="input-value"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Text to enter"
                className={`
                  w-full px-3 py-2 border rounded-md
                  text-gray-900 dark:text-white
                  bg-white dark:bg-gray-700
                  ${errors.inputValue 
                    ? 'border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                `}
              />
              {errors.inputValue && (
                <p className="mt-1 text-sm text-red-500">{errors.inputValue}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
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
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isNew ? 'Add Step' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ConditionalConfigDialog;
