# MUFFIN LITE - API CONTRACTS SPECIFICATION

> **Version:** 2.1 | **Status:** Specification  
> **Purpose:** Define internal APIs, message formats, and communication contracts

---

## OVERVIEW

Muffin Lite uses Chrome Extension message passing for all cross-context communication. This document defines the contracts between:

1. **Extension Pages** ↔ **Background Script**
2. **Background Script** ↔ **Content Scripts**
3. **Content Scripts** ↔ **Vision Engine**

---

## MESSAGE ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTENSION PAGES                               │
│              (Recorder, TestRunner, FieldMapper)                     │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                    chrome.runtime.sendMessage
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKGROUND SCRIPT                               │
│                    (Message Router + DB)                             │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                    chrome.tabs.sendMessage
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       CONTENT SCRIPTS                                │
│              (Recorder, Replayer, Vision Handlers)                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## MESSAGE TYPE DEFINITIONS

### Base Message Interface

```typescript
/**
 * Base interface for all messages
 */
interface BaseMessage {
  /** Unique message type identifier */
  type: string;
  
  /** Optional correlation ID for request/response matching */
  correlationId?: string;
  
  /** Timestamp when message was created */
  timestamp?: number;
}

/**
 * Base interface for all responses
 */
interface BaseResponse {
  /** Whether the operation succeeded */
  success: boolean;
  
  /** Error message if success is false */
  error?: string;
  
  /** Correlation ID from request */
  correlationId?: string;
}
```

---

## EXTENSION PAGE → BACKGROUND MESSAGES

### Recording Operations

```typescript
// ===== START RECORDING =====

interface StartRecordingMessage extends BaseMessage {
  type: 'START_RECORDING';
  payload: {
    tabId: number;
    recordingId?: number;  // Existing recording to append to
  };
}

interface StartRecordingResponse extends BaseResponse {
  data?: {
    sessionId: string;
  };
}

// ===== STOP RECORDING =====

interface StopRecordingMessage extends BaseMessage {
  type: 'STOP_RECORDING';
  payload: {
    tabId: number;
  };
}

interface StopRecordingResponse extends BaseResponse {
  data?: {
    steps: Step[];
    duration: number;
  };
}

// ===== SAVE RECORDING =====

interface SaveRecordingMessage extends BaseMessage {
  type: 'SAVE_RECORDING';
  payload: {
    recording: Omit<Recording, 'id'>;
  };
}

interface SaveRecordingResponse extends BaseResponse {
  data?: {
    id: number;
  };
}

// ===== UPDATE RECORDING =====

interface UpdateRecordingMessage extends BaseMessage {
  type: 'UPDATE_RECORDING';
  payload: {
    id: number;
    changes: Partial<Recording>;
  };
}

interface UpdateRecordingResponse extends BaseResponse {
  data?: {
    recording: Recording;
  };
}

// ===== GET RECORDING =====

interface GetRecordingMessage extends BaseMessage {
  type: 'GET_RECORDING';
  payload: {
    id: number;
  };
}

interface GetRecordingResponse extends BaseResponse {
  data?: {
    recording: Recording;
  };
}

// ===== DELETE RECORDING =====

interface DeleteRecordingMessage extends BaseMessage {
  type: 'DELETE_RECORDING';
  payload: {
    id: number;
  };
}

interface DeleteRecordingResponse extends BaseResponse {}
```

### Step Operations

