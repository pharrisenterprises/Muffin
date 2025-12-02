/**
 * AddConditionalButton Component
 * 
 * Button that opens the ConditionalConfigDialog to add a new conditional click step.
 * 
 * Build Card: UI-009
 */

import { useState } from 'react';
import { ConditionalConfigDialog } from '../dialogs/ConditionalConfigDialog';
import type { Step, ConditionalConfig } from '../../types/vision';
import { createConditionalStep } from '../../lib/defaults';

// ============================================================================
// TYPES
// ============================================================================

export interface AddConditionalButtonProps {
  /** Callback when a new conditional step is created */
  onAddStep: (step: Step) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AddConditionalButton - Opens dialog to add conditional click step.
 * 
 * @example
 * ```tsx
 * <AddConditionalButton
 *   onAddStep={(step) => dispatch(addStep(step))}
 * />
 * ```
 */
export function AddConditionalButton({
  onAddStep,
  disabled = false,
  className = '',
}: AddConditionalButtonProps): JSX.Element {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  /**
   * Handle save from dialog.
   */
  const handleSave = (config: ConditionalConfig) => {
    const newStep = createConditionalStep(config, 'Conditional Click');
    onAddStep(newStep);
    setIsDialogOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled}
        className={`
          inline-flex items-center gap-1.5
          px-3 py-1.5 text-sm
          bg-orange-50 dark:bg-orange-900/30
          text-orange-700 dark:text-orange-300
          border border-orange-200 dark:border-orange-800
          rounded-md
          hover:bg-orange-100 dark:hover:bg-orange-900/50
          focus:outline-none focus:ring-2 focus:ring-orange-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title="Add a step that waits for and clicks dynamic buttons"
      >
        <span aria-hidden="true">🎯</span>
        <span>Add Conditional Click</span>
      </button>

      <ConditionalConfigDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        isNew={true}
      />
    </>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AddConditionalButton;
