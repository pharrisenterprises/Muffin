# FND-009: CONDITIONALCLICKRESULT INTERFACE SPECIFICATION

> **Build Card:** FND-009  
> **Category:** Foundation / Architecture  
> **Dependencies:** FND-004 (Type definitions file must exist)  
> **Risk Level:** Low  
> **Estimated Lines:** ~400

---

## 1. PURPOSE

This specification provides detailed documentation and implementation guidance for the `ConditionalClickResult` interface. The ConditionalClickResult interface represents the outcome of a conditional click operation, containing:

1. **Success status** - Whether the operation completed successfully
2. **Termination reason** - Why the polling stopped (timeout, completed, cancelled, error)
3. **Statistics** - Click count, elapsed time, matches found
4. **Error details** - Error message if something went wrong

This interface is essential for:
- Providing feedback to users about conditional click operations
- Logging and debugging automation runs
- Making decisions about whether to proceed or retry

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Type Definitions | `src/types/vision.ts` | ConditionalClickResult interface |
| Data Layer Spec | `/future-spec/05_data-layer.md` | Result structure |
| Feature Specs | `/future-spec/03_feature-specs.md` | Conditional click behavior |
| FND-008 | ConditionalConfig | Configuration that produces results |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/types/vision.ts` | VERIFY | ConditionalClickResult already defined in FND-004 |
| `src/lib/conditionalResultUtils.ts` | CREATE | Utility functions for ConditionalClickResult |

### Exports from conditionalResultUtils.ts

| Export Name | Type | Description |
|-------------|------|-------------|
| `createSuccessResult` | function | Factory for successful results |
| `createTimeoutResult` | function | Factory for timeout results |
| `createErrorResult` | function | Factory for error results |
| `createCancelledResult` | function | Factory for cancelled results |
| `isSuccessfulResult` | function | Type guard for success |
| `resultToString` | function | Human-readable summary |
| `resultToLogEntry` | function | Structured log format |

---

## 4. DETAILED SPECIFICATION

### 4.1 Interface Definition (Reference)

The ConditionalClickResult interface from `src/types/vision.ts`:

```typescript
export interface ConditionalClickResult {
  /** Whether the operation completed successfully */
  success: boolean;

  /** How the operation ended */
  reason: 'timeout' | 'completed' | 'cancelled' | 'error';

  /** Number of clicks performed */
  clickCount: number;

  /** Total milliseconds spent polling */
  elapsedMs: number;

  /** Text matches found during operation */
  matchesFound: string[];