```typescript
// ===== ADD STEP =====

interface AddStepMessage extends BaseMessage {
  type: 'ADD_STEP';
  payload: {
    recordingId: number;
    step: Step;
  };
}

interface AddStepResponse extends BaseResponse {}

// ===== UPDATE STEP =====

interface UpdateStepMessage extends BaseMessage {
  type: 'UPDATE_STEP';
  payload: {
    recordingId: number;
    stepId: string;
    changes: Partial<Step>;
  };
}

interface UpdateStepResponse extends BaseResponse {}

// ===== DELETE STEP =====

interface DeleteStepMessage extends BaseMessage {
  type: 'DELETE_STEP';
  payload: {
    recordingId: number;
    stepId: string;
  };
}

interface DeleteStepResponse extends BaseResponse {}

// ===== REORDER STEPS =====

interface ReorderStepsMessage extends BaseMessage {
  type: 'REORDER_STEPS';
  payload: {
    recordingId: number;
    stepIds: string[];  // New order
  };
}

interface ReorderStepsResponse extends BaseResponse {}

// ===== SET STEP DELAY =====

interface SetStepDelayMessage extends BaseMessage {
  type: 'SET_STEP_DELAY';
  payload: {
    recordingId: number;
    stepId: string;
    delaySeconds: number;
  };
}

interface SetStepDelayResponse extends BaseResponse {}

// ===== SET STEP CONDITIONAL CONFIG =====

interface SetStepConditionalMessage extends BaseMessage {
  type: 'SET_STEP_CONDITIONAL';
  payload: {
    recordingId: number;
    stepId: string;
    conditionalConfig: ConditionalConfig;
  };
}

interface SetStepConditionalResponse extends BaseResponse {}
```

### Loop and Delay Configuration

```typescript
// ===== SET LOOP START =====

interface SetLoopStartMessage extends BaseMessage {
  type: 'SET_LOOP_START';
  payload: {
    recordingId: number;
    loopStartIndex: number;
  };
}

interface SetLoopStartResponse extends BaseResponse {}

// ===== SET GLOBAL DELAY =====

interface SetGlobalDelayMessage extends BaseMessage {
  type: 'SET_GLOBAL_DELAY';
  payload: {
    recordingId: number;
    globalDelayMs: number;
  };
}

interface SetGlobalDelayResponse extends BaseResponse {}

// ===== SET CONDITIONAL DEFAULTS =====

interface SetConditionalDefaultsMessage extends BaseMessage {
  type: 'SET_CONDITIONAL_DEFAULTS';
  payload: {
    recordingId: number;
    defaults: {
      searchTerms: string[];
      timeoutSeconds: number;
    };
  };
}

interface SetConditionalDefaultsResponse extends BaseResponse {}
```

### CSV Operations

```typescript
// ===== SAVE CSV DATA =====

interface SaveCSVDataMessage extends BaseMessage {
  type: 'SAVE_CSV_DATA';
  payload: {
    recordingId: number;
    parsedFields: ParsedField[];
    csvData: Record<string, string>[];
  };
}

interface SaveCSVDataResponse extends BaseResponse {}

// ===== GET CSV DATA =====

interface GetCSVDataMessage extends BaseMessage {
  type: 'GET_CSV_DATA';
  payload: {
    recordingId: number;
  };
}

interface GetCSVDataResponse extends BaseResponse {
  data?: {
    parsedFields: ParsedField[];
    csvData: Record<string, string>[];
  };
}
```

### Playback Operations

```typescript
// ===== START PLAYBACK =====

interface StartPlaybackMessage extends BaseMessage {
  type: 'START_PLAYBACK';
  payload: {
    recordingId: number;
    options?: {
      startFromRow?: number;
      endAtRow?: number;
      skipSteps?: string[];
    };
  };
}

interface StartPlaybackResponse extends BaseResponse {
  data?: {
    testRunId: number;
  };
}

// ===== STOP PLAYBACK =====

interface StopPlaybackMessage extends BaseMessage {
  type: 'STOP_PLAYBACK';
  payload: {
    testRunId: number;
  };
}

interface StopPlaybackResponse extends BaseResponse {}

// ===== GET PLAYBACK STATUS =====

interface GetPlaybackStatusMessage extends BaseMessage {
  type: 'GET_PLAYBACK_STATUS';
  payload: {
    testRunId: number;
  };
}

interface GetPlaybackStatusResponse extends BaseResponse {
  data?: {
    status: TestRunStatus;
    currentRow: number;
    currentStep: number;
    successfulSteps: number;
    failedSteps: number;
  };
}
```

