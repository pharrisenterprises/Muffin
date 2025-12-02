# ENG-014: Wait and Click Buttons (Conditional Click Polling)

> **Build Card:** ENG-014  
> **Category:** Core Engine  
> **Dependencies:** ENG-001, ENG-006, ENG-007, ENG-008  
> **Risk Level:** High  
> **Estimated Lines:** 500-600

---

## 1. PURPOSE

Implement the `waitAndClickButtons()` function within VisionEngine that continuously polls for specified button text (e.g., "Allow", "Keep") and clicks them as they appear. This is the core conditional click logic essential for automating Copilot workflows where multiple permission prompts appear unpredictably. The function polls until either a success condition is met, a timeout occurs, or the maximum number of clicks is reached.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | Class structure and existing methods |
| Feature Specs | `/future-spec/03_feature-specs.md` | Conditional click requirements |
| API Contracts | `/future-spec/06_api-contracts.md` | ConditionalConfig interface |
| FND-008 | `build-instructions/masterplan/01-foundation/FND-008_conditional-config-interface.md` | ConditionalConfig type |
| FND-009 | `build-instructions/masterplan/01-foundation/FND-009_conditional-result-interface.md` | ConditionalClickResult type |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/visionEngine.ts` | MODIFY | +180 |
| `src/types/vision.types.ts` | MODIFY | +20 |

### Artifacts

- `waitAndClickButtons()` method added to VisionEngine
- `ConditionalClickContext` interface for tracking state
- Event emissions for click progress

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/vision.types.ts

/**
 * Configuration for conditional click polling
 * (Extends ConditionalConfig from FND-008)
 */
export interface WaitAndClickOptions {
  /** Button texts to look for and click (e.g., ["Allow", "Keep"]) */
  buttonTexts: string[];
  
  /** Text that indicates success/completion (e.g., "committed") */
  successText?: string;
  
  /** Maximum time to poll in milliseconds */
  timeoutMs: number;
  
  /** Interval between OCR scans in milliseconds */
  pollIntervalMs: number;
  
  /** Maximum number of button clicks before stopping */
  maxClicks?: number;
  
  /** Confidence threshold for text matching */
  confidence?: number;
  
  /** Delay after each click before next poll (ms) */
  postClickDelayMs?: number;
  
  /** Whether to stop on first success text match */
  stopOnSuccess?: boolean;
  
  /** Tab ID for targeting specific tab */
  tabId?: number;
  
  /** Callback for progress updates */
  onProgress?: (progress: ConditionalClickProgress) => void;
  
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

/**
 * Progress update during conditional click polling
 */
export interface ConditionalClickProgress {
  phase: 'polling' | 'clicking' | 'waiting' | 'success' | 'timeout' | 'aborted';
  elapsedMs: number;
  remainingMs: number;
  clickCount: number;
  lastClickedText?: string;
  successTextFound: boolean;
  currentScanResult?: string[];
}

/**
 * Result from waitAndClickButtons operation
 */
export interface WaitAndClickResult {
  success: boolean;
  reason: 'success-text-found' | 'timeout' | 'max-clicks' | 'aborted' | 'error';
  clickHistory: Array<{
    text: string;
    timestamp: number;
    coordinates: { x: number; y: number };
  }>;
  totalClicks: number;
  successTextFound: boolean;
  finalScreenTexts?: string[];
  elapsedMs: number;
  error?: string;
}
```

### 4.2 WaitAndClickButtons Method Implementation

