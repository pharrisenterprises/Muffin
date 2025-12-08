/**
 * @fileoverview Strategy Badge Component
 * @description Displays strategy type with color coding and confidence.
 * 
 * @module components/StrategyBadge
 * @version 1.0.0
 * @since Phase 4
 */

import React from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type StrategyType = 
  | 'cdp_semantic'
  | 'cdp_power'
  | 'dom_selector'
  | 'css_selector'
  | 'evidence_scoring'
  | 'vision_ocr'
  | 'coordinates';

export interface StrategyBadgeProps {
  strategyType: StrategyType;
  confidence?: number;
  showConfidence?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================================================
// STRATEGY METADATA
// ============================================================================

const STRATEGY_META: Record<StrategyType, {
  label: string;
  color: string;
  bgColor: string;
  tier: number;
}> = {
  cdp_semantic: {
    label: 'Semantic',
    color: '#166534',
    bgColor: '#dcfce7',
    tier: 1
  },
  cdp_power: {
    label: 'CDP Power',
    color: '#15803d',
    bgColor: '#d1fae5',
    tier: 1
  },
  dom_selector: {
    label: 'DOM',
    color: '#1d4ed8',
    bgColor: '#dbeafe',
    tier: 2
  },
  css_selector: {
    label: 'CSS',
    color: '#2563eb',
    bgColor: '#e0e7ff',
    tier: 2
  },
  evidence_scoring: {
    label: 'Evidence',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    tier: 3
  },
  vision_ocr: {
    label: 'Vision',
    color: '#c026d3',
    bgColor: '#fae8ff',
    tier: 3
  },
  coordinates: {
    label: 'Coords',
    color: '#9ca3af',
    bgColor: '#f3f4f6',
    tier: 4
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const StrategyBadge: React.FC<StrategyBadgeProps> = ({
  strategyType,
  confidence,
  showConfidence = true,
  size = 'md',
  className = ''
}) => {
  const meta = STRATEGY_META[strategyType] ?? {
    label: strategyType,
    color: '#6b7280',
    bgColor: '#f3f4f6',
    tier: 4
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const confidencePercent = confidence !== undefined 
    ? Math.round(confidence * 100) 
    : null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: meta.bgColor,
        color: meta.color,
        border: `1px solid ${meta.color}20`
      }}
      title={`Strategy: ${meta.label}${confidencePercent !== null ? ` (${confidencePercent}% confidence)` : ''}`}
    >
      <span className="strategy-tier" style={{ opacity: 0.7 }}>
        {'●'.repeat(Math.max(1, 5 - meta.tier))}
      </span>
      <span>{meta.label}</span>
      {showConfidence && confidencePercent !== null && (
        <span style={{ opacity: 0.8 }}>{confidencePercent}%</span>
      )}
    </span>
  );
};

export default StrategyBadge;