### Tab Operations

```typescript
// ===== OPEN TAB =====

interface OpenTabMessage extends BaseMessage {
  type: 'OPEN_TAB';
  payload: {
    url: string;
    active?: boolean;
  };
}

interface OpenTabResponse extends BaseResponse {
  data?: {
    tabId: number;
  };
}

// ===== CLOSE TAB =====

interface CloseTabMessage extends BaseMessage {
  type: 'CLOSE_TAB';
  payload: {
    tabId: number;
  };
}

interface CloseTabResponse extends BaseResponse {}

// ===== INJECT CONTENT SCRIPT =====

interface InjectContentScriptMessage extends BaseMessage {
  type: 'INJECT_CONTENT_SCRIPT';
  payload: {
    tabId: number;
  };
}

interface InjectContentScriptResponse extends BaseResponse {}
```

---

## BACKGROUND → CONTENT SCRIPT MESSAGES

### Recording Commands

```typescript
// ===== START RECORDING IN TAB =====

interface StartRecordingInTabMessage extends BaseMessage {
  type: 'CONTENT_START_RECORDING';
  payload: {
    sessionId: string;
  };
}

interface StartRecordingInTabResponse extends BaseResponse {}

// ===== STOP RECORDING IN TAB =====

interface StopRecordingInTabMessage extends BaseMessage {
  type: 'CONTENT_STOP_RECORDING';
}

interface StopRecordingInTabResponse extends BaseResponse {
  data?: {
    steps: Step[];
  };
}
```

### Playback Commands

```typescript
// ===== EXECUTE STEP =====

interface ExecuteStepMessage extends BaseMessage {
  type: 'EXECUTE_STEP';
  payload: {
    step: Step;
    value?: string;  // CSV-injected value
  };
}

interface ExecuteStepResponse extends BaseResponse {
  data?: {
    elementFound: boolean;
    actionPerformed: boolean;
    duration: number;
  };
}

// ===== EXECUTE CONDITIONAL CLICK =====

interface ExecuteConditionalClickMessage extends BaseMessage {
  type: 'EXECUTE_CONDITIONAL_CLICK';
  payload: {
    config: ConditionalConfig;
  };
}

interface ExecuteConditionalClickResponse extends BaseResponse {
  data?: {
    buttonsClicked: number;
    timedOut: boolean;
    duration: number;
  };
}
```

### Vision Commands

```typescript
// ===== VISION CLICK =====

interface VisionClickMessage extends BaseMessage {
  type: 'VISION_CLICK';
  x: number;
  y: number;
}

interface VisionClickResponse extends BaseResponse {
  data?: {
    element: string;  // Tag name
  };
}

// ===== VISION TYPE =====

interface VisionTypeMessage extends BaseMessage {
  type: 'VISION_TYPE';
  text: string;
}

interface VisionTypeResponse extends BaseResponse {}

// ===== VISION KEY =====

interface VisionKeyMessage extends BaseMessage {
  type: 'VISION_KEY';
  key: string;  // e.g., "Control+a", "Enter", "Delete"
}

interface VisionKeyResponse extends BaseResponse {}

// ===== VISION SCROLL =====

interface VisionScrollMessage extends BaseMessage {
  type: 'VISION_SCROLL';
  direction: 'up' | 'down';
  amount?: number;  // Pixels, default 500
}

interface VisionScrollResponse extends BaseResponse {}

// ===== VISION GET ELEMENT =====

interface VisionGetElementMessage extends BaseMessage {
  type: 'VISION_GET_ELEMENT';
  x: number;
  y: number;
}

interface VisionGetElementResponse extends BaseResponse {
  data?: {
    tagName: string;
    id?: string;
    className?: string;
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}
```

---

## CONTENT SCRIPT → BACKGROUND MESSAGES

### Recording Events

