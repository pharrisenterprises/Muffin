# UI-007: Loop Start Dropdown Component

> **Build Card:** UI-007  
> **Category:** UI Components  
> **Dependencies:** FND-011, Recording Interface  
> **Risk Level:** Low  
> **Estimated Lines:** 180-220

---

## 1. PURPOSE

Implement the LoopStartDropdown component for the Recorder toolbar. This dropdown allows users to select which step the CSV loop should restart from when processing multiple rows. When "Loop from Step N" is selected, rows 2+ in the CSV will skip steps 1 through N-1, enabling efficient automation where initial setup steps only run once.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Recorder Toolbar | `src/pages/Recorder.tsx` | Current toolbar structure |
| Recording Interface | `src/types/recording.types.ts` | loopStartIndex field |
| UX Flows | `/future-spec/02_ux-flows.md` | Toolbar layout requirements |
| Screenshot Reference | Project Knowledge | Visual reference showing "Loop from Step 1" dropdown |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/toolbar/LoopStartDropdown.tsx` | CREATE | +120 |
| `src/components/toolbar/index.ts` | MODIFY | +2 |
| `src/pages/Recorder.tsx` | MODIFY | +15 |

### Artifacts

- `LoopStartDropdown` React component
- Integration with Recorder toolbar
- Step selection logic

---

## 4. DETAILED SPECIFICATION

### 4.1 Component Props Interface

```typescript
// In src/components/toolbar/LoopStartDropdown.tsx

import React from 'react';

interface LoopStartDropdownProps {
  /** Array of current steps for generating options */
  steps: Step[];
  
  /** Currently selected loop start index (0-based) */
  value: number;
  
  /** Callback when selection changes */
  onChange: (index: number) => void;
  
  /** Optional disabled state */
  disabled?: boolean;
}
```

### 4.2 Component Implementation

```typescript
export const LoopStartDropdown: React.FC<LoopStartDropdownProps> = ({
  steps,
  value,
  onChange,
  disabled = false,
}) => {
  // Generate options: "Loop from Step 1", "Loop from Step 2", etc.
  const options = steps.map((step, index) => ({
    value: index,
    label: `Loop from Step ${index + 1}`,
    // Optional: include step label for clarity
    sublabel: step.label || undefined,
  }));

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newIndex = parseInt(event.target.value, 10);
    onChange(newIndex);
  };

  return (
    <div className="loop-start-dropdown">
      <label htmlFor="loop-start-select" className="dropdown-label">
        CSV Loop Start:
      </label>
      <select
        id="loop-start-select"
        value={value}
        onChange={handleChange}
        disabled={disabled || steps.length === 0}
        className="dropdown-select"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LoopStartDropdown;
```

### 4.3 Styling

```typescript
// Inline styles or CSS classes
const dropdownStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: '#94a3b8', // slate-400
    whiteSpace: 'nowrap',
  },
  select: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #334155', // slate-700
    backgroundColor: '#1e293b', // slate-800
    color: '#f1f5f9', // slate-100
    fontSize: '14px',
    cursor: 'pointer',
    minWidth: '150px',
  },
};
```

### 4.4 Recorder Integration

```typescript
// In src/pages/Recorder.tsx

import { LoopStartDropdown } from '../components/toolbar';

// Inside Recorder component:
const [loopStartIndex, setLoopStartIndex] = useState<number>(
  recording?.loopStartIndex ?? 0
);

// Update recording when loop start changes
const handleLoopStartChange = (index: number) => {
  setLoopStartIndex(index);
  if (recording) {
    updateRecording({
      ...recording,
      loopStartIndex: index,
    });
  }
};

// In toolbar JSX:
<div className="toolbar-section">
  <LoopStartDropdown
    steps={steps}
    value={loopStartIndex}
    onChange={handleLoopStartChange}
    disabled={isRecording || isPlaying}
  />
</div>
```

---

## 5. VISUAL REFERENCE

Based on the project screenshot, the dropdown should appear in the toolbar with:
- Label "CSV Loop Start:" preceding the dropdown
- Dropdown showing "Loop from Step 1" (or current selection)
- Positioned between "Export Header CSV" button and "Delay:" input
- Dark theme styling matching existing UI

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Record] [+ Add Variable] [Export Process] [Export Header CSV]      │
│                                                                     │
│ CSV Loop Start: [Loop from Step 1 ▼]  Delay: [4] ms  [Static ▼]    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Dropdown displays all steps as "Loop from Step N" options
- [ ] **AC-2:** Default selection is Step 1 (index 0)
- [ ] **AC-3:** Selection persists to recording.loopStartIndex
- [ ] **AC-4:** Dropdown disabled during recording
- [ ] **AC-5:** Dropdown disabled during playback
- [ ] **AC-6:** Empty state handled (no steps = disabled)
- [ ] **AC-7:** Selection updates immediately on change
- [ ] **AC-8:** Styling matches existing toolbar components
- [ ] **AC-9:** Label "CSV Loop Start:" visible and styled
- [ ] **AC-10:** Keyboard accessible (tab, arrow keys, enter)

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Zero-indexed internally** - UI shows "Step 1" but stores index 0
2. **Dynamic options** - Must update when steps are added/removed
3. **Persistence** - Value must save to recording object

### Patterns to Follow

1. **Controlled component** - Value comes from props
2. **Single source of truth** - Recording object owns the state
3. **Disabled states** - Prevent changes during active operations

### Edge Cases

1. **No steps** - Dropdown disabled, shows placeholder
2. **Steps deleted** - If selected step removed, reset to 0
3. **Step reordered** - Index stays same, label updates
4. **Maximum steps** - Should handle 50+ steps without issue
5. **Long step labels** - Truncate in sublabel if shown

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/components/toolbar/LoopStartDropdown.tsx

# Verify exports
grep -n "LoopStartDropdown" src/components/toolbar/index.ts

# Verify Recorder integration
grep -n "LoopStartDropdown\|loopStartIndex" src/pages/Recorder.tsx

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/components/toolbar/LoopStartDropdown.tsx

# Revert index changes
git checkout src/components/toolbar/index.ts

# Revert Recorder changes
git checkout src/pages/Recorder.tsx
```

---

## 10. REFERENCES

- FND-011: Recording Interface Extension (loopStartIndex field)
- UI-002: LoopStartBadge Component (visual indicator)
- Feature Spec: `/future-spec/03_feature-specs.md` Section 1.1
- Screenshot: Project Knowledge (shows existing implementation)

---

*End of Specification UI-007*
