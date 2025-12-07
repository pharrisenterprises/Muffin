# Components Index Specification

**File ID:** H3  
**File Path:** `src/components/index.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Central export file for all reusable React components. Provides a single import point for StrategyBadge, LayerIndicator, and other shared UI components. Simplifies imports throughout the popup UI and ensures consistent component usage across all pages.

---

## Dependencies

### Exports (from)
- `./StrategyBadge`: StrategyBadge, StrategyBadgeList, StrategyLegend
- `./LayerIndicator`: LayerIndicator, LayerStatusBar, LayerConfigPanel
- `./ActionCard`: ActionCard, ActionCardCompact
- `./StepItem`: StepItem, StepList
- `./RunSummary`: RunSummaryCard, RunSummaryStats
- `./common/*`: Common UI primitives

### Used By (imports to)
- `../pages/App.tsx`
- `../pages/Recorder.tsx`
- `../pages/TestRunner.tsx`

---

## Complete Implementation

```typescript
/**
 * ============================================================================
 * STRATEGY COMPONENTS
 * ============================================================================
 */

export {
  StrategyBadge,
  StrategyBadgeList,
  StrategyLegend,
  STRATEGY_DISPLAY_INFO
} from './StrategyBadge';

export type {
  StrategyBadgeProps,
  StrategyDisplayInfo
} from './StrategyBadge';

/**
 * ============================================================================
 * LAYER COMPONENTS
 * ============================================================================
 */

export {
  LayerIndicator,
  LayerStatusBar,
  LayerConfigPanel,
  getLayerDisplayInfo,
  LAYER_DISPLAY_INFO
} from './LayerIndicator';

export type {
  LayerIndicatorProps,
  LayerDisplayInfo,
  LayerState
} from './LayerIndicator';

/**
 * ============================================================================
 * ACTION COMPONENTS
 * ============================================================================
 */

export { ActionCard } from './ActionCard';
export type { ActionCardProps } from './ActionCard';

/**
 * ActionCard - Displays a recorded action with strategy info
 */
// Implementation in ActionCard.tsx

/**
 * ============================================================================
 * STEP COMPONENTS
 * ============================================================================
 */

export { StepItem, StepList } from './StepItem';
export type { StepItemProps, StepListProps } from './StepItem';

/**
 * ============================================================================
 * RUN SUMMARY COMPONENTS
 * ============================================================================
 */

export { RunSummaryCard, RunSummaryStats, StrategyUsageBar } from './RunSummary';
export type { RunSummaryCardProps, RunSummaryStatsProps } from './RunSummary';

/**
 * ============================================================================
 * COMMON UI COMPONENTS
 * ============================================================================
 */

// Button variants
export { Button, IconButton } from './common/Button';
export type { ButtonProps, IconButtonProps } from './common/Button';

// Loading states
export { Spinner, LoadingOverlay, Skeleton } from './common/Loading';
export type { SpinnerProps, LoadingOverlayProps, SkeletonProps } from './common/Loading';

// Feedback
export { Alert, Toast, ErrorMessage } from './common/Feedback';
export type { AlertProps, ToastProps, ErrorMessageProps } from './common/Feedback';

// Layout
export { Card, Panel, Divider } from './common/Layout';
export type { CardProps, PanelProps, DividerProps } from './common/Layout';

// Form elements
export { Input, Select, Toggle, Checkbox } from './common/Form';
export type { InputProps, SelectProps, ToggleProps, CheckboxProps } from './common/Form';

// Typography
export { Text, Heading, Code, Badge } from './common/Typography';
export type { TextProps, HeadingProps, CodeProps, BadgeProps } from './common/Typography';

// Utility
export { Tooltip, Modal, Dropdown } from './common/Overlay';
export type { TooltipProps, ModalProps, DropdownProps } from './common/Overlay';

/**
 * ============================================================================
 * COMPOSITE COMPONENTS
 * ============================================================================
 */

/**
 * ConfidenceMeter - Visual confidence indicator
 */