```typescript
// ===== STEP RECORDED =====

interface StepRecordedMessage extends BaseMessage {
  type: 'STEP_RECORDED';
  payload: {
    sessionId: string;
    step: Step;
  };
}

interface StepRecordedResponse extends BaseResponse {}

// ===== VISION FALLBACK TRIGGERED =====

interface VisionFallbackMessage extends BaseMessage {
  type: 'VISION_FALLBACK_TRIGGERED';
  payload: {
    sessionId: string;
    element: {
      tagName: string;
      bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    };
  };
}

interface VisionFallbackResponse extends BaseResponse {
  data?: {
    step: Step;  // Step with Vision data populated
  };
}

// ===== RECORDING ERROR =====

interface RecordingErrorMessage extends BaseMessage {
  type: 'RECORDING_ERROR';
  payload: {
    sessionId: string;
    error: string;
    details?: any;
  };
}

interface RecordingErrorResponse extends BaseResponse {}
```

### Playback Events

```typescript
// ===== STEP COMPLETED =====

interface StepCompletedMessage extends BaseMessage {
  type: 'STEP_COMPLETED';
  payload: {
    testRunId: number;
    stepId: string;
    success: boolean;
    duration: number;
    error?: string;
  };
}

interface StepCompletedResponse extends BaseResponse {}

// ===== CONDITIONAL BUTTON CLICKED =====

interface ConditionalButtonClickedMessage extends BaseMessage {
  type: 'CONDITIONAL_BUTTON_CLICKED';
  payload: {
    testRunId: number;
    buttonText: string;
    totalClicked: number;
  };
}

interface ConditionalButtonClickedResponse extends BaseResponse {}

// ===== PLAYBACK ERROR =====

interface PlaybackErrorMessage extends BaseMessage {
  type: 'PLAYBACK_ERROR';
  payload: {
    testRunId: number;
    stepId?: string;
    error: string;
    recoverable: boolean;
  };
}

interface PlaybackErrorResponse extends BaseResponse {}
```

---

## VISION ENGINE API

### VisionEngine Class Interface

```typescript
/**
 * Vision Engine public API
 * Location: src/lib/visionEngine.ts
 */
interface IVisionEngine {
  // ===== LIFECYCLE =====
  
  /**
   * Initialize Tesseract.js worker
   * Must be called before any other method
   */
  initialize(): Promise<void>;
  
  /**
   * Terminate Tesseract.js worker
   * Should be called when done to free resources
   */
  terminate(): Promise<void>;
  
  /**
   * Update configuration
   */
  setConfig(config: Partial<VisionConfig>): void;
  
  // ===== CORE OCR =====
  
  /**
   * Capture screenshot of visible tab
   * @returns Base64 data URL of PNG image
   */
  captureScreen(): Promise<string>;
  
  /**
   * Run OCR on image
   * @param imageDataUrl - Base64 data URL
   * @returns Array of recognized text with coordinates
   */
  recognizeText(imageDataUrl: string): Promise<TextResult[]>;
  
  // ===== SEARCH =====
  
  /**
   * Find first matching text on screen
   * @param searchTerms - Array of terms to search (first match wins)
   * @returns Click target or null if not found
   */
  findText(searchTerms: string[]): Promise<ClickTarget | null>;
  
  /**
   * Find all matching text on screen
   * @param searchTerm - Term to search
   * @returns Array of all matches
   */
  findAllText(searchTerm: string): Promise<ClickTarget[]>;
  
  /**
   * Capture text at specific coordinates (for recording)
   */
  captureInputAtCoordinates(
    x: number, 
    y: number, 
    width: number, 
    height: number
  ): Promise<string>;
  
  // ===== INTERACTIONS =====
  
  /**
   * Click at specific coordinates
   * Sends VISION_CLICK to content script
   */
  clickAtCoordinates(x: number, y: number): Promise<boolean>;
  
  /**
   * Find text and click it
   */
  clickText(searchTerms: string[]): Promise<boolean>;
  
  /**
   * Type text into focused element
   * Sends VISION_TYPE to content script
   */
  typeText(text: string): Promise<boolean>;
  
  /**
   * Click at coordinates then type text
   */
  clickAndType(x: number, y: number, text: string): Promise<boolean>;
  
  /**
   * Send keyboard shortcuts
   * @param keys - Array like ["Control+a", "Delete"]
   */
  sendKeys(keys: string[]): Promise<void>;
  
  // ===== COMPLEX INTERACTIONS =====
  
  /**
   * Handle dropdown: click trigger, wait, click option
   */
  handleDropdown(
    triggerText: string, 
    optionText: string, 
    waitMs?: number
  ): Promise<boolean>;
  
  /**
   * Scroll to find text, with retries
   */
  scrollToFind(searchTerms: string[]): Promise<ClickTarget | null>;
  
  // ===== CONDITIONAL CLICK =====
  
  /**
   * Poll and click buttons until timeout
   * @param searchTerms - Text to look for
   * @param timeoutSeconds - Seconds after last click to exit
   * @param onButtonClick - Callback when button clicked
   * @returns Statistics
   */
  waitAndClickButtons(
    searchTerms: string[],
    timeoutSeconds: number,
    onButtonClick?: (text: string, count: number) => void
  ): Promise<ConditionalClickResult>;
}

// ===== SUPPORTING TYPES =====

interface VisionConfig {
  /** Minimum OCR confidence (0-100), default 60 */
  confidenceThreshold: number;
  
  /** Milliseconds between scans, default 1000 */
  pollIntervalMs: number;
  
  /** Scroll attempts before giving up, default 3 */
  scrollRetries: number;
}

interface TextResult {
  text: string;
  confidence: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
}

interface ClickTarget {
  text: string;
  x: number;
  y: number;
  confidence: number;
}

interface ConditionalClickResult {
  buttonsClicked: number;
  timedOut: boolean;
  duration: number;
}
```

