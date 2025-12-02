# ENG-007: CONDITIONAL CLICK POLLING SPECIFICATION

> **Build Card:** ENG-007  
> **Category:** Engine / Core  
> **Dependencies:** ENG-006 (Coordinate clicking), FND-008 (ConditionalConfig)  
> **Risk Level:** Medium  
> **Estimated Lines:** ~460

---

## 1. PURPOSE

This specification implements the conditional click polling system for the VisionEngine. This is the core feature for Claude.ai automation - continuously scanning for approval buttons and clicking them when found:

1. **Polling loop** - Repeatedly scan viewport at configured interval
2. **Multi-term matching** - Search for multiple terms (e.g., 'Allow', 'Keep')
3. **Timeout management** - Stop after configurable timeout
4. **Click tracking** - Count clicks and track matched terms
5. **Cancellation support** - Allow external cancellation

This implements the `pollAndClick()` method stub from ENG-001.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| ENG-001 | VisionEngine shell | Method signature |
| ENG-005 | Text finding | findText() method |
| ENG-006 | Clicking | clickAtText() method |
| FND-008 | ConditionalConfig | Polling configuration |
| FND-009 | ConditionalClickResult | Result format |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/visionEngine.ts` | MODIFY | Implement pollAndClick() |
| `src/lib/conditionalClickRunner.ts` | CREATE | Polling logic utilities |

### Implementation Details

| Method | Status | Description |
|--------|--------|-------------|
| `pollAndClick()` | IMPLEMENT | Full implementation |
| `createPollingSession()` | ADD | Create controllable session |
| `cancelPolling()` | ADD | Cancel active polling |

---

## 4. DETAILED SPECIFICATION

### 4.1 Conditional Click Runner

Create `src/lib/conditionalClickRunner.ts`:

```typescript
/**
 * @fileoverview Conditional click polling runner
 * @module lib/conditionalClickRunner
 * 
 * Provides utilities for running conditional click polling loops
 * with timeout management, cancellation, and result tracking.
 */

import type { ConditionalClickResult, ClickTarget } from '@/types';

/**
 * Polling session state
 */
export type PollingState = 
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'timeout'
  | 'cancelled'
  | 'error';

/**
 * Polling session configuration
 */
export interface PollingConfig {
  /** Search terms to look for */
  searchTerms: string[];
  /** Timeout in seconds after last click */
  timeoutSeconds: number;
  /** Interval between polls in ms */
  pollIntervalMs: number;
  /** Minimum confidence for matches */
  confidenceThreshold?: number;
  /** Maximum total clicks (0 = unlimited) */
  maxClicks?: number;
  /** Delay after each click in ms */
  postClickDelayMs?: number;
}

/**
 * Polling session events
 */
export interface PollingEvents {
  onScanStart?: () => void;
  onScanComplete?: (foundCount: number) => void;
  onMatch?: (target: ClickTarget) => void;
  onClick?: (target: ClickTarget, clickCount: number) => void;
  onTimeout?: (result: ConditionalClickResult) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: PollingState) => void;
}

/**
 * Polling session for tracking and controlling a polling operation
 */
export class PollingSession {
  /** Current state */
  private state: PollingState = 'idle';
  
  /** Configuration */
  private config: PollingConfig;
  
  /** Event handlers */
  private events: PollingEvents;
  
  /** Click counter */
  private clickCount: number = 0;
  
  /** Unique terms that have been clicked */
  private matchesFound: Set<string> = new Set();
  
  /** Start time */
  private startTime: number = 0;
  
  /** Last click time (for timeout calculation) */
  private lastClickTime: number = 0;
  
  /** Cancellation flag */
  private cancelled: boolean = false;
  
  /** Current polling interval ID */
  private intervalId: NodeJS.Timeout | null = null;
  
  /** Find function reference */
  private findFn: (terms: string[]) => Promise<ClickTarget | null>;
  
  /** Click function reference */
  private clickFn: (target: ClickTarget) => Promise<void>;

