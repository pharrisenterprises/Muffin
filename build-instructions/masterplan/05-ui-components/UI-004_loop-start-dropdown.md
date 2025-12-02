# UI-004: Loop Start Dropdown

> **Build Card:** UI-004  
> **Category:** UI Components  
> **Dependencies:** FND-011, UI-002  
> **Risk Level:** Low  
> **Estimated Lines:** 220-280

---

## 1. PURPOSE

Implement a `LoopStartDropdown` React component that allows users to select which step should be the starting point for CSV loop iterations. This dropdown displays all steps in the recording and updates the `loopStartIndex` property when a selection is made. Matches the UI shown in the project screenshot with the "Loop Start: Step 1" selector.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Recording Interface | `src/types/recording.types.ts` | loopStartIndex field |
| Step Interface | `src/types/step.types.ts` | Step structure |
| UI Screenshot | Project Knowledge | Visual reference for dropdown |
| Existing Dropdowns | `src/components/ui/` | Dropdown styling patterns |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/controls/LoopStartDropdown.tsx` | CREATE | ~120 |
| `src/components/controls/index.ts` | MODIFY | +5 |
| `src/components/RecordingToolbar.tsx` | MODIFY | +15 |

### Artifacts

- `LoopStartDropdown` component created
- Component exported from controls index
- Integration with RecordingToolbar

---

## 4. DETAILED SPECIFICATION

### 4.1 LoopStartDropdown Component

```typescript
// In src/components/controls/LoopStartDropdown.tsx

import React, { useMemo } from 'react';
import { Step } from '@/types/step.types';

export interface LoopStartDropdownProps {
  /** All steps in the recording */
  steps: Step[];
  
  /** Currently selected loop start index */
  selectedIndex: number | undefined;
  