---

## MESSAGE ROUTING

### Background Script Router

```typescript
// src/background/messageRouter.ts

type MessageHandler<T extends BaseMessage, R extends BaseResponse> = 
  (message: T, sender: chrome.runtime.MessageSender) => Promise<R>;

interface MessageHandlerMap {
  // Recording
  'START_RECORDING': MessageHandler<StartRecordingMessage, StartRecordingResponse>;
  'STOP_RECORDING': MessageHandler<StopRecordingMessage, StopRecordingResponse>;
  'SAVE_RECORDING': MessageHandler<SaveRecordingMessage, SaveRecordingResponse>;
  'UPDATE_RECORDING': MessageHandler<UpdateRecordingMessage, UpdateRecordingResponse>;
  'GET_RECORDING': MessageHandler<GetRecordingMessage, GetRecordingResponse>;
  'DELETE_RECORDING': MessageHandler<DeleteRecordingMessage, DeleteRecordingResponse>;
  
  // Steps
  'ADD_STEP': MessageHandler<AddStepMessage, AddStepResponse>;
  'UPDATE_STEP': MessageHandler<UpdateStepMessage, UpdateStepResponse>;
  'DELETE_STEP': MessageHandler<DeleteStepMessage, DeleteStepResponse>;
  'REORDER_STEPS': MessageHandler<ReorderStepsMessage, ReorderStepsResponse>;
  'SET_STEP_DELAY': MessageHandler<SetStepDelayMessage, SetStepDelayResponse>;
  'SET_STEP_CONDITIONAL': MessageHandler<SetStepConditionalMessage, SetStepConditionalResponse>;
  
  // Configuration
  'SET_LOOP_START': MessageHandler<SetLoopStartMessage, SetLoopStartResponse>;
  'SET_GLOBAL_DELAY': MessageHandler<SetGlobalDelayMessage, SetGlobalDelayResponse>;
  'SET_CONDITIONAL_DEFAULTS': MessageHandler<SetConditionalDefaultsMessage, SetConditionalDefaultsResponse>;
  
  // CSV
  'SAVE_CSV_DATA': MessageHandler<SaveCSVDataMessage, SaveCSVDataResponse>;
  'GET_CSV_DATA': MessageHandler<GetCSVDataMessage, GetCSVDataResponse>;
  
  // Playback
  'START_PLAYBACK': MessageHandler<StartPlaybackMessage, StartPlaybackResponse>;
  'STOP_PLAYBACK': MessageHandler<StopPlaybackMessage, StopPlaybackResponse>;
  'GET_PLAYBACK_STATUS': MessageHandler<GetPlaybackStatusMessage, GetPlaybackStatusResponse>;
  
  // Tabs
  'OPEN_TAB': MessageHandler<OpenTabMessage, OpenTabResponse>;
  'CLOSE_TAB': MessageHandler<CloseTabMessage, CloseTabResponse>;
  'INJECT_CONTENT_SCRIPT': MessageHandler<InjectContentScriptMessage, InjectContentScriptResponse>;
  
  // Content Script Events
  'STEP_RECORDED': MessageHandler<StepRecordedMessage, StepRecordedResponse>;
  'VISION_FALLBACK_TRIGGERED': MessageHandler<VisionFallbackMessage, VisionFallbackResponse>;
  'STEP_COMPLETED': MessageHandler<StepCompletedMessage, StepCompletedResponse>;
  'CONDITIONAL_BUTTON_CLICKED': MessageHandler<ConditionalButtonClickedMessage, ConditionalButtonClickedResponse>;
}

class MessageRouter {
  private handlers: Partial<MessageHandlerMap> = {};
  
  register<T extends keyof MessageHandlerMap>(
    type: T, 
    handler: MessageHandlerMap[T]
  ): void {
    this.handlers[type] = handler as any;
  }
  
  async route(
    message: BaseMessage, 
    sender: chrome.runtime.MessageSender
  ): Promise<BaseResponse> {
    const handler = this.handlers[message.type as keyof MessageHandlerMap];
    
    if (!handler) {
      return {
        success: false,
        error: `Unknown message type: ${message.type}`
      };
    }
    
    try {
      return await (handler as any)(message, sender);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Singleton
export const messageRouter = new MessageRouter();

// Setup listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageRouter.route(message, sender).then(sendResponse);
  return true;  // Keep channel open for async
});
```