  /** Error message if reason is 'error' */
  errorMessage?: string;
}
```

### 4.2 Property Specifications

#### 4.2.1 success

| Attribute | Value |
|-----------|-------|
| Type | `boolean` |
| Required | Yes |

**Description:**
Indicates whether the conditional click operation completed successfully. Success is defined as:
- At least one match was found and clicked, OR
- Timeout was reached without errors (graceful completion)

**Success Conditions:**

| Scenario | success | reason |
|----------|---------|--------|
| Found and clicked buttons, timeout reached | `true` | `'completed'` or `'timeout'` |
| No matches found, timeout reached | `true` | `'timeout'` |
| User cancelled operation | `false` | `'cancelled'` |
| Error during scanning/clicking | `false` | `'error'` |

**Note:** A timeout with zero clicks is still considered "success" because the operation completed as designed—there simply were no approval buttons to click.

#### 4.2.2 reason

| Attribute | Value |
|-----------|-------|
| Type | `'timeout' \| 'completed' \| 'cancelled' \| 'error'` |
| Required | Yes |

**Description:**
Explains why the polling operation stopped.

**Reason Values:**

| Value | Description | success |
|-------|-------------|---------|
| `'timeout'` | Timeout reached after last click | `true` |
| `'completed'` | All expected matches processed | `true` |
| `'cancelled'` | User or system cancelled operation | `false` |
| `'error'` | Exception occurred during operation | `false` |

**Distinction Between timeout and completed:**

- `'timeout'`: Polling stopped because `timeoutSeconds` elapsed since last click
- `'completed'`: Rare - used when a known finite set of matches is expected and all were found

In practice, most conditional click operations end with `'timeout'` because approval buttons can appear indefinitely.

#### 4.2.3 clickCount

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Minimum | `0` |

**Description:**
The total number of clicks performed during the polling session. Each time a search term is matched and clicked, this counter increments.

**Interpretation:**

| Value | Meaning |
|-------|---------|
| 0 | No approval buttons appeared during polling |
| 1-5 | Typical for short automation sessions |
| 10+ | Extended session with many approvals |
| 100+ | Very long session or rapid approval sequence |

**Use Cases:**
- Logging: "Clicked 12 approval buttons"
- Validation: Ensure expected number of clicks occurred
- Debugging: Identify unexpected click counts

#### 4.2.4 elapsedMs

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Minimum | `0` |
| Unit | Milliseconds |

**Description:**
Total wall-clock time from start of polling to completion. Includes all scanning, clicking, and waiting time.

**Calculation:**
```typescript
const startTime = Date.now();
// ... polling loop ...
result.elapsedMs = Date.now() - startTime;
```

**Typical Values:**

| Duration | Scenario |
|----------|----------|
| < 5,000ms | Quick confirmation, immediate timeout |
| 5,000-60,000ms | Normal approval handling |
| 60,000-300,000ms | Extended AI processing |
| > 300,000ms | Very long operations |

#### 4.2.5 matchesFound

| Attribute | Value |
|-----------|-------|
| Type | `string[]` |
| Required | Yes |

**Description:**
Array of unique text strings that were matched and clicked during the operation. Useful for:
- Verifying correct buttons were clicked
- Debugging unexpected behavior
- Logging for audit trails

**Characteristics:**
- Contains unique values only (no duplicates)
- Preserves order of first occurrence
- Contains the actual OCR text, which may differ from search terms

**Example:**
```typescript
// Search terms: ['Allow', 'Keep']
// Actual OCR results clicked:
matchesFound: ['Allow', 'Allow for this chat', 'Keep changes']
```

#### 4.2.6 errorMessage (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `string` |
| Required | Only when `reason: 'error'` |

**Description:**
Human-readable error message explaining what went wrong. Only present when `reason` is `'error'`.

**Common Error Messages:**

| Error | Message |
|-------|---------|
| OCR initialization failed | "Failed to initialize Tesseract worker" |
| Screenshot capture failed | "Could not capture screenshot: permission denied" |
| Click execution failed | "Click at (x, y) did not register" |
| Invalid configuration | "No search terms provided" |

---

### 4.3 Utility Functions

Create `src/lib/conditionalResultUtils.ts`:

```typescript
/**
 * @fileoverview Utility functions for ConditionalClickResult operations
 * @module lib/conditionalResultUtils
 */

import { ConditionalClickResult } from '@/types';

/**
 * Creates a successful completion result
 * @param clickCount - Number of clicks performed
 * @param elapsedMs - Time spent polling
 * @param matchesFound - Unique matches that were clicked
 * @returns ConditionalClickResult with success=true, reason='completed'
 */
export function createSuccessResult(
  clickCount: number,
  elapsedMs: number,
  matchesFound: string[]
): ConditionalClickResult {
  return {
    success: true,
    reason: 'completed',
    clickCount,
    elapsedMs,
    matchesFound: [...new Set(matchesFound)], // Deduplicate
  };
}

/**
 * Creates a timeout result (still considered successful)
 * @param clickCount - Number of clicks performed before timeout
 * @param elapsedMs - Time spent polling
 * @param matchesFound - Unique matches that were clicked
 * @returns ConditionalClickResult with success=true, reason='timeout'
 */
