# Recorder.tsx Modifications Specification

**File ID:** F2  
**File Path:** `src/pages/Recorder.tsx`  
**Status:** MODIFY  
**Priority:** P0

---

## Purpose

Modify the existing Recorder component to integrate with the new multi-layer recording system. The Recorder must communicate with RecordingOrchestrator in the content script, display layer status indicators, show FallbackChain generation progress, provide layer toggle controls, and display recorded actions with their strategy information. This creates a comprehensive recording experience that captures all evidence layers.

---

## Current State Analysis

The existing Recorder.tsx likely has:
- Basic recording start/stop controls
- Simple action list display
- No layer awareness
- No FallbackChain visualization

---

## Dependencies

### Uses (imports from)
- `../types/strategy`: FallbackChain, CapturedAction, StrategyType, STRATEGY_WEIGHTS
- `../types/recording`: RecordingState, RecordingConfig, LayerStatus, LayerType, BufferStatus
- `../components/StrategyBadge`: Strategy indicator
- `../components/LayerIndicator`: Layer status (new)
- `../components/ActionCard`: Action display (new/modify)

### Used By (exports to)
- `../App.tsx`: Main application routing

---

## Modifications Required

### 1. New Imports

```typescript
// Add to existing imports
import {
  FallbackChain,
  CapturedAction,
  StrategyType,
  STRATEGY_WEIGHTS,
  LocatorStrategy
} from '../types/strategy';
import {
  RecordingState,
  RecordingConfig,
  RecordingMode,
  LayerStatus,
  LayerType,
  BufferStatus,
  DEFAULT_RECORDING_CONFIG
} from '../types/recording';
```

### 2. New Interfaces

```typescript
/**
 * Recorder component state
 */
interface RecorderState {
  /** Recording mode */
  mode: RecordingMode;
  /** Recording state */
  state: RecordingState;
  /** Session ID */
  sessionId: string | null;
  /** Layer statuses */
  layerStatuses: LayerStatus[];
  /** Buffer status */
  bufferStatus: BufferStatus | null;
  /** Recorded actions */
  actions: CapturedAction[];
  /** Selected action index for details */
  selectedAction: number | null;
  /** Error message */
  error: string | null;
}

/**
 * Recording controls state
 */
interface RecordingControls {
  /** Whether V2 recording is available */
  v2Available: boolean;
  /** Current recording mode preference */
  preferredMode: RecordingMode;
  /** Recording configuration */
  config: RecordingConfig;
  /** Whether config panel is open */
  configPanelOpen: boolean;
}

/**
 * Action display props
 */
interface ActionDisplayProps {
  /** The captured action */
  action: CapturedAction;
  /** Action index */
  index: number;
  /** Whether this action is selected */
  isSelected: boolean;
  /** Click handler */
  onClick: () => void;
  /** Whether to show compact view */
  compact: boolean;
}

/**
 * Layer toggle props
 */
interface LayerToggleProps {
  /** Layer type */
  layer: LayerType;
  /** Whether enabled */
  enabled: boolean;
  /** Layer status */
  status: LayerStatus | null;
  /** Toggle handler */
  onToggle: (enabled: boolean) => void;
  /** Whether recording is active */
  recordingActive: boolean;
}
```

### 3. New State Variables

```typescript
// Add to component state
const [recorderState, setRecorderState] = useState<RecorderState>({
  mode: 'idle',
  state: 'idle',
  sessionId: null,
  layerStatuses: [],
  bufferStatus: null,
  actions: [],
  selectedAction: null,
  error: null
});

const [controls, setControls] = useState<RecordingControls>({
  v2Available: true,
  preferredMode: 'v2',
  config: DEFAULT_RECORDING_CONFIG,
  configPanelOpen: false
});

const [isInitializing, setIsInitializing] = useState(false);
```

### 4. Recording Control Functions