  /** Callback when selection changes */
  onChange: (index: number | undefined) => void;
  
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Dropdown for selecting the CSV loop start step
 * Matches the "Loop Start: Step X" UI pattern from screenshot
 */
export const LoopStartDropdown: React.FC<LoopStartDropdownProps> = ({
  steps,
  selectedIndex,
  onChange,
  disabled = false,
  size = 'sm',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-xs py-1 px-2',
    md: 'text-sm py-1.5 px-3',
    lg: 'text-base py-2 px-4'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Build options list with step labels
  const options = useMemo(() => {
    return steps.map((step, index) => ({
      value: index,
      label: getStepLabel(step, index)
    }));
  }, [steps]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      onChange(undefined);
    } else {
      onChange(parseInt(value, 10));
    }
  };

  return (
    <div className={`loop-start-dropdown flex items-center gap-2 ${className}`}>
      {/* Label */}
      <label 
        className={`
          flex items-center gap-1
          text-gray-600 dark:text-gray-400
          font-medium whitespace-nowrap
          ${sizeClasses[size]}
        `}
      >
        {/* Loop icon */}
        <svg
          className={iconSizes[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 2l4 4-4 4" />
          <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
          <path d="M7 22l-4-4 4-4" />
          <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </svg>
        <span>Loop Start:</span>
      </label>

      {/* Dropdown */}
      <select
        value={selectedIndex ?? ''}
        onChange={handleChange}
        disabled={disabled || steps.length === 0}
        className={`
          ${sizeClasses[size]}
          bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-600
          rounded-md
          text-gray-900 dark:text-gray-100
          focus:ring-2 focus:ring-teal-500 focus:border-teal-500
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          min-w-[120px]
        `}
      >
        <option value="">-- Select Step --</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Generates a readable label for a step
 */
function getStepLabel(step: Step, index: number): string {
  const stepNum = `Step ${index + 1}`;
  
  // Use custom label if available
  if (step.label) {
    return `${stepNum}: ${truncate(step.label, 20)}`;
  }
  
  // Build label from action and target
  const action = step.action.charAt(0).toUpperCase() + step.action.slice(1);
  
  if (step.elementText) {
    return `${stepNum}: ${action} "${truncate(step.elementText, 15)}"`;
  }
  
  if (step.visionTarget) {
    return `${stepNum}: ${action} "${truncate(step.visionTarget, 15)}"`;
  }
  
  return `${stepNum}: ${action}`;
}

/**
 * Truncates text with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
}

export default LoopStartDropdown;
```

### 4.2 Compact Inline Variant

```typescript
/**
 * Compact inline variant matching the screenshot style
 */
export const LoopStartDropdownInline: React.FC<LoopStartDropdownProps> = ({
  steps,
  selectedIndex,
  onChange,
  disabled = false,
  className = ''
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange(value === '' ? undefined : parseInt(value, 10));
  };

  // Get display text for current selection
  const displayText = selectedIndex !== undefined
    ? `Step ${selectedIndex + 1}`
    : 'None';

  return (
    <div 
      className={`
        inline-flex items-center gap-1 
        bg-gray-100 dark:bg-gray-700
        rounded px-2 py-1
        ${className}
      `}
    >
      {/* Loop icon */}
      <svg
        className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>

      <span className="text-xs text-gray-600 dark:text-gray-300">
        Loop Start:
      </span>

      <select
        value={selectedIndex ?? ''}
        onChange={handleChange}
        disabled={disabled || steps.length === 0}
        className="
          text-xs font-medium
          bg-transparent
          border-none
          text-teal-700 dark:text-teal-300
          cursor-pointer
          focus:outline-none focus:ring-0
          disabled:opacity-50
          pr-4
        "
      >
        <option value="">None</option>
        {steps.map((step, index) => (
          <option key={step.id} value={index}>
            Step {index + 1}
          </option>
        ))}
      </select>
    </div>
  );
};
```

### 4.3 Controls Index Export

```typescript
// In src/components/controls/index.ts

export { 
  LoopStartDropdown, 
  LoopStartDropdownInline 
} from './LoopStartDropdown';

export type { LoopStartDropdownProps } from './LoopStartDropdown';
```

### 4.4 RecordingToolbar Integration

```typescript
// In src/components/RecordingToolbar.tsx

import { LoopStartDropdownInline } from './controls';
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
  const handleLoopStartChange = (index: number | undefined) => {
    onRecordingChange({
      ...recording,
      loopStartIndex: index
    });
  };

  return (
    <div className="recording-toolbar flex items-center gap-4 p-2 border-b">
      {/* Play/Stop buttons */}
      <div className="flex items-center gap-2">
        {/* ... play controls ... */}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Loop Start Dropdown */}
      <LoopStartDropdownInline
        steps={recording.steps}
        selectedIndex={recording.loopStartIndex}
        onChange={handleLoopStartChange}
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
import { LoopStartDropdown } from '@/components/controls';

const [loopStartIndex, setLoopStartIndex] = useState<number | undefined>(0);

<LoopStartDropdown
  steps={recording.steps}
  selectedIndex={loopStartIndex}
  onChange={setLoopStartIndex}
/>
```

### 5.2 Inline Variant (Toolbar Style)

```tsx
import { LoopStartDropdownInline } from '@/components/controls';

<LoopStartDropdownInline
  steps={recording.steps}
  selectedIndex={recording.loopStartIndex}
  onChange={(index) => updateRecording({ loopStartIndex: index })}
/>
```

### 5.3 Disabled State

```tsx
// Disabled during playback
<LoopStartDropdown
  steps={recording.steps}
  selectedIndex={recording.loopStartIndex}
  onChange={handleChange}
  disabled={isPlaying}
/>
```

### 5.4 With Size Variants

```tsx
// Small (default)
<LoopStartDropdown steps={steps} selectedIndex={0} onChange={onChange} size="sm" />

// Medium
<LoopStartDropdown steps={steps} selectedIndex={0} onChange={onChange} size="md" />

// Large
<LoopStartDropdown steps={steps} selectedIndex={0} onChange={onChange} size="lg" />
```

### 5.5 No Selection (Clear Loop)

```tsx
// When user selects "-- Select Step --", onChange receives undefined
const handleChange = (index: number | undefined) => {
  if (index === undefined) {
    console.log('Loop cleared - will run once without looping');
  } else {
    console.log(`Loop starts at step ${index + 1}`);
  }
  setLoopStartIndex(index);
};
```

### 5.6 Full Recording Settings Panel

```tsx
const RecordingSettings: React.FC<{ recording: Recording }> = ({ recording }) => {
  return (
    <div className="settings-panel p-4 space-y-4">
      <h3 className="font-medium">Loop Settings</h3>
      
      <div className="flex items-center gap-4">
        <LoopStartDropdown
          steps={recording.steps}
          selectedIndex={recording.loopStartIndex}
          onChange={(index) => updateRecording({ loopStartIndex: index })}
          size="md"
        />
        
        {recording.loopStartIndex !== undefined && (
          <span className="text-sm text-gray-500">
            Steps 1-{recording.loopStartIndex} run once, 
            then loop from Step {recording.loopStartIndex + 1}
          </span>
        )}
      </div>
    </div>
  );
};
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Dropdown displays all steps with readable labels
- [ ] **AC-2:** Step labels show step number and action/text
- [ ] **AC-3:** Selection updates loopStartIndex via onChange
- [ ] **AC-4:** "-- Select Step --" option clears selection (undefined)
- [ ] **AC-5:** Disabled state prevents interaction
- [ ] **AC-6:** Supports sm, md, lg size variants
- [ ] **AC-7:** LoopStartDropdownInline matches screenshot style
- [ ] **AC-8:** Dark mode support works correctly
- [ ] **AC-9:** Long step labels are truncated
- [ ] **AC-10:** Integrates with RecordingToolbar

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Step label length** - Truncate to prevent dropdown overflow
2. **Empty steps** - Show "-- Select Step --" when no steps
3. **Visual match** - Match the screenshot UI exactly

### Patterns to Follow

1. **Controlled component** - Value comes from props, changes via callback
2. **Accessible labels** - Associate label with select element
3. **Consistent styling** - Match other toolbar controls

### Edge Cases

1. **No steps** - Disable dropdown, show placeholder
2. **Single step** - Only one option available
3. **Very long labels** - Truncate with ellipsis
4. **Step deleted** - Reset if selectedIndex out of range
5. **Rapid changes** - Debounce if needed

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/components/controls/LoopStartDropdown.tsx

# Verify exports
grep -n "LoopStartDropdown" src/components/controls/index.ts

# Verify toolbar integration
grep -n "LoopStartDropdown\|loopStartIndex" src/components/RecordingToolbar.tsx

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/components/controls/LoopStartDropdown.tsx

# Revert index changes
git checkout src/components/controls/index.ts

# Revert toolbar changes
git checkout src/components/RecordingToolbar.tsx
```

---

## 10. REFERENCES

- FND-011: Recording Interface Extension (loopStartIndex field)
- UI-002: Loop Start Badge Component
- UI Screenshot: Project screenshot showing "Loop Start: Step 1" dropdown
- Feature Spec: `/future-spec/03_feature-specs.md` Section 1.1

---

*End of Specification UI-004*
