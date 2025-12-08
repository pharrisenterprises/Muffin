# Test Orchestrator - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Core test execution engine coordinating CSV row iteration, tab management, step playback, result aggregation, and progress tracking. Main orchestration logic for automated test runs.

**Where it lives:** `runTest()` async function in `src/pages/TestRunner.tsx` (200+ lines)

**Why it exists:** Coordinates complex multi-step workflow: CSV parsing → row iteration → tab creation → step execution → result collection → history persistence.

---

## Inputs
```typescript
{
  currentProject: {
    csv_data: any[],           // CSV rows or empty array
    recorded_steps: Step[],    // Captured steps to replay
    parsed_fields: FieldMapping[],  // CSV-to-field mappings
    target_url: string         // Starting URL for tests
  }
}
```

---

## Outputs
- **Test run record** in IndexedDB (testruns table)
- **Console logs array** with timestamps
- **Updated testSteps array** with status (pending/passed/failed)
- **Progress percentage** (0-100)
- **Final results summary** (passed/failed counts, duration)

---

## Internal Architecture

### Execution Algorithm
```typescript
async function runTest() {
  isRunningRef.current = true;
  setIsRunning(true);
  setLogs([]);  // Clear previous logs
  const startTime = Date.now();
  
  const { csv_data, recorded_steps, parsed_fields, target_url } = currentProject;
  
  // 1. Build mapping lookup (CSV column → step label)
  const mappingLookup: Record<string, string> = {};
  parsed_fields?.forEach(field => {
    if (field.mapped) {
      mappingLookup[field.field_name] = field.inputvarfields;
    }
  });
  
  // 2. Determine rows to process
  const rowsToProcess = csv_data?.length > 0 ? csv_data : [{}];
  addLog('info', `Starting test with ${rowsToProcess.length} row(s)`);
  
  // 3. Iterate CSV rows
  for (let rowIndex = 0; rowIndex < rowsToProcess.length; rowIndex++) {
    if (!isRunningRef.current) break;  // Stop button check
    
    const row = rowsToProcess[rowIndex];
    addLog('info', `--- Row ${rowIndex + 1}/${rowsToProcess.length} ---`);
    
    // 4. Open new tab with target URL
    const { tabId } = await chrome.runtime.sendMessage({
      action: 'openTab',
      url: target_url
    });
    
    await delay(2000);  // Wait for page load
    
    // 5. Execute steps for this row
    for (let stepIndex = 0; stepIndex < recorded_steps.length; stepIndex++) {
      if (!isRunningRef.current) break;
      
      const step = recorded_steps[stepIndex];
      updateStepStatus(stepIndex, 'running', Date.now() - startTime);
      
      // 6. Resolve CSV value for step
      let inputValue = row[step.label];  // Direct label match
      
      if (!inputValue) {
        // Try mapping lookup (CSV column → step label)
        const mappedKey = Object.keys(mappingLookup).find(
          k => mappingLookup[k] === step.label
        );
        if (mappedKey) inputValue = row[mappedKey];
      }
      
      // 7. Skip input steps without CSV value
      if (step.event === 'input' && !inputValue && csv_data?.length > 0) {
        addLog('warning', `Skipping step ${stepIndex + 1} - no CSV value`);
        updateStepStatus(stepIndex, 'skipped', Date.now() - startTime);
        continue;
      }
      
      // 8. Random delay (human-like timing)
      await delay(1000 + Math.random() * 2000);  // 1-3 seconds
      
      // 9. Execute step via content script
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'runStep',
          data: {
            event: step.event,
            bundle: step.bundle,
            value: inputValue || step.value || ''
          }
        });
        
        updateStepStatus(stepIndex, 'passed', Date.now() - startTime);
        addLog('success', `✓ Step ${stepIndex + 1}: ${step.event} on ${step.label}`);
      } catch (error) {
        updateStepStatus(stepIndex, 'failed', Date.now() - startTime, error.message);
        addLog('error', `✗ Step ${stepIndex + 1} failed: ${error.message}`);
        
        // Fail fast on error (optional: could continue)
        break;
      }
      
      // 10. Update progress
      const totalSteps = recorded_steps.length * rowsToProcess.length;
      const completedSteps = rowIndex * recorded_steps.length + stepIndex + 1;
      setProgress((completedSteps / totalSteps) * 100);
    }
    
    // 11. Close tab (commented out for debugging)
    // await chrome.tabs.remove(tabId);
  }
  
  // 12. Finalize test run
  const duration = Date.now() - startTime;
  const passedCount = testSteps.filter(s => s.status === 'passed').length;
  const failedCount = testSteps.filter(s => s.status === 'failed').length;
  
  addLog('info', `Test completed in ${(duration / 1000).toFixed(1)}s`);
  addLog('success', `✓ ${passedCount} passed, ✗ ${failedCount} failed`);
  
  // 13. Save test run to IndexedDB
  await chrome.runtime.sendMessage({
    action: 'create_test_run',
    data: {
      project_id: currentProject.id,
      status: failedCount > 0 ? 'failed' : 'completed',
      passed_steps: passedCount,
      failed_steps: failedCount,
      duration,
      created_date: Date.now()
    }
  });
  
  setIsRunning(false);
  isRunningRef.current = false;
}
```

---

## Critical Dependencies
**Upstream:**
- **TestRunner UI** - Triggers runTest() on button click
- **Project data** - recorded_steps, csv_data, parsed_fields from IndexedDB

