# content.tsx Modification Specification

**File ID:** A7  
**File Path:** `src/contentScript/content.tsx`  
**Status:** MODIFY (existing file)  
**Priority:** P0

---

## Purpose

Modify the existing content script entry point to integrate the new RecordingOrchestrator and multi-layer capture system. This file currently handles basic DOM event capture and needs to be enhanced to coordinate all 4 capture layers (DOM, Vision, Mouse, Network), manage the V2 recording lifecycle, and communicate with the background script using new message types. The modification preserves backward compatibility with existing V1 recordings while enabling V2 features.

---

## Dependencies

### New Imports to Add
- `./RecordingOrchestrator`: RecordingOrchestrator, RecordingOrchestratorConfig, CapturedAction
- `./EvidenceBuffer`: EvidenceBuffer (for direct access if needed)
- `../types/strategy`: FallbackChain, StrategyType
- `../types/vision`: VisionConfig

### Existing Imports (Keep)
- React, ReactDOM
- Existing UI components
- Chrome runtime messaging

### Used By
- `../background/background.ts`: Sends START/STOP recording messages
- `../pages/Recorder.tsx`: Receives captured action events

---

## Current File Analysis

The existing `content.tsx` likely contains:
- Basic click/input event listeners
- Simple selector generation
- Message passing to background script
- Possibly some UI overlay for recording indicator

**What to Preserve:**
- Existing message handler structure
- Recording indicator UI (if present)
- Basic compatibility mode for V1 recordings

**What to Replace/Enhance:**
- Event capture logic → Delegate to RecordingOrchestrator
- Selector generation → Use FallbackChain from orchestrator
- Single-layer capture → Multi-layer parallel capture

---

## Modifications Required

### 1. New State Variables

```typescript
// Add at module level
let orchestrator: RecordingOrchestrator | null = null;
let isRecordingV2: boolean = false;
let recordingConfig: RecordingOrchestratorConfig | null = null;

// Recording mode: 'v1' for legacy, 'v2' for new multi-layer
let recordingMode: 'v1' | 'v2' | 'idle' = 'idle';
```

### 2. New Message Handlers

```typescript
// Add these message handlers to the existing chrome.runtime.onMessage listener

// V2 Recording Start
if (message.action === 'START_RECORDING_V2') {
  handleStartRecordingV2(message, sendResponse);
  return true; // Async response
}

// V2 Recording Stop
if (message.action === 'STOP_RECORDING_V2') {
  handleStopRecordingV2(sendResponse);
  return true; // Async response
}

// V2 Recording Pause
if (message.action === 'PAUSE_RECORDING_V2') {
  handlePauseRecordingV2(sendResponse);
  return false;
}

// V2 Recording Resume
if (message.action === 'RESUME_RECORDING_V2') {
  handleResumeRecordingV2(sendResponse);
  return false;
}

// Get buffer stats
if (message.action === 'GET_BUFFER_STATS') {
  handleGetBufferStats(sendResponse);
  return false;
}

// Get layer status
if (message.action === 'GET_LAYER_STATUS') {
  handleGetLayerStatus(sendResponse);
  return false;
}

// Enable/disable layer mid-recording
if (message.action === 'TOGGLE_LAYER') {
  handleToggleLayer(message, sendResponse);
  return true; // Async response
}

// Screenshot capture request (from VisionCapture)
if (message.action === 'CAPTURE_SCREENSHOT') {
  // Forward to background script
  chrome.runtime.sendMessage(message, sendResponse);
  return true;
}
```

### 3. Handler Implementations

