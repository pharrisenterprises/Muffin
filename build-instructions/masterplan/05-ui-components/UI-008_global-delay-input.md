# UI-008: Global Delay Input Component

> **Build Card:** UI-008  
> **Category:** UI Components  
> **Dependencies:** FND-011, Recording Interface  
> **Risk Level:** Low  
> **Estimated Lines:** 150-180

---

## 1. PURPOSE

Implement the GlobalDelayInput component for the Recorder toolbar. This input allows users to set a default delay (in milliseconds) that applies between all steps during playback. This provides consistent pacing for automation without requiring per-step delay configuration, useful for slower websites or rate-limited APIs.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Recorder Toolbar | `src/pages/Recorder.tsx` | Current toolbar structure |
| Recording Interface | `src/types/recording.types.ts` | globalDelayMs field |
| UX Flows | `/future-spec/02_ux-flows.md` | Toolbar layout requirements |
| Screenshot Reference | Project Knowledge | Visual showing "Delay: 4" input |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/toolbar/GlobalDelayInput.tsx` | CREATE | +100 |
| `src/components/toolbar/index.ts` | MODIFY | +2 |
| `src/pages/Recorder.tsx` | MODIFY | +12 |

### Artifacts

- `GlobalDelayInput` React component
- Integration with Recorder toolbar
- Debounced update logic

---

## 4. DETAILED SPECIFICATION

### 4.1 Component Props Interface

```typescript
// In src/components/toolbar/GlobalDelayInput.tsx

import React, { useState, useEffect, useCallback } from 'react';

interface GlobalDelayInputProps {
  /** Current delay value in milliseconds */
  value: number;
  
  /** Callback when delay value changes */
  onChange: (delayMs: number) => void;
  
  /** Optional disabled state */
  disabled?: boolean;
  
  /** Minimum allowed value (default: 0) */
  min?: number;
  
  /** Maximum allowed value (default: 60000) */
  max?: number;
}
```

### 4.2 Component Implementation

```typescript
export const GlobalDelayInput: React.FC<GlobalDelayInputProps> = ({
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 60000,
}) => {
  // Local state for immediate UI updates
  const [localValue, setLocalValue] = useState<string>(value.toString());

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  // Debounced update to parent
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    setLocalValue(inputValue);
    
    // Parse and validate
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue);
    }
  };

  // Handle blur - ensure valid value
  const handleBlur = () => {
    const numValue = parseInt(localValue, 10);
    if (isNaN(numValue) || numValue < min) {
      setLocalValue(min.toString());
      onChange(min);
    } else if (numValue > max) {
      setLocalValue(max.toString());
      onChange(max);
    }
  };

  return (
    <div className="global-delay-input">
      <label htmlFor="global-delay" className="delay-label">
        Delay:
      </label>
      <input
        id="global-delay"
        type="number"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        min={min}
        max={max}
        className="delay-input"
      />
      <span className="delay-suffix">ms</span>
    </div>
  );
};

export default GlobalDelayInput;
```

### 4.3 Styling

```typescript
// Inline styles or CSS classes
const inputStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    color: '#94a3b8', // slate-400
    whiteSpace: 'nowrap',
  },
  input: {
    width: '70px',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #334155', // slate-700
    backgroundColor: '#1e293b', // slate-800
    color: '#f1f5f9', // slate-100
    fontSize: '14px',
    textAlign: 'right',
  },
  suffix: {
    fontSize: '14px',
    color: '#64748b', // slate-500
  },
};
```

### 4.4 Recorder Integration

```typescript
// In src/pages/Recorder.tsx

import { GlobalDelayInput } from '../components/toolbar';

// Inside Recorder component:
const [globalDelayMs, setGlobalDelayMs] = useState<number>(
  recording?.globalDelayMs ?? 0
);

// Update recording when delay changes
const handleGlobalDelayChange = (delayMs: number) => {
  setGlobalDelayMs(delayMs);
  if (recording) {
    updateRecording({
      ...recording,
      globalDelayMs: delayMs,
    });
  }
};

// In toolbar JSX:
<div className="toolbar-section">
  <GlobalDelayInput
    value={globalDelayMs}
    onChange={handleGlobalDelayChange}
    disabled={isRecording || isPlaying}
  />
</div>
```

---

## 5. VISUAL REFERENCE

Based on the project screenshot, the input should appear as:
- Label "Delay:" preceding the input
- Compact number input showing value (e.g., "4")
- Suffix "ms" after the input (or as unit indicator)
- Positioned after the Loop Start dropdown

```
┌─────────────────────────────────────────────────────────────────────┐
│ CSV Loop Start: [Loop from Step 1 ▼]  Delay: [____4] ms  [Static ▼]│
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Input displays current globalDelayMs value
- [ ] **AC-2:** Label "Delay:" visible and styled correctly
- [ ] **AC-3:** Suffix "ms" displayed after input
- [ ] **AC-4:** Numeric input only (type="number")
- [ ] **AC-5:** Minimum value enforced (0)
- [ ] **AC-6:** Maximum value enforced (60000)
- [ ] **AC-7:** Value persists to recording.globalDelayMs
- [ ] **AC-8:** Input disabled during recording
- [ ] **AC-9:** Input disabled during playback
- [ ] **AC-10:** Invalid input corrected on blur

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Milliseconds** - Value stored and displayed in ms
2. **Integer only** - No decimal values allowed
3. **Non-negative** - Minimum is 0

### Patterns to Follow

1. **Controlled input** - Local state with sync to props
2. **Validation on blur** - Correct invalid values
3. **Immediate feedback** - Local state updates instantly

### Edge Cases

1. **Empty input** - Reset to 0 on blur
2. **Negative value** - Reset to 0
3. **Decimal input** - Round to integer
4. **Very large value** - Cap at max (60000)
5. **Non-numeric input** - Ignore invalid characters
6. **Leading zeros** - Allow but parse correctly

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/components/toolbar/GlobalDelayInput.tsx

# Verify exports
grep -n "GlobalDelayInput" src/components/toolbar/index.ts

# Verify Recorder integration
grep -n "GlobalDelayInput\|globalDelayMs" src/pages/Recorder.tsx

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/components/toolbar/GlobalDelayInput.tsx

# Revert index changes
git checkout src/components/toolbar/index.ts

# Revert Recorder changes
git checkout src/pages/Recorder.tsx
```

---

## 10. REFERENCES

- FND-011: Recording Interface Extension (globalDelayMs field)
- UI-003: DelayBadge Component (per-step delay display)
- ENG-018: Delay Execution Logic (how delays are applied)
- Screenshot: Project Knowledge (shows "Delay: 4" in toolbar)

---

*End of Specification UI-008*