  constructor(
    config: PollingConfig,
    findFn: (terms: string[]) => Promise<ClickTarget | null>,
    clickFn: (target: ClickTarget) => Promise<void>,
    events: PollingEvents = {}
  ) {
    this.config = config;
    this.findFn = findFn;
    this.clickFn = clickFn;
    this.events = events;
  }

  /**
   * Starts the polling session
   * @returns Promise that resolves when polling completes
   */
  async start(): Promise<ConditionalClickResult> {
    if (this.state === 'running') {
      throw new Error('Polling session already running');
    }

    this.reset();
    this.setState('running');
    this.startTime = Date.now();
    this.lastClickTime = Date.now();

    console.log('[PollingSession] Started', {
      terms: this.config.searchTerms,
      timeout: `${this.config.timeoutSeconds}s`,
      interval: `${this.config.pollIntervalMs}ms`,
    });

    return this.runPollingLoop();
  }

  /**
   * Cancels the polling session
   */
  cancel(): void {
    console.log('[PollingSession] Cancellation requested');
    this.cancelled = true;
    
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    this.setState('cancelled');
  }

  /**
   * Pauses the polling session
   */
  pause(): void {
    if (this.state === 'running') {
      this.setState('paused');
      if (this.intervalId) {
        clearTimeout(this.intervalId);
        this.intervalId = null;
      }
    }
  }

  /**
   * Resumes a paused session
   */
  async resume(): Promise<ConditionalClickResult> {
    if (this.state !== 'paused') {
      throw new Error('Can only resume paused sessions');
    }
    
    this.setState('running');
    return this.runPollingLoop();
  }

  /**
   * Gets current session state
   */
  getState(): PollingState {
    return this.state;
  }

  /**
   * Gets current statistics
   */
  getStats(): {
    state: PollingState;
    clickCount: number;
    matchesFound: string[];
    elapsedMs: number;
    timeSinceLastClick: number;
  } {
    const now = Date.now();
    return {
      state: this.state,
      clickCount: this.clickCount,
      matchesFound: Array.from(this.matchesFound),
      elapsedMs: now - this.startTime,
      timeSinceLastClick: now - this.lastClickTime,
    };
  }

  /**
   * Main polling loop
   */
  private async runPollingLoop(): Promise<ConditionalClickResult> {
    while (!this.shouldStop()) {
      try {
        // Check for timeout
        if (this.isTimedOut()) {
          console.log('[PollingSession] Timeout reached');
          this.setState('timeout');
          this.events.onTimeout?.(this.createResult('timeout'));
          return this.createResult('timeout');
        }

        // Check for cancellation
        if (this.cancelled) {
          return this.createResult('cancelled');
        }

        // Perform scan
        this.events.onScanStart?.();
        const target = await this.findFn(this.config.searchTerms);
        this.events.onScanComplete?.(target ? 1 : 0);

        if (target) {
          // Found a match
          this.events.onMatch?.(target);
          
          try {
            // Click the target
            await this.clickFn(target);
            
            this.clickCount++;
            this.lastClickTime = Date.now();
            
            if (target.matchedText) {
              this.matchesFound.add(target.matchedText);
            }
            
            this.events.onClick?.(target, this.clickCount);
            
            console.log('[PollingSession] Clicked:', {
              text: target.matchedText,
              clickCount: this.clickCount,
            });

            // Post-click delay
            if (this.config.postClickDelayMs && this.config.postClickDelayMs > 0) {
              await this.sleep(this.config.postClickDelayMs);
            }

            // Check max clicks
            if (this.config.maxClicks && this.clickCount >= this.config.maxClicks) {
              console.log('[PollingSession] Max clicks reached');
              this.setState('completed');
              return this.createResult('completed');
            }

          } catch (clickError) {
            console.warn('[PollingSession] Click failed:', clickError);
            // Continue polling despite click failure
          }
        }

        // Wait for next poll
        await this.sleep(this.config.pollIntervalMs);

      } catch (error) {
        console.error('[PollingSession] Error during poll:', error);
        this.events.onError?.(error instanceof Error ? error : new Error(String(error)));
        
        // Continue polling despite errors
        await this.sleep(this.config.pollIntervalMs);
      }
    }

    // Determine final state
    if (this.cancelled) {
      return this.createResult('cancelled');
    }
    
    this.setState('completed');
    return this.createResult('completed');
  }

