# LayerIndicator Component Specification

**File ID:** F5  
**File Path:** `src/components/LayerIndicator.tsx`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Creates a reusable React component for displaying capture layer status during recording. The LayerIndicator provides visual feedback on which layers (DOM, Vision, Mouse, Network) are enabled, their initialization state, capture counts, and any errors. Used primarily in the Recorder UI to give users confidence that all layers are capturing data correctly. Supports toggle controls for enabling/disabling optional layers mid-recording.

---

## Dependencies

### Uses (imports from)
- `react`: React, useState
- `../types/recording`: LayerType, LayerStatus

### Used By (exports to)
- `../pages/Recorder.tsx`: Layer status display
- `../components/RecordingStatusBar`: Compact layer indicators

---

## Interfaces

```typescript
import React, { useState } from 'react';
import { LayerType, LayerStatus } from '../types/recording';

/**
 * LayerIndicator component props
 */
interface LayerIndicatorProps {
  /** Layer type */
  layer: LayerType;
  /** Layer status (null if not initialized) */
  status: LayerStatus | null;
  /** Whether layer can be toggled */
  canToggle?: boolean;
  /** Toggle handler */
  onToggle?: (enabled: boolean) => void;
  /** Whether recording is active */
  isRecording?: boolean;
  /** Display variant */
  variant?: 'full' | 'compact' | 'minimal';
  /** Whether to show capture count */
  showCaptureCount?: boolean;
  /** Whether to show error details */
  showErrors?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Layer display info
 */
interface LayerDisplayInfo {
  /** Layer name */
  name: string;
  /** Short name */
  shortName: string;
  /** Icon/emoji */
  icon: string;
  /** Description */
  description: string;
  /** Color theme */
  color: string;
  /** Whether layer is required */
  required: boolean;
  /** Estimated init time */
  initTimeHint: string;
}

/**
 * Layer info lookup
 */
const LAYER_DISPLAY_INFO: Record<LayerType, LayerDisplayInfo> = {
  dom: {
    name: 'DOM Capture',
    shortName: 'DOM',
    icon: '🌳',
    description: 'Captures element selectors, attributes, and structure',
    color: '#059669',
    required: true,
    initTimeHint: 'Instant'
  },
  vision: {
    name: 'Vision Capture',
    shortName: 'Vision',
    icon: '👁️',
    description: 'Captures screenshots and performs OCR text recognition',
    color: '#db2777',
    required: false,
    initTimeHint: '~2 seconds (Tesseract init)'
  },
  mouse: {
    name: 'Mouse Capture',
    shortName: 'Mouse',
    icon: '🖱️',
    description: 'Captures mouse movement trails and patterns',
    color: '#d97706',
    required: false,
    initTimeHint: 'Instant'
  },
  network: {
    name: 'Network Capture',
    shortName: 'Network',
    icon: '🌐',
    description: 'Tracks network requests and page load state',
    color: '#0891b2',
    required: false,
    initTimeHint: 'Instant'
  }
};

/**
 * Layer status state
 */
type LayerState = 'disabled' | 'initializing' | 'ready' | 'capturing' | 'error' | 'idle';
```

---

## Component Implementation