```typescript
// In src/lib/visionEngine.ts

export class VisionEngine {
  // ... existing properties and methods ...

  /**
   * Polls for buttons and clicks them until success condition or timeout
   * @param options - Configuration for conditional clicking
   * @returns Promise<WaitAndClickResult>
   */
  async waitAndClickButtons(options: WaitAndClickOptions): Promise<WaitAndClickResult> {
    const startTime = performance.now();
    const {
      buttonTexts,
      successText,
      timeoutMs,
      pollIntervalMs,
      maxClicks = Infinity,
      confidence = 0.6,
      postClickDelayMs = 500,
      stopOnSuccess = true,
      tabId,
      onProgress,
      abortSignal
    } = options;

    const result: WaitAndClickResult = {
      success: false,
      reason: 'timeout',
      clickHistory: [],
      totalClicks: 0,
      successTextFound: false,
      elapsedMs: 0
    };

    const targetTabId = tabId ?? await this.getActiveTabId();

    // Normalize button texts to lowercase for matching
    const normalizedButtonTexts = buttonTexts.map(t => t.toLowerCase());

    console.log(`[VisionEngine] Starting conditional click polling for: ${buttonTexts.join(', ')}`);
    console.log(`[VisionEngine] Success text: "${successText || 'none'}", Timeout: ${timeoutMs}ms`);

    try {
      while (true) {
        const elapsed = performance.now() - startTime;
        const remaining = timeoutMs - elapsed;

        // Check abort signal
        if (abortSignal?.aborted) {
          result.reason = 'aborted';
          console.log('[VisionEngine] Conditional click aborted by signal');
          break;
        }

        // Check timeout
        if (elapsed >= timeoutMs) {
          result.reason = 'timeout';
          console.log(`[VisionEngine] Conditional click timed out after ${elapsed}ms`);
          break;
        }

        // Check max clicks
        if (result.totalClicks >= maxClicks) {
          result.reason = 'max-clicks';
          console.log(`[VisionEngine] Reached max clicks: ${maxClicks}`);
          break;
        }

        // Report progress
        const progress: ConditionalClickProgress = {
          phase: 'polling',
          elapsedMs: elapsed,
          remainingMs: remaining,
          clickCount: result.totalClicks,
          successTextFound: result.successTextFound
        };
        onProgress?.(progress);

        // Take screenshot and run OCR
        const allTextResults = await this.findAllText({ 
          confidence, 
          tabId: targetTabId 
        });

        // Extract text strings for analysis
        const screenTexts = allTextResults.results.map(r => r.text.toLowerCase());
        progress.currentScanResult = screenTexts;

        // Check for success text
        if (successText && stopOnSuccess) {
          const successFound = screenTexts.some(t => 
            t.includes(successText.toLowerCase())
          );
          
          if (successFound) {
            result.success = true;
            result.reason = 'success-text-found';
            result.successTextFound = true;
            result.finalScreenTexts = screenTexts;
            console.log(`[VisionEngine] Success text "${successText}" found!`);
            break;
          }
        }

        // Look for buttons to click
        let clickedThisCycle = false;
        
        for (const buttonText of normalizedButtonTexts) {
          // Find all instances of this button text
          const matches = allTextResults.results.filter(r => 
            r.text.toLowerCase().includes(buttonText)
          );

          for (const match of matches) {
            // Skip if confidence too low
            if (match.confidence < confidence) continue;

            // Calculate click coordinates (center of text)
            const clickX = match.bounds.x + (match.bounds.width / 2);
            const clickY = match.bounds.y + (match.bounds.height / 2);

            // Check if we recently clicked this same location
            const recentClick = result.clickHistory.find(h => 
              Math.abs(h.coordinates.x - clickX) < 20 &&
              Math.abs(h.coordinates.y - clickY) < 20 &&
              (performance.now() - h.timestamp) < 2000
            );

            if (recentClick) {
              // Skip - we clicked this recently
              continue;
            }

            // Update progress to clicking phase
            progress.phase = 'clicking';
            onProgress?.(progress);

            // Click the button
            console.log(`[VisionEngine] Clicking "${match.text}" at (${clickX}, ${clickY})`);
            const clickResult = await this.clickAtCoordinates(clickX, clickY, {
              tabId: targetTabId
            });

            if (clickResult.success) {
              result.clickHistory.push({
                text: match.text,
                timestamp: performance.now(),
                coordinates: { x: clickX, y: clickY }
              });
              result.totalClicks++;
              clickedThisCycle = true;
              progress.lastClickedText = match.text;
              progress.clickCount = result.totalClicks;

              console.log(`[VisionEngine] Click ${result.totalClicks}: "${match.text}"`);

              // Post-click delay
              if (postClickDelayMs > 0) {
                progress.phase = 'waiting';
                onProgress?.(progress);
                await this.delay(postClickDelayMs);
              }

              // Only click one button per cycle to allow UI to update
              break;
            }
          }

          if (clickedThisCycle) break;
        }

        // If no buttons found/clicked this cycle, wait before next poll
        if (!clickedThisCycle) {
          await this.delay(pollIntervalMs);
        }
      }

    } catch (error) {
      result.reason = 'error';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VisionEngine] waitAndClickButtons error:', result.error);
    }

    result.elapsedMs = performance.now() - startTime;
    
    // Final success determination
    if (result.reason === 'success-text-found') {
      result.success = true;
    }

    console.log(`[VisionEngine] Conditional click completed: ${result.reason}, ${result.totalClicks} clicks in ${result.elapsedMs}ms`);

    return result;
  }

  /**
   * Convenience method for Copilot-specific button clicking
   * Pre-configured for "Allow" and "Keep" buttons
   */
  async waitForCopilotButtons(options: {
    timeoutMs?: number;
    successText?: string;
    onProgress?: (progress: ConditionalClickProgress) => void;
    abortSignal?: AbortSignal;
    tabId?: number;
  } = {}): Promise<WaitAndClickResult> {
    return this.waitAndClickButtons({
      buttonTexts: ['Allow', 'Keep', 'allow', 'keep'],
      successText: options.successText || 'committed',
      timeoutMs: options.timeoutMs || 120000, // 2 minutes default
      pollIntervalMs: 500,
      maxClicks: 50,
      confidence: 0.7,
      postClickDelayMs: 800,
      stopOnSuccess: true,
      tabId: options.tabId,
      onProgress: options.onProgress,
      abortSignal: options.abortSignal
    });
  }

  /**
   * Creates an abort controller for conditional clicking
   */
  createConditionalClickAbortController(): AbortController {
    return new AbortController();
  }
}
```