  /**
   * Checks if polling should stop
   */
  private shouldStop(): boolean {
    return (
      this.cancelled ||
      this.state === 'completed' ||
      this.state === 'timeout' ||
      this.state === 'cancelled' ||
      this.state === 'error'
    );
  }

  /**
   * Checks if timeout has been reached
   */
  private isTimedOut(): boolean {
    const timeSinceLastClick = Date.now() - this.lastClickTime;
    const timeoutMs = this.config.timeoutSeconds * 1000;
    return timeSinceLastClick >= timeoutMs;
  }

  /**
   * Creates a result object
   */
  private createResult(
    reason: 'timeout' | 'completed' | 'cancelled' | 'error'
  ): ConditionalClickResult {
    return {
      success: reason !== 'error',
      reason,
      clickCount: this.clickCount,
      elapsedMs: Date.now() - this.startTime,
      matchesFound: Array.from(this.matchesFound),
    };
  }

  /**
   * Sets state and emits event
   */
  private setState(state: PollingState): void {
    this.state = state;
    this.events.onStateChange?.(state);
  }

  /**
   * Resets session state
   */
  private reset(): void {
    this.clickCount = 0;
    this.matchesFound.clear();
    this.cancelled = false;
    this.startTime = 0;
    this.lastClickTime = 0;
    
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.intervalId = setTimeout(resolve, ms);
    });
  }
}

/**
 * Creates a simple polling runner (convenience function)
 * @param config - Polling configuration
 * @param findFn - Function to find text
 * @param clickFn - Function to click target
 * @returns Promise resolving to result
 */
export async function runConditionalClick(
  config: PollingConfig,
  findFn: (terms: string[]) => Promise<ClickTarget | null>,
  clickFn: (target: ClickTarget) => Promise<void>
): Promise<ConditionalClickResult> {
  const session = new PollingSession(config, findFn, clickFn);
  return session.start();
}
```

### 4.2 VisionEngine Polling Implementation

Update `src/lib/visionEngine.ts` - replace the `pollAndClick()` stub:

```typescript
// Add imports
import {
  PollingSession,
  type PollingConfig,
  type PollingEvents,
  type PollingState,
} from './conditionalClickRunner';

// Add private property for active session
/** Active polling session (if any) */
private activePollingSession: PollingSession | null = null;

// Replace pollAndClick() method
/**
 * Polls for text and clicks when found
 * Continues polling until timeout after last click
 * 
 * @param searchTerms - Terms to search for
 * @param timeoutSeconds - Max time after last click before stopping
 * @param pollIntervalMs - Time between scans (default from config)
 * @returns Conditional click result with statistics
 * 
 * @example
 * ```typescript
 * // Poll for approval buttons for up to 2 minutes
 * const result = await engine.pollAndClick(
 *   ['Allow', 'Keep', 'Continue'],
 *   120,  // 2 minute timeout after last click
 *   1000  // Check every second
 * );
 * 
 * console.log(`Clicked ${result.clickCount} buttons`);
 * console.log(`Ran for ${result.elapsedMs}ms`);
 * ```
 */
