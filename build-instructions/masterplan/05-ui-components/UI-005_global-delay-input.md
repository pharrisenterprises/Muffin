# UI-005: Global Delay Input

> **Build Card:** UI-005  
> **Category:** UI Components  
> **Dependencies:** FND-011, ENG-018  
> **Risk Level:** Low  
> **Estimated Lines:** 200-250

---

## 1. PURPOSE

Implement a `GlobalDelayInput` React component that allows users to configure the default delay between steps during playback. This input controls the `globalDelayMs` property on recordings, providing a simple numeric input with increment/decrement buttons and preset quick-select options. Matches the delay control shown in the project screenshot.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Recording Interface | `src/types/recording.types.ts` | globalDelayMs field |
| Delay Manager | `src/lib/delayManager.ts` | Delay constraints |
| UI Screenshot | Project Knowledge | Visual reference for delay input |
| Existing Inputs | `src/components/ui/` | Input styling patterns |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/controls/GlobalDelayInput.tsx` | CREATE | ~130 |
| `src/components/controls/index.ts` | MODIFY | +5 |
| `src/components/RecordingToolbar.tsx` | MODIFY | +10 |

### Artifacts

- `GlobalDelayInput` component created
- `GlobalDelayInputCompact` variant created
- Component exported from controls index
- Integration with RecordingToolbar

---

## 4. DETAILED SPECIFICATION

### 4.1 GlobalDelayInput Component

```typescript
// In src/components/controls/GlobalDelayInput.tsx

import React, { useState, useCallback } from 'react';

export interface GlobalDelayInputProps {
  /** Current delay value in milliseconds */
  value: number;
  
  /** Callback when delay changes */
  onChange: (delayMs: number) => void;
  
  /** Minimum allowed delay */
  min?: number;
  
  /** Maximum allowed delay */
  max?: number;
  
  /** Step increment for buttons */
  step?: number;
  
  /** Whether input is disabled */
  disabled?: boolean;
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Show preset quick-select buttons */
  showPresets?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/** Common delay presets in milliseconds */
const DELAY_PRESETS = [
  { label: '0.25s', value: 250 },
  { label: '0.5s', value: 500 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 }
];

/**
 * Input control for configuring global step delay
 */
export const GlobalDelayInput: React.FC<GlobalDelayInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 30000,
  step = 100,
  disabled = false,
  size = 'sm',
  showPresets = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const inputSizes = {
    sm: 'w-16 py-1 px-2',
    md: 'w-20 py-1.5 px-3',
    lg: 'w-24 py-2 px-4'
  };