export function ConfidenceMeter({
  value,
  size = 'medium',
  showLabel = true,
  className = ''
}: {
  value: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
}): JSX.Element {
  const percentage = Math.round(value * 100);
  const color = percentage >= 80 ? 'var(--color-success)' :
                percentage >= 60 ? 'var(--color-warning)' :
                'var(--color-error)';

  const sizeStyles = {
    small: { width: 40, height: 4, fontSize: 10 },
    medium: { width: 60, height: 6, fontSize: 12 },
    large: { width: 80, height: 8, fontSize: 14 }
  };

  const { width, height, fontSize } = sizeStyles[size];

  return (
    <div className={`confidence-meter ${className}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        className="confidence-meter__track"
        style={{
          width,
          height,
          background: 'var(--color-border)',
          borderRadius: height / 2,
          overflow: 'hidden'
        }}
      >
        <div
          className="confidence-meter__fill"
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: color,
            transition: 'width 0.2s ease'
          }}
        />
      </div>
      {showLabel && (
        <span
          className="confidence-meter__label"
          style={{ fontSize, color: 'var(--color-text-secondary)' }}
        >
          {percentage}%
        </span>
      )}
    </div>
  );
}

/**
 * DurationDisplay - Formatted duration display
 */
export function DurationDisplay({
  ms,
  precision = 0,
  className = ''
}: {
  ms: number;
  precision?: number;
  className?: string;
}): JSX.Element {
  let display: string;
  
  if (ms < 1000) {
    display = `${ms.toFixed(precision)}ms`;
  } else if (ms < 60000) {
    display = `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    display = `${minutes}m ${seconds}s`;
  }

  return (
    <span className={`duration-display ${className}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display}
    </span>
  );
}

/**
 * StatusDot - Simple status indicator dot
 */
export function StatusDot({
  status,
  size = 'medium',
  pulse = false,
  className = ''
}: {
  status: 'success' | 'warning' | 'error' | 'info' | 'idle';
  size?: 'small' | 'medium' | 'large';
  pulse?: boolean;
  className?: string;
}): JSX.Element {
  const colors = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-primary)',
    idle: 'var(--color-text-muted)'
  };

  const sizes = {
    small: 6,
    medium: 8,
    large: 10
  };

  return (
    <span
      className={`status-dot status-dot--${status} ${pulse ? 'status-dot--pulse' : ''} ${className}`}
      style={{
        display: 'inline-block',
        width: sizes[size],
        height: sizes[size],
        borderRadius: '50%',
        background: colors[status],
        animation: pulse ? 'pulse 1s infinite' : 'none'
      }}
    />
  );
}

/**
 * EmptyState - Empty state placeholder
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = ''
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}): JSX.Element {
  return (
    <div className={`empty-state ${className}`} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      textAlign: 'center'
    }}>
      {icon && (
        <span className="empty-state__icon" style={{ fontSize: 48, marginBottom: 16 }}>
          {icon}
        </span>
      )}
      <h3 className="empty-state__title" style={{
        fontSize: 16,
        fontWeight: 600,
        marginBottom: 8
      }}>
        {title}
      </h3>
      {description && (
        <p className="empty-state__description" style={{
          fontSize: 14,
          color: 'var(--color-text-secondary)',
          marginBottom: 16
        }}>
          {description}
        </p>
      )}
      {action && (
        <button
          className="empty-state__action btn btn-primary"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * CountBadge - Numeric count badge
 */
export function CountBadge({
  count,
  max = 99,
  variant = 'default',
  className = ''
}: {
  count: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}): JSX.Element | null {
  if (count <= 0) return null;

  const display = count > max ? `${max}+` : String(count);

  const variantStyles = {
    default: { background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' },
    success: { background: 'var(--color-success-light)', color: 'var(--color-success)' },
    warning: { background: 'var(--color-warning-light)', color: 'var(--color-warning)' },
    error: { background: 'var(--color-error-light)', color: 'var(--color-error)' }
  };

  return (
    <span
      className={`count-badge count-badge--${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 6px',
        borderRadius: 9,
        fontSize: 11,
        fontWeight: 600,
        ...variantStyles[variant]
      }}
    >
      {display}
    </span>
  );
}

/**
 * ProgressRing - Circular progress indicator
 */
export function ProgressRing({
  progress,
  size = 40,
  strokeWidth = 4,
  className = ''
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}): JSX.Element {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      className={`progress-ring ${className}`}
      width={size}
      height={size}
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle
        className="progress-ring__background"
        stroke="var(--color-border)"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="progress-ring__progress"
        stroke="var(--color-primary)"
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  );
}

