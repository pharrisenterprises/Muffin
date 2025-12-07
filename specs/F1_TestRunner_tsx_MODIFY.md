# TestRunner.tsx Modifications Specification

**File ID:** F1  
**File Path:** `src/pages/TestRunner.tsx`  
**Status:** MODIFY  
**Priority:** P0

---

## Purpose

Modify the existing TestRunner component to integrate with the new 7-tier DecisionEngine for playback. The TestRunner must send step execution requests to the background script's DecisionEngine, display strategy evaluation results, show which strategy was used for each step, handle fallback chain navigation, and provide detailed error reporting when all strategies fail. This creates a seamless playback experience that leverages all capture layers.

---

## Current State Analysis

The existing TestRunner.tsx likely has:
- Basic step execution via simple selector matching
- Linear playback without fallback strategies
- Limited error reporting
- No strategy visibility

---

## Dependencies

### Uses (imports from)
- `../types/strategy`: FallbackChain, StrategyType, StrategyEvaluationResult, CapturedAction
- `../types/telemetry`: RunSummary, TelemetryEvent
- `../components/StepDisplay`: Step visualization
- `../components/StrategyBadge`: Strategy indicator (new)

### Used By (exports to)
- `../App.tsx`: Main application routing

---

## Modifications Required

### 1. New Imports

```typescript
// Add to existing imports
import {
  FallbackChain,
  StrategyType,
  StrategyEvaluationResult,
  CapturedAction,
  STRATEGY_WEIGHTS
} from '../types/strategy';
import {
  RunSummary,
  TelemetryEvent,
  generateRunId
} from '../types/telemetry';
```

### 2. New Interfaces

```typescript
/**
 * Step execution state
 */
interface StepExecutionState {
  /** Step index */
  index: number;
  /** Execution status */
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  /** Strategy used (if executed) */
  usedStrategy?: StrategyType;
  /** All strategy results */
  strategyResults?: StrategyEvaluationResult[];
  /** Execution duration */
  duration?: number;
  /** Error message */
  error?: string;
  /** Retry count */
  retryCount: number;
}

/**
 * Playback configuration
 */
interface PlaybackConfig {
  /** Step delay in ms */
  stepDelay: number;
  /** Whether to pause on failure */
  pauseOnFailure: boolean;
  /** Maximum retries per step */
  maxRetries: number;
  /** Timeout per step in ms */
  stepTimeout: number;
  /** Whether to show strategy details */
  showStrategyDetails: boolean;
  /** Whether to continue on failure */
  continueOnFailure: boolean;
}

/**
 * Playback state
 */
interface PlaybackState {
  /** Current run ID */
  runId: string | null;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Whether playback is paused */
  isPaused: boolean;
  /** Current step index */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Step states */
  stepStates: StepExecutionState[];
  /** Start timestamp */
  startTime: number | null;
  /** End timestamp */
  endTime: number | null;
}

/**
 * Execute step request
 */
interface ExecuteStepRequest {
  /** Tab ID */
  tabId: number;
  /** Step index */
  stepIndex: number;
  /** Fallback chain */
  fallbackChain: FallbackChain;
  /** Action type */
  actionType: string;
  /** Input value */
  value?: string;
  /** Timeout */
  timeout: number;
  /** Run ID for telemetry */
  runId: string;
}

/**
 * Execute step response
 */
interface ExecuteStepResponse {
  /** Whether step succeeded */
  success: boolean;
  /** Strategy that was used */
  usedStrategy?: StrategyType;
  /** Used strategy confidence */
  confidence?: number;
  /** All evaluation results */
  evaluationResults?: {
    results: StrategyEvaluationResult[];
    bestStrategy: StrategyEvaluationResult | null;
    totalDuration: number;
  };
  /** Execution duration */
  duration: number;
  /** Error message */
  error?: string;
}
```

### 3. New State Variables

