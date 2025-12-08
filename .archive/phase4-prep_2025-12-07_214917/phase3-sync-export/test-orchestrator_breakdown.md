# Test Orchestrator Breakdown

## Purpose
**What it does:** Core test execution engine that orchestrates CSV row iteration, tab management, step playback, and result aggregation.

**Where it lives:** `runTest()` async function in `src/pages/TestRunner.tsx` (200+ lines)

**Why it exists:** Coordinates complex multi-step workflow: CSV iteration → tab creation → step execution → result collection.

## Inputs
```typescript
{
  csv_data: any[],  // CSV rows or empty array
  recorded_steps: Step[],
  parsed_fields: FieldMapping[],
  target_url: string
}
```

## Outputs
- Test run record in IndexedDB (passed_steps, failed_steps, duration)
- Console logs array
- Updated testSteps array with status

## Internal Architecture
**Execution Algorithm:**
```typescript
async function runTest() {
  isRunningRef.current = true;
  setIsRunning(true);
  setLogs([]);
  
  const { csv_data, recorded_steps, parsed_fields, target_url } = currentProject;
  
  // Build mapping lookup
  const mappingLookup: Record<string, string> = {};
  parsed_fields.forEach(field => {
    if (field.mapped) {
      mappingLookup[field.field_name] = field.inputvarfields;
    }
  });
  
  // Determine rows (CSV or single empty row)
  const rowsToProcess = csv_data?.length > 0 ? csv_data : [{}];
  
  // Iterate CSV rows
  for (let rowIndex = 0; rowIndex < rowsToProcess.length; rowIndex++) {
    if (!isRunningRef.current) break;  // Stop button check
    
    const row = rowsToProcess[rowIndex];
    addLog('info', `Starting row ${rowIndex + 1}`);
    
    // Open new tab
    const { tabId } = await chrome.runtime.sendMessage({
      action: 'openTab',
      url: target_url
    });
    
    // Execute steps
    for (let stepIndex = 0; stepIndex < recorded_steps.length; stepIndex++) {
      if (!isRunningRef.current) break;
      
      const step = recorded_steps[stepIndex];
      
      // Map CSV value to step
      let inputValue = row[step.label];  // Direct match
      if (!inputValue) {
        // Try mapping lookup
        const mappedKey = Object.keys(mappingLookup).find(
          k => mappingLookup[k] === step.label
        );
        if (mappedKey) inputValue = row[mappedKey];
      }
      
      // Skip input steps without value (CSV mode)
      if (step.event === 'input' && !inputValue && csv_data?.length > 0) {
        addLog('warning', `Skipping step ${stepIndex + 1} - no CSV value`);
        continue;
      }
      
      // Random delay (1-3s)
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      
      // Execute step
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
        addLog('success', `Step ${stepIndex + 1} completed`);
      } catch (error) {
        updateStepStatus(stepIndex, 'failed', Date.now() - startTime, error.message);
        addLog('error', `Step ${stepIndex + 1} failed: ${error.message}`);
      }
      
      setProgress((stepIndex + 1) / recorded_steps.length * 100);
    }
    
    // Close tab (commented out in actual code)
    // await chrome.tabs.remove(tabId);
  }
  
  setIsRunning(false);
  isRunningRef.current = false;
}
```

## Critical Dependencies
- **Chrome tabs API** - Tab creation/removal
- **Chrome runtime** - Message passing to content scripts
- **Mapping engine** - CSV field to step label resolution
- **Content script replay engine** - Executes individual steps

## Hidden Assumptions
1. **Sequential CSV rows** - No parallel execution
2. **Tab remains open** - Tab close commented out (debugging)
3. **Content script ready** - No explicit wait for injection completion
4. **Mapping bijective** - One CSV column → one step label
5. **Random delays human-like** - 1-3s between steps

## Stability Concerns
- **No retry logic** - Failed steps immediately fail test
- **Tab management fragile** - User can close tab manually
- **No timeout per step** - Infinite wait possible
- **Memory unbounded** - Long CSV runs accumulate logs

## Edge Cases
- **No CSV data** → Runs once with recorded values
- **Unmapped required field** → Skips input step (warning log)
- **CSV row has no matching labels** → Skips entire row
- **Network errors** → Tab open fails, entire run aborts

## Developer-Must-Know Notes
- `isRunningRef` prevents race conditions (state updates delayed)
- Random delays: `1000 + Math.random() * 2000` (1-3 seconds)
- Tab close commented out: `// await chrome.tabs.remove(tabId)` (for debugging)
- Mapping lookup bidirectional: CSV column → step label OR step label → CSV column
- Progress updates after EACH step, not per row