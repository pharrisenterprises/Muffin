# RecordingOrchestrator Content Specification

**File ID:** A1  
**File Path:** `src/contentScript/RecordingOrchestrator.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Central coordinator for multi-layer evidence capture during recording sessions. Manages the lifecycle of all 4 capture layers (DOM, Vision, Mouse, Network), orchestrates parallel evidence collection when user performs actions, generates FallbackChains for each captured step, and coordinates with EvidenceBuffer for temporary storage. This is the brain of the recording system.

---

## Dependencies

### Uses (imports from)
- `./layers/DOMCapture`: DOMCapture class, DOMCaptureResult interface
- `./layers/VisionCapture`: VisionCapture class, VisionCaptureResult interface
- `./layers/MouseCapture`: MouseCapture class, MouseCaptureResult interface
- `./layers/NetworkCapture`: NetworkCapture class, NetworkCaptureResult interface
- `./EvidenceBuffer`: EvidenceBuffer class
- `../types/strategy`: StrategyType, LocatorStrategy, FallbackChain
- `../types/vision`: VisionConfig

### Used By (exports to)
- `./content.tsx`: Instantiates and controls orchestrator lifecycle
- `../background/background.ts`: Receives messages from orchestrator

---

## Interfaces
```typescript
/**
 * Configuration for the RecordingOrchestrator
 */
interface RecordingOrchestratorConfig {
  /** Enable vision/OCR capture layer */
  enableVision: boolean;
  /** Enable mouse trail tracking layer */
  enableMouse: boolean;
  /** Enable network request capture layer */
  enableNetwork: boolean;
  /** Vision-specific configuration */
  visionConfig: VisionConfig;
  /** Maximum buffer size in bytes (default: 73400320 = 70MB) */
  bufferSizeLimit: number;
  /** Tab ID being recorded */
  tabId: number;
}

/**
 * Result from DOM capture layer
 */
interface DOMCaptureResult {
  /** CSS selector for element */
  selector: string;
  /** XPath for element */
  xpath: string;
  /** Element tag name */
  tagName: string;
  /** Element ID if present */
  id?: string;
  /** Element classes */
  classList: string[];
  /** ARIA role if present */
  role?: string;
  /** Accessible name */
  accessibleName?: string;
  /** Element text content (truncated) */
  textContent?: string;
  /** Click coordinates relative to viewport */
  x: number;
  y: number;
  /** Element bounding rect */
  boundingRect: DOMRect;
  /** Attributes map */
  attributes: Record<string, string>;
}

/**
 * Result from Vision capture layer
 */
interface VisionCaptureResult {
  /** Screenshot as base64 data URL */
  screenshot: string;
  /** OCR extracted text near click point */
  ocrText?: string;
  /** OCR confidence (0-100) */
  confidence: number;
  /** Bounding box of detected text */
  textBbox?: { x: number; y: number; width: number; height: number };
  /** Raw Tesseract result (pruned on save) */
  rawOcrResult?: any;
}

/**
 * Result from Mouse capture layer
 */
interface MouseCaptureResult {
  /** Array of mouse positions leading to action */
  trail: Array<{ x: number; y: number; timestamp: number }>;
  /** Final click position */
  endpoint: { x: number; y: number };
  /** Trail duration in ms */
  duration: number;
}

/**
 * Result from Network capture layer
 */
interface NetworkCaptureResult {
  /** Recent network requests */
  recentRequests: Array<{
    url: string;
    method: string;
    status?: number;
    timestamp: number;
  }>;
  /** Pending requests at time of action */
  pendingCount: number;
}

/**
 * Complete captured action with all layer data
 */
interface CapturedAction {
  /** Unique action ID */
  id: string;
  /** Capture timestamp */
  timestamp: number;
  /** Event type */
  eventType: 'click' | 'type' | 'select' | 'navigate' | 'scroll';
  /** Input value for type events */
  value?: string;
  /** DOM layer data */
  domData: DOMCaptureResult;
  /** Vision layer data (if enabled) */
  visionData?: VisionCaptureResult;
  /** Mouse layer data (if enabled) */
  mouseData?: MouseCaptureResult;
  /** Network layer data (if enabled) */
  networkData?: NetworkCaptureResult;
  /** Generated fallback chain */
  fallbackChain: FallbackChain;
}

/**
 * Status of each capture layer
 */
interface LayerStatus {
  dom: 'idle' | 'ready' | 'capturing' | 'error';
  vision: 'idle' | 'ready' | 'capturing' | 'error' | 'disabled';
  mouse: 'idle' | 'ready' | 'capturing' | 'error' | 'disabled';
  network: 'idle' | 'ready' | 'capturing' | 'error' | 'disabled';
}

