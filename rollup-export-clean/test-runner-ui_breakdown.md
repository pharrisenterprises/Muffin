# Test Runner UI - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Full-featured test execution interface displaying live progress, step-by-step console output, detailed results table, and control buttons (run/stop/clear). Main user-facing dashboard for automated test playback.

**Where it lives:** `src/pages/TestRunner.tsx` (600+ lines)

**Why it exists:** Provides visual feedback during test execution, allows manual intervention (stop test), and displays historical results for debugging failed test runs.

---

## Inputs
**Route State (from Dashboard navigation):**
```typescript
{
  from: '/dashboard',
  project_id: number  // Project to load and execute
}
```

**IndexedDB Project Schema:**
```typescript
{
  id: number,
  name: string,
  target_url: string,
  recorded_steps: Step[],      // Steps to replay
  csv_data: any[],              // CSV rows for data-driven testing
  parsed_fields: FieldMapping[] // CSV-to-field mappings
}
```

---

## Outputs
- **Live progress bar** (0-100%)
- **Scrolling console logs** (timestamped info/success/error/warning)
- **Step-by-step results table** (status, timestamp, error details)
- **Final summary metrics** (passed/failed counts, total duration)
- **Test run record** saved to IndexedDB

---

## Internal Architecture

### Component Hierarchy
```
TestRunner (600+ lines)
├── Header
│   ├── Project name
│   ├── Run button (primary action)
│   ├── Stop button (abort execution)
│   └── Clear button (reset state)
├── Progress Bar (0-100%)
├── TestSteps (Top Panel)
│   └── DataTable with columns:
│       - Step # (1-based index)
│       - Label (field name)
│       - Event (click/input/navigate)
│       - Bundle (XPath/selector)
│       - Value (input text)
│       - Status (pending/running/passed/failed/skipped)
│       - Timestamp (HH:mm:ss)
│       - Error (message on failure)
├── TestConsole (Bottom Left Panel)
│   └── Scrolling log entries:
│       - [HH:mm:ss] INFO: Starting test with 5 row(s)
│       - [HH:mm:ss] SUCCESS: ✓ Step 1: input on Username
│       - [HH:mm:ss] ERROR: ✗ Step 3 failed: Element not found
└── TestResults (Bottom Right Panel)
    └── Aggregate metrics:
        - Total steps
        - Passed steps (✓ green)
        - Failed steps (✗ red)
        - Duration (seconds)
        - Test status badge (success/failed)
```

### State Management
```typescript
const [currentProject, setCurrentProject] = useState<Project | null>(null);
const [isRunning, setIsRunning] = useState(false);
const isRunningRef = useRef(false);  // Prevents race conditions
const [progress, setProgress] = useState(0);
const [logs, setLogs] = useState<LogEntry[]>([]);
const [testSteps, setTestSteps] = useState<TestStepResult[]>([]);
```

### Key Functions

#### 1. Load Project
```typescript
useEffect(() => {
  const projectId = location.state?.project_id;
  if (!projectId) return;
  
  db.projects.get(projectId).then(project => {
    if (project) {
      setCurrentProject(project);
      // Initialize test steps from recorded_steps
      setTestSteps(project.recorded_steps.map((step, i) => ({
        index: i,
        label: step.label,
        event: step.event,
        bundle: step.bundle,
        value: step.value,
        status: 'pending',
        timestamp: '',
        error: ''
      })));
    }
  });
}, [location.state?.project_id]);
```