  const buttonSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  // Format display value
  const displayValue = formatDelayDisplay(value);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseInt(e.target.value, 10);
    if (!isNaN(numValue)) {
      onChange(clamp(numValue, min, max));
    }
  };

  // Handle increment
  const handleIncrement = useCallback(() => {
    onChange(clamp(value + step, min, max));
  }, [value, step, min, max, onChange]);

  // Handle decrement
  const handleDecrement = useCallback(() => {
    onChange(clamp(value - step, min, max));
  }, [value, step, min, max, onChange]);

  // Handle preset selection
  const handlePresetClick = (presetValue: number) => {
    onChange(clamp(presetValue, min, max));
  };

  return (
    <div className={`global-delay-input ${sizeClasses[size]} ${className}`}>
      <div className="flex items-center gap-2">
        {/* Label */}
        <label className="flex items-center gap-1 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
          {/* Clock icon */}
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Delay:</span>
        </label>

        {/* Input with increment/decrement buttons */}
        <div className="flex items-center">
          {/* Decrement button */}
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            className={`
              ${buttonSizes[size]}
              flex items-center justify-center
              bg-gray-100 dark:bg-gray-700
              border border-gray-300 dark:border-gray-600
              rounded-l-md
              text-gray-600 dark:text-gray-400
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
            aria-label="Decrease delay"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Number input */}
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={`
              ${inputSizes[size]}
              text-center
              bg-white dark:bg-gray-800
              border-y border-gray-300 dark:border-gray-600
              text-gray-900 dark:text-gray-100
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              [appearance:textfield]
              [&::-webkit-outer-spin-button]:appearance-none
              [&::-webkit-inner-spin-button]:appearance-none
            `}
            aria-label="Delay in milliseconds"
          />

          {/* Increment button */}
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || value >= max}
            className={`
              ${buttonSizes[size]}
              flex items-center justify-center
              bg-gray-100 dark:bg-gray-700
              border border-gray-300 dark:border-gray-600
              rounded-r-md
              text-gray-600 dark:text-gray-400
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
            aria-label="Increase delay"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Display formatted value */}
        <span className="text-gray-500 dark:text-gray-400 min-w-[40px]">
          {displayValue}
        </span>
      </div>

      {/* Preset buttons */}
      {showPresets && (
        <div className="flex items-center gap-1 mt-2">
          {DELAY_PRESETS.map(preset => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePresetClick(preset.value)}
              disabled={disabled}
              className={`
                px-2 py-0.5
                text-xs font-medium
                rounded
                transition-colors
                ${value === preset.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalDelayInput;
```

### 4.2 Helper Functions

```typescript
/**
 * Formats delay for display (e.g., "500ms" or "1.5s")
 */
function formatDelayDisplay(ms: number): string {
  if (ms === 0) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  if (ms % 1000 === 0) return `${ms / 1000}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

### 4.3 Compact Inline Variant

```typescript
/**
 * Compact inline variant for toolbar use
 */
export const GlobalDelayInputCompact: React.FC<{
  value: number;
  onChange: (delayMs: number) => void;
  disabled?: boolean;
  className?: string;
}> = ({ value, onChange, disabled = false, className = '' }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  return (
    <div 
      className={`
        inline-flex items-center gap-1.5
        bg-gray-100 dark:bg-gray-700
        rounded px-2 py-1
        ${className}
      `}
    >
      {/* Clock icon */}
      <svg
        className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>

      <span className="text-xs text-gray-600 dark:text-gray-300">
        Delay:
      </span>

      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="
          text-xs font-medium
          bg-transparent
          border-none
          text-blue-700 dark:text-blue-300
          cursor-pointer
          focus:outline-none focus:ring-0
          disabled:opacity-50
          pr-4
        "
      >
        <option value="0">None</option>
        <option value="250">250ms</option>
        <option value="500">500ms</option>
        <option value="1000">1s</option>
        <option value="2000">2s</option>
        <option value="5000">5s</option>
      </select>
    </div>
  );
};
```

### 4.4 Controls Index Export

```typescript
// In src/components/controls/index.ts

export { 
  GlobalDelayInput, 
  GlobalDelayInputCompact 
} from './GlobalDelayInput';

export type { GlobalDelayInputProps } from './GlobalDelayInput';
```

### 4.5 RecordingToolbar Integration

```typescript
// In src/components/RecordingToolbar.tsx

import { GlobalDelayInputCompact } from './controls';
import { Recording } from '@/types/recording.types';

interface RecordingToolbarProps {
  recording: Recording;
  onRecordingChange: (recording: Recording) => void;
  isPlaying: boolean;
  // ... other props
}

export const RecordingToolbar: React.FC<RecordingToolbarProps> = ({
  recording,
  onRecordingChange,
  isPlaying,
  // ... other props
}) => {
  const handleDelayChange = (delayMs: number) => {
    onRecordingChange({
      ...recording,
      globalDelayMs: delayMs
    });
  };

  return (
    <div className="recording-toolbar flex items-center gap-4 p-2 border-b">
      {/* Play/Stop buttons */}
      {/* ... */}

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Loop Start Dropdown */}
      {/* ... */}

      {/* Global Delay Input */}
      <GlobalDelayInputCompact
        value={recording.globalDelayMs || 500}
        onChange={handleDelayChange}
        disabled={isPlaying}
      />

      {/* Other controls */}
      {/* ... */}
    </div>
  );
};
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```tsx
import { GlobalDelayInput } from '@/components/controls';

const [delay, setDelay] = useState(500);

<GlobalDelayInput
  value={delay}
  onChange={setDelay}
/>
```

### 5.2 With Presets

```tsx
<GlobalDelayInput
  value={delay}
  onChange={setDelay}
  showPresets={true}
/>

// Shows buttons: 0.25s | 0.5s | 1s | 2s | 5s
```

### 5.3 Custom Range

```tsx
// Limit to 100ms - 10s range
<GlobalDelayInput
  value={delay}
  onChange={setDelay}
  min={100}
  max={10000}
  step={50}
/>
```

### 5.4 Compact Toolbar Version

```tsx
import { GlobalDelayInputCompact } from '@/components/controls';

<GlobalDelayInputCompact
  value={recording.globalDelayMs || 500}
  onChange={(ms) => updateRecording({ globalDelayMs: ms })}
  disabled={isPlaying}
/>
```

### 5.5 Different Sizes

```tsx
// Small (default)
<GlobalDelayInput value={500} onChange={setDelay} size="sm" />

// Medium
<GlobalDelayInput value={500} onChange={setDelay} size="md" />

// Large
<GlobalDelayInput value={500} onChange={setDelay} size="lg" />
```

### 5.6 In Settings Panel

```tsx
const PlaybackSettings: React.FC<{ recording: Recording }> = ({ recording }) => {
  return (
    <div className="settings-panel p-4 space-y-4">
      <h3 className="font-medium">Playback Settings</h3>
      
      <div className="space-y-2">
        <label className="text-sm text-gray-600">
          Default delay between steps:
        </label>
        
        <GlobalDelayInput
          value={recording.globalDelayMs || 500}
          onChange={(ms) => updateRecording({ globalDelayMs: ms })}
          showPresets={true}
          size="md"
        />
        
        <p className="text-xs text-gray-500">
          This delay is applied after each step unless overridden.
        </p>
      </div>
    </div>
  );
};
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Number input displays and accepts millisecond values
- [ ] **AC-2:** Increment/decrement buttons adjust value by step amount
- [ ] **AC-3:** Value stays within min/max bounds
- [ ] **AC-4:** Formatted display shows human-readable time (ms/s)
- [ ] **AC-5:** Preset buttons allow quick selection
- [ ] **AC-6:** Selected preset is visually highlighted
- [ ] **AC-7:** Compact variant works as dropdown
- [ ] **AC-8:** Disabled state prevents all interaction
- [ ] **AC-9:** Dark mode support works correctly
- [ ] **AC-10:** Integrates with RecordingToolbar

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Valid range** - Enforce 0-30000ms range
2. **Step increments** - Default 100ms steps for easy adjustment
3. **Display format** - Switch to seconds for values ≥ 1000ms

### Patterns to Follow

1. **Controlled component** - Value from props, changes via callback
2. **Accessible inputs** - Proper labels and ARIA attributes
3. **Keyboard support** - Arrow keys adjust value

### Edge Cases

1. **Zero delay** - Valid, shows "0ms"
2. **Invalid input** - Ignore non-numeric characters
3. **Out of range** - Clamp to min/max
4. **Very large values** - Cap at max (30s)
5. **Decimal input** - Round to nearest integer

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/components/controls/GlobalDelayInput.tsx

# Verify exports
grep -n "GlobalDelayInput" src/components/controls/index.ts

# Verify toolbar integration
grep -n "GlobalDelayInput\|globalDelayMs" src/components/RecordingToolbar.tsx

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/components/controls/GlobalDelayInput.tsx

# Revert index changes
git checkout src/components/controls/index.ts

# Revert toolbar changes
git checkout src/components/RecordingToolbar.tsx
```

---

## 10. REFERENCES

- FND-011: Recording Interface Extension (globalDelayMs field)
- ENG-018: Delay Execution Logic
- UI-004: Loop Start Dropdown (toolbar pattern)
- Feature Spec: `/future-spec/03_feature-specs.md` Section 1.2

---

*End of Specification UI-005*
