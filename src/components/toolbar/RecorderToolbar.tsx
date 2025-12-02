/**
 * RecorderToolbar Component
 * 
 * Combines all toolbar controls for the Recorder page:
 * - Loop Start Dropdown
 * - Global Delay Input
 * - Add Conditional Click Button
 */

import type { Step, Recording } from '../../types/vision';
import { LoopStartDropdown } from './LoopStartDropdown';
import { GlobalDelayInput } from './GlobalDelayInput';
import { AddConditionalButton } from './AddConditionalButton';

// ============================================================================
// TYPES
// ============================================================================

export interface RecorderToolbarProps {
  /** Current recording */
  recording: Recording;
  /** Whether currently recording */
  isRecording?: boolean;
  /** Toggle recording on/off */
  onToggleRecording?: () => void;
  /** Callback to update recording */
  onUpdateRecording: (updates: Partial<Recording>) => void;
  /** Callback to add a new step */
  onAddStep: (step: Step) => void;
  /** Callback to export steps */
  onExportSteps?: () => void;
  /** Callback to export header CSV */
  onExportHeader?: () => void;
  /** Whether controls are disabled (e.g., during recording) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * RecorderToolbar - All toolbar controls for the Recorder.
 * 
 * @example
 * ```tsx
 * <RecorderToolbar
 *   recording={recording}
 *   onUpdateRecording={updateRecording}
 *   onAddStep={addStep}
 *   disabled={isRecording}
 * />
 * ```
 */
export function RecorderToolbar({
  recording,
  isRecording: _isRecording,
  onToggleRecording: _onToggleRecording,
  onUpdateRecording,
  onAddStep,
  onExportSteps: _onExportSteps,
  onExportHeader: _onExportHeader,
  disabled = false,
  className = '',
}: RecorderToolbarProps): JSX.Element {
  return (
    <div 
      className={`
        flex flex-wrap items-center gap-4 
        p-3 
        bg-gray-50 dark:bg-gray-800 
        border-b border-gray-200 dark:border-gray-700
        ${className}
      `}
    >
      {/* Loop Start Dropdown */}
      <LoopStartDropdown
        steps={recording.steps}
        value={recording.loopStartIndex}
        onChange={(index) => onUpdateRecording({ loopStartIndex: index })}
        disabled={disabled}
      />

      {/* Separator */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" aria-hidden="true" />

      {/* Global Delay Input */}
      <GlobalDelayInput
        value={recording.globalDelayMs}
        onChange={(ms) => onUpdateRecording({ globalDelayMs: ms })}
        disabled={disabled}
      />

      {/* Separator */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" aria-hidden="true" />

      {/* Add Conditional Click Button */}
      <AddConditionalButton
        onAddStep={onAddStep}
        disabled={disabled}
      />
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default RecorderToolbar;
