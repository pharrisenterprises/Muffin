# StrategyBadge Component Specification

**File ID:** F4  
**File Path:** `src/components/StrategyBadge.tsx`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Creates a reusable React component for displaying strategy type badges throughout the UI. The StrategyBadge provides visual identification of which strategy type was used or is being evaluated, with color coding, icons, and tooltips. Used in Recorder (showing FallbackChain strategies), TestRunner (showing which strategy succeeded), and Analytics (strategy health dashboard). Ensures consistent visual language across the entire application.

---

## Dependencies

### Uses (imports from)
- `react`: React
- `../types/strategy`: StrategyType, STRATEGY_WEIGHTS, getStrategyCategory

### Used By (exports to)
- `../pages/Recorder.tsx`: Display strategies in action cards
- `../pages/TestRunner.tsx`: Display used strategy per step
- `../pages/Analytics.tsx`: Strategy metrics display
- `../components/ActionCard`: Strategy indicator
- `../components/StrategyResultsPanel`: Evaluation results

---

## Interfaces

```typescript
import React from 'react';
import { StrategyType, STRATEGY_WEIGHTS, getStrategyCategory, StrategyCategory } from '../types/strategy';

/**
 * StrategyBadge component props
 */
interface StrategyBadgeProps {
  /** Strategy type to display */
  type: StrategyType;
  /** Badge size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show confidence percentage */
  showConfidence?: boolean;
  /** Confidence value (0-1) if showing */
  confidence?: number;
  /** Whether to show the strategy name label */
  showLabel?: boolean;
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Whether badge is in "used" state (highlight) */
  isUsed?: boolean;
  /** Whether badge is in "found" state */
  isFound?: boolean;
  /** Whether badge is in "failed" state */
  isFailed?: boolean;
  /** Custom className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Strategy display info
 */
interface StrategyDisplayInfo {
  /** Short name for badge */
  shortName: string;
  /** Full display name */
  fullName: string;
  /** Icon/emoji */
  icon: string;
  /** Description for tooltip */
  description: string;
  /** Base color (CSS variable or hex) */
  color: string;
  /** Background color */
  bgColor: string;
  /** Category for grouping */
  category: StrategyCategory;
}

/**
 * Strategy info lookup
 */
const STRATEGY_DISPLAY_INFO: Record<StrategyType, StrategyDisplayInfo> = {
  cdp_semantic: {
    shortName: 'SEM',
    fullName: 'CDP Semantic',
    icon: '🎯',
    description: 'Role + accessible name (getByRole)',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    category: 'semantic'
  },
  cdp_power: {
    shortName: 'PWR',
    fullName: 'CDP Power',
    icon: '⚡',
    description: 'Text/label/placeholder (getByText, getByLabel)',
    color: '#8b5cf6',
    bgColor: '#f3e8ff',
    category: 'semantic'
  },
  dom_selector: {
    shortName: 'DOM',
    fullName: 'DOM Selector',
    icon: '🌳',
    description: 'ID or unique CSS selector',
    color: '#059669',
    bgColor: '#d1fae5',
    category: 'dom'
  },
  evidence_scoring: {
    shortName: 'EVD',
    fullName: 'Evidence Scoring',
    icon: '🔍',
    description: 'Mouse trail + attribute matching',
    color: '#d97706',
    bgColor: '#fef3c7',
    category: 'evidence'
  },
  css_selector: {
    shortName: 'CSS',
    fullName: 'CSS Selector',
    icon: '📝',
    description: 'CSS path selector',
    color: '#0891b2',
    bgColor: '#cffafe',
    category: 'dom'
  },
  vision_ocr: {
    shortName: 'OCR',
    fullName: 'Vision OCR',
    icon: '👁️',
    description: 'Text recognition from screenshot',
    color: '#db2777',
    bgColor: '#fce7f3',
    category: 'vision'
  },
  coordinates: {
    shortName: 'XY',
    fullName: 'Coordinates',
    icon: '📍',
    description: 'X/Y position fallback',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    category: 'coordinates'
  }
};
```

---

## Component Implementation

