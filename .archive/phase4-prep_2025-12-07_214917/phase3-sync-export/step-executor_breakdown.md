# Step Executor Module Breakdown

## Purpose

Routes step execution between DOM and Vision pathways. Handles per-step delays, global delays, conditional clicks, and CSV variable substitution during playback.

## Key Files

| File | Location | Purpose |
|------|----------|----------|
| StepExecutor | `src/lib/stepExecutor.ts` | Main execution router |
| Delay Logic | `src/lib/stepExecutor.ts` | Timing implementation |

## Inputs

| Input | Type | Source | Purpose |
|-------|------|--------|----------|
| step | `Step` | PlaybackEngine | Step to execute |
| recording | `Recording` | PlaybackEngine | Global config |
| csvData | `CSVRow` | CSV parser | Variable values |

## Outputs

| Output | Type | Destination | Content |
|--------|------|-------------|----------|
| StepResult | `{success, error?}` | PlaybackEngine | Execution outcome |
| Events | `step:start`, `step:complete`, `step:error` | PlaybackEngine | Progress tracking |

## Internal Architecture

### Execution Router

```typescript
async function executeStep(
  step: Step, 
  recording: Recording, 
  csvRow?: CSVRow
): Promise<StepResult> {
  
  // 1. Apply per-step delay (if set)
  if (step.delaySeconds) {
    await delay(step.delaySeconds * 1000);
  } else if (recording.globalDelayMs) {
    await delay(recording.globalDelayMs);
  }
  
  // 2. Substitute CSV variables
  const substitutedStep = substituteVariables(step, csvRow);
  
  // 3. Route by recordedVia
  if (substitutedStep.recordedVia === 'vision') {
    return await executeVisionStep(substitutedStep);
  } else {
    return await executeDOMStep(substitutedStep);
  }
}
```

### Vision Step Executor

```typescript
async function executeVisionStep(step: Step): Promise<StepResult> {
  switch (step.event) {
    case 'click':
      return await visionEngine.clickAt(
        step.coordinates.x, 
        step.coordinates.y
      );
    
    case 'input':
      return await visionEngine.findTextAndClick(step.label);
      // Then type step.value
    
    case 'conditional-click':
      return await visionEngine.waitAndClickButtons(
        step.conditionalConfig
      );
  }
}
```

### DOM Step Executor

```typescript
async function executeDOMStep(step: Step): Promise<StepResult> {
  // Send to existing content script handlers
  return await chrome.tabs.sendMessage(tabId, {
    type: `DOM_${step.event.toUpperCase()}`,
    path: step.path,
    value: step.value
  });
}
```

### CSV Substitution

```typescript
function substituteVariables(step: Step, csvRow?: CSVRow): Step {
  if (!csvRow) return step;
  
  let substituted = { ...step };
  
  // Substitute in value
  if (step.value) {
    substituted.value = replaceVariables(step.value, csvRow);
  }
  
  // Substitute in conditionalConfig.buttonTexts
  if (step.conditionalConfig) {
    substituted.conditionalConfig = {
      ...step.conditionalConfig,
      buttonTexts: step.conditionalConfig.buttonTexts.map(
        text => replaceVariables(text, csvRow)
      )
    };
  }
  
  return substituted;
}

function replaceVariables(text: string, csvRow: CSVRow): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return csvRow[varName.toLowerCase()] || match;
  });
}
```

## Dependencies

### Internal Dependencies
- **VisionEngine** (ENG-001): Vision step execution
- **PlaybackEngine** (ENG-008): Orchestration
- **CSV Parser** (ENG-016): Variable mapping
- **Content Script**: DOM step execution

### Type Dependencies
- **Step** (FND-010): Step interface
- **Recording** (FND-011): Recording interface
- **ConditionalConfig** (FND-008): Conditional config

## Hidden Assumptions

1. **Delay Priority**: Per-step > Global > 0
2. **Variable Names**: Case-insensitive matching
3. **Missing Variables**: Leaves {{var}} unchanged
4. **Vision Coordinates**: Assumed valid if recordedVia='vision'
5. **DOM Path**: Assumed valid if recordedVia='dom'
6. **Async Delays**: Uses setTimeout under the hood
7. **Error Propagation**: Throws on Vision errors
8. **Event Timing**: Emits before/after execution

## Stability Concerns

### High Risk
1. **Timing Accuracy**: JavaScript timing not precise
2. **Variable Collision**: {{name}} vs {{Name}} collision
3. **Async Coordination**: Race conditions on rapid steps

### Medium Risk
1. **Memory**: Large CSV rows consume memory
2. **Error Handling**: Vision errors may not be caught
3. **State Mutation**: CSV row modification affects next step

### Low Risk
1. **Delay Implementation**: setTimeout is reliable
2. **String Replacement**: Regex is well-tested

## Edge Cases

1. **Zero Delay**: Executes immediately
2. **Missing CSV Row**: No substitution occurs
3. **Malformed Variables**: {{}} or {{}} left unchanged
4. **Nested Variables**: {{{{var}}}} not supported
5. **Special Characters**: URL encoding not handled
6. **Empty Value**: Substitutes to empty string
7. **Both Delays**: Per-step overrides global
8. **No recordedVia**: Defaults to 'dom' via migration
9. **Conditional + CSV**: Variables work in buttonTexts
10. **Vision Click Fails**: Error propagates to playback

## Developer Notes

### Testing Strategy
- **Unit Tests** (ENG-017): Step routing logic
- **Integration Tests** (ENG-016): CSV substitution
- **E2E Tests** (TST-009, TST-010): Full workflow

### Common Pitfalls
1. **Forgetting await**: Delays don't work
2. **Mutating step**: Use spread operator
3. **Case sensitivity**: Variables must match CSV headers
4. **Missing delay**: Steps execute too fast
5. **Wrong recordedVia**: Routes to wrong executor

### Integration Points
- **PlaybackEngine.playRecording()**: Calls executeStep (ENG-008)
- **VisionEngine**: Executes Vision steps (ENG-001)
- **CSV Loop**: Provides csvRow per iteration (ENG-016)
- **Migration**: Ensures recordedVia exists (MIG-001)
- **Delay UI**: Sets delaySeconds (UI-011)
- **Global Delay UI**: Sets globalDelayMs (UI-005, UI-008)

### Performance Tips
1. **Avoid Tight Loops**: Use delays
2. **Batch CSV**: Don't parse per-step
3. **Cache Variables**: Don't reparse per-step
4. **Early Return**: Check recordedVia first

## Specification References

- ENG-017: Step executor module
- ENG-018: Delay execution logic
- ENG-016: CSV position mapping
- ENG-008: Playback engine integration
- INT-008: DOM/Vision playback switch
- MIG-001: RecordedVia default migration
- UI-011: Set delay menu item
- UI-005, UI-008: Global delay input
- TST-009: CSV position mapping tests
- TST-010: Full Copilot workflow test