```typescript
// Add to component state
const [playbackState, setPlaybackState] = useState<PlaybackState>({
  runId: null,
  isPlaying: false,
  isPaused: false,
  currentStep: 0,
  totalSteps: 0,
  stepStates: [],
  startTime: null,
  endTime: null
});

const [playbackConfig, setPlaybackConfig] = useState<PlaybackConfig>({
  stepDelay: 500,
  pauseOnFailure: true,
  maxRetries: 2,
  stepTimeout: 30000,
  showStrategyDetails: true,
  continueOnFailure: false
});

const [selectedStepDetails, setSelectedStepDetails] = useState<number | null>(null);
const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
```

### 4. Execute Step Function

```typescript
/**
 * Execute a single step using DecisionEngine
 */
async function executeStep(
  step: CapturedAction,
  stepIndex: number,
  tabId: number
): Promise<ExecuteStepResponse> {
  // Update step state to running
  updateStepState(stepIndex, { status: 'running' });

  const request: ExecuteStepRequest = {
    tabId,
    stepIndex,
    fallbackChain: step.fallbackChain,
    actionType: step.eventType,
    value: step.value,
    timeout: playbackConfig.stepTimeout,
    runId: playbackState.runId!
  };

  try {
    // Send to background script's DecisionEngine
    const response = await chrome.runtime.sendMessage({
      action: 'EXECUTE_STEP',
      payload: request
    }) as ExecuteStepResponse;

    // Update step state with results
    updateStepState(stepIndex, {
      status: response.success ? 'success' : 'failed',
      usedStrategy: response.usedStrategy,
      strategyResults: response.evaluationResults?.results,
      duration: response.duration,
      error: response.error
    });

    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    updateStepState(stepIndex, {
      status: 'failed',
      error: errorMessage
    });

    return {
      success: false,
      duration: 0,
      error: errorMessage
    };
  }
}
```

### 5. Playback Control Functions

```typescript
/**
 * Start playback
 */
async function startPlayback(steps: CapturedAction[]): Promise<void> {
  const runId = generateRunId();
  
  // Initialize step states
  const initialStepStates: StepExecutionState[] = steps.map((_, index) => ({
    index,
    status: 'pending',
    retryCount: 0
  }));

  setPlaybackState({
    runId,
    isPlaying: true,
    isPaused: false,
    currentStep: 0,
    totalSteps: steps.length,
    stepStates: initialStepStates,
    startTime: Date.now(),
    endTime: null
  });

  // Notify background to start telemetry run
  await chrome.runtime.sendMessage({
    action: 'START_TELEMETRY_RUN',
    payload: { runId }
  });

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      error: 'No active tab'
    }));
    return;
  }

  // Execute steps sequentially
  await executeStepsSequentially(steps, tab.id, runId);
}

/**
 * Execute steps sequentially
 */
async function executeStepsSequentially(
  steps: CapturedAction[],
  tabId: number,
  runId: string
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    // Check if paused or stopped
    if (!playbackState.isPlaying) break;
    
    while (playbackState.isPaused) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!playbackState.isPlaying) return;
    }

    // Update current step
    setPlaybackState(prev => ({ ...prev, currentStep: i }));

    // Execute step with retries
    let success = false;
    let retryCount = 0;

    while (!success && retryCount <= playbackConfig.maxRetries) {
      if (retryCount > 0) {
        updateStepState(i, { retryCount });
        await new Promise(resolve => setTimeout(resolve, 500)); // Retry delay
      }

      const response = await executeStep(steps[i], i, tabId);
      success = response.success;

      if (!success) {
        retryCount++;
      }
    }

    // Handle failure
    if (!success) {
      if (playbackConfig.pauseOnFailure) {
        setPlaybackState(prev => ({ ...prev, isPaused: true }));
        break;
      } else if (!playbackConfig.continueOnFailure) {
        break;
      }
    }

    // Step delay before next step
    if (i < steps.length - 1) {
      await new Promise(resolve => setTimeout(resolve, playbackConfig.stepDelay));
    }
  }

  // End playback
  await finishPlayback(runId);
}

/**
 * Finish playback and get summary
 */
async function finishPlayback(runId: string): Promise<void> {
  // End telemetry run
  const summary = await chrome.runtime.sendMessage({
    action: 'END_TELEMETRY_RUN',
    payload: { runId }
  }) as RunSummary;

  setRunSummary(summary);
  setPlaybackState(prev => ({
    ...prev,
    isPlaying: false,
    isPaused: false,
    endTime: Date.now()
  }));
}

/**
 * Pause playback
 */
function pausePlayback(): void {
  setPlaybackState(prev => ({ ...prev, isPaused: true }));
}

/**
 * Resume playback
 */
function resumePlayback(): void {
  setPlaybackState(prev => ({ ...prev, isPaused: false }));
}

/**
 * Stop playback
 */
async function stopPlayback(): Promise<void> {
  if (playbackState.runId) {
    await finishPlayback(playbackState.runId);
  }
  setPlaybackState(prev => ({
    ...prev,
    isPlaying: false,
    isPaused: false
  }));
}

/**
 * Update step state helper
 */
function updateStepState(
  index: number,
  update: Partial<StepExecutionState>
): void {
  setPlaybackState(prev => ({
    ...prev,
    stepStates: prev.stepStates.map((state, i) =>
      i === index ? { ...state, ...update } : state
    )
  }));
}
```