export function createTimeoutResult(
  clickCount: number,
  elapsedMs: number,
  matchesFound: string[]
): ConditionalClickResult {
  return {
    success: true,
    reason: 'timeout',
    clickCount,
    elapsedMs,
    matchesFound: [...new Set(matchesFound)],
  };
}

/**
 * Creates an error result
 * @param errorMessage - Description of what went wrong
 * @param elapsedMs - Time spent before error occurred
 * @param clickCount - Clicks performed before error (default 0)
 * @param matchesFound - Matches found before error (default empty)
 * @returns ConditionalClickResult with success=false, reason='error'
 */
export function createErrorResult(
  errorMessage: string,
  elapsedMs: number,
  clickCount: number = 0,
  matchesFound: string[] = []
): ConditionalClickResult {
  return {
    success: false,
    reason: 'error',
    clickCount,
    elapsedMs,
    matchesFound: [...new Set(matchesFound)],
    errorMessage,
  };
}

/**
 * Creates a cancelled result
 * @param elapsedMs - Time spent before cancellation
 * @param clickCount - Clicks performed before cancellation
 * @param matchesFound - Matches found before cancellation
 * @returns ConditionalClickResult with success=false, reason='cancelled'
 */
export function createCancelledResult(
  elapsedMs: number,
  clickCount: number = 0,
  matchesFound: string[] = []
): ConditionalClickResult {
  return {
    success: false,
    reason: 'cancelled',
    clickCount,
    elapsedMs,
    matchesFound: [...new Set(matchesFound)],
  };
}

/**
 * Type guard to check if result represents a successful operation
 * @param result - Result to check
 * @returns True if operation was successful
 */
export function isSuccessfulResult(result: ConditionalClickResult): boolean {
  return result.success === true;
}

/**
 * Type guard to check if result ended due to timeout
 * @param result - Result to check
 * @returns True if operation ended due to timeout
 */
export function isTimeoutResult(result: ConditionalClickResult): boolean {
  return result.reason === 'timeout';
}

/**
 * Type guard to check if result has an error
 * @param result - Result to check
 * @returns True if operation ended with error
 */
export function isErrorResult(
  result: ConditionalClickResult
): result is ConditionalClickResult & { errorMessage: string } {
  return result.reason === 'error' && result.errorMessage !== undefined;
}

/**
 * Checks if any clicks were performed
 * @param result - Result to check
 * @returns True if at least one click occurred
 */
export function hasClicks(result: ConditionalClickResult): boolean {
  return result.clickCount > 0;
}

/**
 * Formats elapsed time as human-readable string
 * @param elapsedMs - Milliseconds
 * @returns Formatted string (e.g., "2m 30s" or "1.5s")
 */
export function formatElapsedTime(elapsedMs: number): string {
  if (elapsedMs < 1000) {
    return `${elapsedMs}ms`;
  }
  
  const seconds = elapsedMs / 1000;
  
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Converts result to human-readable summary string
 * @param result - Result to summarize
 * @returns Human-readable summary
 */
export function resultToString(result: ConditionalClickResult): string {
  const elapsed = formatElapsedTime(result.elapsedMs);
  const clickWord = result.clickCount === 1 ? 'click' : 'clicks';
  
  switch (result.reason) {
    case 'completed':
      return `Completed: ${result.clickCount} ${clickWord} in ${elapsed}`;
    
    case 'timeout':
      if (result.clickCount === 0) {
        return `Timeout after ${elapsed}: no matches found`;
      }
      return `Timeout after ${elapsed}: ${result.clickCount} ${clickWord}`;
    
    case 'cancelled':
      return `Cancelled after ${elapsed}: ${result.clickCount} ${clickWord}`;
    
    case 'error':
      return `Error after ${elapsed}: ${result.errorMessage}`;
    
    default:
      return `Unknown result: ${JSON.stringify(result)}`;
  }
}

/**
 * Converts result to structured log entry
 * @param result - Result to convert
 * @param stepId - Optional step ID for context
 * @returns Structured object for logging
 */
export function resultToLogEntry(
  result: ConditionalClickResult,
  stepId?: string
): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    type: 'conditional_click_result',
    stepId: stepId ?? null,
    success: result.success,
    reason: result.reason,
    clickCount: result.clickCount,
    elapsedMs: result.elapsedMs,
    elapsedFormatted: formatElapsedTime(result.elapsedMs),
    matchesFound: result.matchesFound,
    matchCount: result.matchesFound.length,
    errorMessage: result.errorMessage ?? null,
  };
}

