# Vision Recording UI Components Breakdown

## Purpose

UI components for Vision features including badges, loop start controls, delay inputs, and visual indicators for Vision-recorded steps.

## Key Files

| File | Location | Purpose |
|------|----------|----------|
| Vision Badge | `src/components/recorder/VisionBadge.tsx` | 👁️ badge for Vision steps |
| Loop Start Dropdown | `src/components/recorder/LoopStartDropdown.tsx` | Select loop start step |
| Global Delay Input | `src/components/recorder/GlobalDelayInput.tsx` | Set global delay |
| Delay Badge | `src/components/recorder/DelayBadge.tsx` | ⏱️ badge for per-step delay |
| Set Delay Menu Item | `src/components/recorder/SetDelayMenuItem.tsx` | Context menu for delay |

## Inputs

| Input | Type | Source | Purpose |
|-------|------|--------|----------|
| step | `Step` | Redux | Step data |
| recording | `Recording` | Redux | Recording config |
| loopStartIndex | `number` | Recording | Current loop start |
| globalDelayMs | `number` | Recording | Current global delay |
| delaySeconds | `number \| null` | Step | Per-step delay |

## Outputs

| Output | Type | Destination | Content |
|--------|------|-------------|----------|
| updatedLoopStart | `number` | Redux | New loop start index |
| updatedGlobalDelay | `number` | Redux | New global delay |
| updatedStepDelay | `number \| null` | Redux | New per-step delay |

## Internal Architecture

### Vision Badge (UI-001)

```typescript
function VisionBadge({ step }: Props) {
  if (step.recordedVia !== 'vision') return null;
  
  const reason = step.visionFallbackReason || 'Manual Vision recording';
  
  return (
    <Tooltip title={reason}>
      <Badge variant="vision">
        👁️
      </Badge>
    </Tooltip>
  );
}
```

### Loop Start Dropdown (UI-004, UI-007)

```typescript
function LoopStartDropdown({ 
  recording, 
  onChange 
}: Props) {
  
  const steps = recording.steps;
  const currentIndex = recording.loopStartIndex || 0;
  
  return (
    <Select
      label="Loop Start"
      value={currentIndex}
      onChange={e => onChange(Number(e.target.value))}
    >
      {steps.map((step, index) => (
        <MenuItem key={step.id} value={index}>
          Step {index + 1}: {step.event} {step.label}
        </MenuItem>
      ))}
    </Select>
  );
}
```

### Global Delay Input (UI-005, UI-008)

```typescript
function GlobalDelayInput({ 
  recording, 
  onChange 
}: Props) {
  
  const [delay, setDelay] = useState(recording.globalDelayMs || 0);
  
  function handleChange(value: number) {
    const clamped = Math.max(0, Math.min(60000, value));
    setDelay(clamped);
    onChange(clamped);
  }
  
  return (
    <TextField
      type="number"
      label="Delay (ms)"
      value={delay}
      onChange={e => handleChange(Number(e.target.value))}
      inputProps={{ min: 0, max: 60000, step: 100 }}
      helperText="Global delay between steps (0-60000ms)"
    />
  );
}
```

### Delay Badge (UI-010)

```typescript
function DelayBadge({ seconds }: Props) {
  return (
    <Tooltip title={`Wait ${seconds}s before this step`}>
      <Badge variant="delay">
        ⏱️ {seconds}s
      </Badge>
    </Tooltip>
  );
}
```

### Set Delay Menu Item (UI-011)

```typescript
function SetDelayMenuItem({ 
  step, 
  onSetDelay 
}: Props) {
  
  const [open, setOpen] = useState(false);
  const [delay, setDelay] = useState(step.delaySeconds || 0);
  
  function handleSave() {
    onSetDelay(delay > 0 ? delay : null);
    setOpen(false);
  }
  
  return (
    <>
      <MenuItem onClick={() => setOpen(true)}>
        <Icon name="clock" />
        Set Delay...
      </MenuItem>
      
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Set Step Delay</DialogTitle>
        <DialogContent>
          <TextField
            type="number"
            label="Delay (seconds)"
            value={delay}
            onChange={e => setDelay(Number(e.target.value))}
            inputProps={{ min: 0, max: 3600, step: 1 }}
            helperText="Wait before executing this step (0-3600s)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
```