/**
 * Recording session state
 */
type RecordingState = 'idle' | 'starting' | 'recording' | 'paused' | 'stopping' | 'stopped';
```

---

## Functions
```typescript
/**
 * RecordingOrchestrator - Coordinates multi-layer evidence capture
 */
class RecordingOrchestrator {
  private config: RecordingOrchestratorConfig;
  private state: RecordingState;
  private domCapture: DOMCapture;
  private visionCapture: VisionCapture | null;
  private mouseCapture: MouseCapture | null;
  private networkCapture: NetworkCapture | null;
  private evidenceBuffer: EvidenceBuffer;
  private actionCallback: ((action: CapturedAction) => void) | null;

  /**
   * Create new RecordingOrchestrator instance
   * @param config - Orchestrator configuration
   */
  constructor(config: RecordingOrchestratorConfig);

  /**
   * Start all enabled capture layers
   * Initializes Tesseract worker if vision enabled (~2s)
   * @returns Promise resolving when all layers ready
   * @throws Error if any required layer fails to start
   */
  async start(): Promise<void>;

  /**
   * Stop all capture layers and return captured actions
   * Gracefully shuts down all layers
   * @returns Promise resolving to all captured actions
   */
  async stop(): Promise<CapturedAction[]>;

  /**
   * Pause recording (layers stay initialized but don't capture)
   */
  pause(): void;

  /**
   * Resume recording after pause
   */
  resume(): void;

  /**
   * Get current state of all layers
   * @returns Layer status object
   */
  getLayerStatus(): LayerStatus;

  /**
   * Get current recording state
   * @returns Recording state
   */
  getState(): RecordingState;

  /**
   * Enable a specific layer mid-recording
   * @param layer - Layer to enable
   */
  async enableLayer(layer: 'vision' | 'mouse' | 'network'): Promise<void>;

  /**
   * Disable a specific layer mid-recording
   * @param layer - Layer to disable
   */
  disableLayer(layer: 'vision' | 'mouse' | 'network'): void;

  /**
   * Register callback for captured actions
   * Called after each action is fully processed
   * @param callback - Function to call with captured action
   */
  onAction(callback: (action: CapturedAction) => void): void;

  /**
   * Capture a user action with all enabled layers
   * Called by DOMCapture when user event detected
   * @param event - Original DOM event
   * @param element - Target element
   * @returns Promise resolving to captured action
   */
  async captureAction(event: Event, element: HTMLElement): Promise<CapturedAction>;

  /**
   * Generate FallbackChain from captured evidence
   * Scores all strategies and orders by confidence
   * @param element - Target element
   * @param capturedData - Data from all layers
   * @returns Promise resolving to FallbackChain
   */
  async generateFallbackChain(
    element: HTMLElement,
    capturedData: {
      domData: DOMCaptureResult;
      visionData?: VisionCaptureResult;
      mouseData?: MouseCaptureResult;
      networkData?: NetworkCaptureResult;
    }
  ): Promise<FallbackChain>;

  /**
   * Get current buffer size in bytes
   * @returns Buffer size
   */
  getBufferSize(): number;

  /**
   * Prune buffer to stay under limit
   * Removes oldest screenshots first
   * @returns Promise resolving when prune complete
   */
  async pruneBuffer(): Promise<void>;

  /**
   * Export recording for save
   * Triggers aggressive prune before export
   * @returns Promise resolving to exportable recording data
   */
  async exportRecording(): Promise<{
    actions: CapturedAction[];
    metadata: {
      startTime: number;
      endTime: number;
      actionCount: number;
      layersUsed: string[];
    };
  }>;

  // Private helper methods
  private generateUniqueId(): string;
  private getEventType(event: Event): CapturedAction['eventType'];
  private extractValue(element: HTMLElement): string | undefined;
  private getImplicitRole(element: HTMLElement): string | null;
  private generateCssSelector(element: HTMLElement): string;
  private needsVision(element: HTMLElement): boolean;
  private isInShadowDOM(element: HTMLElement): boolean;
}

