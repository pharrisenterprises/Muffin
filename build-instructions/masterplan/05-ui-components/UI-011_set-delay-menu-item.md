# UI-011: Set Delay Before Step Menu Item

> **Build Card:** UI-011  
> **Category:** UI Components  
> **Dependencies:** UI-005, FND-010, StepRow  
> **Risk Level:** Low  
> **Estimated Lines:** 100-130

---

## 1. PURPOSE

Add a "Set Delay Before Step" option to the StepRow three-dot actions menu. This allows users to configure a per-step delay that pauses execution before this specific step runs. Per-step delays override the global delay and are useful for steps that require extra wait time (e.g., waiting for a slow element to load).

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| StepRow Component | `src/components/StepRow.tsx` | Three-dot menu structure |
| StepActionsMenu | `src/components/StepActionsMenu.tsx` | Menu component if separate |
| DelayDialog | `src/components/dialogs/DelayDialog.tsx` | Dialog component |
| Step Interface | `src/types/step.types.ts` | delaySeconds field |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/StepRow.tsx` | MODIFY | +35 |
| `src/components/StepActionsMenu.tsx` | MODIFY | +20 (if separate) |

### Artifacts

- New menu item in step actions
- Dialog open/close state management
- Step update callback wiring

---

## 4. DETAILED SPECIFICATION

### 4.1 Menu Item Addition

```typescript
// In StepRow.tsx or StepActionsMenu.tsx

import { DelayDialog } from './dialogs/DelayDialog';

// State for delay dialog
const [isDelayDialogOpen, setIsDelayDialogOpen] = useState(false);

// Menu items array
const menuItems = [
  {
    label: 'Edit Label',
    icon: <PencilIcon className="h-4 w-4" />,
    action: () => onEdit?.(index),
  },
  {
    label: 'Set Delay Before Step',
    icon: <ClockIcon className="h-4 w-4" />,
    action: () => setIsDelayDialogOpen(true),
  },
  // Conditional: only show if step has delay set
  ...(step.delaySeconds ? [{
    label: 'Remove Delay',
    icon: <XCircleIcon className="h-4 w-4" />,
    action: () => handleRemoveDelay(),
    variant: 'destructive',
  }] : []),
  {
    label: 'Delete Step',
    icon: <TrashIcon className="h-4 w-4" />,
    action: () => onDelete?.(index),
    variant: 'destructive',
  },
];
```

### 4.2 Dialog Integration

```typescript
// In StepRow.tsx

// Handle delay save
const handleDelaySave = (seconds: number) => {
  onUpdateStep?.(index, {
    ...step,
    delaySeconds: seconds > 0 ? seconds : null,
  });
  setIsDelayDialogOpen(false);
};

// Handle delay removal
const handleRemoveDelay = () => {
  onUpdateStep?.(index, {
    ...step,
    delaySeconds: null,
  });
};

// Handle dialog cancel
const handleDelayCancel = () => {
  setIsDelayDialogOpen(false);
};
```

### 4.3 JSX Integration

```typescript
// In StepRow.tsx return statement

return (
  <div className="step-row">
    {/* ... existing step row content ... */}

    {/* Three-dot menu */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVerticalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit?.(index)}>
          <PencilIcon className="mr-2 h-4 w-4" />
          Edit Label
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => setIsDelayDialogOpen(true)}>
          <ClockIcon className="mr-2 h-4 w-4" />
          Set Delay Before Step
        </DropdownMenuItem>
        
        {step.delaySeconds && (
          <DropdownMenuItem onClick={handleRemoveDelay}>
            <XCircleIcon className="mr-2 h-4 w-4" />
            Remove Delay ({step.delaySeconds}s)
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onDelete?.(index)}
          className="text-red-500"
        >
          <TrashIcon className="mr-2 h-4 w-4" />
          Delete Step
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Delay Dialog */}
    <DelayDialog
      isOpen={isDelayDialogOpen}
      initialValue={step.delaySeconds ?? 0}
      onSave={handleDelaySave}
      onCancel={handleDelayCancel}
      stepLabel={step.label || `Step ${index + 1}`}
    />
  </div>
);
```

### 4.4 Updated StepRow Props

```typescript
interface StepRowProps {
  step: Step;
  index: number;
  loopStartIndex: number;
  isSelected?: boolean;
  onSelect?: (index: number) => void;
  onDelete?: (index: number) => void;
  onEdit?: (index: number) => void;
  // NEW: Callback for updating step properties
  onUpdateStep?: (index: number, updatedStep: Step) => void;
  isPlaying?: boolean;
  isExecuting?: boolean;
}
```

---

## 5. VISUAL REFERENCE

The three-dot menu should display:

```
┌─────────────────────────────┐
│ ✏️  Edit Label              │
│ 🕐 Set Delay Before Step    │
│ ❌ Remove Delay (5s)        │  ← Only if delay exists
├─────────────────────────────┤
│ 🗑️  Delete Step             │
└─────────────────────────────┘
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** "Set Delay Before Step" appears in three-dot menu
- [ ] **AC-2:** Menu item has clock icon
- [ ] **AC-3:** Clicking opens DelayDialog
- [ ] **AC-4:** Dialog shows current delay value (or 0 if none)
- [ ] **AC-5:** Saving updates step.delaySeconds
- [ ] **AC-6:** DelayBadge appears after saving non-zero delay
- [ ] **AC-7:** "Remove Delay" appears only when delay is set
- [ ] **AC-8:** "Remove Delay" shows current delay value
- [ ] **AC-9:** Removing delay sets delaySeconds to null
- [ ] **AC-10:** Canceling dialog doesn't change step

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Seconds vs Milliseconds** - UI shows seconds, store as seconds
2. **Null vs Zero** - null means no delay, 0 means explicitly zero
3. **Dialog context** - Dialog needs step info for display

### Patterns to Follow

1. **Dialog state in row** - Each row manages its own dialog
2. **Callback pattern** - Use onUpdateStep for modifications
3. **Conditional menu items** - Show/hide based on state

### Edge Cases

1. **Very long delay** - Allow up to 3600 seconds (1 hour)
2. **Dialog dismissed** - Click outside should cancel
3. **Save zero** - Treat as removing delay (set null)
4. **Multiple dialogs** - Only one dialog open at a time
5. **Rapid clicks** - Debounce menu actions

---

## 8. VERIFICATION COMMANDS

```bash
# Verify menu item addition
grep -n "Set Delay Before Step\|isDelayDialogOpen" src/components/StepRow.tsx

# Verify DelayDialog import
grep -n "import.*DelayDialog" src/components/StepRow.tsx

# Verify onUpdateStep prop
grep -n "onUpdateStep" src/components/StepRow.tsx

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

# Revert StepActionsMenu if modified
git checkout src/components/StepActionsMenu.tsx
```

---

## 10. REFERENCES

- UI-005: DelayDialog Component (dialog for input)
- UI-003: DelayBadge Component (visual indicator)
- FND-010: Step Interface Extension (delaySeconds field)
- ENG-018: Delay Execution Logic (how delays are applied)

---

*End of Specification UI-011*