**Downstream:**
- **Chrome tabs API** - Tab creation/removal
- **Chrome runtime** - Message passing to content scripts
- **Content script replayer** - Executes individual steps
- **Test Logger** - addLog() for console output
- **Test Run Repository** - Persists execution history

---

## Hidden Assumptions
1. **Sequential execution** - CSV rows processed one at a time (no parallelism)
2. **Tab persistence** - Tab close commented out for debugging
3. **Content script ready** - No explicit wait for injection completion
4. **Fail-fast on error** - First failed step stops row (doesn't continue)
5. **Mapping bijective** - One CSV column maps to exactly one step label
6. **Random delays** - 1-3s between steps simulates human behavior
7. **Single test at once** - No concurrent test execution support

---

## Stability Concerns

### High-Risk Patterns
1. **No retry logic**
   ```typescript
   await chrome.tabs.sendMessage(tabId, { type: 'runStep', ... });
   // If fails, entire test aborts (no retry)
   ```

2. **Tab management fragile**
   ```typescript
   // Tab close commented out
   // await chrome.tabs.remove(tabId);
   // Multiple tests leave tabs open → Memory leak
   ```

3. **No timeout per step**
   ```typescript
   await chrome.tabs.sendMessage(...);  // Infinite wait
   // Stuck step hangs entire test execution
   ```

4. **Memory unbounded**
   ```typescript
   // Large CSV (10,000 rows) accumulates logs
   logs.length = 50,000;  // 5 logs per row
   ```

### Failure Modes
- **Content script not injected** - sendMessage throws, test aborts
- **Tab closed manually** - User closes tab, messages fail
- **Network errors** - Page doesn't load, steps fail
- **CSV mapping mismatch** - No value found, input steps skipped

---

## Edge Cases

### Input Variations
1. **No CSV data**
   ```typescript
   csv_data = [];
   → Runs once with recorded step values (rowsToProcess = [{}])
   ```

2. **Unmapped required field**
   ```typescript
   step.label = 'Username';
   csv_data = [{ email: 'test@example.com' }];  // No 'Username' column
   → Skips input step with warning
   ```

3. **CSV row missing value**
   ```typescript
   csv_data = [{ username: '', password: '123' }];
   → Empty string passed as input value (valid)
   ```

4. **Network timeout during page load**
   ```typescript
   await chrome.runtime.sendMessage({ action: 'openTab', url: 'https://slow-site.com' });
   await delay(2000);  // Fixed 2s wait may not be enough
   → Steps execute before page ready
   ```

5. **Stop button clicked mid-execution**
   ```typescript
   isRunningRef.current = false;  // Set by stop button
   → Loop breaks on next iteration check
   ```

---

## Developer-Must-Know Notes
- **isRunningRef pattern** - Prevents race conditions (state updates delayed in React)
- **Random delays** - `1000 + Math.random() * 2000` milliseconds (1-3 seconds)
- **Tab close commented** - `// await chrome.tabs.remove(tabId)` left open for debugging
- **Mapping lookup bidirectional** - CSV column ↔ step label (searches both directions)
- **Progress updates** - After EACH step, not per row (granular feedback)
- **Fail-fast behavior** - First error breaks inner loop (stops current row)
- **No resume capability** - Must restart from beginning after stop/error

**Common Issues:**
1. **"Element not found" errors** - XPath/selector changed on target site
2. **Steps execute too fast** - Increase random delay range
3. **CSV values not applied** - Check mapping lookup logic
4. **Memory issues on large CSV** - Log accumulation (need pruning)

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **ENG-008** | Critical | TestOrchestrator IS the PlaybackEngine core loop |
| **ENG-016** | Critical | CSV iteration and variable substitution implemented here |
| **DAT-003** | High | Test run persistence via Test Run Repository |
| **UI-011** | High | Progress tracking and real-time feedback |

### Specification Mapping
- **G4** (Playback Engine) - Main execution orchestration
- **B2** (CSV Integration) - Row iteration and value mapping
- **G5** (Error Handling) - Fail-fast error propagation
- **H2** (User Experience) - Progress bar and console logging

### Evidence References
- Code: `src/pages/TestRunner.tsx` lines 150-400 (runTest function)
- Test: Manual test execution with 10-row CSV file
- Logs: Console output showing row iteration and step execution

### Integration Risks
1. **No Retry Logic:** Network failures abort entire test (single point of failure)
2. **Tab Leaks:** Commented tab close causes memory accumulation
3. **Timeout Missing:** Hung steps block execution indefinitely
4. **Memory Growth:** Large CSV runs exhaust browser memory (log accumulation)

---

## Related Components
- **Test Runner UI** (`test-runner-ui_breakdown.md`) - Hosts runTest() function
- **Test Logger** (`test-logger_breakdown.md`) - addLog() called throughout execution
- **Test Run Repository** (`test-run-repository_breakdown.md`) - Persists execution history
- **Content Script Replayer** (`content-script-replayer_breakdown.md`) - Executes runStep messages
- **Step Executor** (`step-executor_breakdown.md`) - Content script step execution logic
- **CSV Parser** (`csv-parser_breakdown.md`) - Provides csv_data array
- **Field Mapping Engine** (`field-mapping-engine_breakdown.md`) - Provides parsed_fields