```typescript
/**
 * Start V2 multi-layer recording
 */
async function startRecordingV2(): Promise<void> {
  setIsInitializing(true);
  setRecorderState(prev => ({ ...prev, error: null }));

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    // Send start message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'START_RECORDING_V2',
      payload: {
        config: controls.config
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to start recording');
    }

    setRecorderState(prev => ({
      ...prev,
      mode: 'v2',
      state: 'recording',
      sessionId: response.sessionId,
      actions: [],
      layerStatuses: response.layerStatuses || []
    }));

  } catch (error) {
    setRecorderState(prev => ({
      ...prev,
      error: error instanceof Error ? error.message : 'Failed to start recording'
    }));
  } finally {
    setIsInitializing(false);
  }
}

/**
 * Stop recording and get results
 */
async function stopRecording(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'STOP_RECORDING_V2'
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to stop recording');
    }

    setRecorderState(prev => ({
      ...prev,
      mode: 'idle',
      state: 'idle',
      actions: response.actions || prev.actions
    }));

  } catch (error) {
    setRecorderState(prev => ({
      ...prev,
      error: error instanceof Error ? error.message : 'Failed to stop recording'
    }));
  }
}

/**
 * Pause recording
 */
async function pauseRecording(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    await chrome.tabs.sendMessage(tab.id, {
      action: 'PAUSE_RECORDING_V2'
    });

    setRecorderState(prev => ({ ...prev, state: 'paused' }));

  } catch (error) {
    console.error('Failed to pause recording:', error);
  }
}

/**
 * Resume recording
 */
async function resumeRecording(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    await chrome.tabs.sendMessage(tab.id, {
      action: 'RESUME_RECORDING_V2'
    });

    setRecorderState(prev => ({ ...prev, state: 'recording' }));

  } catch (error) {
    console.error('Failed to resume recording:', error);
  }
}

/**
 * Toggle a capture layer
 */
async function toggleLayer(layer: LayerType, enabled: boolean): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    await chrome.tabs.sendMessage(tab.id, {
      action: 'TOGGLE_LAYER',
      payload: { layer, enabled }
    });

    // Update local config
    setControls(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [`enable${layer.charAt(0).toUpperCase() + layer.slice(1)}Capture`]: enabled
      }
    }));

  } catch (error) {
    console.error(`Failed to toggle ${layer} layer:`, error);
  }
}
```

### 5. Message Listener for Recording Updates

```typescript
/**
 * Listen for recording updates from content script
 */
useEffect(() => {
  function handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): boolean {
    switch (message.action) {
      case 'RECORDING_ACTION_V2':
        // New action recorded
        setRecorderState(prev => ({
          ...prev,
          actions: [...prev.actions, message.payload.action]
        }));
        break;

      case 'RECORDING_STATE_CHANGED':
        // State changed
        setRecorderState(prev => ({
          ...prev,
          state: message.payload.state
        }));
        break;

      case 'LAYER_STATUS_UPDATE':
        // Layer status changed
        setRecorderState(prev => ({
          ...prev,
          layerStatuses: message.payload.statuses
        }));
        break;

      case 'BUFFER_STATUS_UPDATE':
        // Buffer status changed
        setRecorderState(prev => ({
          ...prev,
          bufferStatus: message.payload.status
        }));
        break;

      case 'RECORDING_ERROR':
        // Error occurred
        setRecorderState(prev => ({
          ...prev,
          error: message.payload.error
        }));
        break;
    }
    return false;
  }

  chrome.runtime.onMessage.addListener(handleMessage);
  return () => chrome.runtime.onMessage.removeListener(handleMessage);
}, []);

/**
 * Poll for buffer/layer status during recording
 */
useEffect(() => {
  if (recorderState.state !== 'recording') return;

  const pollStatus = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'GET_BUFFER_STATS'
      });

      if (response.success) {
        setRecorderState(prev => ({
          ...prev,
          bufferStatus: response.bufferStatus,
          layerStatuses: response.layerStatuses
        }));
      }
    } catch (error) {
      // Tab might have closed
    }
  };

  const interval = setInterval(pollStatus, 2000);
  return () => clearInterval(interval);
}, [recorderState.state]);
```

### 6. Layer Status Display Component