async pollAndClick(
  searchTerms: string[],
  timeoutSeconds: number,
  pollIntervalMs: number = this.config.pollIntervalMs
): Promise<ConditionalClickResult> {
  this.ensureReady();

  if (searchTerms.length === 0) {
    return {
      success: true,
      reason: 'completed',
      clickCount: 0,
      elapsedMs: 0,
      matchesFound: [],
    };
  }

  // Cancel any existing polling session
  if (this.activePollingSession) {
    console.log('[VisionEngine] Cancelling existing polling session');
    this.activePollingSession.cancel();
  }

  const config: PollingConfig = {
    searchTerms,
    timeoutSeconds,
    pollIntervalMs,
    confidenceThreshold: this.config.confidenceThreshold,
    postClickDelayMs: 500, // Brief delay after each click
  };

  // Create bound functions for the session
  const findFn = async (terms: string[]): Promise<ClickTarget | null> => {
    try {
      return await this.findText(terms, { skipCache: true });
    } catch (error) {
      console.warn('[VisionEngine] Find error during polling:', error);
      return null;
    }
  };

  const clickFn = async (target: ClickTarget): Promise<void> => {
    await this.clickAtCoordinates(target.x, target.y);
  };

  // Create events for logging
  const events: PollingEvents = {
    onStateChange: (state) => {
      this.emit('statusChange', { pollingState: state });
    },
    onClick: (target, count) => {
      this.emit('ocrComplete', {
        operation: 'conditionalClick',
        clickedText: target.matchedText,
        clickCount: count,
      });
    },
  };

  // Create and start session
  this.activePollingSession = new PollingSession(config, findFn, clickFn, events);
  
  try {
    console.log('[VisionEngine] Starting conditional click polling', {
      terms: searchTerms,
      timeout: `${timeoutSeconds}s`,
      interval: `${pollIntervalMs}ms`,
    });

    const result = await this.activePollingSession.start();

    console.log('[VisionEngine] Polling complete', {
      reason: result.reason,
      clicks: result.clickCount,
      elapsed: `${Math.round(result.elapsedMs / 1000)}s`,
      matches: result.matchesFound,
    });

    return result;

  } finally {
    this.activePollingSession = null;
  }
}

// Add method for creating controllable sessions
/**
 * Creates a controllable polling session
 * Allows pause, resume, and cancel operations
 * 
 * @param searchTerms - Terms to search for
 * @param timeoutSeconds - Timeout after last click
 * @param events - Optional event handlers
 * @returns Polling session object
 * 
 * @example
 * ```typescript
 * const session = engine.createPollingSession(
 *   ['Allow', 'Keep'],
 *   120,
 *   {
 *     onClick: (target, count) => {
 *       console.log(`Click ${count}: ${target.matchedText}`);
 *     },
 *     onTimeout: (result) => {
 *       console.log('Polling timed out');
 *     },
 *   }
 * );
 * 
 * // Start polling
 * const resultPromise = session.start();
 * 
 * // Later, cancel if needed
 * session.cancel();
 * ```
 */
createPollingSession(
  searchTerms: string[],
  timeoutSeconds: number,
  events: PollingEvents = {}
): PollingSession {
  this.ensureReady();

  const config: PollingConfig = {
    searchTerms,
    timeoutSeconds,
    pollIntervalMs: this.config.pollIntervalMs,
    confidenceThreshold: this.config.confidenceThreshold,
    postClickDelayMs: 500,
  };

  const findFn = async (terms: string[]): Promise<ClickTarget | null> => {
    try {
      return await this.findText(terms, { skipCache: true });
    } catch {
      return null;
    }
  };

  const clickFn = async (target: ClickTarget): Promise<void> => {
    await this.clickAtCoordinates(target.x, target.y);
  };

  return new PollingSession(config, findFn, clickFn, events);
}

// Add method to cancel active polling
/**
 * Cancels any active polling session
 * @returns True if a session was cancelled
 */
cancelPolling(): boolean {
  if (this.activePollingSession) {
    this.activePollingSession.cancel();
    this.activePollingSession = null;
    console.log('[VisionEngine] Polling cancelled');
    return true;
  }
  return false;
}

// Add method to check polling status
/**
 * Checks if polling is currently active
 * @returns True if polling is running
 */
isPolling(): boolean {
  return this.activePollingSession?.getState() === 'running';
}

// Add method to get polling statistics
/**
 * Gets statistics for active polling session
 * @returns Stats or null if no active session
 */