```typescript
/**
 * Start V2 multi-layer recording
 */
async function handleStartRecordingV2(
  message: {
    action: string;
    tabId: number;
    config?: Partial<RecordingOrchestratorConfig>;
  },
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    // Don't start if already recording
    if (recordingMode !== 'idle') {
      sendResponse({ 
        success: false, 
        error: `Already recording in ${recordingMode} mode` 
      });
      return;
    }

    // Build configuration with defaults
    const config: RecordingOrchestratorConfig = {
      enableVision: message.config?.enableVision ?? true,
      enableMouse: message.config?.enableMouse ?? true,
      enableNetwork: message.config?.enableNetwork ?? false,
      visionConfig: message.config?.visionConfig ?? {
        enabled: true,
        confidenceThreshold: 60,
        pollIntervalMs: 1000,
        language: 'eng'
      },
      bufferSizeLimit: message.config?.bufferSizeLimit ?? 73400320, // 70MB
      tabId: message.tabId
    };

    // Create orchestrator
    orchestrator = new RecordingOrchestrator(config);
    recordingConfig = config;

    // Set up action callback
    orchestrator.onAction((action: CapturedAction) => {
      // Forward to background/Recorder.tsx
      chrome.runtime.sendMessage({
        type: 'RECORDING_ACTION_V2',
        action: {
          id: action.id,
          timestamp: action.timestamp,
          eventType: action.eventType,
          value: action.value,
          domData: action.domData,
          fallbackChain: action.fallbackChain,
          // Include vision/mouse summary (not full data)
          hasVision: !!action.visionData,
          hasMouse: !!action.mouseData,
          hasNetwork: !!action.networkData,
          visionConfidence: action.visionData?.confidence,
          mousePattern: action.mouseData?.pattern
        }
      });

      // Also send legacy format for backward compatibility
      chrome.runtime.sendMessage({
        type: 'log_event',
        data: {
          eventType: action.eventType,
          xpath: action.domData.xpath,
          value: action.value,
          label: action.domData.accessibleName,
          bundle: action.domData,
          fallbackChain: action.fallbackChain
        }
      });
    });

    // Start the orchestrator (initializes Tesseract ~2s)
    console.log('[content.tsx] Starting V2 recording...');
    await orchestrator.start();

    recordingMode = 'v2';
    isRecordingV2 = true;

    // Show recording indicator
    showRecordingIndicator('v2');

    console.log('[content.tsx] V2 recording started');
    sendResponse({ success: true, mode: 'v2' });

  } catch (error) {
    console.error('[content.tsx] Failed to start V2 recording:', error);
    orchestrator = null;
    recordingMode = 'idle';
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Stop V2 recording and return captured actions
 */
async function handleStopRecordingV2(
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    if (!orchestrator || recordingMode !== 'v2') {
      sendResponse({ 
        success: false, 
        error: 'Not recording in V2 mode' 
      });
      return;
    }

    console.log('[content.tsx] Stopping V2 recording...');
    const actions = await orchestrator.stop();

    // Hide recording indicator
    hideRecordingIndicator();

    // Clean up
    orchestrator = null;
    recordingConfig = null;
    recordingMode = 'idle';
    isRecordingV2 = false;

    console.log(`[content.tsx] V2 recording stopped, captured ${actions.length} actions`);
    sendResponse({ 
      success: true, 
      actions,
      actionCount: actions.length 
    });

  } catch (error) {
    console.error('[content.tsx] Failed to stop V2 recording:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Pause V2 recording
 */
function handlePauseRecordingV2(sendResponse: (response: any) => void): void {
  if (!orchestrator || recordingMode !== 'v2') {
    sendResponse({ success: false, error: 'Not recording in V2 mode' });
    return;
  }

  orchestrator.pause();
  updateRecordingIndicator('paused');
  sendResponse({ success: true, state: 'paused' });
}

/**
 * Resume V2 recording
 */
function handleResumeRecordingV2(sendResponse: (response: any) => void): void {
  if (!orchestrator || recordingMode !== 'v2') {
    sendResponse({ success: false, error: 'Not recording in V2 mode' });
    return;
  }

  orchestrator.resume();
  updateRecordingIndicator('recording');
  sendResponse({ success: true, state: 'recording' });
}

/**
 * Get buffer statistics
 */
function handleGetBufferStats(sendResponse: (response: any) => void): void {
  if (!orchestrator) {
    sendResponse({ stats: null });
    return;
  }

  sendResponse({
    stats: {
      bufferSize: orchestrator.getBufferSize(),
      state: orchestrator.getState(),
      layerStatus: orchestrator.getLayerStatus()
    }
  });
}

/**
 * Get layer status
 */
function handleGetLayerStatus(sendResponse: (response: any) => void): void {
  if (!orchestrator) {
    sendResponse({ status: null });
    return;
  }

  sendResponse({
    status: orchestrator.getLayerStatus()
  });
}

/**
 * Toggle a capture layer mid-recording
 */
async function handleToggleLayer(
  message: { layer: 'vision' | 'mouse' | 'network'; enabled: boolean },
  sendResponse: (response: any) => void
): Promise<void> {
  if (!orchestrator) {
    sendResponse({ success: false, error: 'Not recording' });
    return;
  }

  try {
    if (message.enabled) {
      await orchestrator.enableLayer(message.layer);
    } else {
      orchestrator.disableLayer(message.layer);
    }
    sendResponse({ success: true, layer: message.layer, enabled: message.enabled });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to toggle layer' 
    });
  }
}
```

