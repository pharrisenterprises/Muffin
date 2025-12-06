# Test Logger Breakdown

## Purpose
**What it does:** Centralized logging system for test execution with timestamp formatting and log level classification.

**Where it lives:** `addLog()` function and `logs` state in `src/pages/TestRunner.tsx`

**Why it exists:** Provides structured, timestamped logging for debugging test failures and tracking execution flow.

## Inputs
```typescript
addLog(level: 'info' | 'success' | 'error' | 'warning', message: string)
```

## Outputs
```typescript
LogEntry {
  timestamp: string,  // 'HH:mm:ss' format
  level: 'info' | 'success' | 'error' | 'warning',
  message: string
}
```

## Internal Architecture
```typescript
const [logs, setLogs] = useState<LogEntry[]>([]);

const addLog = (level: LogEntry['level'], message: string) => {
  const newLog: LogEntry = {
    timestamp: format(new Date(), 'HH:mm:ss'),
    level,
    message
  };
  setLogs(prev => [...prev, newLog]);
};
```

**Usage Examples:**
```typescript
addLog('info', 'Starting test execution');
addLog('success', '✓ Step 5 completed');
addLog('error', 'Element not found: #submit-btn');
addLog('warning', 'Skipping step - no CSV value');
```

## Critical Dependencies
- **date-fns** - `format()` for timestamp
- **TestConsole component** - Displays logs with color coding

## Hidden Assumptions
1. **Logs never cleared** - Grows unbounded during long tests
2. **No log persistence** - Lost on page refresh
3. **No log levels filtering** - All levels always shown
4. **Synchronous appending** - No async delays

## Developer-Must-Know Notes
- Color coding: info=blue, success=green, error=red, warning=yellow
- Timestamp shows wall clock time (not elapsed time)
- Logs displayed in `<TestConsole>` component with auto-scroll
- No log export feature (copy-paste only)
- Each log is separate entry (no log merging/grouping)