```typescript
/**
 * Layer status indicator
 */
function LayerStatusIndicator({
  layer,
  status,
  onToggle,
  recordingActive
}: LayerToggleProps): JSX.Element {
  const layerInfo: Record<LayerType, { name: string; icon: string; description: string }> = {
    dom: {
      name: 'DOM',
      icon: '🌳',
      description: 'Element selectors and attributes'
    },
    vision: {
      name: 'Vision',
      icon: '👁️',
      description: 'OCR text recognition'
    },
    mouse: {
      name: 'Mouse',
      icon: '🖱️',
      description: 'Mouse movement patterns'
    },
    network: {
      name: 'Network',
      icon: '🌐',
      description: 'Request tracking'
    }
  };

  const info = layerInfo[layer];
  const isRequired = layer === 'dom';

  return (
    <div className={`layer-indicator ${status?.ready ? 'ready' : 'not-ready'}`}>
      <div className="layer-header">
        <span className="layer-icon">{info.icon}</span>
        <span className="layer-name">{info.name}</span>
        {status?.ready && <span className="ready-dot">●</span>}
      </div>

      <div className="layer-stats">
        {status && (
          <>
            <span className="capture-count">{status.captureCount} captures</span>
            {status.errorCount > 0 && (
              <span className="error-count">{status.errorCount} errors</span>
            )}
          </>
        )}
      </div>

      {!isRequired && (
        <label className="layer-toggle">
          <input
            type="checkbox"
            checked={status?.enabled ?? true}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={!recordingActive}
          />
          <span className="toggle-slider" />
        </label>
      )}

      {isRequired && (
        <span className="required-badge">Required</span>
      )}
    </div>
  );
}
```

### 7. Action Card Component

```typescript
/**
 * Display a recorded action with strategy info
 */
function ActionCard({
  action,
  index,
  isSelected,
  onClick,
  compact
}: ActionDisplayProps): JSX.Element {
  const primaryStrategy = action.fallbackChain.strategies[0];
  const strategyCount = action.fallbackChain.strategies.length;

  // Get display info
  const targetDisplay = action.domData.element.accessibleName ||
                        action.domData.element.textContent?.slice(0, 30) ||
                        action.domData.element.id ||
                        action.domData.selector.slice(0, 40);

  return (
    <div
      className={`action-card ${isSelected ? 'selected' : ''} ${compact ? 'compact' : ''}`}
      onClick={onClick}
    >
      <div className="action-index">{index + 1}</div>

      <div className="action-main">
        <div className="action-type-row">
          <span className={`action-type ${action.eventType}`}>
            {action.eventType}
          </span>
          {action.value && (
            <span className="action-value">"{action.value}"</span>
          )}
        </div>

        <div className="action-target" title={action.domData.selector}>
          {targetDisplay}
        </div>
      </div>

      <div className="action-strategies">
        <StrategyBadge type={primaryStrategy.type} size="small" />
        {strategyCount > 1 && (
          <span className="strategy-count">+{strategyCount - 1}</span>
        )}
      </div>

      {!compact && (
        <div className="action-layers">
          {action.domData && <span className="layer-dot dom" title="DOM">●</span>}
          {action.visionData && <span className="layer-dot vision" title="Vision">●</span>}
          {action.mouseData && <span className="layer-dot mouse" title="Mouse">●</span>}
          {action.networkData && <span className="layer-dot network" title="Network">●</span>}
        </div>
      )}
    </div>
  );
}
```

### 8. Action Details Panel