### 4. Recording Indicator UI

```typescript
/**
 * Show recording indicator overlay
 */
function showRecordingIndicator(mode: 'v1' | 'v2'): void {
  // Remove existing indicator if any
  hideRecordingIndicator();

  const indicator = document.createElement('div');
  indicator.id = 'muffin-recording-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 2147483647;
    background: ${mode === 'v2' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
  `;

  // Pulsing dot
  const dot = document.createElement('span');
  dot.style.cssText = `
    width: 10px;
    height: 10px;
    background: white;
    border-radius: 50%;
    animation: muffin-pulse 1s infinite;
  `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes muffin-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);

  indicator.appendChild(dot);
  indicator.appendChild(document.createTextNode(
    mode === 'v2' ? 'Recording (V2)' : 'Recording'
  ));

  document.body.appendChild(indicator);
}

/**
 * Update recording indicator state
 */
function updateRecordingIndicator(state: 'recording' | 'paused'): void {
  const indicator = document.getElementById('muffin-recording-indicator');
  if (!indicator) return;

  if (state === 'paused') {
    indicator.style.background = '#FF9800';
    indicator.querySelector('span')?.style.setProperty('animation', 'none');
    indicator.childNodes[1].textContent = 'Paused';
  } else {
    indicator.style.background = '#4CAF50';
    indicator.querySelector('span')?.style.setProperty('animation', 'muffin-pulse 1s infinite');
    indicator.childNodes[1].textContent = 'Recording (V2)';
  }
}

/**
 * Hide recording indicator
 */
function hideRecordingIndicator(): void {
  const indicator = document.getElementById('muffin-recording-indicator');
  if (indicator) {
    indicator.remove();
  }

  // Also remove animation style
  const styles = document.querySelectorAll('style');
  styles.forEach(style => {
    if (style.textContent?.includes('muffin-pulse')) {
      style.remove();
    }
  });
}
```

### 5. Page Unload Handler

```typescript
/**
 * Handle page unload - save recording state
 */
window.addEventListener('beforeunload', () => {
  if (orchestrator && recordingMode === 'v2') {
    // Notify background script that recording may be interrupted
    chrome.runtime.sendMessage({
      type: 'RECORDING_PAGE_UNLOAD',
      state: orchestrator.getState(),
      actionCount: orchestrator.getBufferSize()
    });
  }
});

/**
 * Handle visibility change - pause when tab hidden (optional)
 */
document.addEventListener('visibilitychange', () => {
  if (orchestrator && recordingMode === 'v2') {
    if (document.hidden) {
      // Optionally pause when tab is hidden
      // orchestrator.pause();
      console.log('[content.tsx] Tab hidden during recording');
    } else {
      // orchestrator.resume();
      console.log('[content.tsx] Tab visible during recording');
    }
  }
});
```

### 6. Backward Compatibility

```typescript
/**
 * Keep existing V1 recording handlers for backward compatibility
 * These handle the legacy 'START_RECORDING' and 'STOP_RECORDING' messages
 */