### 4.3 Integration with Step Execution

```typescript
// In src/lib/stepExecutors.ts

export async function executeConditionalClick(
  step: Step,
  context: ExecutionContext
): Promise<StepResult> {
  const { visionEngine, abortController, onStepProgress } = context;
  
  // Get conditional config from step
  const config = step.conditionalConfig;
  
  if (!config) {
    return {
      success: false,
      stepId: step.id,
      action: 'conditional_click',
      error: 'No conditional configuration provided'
    };
  }

  // Create progress wrapper
  const progressHandler = (progress: ConditionalClickProgress) => {
    onStepProgress?.({
      stepId: step.id,
      phase: progress.phase,
      clickCount: progress.clickCount,
      elapsedMs: progress.elapsedMs,
      remainingMs: progress.remainingMs
    });
  };

  const result = await visionEngine.waitAndClickButtons({
    buttonTexts: config.buttonTexts,
    successText: config.successText,
    timeoutMs: config.timeoutMs,
    pollIntervalMs: config.pollIntervalMs || 500,
    maxClicks: config.maxClicks,
    confidence: config.confidence || 0.7,
    postClickDelayMs: config.postClickDelayMs || 500,
    stopOnSuccess: config.stopOnSuccess ?? true,
    tabId: context.tabId,
    onProgress: progressHandler,
    abortSignal: abortController?.signal
  });

  return {
    success: result.success,
    stepId: step.id,
    action: 'conditional_click',
    error: result.error,
    metadata: {
      reason: result.reason,
      totalClicks: result.totalClicks,
      clickHistory: result.clickHistory,
      elapsedMs: result.elapsedMs
    }
  };
}
```

### 4.4 UI Progress Display Component

