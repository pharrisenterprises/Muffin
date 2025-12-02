# UI-012: Configure Conditional Menu Item

> **Build Card:** UI-012  
> **Category:** UI Components  
> **Dependencies:** UI-006, FND-010, StepRow  
> **Risk Level:** Low  
> **Estimated Lines:** 120-150

---

## 1. PURPOSE

Add a "Configure Conditional" option to the StepRow three-dot actions menu for steps with event type 'conditional-click'. This allows users to modify the conditional click configuration after the step has been created, including button texts to watch for, success text, timeout, and poll interval settings.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| StepRow Component | `src/components/StepRow.tsx` | Three-dot menu structure |
| ConditionalClickConfigPanel | `src/components/panels/ConditionalClickConfigPanel.tsx` | Config panel component |
| Step Interface | `src/types/step.types.ts` | conditionalConfig field |
| ConditionalClickConfig | `src/types/vision.types.ts` | Config interface |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/StepRow.tsx` | MODIFY | +40 |

### Artifacts

- Conditional menu item in step actions
- Config panel open/close state management
- Step conditionalConfig update callback

---

## 4. DETAILED SPECIFICATION

### 4.1 Menu Item Conditional Display

```typescript
// In StepRow.tsx

import { ConditionalClickConfigPanel } from './panels/ConditionalClickConfigPanel';

// State for conditional config panel
const [isConditionalPanelOpen, setIsConditionalPanelOpen] = useState(false);

// Check if this is a conditional click step
const isConditionalClickStep = step.event === 'conditional-click';

// Build menu items dynamically
const buildMenuItems = () => {
  const items = [
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
  ];

  // Add "Configure Conditional" only for conditional-click steps
  if (isConditionalClickStep) {
    items.push({
      label: 'Configure Conditional',
      icon: <SettingsIcon className="h-4 w-4" />,
      action: () => setIsConditionalPanelOpen(true),
    });
  }

  // Add delay removal if applicable
  if (step.delaySeconds) {
    items.push({
      label: `Remove Delay (${step.delaySeconds}s)`,
      icon: <XCircleIcon className="h-4 w-4" />,
      action: () => handleRemoveDelay(),
    });
  }

  // Add delete (always last)
  items.push({
    label: 'Delete Step',
    icon: <TrashIcon className="h-4 w-4" />,
    action: () => onDelete?.(index),
    variant: 'destructive',
  });

  return items;
};
```

### 4.2 Conditional Config Handlers

```typescript
// In StepRow.tsx

// Handle config save
const handleConditionalSave = (config: ConditionalClickConfig) => {
  onUpdateStep?.(index, {
    ...step,
    conditionalConfig: config,
    // Update label to reflect new button texts
    label: `Wait for: ${config.buttonTexts.join(', ')}`,
  });
  setIsConditionalPanelOpen(false);
};

// Handle config cancel
const handleConditionalCancel = () => {
  setIsConditionalPanelOpen(false);
};

// Get current config or defaults
const getCurrentConfig = (): ConditionalClickConfig => {
  return step.conditionalConfig ?? {
    buttonTexts: ['Allow', 'Keep'],
    successText: null,
    timeoutSeconds: 300,
    pollIntervalMs: 500,
    confidenceThreshold: 0.7,
  };
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
        
        {/* Conditional config - only for conditional-click steps */}
        {isConditionalClickStep && (
          <DropdownMenuItem onClick={() => setIsConditionalPanelOpen(true)}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            Configure Conditional
          </DropdownMenuItem>
        )}
        
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

    {/* Conditional Config Panel */}
    {isConditionalClickStep && (
      <ConditionalClickConfigPanel
        isOpen={isConditionalPanelOpen}
        config={getCurrentConfig()}
        onSave={handleConditionalSave}
        onCancel={handleConditionalCancel}
        stepLabel={step.label || `Step ${index + 1}`}
      />
    )}
  </div>
);
```

### 4.4 View Conditional Summary (Optional Enhancement)

```typescript
// Optional: Show current config in submenu or tooltip

const conditionalSummary = isConditionalClickStep && step.conditionalConfig
  ? `Watching: ${step.conditionalConfig.buttonTexts.join(', ')} | Timeout: ${step.conditionalConfig.timeoutSeconds}s`
  : null;

// In menu:
{isConditionalClickStep && (
  <>
    <DropdownMenuItem onClick={() => setIsConditionalPanelOpen(true)}>
      <SettingsIcon className="mr-2 h-4 w-4" />
      Configure Conditional
    </DropdownMenuItem>
    {conditionalSummary && (
      <div className="px-2 py-1 text-xs text-slate-500">
        {conditionalSummary}
      </div>
    )}
  </>
)}
```

---

## 5. VISUAL REFERENCE

The three-dot menu for a conditional-click step should display:

```
┌──────────────────────────────┐
│ ✏️  Edit Label               │
│ 🕐 Set Delay Before Step     │
│ ⚙️  Configure Conditional    │  ← Only for conditional-click
│    Watching: Allow, Keep     │  ← Optional summary
├──────────────────────────────┤
│ 🗑️  Delete Step              │
└──────────────────────────────┘
```

For non-conditional steps, the menu shows:

```
┌──────────────────────────────┐
│ ✏️  Edit Label               │
│ 🕐 Set Delay Before Step     │
├──────────────────────────────┤
│ 🗑️  Delete Step              │
└──────────────────────────────┘
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** "Configure Conditional" appears ONLY for conditional-click steps
- [ ] **AC-2:** Menu item has settings/gear icon
- [ ] **AC-3:** Clicking opens ConditionalClickConfigPanel
- [ ] **AC-4:** Panel shows current conditionalConfig values
- [ ] **AC-5:** Saving updates step.conditionalConfig
- [ ] **AC-6:** Saving updates step.label to reflect new button texts
- [ ] **AC-7:** Canceling panel doesn't change step
- [ ] **AC-8:** Panel doesn't render for non-conditional steps
- [ ] **AC-9:** Menu items maintain correct order
- [ ] **AC-10:** Optional: Config summary visible in menu

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Step type check** - Only show for event === 'conditional-click'
2. **Config existence** - Handle missing conditionalConfig gracefully
3. **Label sync** - Keep label in sync with button texts

### Patterns to Follow

1. **Conditional rendering** - Only render menu item when applicable
2. **Default config** - Provide sensible defaults if config missing
3. **Dialog state isolation** - Each row manages its own panel state

### Edge Cases

1. **Missing conditionalConfig** - Use defaults when opening panel
2. **Step type changed** - If step becomes non-conditional, hide option
3. **Empty buttonTexts** - Validate before saving
4. **Panel already open** - Prevent double-opening
5. **Step deleted while panel open** - Panel should close gracefully

---

## 8. VERIFICATION COMMANDS

```bash
# Verify menu item addition
grep -n "Configure Conditional\|isConditionalPanelOpen" src/components/StepRow.tsx

# Verify ConditionalClickConfigPanel import
grep -n "import.*ConditionalClickConfigPanel" src/components/StepRow.tsx

# Verify conditional rendering
grep -n "isConditionalClickStep\|conditional-click" src/components/StepRow.tsx

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
```

---

## 10. REFERENCES

- UI-006: ConditionalClickConfigPanel (config dialog)
- UI-004: ConditionalBadge Component (visual indicator)
- FND-010: Step Interface Extension (conditionalConfig field)
- ENG-014: Wait and Click Buttons (execution logic)

---

*End of Specification UI-012*
