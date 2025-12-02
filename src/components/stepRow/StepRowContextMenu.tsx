/**
 * StepRowContextMenu Component
 * 
 * Context menu (three-dot menu) for step row actions.
 * Includes Set Delay, Configure Conditional, and View Vision Data options.
 * 
 * Build Cards: UI-011, UI-012
 */

import { useState } from 'react';
import { DelayDialog } from '../dialogs/DelayDialog';
import { ConditionalConfigDialog } from '../dialogs/ConditionalConfigDialog';
import type { Step, ConditionalConfig } from '../../types/vision';

// ============================================================================
// TYPES
// ============================================================================

export interface StepRowContextMenuProps {
  /** The step this menu is for */
  step: Step;
  /** Callback when delay is updated */
  onSetDelay: (delaySeconds: number | undefined) => void;
  /** Callback when conditional config is updated */
  onConfigureConditional: (config: ConditionalConfig) => void;
  /** Callback to delete the step */
  onDelete?: () => void;
  /** Callback to duplicate the step */
  onDuplicate?: () => void;
  /** Whether the menu is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Three-dot context menu for step row actions.
 */
export function StepRowContextMenu({
  step,
  onSetDelay,
  onConfigureConditional,
  onDelete,
  onDuplicate,
  disabled = false,
  className = '',
}: StepRowContextMenuProps): JSX.Element {
  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Dialog states
  const [delayDialogOpen, setDelayDialogOpen] = useState(false);
  const [conditionalDialogOpen, setConditionalDialogOpen] = useState(false);
  const [visionDataOpen, setVisionDataOpen] = useState(false);
  
  // Determine which options to show
  const isConditionalStep = step.event === 'conditional-click';
  const isVisionStep = step.recordedVia === 'vision';
  const hasVisionData = isVisionStep && (step.coordinates || step.ocrText);
  
  // Handle menu toggle
  const toggleMenu = () => {
    if (!disabled) {
      setMenuOpen(!menuOpen);
    }
  };
  
  // Close menu when clicking outside
  const closeMenu = () => {
    setMenuOpen(false);
  };
  
  // Handle Set Delay click
  const handleSetDelayClick = () => {
    setDelayDialogOpen(true);
    closeMenu();
  };
  
  // Handle Configure Conditional click
  const handleConfigureConditionalClick = () => {
    setConditionalDialogOpen(true);
    closeMenu();
  };
  
  // Handle View Vision Data click
  const handleViewVisionDataClick = () => {
    setVisionDataOpen(true);
    closeMenu();
  };
  
  // Handle Delete click
  const handleDeleteClick = () => {
    onDelete?.();
    closeMenu();
  };
  
  // Handle Duplicate click
  const handleDuplicateClick = () => {
    onDuplicate?.();
    closeMenu();
  };
  
  return (
    <div className={`relative ${className}`}>
      {/* Menu Button */}
      <button
        type="button"
        onClick={toggleMenu}
        disabled={disabled}
        className="
          p-1 rounded
          text-gray-500 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        aria-label="Step options"
        aria-haspopup="true"
        aria-expanded={menuOpen}
      >
        <svg 
          className="w-5 h-5" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      
      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={closeMenu}
          />
          
          {/* Menu Items */}
          <div 
            className="
              absolute right-0 z-20
              mt-1 w-56
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-md shadow-lg
              py-1
            "
            role="menu"
          >
            {/* Set Delay Before Step (UI-011) */}
            <button
              type="button"
              onClick={handleSetDelayClick}
              className="
                w-full px-4 py-2
                text-left text-sm
                text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700
              "
              role="menuitem"
            >
              <span className="mr-2">⏱️</span>
              Set Delay Before Step
            </button>
            
            {/* Configure Conditional (UI-012) - only for conditional steps */}
            {isConditionalStep && (
              <button
                type="button"
                onClick={handleConfigureConditionalClick}
                className="
                  w-full px-4 py-2
                  text-left text-sm
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700
                "
                role="menuitem"
              >
                <span className="mr-2">🎯</span>
                Configure Conditional
              </button>
            )}
            
            {/* View Vision Data - only for vision steps with data */}
            {hasVisionData && (
              <button
                type="button"
                onClick={handleViewVisionDataClick}
                className="
                  w-full px-4 py-2
                  text-left text-sm
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700
                "
                role="menuitem"
              >
                <span className="mr-2">👁️</span>
                View Vision Data
              </button>
            )}
            
            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            
            {/* Duplicate */}
            {onDuplicate && (
              <button
                type="button"
                onClick={handleDuplicateClick}
                className="
                  w-full px-4 py-2
                  text-left text-sm
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700
                "
                role="menuitem"
              >
                <span className="mr-2">📋</span>
                Duplicate Step
              </button>
            )}
            
            {/* Delete */}
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="
                  w-full px-4 py-2
                  text-left text-sm
                  text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-900/20
                "
                role="menuitem"
              >
                <span className="mr-2">🗑️</span>
                Delete Step
              </button>
            )}
          </div>
        </>
      )}
      
      {/* Delay Dialog */}
      <DelayDialog
        open={delayDialogOpen}
        onClose={() => setDelayDialogOpen(false)}
        initialDelay={step.delaySeconds}
        onSave={onSetDelay}
        stepLabel={step.label}
      />
      
      {/* Conditional Config Dialog */}
      <ConditionalConfigDialog
        open={conditionalDialogOpen}
        onClose={() => setConditionalDialogOpen(false)}
        initialConfig={step.conditionalConfig || null}
        onSave={onConfigureConditional}
      />
      
      {/* Vision Data Dialog */}
      {visionDataOpen && (
        <VisionDataDialog
          step={step}
          onClose={() => setVisionDataOpen(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// VISION DATA DIALOG (INLINE)
// ============================================================================

interface VisionDataDialogProps {
  step: Step;
  onClose: () => void;
}

/**
 * Simple dialog showing Vision capture data.
 */
function VisionDataDialog({ step, onClose }: VisionDataDialogProps): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vision Data
          </h2>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 space-y-3">
          {step.coordinates && (
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Coordinates:
              </span>
              <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">
                X: {step.coordinates.x}, Y: {step.coordinates.y}
                {'\n'}Size: {step.coordinates.width} × {step.coordinates.height}
              </pre>
            </div>
          )}
          
          {step.ocrText && (
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                OCR Text:
              </span>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                "{step.ocrText}"
              </p>
            </div>
          )}
          
          {step.confidenceScore !== undefined && (
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Confidence:
              </span>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {Math.round(step.confidenceScore * 100)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="
              px-4 py-2
              text-sm font-medium
              text-white
              bg-blue-600
              rounded-md
              hover:bg-blue-700
            "
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

export default StepRowContextMenu;
