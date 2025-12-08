# Conditional Click UI Components Breakdown

## Purpose

UI components for configuring and displaying conditional click settings. Includes add menu, configure panel, badge display, and step indicators.

## Key Files

| File | Location | Purpose |
|------|----------|----------|
| Add Conditional Click Menu | `src/components/recorder/AddConditionalClickMenu.tsx` | Menu item to add conditional step |
| Configure Conditional Panel | `src/components/recorder/ConfigureConditionalPanel.tsx` | Configuration dialog |
| Conditional Badge | `src/components/recorder/ConditionalBadge.tsx` | 🎯 badge component |
| Step Row Badge Display | `src/components/recorder/StepRow.tsx` | Badge rendering logic |

## Inputs

| Input | Type | Source | Purpose |
|-------|------|--------|----------|
| step | `Step` | Redux | Current step data |
| onAdd | `() => void` | Parent | Add conditional step callback |
| onConfigure | `(config) => void` | Parent | Save config callback |
| conditionalConfig | `ConditionalConfig \| null` | Step | Current configuration |

## Outputs

| Output | Type | Destination | Content |
|--------|------|-------------|----------|
| newStep | `Step` | Redux | New conditional step |
| updatedConfig | `ConditionalConfig` | Redux | Updated configuration |
| UI Events | `click`, `change` | React | User interactions |

## Internal Architecture

### Add Conditional Click Menu (UI-009)

```typescript
function AddConditionalClickMenu({ onAdd }: Props) {
  return (
    <MenuItem onClick={handleAddConditional}>
      <Icon name="target" />
      Conditional Click
    </MenuItem>
  );
  
  function handleAddConditional() {
    const newStep: Step = {
      id: generateId(),
      event: 'conditional-click',
      recordedVia: 'vision',
      conditionalConfig: {
        buttonTexts: ['Allow', 'Keep'],
        successText: null,
        timeoutSeconds: 120,
        pollIntervalMs: 500,
        confidenceThreshold: 0.6,
      },
      delaySeconds: null,
    };
    onAdd(newStep);
  }
}
```

### Configure Conditional Panel (UI-012)

```typescript
function ConfigureConditionalPanel({ 
  step, 
  onSave, 
  onClose 
}: Props) {
  
  const [buttonTexts, setButtonTexts] = useState<string[]>(
    step.conditionalConfig?.buttonTexts || []
  );
  const [successText, setSuccessText] = useState<string>(
    step.conditionalConfig?.successText || ''
  );
  const [timeout, setTimeout] = useState<number>(
    step.conditionalConfig?.timeoutSeconds || 120
  );
  const [pollInterval, setPollInterval] = useState<number>(
    step.conditionalConfig?.pollIntervalMs || 500
  );
  const [confidence, setConfidence] = useState<number>(
    step.conditionalConfig?.confidenceThreshold || 0.6
  );
  
  function handleSave() {
    const config: ConditionalConfig = {
      buttonTexts,
      successText: successText || null,
      timeoutSeconds: timeout,
      pollIntervalMs: pollInterval,
      confidenceThreshold: confidence,
    };
    onSave(config);
  }
  
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Configure Conditional Click</DialogTitle>
      <DialogContent>
        <TextField
          label="Button Text (comma-separated)"
          value={buttonTexts.join(', ')}
          onChange={e => setButtonTexts(
            e.target.value.split(',').map(s => s.trim())
          )}
        />
        <TextField
          label="Success Text (optional)"
          value={successText}
          onChange={e => setSuccessText(e.target.value)}
        />
        <TextField
          type="number"
          label="Timeout (seconds)"
          value={timeout}
          onChange={e => setTimeout(Number(e.target.value))}
        />
        <TextField
          type="number"
          label="Poll Interval (ms)"
          value={pollInterval}
          onChange={e => setPollInterval(Number(e.target.value))}
        />
        <Slider
          label="Confidence Threshold"
          value={confidence}
          min={0}
          max={1}
          step={0.05}
          onChange={(e, val) => setConfidence(val as number)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
```

### Conditional Badge (UI-003)

