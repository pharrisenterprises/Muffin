# Step Executor Module - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Routes step execution between DOM and Vision pathways. Handles per-step delays, global delays, conditional clicks, and CSV variable substitution during playback.

**Where it lives:** `src/lib/stepExecutor.ts`

**Why it exists:** Abstracts execution logic from PlaybackEngine. Provides single entry point for step execution with delay logic, variable substitution, and multi-pathway routing.

---

## Inputs
| Input | Type | Source | Purpose |
|-------|------|--------|----------|
| step | `Step` | PlaybackEngine | Step to execute |
| recording | `Recording` | PlaybackEngine | Global config (globalDelayMs, loopStartIndex) |
| csvRow | `CSVRow` | CSV parser | Variable values for substitution |

---

## Outputs
| Output | Type | Destination | Content |
|--------|------|-------------|---------|
| StepResult | `{success: boolean, error?: string}` | PlaybackEngine | Execution outcome |
| Events | `step:start`, `step:complete`, `step:error` | PlaybackEngine | Progress tracking (optional) |

---

## Internal Architecture

### Execution Router
```typescript
// stepExecutor.ts
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
      // Vision: Find text, click, then type
      await visionEngine.findTextAndClick(step.label);
      return await visionEngine.typeText(step.value);
    
    case 'conditional-click':
      return await visionEngine.waitAndClickButtons(
        step.conditionalConfig
      );
    
    default:
      return { success: false, error: `Unsupported Vision event: ${step.event}` };
  }
}
```

### DOM Step Executor
```typescript
async function executeDOMStep(step: Step): Promise<StepResult> {
  // Send to content script via messaging
  return await chrome.tabs.sendMessage(tabId, {
    type: `DOM_${step.event.toUpperCase()}`,
    path: step.path,
    value: step.value
  });
}
```

### CSV Variable Substitution
```typescript
function substituteVariables(step: Step, csvRow?: CSVRow): Step {
  if (!csvRow) return step;
  
  let substituted = { ...step };
  
  // Substitute in value field
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
    // Case-insensitive lookup
    const value = csvRow[varName.toLowerCase()];
    return value !== undefined ? value : match;  // Leave unmatched variables as-is
  });
}
```