```typescript
/**
 * LayerIndicator - Visual indicator for capture layer status
 */
export function LayerIndicator({
  layer,
  status,
  canToggle = true,
  onToggle,
  isRecording = false,
  variant = 'full',
  showCaptureCount = true,
  showErrors = true,
  className = ''
}: LayerIndicatorProps): JSX.Element {
  const info = LAYER_DISPLAY_INFO[layer];
  
  // Determine layer state
  const layerState = getLayerState(status, isRecording);
  
  // Build class names
  const indicatorClasses = [
    'layer-indicator',
    `layer-indicator--${variant}`,
    `layer-indicator--${layerState}`,
    info.required && 'layer-indicator--required',
    className
  ].filter(Boolean).join(' ');

  // Inline styles for color theming
  const indicatorStyle: React.CSSProperties = {
    '--layer-color': info.color,
    '--layer-color-light': `${info.color}20`
  } as React.CSSProperties;

  if (variant === 'minimal') {
    return (
      <MinimalIndicator
        layer={layer}
        status={status}
        info={info}
        state={layerState}
        style={indicatorStyle}
        className={indicatorClasses}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <CompactIndicator
        layer={layer}
        status={status}
        info={info}
        state={layerState}
        showCaptureCount={showCaptureCount}
        style={indicatorStyle}
        className={indicatorClasses}
      />
    );
  }

  // Full variant
  return (
    <div className={indicatorClasses} style={indicatorStyle}>
      <div className="layer-indicator__header">
        <span className="layer-indicator__icon">{info.icon}</span>
        <span className="layer-indicator__name">{info.name}</span>
        <StatusDot state={layerState} />
      </div>

      <div className="layer-indicator__body">
        <p className="layer-indicator__description">{info.description}</p>
        
        {status && showCaptureCount && (
          <div className="layer-indicator__stats">
            <span className="stat">
              <span className="stat-value">{status.captureCount}</span>
              <span className="stat-label">captures</span>
            </span>
            {showErrors && status.errorCount > 0 && (
              <span className="stat stat--error">
                <span className="stat-value">{status.errorCount}</span>
                <span className="stat-label">errors</span>
              </span>
            )}
          </div>
        )}

        {showErrors && status?.lastError && (
          <div className="layer-indicator__error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{status.lastError}</span>
          </div>
        )}
      </div>

      <div className="layer-indicator__footer">
        {info.required ? (
          <span className="required-badge">Required</span>
        ) : canToggle && onToggle ? (
          <ToggleSwitch
            enabled={status?.enabled ?? false}
            onChange={onToggle}
            disabled={isRecording && status?.enabled}
            label={status?.enabled ? 'Enabled' : 'Disabled'}
          />
        ) : (
          <span className="status-text">{getStatusText(layerState)}</span>
        )}
        
        {layerState === 'initializing' && (
          <span className="init-hint">{info.initTimeHint}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal indicator (just icon + dot)
 */
function MinimalIndicator({
  layer,
  status,
  info,
  state,
  style,
  className
}: {
  layer: LayerType;
  status: LayerStatus | null;
  info: LayerDisplayInfo;
  state: LayerState;
  style: React.CSSProperties;
  className: string;
}): JSX.Element {
  const tooltipContent = [
    info.name,
    getStatusText(state),
    status ? `${status.captureCount} captures` : ''
  ].filter(Boolean).join(' • ');

  return (
    <div
      className={className}
      style={style}
      title={tooltipContent}
    >
      <span className="layer-indicator__icon">{info.icon}</span>
      <StatusDot state={state} size="small" />
    </div>
  );
}

/**
 * Compact indicator (icon + name + count)
 */
function CompactIndicator({
  layer,
  status,
  info,
  state,
  showCaptureCount,
  style,
  className
}: {
  layer: LayerType;
  status: LayerStatus | null;
  info: LayerDisplayInfo;
  state: LayerState;
  showCaptureCount: boolean;
  style: React.CSSProperties;
  className: string;
}): JSX.Element {
  return (
    <div className={className} style={style}>
      <span className="layer-indicator__icon">{info.icon}</span>
      <span className="layer-indicator__short-name">{info.shortName}</span>
      <StatusDot state={state} size="small" />
      
      {showCaptureCount && status && status.captureCount > 0 && (
        <span className="layer-indicator__count">{status.captureCount}</span>
      )}
    </div>
  );
}

/**
 * Status dot indicator
 */
function StatusDot({
  state,
  size = 'medium'
}: {
  state: LayerState;
  size?: 'small' | 'medium';
}): JSX.Element {
  const dotClass = `status-dot status-dot--${state} status-dot--${size}`;
  
  return (
    <span className={dotClass} aria-label={getStatusText(state)}>
      {state === 'initializing' && <span className="status-dot__spinner" />}
    </span>
  );
}

/**
 * Toggle switch component
 */
function ToggleSwitch({
  enabled,
  onChange,
  disabled,
  label
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
}): JSX.Element {
  return (
    <label className={`toggle-switch ${disabled ? 'toggle-switch--disabled' : ''}`}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle-switch__track">
        <span className="toggle-switch__thumb" />
      </span>
      {label && <span className="toggle-switch__label">{label}</span>}
    </label>
  );
}

/**
 * Get layer state from status
 */
function getLayerState(status: LayerStatus | null, isRecording: boolean): LayerState {
  if (!status) return 'disabled';
  if (!status.enabled) return 'disabled';
  if (!status.ready) return 'initializing';
  if (status.errorCount > 0 && status.captureCount === 0) return 'error';
  if (isRecording && status.captureCount > 0) return 'capturing';
  if (status.ready) return 'ready';
  return 'idle';
}

/**
 * Get human-readable status text
 */
function getStatusText(state: LayerState): string {
  switch (state) {
    case 'disabled': return 'Disabled';
    case 'initializing': return 'Initializing...';
    case 'ready': return 'Ready';
    case 'capturing': return 'Capturing';
    case 'error': return 'Error';
    case 'idle': return 'Idle';
    default: return 'Unknown';
  }
}

/**
 * Get layer display info
 */
export function getLayerDisplayInfo(layer: LayerType): LayerDisplayInfo {
  return LAYER_DISPLAY_INFO[layer];
}

/**
 * LayerStatusBar - Horizontal bar of all layer indicators
 */
export function LayerStatusBar({
  statuses,
  isRecording,
  variant = 'compact',
  onToggle
}: {
  statuses: LayerStatus[];
  isRecording: boolean;
  variant?: 'compact' | 'minimal';
  onToggle?: (layer: LayerType, enabled: boolean) => void;
}): JSX.Element {
  const layers: LayerType[] = ['dom', 'vision', 'mouse', 'network'];

  return (
    <div className={`layer-status-bar layer-status-bar--${variant}`}>
      {layers.map(layer => {
        const status = statuses.find(s => s.type === layer) || null;
        return (
          <LayerIndicator
            key={layer}
            layer={layer}
            status={status}
            variant={variant}
            isRecording={isRecording}
            canToggle={!LAYER_DISPLAY_INFO[layer].required}
            onToggle={onToggle ? (enabled) => onToggle(layer, enabled) : undefined}
          />
        );
      })}
    </div>
  );
}

/**
 * LayerConfigPanel - Configuration panel for all layers
 */
export function LayerConfigPanel({
  statuses,
  onToggle,
  disabled
}: {
  statuses: LayerStatus[];
  onToggle: (layer: LayerType, enabled: boolean) => void;
  disabled?: boolean;
}): JSX.Element {
  const layers: LayerType[] = ['dom', 'vision', 'mouse', 'network'];

  return (
    <div className="layer-config-panel">
      <h4 className="layer-config-panel__title">Capture Layers</h4>
      <div className="layer-config-panel__list">
        {layers.map(layer => {
          const info = LAYER_DISPLAY_INFO[layer];
          const status = statuses.find(s => s.type === layer);
          const enabled = status?.enabled ?? true;

          return (
            <div key={layer} className="layer-config-item">
              <div className="layer-config-item__info">
                <span className="layer-config-item__icon">{info.icon}</span>
                <div className="layer-config-item__text">
                  <span className="layer-config-item__name">{info.name}</span>
                  <span className="layer-config-item__desc">{info.description}</span>
                </div>
              </div>

              <div className="layer-config-item__control">
                {info.required ? (
                  <span className="required-badge">Required</span>
                ) : (
                  <ToggleSwitch
                    enabled={enabled}
                    onChange={(val) => onToggle(layer, val)}
                    disabled={disabled}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { LAYER_DISPLAY_INFO };
export type { LayerIndicatorProps, LayerDisplayInfo, LayerState };
```