```typescript
// Example React component for displaying progress
// (For reference - actual implementation in UI specs)

interface ConditionalClickProgressProps {
  progress: ConditionalClickProgress | null;
  isActive: boolean;
}

const ConditionalClickProgressDisplay: React.FC<ConditionalClickProgressProps> = ({
  progress,
  isActive
}) => {
  if (!isActive || !progress) return null;

  const progressPercent = progress.remainingMs > 0 
    ? ((progress.elapsedMs / (progress.elapsedMs + progress.remainingMs)) * 100)
    : 100;

  return (
    <div className="conditional-click-progress">
      <div className="progress-header">
        <span className="phase-indicator">{progress.phase}</span>
        <span className="click-count">Clicks: {progress.clickCount}</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="progress-footer">
        <span className="elapsed">{Math.round(progress.elapsedMs / 1000)}s</span>
        <span className="remaining">{Math.round(progress.remainingMs / 1000)}s remaining</span>
      </div>
      {progress.lastClickedText && (
        <div className="last-click">
          Last clicked: "{progress.lastClickedText}"
        </div>
      )}
    </div>
  );
};
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage - Wait for Allow/Keep Buttons

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();
await engine.initialize();

// Wait for and click "Allow" and "Keep" buttons
const result = await engine.waitAndClickButtons({
  buttonTexts: ['Allow', 'Keep'],
  successText: 'committed',
  timeoutMs: 120000,  // 2 minutes
  pollIntervalMs: 500,
  maxClicks: 20
});

if (result.success) {
  console.log(`Completed! Clicked ${result.totalClicks} buttons`);
  console.log('Click history:', result.clickHistory);
} else {
  console.log(`Failed: ${result.reason}`);
}
```

### 5.2 Using Copilot Convenience Method

```typescript
// Pre-configured for Copilot workflow
const result = await engine.waitForCopilotButtons({
  timeoutMs: 180000,  // 3 minutes for large operations
  successText: 'created and committed',
  onProgress: (progress) => {
    console.log(`Phase: ${progress.phase}, Clicks: ${progress.clickCount}`);
  }
});
```

### 5.3 With Abort Controller

```typescript
// Create abort controller for cancellation
const abortController = engine.createConditionalClickAbortController();

// Start conditional clicking
const clickPromise = engine.waitAndClickButtons({
  buttonTexts: ['Allow', 'Keep'],
  successText: 'committed',
  timeoutMs: 120000,
  pollIntervalMs: 500,
  abortSignal: abortController.signal
});

// Cancel after 30 seconds if needed
setTimeout(() => {
  console.log('Aborting conditional click...');
  abortController.abort();
}, 30000);

const result = await clickPromise;
if (result.reason === 'aborted') {
  console.log('User cancelled the operation');
}
```

### 5.4 With Progress Callback

```typescript
const result = await engine.waitAndClickButtons({
  buttonTexts: ['Allow', 'Keep'],
  successText: 'committed',
  timeoutMs: 120000,
  pollIntervalMs: 500,
  onProgress: (progress) => {
    // Update UI
    updateProgressBar(progress.elapsedMs, progress.remainingMs);
    updateClickCount(progress.clickCount);
    
    if (progress.lastClickedText) {
      showToast(`Clicked: ${progress.lastClickedText}`);
    }
    
    if (progress.phase === 'success') {
      showSuccessAnimation();
    }
  }
});
```

### 5.5 Full Copilot Automation Workflow