```typescript
/**
 * Detailed view of selected action
 */
function ActionDetailsPanel({
  action,
  onClose
}: {
  action: CapturedAction;
  onClose: () => void;
}): JSX.Element {
  const [activeTab, setActiveTab] = useState<'strategies' | 'dom' | 'vision' | 'mouse'>('strategies');

  return (
    <div className="action-details-panel">
      <div className="panel-header">
        <h3>Action Details</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="panel-tabs">
        <button
          className={activeTab === 'strategies' ? 'active' : ''}
          onClick={() => setActiveTab('strategies')}
        >
          Strategies ({action.fallbackChain.strategies.length})
        </button>
        <button
          className={activeTab === 'dom' ? 'active' : ''}
          onClick={() => setActiveTab('dom')}
        >
          DOM
        </button>
        {action.visionData && (
          <button
            className={activeTab === 'vision' ? 'active' : ''}
            onClick={() => setActiveTab('vision')}
          >
            Vision
          </button>
        )}
        {action.mouseData && (
          <button
            className={activeTab === 'mouse' ? 'active' : ''}
            onClick={() => setActiveTab('mouse')}
          >
            Mouse
          </button>
        )}
      </div>

      <div className="panel-content">
        {activeTab === 'strategies' && (
          <StrategiesTab chain={action.fallbackChain} />
        )}
        {activeTab === 'dom' && (
          <DOMDataTab data={action.domData} />
        )}
        {activeTab === 'vision' && action.visionData && (
          <VisionDataTab data={action.visionData} />
        )}
        {activeTab === 'mouse' && action.mouseData && (
          <MouseDataTab data={action.mouseData} />
        )}
      </div>
    </div>
  );
}

/**
 * Strategies tab content
 */
function StrategiesTab({ chain }: { chain: FallbackChain }): JSX.Element {
  return (
    <div className="strategies-tab">
      <p className="primary-info">
        Primary: <StrategyBadge type={chain.primaryStrategy} />
      </p>

      <div className="strategy-list">
        {chain.strategies.map((strategy, index) => (
          <div key={index} className="strategy-row">
            <span className="strategy-rank">#{index + 1}</span>
            <StrategyBadge type={strategy.type} />
            <span className="strategy-confidence">
              {(strategy.confidence * 100).toFixed(0)}%
            </span>
            {strategy.selector && (
              <code className="strategy-selector">{strategy.selector}</code>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * DOM data tab content
 */
function DOMDataTab({ data }: { data: CapturedAction['domData'] }): JSX.Element {
  return (
    <div className="dom-data-tab">
      <div className="data-section">
        <h4>Element</h4>
        <dl>
          <dt>Tag</dt>
          <dd>{data.element.tagName}</dd>
          {data.element.id && (
            <>
              <dt>ID</dt>
              <dd>{data.element.id}</dd>
            </>
          )}
          {data.element.role && (
            <>
              <dt>Role</dt>
              <dd>{data.element.role}</dd>
            </>
          )}
          {data.element.accessibleName && (
            <>
              <dt>Accessible Name</dt>
              <dd>{data.element.accessibleName}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="data-section">
        <h4>Selectors</h4>
        <dl>
          <dt>CSS</dt>
          <dd><code>{data.selector}</code></dd>
          <dt>XPath</dt>
          <dd><code>{data.xpath}</code></dd>
          {data.uniqueSelector && (
            <>
              <dt>Unique</dt>
              <dd><code>{data.uniqueSelector}</code></dd>
            </>
          )}
        </dl>
      </div>

      <div className="data-section">
        <h4>Position</h4>
        <dl>
          <dt>Click Point</dt>
          <dd>({data.x}, {data.y})</dd>
          <dt>Bounding Rect</dt>
          <dd>
            {data.boundingRect.width}×{data.boundingRect.height} at
            ({data.boundingRect.x}, {data.boundingRect.y})
          </dd>
        </dl>
      </div>
    </div>
  );
}

/**
 * Vision data tab content
 */
function VisionDataTab({ data }: { data: NonNullable<CapturedAction['visionData']> }): JSX.Element {
  return (
    <div className="vision-data-tab">
      {data.ocrText ? (
        <div className="data-section">
          <h4>OCR Result</h4>
          <p className="ocr-text">"{data.ocrText}"</p>
          <p className="ocr-confidence">
            Confidence: {data.confidence?.toFixed(0)}%
          </p>
          {data.textBbox && (
            <p className="text-position">
              Position: ({data.textBbox.x}, {data.textBbox.y})
              Size: {data.textBbox.width}×{data.textBbox.height}
            </p>
          )}
        </div>
      ) : (
        <p className="no-ocr">No OCR text captured</p>
      )}

      <div className="data-section">
        <h4>Processing</h4>
        <p>Time: {data.processingTime}ms</p>
        <p>OCR Performed: {data.ocrPerformed ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}

/**
 * Mouse data tab content
 */
function MouseDataTab({ data }: { data: NonNullable<CapturedAction['mouseData']> }): JSX.Element {
  return (
    <div className="mouse-data-tab">
      <div className="data-section">
        <h4>Trail Info</h4>
        <dl>
          <dt>Points</dt>
          <dd>{data.trail.length}</dd>
          <dt>Duration</dt>
          <dd>{data.duration}ms</dd>
          <dt>Distance</dt>
          <dd>{data.totalDistance.toFixed(0)}px</dd>
          <dt>Avg Velocity</dt>
          <dd>{data.averageVelocity.toFixed(0)}px/s</dd>
        </dl>
      </div>

      <div className="data-section">
        <h4>Pattern Analysis</h4>
        <dl>
          <dt>Pattern</dt>
          <dd className={`pattern-${data.pattern}`}>{data.pattern}</dd>
          <dt>Direction Changes</dt>
          <dd>{data.directionChanges}</dd>
          <dt>Curvature</dt>
          <dd>{(data.curvature * 100).toFixed(0)}%</dd>
          <dt>Hesitations</dt>
          <dd>{data.hesitationPoints.length}</dd>
        </dl>
      </div>

      <div className="data-section">
        <h4>Endpoint</h4>
        <p>({data.endpoint.x}, {data.endpoint.y})</p>
      </div>
    </div>
  );
}
```

