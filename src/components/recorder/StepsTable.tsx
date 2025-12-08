/**
 * StepsTable Component
 * 
 * Displays recorded steps in a table format with drag-and-drop reordering.
 * 
 * Build Card: UI-007 (stub)
 */

import React from 'react';
import type { RecordedStep } from '../../common/services/indexedDB';

export interface StepsTableProps {
  steps: RecordedStep[];
  onStepClick?: (index: number) => void;
  onStepDelete?: (index: number) => void;
  selectedStepIndex?: number;
}

/**
 * StepsTable - Displays recorded test steps.
 */
const StepsTable: React.FC<StepsTableProps> = ({
  steps,
  onStepClick: _onStepClick,
  onStepDelete: _onStepDelete,
  selectedStepIndex: _selectedStepIndex
}) => {
  return (
    <div className="steps-table">
      <div className="text-gray-600 p-4">
        StepsTable component (stub - R5)
        <div className="text-sm mt-2">Steps: {steps.length}</div>
      </div>
    </div>
  );
};

export default StepsTable;
