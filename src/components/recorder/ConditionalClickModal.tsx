/**
 * ConditionalClickModal Component
 * 
 * Modal for configuring conditional click steps.
 * 
 * Build Card: UI-009 (stub)
 */

import React from 'react';
import type { ConditionalConfig } from '../../common/services/indexedDB';

export interface ConditionalClickModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: ConditionalConfig) => void;
  initialConfig?: ConditionalConfig | null;
}

/**
 * ConditionalClickModal - Configure conditional click behavior.
 */
const ConditionalClickModal: React.FC<ConditionalClickModalProps> = ({
  open,
  onClose,
  onSave,
  initialConfig
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <h3 className="text-lg font-semibold mb-4">Conditional Click Configuration (stub - R5)</h3>
        <div className="text-gray-600 text-sm mb-4">
          Configure conditional behavior for this step.
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(initialConfig || {
                enabled: true,
                searchTerms: [],
                timeoutSeconds: 30,
                pollIntervalMs: 1000,
                interactionType: 'click'
              });
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConditionalClickModal;