---

## Styles (CSS)

```css
/* LayerIndicator.css */

/* Base indicator */
.layer-indicator {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.layer-indicator--ready {
  border-color: var(--layer-color);
}

.layer-indicator--capturing {
  border-color: var(--layer-color);
  box-shadow: 0 0 0 2px var(--layer-color-light);
}

.layer-indicator--error {
  border-color: #ef4444;
}

.layer-indicator--disabled {
  opacity: 0.5;
}

/* Full variant */
.layer-indicator--full {
  padding: 12px;
  gap: 8px;
}

.layer-indicator--full .layer-indicator__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layer-indicator--full .layer-indicator__icon {
  font-size: 20px;
}

.layer-indicator--full .layer-indicator__name {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
}

.layer-indicator--full .layer-indicator__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-indicator--full .layer-indicator__description {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.layer-indicator--full .layer-indicator__stats {
  display: flex;
  gap: 16px;
}

.layer-indicator--full .stat {
  display: flex;
  flex-direction: column;
}

.layer-indicator--full .stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--layer-color);
}

.layer-indicator--full .stat-label {
  font-size: 10px;
  color: #9ca3af;
  text-transform: uppercase;
}

.layer-indicator--full .stat--error .stat-value {
  color: #ef4444;
}

.layer-indicator--full .layer-indicator__error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #fef2f2;
  border-radius: 4px;
  font-size: 11px;
  color: #dc2626;
}

.layer-indicator--full .layer-indicator__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
}

/* Compact variant */
.layer-indicator--compact {
  flex-direction: row;
  align-items: center;
  padding: 6px 10px;
  gap: 6px;
}

.layer-indicator--compact .layer-indicator__icon {
  font-size: 14px;
}

.layer-indicator--compact .layer-indicator__short-name {
  font-size: 12px;
  font-weight: 500;
}

.layer-indicator--compact .layer-indicator__count {
  font-size: 11px;
  background: var(--layer-color-light);
  color: var(--layer-color);
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
}

/* Minimal variant */
.layer-indicator--minimal {
  flex-direction: row;
  align-items: center;
  padding: 4px;
  gap: 2px;
  border: none;
  background: transparent;
}

.layer-indicator--minimal .layer-indicator__icon {
  font-size: 16px;
}

/* Status dot */
.status-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.status-dot--medium {
  width: 10px;
  height: 10px;
}

.status-dot--small {
  width: 6px;
  height: 6px;
}

.status-dot--disabled {
  background: #d1d5db;
}

.status-dot--initializing {
  background: #fbbf24;
  animation: pulse 1s infinite;
}

.status-dot--ready {
  background: #10b981;
}

.status-dot--capturing {
  background: #10b981;
  animation: pulse 0.5s infinite;
}

.status-dot--error {
  background: #ef4444;
}

.status-dot--idle {
  background: #9ca3af;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Toggle switch */
.toggle-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-switch--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch__track {
  position: relative;
  width: 36px;
  height: 20px;
  background: #d1d5db;
  border-radius: 10px;
  transition: background 0.2s;
}

.toggle-switch input:checked + .toggle-switch__track {
  background: var(--layer-color, #10b981);
}

.toggle-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-switch__track .toggle-switch__thumb {
  transform: translateX(16px);
}

.toggle-switch__label {
  font-size: 12px;
  color: #6b7280;
}

/* Required badge */
.required-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 4px;
  font-weight: 500;
}

/* Layer status bar */
.layer-status-bar {
  display: flex;
  gap: 8px;
}

.layer-status-bar--compact {
  gap: 6px;
}

.layer-status-bar--minimal {
  gap: 4px;
}

/* Layer config panel */
.layer-config-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.layer-config-panel__title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.layer-config-panel__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 6px;
}

.layer-config-item__info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.layer-config-item__icon {
  font-size: 20px;
}

.layer-config-item__text {
  display: flex;
  flex-direction: column;
}

.layer-config-item__name {
  font-size: 13px;
  font-weight: 500;
}

.layer-config-item__desc {
  font-size: 11px;
  color: #6b7280;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .layer-indicator {
    background: #1f2937;
    border-color: #374151;
  }

  .layer-indicator--full .layer-indicator__description {
    color: #9ca3af;
  }

  .layer-config-item {
    background: #374151;
  }

  .layer-config-item__desc {
    color: #9ca3af;
  }
}
```