```typescript
// Complete workflow: Enter prompt, submit, handle buttons, wait for commit
async function automateSmartPrompt(promptContent: string): Promise<boolean> {
  const engine = new VisionEngine();
  await engine.initialize();

  // Step 1: Type the prompt
  const typeResult = await engine.typeText({
    targetText: 'Ask Copilot',
    inputText: promptContent,
    clearFirst: true,
    typeDelayMs: 10
  });

  if (!typeResult.success) {
    console.error('Failed to type prompt');
    return false;
  }

  // Step 2: Submit the prompt
  await engine.sendKeys(['Control', 'Enter']);
  await engine.delay(1000);

  // Step 3: Wait for and click all Allow/Keep buttons until committed
  const result = await engine.waitForCopilotButtons({
    timeoutMs: 180000,
    successText: 'committed',
    onProgress: (p) => console.log(`${p.phase}: ${p.clickCount} clicks`)
  });

  if (result.success) {
    console.log(`Prompt committed after ${result.totalClicks} button clicks`);
    return true;
  } else {
    console.error(`Failed: ${result.reason}`);
    return false;
  }
}
```

### 5.6 CSV Loop Integration

```typescript
// In playback loop with CSV data
for (let row = 0; row < csvData.length; row++) {
  const prompt = csvData[row].smartPrompt;
  
  console.log(`Processing row ${row + 1}/${csvData.length}`);
  
  // Type and submit prompt
  await engine.typeText({
    targetText: 'Ask Copilot',
    inputText: prompt,
    clearFirst: true
  });
  
  await engine.sendKeys(['Control', 'Enter']);
  await engine.delay(1000);
  
  // Handle all buttons until committed
  const result = await engine.waitAndClickButtons({
    buttonTexts: ['Allow', 'Keep'],
    successText: 'committed',
    timeoutMs: 300000,  // 5 min per prompt
    pollIntervalMs: 500,
    onProgress: (p) => {
      updateUIProgress(row, csvData.length, p);
    }
  });
  
  if (!result.success) {
    console.error(`Row ${row + 1} failed: ${result.reason}`);
    // Decide whether to continue or abort
  }
  
  // Brief delay before next iteration
  await engine.delay(2000);
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Polls for button text at specified interval
- [ ] **AC-2:** Clicks buttons when found via OCR
- [ ] **AC-3:** Stops when success text is detected
- [ ] **AC-4:** Stops when timeout is reached
- [ ] **AC-5:** Stops when max clicks is reached
- [ ] **AC-6:** Respects abort signal for cancellation
- [ ] **AC-7:** Reports progress via callback
- [ ] **AC-8:** Tracks click history with timestamps
- [ ] **AC-9:** Avoids re-clicking same button within 2 seconds
- [ ] **AC-10:** waitForCopilotButtons() preconfigured correctly

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **OCR overhead** - Each poll requires screenshot + OCR (~200-500ms)
2. **Click debouncing** - Must avoid double-clicking same button
3. **UI responsiveness** - Progress callbacks keep UI updated

### Patterns to Follow

1. **Polling loop** - Continuous check until condition met
2. **Abort pattern** - AbortController for clean cancellation
3. **Progress reporting** - Regular callbacks for UI updates

### Edge Cases

1. **Buttons appearing simultaneously** - Click one at a time
2. **Button text in non-button elements** - May click wrong thing
3. **Slow UI updates** - Post-click delay allows DOM to settle
4. **Network delays** - Copilot may take time to respond
5. **Multiple tabs** - Ensure correct tab is targeted
6. **Page navigation** - Success may change URL

---

## 8. VERIFICATION COMMANDS

```bash
# Verify waitAndClickButtons method exists
grep -n "waitAndClickButtons\|waitForCopilotButtons" src/lib/visionEngine.ts

# Verify type definitions
grep -n "WaitAndClickOptions\|WaitAndClickResult\|ConditionalClickProgress" src/types/vision.types.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert VisionEngine changes
git checkout src/lib/visionEngine.ts

# Revert type definitions
git checkout src/types/vision.types.ts
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Class
- ENG-006: findText() Function
- ENG-007: findAllText() Function
- ENG-008: clickAtCoordinates() Function
- FND-008: ConditionalConfig Interface
- FND-009: ConditionalClickResult Interface
- Feature Spec: `/future-spec/03_feature-specs.md` Section 2.3

---

*End of Specification ENG-014*
