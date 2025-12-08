/**
 * LogPanel Component
 * 
 * Displays execution logs and console output.
 * 
 * Build Card: UI-008 (stub)
 */

import React from 'react';

export interface LogPanelProps {
  logs: Array<{ message: string; timestamp: number; level: string }>;
  onClear?: () => void;
}

/**
 * LogPanel - Displays execution logs.
 */
const LogPanel: React.FC<LogPanelProps> = ({ logs, onClear }) => {
  return (
    <div className="log-panel">
      <div className="text-gray-600 p-4">
        LogPanel component (stub - R5)
        <div className="text-sm mt-2">Logs: {logs.length}</div>
        {onClear && (
          <button onClick={onClear} className="text-blue-600 text-sm mt-2">
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default LogPanel;