---

## API CLIENT

### Extension Page Client

```typescript
// src/lib/api/client.ts

/**
 * Type-safe API client for extension pages
 */
class APIClient {
  
  private async send<T extends BaseMessage, R extends BaseResponse>(
    message: T
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: R) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!response.success && response.error) {
          reject(new Error(response.error));
          return;
        }
        
        resolve(response);
      });
    });
  }
  
  // ===== RECORDING =====
  
  async startRecording(tabId: number, recordingId?: number): Promise<string> {
    const response = await this.send<StartRecordingMessage, StartRecordingResponse>({
      type: 'START_RECORDING',
      payload: { tabId, recordingId }
    });
    return response.data!.sessionId;
  }
  
  async stopRecording(tabId: number): Promise<{ steps: Step[]; duration: number }> {
    const response = await this.send<StopRecordingMessage, StopRecordingResponse>({
      type: 'STOP_RECORDING',
      payload: { tabId }
    });
    return response.data!;
  }
  
  async saveRecording(recording: Omit<Recording, 'id'>): Promise<number> {
    const response = await this.send<SaveRecordingMessage, SaveRecordingResponse>({
      type: 'SAVE_RECORDING',
      payload: { recording }
    });
    return response.data!.id;
  }
  
  async updateRecording(id: number, changes: Partial<Recording>): Promise<Recording> {
    const response = await this.send<UpdateRecordingMessage, UpdateRecordingResponse>({
      type: 'UPDATE_RECORDING',
      payload: { id, changes }
    });
    return response.data!.recording;
  }
  
  async getRecording(id: number): Promise<Recording> {
    const response = await this.send<GetRecordingMessage, GetRecordingResponse>({
      type: 'GET_RECORDING',
      payload: { id }
    });
    return response.data!.recording;
  }
  
  async deleteRecording(id: number): Promise<void> {
    await this.send<DeleteRecordingMessage, DeleteRecordingResponse>({
      type: 'DELETE_RECORDING',
      payload: { id }
    });
  }
  
  // ===== STEPS =====
  
  async addStep(recordingId: number, step: Step): Promise<void> {
    await this.send<AddStepMessage, AddStepResponse>({
      type: 'ADD_STEP',
      payload: { recordingId, step }
    });
  }
  
  async updateStep(recordingId: number, stepId: string, changes: Partial<Step>): Promise<void> {
    await this.send<UpdateStepMessage, UpdateStepResponse>({
      type: 'UPDATE_STEP',
      payload: { recordingId, stepId, changes }
    });
  }
  
  async deleteStep(recordingId: number, stepId: string): Promise<void> {
    await this.send<DeleteStepMessage, DeleteStepResponse>({
      type: 'DELETE_STEP',
      payload: { recordingId, stepId }
    });
  }
  
  async setStepDelay(recordingId: number, stepId: string, delaySeconds: number): Promise<void> {
    await this.send<SetStepDelayMessage, SetStepDelayResponse>({
      type: 'SET_STEP_DELAY',
      payload: { recordingId, stepId, delaySeconds }
    });
  }
  
  async setStepConditional(
    recordingId: number, 
    stepId: string, 
    config: ConditionalConfig
  ): Promise<void> {
    await this.send<SetStepConditionalMessage, SetStepConditionalResponse>({
      type: 'SET_STEP_CONDITIONAL',
      payload: { recordingId, stepId, conditionalConfig: config }
    });
  }
  
  // ===== CONFIGURATION =====
  
  async setLoopStart(recordingId: number, index: number): Promise<void> {
    await this.send<SetLoopStartMessage, SetLoopStartResponse>({
      type: 'SET_LOOP_START',
      payload: { recordingId, loopStartIndex: index }
    });
  }
  
  async setGlobalDelay(recordingId: number, delayMs: number): Promise<void> {
    await this.send<SetGlobalDelayMessage, SetGlobalDelayResponse>({
      type: 'SET_GLOBAL_DELAY',
      payload: { recordingId, globalDelayMs: delayMs }
    });
  }
  
  async setConditionalDefaults(
    recordingId: number,
    searchTerms: string[],
    timeoutSeconds: number
  ): Promise<void> {
    await this.send<SetConditionalDefaultsMessage, SetConditionalDefaultsResponse>({
      type: 'SET_CONDITIONAL_DEFAULTS',
      payload: { recordingId, defaults: { searchTerms, timeoutSeconds } }
    });
  }
  
  // ===== CSV =====
  
  async saveCSVData(
    recordingId: number,
    parsedFields: ParsedField[],
    csvData: Record<string, string>[]
  ): Promise<void> {
    await this.send<SaveCSVDataMessage, SaveCSVDataResponse>({
      type: 'SAVE_CSV_DATA',
      payload: { recordingId, parsedFields, csvData }
    });
  }
  
  async getCSVData(recordingId: number): Promise<{
    parsedFields: ParsedField[];
    csvData: Record<string, string>[];
  }> {
    const response = await this.send<GetCSVDataMessage, GetCSVDataResponse>({
      type: 'GET_CSV_DATA',
      payload: { recordingId }
    });
    return response.data!;
  }
  
  // ===== PLAYBACK =====
  
  async startPlayback(recordingId: number, options?: {
    startFromRow?: number;
    endAtRow?: number;
    skipSteps?: string[];
  }): Promise<number> {
    const response = await this.send<StartPlaybackMessage, StartPlaybackResponse>({
      type: 'START_PLAYBACK',
      payload: { recordingId, options }
    });
    return response.data!.testRunId;
  }
  
  async stopPlayback(testRunId: number): Promise<void> {
    await this.send<StopPlaybackMessage, StopPlaybackResponse>({
      type: 'STOP_PLAYBACK',
      payload: { testRunId }
    });
  }
  
  async getPlaybackStatus(testRunId: number): Promise<{
    status: TestRunStatus;
    currentRow: number;
    currentStep: number;
    successfulSteps: number;
    failedSteps: number;
  }> {
    const response = await this.send<GetPlaybackStatusMessage, GetPlaybackStatusResponse>({
      type: 'GET_PLAYBACK_STATUS',
      payload: { testRunId }
    });
    return response.data!;
  }
  
  // ===== TABS =====
  
  async openTab(url: string, active?: boolean): Promise<number> {
    const response = await this.send<OpenTabMessage, OpenTabResponse>({
      type: 'OPEN_TAB',
      payload: { url, active }
    });
    return response.data!.tabId;
  }
  
  async closeTab(tabId: number): Promise<void> {
    await this.send<CloseTabMessage, CloseTabResponse>({
      type: 'CLOSE_TAB',
      payload: { tabId }
    });
  }
}

// Singleton export
export const api = new APIClient();
```