---

## Usage Examples

### Full Layer Indicator
```tsx
import { LayerIndicator } from '../components/LayerIndicator';

<LayerIndicator
  layer="vision"
  status={{
    type: 'vision',
    enabled: true,
    ready: true,
    captureCount: 12,
    errorCount: 0
  }}
  isRecording={true}
  onToggle={(enabled) => handleToggle('vision', enabled)}
/>
```

### Layer Status Bar
```tsx
import { LayerStatusBar } from '../components/LayerIndicator';

<LayerStatusBar
  statuses={layerStatuses}
  isRecording={isRecording}
  variant="compact"
  onToggle={handleLayerToggle}
/>
```

### Layer Config Panel
```tsx
import { LayerConfigPanel } from '../components/LayerIndicator';

<LayerConfigPanel
  statuses={layerStatuses}
  onToggle={handleLayerToggle}
  disabled={isRecording}
/>
```

---

## Acceptance Criteria

- [ ] Displays all 4 layer types correctly
- [ ] Shows correct state (disabled/initializing/ready/capturing/error)
- [ ] Full variant shows description and stats
- [ ] Compact variant shows count badge
- [ ] Minimal variant is just icon + dot
- [ ] Toggle switch enables/disables optional layers
- [ ] Required badge shows for DOM layer
- [ ] Error message displays when present
- [ ] Status dot animates during initialization
- [ ] LayerStatusBar shows all layers horizontally
- [ ] LayerConfigPanel allows bulk configuration
- [ ] Dark mode compatible
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Null status**: Show as disabled
2. **High error count**: Show error state
3. **Toggle during recording**: Warn or disable
4. **Required layer toggle**: Prevent disable
5. **Long error message**: Truncate with ellipsis
6. **Very high capture count**: Format number
7. **All layers disabled**: Show warning
8. **Rapid status updates**: Debounce renders
9. **Missing layer in statuses**: Show default
10. **Vision init timeout**: Show init time hint

---

## Estimated Lines

300-350 lines (component + styles)