export { RecordingOrchestrator, RecordingOrchestratorConfig, CapturedAction, LayerStatus };
```

---

## Key Implementation Details

### Parallel Layer Capture
```typescript
async captureAction(event: Event, element: HTMLElement): Promise<CapturedAction> {
  const id = this.generateUniqueId();
  const timestamp = Date.now();
  
  // Capture from ALL enabled layers in parallel using Promise.all
  // This is critical for performance - layers don't block each other
  const [domData, visionData, mouseData, networkData] = await Promise.all([
    this.domCapture.capture(element),
    this.visionCapture?.capture() ?? Promise.resolve(undefined),
    this.mouseCapture?.getTrail() ?? Promise.resolve(undefined),
    this.networkCapture?.getRecent() ?? Promise.resolve(undefined)
  ]);
  
  // Generate fallback chain from combined evidence
  const fallbackChain = await this.generateFallbackChain(element, {
    domData, visionData, mouseData, networkData
  });
  
  const action: CapturedAction = {
    id,
    timestamp,
    eventType: this.getEventType(event),
    value: this.extractValue(element),
    domData,
    visionData,
    mouseData,
    networkData,
    fallbackChain
  };
  
  // Store in buffer
  await this.evidenceBuffer.store(action);
  
  // Notify callback
  if (this.actionCallback) {
    this.actionCallback(action);
  }
  
  return action;
}
```

### FallbackChain Generation with 7-Tier Scoring
```typescript
async generateFallbackChain(element: HTMLElement, data: {...}): Promise<FallbackChain> {
  const strategies: LocatorStrategy[] = [];
  
  // 1. CDP Semantic (highest confidence: 0.95)
  const role = element.getAttribute('role') || this.getImplicitRole(element);
  const name = data.domData.accessibleName || element.textContent?.trim().slice(0, 50);
  if (role) {
    strategies.push({
      type: 'cdp_semantic',
      confidence: 0.95,
      metadata: { role, name }
    });
  }
  
  // 2. CDP Power (confidence: 0.90)
  const text = element.textContent?.trim();
  const label = element.getAttribute('aria-label') || 
                document.querySelector(`label[for="${element.id}"]`)?.textContent;
  const placeholder = element.getAttribute('placeholder');
  
  if (text && text.length < 100) {
    strategies.push({
      type: 'cdp_power',
      confidence: 0.90,
      metadata: { text, label, placeholder }
    });
  }
  
  // 3. DOM Selector (confidence: 0.85)
  if (element.id) {
    strategies.push({
      type: 'dom_selector',
      selector: `#${CSS.escape(element.id)}`,
      confidence: 0.85
    });
  } else if (data.domData.selector) {
    strategies.push({
      type: 'dom_selector',
      selector: data.domData.selector,
      confidence: 0.80
    });
  }
  
  // 4. CSS Selector (confidence: 0.75)
  strategies.push({
    type: 'css_selector',
    selector: this.generateCssSelector(element),
    confidence: 0.75
  });
  
  // 5. Evidence Scoring (confidence: 0.80)
  if (data.mouseData) {
    strategies.push({
      type: 'evidence_scoring',
      confidence: 0.80,
      metadata: {
        mouseTrail: data.mouseData.trail,
        endpoint: data.mouseData.endpoint,
        attributes: data.domData.attributes
      }
    });
  }
  
  // 6. Vision OCR (confidence: based on OCR confidence)
  if (data.visionData?.ocrText && data.visionData.confidence >= 60) {
    strategies.push({
      type: 'vision_ocr',
      confidence: data.visionData.confidence / 100, // Normalize to 0-1
      metadata: {
        targetText: data.visionData.ocrText,
        textBbox: data.visionData.textBbox
      }
    });
  }
  
  // 7. Coordinates (lowest confidence: 0.60)
  strategies.push({
    type: 'coordinates',
    confidence: 0.60,
    metadata: {
      x: data.domData.x,
      y: data.domData.y
    }
  });
  
  // Sort by confidence (highest first)
  strategies.sort((a, b) => b.confidence - a.confidence);
  
  return {
    strategies,
    primaryStrategy: strategies[0].type,
    recordedAt: Date.now()
  };
}
```

### Implicit Role Detection
```typescript
private getImplicitRole(element: HTMLElement): string | null {
  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute('type')?.toLowerCase();
  
  const roleMap: Record<string, string> = {
    'button': 'button',
    'a': 'link',
    'input': type === 'checkbox' ? 'checkbox' : 
             type === 'radio' ? 'radio' :
             type === 'submit' ? 'button' : 'textbox',
    'select': 'combobox',
    'textarea': 'textbox',
    'img': 'img',
    'nav': 'navigation',
    'main': 'main',
    'header': 'banner',
    'footer': 'contentinfo',
    'aside': 'complementary',
    'article': 'article',
    'section': 'region',
    'form': 'form',
    'table': 'table',
    'ul': 'list',
    'ol': 'list',
    'li': 'listitem'
  };
  
  return roleMap[tagName] || null;
}
```

### Error Handling - Graceful Degradation
```typescript
async captureAction(event: Event, element: HTMLElement): Promise<CapturedAction> {
  // DOM capture is required - throw if it fails
  let domData: DOMCaptureResult;
  try {
    domData = await this.domCapture.capture(element);
  } catch (error) {
    console.error('[Orchestrator] DOM capture failed:', error);
    throw new Error('Required DOM capture failed');
  }
  
  // Other layers are optional - log errors but continue
  let visionData: VisionCaptureResult | undefined;
  let mouseData: MouseCaptureResult | undefined;
  let networkData: NetworkCaptureResult | undefined;
  
  try {
    visionData = await this.visionCapture?.capture();
  } catch (error) {
    console.warn('[Orchestrator] Vision capture failed:', error);
    // Continue without vision data
  }
  
  try {
    mouseData = await this.mouseCapture?.getTrail();
  } catch (error) {
    console.warn('[Orchestrator] Mouse capture failed:', error);
    // Continue without mouse data
  }
  
  try {
    networkData = await this.networkCapture?.getRecent();
  } catch (error) {
    console.warn('[Orchestrator] Network capture failed:', error);
    // Continue without network data
  }
  
  // Generate fallback chain with available data
  const fallbackChain = await this.generateFallbackChain(element, {
    domData, visionData, mouseData, networkData
  });
  
  // ... rest of method
}
```

---

## Integration Points

### With content.tsx (Recording Start/Stop)
```typescript
// In content.tsx
let orchestrator: RecordingOrchestrator | null = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_RECORDING_V2') {
    orchestrator = new RecordingOrchestrator({
      enableVision: message.config?.enableVision ?? true,
      enableMouse: message.config?.enableMouse ?? true,
      enableNetwork: message.config?.enableNetwork ?? false,
      visionConfig: message.config?.visionConfig ?? { enabled: true, confidenceThreshold: 60 },
      bufferSizeLimit: 73400320, // 70MB
      tabId: message.tabId
    });
    
    orchestrator.onAction((action) => {
      chrome.runtime.sendMessage({
        type: 'RECORDING_ACTION',
        action
      });
    });
    
    orchestrator.start().then(() => sendResponse({ success: true }));
    return true; // Async response
  }
  
  if (message.action === 'STOP_RECORDING_V2') {
    orchestrator?.stop().then((actions) => {
      sendResponse({ success: true, actions });
      orchestrator = null;
    });
    return true;
  }
});
```

### With background.ts (Message Passing)
```typescript
// In background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RECORDING_ACTION') {
    // Forward to Recorder.tsx
    chrome.runtime.sendMessage({
      type: 'log_event',
      data: {
        eventType: message.action.eventType,
        xpath: message.action.domData.xpath,
        value: message.action.value,
        label: message.action.domData.accessibleName,
        bundle: message.action.domData,
        fallbackChain: message.action.fallbackChain
      }
    });
  }
});
```

### With EvidenceBuffer (Storage)
```typescript
// Orchestrator stores each action
await this.evidenceBuffer.store(action);