---

## USAGE EXAMPLES

### Recording with Vision Fallback

```typescript
// In Recorder.tsx

import { api } from '../lib/api/client';

// Start recording
const handleStartRecording = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;
  
  const sessionId = await api.startRecording(tab.id);
  setSessionId(sessionId);
  setIsRecording(true);
};

// Stop recording
const handleStopRecording = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;
  
  const { steps, duration } = await api.stopRecording(tab.id);
  setSteps(steps);
  setIsRecording(false);
  
  console.log(`Recorded ${steps.length} steps in ${duration}ms`);
};

// Save recording
const handleSaveRecording = async () => {
  const id = await api.saveRecording({
    projectId: currentProjectId,
    name: recordingName,
    steps: steps,
    startUrl: startUrl,
    createdAt: new Date(),
    loopStartIndex: loopStartIndex,
    globalDelayMs: globalDelayMs,
    conditionalDefaults: {
      searchTerms: ['Allow', 'Keep'],
      timeoutSeconds: 120
    }
  });
  
  console.log(`Recording saved with ID: ${id}`);
};
```

### Playback with Progress Tracking

```typescript
// In TestRunner.tsx

import { api } from '../lib/api/client';

// Start playback
const handleStartPlayback = async () => {
  const testRunId = await api.startPlayback(recordingId);
  setTestRunId(testRunId);
  setIsPlaying(true);
  
  // Poll for status updates
  const pollStatus = async () => {
    const status = await api.getPlaybackStatus(testRunId);
    setProgress(status);
    
    if (status.status === 'running') {
      setTimeout(pollStatus, 500);
    } else {
      setIsPlaying(false);
    }
  };
  
  pollStatus();
};

// Stop playback
const handleStopPlayback = async () => {
  await api.stopPlayback(testRunId);
  setIsPlaying(false);
};
```

---

## ERROR CODES

| Code | Message | Cause |
|------|---------|-------|
| `RECORDING_NOT_FOUND` | Recording not found | Invalid recording ID |
| `STEP_NOT_FOUND` | Step not found | Invalid step ID |
| `TAB_NOT_FOUND` | Tab not found | Tab was closed |
| `CONTENT_SCRIPT_ERROR` | Content script error | Script not injected |
| `VISION_NOT_INITIALIZED` | Vision Engine not initialized | Call initialize() first |
| `OCR_FAILED` | OCR recognition failed | Tesseract error |
| `ELEMENT_NOT_FOUND` | Element not found at coordinates | Nothing at click location |
| `PLAYBACK_ALREADY_RUNNING` | Playback already in progress | Stop current first |
| `INVALID_LOOP_INDEX` | Loop start index out of range | Index >= step count |
| `CSV_PARSE_ERROR` | Failed to parse CSV | Invalid CSV format |

---

*End of API Contracts Specification*