```typescript
/**
 * StrategyBadge - Visual badge for strategy type
 */
export function StrategyBadge({
  type,
  size = 'medium',
  showConfidence = false,
  confidence,
  showLabel = true,
  showTooltip = true,
  isUsed = false,
  isFound = false,
  isFailed = false,
  className = '',
  onClick
}: StrategyBadgeProps): JSX.Element {
  const info = STRATEGY_DISPLAY_INFO[type];
  const weight = STRATEGY_WEIGHTS[type];

  // Build class names
  const sizeClass = `strategy-badge--${size}`;
  const stateClasses = [
    isUsed && 'strategy-badge--used',
    isFound && 'strategy-badge--found',
    isFailed && 'strategy-badge--failed'
  ].filter(Boolean).join(' ');

  const badgeClasses = [
    'strategy-badge',
    sizeClass,
    stateClasses,
    onClick && 'strategy-badge--clickable',
    className
  ].filter(Boolean).join(' ');

  // Inline styles for colors
  const badgeStyle: React.CSSProperties = {
    '--badge-color': info.color,
    '--badge-bg': isFailed ? '#fee2e2' : isUsed ? info.color : info.bgColor,
    '--badge-text': isFailed ? '#dc2626' : isUsed ? '#ffffff' : info.color
  } as React.CSSProperties;

  // Format confidence display
  const confidenceDisplay = confidence !== undefined
    ? `${(confidence * 100).toFixed(0)}%`
    : `${(weight * 100).toFixed(0)}%`;

  // Tooltip content
  const tooltipContent = [
    info.fullName,
    info.description,
    `Base weight: ${(weight * 100).toFixed(0)}%`
  ].join('\n');

  return (
    <div
      className={badgeClasses}
      style={badgeStyle}
      onClick={onClick}
      title={showTooltip ? tooltipContent : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <span className="strategy-badge__icon">{info.icon}</span>
      
      {showLabel && (
        <span className="strategy-badge__label">
          {size === 'small' ? info.shortName : info.fullName}
        </span>
      )}

      {showConfidence && (
        <span className="strategy-badge__confidence">
          {confidenceDisplay}
        </span>
      )}

      {isUsed && (
        <span className="strategy-badge__used-indicator" aria-label="Used">
          ✓
        </span>
      )}
    </div>
  );
}

/**
 * Get strategy display info
 */
export function getStrategyDisplayInfo(type: StrategyType): StrategyDisplayInfo {
  return STRATEGY_DISPLAY_INFO[type];
}

/**
 * Get all strategy types sorted by weight
 */
export function getStrategiesByWeight(): StrategyType[] {
  return (Object.keys(STRATEGY_WEIGHTS) as StrategyType[])
    .sort((a, b) => STRATEGY_WEIGHTS[b] - STRATEGY_WEIGHTS[a]);
}

/**
 * StrategyBadgeList - Display multiple strategy badges
 */
export function StrategyBadgeList({
  strategies,
  maxDisplay = 3,
  size = 'small',
  showUsed,
  onStrategyClick
}: {
  strategies: Array<{ type: StrategyType; confidence?: number }>;
  maxDisplay?: number;
  size?: StrategyBadgeProps['size'];
  showUsed?: StrategyType;
  onStrategyClick?: (type: StrategyType) => void;
}): JSX.Element {
  const displayed = strategies.slice(0, maxDisplay);
  const remaining = strategies.length - maxDisplay;

  return (
    <div className="strategy-badge-list">
      {displayed.map((strategy, index) => (
        <StrategyBadge
          key={`${strategy.type}-${index}`}
          type={strategy.type}
          size={size}
          showLabel={size !== 'small'}
          showConfidence={size !== 'small'}
          confidence={strategy.confidence}
          isUsed={showUsed === strategy.type}
          onClick={onStrategyClick ? () => onStrategyClick(strategy.type) : undefined}
        />
      ))}
      
      {remaining > 0 && (
        <span className="strategy-badge-list__more">
          +{remaining}
        </span>
      )}
    </div>
  );
}

/**
 * StrategyLegend - Display all strategies with their colors
 */
export function StrategyLegend({
  compact = false,
  onSelect
}: {
  compact?: boolean;
  onSelect?: (type: StrategyType) => void;
}): JSX.Element {
  const strategies = getStrategiesByWeight();

  return (
    <div className={`strategy-legend ${compact ? 'strategy-legend--compact' : ''}`}>
      {strategies.map(type => {
        const info = STRATEGY_DISPLAY_INFO[type];
        const weight = STRATEGY_WEIGHTS[type];

        return (
          <div
            key={type}
            className="strategy-legend__item"
            onClick={onSelect ? () => onSelect(type) : undefined}
          >
            <StrategyBadge
              type={type}
              size={compact ? 'small' : 'medium'}
              showLabel={!compact}
              showConfidence={!compact}
            />
            
            {!compact && (
              <span className="strategy-legend__description">
                {info.description}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { STRATEGY_DISPLAY_INFO };
export type { StrategyBadgeProps, StrategyDisplayInfo };
```