/**
 * Combines multiple results into an aggregate summary
 * Useful when running multiple conditional click steps
 * @param results - Array of results to combine
 * @returns Aggregate statistics
 */
export function aggregateResults(results: ConditionalClickResult[]): {
  totalClicks: number;
  totalElapsedMs: number;
  successCount: number;
  errorCount: number;
  allMatchesFound: string[];
} {
  const allMatches = new Set<string>();
  
  let totalClicks = 0;
  let totalElapsedMs = 0;
  let successCount = 0;
  let errorCount = 0;
  
  for (const result of results) {
    totalClicks += result.clickCount;
    totalElapsedMs += result.elapsedMs;
    
    if (result.success) {
      successCount++;
    }
    
    if (result.reason === 'error') {
      errorCount++;
    }
    
    result.matchesFound.forEach((m) => allMatches.add(m));
  }
  
  return {
    totalClicks,
    totalElapsedMs,
    successCount,
    errorCount,
    allMatchesFound: Array.from(allMatches),
  };
}

/**
 * Creates an empty/initial result for tracking during polling
 * @returns Initial result state
 */
export function createInitialResult(): Omit<ConditionalClickResult, 'reason'> & {
  matchesSet: Set<string>;
} {
  return {
    success: false,
    clickCount: 0,
    elapsedMs: 0,
    matchesFound: [],
    matchesSet: new Set<string>(),
  };
}

/**
 * Tracks a click during polling and updates running totals
 * @param tracker - Current tracking state
 * @param matchedText - Text that was matched and clicked
 */
export function trackClick(
  tracker: ReturnType<typeof createInitialResult>,
  matchedText: string
): void {
  tracker.clickCount++;
  tracker.matchesSet.add(matchedText);
  tracker.matchesFound = Array.from(tracker.matchesSet);
}

/**
 * Finalizes tracking into a complete result
 * @param tracker - Tracking state
 * @param reason - How the operation ended
 * @param elapsedMs - Total elapsed time
 * @param errorMessage - Optional error message
 * @returns Complete ConditionalClickResult
 */
export function finalizeResult(
  tracker: ReturnType<typeof createInitialResult>,
  reason: ConditionalClickResult['reason'],
  elapsedMs: number,
  errorMessage?: string
): ConditionalClickResult {
  const success = reason === 'completed' || reason === 'timeout';
  
  return {
    success,
    reason,
    clickCount: tracker.clickCount,
    elapsedMs,
    matchesFound: tracker.matchesFound,
    ...(errorMessage ? { errorMessage } : {}),
  };
}
```

---

## 5. CODE EXAMPLES

### 5.1 Creating Results

```typescript
import {
  createSuccessResult,
  createTimeoutResult,
  createErrorResult,
  resultToString,
} from '@/lib/conditionalResultUtils';

// Successful completion
const success = createSuccessResult(5, 45000, ['Allow', 'Keep']);
console.log(resultToString(success));
// "Completed: 5 clicks in 45.0s"

// Timeout (also successful)
const timeout = createTimeoutResult(3, 120000, ['Allow']);
console.log(resultToString(timeout));
// "Timeout after 2m: 3 clicks"

// Error
const error = createErrorResult('Screenshot capture failed', 5000);
console.log(resultToString(error));
// "Error after 5.0s: Screenshot capture failed"
```

### 5.2 Checking Results

```typescript
import {
  isSuccessfulResult,
  isErrorResult,
  hasClicks,
} from '@/lib/conditionalResultUtils';

