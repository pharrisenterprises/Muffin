# UI-010: Step Row Badge Display Logic

> **Build Card:** UI-010  
> **Category:** UI Components  
> **Dependencies:** UI-001, UI-002, UI-003, UI-004, FND-010  
> **Risk Level:** Medium  
> **Estimated Lines:** 200-250

---

## 1. PURPOSE

Update the StepRow component to conditionally render badge components based on step properties. Each step can display multiple badges indicating its characteristics: Vision-recorded, Loop Start point, Delay configured, or Conditional Click type. This provides immediate visual feedback about step configuration without expanding details.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| StepRow Component | `src/components/StepRow.tsx` | Current component structure |
| VisionBadge | `src/components/badges/VisionBadge.tsx` | Badge component |
| LoopStartBadge | `src/components/badges/LoopStartBadge.tsx` | Badge component |
| DelayBadge | `src/components/badges/DelayBadge.tsx` | Badge component |
| ConditionalBadge | `src/components/badges/ConditionalBadge.tsx` | Badge component |
| Step Interface | `src/types/step.types.ts` | Step properties |
| UX Flows | `/future-spec/02_ux-flows.md` | Badge display rules |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/StepRow.tsx` | MODIFY | +60 |
| `src/components/StepRow.styles.ts` | MODIFY | +20 |

### Artifacts

- Badge container in StepRow
- Conditional rendering logic for all badge types
- Badge layout styling

---

## 4. DETAILED SPECIFICATION

### 4.1 Updated StepRow Props

```typescript
// In src/components/StepRow.tsx

interface StepRowProps {
  /** The step to display */
  step: Step;
  
  /** Index of this step in the list */
  index: number;
  
  /** Current loop start index for comparison */
  loopStartIndex: number;
  
  /** Whether this row is selected */
  isSelected?: boolean;
  
  /** Callback for step selection */
  onSelect?: (index: number) => void;
  
  /** Callback for step deletion */
  onDelete?: (index: number) => void;
  
  /** Callback for step edit */
  onEdit?: (index: number) => void;
  
  /** Whether playback is active (for highlighting) */
  isPlaying?: boolean;
  
  /** Whether this step is currently executing */
  isExecuting?: boolean;
}
```

### 4.2 Badge Rendering Logic

```typescript
// In src/components/StepRow.tsx

import { VisionBadge } from './badges/VisionBadge';
import { LoopStartBadge } from './badges/LoopStartBadge';
import { DelayBadge } from './badges/DelayBadge';
import { ConditionalBadge } from './badges/ConditionalBadge';

const StepRow: React.FC<StepRowProps> = ({
  step,
  index,
  loopStartIndex,
  isSelected,
  onSelect,
  onDelete,
  onEdit,
  isPlaying,
  isExecuting,
}) => {
  // Determine which badges to show
  const showVisionBadge = step.recordedVia === 'vision';
  const showLoopStartBadge = index === loopStartIndex && loopStartIndex > 0;
  const showDelayBadge = step.delaySeconds !== null && step.delaySeconds > 0;
  const showConditionalBadge = step.event === 'conditional-click';

  // Check if any badges will be shown
  const hasBadges = showVisionBadge || showLoopStartBadge || showDelayBadge || showConditionalBadge;

  return (
    <div 
      className={`step-row ${isSelected ? 'selected' : ''} ${isExecuting ? 'executing' : ''}`}
      onClick={() => onSelect?.(index)}
    >
      {/* Drag handle */}
      <div className="step-drag-handle">
        <GripVerticalIcon />
      </div>

      {/* Step number and badges container */}
      <div className="step-identifier">
        <span className="step-number">Step {index + 1}</span>
        
        {/* Badge container */}
        {hasBadges && (
          <div className="step-badges">
            {showLoopStartBadge && <LoopStartBadge />}
            {showVisionBadge && <VisionBadge />}
            {showDelayBadge && <DelayBadge seconds={step.delaySeconds!} />}
            {showConditionalBadge && <ConditionalBadge />}
          </div>
        )}
      </div>

      {/* Step label */}
      <div className="step-label">
        <input
          type="text"
          value={step.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="step-label-input"
        />
      </div>

      {/* Event type */}
      <div className="step-event">
        <EventTypeDropdown value={step.event} onChange={handleEventChange} />
      </div>

      {/* Path/Selector */}
      <div className="step-path">
        <input
          type="text"
          value={step.path}
          onChange={(e) => handlePathChange(e.target.value)}
          placeholder="URL or element selector..."
          className="step-path-input"
        />
      </div>

      {/* Input value */}
      <div className="step-input">
        <input
          type="text"
          value={step.value}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="Input value..."
          className="step-input-input"
        />
      </div>

      {/* Actions menu */}
      <div className="step-actions">
        <StepActionsMenu
          step={step}
          index={index}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      </div>
    </div>
  );
};
```

### 4.3 Badge Container Styling

```typescript
// In src/components/StepRow.styles.ts or inline

const stepRowStyles = {
  stepIdentifier: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
    minWidth: '80px',
  },
  stepNumber: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#e2e8f0', // slate-200
  },
  stepBadges: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '4px',
    maxWidth: '120px',
  },
};

