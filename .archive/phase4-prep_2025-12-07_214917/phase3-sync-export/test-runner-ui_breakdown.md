# Test Runner UI Breakdown

## Purpose
**What it does:** Test execution interface displaying real-time progress, step status, console logs, and test results.

**Where it lives:** `src/pages/TestRunner.tsx` (600+ lines)

**Why it exists:** User-facing UI for test playback—starts execution, monitors progress, displays pass/fail metrics, and shows detailed logs.

## Inputs
- **URL param:** `?project=<id>`
- **Project data:** recorded_steps, csv_data, parsed_fields, target_url
- **User action:** "Run Test" button click

## Outputs
- Real-time step status updates (pending → running → passed/failed)
- Console logs with timestamps
- Test results summary (passed/failed counts, duration)
- Test run history from IndexedDB

## Internal Architecture
**Key Components:**
- `<TestSteps>` - Step list with status indicators
- `<TestConsole>` - Real-time log output
- `<TestResults>` - Final test summary
- Progress bar - X/Y steps completed

**State Management:**
```typescript
const [testSteps, setTestSteps] = useState<TestStep[]>([]);
const [isRunning, setIsRunning] = useState(false);
const [progress, setProgress] = useState(0);
const [logs, setLogs] = useState<LogEntry[]>([]);
const isRunningRef = useRef(false);  // Prevent race conditions
```

**Execution Flow (see test-orchestrator breakdown for details):**
1. Click "Run Test" → `runTest()` function
2. Initialize steps array from project.recorded_steps
3. For each CSV row (or single run if no CSV):
   a. Open new tab with target_url
   b. Inject content script
   c. For each step:
      - Send `runStep` message to content script
      - Wait for response (success/fail)
      - Update step status
      - Add log entry
   d. Close tab
4. Display final results

## Critical Dependencies
- **TestSteps, TestConsole, TestResults** - Child components
- **Chrome tabs API** - Tab management
- **Chrome runtime** - Message passing to content scripts
- **date-fns** - Timestamp formatting

## Hidden Assumptions
1. **Sequential execution** - Steps run one at a time
2. **Single tab at a time** - No parallel test execution
3. **No pause/resume** - Must complete or stop entirely
4. **Logs cleared on new run** - Previous logs lost

## Stability Concerns
- **No auto-scroll in console** - User must manually scroll to see latest logs
- **Memory leak with long runs** - Logs array grows unbounded
- **No test run persistence during execution** - Progress lost on page refresh
- **Race condition on stop** - `isRunningRef` pattern prevents but fragile

## Developer-Must-Know Notes
- Progress bar shows percentage: `(stepsCompleted / totalSteps) * 100`
- Status colors: pending=gray, running=blue, passed=green, failed=red
- Stop button sets `isRunningRef.current = false` (checked between steps)
- Test history loaded from `db.testruns` via background message
- Console logs format: `[HH:mm:ss] LEVEL: message`