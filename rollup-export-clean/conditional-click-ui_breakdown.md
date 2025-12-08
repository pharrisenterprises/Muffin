# Conditional Click UI Components Breakdown

## Purpose

UI components for configuring and displaying conditional click settings. Includes add menu, configure panel, badge display, and step indicators.

## Key Files

| File | Location | Purpose |
|------|----------|---------|
| Add Conditional Click Menu | `src/components/recorder/AddConditionalClickMenu.tsx` | Menu item to add conditional step |
| Configure Conditional Panel | `src/components/recorder/ConfigureConditionalPanel.tsx` | Configuration dialog |
| Conditional Badge | `src/components/recorder/ConditionalBadge.tsx` | 🎯 badge component |
| Step Row Badge Display | `src/components/recorder/StepRow.tsx` | Badge rendering logic |

## Inputs

| Input | Type | Source | Purpose |
|-------|------|--------|---------|
| step | `Step` | Redux | Current step data |
| onAdd | `() => void` | Parent | Add conditional step callback |
| onConfigure | `(config) => void` | Parent | Save config callback |
| conditionalConfig | `ConditionalConfig \| null` | Step | Current configuration |

## Outputs

| Output | Type | Destination | Content |
|--------|------|-------------|---------|
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
          label="Button Texts (comma-separated)"
          value={buttonTexts.join(', ')}
          onChange={(e) => setButtonTexts(e.target.value.split(',').map(s => s.trim()))}
        />
        <TextField
          label="Success Text (optional)"
          value={successText}
          onChange={(e) => setSuccessText(e.target.value)}
        />
        <TextField
          label="Timeout (seconds)"
          type="number"
          value={timeout}
          onChange={(e) => setTimeout(Number(e.target.value))}
        />
        <TextField
          label="Poll Interval (ms)"
          type="number"
          value={pollInterval}
          onChange={(e) => setPollInterval(Number(e.target.value))}
        />
        <TextField
          label="Confidence Threshold (0-1)"
          type="number"
          step="0.1"
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
```

### Conditional Badge (UI-013)

```typescript
function ConditionalBadge({ step }: { step: Step }) {
  if (!step.conditionalConfig) return null;
  
  const { buttonTexts, timeoutSeconds } = step.conditionalConfig;
  
  return (
    <Tooltip title={`Conditional: ${buttonTexts.join(' | ')} (${timeoutSeconds}s timeout)`}>
      <span className="conditional-badge">
        🎯 {buttonTexts.join(' | ')}
      </span>
    </Tooltip>
  );
}
```

## Critical Dependencies
- **React 18.2**: Component framework
- **Material-UI/Shadcn**: Dialog, TextField, Button components
- **Redux**: State management for steps
- **Lucide Icons**: Icon components

## Hidden Assumptions
1. **Vision-based recording**: Conditional steps always use `recordedVia: 'vision'`
2. **Default values**: 120s timeout, 500ms poll, 0.6 confidence
3. **Multiple buttons**: Supports multiple button text variations
4. **Case-insensitive matching**: Vision search ignores case

## Stability Concerns
- **No validation**: Allows empty button texts or invalid timeouts
- **No duplicate detection**: Can add multiple conditional steps with same config
- **No preview**: Users can't test configuration before saving

## Developer-Must-Know Notes
- Badge appears in step list when `conditionalConfig` is present
- Configuration dialog opens on badge click or "Configure" button
- Button texts split by comma (no escaping for commas in text)
- Success text optional (validation only if provided)
- Confidence threshold affects OCR matching strictness

## Phase 3 Integration Points

### Vision System (Phase 3D)
- **Input**: ConditionalConfig passed to VisionService
- **Output**: VisionService scans for buttonTexts using OCR
- **Integration**: ConditionalConfig.confidenceThreshold used for text matching

### Recording System (Phase 3A)
- **Input**: User creates conditional step via UI
- **Output**: RecordingOrchestrator stores ConditionalConfig in step metadata
- **Integration**: EvidenceBuffer captures vision data for conditional steps

### Strategy System (Phase 3C)
- **Input**: DecisionEngine evaluates conditional step execution
- **Output**: VisionStrategy prioritized for conditional-click event type
- **Integration**: FallbackChain skips DOM strategies for vision-only steps

### UI Components (Phase 3F)
- **Input**: TestRunner displays conditional badges during playback
- **Output**: Real-time polling status shown with 🎯 icon animation
- **Integration**: StrategyBadge shows active vision strategy during execution

**ConditionalConfig Schema**:
```typescript
interface ConditionalConfig {
  buttonTexts: string[];        // Multiple text variations to search for
  successText: string | null;   // Optional validation text after click
  timeoutSeconds: number;       // Max wait time for button to appear
  pollIntervalMs: number;       // Frequency of vision scans
  confidenceThreshold: number;  // OCR match confidence (0.0-1.0)
}
```

**Execution Flow**:
1. TestRunner encounters conditional-click step
2. Starts polling loop every `pollIntervalMs`
3. VisionService scans for any text in `buttonTexts`
4. If found with confidence >= `confidenceThreshold`, clicks element
5. If `successText` provided, validates presence after click
6. Fails if timeout expires without finding button

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