getPollingStats(): {
  state: PollingState;
  clickCount: number;
  matchesFound: string[];
  elapsedMs: number;
  timeSinceLastClick: number;
} | null {
  if (!this.activePollingSession) {
    return null;
  }
  return this.activePollingSession.getStats();
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Conditional Click

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();
await engine.initialize();

// Poll for Claude.ai approval buttons
const result = await engine.pollAndClick(
  ['Allow', 'Keep', 'Continue'],
  120,  // 2 minute timeout
  1000  // Check every second
);

console.log(`Clicked ${result.clickCount} approval buttons`);
console.log(`Total time: ${result.elapsedMs}ms`);
console.log(`Matched terms: ${result.matchesFound.join(', ')}`);
```

### 5.2 Using a Controllable Session

```typescript
// Create session with event handlers
const session = engine.createPollingSession(
  ['Allow', 'Keep'],
  120,
  {
    onMatch: (target) => {
      console.log(`Found: ${target.matchedText}`);
    },
    onClick: (target, count) => {
      console.log(`Click #${count}: ${target.matchedText}`);
      updateUI({ clickCount: count });
    },
    onTimeout: (result) => {
      console.log('Session timed out');
      showNotification('Polling complete');
    },
  }
);

// Start polling (returns promise)
const resultPromise = session.start();

// UI button to cancel
cancelButton.onclick = () => {
  session.cancel();
};

// Wait for completion
const result = await resultPromise;
```

### 5.3 Checking Polling Status

```typescript
// Start polling in background
engine.pollAndClick(['Allow'], 300, 1000);

// Check status periodically
setInterval(() => {
  if (engine.isPolling()) {
    const stats = engine.getPollingStats();
    console.log(`Clicks: ${stats.clickCount}, Elapsed: ${stats.elapsedMs}ms`);
  }
}, 5000);

// Cancel when needed
stopButton.onclick = () => {
  if (engine.cancelPolling()) {
    console.log('Polling stopped');
  }
};
```

### 5.4 With CSV Loop Integration

```typescript
// During CSV row processing
async function processRow(rowData: Record<string, string>) {
  // Execute steps...
  
  // After triggering an action that needs approval
  const approvalResult = await engine.pollAndClick(
    ['Allow', 'Keep', 'Accept'],
    recording.conditionalDefaults.timeoutSeconds,
    1000
  );
  
  if (approvalResult.clickCount > 0) {
    console.log(`Handled ${approvalResult.clickCount} approvals for row`);
  }
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `pollAndClick()` continuously scans at configured interval
- [ ] **AC-2:** Clicks targets when search terms are found
- [ ] **AC-3:** Timeout resets after each successful click
- [ ] **AC-4:** Returns result with click count and elapsed time
- [ ] **AC-5:** `createPollingSession()` returns controllable session
- [ ] **AC-6:** `cancelPolling()` stops active polling
- [ ] **AC-7:** Events fire correctly (onMatch, onClick, onTimeout)
- [ ] **AC-8:** Multiple search terms work correctly
- [ ] **AC-9:** Polling survives individual scan/click errors
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **One session at a time** - New polling cancels existing
2. **Timeout from last click** - Not from start time
3. **Error resilience** - Continue despite individual failures

### Patterns to Follow

1. **Session pattern** - Encapsulate state in session object
2. **Event callbacks** - Allow external monitoring
3. **Graceful timeout** - Success even with zero clicks

### Edge Cases

1. **Empty search terms** - Return immediately with success
2. **Cancelled before click** - Return cancelled result
3. **Click fails** - Log warning, continue polling

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/lib/conditionalClickRunner.ts

# Run type check
npm run type-check

# Build and test manually
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert to stub implementation
# Replace pollAndClick() with original stub

# Remove runner file
rm src/lib/conditionalClickRunner.ts
```

---

## 10. REFERENCES

- FND-008: ConditionalConfig Interface
- FND-009: ConditionalClickResult Interface
- ENG-001: VisionEngine Class Shell
- ENG-006: Coordinate-Based Clicking

---

*End of Specification ENG-007*