function handleConditionalResult(result: ConditionalClickResult) {
  if (isErrorResult(result)) {
    console.error('Operation failed:', result.errorMessage);
    return;
  }
  
  if (isSuccessfulResult(result)) {
    if (hasClicks(result)) {
      console.log(`Clicked ${result.clickCount} approval buttons`);
    } else {
      console.log('No approval buttons appeared');
    }
  }
}
```

### 5.3 Tracking During Polling

```typescript
import {
  createInitialResult,
  trackClick,
  finalizeResult,
} from '@/lib/conditionalResultUtils';

async function executeConditionalClick(config: ConditionalConfig) {
  const tracker = createInitialResult();
  const startTime = Date.now();
  
  try {
    while (!shouldTimeout()) {
      const match = await findTextMatch(config.searchTerms);
      
      if (match) {
        await clickAt(match.x, match.y);
        trackClick(tracker, match.matchedText);
      }
      
      await sleep(config.pollIntervalMs);
    }
    
    return finalizeResult(tracker, 'timeout', Date.now() - startTime);
    
  } catch (error) {
    return finalizeResult(
      tracker,
      'error',
      Date.now() - startTime,
      error.message
    );
  }
}
```

### 5.4 Logging Results

```typescript
import { resultToLogEntry } from '@/lib/conditionalResultUtils';

const result = await executeConditionalClick(config);
const logEntry = resultToLogEntry(result, 'step-5');

console.log(JSON.stringify(logEntry, null, 2));
// {
//   "timestamp": "2025-12-01T15:30:00.000Z",
//   "type": "conditional_click_result",
//   "stepId": "step-5",
//   "success": true,
//   "reason": "timeout",
//   "clickCount": 3,
//   "elapsedMs": 120000,
//   "elapsedFormatted": "2m",
//   "matchesFound": ["Allow", "Keep"],
//   "matchCount": 2,
//   "errorMessage": null
// }
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** ConditionalClickResult interface exists in `src/types/vision.ts`
- [ ] **AC-2:** `src/lib/conditionalResultUtils.ts` is created with all utilities
- [ ] **AC-3:** `createSuccessResult()` creates valid success results
- [ ] **AC-4:** `createTimeoutResult()` creates valid timeout results
- [ ] **AC-5:** `createErrorResult()` includes error message
- [ ] **AC-6:** `isSuccessfulResult()` correctly identifies success
- [ ] **AC-7:** `resultToString()` produces readable output
- [ ] **AC-8:** `resultToLogEntry()` produces structured logs
- [ ] **AC-9:** Tracking functions correctly accumulate state
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **matchesFound must be unique** - Deduplicate before storing
2. **errorMessage only on error** - Only present when reason is 'error'
3. **Non-negative values** - clickCount and elapsedMs must be >= 0

### Patterns to Follow

1. **Factory functions** - Use create* functions for instantiation
2. **Type guards** - Use is* functions for type checking
3. **Immutable results** - Results should not be modified after creation

### Edge Cases

1. **Zero clicks** - Valid result, not an error
2. **Very long elapsed time** - Format appropriately (hours if needed)
3. **Empty matches array** - Valid for timeout with no matches

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file exists
ls -la src/lib/conditionalResultUtils.ts

# Run type check
npm run type-check

# Test result creation
npx ts-node -e "
  const { createTimeoutResult, resultToString } = require('./src/lib/conditionalResultUtils');
  const r = createTimeoutResult(3, 120000, ['Allow', 'Keep']);
  console.log(resultToString(r));
"
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove the utilities file
rm src/lib/conditionalResultUtils.ts

# Verify types still compile
npm run type-check
```

---

## 10. REFERENCES

- FND-004: Type Definitions File
- FND-008: ConditionalConfig Interface
- Feature Specs: `/future-spec/03_feature-specs.md`

---

*End of Specification FND-009*