// CSS version
const stepRowCSS = `
  .step-identifier {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 80px;
  }

  .step-number {
    font-size: 14px;
    font-weight: 500;
    color: #e2e8f0;
  }

  .step-badges {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
    max-width: 120px;
  }

  /* Ensure badges don't overflow */
  .step-badges > * {
    flex-shrink: 0;
  }

  /* Executing step highlight */
  .step-row.executing {
    background-color: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
  }

  /* Selected step highlight */
  .step-row.selected {
    background-color: rgba(99, 102, 241, 0.1);
  }
`;
```

### 4.4 Badge Display Order

Badges should display in a consistent order for predictability:

```typescript
// Display order (left to right):
// 1. LoopStartBadge - Most important, indicates loop behavior
// 2. VisionBadge - Recording method indicator
// 3. DelayBadge - Timing configuration
// 4. ConditionalBadge - Special step type

const badgeOrder = ['loopStart', 'vision', 'delay', 'conditional'];
```

### 4.5 Compact Mode for Many Badges

```typescript
// If all 4 badges would show, use compact display
const useCompactBadges = [
  showVisionBadge,
  showLoopStartBadge,
  showDelayBadge,
  showConditionalBadge,
].filter(Boolean).length >= 3;

// Pass compact prop to badges
{showLoopStartBadge && <LoopStartBadge compact={useCompactBadges} />}
{showVisionBadge && <VisionBadge compact={useCompactBadges} />}
{showDelayBadge && <DelayBadge seconds={step.delaySeconds!} compact={useCompactBadges} />}
{showConditionalBadge && <ConditionalBadge compact={useCompactBadges} />}
```

---

## 5. VISUAL REFERENCE

Based on the project screenshot, badges appear next to step numbers:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⋮⋮ │ Step    │ LABEL           │ EVENT  │ PATH           │ INPUT  │
│    │ 1       │ open page       │ open ▼ │ https://...    │        │
│    │ [Loop]  │                 │        │                │        │
├────┼─────────┼─────────────────┼────────┼────────────────┼────────┤
│ ⋮⋮ │ Step    │ Write prompt    │ input ▼│ /html/body/... │ cont.. │
│    │ 2       │                 │        │                │        │
├────┼─────────┼─────────────────┼────────┼────────────────┼────────┤
│ ⋮⋮ │ Step    │ Send message    │ click ▼│ /html/body/... │        │
│    │ 3       │                 │        │                │        │
├────┼─────────┼─────────────────┼────────┼────────────────┼────────┤
│ ⋮⋮ │ Step    │                 │   ▼    │ URL or elem... │        │
│    │ 4       │                 │        │                │        │
│    │ [300s]  │                 │        │                │        │
└────┴─────────┴─────────────────┴────────┴────────────────┴────────┘
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** VisionBadge shows when recordedVia === 'vision'
- [ ] **AC-2:** LoopStartBadge shows when index === loopStartIndex AND loopStartIndex > 0
- [ ] **AC-3:** DelayBadge shows when delaySeconds > 0
- [ ] **AC-4:** ConditionalBadge shows when event === 'conditional-click'
- [ ] **AC-5:** Multiple badges display correctly together
- [ ] **AC-6:** Badges don't overflow or break layout
- [ ] **AC-7:** Badge order is consistent (Loop, Vision, Delay, Conditional)
- [ ] **AC-8:** Compact mode activates with 3+ badges
- [ ] **AC-9:** Badges have tooltips for accessibility
- [ ] **AC-10:** loopStartIndex prop passed correctly from parent

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Performance** - Badge logic runs on every render
2. **Layout stability** - Badges shouldn't shift content
3. **Accessibility** - Badges need aria-labels

### Patterns to Follow

1. **Memoization** - Consider useMemo for badge visibility
2. **Consistent ordering** - Always same badge order
3. **Prop drilling** - Pass loopStartIndex from Recorder

### Edge Cases

1. **No badges** - Don't render empty container
2. **All badges** - Ensure compact mode works
3. **Long delay values** - DelayBadge should truncate
4. **Step 0 as loop start** - Don't show badge (meaningless)
5. **Rapid updates** - Badges should update immediately

---

## 8. VERIFICATION COMMANDS

```bash
# Verify StepRow modifications
grep -n "VisionBadge\|LoopStartBadge\|DelayBadge\|ConditionalBadge" src/components/StepRow.tsx

# Verify badge imports
grep -n "from './badges" src/components/StepRow.tsx

# Verify loopStartIndex prop
grep -n "loopStartIndex" src/components/StepRow.tsx

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert StepRow changes
git checkout src/components/StepRow.tsx

# Revert styles if separate file
git checkout src/components/StepRow.styles.ts
```

---

## 10. REFERENCES

- UI-001: VisionBadge Component
- UI-002: LoopStartBadge Component
- UI-003: DelayBadge Component
- UI-004: ConditionalBadge Component
- FND-010: Step Interface Extension
- Screenshot: Project Knowledge (shows badge placement)

---

*End of Specification UI-010*
