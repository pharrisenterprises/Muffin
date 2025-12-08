/**
 * @fileoverview Layer Indicator Component
 * @description Shows active capture layers during recording.
 * 
 * @module components/LayerIndicator
 * @version 1.0.0
 * @since Phase 4
 */

import React from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CaptureLayer = 'dom' | 'vision' | 'mouse' | 'network';

export interface LayerStatus {
  layer: CaptureLayer;
  active: boolean;
  capturing: boolean;
  lastCapture?: number;
}

export interface LayerIndicatorProps {
  layers: LayerStatus[];
  compact?: boolean;
  className?: string;
}

// ============================================================================
// LAYER METADATA
// ============================================================================

const LAYER_META: Record<CaptureLayer, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  dom: {
    label: 'DOM',
    icon: '🏗️',
    color: '#3b82f6',
    description: 'Captures selectors and element attributes'
  },
  vision: {
    label: 'Vision',
    icon: '👁️',
    color: '#8b5cf6',
    description: 'Captures screenshots and OCR text'
  },
  mouse: {
    label: 'Mouse',
    icon: '🖱️',
    color: '#ec4899',
    description: 'Tracks mouse movement patterns'
  },
  network: {
    label: 'Network',
    icon: '🌐',
    color: '#10b981',
    description: 'Monitors network requests'
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const LayerIndicator: React.FC<LayerIndicatorProps> = ({
  layers,
  compact = false,
  className = ''
}) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {layers.map(({ layer, active, capturing }) => {
          const meta = LAYER_META[layer];
          return (
            <span
              key={layer}
              className={`
                inline-flex items-center justify-center w-6 h-6 rounded
                ${active ? 'opacity-100' : 'opacity-30'}
                ${capturing ? 'animate-pulse' : ''}
              `}
              style={{ backgroundColor: active ? `${meta.color}20` : '#f3f4f6' }}
              title={`${meta.label}: ${active ? (capturing ? 'Capturing...' : 'Active') : 'Inactive'}`}
            >
              <span className="text-sm">{meta.icon}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        Capture Layers
      </div>
      <div className="grid grid-cols-2 gap-2">
        {layers.map(({ layer, active, capturing, lastCapture }) => {
          const meta = LAYER_META[layer];
          return (
            <div
              key={layer}
              className={`
                flex items-center gap-2 p-2 rounded-lg border
                ${active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-50'}
                ${capturing ? 'ring-2 ring-offset-1' : ''}
              `}
              style={{ 
                borderColor: capturing ? meta.color : undefined,
                ringColor: capturing ? meta.color : undefined
              }}
            >
              <span 
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full
                  ${capturing ? 'animate-pulse' : ''}
                `}
                style={{ backgroundColor: `${meta.color}20` }}
              >
                {meta.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {meta.label}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {capturing ? 'Capturing...' : (active ? 'Ready' : 'Disabled')}
                </div>
              </div>
              {active && (
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: capturing ? meta.color : '#10b981',
                    animation: capturing ? 'pulse 1s infinite' : 'none'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayerIndicator;