### 9. Recording Configuration Panel

```typescript
/**
 * Recording configuration panel
 */
function RecordingConfigPanel({
  config,
  onChange,
  disabled
}: {
  config: RecordingConfig;
  onChange: (config: RecordingConfig) => void;
  disabled: boolean;
}): JSX.Element {
  return (
    <div className="recording-config-panel">
      <h4>Recording Configuration</h4>

      <div className="config-section">
        <h5>Capture Layers</h5>

        <div className="config-item checkbox">
          <input
            id="enableDOMCapture"
            type="checkbox"
            checked={config.enableDOMCapture}
            disabled={true}
          />
          <label htmlFor="enableDOMCapture">DOM Capture (Required)</label>
        </div>

        <div className="config-item checkbox">
          <input
            id="enableVisionCapture"
            type="checkbox"
            checked={config.enableVisionCapture}
            onChange={(e) => onChange({
              ...config,
              enableVisionCapture: e.target.checked
            })}
            disabled={disabled}
          />
          <label htmlFor="enableVisionCapture">Vision Capture (OCR)</label>
        </div>

        <div className="config-item checkbox">
          <input
            id="enableMouseCapture"
            type="checkbox"
            checked={config.enableMouseCapture}
            onChange={(e) => onChange({
              ...config,
              enableMouseCapture: e.target.checked
            })}
            disabled={disabled}
          />
          <label htmlFor="enableMouseCapture">Mouse Capture</label>
        </div>

        <div className="config-item checkbox">
          <input
            id="enableNetworkCapture"
            type="checkbox"
            checked={config.enableNetworkCapture}
            onChange={(e) => onChange({
              ...config,
              enableNetworkCapture: e.target.checked
            })}
            disabled={disabled}
          />
          <label htmlFor="enableNetworkCapture">Network Capture</label>
        </div>
      </div>

      <div className="config-section">
        <h5>Options</h5>

        <div className="config-item checkbox">
          <input
            id="immediateChainGeneration"
            type="checkbox"
            checked={config.immediateChainGeneration}
            onChange={(e) => onChange({
              ...config,
              immediateChainGeneration: e.target.checked
            })}
            disabled={disabled}
          />
          <label htmlFor="immediateChainGeneration">
            Generate chains immediately
          </label>
        </div>

        <div className="config-item checkbox">
          <input
            id="debug"
            type="checkbox"
            checked={config.debug}
            onChange={(e) => onChange({
              ...config,
              debug: e.target.checked
            })}
            disabled={disabled}
          />
          <label htmlFor="debug">Debug mode</label>
        </div>
      </div>
    </div>
  );
}
```