### 6. Strategy Results Display Component

```typescript
/**
 * Strategy results panel for a step
 */
function StrategyResultsPanel({
  stepState,
  onClose
}: {
  stepState: StepExecutionState;
  onClose: () => void;
}): JSX.Element {
  const { strategyResults, usedStrategy } = stepState;

  if (!strategyResults || strategyResults.length === 0) {
    return (
      <div className="strategy-panel empty">
        <p>No strategy results available</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  // Sort by confidence (highest first)
  const sortedResults = [...strategyResults].sort(
    (a, b) => b.confidence - a.confidence
  );

  return (
    <div className="strategy-panel">
      <div className="strategy-panel-header">
        <h4>Strategy Evaluation Results</h4>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className="strategy-list">
        {sortedResults.map((result, index) => (
          <div
            key={result.strategy.type}
            className={`strategy-item ${
              result.strategy.type === usedStrategy ? 'used' : ''
            } ${result.found ? 'found' : 'not-found'}`}
          >
            <div className="strategy-header">
              <StrategyBadge type={result.strategy.type} />
              <span className="confidence">
                {(result.confidence * 100).toFixed(0)}%
              </span>
              {result.strategy.type === usedStrategy && (
                <span className="used-badge">USED</span>
              )}
            </div>
            
            <div className="strategy-details">
              <span className="status">
                {result.found ? '✓ Found' : '✗ Not Found'}
              </span>
              <span className="duration">{result.duration}ms</span>
              {result.error && (
                <span className="error">{result.error}</span>
              )}
            </div>
            
            {result.strategy.selector && (
              <div className="selector">
                <code>{result.strategy.selector}</code>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 7. Step List Item Component

```typescript
/**
 * Individual step display in list
 */