/**
 * KeyboardShortcut - Display keyboard shortcut
 */
export function KeyboardShortcut({
  keys,
  className = ''
}: {
  keys: string[];
  className?: string;
}): JSX.Element {
  return (
    <span className={`keyboard-shortcut ${className}`} style={{ display: 'inline-flex', gap: 4 }}>
      {keys.map((key, index) => (
        <kbd
          key={index}
          style={{
            display: 'inline-block',
            padding: '2px 6px',
            fontSize: 11,
            fontFamily: 'inherit',
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
          }}
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

/**
 * ============================================================================
 * HOOKS (Shared)
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useDebounce - Debounce a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useInterval - Set up an interval
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * useToggle - Boolean toggle state
 */
export function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle, setValue];
}

/**
 * usePrevious - Get previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
```

---

## Usage Examples

### Import Strategy Components
```typescript
import { StrategyBadge, StrategyLegend } from '../components';

<StrategyBadge type="cdp_semantic" confidence={0.95} />
<StrategyLegend compact />
```

### Import Layer Components
```typescript
import { LayerIndicator, LayerStatusBar } from '../components';

<LayerStatusBar
  statuses={layerStatuses}
  isRecording={true}
  variant="compact"
/>
```

### Import Utility Components
```typescript
import {
  ConfidenceMeter,
  DurationDisplay,
  StatusDot,
  EmptyState
} from '../components';

<ConfidenceMeter value={0.87} />
<DurationDisplay ms={1234} />
<StatusDot status="success" pulse />
<EmptyState
  icon="📭"
  title="No recordings"
  description="Start by recording some actions"
/>
```

### Import Hooks
```typescript
import { useDebounce, useInterval, useToggle } from '../components';

const debouncedSearch = useDebounce(searchTerm, 300);
useInterval(() => pollStatus(), isPolling ? 2000 : null);
const [isOpen, toggleOpen] = useToggle(false);
```

---

## Component Hierarchy

```
components/
├── index.ts              ← This file
├── StrategyBadge.tsx     ← Strategy display components
├── LayerIndicator.tsx    ← Layer status components
├── ActionCard.tsx        ← Action display
├── StepItem.tsx          ← Step list items
├── RunSummary.tsx        ← Run results display
└── common/
    ├── Button.tsx        ← Button variants
    ├── Loading.tsx       ← Loading states
    ├── Feedback.tsx      ← Alerts, toasts
    ├── Layout.tsx        ← Card, panel
    ├── Form.tsx          ← Input, toggle
    ├── Typography.tsx    ← Text, code
    └── Overlay.tsx       ← Tooltip, modal
```

---

## Acceptance Criteria

- [ ] All strategy components exported
- [ ] All layer components exported
- [ ] All common components exported
- [ ] Composite components implemented
- [ ] Custom hooks exported
- [ ] Types exported for all components
- [ ] No circular dependencies
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Missing component file**: Compile error
2. **Duplicate exports**: TypeScript error
3. **Circular imports**: Avoided by structure
4. **Large export count**: Tree shaking handles
5. **Type-only exports**: Properly separated
6. **Component prop changes**: Types updated
7. **Hook dependency issues**: Properly declared
8. **SSR considerations**: N/A (extension only)
9. **Re-export conflicts**: Named exports only
10. **Component default props**: Defined in component

---

## Estimated Lines

300-350 lines