#### 2. Run Test (Main Orchestrator)
```typescript
async function runTest() {
  isRunningRef.current = true;
  setIsRunning(true);
  setLogs([]);  // Clear previous logs
  const startTime = Date.now();
  
  const { csv_data, recorded_steps, parsed_fields, target_url } = currentProject;
  
  // Build mapping lookup (CSV column → step label)
  const mappingLookup: Record<string, string> = {};
  parsed_fields?.forEach(field => {
    if (field.mapped) {
      mappingLookup[field.field_name] = field.inputvarfields;
    }
  });
  
  const rowsToProcess = csv_data?.length > 0 ? csv_data : [{}];
  addLog('info', `Starting test with ${rowsToProcess.length} row(s)`);
  
  // CSV row iteration
  for (let rowIndex = 0; rowIndex < rowsToProcess.length; rowIndex++) {
    if (!isRunningRef.current) break;  // Stop button check
    
    const row = rowsToProcess[rowIndex];
    addLog('info', `--- Row ${rowIndex + 1}/${rowsToProcess.length} ---`);
    
    // Open new tab
    const { tabId } = await chrome.runtime.sendMessage({
      action: 'openTab',
      url: target_url
    });
    
    await delay(2000);  // Wait for page load
    
    // Step execution loop
    for (let stepIndex = 0; stepIndex < recorded_steps.length; stepIndex++) {
      if (!isRunningRef.current) break;
      
      const step = recorded_steps[stepIndex];
      updateStepStatus(stepIndex, 'running', Date.now() - startTime);
      
      // Resolve CSV value for step
      let inputValue = row[step.label];  // Direct match
      if (!inputValue) {
        // Try mapping lookup
        const mappedKey = Object.keys(mappingLookup).find(
          k => mappingLookup[k] === step.label
        );
        if (mappedKey) inputValue = row[mappedKey];
      }
      
      // Skip input steps without CSV value
      if (step.event === 'input' && !inputValue && csv_data?.length > 0) {
        addLog('warning', `Skipping step ${stepIndex + 1} - no CSV value`);
        updateStepStatus(stepIndex, 'skipped', Date.now() - startTime);
        continue;
      }
      
      await delay(1000 + Math.random() * 2000);  // 1-3s random delay
      
      // Execute step via content script
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
        break;  // Fail fast
      }
      
      // Update progress
      const totalSteps = recorded_steps.length * rowsToProcess.length;
      const completedSteps = rowIndex * recorded_steps.length + stepIndex + 1;
      setProgress((completedSteps / totalSteps) * 100);
    }
  }
  
  // Finalize test run
  const duration = Date.now() - startTime;
  const passedCount = testSteps.filter(s => s.status === 'passed').length;
  const failedCount = testSteps.filter(s => s.status === 'failed').length;
  
  addLog('info', `Test completed in ${(duration / 1000).toFixed(1)}s`);
  addLog('success', `✓ ${passedCount} passed, ✗ ${failedCount} failed`);
  
  // Save test run to IndexedDB
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

#### 3. Stop Test
```typescript
function stopTest() {
  isRunningRef.current = false;  // Breaks loops in runTest()
  setIsRunning(false);
  addLog('warning', 'Test stopped by user');
}
```

#### 4. Clear Results
```typescript
function clearResults() {
  setLogs([]);
  setProgress(0);
  setTestSteps(prev => prev.map(step => ({
    ...step,
    status: 'pending',
    timestamp: '',
    error: ''
  })));
}
```

#### 5. Add Log
```typescript
function addLog(level: 'info' | 'success' | 'error' | 'warning', message: string) {
  const timestamp = format(new Date(), 'HH:mm:ss');
  setLogs(prev => [...prev, { timestamp, level, message }]);
}
```

#### 6. Update Step Status
```typescript
function updateStepStatus(index: number, status: string, elapsedTime: number, error?: string) {
  const timestamp = format(new Date(), 'HH:mm:ss');
  setTestSteps(prev => prev.map((step, i) => 
    i === index
      ? { ...step, status, timestamp, error: error || '' }
      : step
  ));
}
```

---

## Critical Dependencies
**Upstream:**
- **Dashboard** - Navigates to TestRunner with `project_id` in route state
- **IndexedDB** - Loads project data (recorded_steps, csv_data, target_url)

**Downstream:**
- **Chrome tabs API** - Tab management (open/close)
- **Chrome runtime** - Message passing to content scripts
- **Content script replayer** - Executes individual steps
- **Test Run Repository** - Persists execution history
- **date-fns** - Timestamp formatting (HH:mm:ss)

**UI Components:**
- **TestSteps** - DataTable component (shadcn/ui)
- **TestConsole** - Scrollable log panel (custom)
- **TestResults** - Metrics summary panel (custom)
- **Progress** - Progress bar (shadcn/ui)
- **Button** - Run/Stop/Clear actions (shadcn/ui)
- **Badge** - Status indicators (shadcn/ui)

---

## Hidden Assumptions
1. **isRunningRef pattern** - Prevents race conditions (state updates delayed in React)
2. **Single test at once** - No concurrent execution support
3. **Tab persistence** - Tab close commented out for debugging
4. **No resume capability** - Must restart from beginning after stop
5. **Memory unbounded** - Logs accumulate (no pruning for large CSV runs)
6. **Fail-fast on error** - First failed step stops row (doesn't continue)
7. **No auto-scroll in console** - User must manually scroll to see latest logs

---

## Stability Concerns

### High-Risk Patterns
1. **Race condition without isRunningRef**
   ```typescript
   // BAD: setIsRunning(false) delayed by React
   if (isRunning) continue;  // May not reflect stop button click
   
   // GOOD: useRef for immediate updates
   if (!isRunningRef.current) break;
   ```

2. **Memory exhaustion on large CSV**
   ```typescript
   // 10,000 rows × 10 steps × 5 logs each = 500,000 logs
   setLogs(prev => [...prev, newLog]);  // Unbounded growth
   ```

3. **No timeout per step**
   ```typescript
   await chrome.tabs.sendMessage(tabId, { type: 'runStep', ... });
   // If content script hangs, test execution blocked indefinitely
   ```

4. **Tab management fragile**
   ```typescript
   // Tab close commented out
   // await chrome.tabs.remove(tabId);
   // Multiple tests leave tabs open → Memory leak
   ```

### Failure Modes
- **Content script not injected** - sendMessage throws, test aborts
- **Tab closed manually** - User closes tab, messages fail
- **Network errors** - Page doesn't load, steps fail
- **UI lag** - Large log arrays cause render slowdowns

---

## Edge Cases

### Input Variations
1. **No project_id in route state**
   ```typescript
   const projectId = location.state?.project_id;  // undefined
   // Component renders empty, user must navigate from Dashboard
   ```

2. **Project not found in IndexedDB**
   ```typescript
   const project = await db.projects.get(projectId);  // undefined
   // currentProject stays null, buttons disabled
   ```

3. **No recorded steps**
   ```typescript
   recorded_steps = [];
   // Test runs but logs "0 steps to execute"
   ```

4. **No CSV data**
   ```typescript
   csv_data = [];
   // Runs once with recorded step values (rowsToProcess = [{}])
   ```

5. **Stop button clicked mid-execution**
   ```typescript
   isRunningRef.current = false;  // Set by stopTest()
   // Loops break on next iteration check, partial results displayed
   ```

---

## Developer-Must-Know Notes

### Common Issues
1. **Q: Why doesn't stop button work immediately?**
   - **A:** Must use `isRunningRef.current` instead of `isRunning` state (React batches updates)

2. **Q: Why are logs not scrolling to bottom?**
   - **A:** No auto-scroll implemented, user must manually scroll in TestConsole

3. **Q: How do I debug failed steps?**
   - **A:** Check TestSteps table → Error column shows exception message

4. **Q: Why is memory usage growing?**
   - **A:** Logs array unbounded, large CSV runs accumulate 100K+ entries

### Performance Tips
- **Logs unbounded** - Consider pruning to last 1000 entries
- **Step updates** - Each `setTestSteps` triggers re-render (OK for <100 steps)
- **Progress calculation** - Computed on each step (lightweight)
- **No virtualization** - TestSteps table renders all rows (laggy >1000 steps)

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **UI-011** | Critical | TestRunner IS the primary user feedback dashboard |
| **ENG-008** | Critical | Hosts PlaybackEngine core loop (runTest function) |
| **TST-009** | High | Displays validation results in TestSteps table |
| **UI-010** | High | Real-time progress bar and console logging |

### Specification Mapping
- **G4** (Playback Engine) - Executes test steps via runTest()
- **B2** (CSV Integration) - Row iteration and value mapping
- **H2** (User Experience) - Live feedback (progress, console, results)
- **D2** (Project Management) - Loads project from IndexedDB

### Evidence References
- Code: `src/pages/TestRunner.tsx` lines 1-600 (entire component)
- UI: Screenshots showing progress bar, console, step table
- Test: Manual execution with 10-row CSV, verified logs and results

### Integration Risks
1. **Memory Growth:** Large CSV runs exhaust browser memory (log accumulation)
2. **No Timeout:** Hung steps block execution indefinitely
3. **Tab Leaks:** Commented tab close causes memory accumulation
4. **Race Conditions:** Must use isRunningRef pattern (state updates delayed)

---

## Recommendations for Future Enhancement

### 1. Auto-Scroll Console
```typescript
const consoleRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (consoleRef.current) {
    consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }
}, [logs]);
```

### 2. Prune Logs
```typescript
function addLog(level: string, message: string) {
  setLogs(prev => {
    const updated = [...prev, { timestamp, level, message }];
    return updated.slice(-1000);  // Keep last 1000 entries
  });
}
```

### 3. Add Step Timeout
```typescript
const executeStep = (tabId, step) => {
  return Promise.race([
    chrome.tabs.sendMessage(tabId, { type: 'runStep', data: step }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Step timeout')), 5000))
  ]);
};
```

### 4. Virtualize Step Table
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// Only render visible rows (handles 10K+ steps)
```

### 5. Export Logs
```typescript
function exportLogs() {
  const csv = logs.map(log => `${log.timestamp},${log.level},${log.message}`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `test-logs-${Date.now()}.csv`;
  a.click();
}
```

---

## Related Components
- **Dashboard UI** (`dashboard-ui_breakdown.md`) - Navigates to TestRunner
- **Test Orchestrator** (`test-orchestrator_breakdown.md`) - runTest() function logic
- **Test Logger** (`test-logger_breakdown.md`) - addLog() implementation
- **Test Run Repository** (`test-run-repository_breakdown.md`) - Persists execution history
- **Content Script Replayer** (`content-script-replayer_breakdown.md`) - Executes steps
- **TestSteps** (child component) - Step-by-step results table
- **TestConsole** (child component) - Scrolling log panel
- **TestResults** (child component) - Aggregate metrics summary