function StepListItem({
  step,
  state,
  isActive,
  onClick,
  onDetailsClick
}: {
  step: CapturedAction;
  state: StepExecutionState;
  isActive: boolean;
  onClick: () => void;
  onDetailsClick: () => void;
}): JSX.Element {
  const statusIcon = {
    pending: '○',
    running: '◉',
    success: '✓',
    failed: '✗',
    skipped: '–'
  }[state.status];

  const statusClass = `step-status-${state.status}`;

  return (
    <div
      className={`step-item ${statusClass} ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="step-icon">{statusIcon}</div>
      
      <div className="step-content">
        <div className="step-action">
          <span className="action-type">{step.eventType}</span>
          {step.value && (
            <span className="action-value">"{step.value}"</span>
          )}
        </div>
        
        <div className="step-target">
          {step.domData.element.accessibleName || 
           step.domData.element.textContent?.slice(0, 30) ||
           step.domData.selector.slice(0, 40)}
        </div>
      </div>

      <div className="step-meta">
        {state.usedStrategy && (
          <StrategyBadge type={state.usedStrategy} size="small" />
        )}
        
        {state.duration !== undefined && (
          <span className="duration">{state.duration}ms</span>
        )}
        
        {state.retryCount > 0 && (
          <span className="retry-count">↻{state.retryCount}</span>
        )}
        
        <button
          className="details-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDetailsClick();
          }}
          title="View strategy details"
        >
          ⋯
        </button>
      </div>
    </div>
  );
}
```

### 8. Playback Controls Component

```typescript
/**
 * Playback control buttons
 */
function PlaybackControls({
  state,
  onStart,
  onPause,
  onResume,
  onStop
}: {
  state: PlaybackState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}): JSX.Element {
  const progress = state.totalSteps > 0
    ? (state.currentStep / state.totalSteps) * 100
    : 0;

  return (
    <div className="playback-controls">
      <div className="control-buttons">
        {!state.isPlaying ? (
          <button className="btn-play" onClick={onStart}>
            ▶ Start
          </button>
        ) : state.isPaused ? (
          <>
            <button className="btn-resume" onClick={onResume}>
              ▶ Resume
            </button>
            <button className="btn-stop" onClick={onStop}>
              ■ Stop
            </button>
          </>
        ) : (
          <>
            <button className="btn-pause" onClick={onPause}>
              ⏸ Pause
            </button>
            <button className="btn-stop" onClick={onStop}>
              ■ Stop
            </button>
          </>
        )}
      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="progress-text">
          {state.currentStep} / {state.totalSteps}
        </span>
      </div>

      {state.isPlaying && (
        <div className="status-indicator">
          {state.isPaused ? (
            <span className="paused">Paused</span>
          ) : (
            <span className="running">Running...</span>
          )}
        </div>
      )}
    </div>
  );
}
```

### 9. Run Summary Component

```typescript
/**
 * Display run summary after completion
 */
function RunSummaryDisplay({
  summary,
  onClose
}: {
  summary: RunSummary;
  onClose: () => void;
}): JSX.Element {
  const passRatePercent = (summary.passRate * 100).toFixed(1);
  const statusClass = summary.passRate >= 0.9 ? 'success' :
                      summary.passRate >= 0.7 ? 'warning' : 'failure';

  return (
    <div className={`run-summary ${statusClass}`}>
      <div className="summary-header">
        <h3>Run Complete</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="summary-stats">
        <div className="stat main">
          <span className="value">{passRatePercent}%</span>
          <span className="label">Pass Rate</span>
        </div>

        <div className="stat">
          <span className="value">{summary.successfulSteps}</span>
          <span className="label">Passed</span>
        </div>

        <div className="stat">
          <span className="value">{summary.failedSteps}</span>
          <span className="label">Failed</span>
        </div>

        <div className="stat">
          <span className="value">{summary.duration}ms</span>
          <span className="label">Duration</span>
        </div>
      </div>

      <div className="strategy-usage">
        <h4>Strategy Usage</h4>
        <div className="usage-bars">
          {Object.entries(summary.strategyUsage).map(([type, count]) => (
            <div key={type} className="usage-bar">
              <StrategyBadge type={type as StrategyType} size="small" />
              <div className="bar">
                <div
                  className="fill"
                  style={{
                    width: `${(count / summary.totalSteps) * 100}%`
                  }}
                />
              </div>
              <span className="count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {summary.failureReasons && summary.failureReasons.length > 0 && (
        <div className="failure-reasons">
          <h4>Failure Reasons</h4>
          <ul>
            {summary.failureReasons.map((reason, i) => (
              <li key={i}>
                <span className="category">{reason.category}</span>
                <span className="count">({reason.count})</span>
                {reason.exampleError && (
                  <p className="example">{reason.exampleError}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### 10. Configuration Panel

```typescript
/**
 * Playback configuration panel
 */
function PlaybackConfigPanel({
  config,
  onChange,
  disabled
}: {
  config: PlaybackConfig;
  onChange: (config: PlaybackConfig) => void;
  disabled: boolean;
}): JSX.Element {
  return (
    <div className="config-panel">
      <h4>Playback Settings</h4>

      <div className="config-item">
        <label htmlFor="stepDelay">Step Delay (ms)</label>
        <input
          id="stepDelay"
          type="number"
          min="0"
          max="5000"
          step="100"
          value={config.stepDelay}
          onChange={(e) => onChange({
            ...config,
            stepDelay: parseInt(e.target.value, 10)
          })}
          disabled={disabled}
        />
      </div>

      <div className="config-item">
        <label htmlFor="stepTimeout">Step Timeout (ms)</label>
        <input
          id="stepTimeout"
          type="number"
          min="5000"
          max="120000"
          step="1000"
          value={config.stepTimeout}
          onChange={(e) => onChange({
            ...config,
            stepTimeout: parseInt(e.target.value, 10)
          })}
          disabled={disabled}
        />
      </div>

      <div className="config-item">
        <label htmlFor="maxRetries">Max Retries</label>
        <input
          id="maxRetries"
          type="number"
          min="0"
          max="5"
          value={config.maxRetries}
          onChange={(e) => onChange({
            ...config,
            maxRetries: parseInt(e.target.value, 10)
          })}
          disabled={disabled}
        />
      </div>

      <div className="config-item checkbox">
        <input
          id="pauseOnFailure"
          type="checkbox"
          checked={config.pauseOnFailure}
          onChange={(e) => onChange({
            ...config,
            pauseOnFailure: e.target.checked
          })}
          disabled={disabled}
        />
        <label htmlFor="pauseOnFailure">Pause on Failure</label>
      </div>

      <div className="config-item checkbox">
        <input
          id="showStrategyDetails"
          type="checkbox"
          checked={config.showStrategyDetails}
          onChange={(e) => onChange({
            ...config,
            showStrategyDetails: e.target.checked
          })}
          disabled={disabled}
        />
        <label htmlFor="showStrategyDetails">Show Strategy Details</label>
      </div>
    </div>
  );
}
```

---

## Integration Points

### With Background Script
```typescript
// Message types for background communication
type TestRunnerMessage =
  | { action: 'EXECUTE_STEP'; payload: ExecuteStepRequest }
  | { action: 'START_TELEMETRY_RUN'; payload: { runId: string } }
  | { action: 'END_TELEMETRY_RUN'; payload: { runId: string } }
  | { action: 'GET_RUN_SUMMARY'; payload: { runId: string } };
```

### With DecisionEngine
```typescript
// background.ts handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'EXECUTE_STEP') {
    decisionEngine.executeAction(message.payload)
      .then(result => sendResponse(result));
    return true; // Async response
  }
});
```

---

## Acceptance Criteria

- [ ] Sends step execution requests to DecisionEngine
- [ ] Displays strategy evaluation results per step
- [ ] Shows which strategy was used (with badge)
- [ ] Handles retries with configurable count
- [ ] Pause/Resume/Stop controls work correctly
- [ ] Progress bar updates during playback
- [ ] Strategy details panel shows all evaluations
- [ ] Run summary displays after completion
- [ ] Configuration panel allows settings changes
- [ ] Error messages displayed clearly
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **No active tab**: Show error, prevent start
2. **Tab closes during playback**: Handle gracefully
3. **All strategies fail**: Show detailed failure info
4. **Network timeout**: Retry with backoff
5. **Rapid pause/resume**: Debounce state changes
6. **Empty steps array**: Disable start button
7. **Very long step values**: Truncate display
8. **Concurrent runs**: Prevent multiple
9. **Page navigation mid-step**: Re-attach if needed
10. **Extension unloaded**: Cleanup on unmount

---

## Estimated Lines

400-500 lines modified/added