### Delay Helper
```typescript
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Critical Dependencies
**Upstream:**
- **PlaybackEngine** (ENG-008) - Orchestrates step execution loop
- **CSV Parser** (ENG-016) - Provides csvRow data

**Downstream:**
- **VisionEngine** (ENG-001) - Executes Vision pathway steps
- **Content Script** - Executes DOM pathway steps (via messaging)

**Type Dependencies:**
- **Step** (FND-010) - Step interface
- **Recording** (FND-011) - Recording interface
- **ConditionalConfig** (FND-008) - Conditional config interface

---

## Hidden Assumptions
1. **Delay priority** - Per-step > Global > 0 (no delay)
2. **Variable names case-insensitive** - {{Name}} matches csvRow.name
3. **Missing variables unchanged** - {{missing}} left as-is (not empty string)
4. **Vision coordinates valid** - Assumes x/y in step are screen-relative
5. **DOM path valid** - Assumes bundle.path is XPath string
6. **Async delays accurate** - Uses setTimeout (JavaScript timing limitations)
7. **Error propagation** - Vision errors throw, DOM errors return {success: false}
8. **Event timing** - Optional events emitted before/after execution

---

## Stability Concerns

### High-Risk Patterns
1. **Timing accuracy**
   ```typescript
   await delay(1000);  // May be 1005ms or 995ms
   // JavaScript timing not precise
   ```

2. **Variable name collision**
   ```typescript
   // CSV: {name: "John", Name: "Doe"}
   // {{name}} → "john" (lowercased, first match)
   ```

3. **Async coordination**
   ```typescript
   // Step 1: Click button (opens modal)
   // Step 2: Fill input (modal not ready yet)
   // No automatic wait for DOM changes
   ```

4. **Memory with large CSV**
   ```typescript
   csvRow = { ...1000 columns }
   // Passed to every step, high memory usage
   ```

### Failure Modes
- **Vision engine timeout** - VisionEngine throws, PlaybackEngine catches
- **DOM message fails** - Content script not injected or tab closed
- **Invalid CSV variables** - Missing columns leave {{var}} unchanged
- **Delay overflow** - globalDelayMs > 60000 capped by migration

---

## Edge Cases

### Input Variations
1. **Zero delay**
   ```typescript
   step.delaySeconds = 0;
   recording.globalDelayMs = 0;
   // Executes immediately
   ```

2. **Missing CSV row**
   ```typescript
   csvRow = undefined;
   // No substitution occurs, {{vars}} unchanged
   ```

3. **Malformed variables**
   ```typescript
   step.value = "{{}}";  // Empty variable name
   // Left unchanged (no match)
   ```

4. **Nested variables**
   ```typescript
   step.value = "{{{{nested}}}}";
   // Not supported, treated as literal text
   ```

5. **Special characters in CSV**
   ```typescript
   csvRow = { url: "https://example.com?param=value" };
   // No URL encoding, passed as-is
   ```

6. **Empty value after substitution**
   ```typescript
   step.value = "{{empty_column}}";
   csvRow.empty_column = "";
   // Substitutes to empty string
   ```

7. **Both delays set**
   ```typescript
   step.delaySeconds = 2;
   recording.globalDelayMs = 1000;
   // Per-step takes precedence (2000ms)
   ```

8. **No recordedVia field** (legacy step)
   ```typescript
   step.recordedVia = undefined;
   // Migration adds 'dom' default, routes to DOM executor
   ```

9. **Conditional click + CSV**
   ```typescript
   step.conditionalConfig = { buttonTexts: ["{{status}}", "Cancel"] };
   csvRow.status = "Confirm";
   // Substitutes to ["Confirm", "Cancel"]
   ```

10. **Vision click fails**
   ```typescript
   visionEngine.clickAt(x, y);  // Throws error
   // executeVisionStep returns {success: false, error: "..."}
   ```

---

## Developer-Must-Know Notes
- **Delay priority** - Per-step delay overrides global delay
- **Variable syntax** - {{variable_name}} in step.value or conditionalConfig.buttonTexts
- **Case-insensitive** - Variable names lowercased for CSV lookup
- **No validation** - Missing variables left unchanged (not empty string)
- **Vision coordinates** - Assumes screen-relative x/y coordinates
- **DOM messaging** - Sends to content script, requires tab ID
- **Error handling** - Vision throws, DOM returns result object
- **Testing strategy:**
  - Unit tests: Variable substitution, delay logic, routing
  - Integration tests: CSV loop with variable substitution
  - E2E tests: Full playback with delays and conditionals

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **ENG-017** | Critical | StepExecutor is the execution router for all playback |
| **MIG-001** | Critical | Routes by recordedVia field added by migration |
| **ENG-016** | High | CSV substitution enables batch testing |
| **UI-011** | High | Delay configuration (per-step and global) |

### Specification Mapping
- **G4** (Playback Engine) - Core execution routing logic
- **B2** (CSV Integration) - Variable substitution for batch testing
- **F2** (Delay Configuration) - Per-step and global delay handling
- **E3** (Conditional Clicks) - Conditional config substitution

### Evidence References
- Code: `src/lib/stepExecutor.ts` lines 1-200 (full implementation)
- Test: Unit tests for variable substitution (src/tests/stepExecutor.test.ts)
- Test: E2E test with CSV loop and delays (src/tests/e2e/playback.test.ts)
- Docs: Playback Engine specification G4 (references step executor)

### Integration Risks
1. **Timing Precision:** JavaScript setTimeout not reliable for sub-100ms delays
2. **Variable Collision:** Case-insensitive lookup may match wrong column
3. **Async Coordination:** No automatic wait for DOM changes between steps
4. **Memory Overhead:** Large CSV rows passed to every step (high memory usage)

---

## Related Components
- **Playback Engine** (`test-orchestrator_breakdown.md`) - Calls executeStep() in loop
- **Vision Engine** (Phase 3 spec ENG-001) - Executes Vision pathway steps
- **Content Script Replayer** (`content-script-replayer_breakdown.md`) - Executes DOM pathway steps
- **CSV Parser** (`csv-parser_breakdown.md`) - Provides csvRow for variable substitution
- **Schema Migration** (`schema-migration_breakdown.md`) - Adds recordedVia field for routing