// On recording stop, export and prune
const { actions } = await this.evidenceBuffer.exportForSave();
```

---

## Acceptance Criteria

- [ ] All 4 layers (DOM, Vision, Mouse, Network) start in parallel when start() called
- [ ] Vision layer initializes Tesseract worker (~2s) without blocking DOM capture
- [ ] Each user action captures data from all enabled layers using Promise.all
- [ ] FallbackChain generated with all 7 strategy types when data available
- [ ] Strategies sorted by confidence (highest first)
- [ ] Buffer size tracked and auto-prunes at 90% capacity
- [ ] Graceful degradation: recording continues if optional layer fails
- [ ] DOM layer failure throws error (required layer)
- [ ] onAction callback fires after each captured action
- [ ] exportRecording() returns pruned, saveable data
- [ ] TypeScript compiles with strict mode, 0 errors
- [ ] Works in shadow DOM contexts
- [ ] Works across iframe boundaries

---

## Edge Cases

1. **Shadow DOM**: Check if element is in shadow root, enable vision capture automatically
2. **Iframe**: Capture iframe chain context in DOM data
3. **Canvas elements**: Force vision capture for canvas clicks
4. **Rapid clicks**: Debounce captures within 50ms
5. **Page unload**: Gracefully stop and export before page navigates
6. **Memory pressure**: Auto-prune when approaching buffer limit
7. **Tesseract timeout**: 5s timeout on OCR, continue without vision data

---

## Estimated Lines

350-450 lines