// Existing handler (KEEP - do not remove)
if (message.action === 'START_RECORDING') {
  // Legacy V1 recording - use existing implementation
  recordingMode = 'v1';
  // ... existing V1 logic ...
  sendResponse({ success: true, mode: 'v1' });
  return false;
}

if (message.action === 'STOP_RECORDING') {
  // Legacy V1 recording stop
  recordingMode = 'idle';
  // ... existing V1 logic ...
  sendResponse({ success: true });
  return false;
}
```

---

## Integration Points

### With Background Script
```typescript
// background.ts needs to handle new messages:
// - RECORDING_ACTION_V2: Forward to Recorder.tsx
// - RECORDING_PAGE_UNLOAD: Handle navigation during recording
// - CAPTURE_SCREENSHOT: chrome.tabs.captureVisibleTab
```

### With Recorder.tsx
```typescript
// Recorder.tsx receives:
// - RECORDING_ACTION_V2: Display captured step with fallback chain
// - Buffer stats updates: Display capacity indicator
// - Layer status: Show which layers are active
```

---

## Complete Modified Message Listener

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ===== V2 Recording Messages =====
  if (message.action === 'START_RECORDING_V2') {
    handleStartRecordingV2(message, sendResponse);
    return true;
  }

  if (message.action === 'STOP_RECORDING_V2') {
    handleStopRecordingV2(sendResponse);
    return true;
  }

  if (message.action === 'PAUSE_RECORDING_V2') {
    handlePauseRecordingV2(sendResponse);
    return false;
  }

  if (message.action === 'RESUME_RECORDING_V2') {
    handleResumeRecordingV2(sendResponse);
    return false;
  }

  if (message.action === 'GET_BUFFER_STATS') {
    handleGetBufferStats(sendResponse);
    return false;
  }

  if (message.action === 'GET_LAYER_STATUS') {
    handleGetLayerStatus(sendResponse);
    return false;
  }

  if (message.action === 'TOGGLE_LAYER') {
    handleToggleLayer(message, sendResponse);
    return true;
  }

  // ===== V1 Legacy Messages (KEEP) =====
  if (message.action === 'START_RECORDING') {
    // Existing V1 implementation
    recordingMode = 'v1';
    showRecordingIndicator('v1');
    // ... rest of V1 logic ...
    return false;
  }

  if (message.action === 'STOP_RECORDING') {
    // Existing V1 implementation
    recordingMode = 'idle';
    hideRecordingIndicator();
    // ... rest of V1 logic ...
    return false;
  }

  // ===== Playback Messages (KEEP) =====
  // ... existing playback handlers ...

  return false;
});
```

---

## Acceptance Criteria

- [ ] START_RECORDING_V2 creates and starts RecordingOrchestrator
- [ ] STOP_RECORDING_V2 stops orchestrator and returns actions
- [ ] PAUSE/RESUME_RECORDING_V2 work correctly
- [ ] GET_BUFFER_STATS returns accurate buffer information
- [ ] GET_LAYER_STATUS returns all 4 layer statuses
- [ ] TOGGLE_LAYER enables/disables layers mid-recording
- [ ] Recording indicator shows correct state (recording/paused)
- [ ] Backward compatibility: V1 recording still works
- [ ] Both V1 and V2 action formats sent for compatibility
- [ ] Page unload notifies background script
- [ ] No duplicate event listeners on multiple start/stop cycles
- [ ] TypeScript compiles with strict mode, 0 errors
- [ ] Memory cleaned up on stop

---

## Edge Cases

1. **Double start**: Reject if already recording
2. **Stop without start**: Return error gracefully
3. **Mode switching**: Cannot switch V1→V2 mid-recording
4. **Tab navigation**: Handle page unload during recording
5. **Extension reload**: Recording state lost, handle gracefully
6. **Multiple tabs**: Each tab has independent recording state
7. **Iframe content**: Content script runs in each frame
8. **Shadow DOM**: Orchestrator handles via DOMCapture

---

## Estimated Lines of Changes

150-200 lines added/modified
