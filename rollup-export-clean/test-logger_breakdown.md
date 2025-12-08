# Test Logger - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Centralized logging system for test execution with timestamp formatting, log level classification, and color-coded console output.

**Where it lives:** `addLog()` function and `logs` state in `src/pages/TestRunner.tsx`

**Why it exists:** Provides structured, timestamped logging for debugging test failures, tracking execution flow, and providing real-time feedback to users during test playback.

---

## Inputs
```typescript
addLog(
  level: 'info' | 'success' | 'error' | 'warning',
  message: string
): void
```

**Usage Examples:**
```typescript
addLog('info', 'Starting test execution for project: Login Test');
addLog('success', '✓ Step 5 completed: Click Submit button');
addLog('error', 'Element not found: #submit-btn (XPath: /html/body/form/button)');
addLog('warning', 'Skipping step 3 - no CSV value for "username" field');
```

---

## Outputs
```typescript
LogEntry {
  timestamp: string,    // 'HH:mm:ss' format (e.g., '14:23:45')
  level: 'info' | 'success' | 'error' | 'warning',
  message: string
}
```

**Log Array:**
- Appended to `logs` state array in TestRunner
- Displayed in `<TestConsole>` component
- Color-coded by level (info=blue, success=green, error=red, warning=yellow)

---

## Internal Architecture

### State Management
```typescript
// TestRunner.tsx
const [logs, setLogs] = useState<LogEntry[]>([]);

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
}
```

### Implementation
```typescript
import { format } from 'date-fns';

const addLog = (level: LogEntry['level'], message: string) => {
  const newLog: LogEntry = {
    timestamp: format(new Date(), 'HH:mm:ss'),  // Wall clock time
    level,
    message
  };
  
  setLogs((prev) => [...prev, newLog]);  // Append to array
};
```

### Display Component (TestConsole)
```typescript
// TestConsole.tsx (hypothetical)
function TestConsole({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="h-64 overflow-y-auto bg-gray-900 text-white p-4 font-mono">
      {logs.map((log, index) => (
        <div key={index} className={getColorClass(log.level)}>
          <span className="text-gray-400">[{log.timestamp}]</span>{' '}
          <span className="font-bold">{log.level.toUpperCase()}:</span>{' '}
          {log.message}
        </div>
      ))}
    </div>
  );
}

function getColorClass(level: LogEntry['level']): string {
  switch (level) {
    case 'info': return 'text-blue-400';
    case 'success': return 'text-green-400';
    case 'error': return 'text-red-400';
    case 'warning': return 'text-yellow-400';
    default: return 'text-gray-300';
  }
}
```

---

## Critical Dependencies
**Upstream:**
- **TestRunner.tsx** - Main consumer, logs all test events
- **Test Orchestrator** - Calls addLog() during execution loop

**Downstream:**
- **date-fns** - `format()` function for timestamp formatting
- **TestConsole component** - Displays logs with color coding

**External:**
- **date-fns** (npm) - Date formatting library

---

## Hidden Assumptions
1. **Logs never cleared automatically** - Grows unbounded during long tests
2. **No log persistence** - Lost on page refresh or navigation
3. **No log level filtering** - All levels always shown (no hide errors/warnings)
4. **Synchronous appending** - No async delays, immediate state update
5. **Wall clock time** - Timestamp shows current time, not elapsed time
6. **Single test run** - Logs cleared only on new test start (manual clear)
7. **Memory unbounded** - No log pruning for long-running tests

---

## Stability Concerns

### High-Risk Patterns
1. **Unbounded log growth**
   ```typescript
   // 10,000 step test with detailed logging
   logs.length === 50,000;  // 5 logs per step
   // May cause memory pressure, UI slowdown
   ```

2. **No log persistence**
   ```typescript
   // User refreshes page mid-test
   // All logs lost (no export, no backup)
   ```

3. **No filtering UI**
   ```typescript
   // User wants to see only errors
   // Must scroll through 10,000 info messages
   ```

4. **Timestamp precision**
   ```typescript
   // Rapid logging within same second
   // Multiple logs with same timestamp (HH:mm:ss only)
   ```

### Failure Modes
- **Memory exhaustion** - 100,000+ logs may crash browser tab
- **UI lag** - Large log array causes slow renders
- **Log loss** - Page refresh/navigation loses all logs
- **No export** - Cannot save logs to file (manual copy-paste only)