### 10. Main Recorder Controls

```typescript
/**
 * Main recording control bar
 */
function RecordingControlBar({
  state,
  mode,
  onStartV2,
  onStop,
  onPause,
  onResume,
  onConfigClick,
  isInitializing
}: {
  state: RecordingState;
  mode: RecordingMode;
  onStartV2: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onConfigClick: () => void;
  isInitializing: boolean;
}): JSX.Element {
  const isRecording = state === 'recording' || state === 'paused';
  const isPaused = state === 'paused';

  return (
    <div className="recording-control-bar">
      <div className="main-controls">
        {!isRecording ? (
          <button
            className="btn-record"
            onClick={onStartV2}
            disabled={isInitializing}
          >
            {isInitializing ? (
              <>
                <span className="spinner" />
                Initializing...
              </>
            ) : (
              <>
                <span className="record-icon">●</span>
                Record
              </>
            )}
          </button>
        ) : (
          <>
            {isPaused ? (
              <button className="btn-resume" onClick={onResume}>
                ▶ Resume
              </button>
            ) : (
              <button className="btn-pause" onClick={onPause}>
                ⏸ Pause
              </button>
            )}
            <button className="btn-stop" onClick={onStop}>
              ■ Stop
            </button>
          </>
        )}
      </div>

      <div className="status-section">
        {isRecording && (
          <div className={`recording-status ${isPaused ? 'paused' : 'active'}`}>
            <span className="status-dot" />
            <span className="status-text">
              {isPaused ? 'Paused' : 'Recording'}
            </span>
            <span className="mode-badge">V2</span>
          </div>
        )}
      </div>

      <button
        className="btn-config"
        onClick={onConfigClick}
        disabled={isRecording}
        title="Recording settings"
      >
        ⚙️
      </button>
    </div>
  );
}
```

---

## Integration Points

### With Content Script
```typescript
// Message types for content script communication
type RecorderMessage =
  | { action: 'START_RECORDING_V2'; payload: { config: RecordingConfig } }
  | { action: 'STOP_RECORDING_V2' }
  | { action: 'PAUSE_RECORDING_V2' }
  | { action: 'RESUME_RECORDING_V2' }
  | { action: 'TOGGLE_LAYER'; payload: { layer: LayerType; enabled: boolean } }
  | { action: 'GET_BUFFER_STATS' };
```

### With Background Script
```typescript
// Save recorded test
async function saveRecording(name: string): Promise<void> {
  await chrome.runtime.sendMessage({
    action: 'SAVE_RECORDING',
    payload: {
      name,
      actions: recorderState.actions,
      metadata: {
        recordedAt: Date.now(),
        version: 'v2',
        sessionId: recorderState.sessionId
      }
    }
  });
}
```

---

## Acceptance Criteria

- [ ] Start/Stop/Pause/Resume V2 recording works
- [ ] Layer status indicators display correctly
- [ ] Actions appear in list as recorded
- [ ] FallbackChain strategies shown per action
- [ ] Action details panel shows all layer data
- [ ] Layer toggles work during recording
- [ ] Buffer status updates displayed
- [ ] Configuration panel allows settings changes
- [ ] Error messages displayed clearly
- [ ] Backward compatible with V1 if needed
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Tab closes during recording**: Handle gracefully
2. **No active tab**: Show error, disable record
3. **Vision layer timeout**: Continue without vision
4. **Buffer overflow**: Warn user, prune old actions
5. **Navigation during recording**: Handle URL changes
6. **Rapid clicking**: Debounce captures
7. **Empty recording**: Warn on save
8. **Large action count**: Virtualize list
9. **Content script not injected**: Inject on demand
10. **Extension popup closes**: Recording continues

---

## Estimated Lines

500-600 lines modified/added