```typescript
function ConditionalBadge({ step }: Props) {
  if (!step.conditionalConfig) return null;
  
  const { buttonTexts, timeoutSeconds } = step.conditionalConfig;
  
  return (
    <Tooltip title={`Wait for: ${buttonTexts.join(', ')}`}>
      <Badge>
        🎯 {timeoutSeconds}s
      </Badge>
    </Tooltip>
  );
}
```

### Step Row Badge Display (UI-010)

```typescript
function StepRow({ step }: Props) {
  return (
    <div className="step-row">
      <StepInfo step={step} />
      <BadgeContainer>
        {step.recordedVia === 'vision' && <VisionBadge />}
        {step.conditionalConfig && <ConditionalBadge step={step} />}
        {step.delaySeconds && <DelayBadge seconds={step.delaySeconds} />}
      </BadgeContainer>
      <StepActions step={step} />
    </div>
  );
}
```

## Dependencies

### UI Libraries
- **React** (^18.x): Component framework
- **Material-UI**: Dialog, TextField, Slider components
- **React Icons**: Icon components

### Internal Dependencies
- **Redux Store**: Step state management
- **Step Types** (FND-010): Step interface
- **ConditionalConfig Types** (FND-008): Config interface

## Hidden Assumptions

1. **Default Values**: 120s timeout, 500ms poll, 0.6 confidence
2. **Button Text Format**: Comma-separated string
3. **Success Text Optional**: Null allowed
4. **Poll Interval Minimum**: UI doesn't enforce, but 500ms recommended
5. **Confidence Range**: 0.0 to 1.0 (0% to 100%)
6. **Badge Order**: Vision → Conditional → Delay
7. **Emoji Icons**: 🎯 for conditional, 👁️ for vision, ⏱️ for delay
8. **Dialog Modal**: Blocks interaction until closed
9. **Input Validation**: Basic type coercion only
10. **Save Behavior**: Immediate save on button click

## Stability Concerns

### High Risk
1. **Invalid Input**: User may enter invalid values
2. **State Synchronization**: Redux state may drift from UI

### Medium Risk
1. **Comma Parsing**: "Allow, Keep" vs "Allow,Keep"
2. **Empty Button Texts**: User may clear all buttons

### Low Risk
1. **Dialog Rendering**: Standard React pattern
2. **Badge Display**: Simple conditional rendering

## Edge Cases

1. **Empty Button Texts**: No buttons to search
2. **Zero Timeout**: Exits immediately
3. **Very Low Poll Interval**: High CPU usage
4. **Confidence 0**: Matches everything
5. **Confidence 1**: Matches nothing
6. **Long Button Text**: Badge overflow
7. **Special Characters**: May break regex
8. **Unicode Emoji**: Works in button text
9. **Whitespace**: Trimmed from button texts
10. **Duplicate Buttons**: Allowed but redundant

## Developer Notes

### Testing Strategy
- **Unit Tests**: Component rendering, state management
- **Integration Tests**: Dialog save/cancel flow
- **E2E Tests** (TST-010): Full conditional click workflow

### Common Pitfalls
1. **Forgetting Trim**: "Allow " !== "Allow"
2. **Empty String vs Null**: successText handling
3. **Type Coercion**: Number inputs may be strings
4. **Uncontrolled Inputs**: Use value prop
5. **Missing onClose**: Dialog won't close

### Accessibility
1. **Keyboard Navigation**: Tab through form
2. **ARIA Labels**: Meaningful field labels
3. **Focus Management**: Auto-focus first field
4. **Screen Reader**: Badge text alternatives
5. **High Contrast**: Badge colors visible

### Integration Points
- **Step Table**: Displays badges (UI-010)
- **Context Menu**: Shows add menu (UI-009)
- **Redux Actions**: Saves step changes
- **VisionEngine**: Uses conditionalConfig (ENG-014)
- **Step Executor**: Routes conditional steps (ENG-017)

## Specification References

- UI-003: Conditional Click badge component
- UI-009: Add Conditional Click menu
- UI-010: Step row badge display
- UI-012: Configure Conditional menu
- FND-008: ConditionalConfig interface
- FND-010: Step interface extension
- ENG-014: waitAndClickButtons implementation
- TST-010: Full Copilot workflow test