### Loop Start Badge (UI-002)

```typescript
function LoopStartBadge({ 
  stepIndex, 
  loopStartIndex 
}: Props) {
  
  if (stepIndex !== loopStartIndex) return null;
  
  return (
    <Tooltip title="Loop starts from this step">
      <Badge variant="loop">
        🔁
      </Badge>
    </Tooltip>
  );
}
```

## Dependencies

### UI Libraries
- **React** (^18.x): Component framework
- **Material-UI**: Select, TextField, Dialog, MenuItem
- **React Icons**: Icon components

### Internal Dependencies
- **Redux Store**: Recording/step state
- **Step Types** (FND-010): Step interface
- **Recording Types** (FND-011): Recording interface

## Hidden Assumptions

1. **Badge Order**: Vision → Loop → Conditional → Delay
2. **Emoji Support**: 👁️ 🔁 🎯 ⏱️ render correctly
3. **Global Delay Max**: 60000ms (1 minute)
4. **Per-Step Delay Max**: 3600s (1 hour)
5. **Delay Priority**: Per-step > Global > 0
6. **Loop Start Default**: 0 (all steps)
7. **Delay Zero**: Treated as null (removed)
8. **Input Validation**: Clamped to min/max
9. **Vision Fallback Reason**: Optional field
10. **Badge Tooltips**: Always shown on hover

## Stability Concerns

### High Risk
1. **Delay Overflow**: Large delays may timeout browser
2. **State Synchronization**: Redux updates may lag UI

### Medium Risk
1. **Input Validation**: User may paste invalid values
2. **Loop Start Bounds**: May exceed steps array

### Low Risk
1. **Badge Rendering**: Simple conditional components
2. **Dropdown Population**: Standard React pattern

## Edge Cases

1. **No Steps**: Dropdown empty
2. **Loop Start at Last Step**: Only last step loops
3. **Loop Start Beyond Length**: Migration repairs to length-1
4. **Delay 0**: Badge not shown
5. **Delay Null**: Badge not shown
6. **Very Large Delay**: Clamped to max
7. **Negative Delay**: Clamped to 0
8. **Vision Badge + Delay Badge**: Both shown
9. **All Badges**: Vision + Loop + Conditional + Delay
10. **Empty visionFallbackReason**: Shows generic tooltip

## Developer Notes

### Testing Strategy
- **Unit Tests**: Component rendering, state updates
- **Integration Tests**: Redux actions triggered
- **E2E Tests**: Full UI workflow

### Common Pitfalls
1. **Forgetting Clamp**: Large values break playback
2. **Null vs 0**: Different meanings for delay
3. **Loop Start Validation**: Must be within bounds
4. **Badge Overlap**: CSS may clip badges
5. **Tooltip Text**: Keep concise

### Accessibility
1. **ARIA Labels**: All inputs labeled
2. **Keyboard Navigation**: Tab through controls
3. **Focus Management**: Dialog auto-focus
4. **Screen Reader**: Badge alternatives
5. **Color Independence**: Don't rely only on color

### Styling Guidelines
1. **Vision Badge**: Blue with eye emoji
2. **Loop Badge**: Green with recycle emoji
3. **Conditional Badge**: Orange with target emoji
4. **Delay Badge**: Purple with clock emoji
5. **Badge Size**: 24x24px, inline-flex
6. **Spacing**: 4px between badges

### Integration Points
- **Step Table**: Renders all badges (UI-010)
- **Recorder Toolbar**: Global delay input (UI-005, UI-008)
- **Context Menu**: Set delay, add conditional (UI-011, UI-009)
- **Step Executor**: Uses delays (ENG-017, ENG-018)
- **CSV Loop**: Uses loop start (ENG-016)
- **Migration**: Sets defaults (MIG-002, MIG-003)

## Specification References

- UI-001: Vision badge component
- UI-002: Loop start badge component
- UI-003: Conditional Click badge component
- UI-004, UI-007: Loop start dropdown
- UI-005, UI-008: Global delay input
- UI-010: Step row badge display
- UI-011: Set delay menu item
- FND-010: Step interface extension
- FND-011: Recording interface extension
- ENG-017: Step executor (uses delays)
- ENG-018: Delay execution logic
- MIG-002: LoopStartIndex default
- MIG-003: GlobalDelayMs default
