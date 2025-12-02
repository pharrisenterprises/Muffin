/**
 * StepRowMenu Component
 * 
 * Three-dot menu for step actions including:
 * - Set Delay Before Step (UI-011)
 * - Configure Conditional (UI-012)
 * - View Vision Data (UI-013)
 * - Delete Step
 */

import { useState } from 'react';
import type { Step, ConditionalConfig } from '../../types/vision';
import { DelayDialog } from '../dialogs/DelayDialog';
import { ConditionalConfigDialog } from '../dialogs/ConditionalConfigDialog';

// ============================================================================
// TYPES
// ============================================================================

export interface StepRowMenuProps {
  /** The step data */
  step: Step;
  /** Step index in the recording */
  stepIndex: number;
  /** Callback to update step delay */
  onUpdateDelay: (stepIndex: number, delaySeconds: number | undefined) => void;
  /** Callback to update conditional config */
  onUpdateConditionalConfig: (stepIndex: number, config: ConditionalConfig) => void;
  /** Callback to delete step */
  onDeleteStep: (stepIndex: number) => void;
  /** Whether menu is disabled */
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * StepRowMenu - Three-dot menu for step actions.
 */
export function StepRowMenu({
  step,
  stepIndex,
  onUpdateDelay,
  onUpdateConditionalConfig,
  onDeleteStep,
  disabled = false,
}: StepRowMenuProps): JSX.Element {
  // Menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Dialog states
  const [isDelayDialogOpen, setIsDelayDialogOpen] = useState(false);
  const [isConditionalDialogOpen, setIsConditionalDialogOpen] = useState(false);
  const [isVisionDataOpen, setIsVisionDataOpen] = useState(false);

  /**
   * Close menu and open delay dialog.
   */
  const handleSetDelay = () => {
    setIsMenuOpen(false);
    setIsDelayDialogOpen(true);
  };

  /**
   * Close menu and open conditional dialog.
   */
  const handleConfigureConditional = () => {
    setIsMenuOpen(false);
    setIsConditionalDialogOpen(true);
  };

  /**
   * Close menu and open vision data view.
   */
  const handleViewVisionData = () => {
    setIsMenuOpen(false);
    setIsVisionDataOpen(true);
  };

  /**
   * Close menu and delete step.
   */
  const handleDelete = () => {
    setIsMenuOpen(false);
    if (window.confirm(`Delete step ${stepIndex + 1}?`)) {
      onDeleteStep(stepIndex);
    }
  };

  /**
   * Save delay from dialog.
   */
  const handleSaveDelay = (delaySeconds: number | undefined) => {
    onUpdateDelay(stepIndex, delaySeconds);
  };

  /**
   * Save conditional config from dialog.
   */
  const handleSaveConditional = (config: ConditionalConfig) => {
    onUpdateConditionalConfig(stepIndex, config);
  };

  const isConditionalStep = step.event === 'conditional-click';
  const isVisionStep = step.recordedVia === 'vision';

  return (
    <>
      {/* Menu Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          disabled={disabled}
          className="
            p-1.5 rounded-md
            text-gray-500 dark:text-gray-400
            hover:bg-gray-100 dark:hover:bg-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          aria-label="Step actions menu"
          aria-expanded={isMenuOpen}
          aria-haspopup="true"
        >
          <svg 
            className="w-5 h-5" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu */}
            <div 
              className="
                absolute right-0 mt-1 z-20
                w-56 py-1
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-md shadow-lg
              "
              role="menu"
              aria-orientation="vertical"
            >
              {/* Set Delay (UI-011) */}
              <button
                type="button"
                onClick={handleSetDelay}
                className="
                  w-full px-4 py-2 text-left text-sm
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  flex items-center gap-2
                "
                role="menuitem"
              >
                <span aria-hidden="true">⏱️</span>
                <span>Set Delay Before Step</span>
                {step.delaySeconds && (
                  <span className="ml-auto text-xs text-gray-500">
                    ({step.delaySeconds}s)
                  </span>
                )}
              </button>

              {/* Configure Conditional (UI-012) - only for conditional steps */}
              {isConditionalStep && (
                <button
                  type="button"
                  onClick={handleConfigureConditional}
                  className="
                    w-full px-4 py-2 text-left text-sm
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    flex items-center gap-2
                  "
                  role="menuitem"
                >
                  <span aria-hidden="true">🎯</span>
                  <span>Configure Conditional</span>
                </button>
              )}

              {/* View Vision Data (UI-013) - only for vision steps */}
              {isVisionStep && (
                <button
                  type="button"
                  onClick={handleViewVisionData}
                  className="
                    w-full px-4 py-2 text-left text-sm
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    flex items-center gap-2
                  "
                  role="menuitem"
                >
                  <span aria-hidden="true">👁️</span>
                  <span>View Vision Data</span>
                </button>
              )}

              {/* Divider */}
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

              {/* Delete Step */}
              <button
                type="button"
                onClick={handleDelete}
                className="
                  w-full px-4 py-2 text-left text-sm
                  text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-900/20
                  flex items-center gap-2
                "
                role="menuitem"
              >
                <span aria-hidden="true">🗑️</span>
                <span>Delete Step</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delay Dialog */}
      <DelayDialog
        open={isDelayDialogOpen}
        onClose={() => setIsDelayDialogOpen(false)}
        initialDelay={step.delaySeconds}
        onSave={handleSaveDelay}
        stepLabel={step.label || `Step ${stepIndex + 1}`}
      />

      {/* Conditional Config Dialog */}
      {isConditionalStep && (
        <ConditionalConfigDialog
          open={isConditionalDialogOpen}
          onClose={() => setIsConditionalDialogOpen(false)}
          initialConfig={step.conditionalConfig}
          onSave={handleSaveConditional}
        />
      )}

      {/* Vision Data Dialog */}
      {isVisionStep && isVisionDataOpen && (
        <VisionDataDialog
          open={isVisionDataOpen}
          onClose={() => setIsVisionDataOpen(false)}
          step={step}
        />
      )}
    </>
  );
}

// ============================================================================
// VISION DATA DIALOG (UI-013)
// ============================================================================

interface VisionDataDialogProps {
  open: boolean;
  onClose: () => void;
  step: Step;
}

/**
 * VisionDataDialog - Shows Vision capture details for a step.
 */
function VisionDataDialog({ open, onClose, step }: VisionDataDialogProps): JSX.Element | null {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vision-data-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <h2 
          id="vision-data-title"
          className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
        >
          Vision Capture Data
        </h2>

        {/* Content */}
        <div className="space-y-4 text-sm">
          {/* OCR Text */}
          {step.ocrText && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                OCR Text Matched
              </label>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white">
                "{step.ocrText}"
              </div>
            </div>
          )}

          {/* Confidence Score */}
          {step.confidenceScore !== undefined && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confidence Score
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${step.confidenceScore}%` }}
                  />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">
                  {step.confidenceScore.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* Coordinates */}
          {step.coordinates && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Click Coordinates
              </label>
              <div className="grid grid-cols-2 gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">X:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{step.coordinates.x}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Y:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{step.coordinates.y}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Width:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{step.coordinates.width}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Height:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{step.coordinates.height}</span>
                </div>
              </div>
            </div>
          )}

          {/* No Vision Data */}
          {!step.ocrText && !step.coordinates && (
            <p className="text-gray-500 dark:text-gray-400 italic">
              No Vision data available for this step.
            </p>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default StepRowMenu;