---

## Edge Cases

### Input Variations
1. **Empty message**
   ```typescript
   addLog('info', '');  // Valid but useless
   ```

2. **Very long message**
   ```typescript
   addLog('error', stackTrace.repeat(10));  // 10KB message
   // May break UI layout
   ```

3. **HTML in message**
   ```typescript
   addLog('warning', '<script>alert("xss")</script>');
   // Displayed as plain text (safe, not rendered)
   ```

4. **Rapid logging**
   ```typescript
   for (let i = 0; i < 1000; i++) {
     addLog('info', `Step ${i}`);
   }
   // All batched by React, final render shows all
   ```

5. **Log during unmount**
   ```typescript
   // User navigates away mid-test
   addLog('info', 'Step complete');  // Warning: state update on unmounted component
   ```

---

## Developer-Must-Know Notes
- **Color coding:** info=blue, success=green, error=red, warning=yellow
- **Timestamp format:** HH:mm:ss (wall clock, not elapsed)
- **Auto-scroll:** TestConsole component should scroll to bottom on new log
- **No export feature:** Users must copy-paste from console
- **Log clearing:** Only on new test run (setLogs([]) in runTest())
- **Performance:** 1000+ logs may slow UI (consider virtualization)
- **No filtering:** All log levels always visible (feature gap)
- **Wall clock time:** Doesn't show elapsed time (0:00:05 format unavailable)

**Common Usage Patterns:**
```typescript
// Test start
addLog('info', 'Starting test execution');

// Row iteration
addLog('info', `Processing CSV row ${rowIndex + 1} of ${totalRows}`);

// Step execution
addLog('info', `Executing step ${stepIndex + 1}: ${step.event} on ${step.label}`);

// Success
addLog('success', `✓ Step ${stepIndex + 1} completed in ${duration}ms`);

// Error
addLog('error', `✗ Step ${stepIndex + 1} failed: ${error.message}`);

// Warning
addLog('warning', `Skipping step ${stepIndex + 1} - no CSV value for "${step.label}"`);

// Test complete
addLog('success', `Test completed: ${passedSteps} passed, ${failedSteps} failed`);
```

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **ENG-008** | High | PlaybackEngine logs all step execution events via TestLogger |
| **TST-009** | High | Test result validation relies on logged success/error messages |
| **UI-011** | Medium | Real-time feedback during test execution |

### Specification Mapping
- **G4** (Playback Engine) - Logs step execution progress
- **G5** (Error Handling) - Logs error details for debugging
- **H2** (User Experience) - Real-time console feedback improves observability

### Evidence References
- Code: `src/pages/TestRunner.tsx` lines 50-70 (addLog function)
- Code: `src/components/TestConsole.tsx` (log display component)
- UI: Screenshot of test execution showing color-coded console logs

### Integration Risks
1. **Memory Growth:** Large tests (1000+ steps × 5 logs/step) may exhaust memory
2. **UI Performance:** React re-renders on every log append (consider throttling)
3. **No Persistence:** Logs lost on navigation (export feature needed)
4. **No Filtering:** All log levels shown (UX gap for debugging)

---

## Recommendations for Future Enhancement
1. **Add log export:**
   ```typescript
   function exportLogs() {
     const logText = logs.map(l => `[${l.timestamp}] ${l.level}: ${l.message}`).join('\n');
     downloadFile('test-logs.txt', logText);
   }
   ```

2. **Implement log filtering:**
   ```typescript
   const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set(['info', 'success', 'error', 'warning']));
   const filteredLogs = logs.filter(log => levelFilter.has(log.level));
   ```

3. **Add elapsed time:**
   ```typescript
   const startTime = useRef(Date.now());
   const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
   timestamp: `${elapsed}s`;  // "5s" instead of "14:23:45"
   ```

4. **Virtualize log display:**
   ```typescript
   import { FixedSizeList } from 'react-window';
   // Render only visible logs for 10,000+ entries
   ```

---

## Related Components
- **Test Orchestrator** (`test-orchestrator_breakdown.md`) - Primary caller of addLog()
- **Test Runner UI** (`test-runner-ui_breakdown.md`) - Hosts TestLogger state and TestConsole component
- **Playback Engine** (Phase 3 spec G4) - Logs step execution events
- **Step Executor** (`step-executor_breakdown.md`) - Logs individual step success/failure