---

## Styles (CSS)

```css
/* StrategyBadge.css */

.strategy-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 500;
  background-color: var(--badge-bg);
  color: var(--badge-text);
  border: 1px solid var(--badge-color);
  transition: all 0.15s ease;
}

/* Size variants */
.strategy-badge--small {
  padding: 1px 4px;
  font-size: 10px;
  border-radius: 3px;
  gap: 2px;
}

.strategy-badge--small .strategy-badge__icon {
  font-size: 10px;
}

.strategy-badge--medium {
  padding: 2px 8px;
  font-size: 12px;
}

.strategy-badge--medium .strategy-badge__icon {
  font-size: 12px;
}

.strategy-badge--large {
  padding: 4px 12px;
  font-size: 14px;
  border-radius: 6px;
  gap: 6px;
}

.strategy-badge--large .strategy-badge__icon {
  font-size: 16px;
}

/* State variants */
.strategy-badge--used {
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.strategy-badge--found {
  opacity: 1;
}

.strategy-badge--failed {
  opacity: 0.7;
  text-decoration: line-through;
}

.strategy-badge--clickable {
  cursor: pointer;
}

.strategy-badge--clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.strategy-badge--clickable:active {
  transform: translateY(0);
}

/* Parts */
.strategy-badge__icon {
  flex-shrink: 0;
}

.strategy-badge__label {
  white-space: nowrap;
}

.strategy-badge__confidence {
  opacity: 0.8;
  font-size: 0.9em;
}

.strategy-badge__used-indicator {
  margin-left: 2px;
  font-size: 0.8em;
}

/* Badge list */
.strategy-badge-list {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.strategy-badge-list__more {
  font-size: 11px;
  color: #6b7280;
  padding: 0 4px;
}

/* Legend */
.strategy-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strategy-legend--compact {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4px;
}

.strategy-legend__item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strategy-legend--compact .strategy-legend__item {
  gap: 4px;
}

.strategy-legend__description {
  font-size: 12px;
  color: #6b7280;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .strategy-badge {
    border-color: var(--badge-color);
  }

  .strategy-legend__description {
    color: #9ca3af;
  }

  .strategy-badge-list__more {
    color: #9ca3af;
  }
}
```

---

## Usage Examples

### Basic Badge
```tsx
import { StrategyBadge } from '../components/StrategyBadge';

// Simple badge
<StrategyBadge type="cdp_semantic" />

// Small badge without label
<StrategyBadge type="dom_selector" size="small" showLabel={false} />

// Badge with confidence
<StrategyBadge type="vision_ocr" showConfidence confidence={0.85} />

// Used state (highlighted)
<StrategyBadge type="cdp_power" isUsed />

// Failed state
<StrategyBadge type="coordinates" isFailed />
```

### Badge List
```tsx
import { StrategyBadgeList } from '../components/StrategyBadge';

const strategies = [
  { type: 'cdp_semantic', confidence: 0.95 },
  { type: 'dom_selector', confidence: 0.85 },
  { type: 'coordinates', confidence: 0.60 }
];

<StrategyBadgeList
  strategies={strategies}
  maxDisplay={2}
  showUsed="cdp_semantic"
/>
```

### Strategy Legend
```tsx
import { StrategyLegend } from '../components/StrategyBadge';

// Full legend with descriptions
<StrategyLegend onSelect={(type) => filterByStrategy(type)} />

// Compact legend
<StrategyLegend compact />
```

---

## Acceptance Criteria

- [ ] Displays all 7 strategy types correctly
- [ ] Size variants (small/medium/large) work
- [ ] Color coding matches strategy category
- [ ] Tooltip shows full description
- [ ] isUsed state highlights badge
- [ ] isFailed state shows strikethrough
- [ ] showConfidence displays percentage
- [ ] Click handler works with keyboard support
- [ ] StrategyBadgeList limits display count
- [ ] StrategyLegend shows all strategies
- [ ] Dark mode compatible
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Unknown strategy type**: Handle gracefully
2. **Very long label**: Truncate or wrap
3. **Confidence > 1 or < 0**: Clamp display
4. **Multiple state flags**: Combine styles
5. **No click handler**: Not clickable
6. **Missing tooltip**: Don't show title
7. **Empty badge list**: Show nothing
8. **All strategies failed**: All show failed state
9. **Zero confidence**: Show 0%
10. **RTL languages**: Badge layout works

---

## Estimated Lines

250-300 lines (component + styles)
