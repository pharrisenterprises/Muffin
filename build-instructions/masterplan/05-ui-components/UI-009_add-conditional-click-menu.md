# UI-009: Add Conditional Click Menu Item

> **Build Card:** UI-009  
> **Category:** UI Components  
> **Dependencies:** FND-010, UI-006, ConditionalConfigPanel  
> **Risk Level:** Low  
> **Estimated Lines:** 120-150

---

## 1. PURPOSE

Add a "Conditional Click" option to the "+ Add Variable" dropdown menu in the Recorder toolbar. This menu item allows users to manually insert a conditional click step that polls for specified button text (like "Allow" or "Keep") and clicks when found. This is essential for automating Copilot workflows where permission buttons appear unpredictably.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Recorder Component | `src/pages/Recorder.tsx` | Current Add Variable menu |
| Step Interface | `src/types/step.types.ts` | Step structure with conditionalConfig |
| ConditionalConfigPanel | `src/components/panels/ConditionalClickConfigPanel.tsx` | Config dialog component |
| Feature Specs | `/future-spec/03_feature-specs.md` | Conditional click requirements |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/pages/Recorder.tsx` | MODIFY | +45 |
| `src/utils/stepFactory.ts` | MODIFY | +25 |

### Artifacts

- New menu item in Add Variable dropdown
- Conditional click step creation logic
- Dialog open/close handling

---

## 4. DETAILED SPECIFICATION

### 4.1 Menu Item Addition

```typescript
// In src/pages/Recorder.tsx - Add Variable dropdown

// Existing menu items structure
const addVariableMenuItems = [
  { label: 'Text Input', action: () => addInputStep() },
  { label: 'Dropdown Select', action: () => addSelectStep() },
  { label: 'Checkbox', action: () => addCheckboxStep() },
  // NEW: Add Conditional Click option
  {
    label: 'Conditional Click',
    action: () => openConditionalClickDialog(),
    icon: <ConditionalIcon />, // Optional icon
  },
];
```

### 4.2 Dialog State Management

```typescript
// In src/pages/Recorder.tsx

// State for conditional click dialog
const [isConditionalDialogOpen, setIsConditionalDialogOpen] = useState(false);
const [pendingConditionalConfig, setPendingConditionalConfig] = useState<ConditionalClickConfig | null>(null);

// Open dialog for new conditional click
const openConditionalClickDialog = () => {
  // Set default config for new conditional click
  setPendingConditionalConfig({
    buttonTexts: ['Allow', 'Keep'],
    successText: null,
    timeoutSeconds: 300,
    pollIntervalMs: 500,
    confidenceThreshold: 0.7,
  });
  setIsConditionalDialogOpen(true);
};

// Handle dialog save
const handleConditionalSave = (config: ConditionalClickConfig) => {
  const newStep = createConditionalClickStep(config);
  addStep(newStep);
  setIsConditionalDialogOpen(false);
  setPendingConditionalConfig(null);
};

// Handle dialog cancel
const handleConditionalCancel = () => {
  setIsConditionalDialogOpen(false);
  setPendingConditionalConfig(null);
};
```

### 4.3 Step Factory Function

```typescript
// In src/utils/stepFactory.ts

import { Step, ConditionalClickConfig } from '../types';
import { generateStepId } from './idGenerator';

/**
 * Creates a new conditional click step with the given configuration
 */
export function createConditionalClickStep(
  config: ConditionalClickConfig,
  label?: string
): Step {
  return {
    id: generateStepId(),
    label: label || `Wait for: ${config.buttonTexts.join(', ')}`,
    event: 'conditional-click',
    path: '', // No specific path - vision-based
    value: '',
    recordedVia: 'vision',
    conditionalConfig: config,
    delaySeconds: null,
    timestamp: Date.now(),
  };
}

/**
 * Creates a conditional click step with Copilot presets
 */
export function createCopilotConditionalStep(): Step {
  return createConditionalClickStep(
    {
      buttonTexts: ['Allow', 'Keep'],
      successText: 'committed',
      timeoutSeconds: 300,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    },
    'Copilot: Wait for Allow/Keep'
  );
}
```

### 4.4 Dialog Integration in JSX

```typescript
// In src/pages/Recorder.tsx - JSX return

return (
  <div className="recorder-container">
    {/* Existing toolbar */}
    <Toolbar>
      {/* ... other toolbar items ... */}
      
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline">
            <PlusIcon /> Add Variable
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => addInputStep()}>
            Text Input
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addSelectStep()}>
            Dropdown Select
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addCheckboxStep()}>
            Checkbox
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openConditionalClickDialog}>
            <EyeIcon className="mr-2 h-4 w-4" />
            Conditional Click
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Toolbar>

    {/* Existing step list */}
    {/* ... */}

    {/* Conditional Click Dialog */}
    {isConditionalDialogOpen && pendingConditionalConfig && (
      <ConditionalClickConfigPanel
        config={pendingConditionalConfig}
        onChange={setPendingConditionalConfig}
        onSave={() => handleConditionalSave(pendingConditionalConfig)}
        onCancel={handleConditionalCancel}
        isNewStep={true}
      />
    )}
  </div>
);
```

### 4.5 Copilot Quick-Add Option

```typescript
// Optional: Add a "Copilot Preset" submenu item

<DropdownMenuItem onClick={openConditionalClickDialog}>
  <EyeIcon className="mr-2 h-4 w-4" />
  Conditional Click
</DropdownMenuItem>
<DropdownMenuItem onClick={() => {
  const step = createCopilotConditionalStep();
  addStep(step);
}}>
  <ZapIcon className="mr-2 h-4 w-4" />
  Copilot Allow/Keep (Quick Add)
</DropdownMenuItem>
```

---

## 5. VISUAL REFERENCE

The menu should appear when clicking "+ Add Variable":

```
┌─────────────────────────┐
│ + Add Variable ▼        │
├─────────────────────────┤
│ Text Input              │
│ Dropdown Select         │
│ Checkbox                │
├─────────────────────────┤
│ 👁 Conditional Click    │
│ ⚡ Copilot Quick Add    │
└─────────────────────────┘
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** "Conditional Click" appears in Add Variable menu
- [ ] **AC-2:** Menu item has appropriate icon
- [ ] **AC-3:** Clicking opens ConditionalClickConfigPanel
- [ ] **AC-4:** Dialog has default Copilot-friendly values
- [ ] **AC-5:** Saving creates new step with event='conditional-click'
- [ ] **AC-6:** Step label shows watched button texts
- [ ] **AC-7:** Step has recordedVia='vision'
- [ ] **AC-8:** Canceling dialog does not create step
- [ ] **AC-9:** New step appears at end of step list
- [ ] **AC-10:** Optional: Quick-add Copilot preset works

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Event type** - Must be 'conditional-click' exactly
2. **recordedVia** - Must be 'vision' for Vision Engine
3. **Default values** - Should work for Copilot out of box

### Patterns to Follow

1. **Factory pattern** - Use stepFactory for step creation
2. **Dialog state** - Track open/pending separately
3. **Menu consistency** - Match existing menu styling

### Edge Cases

1. **Empty buttonTexts** - Validate in dialog, don't allow save
2. **Dialog dismissed** - Click outside should cancel
3. **Recording active** - Menu should still work
4. **Maximum steps** - Should allow adding regardless

---

## 8. VERIFICATION COMMANDS

```bash
# Verify Recorder modifications
grep -n "Conditional Click\|conditionalConfig\|openConditionalClickDialog" src/pages/Recorder.tsx

# Verify stepFactory
grep -n "createConditionalClickStep" src/utils/stepFactory.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert Recorder changes
git checkout src/pages/Recorder.tsx

# Revert stepFactory changes
git checkout src/utils/stepFactory.ts
```

---

## 10. REFERENCES

- FND-010: Step Interface Extension (conditionalConfig field)
- UI-006: ConditionalClickConfigPanel (dialog component)
- ENG-014: Wait and Click Buttons (execution logic)
- Feature Spec: `/future-spec/03_feature-specs.md` Section 2

---

*End of Specification UI-009*
