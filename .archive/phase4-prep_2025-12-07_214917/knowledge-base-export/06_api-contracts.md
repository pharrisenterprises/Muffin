# API CONTRACTS

## Message Actions

```typescript
type MessageAction =
  // Recording
  | 'START_RECORDING'
  | 'STOP_RECORDING'
  | 'GET_RECORDING_STATE'
  
  // Playback
  | 'EXECUTE_STEP'
  | 'EXECUTE_ALL_STEPS'
  | 'STOP_EXECUTION'
  
  // Vision
  | 'VISION_CLICK'
  | 'VISION_TYPE'
  | 'VISION_OCR'
  | 'VISION_CONDITIONAL_CLICK'
  
  // CDP
  | 'CDP_ATTACH'
  | 'CDP_DETACH'
  | 'CDP_COMMAND'
  | 'PLAYWRIGHT_LOCATE'
  
  // Telemetry
  | 'STRATEGY_TELEMETRY'
  | 'LOG_EXECUTION';

interface Message {
  action: MessageAction;
  data?: any;
  tabId?: number;
}

interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

## Vision API Contracts

### VISION_CLICK

**Request:**
```typescript
{
  action: 'VISION_CLICK',
  data: {
    targetText: string;
    fuzzyMatch?: boolean;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    clickTarget: ClickTarget;
    duration: number;
  };
  error?: string;
}
```

### VISION_TYPE

**Request:**
```typescript
{
  action: 'VISION_TYPE',
  data: {
    targetText: string; // Element to find
    inputValue: string; // Value to type
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    element: HTMLInputElement;
    duration: number;
  };
  error?: string;
}
```

### VISION_OCR

**Request:**
```typescript
{
  action: 'VISION_OCR',
  data: {
    screenshot?: string; // Optional base64, defaults to full page
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    results: TextResult[];
    duration: number;
  };
  error?: string;
}
```

### VISION_CONDITIONAL_CLICK

**Request:**
```typescript
{
  action: 'VISION_CONDITIONAL_CLICK',
  data: {
    targetText: string;
    maxWaitMs: number;
    pollIntervalMs: number;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    result: ConditionalClickResult;
  };
  error?: string;
}
```

## CDP API Contracts

### CDP_ATTACH

**Request:**
```typescript
{
  action: 'CDP_ATTACH',
  tabId: number
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    attached: true;
    protocolVersion: string;
  };
  error?: string;
}
```

### CDP_DETACH

**Request:**
```typescript
{
  action: 'CDP_DETACH',
  tabId: number
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

### CDP_COMMAND

**Request:**
```typescript
{
  action: 'CDP_COMMAND',
  tabId: number;
  data: {
    method: string;
    params?: object;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: any; // CDP command result
  error?: string;
}
```

### PLAYWRIGHT_LOCATE

**Request:**
```typescript
{
  action: 'PLAYWRIGHT_LOCATE',
  tabId: number;
  data: {
    locatorType: 'role' | 'text' | 'label' | 'placeholder' | 'testId';
    value: string;
    options?: {
      exact?: boolean;
      name?: string;
    };
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    result: LocatorResult;
    duration: number;
  };
  error?: string;
}
```

### STRATEGY_TELEMETRY

**Request:**
```typescript
{
  action: 'STRATEGY_TELEMETRY',
  data: {
    recordingId: string;
    stepId: string;
    attempt: StrategyAttempt;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

## Message Router Implementation

```typescript
// background.ts
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender.tab?.id)
    .then(response => sendResponse(response))
    .catch(error => sendResponse({ success: false, error: error.message }));
  
  return true; // Async response
});

async function handleMessage(message: Message, tabId?: number): Promise<MessageResponse> {
  switch (message.action) {
    case 'VISION_CLICK':
      return await handleVisionClick(message.data);
    
    case 'CDP_ATTACH':
      return await handleCDPAttach(message.tabId!);
    
    case 'PLAYWRIGHT_LOCATE':
      return await handlePlaywrightLocate(message.tabId!, message.data);
    
    case 'STRATEGY_TELEMETRY':
      return await handleTelemetry(message.data);
    
    default:
      return { success: false, error: `Unknown action: ${message.action}` };
  }
}
```

## Content Script ↔ Background Communication

### From Content Script to Background

```typescript
// content.tsx
async function sendToBackground(action: MessageAction, data?: any): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, data }, (response) => {
      resolve(response);
    });
  });
}

// Usage
const response = await sendToBackground('VISION_CLICK', { targetText: 'Submit' });
if (response.success) {
  console.log('Click succeeded:', response.data);
}
```

### From Background to Content Script

```typescript
// background.ts
async function sendToContentScript(tabId: number, action: MessageAction, data?: any): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action, data }, (response) => {
      resolve(response);
    });
  });
}

// Usage
const response = await sendToContentScript(tabId, 'EXECUTE_STEP', { step });
```

## Error Codes

```typescript
enum ErrorCode {
  // CDP Errors
  CDP_NOT_ATTACHED = 'CDP_NOT_ATTACHED',
  CDP_ATTACH_FAILED = 'CDP_ATTACH_FAILED',
  CDP_COMMAND_FAILED = 'CDP_COMMAND_FAILED',
  CDP_TIMEOUT = 'CDP_TIMEOUT',
  
  // Vision Errors
  VISION_INIT_FAILED = 'VISION_INIT_FAILED',
  VISION_OCR_FAILED = 'VISION_OCR_FAILED',
  VISION_ELEMENT_NOT_FOUND = 'VISION_ELEMENT_NOT_FOUND',
  VISION_CONFIDENCE_LOW = 'VISION_CONFIDENCE_LOW',
  
  // Playback Errors
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  ALL_STRATEGIES_FAILED = 'ALL_STRATEGIES_FAILED',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  STEP_VALIDATION_FAILED = 'STEP_VALIDATION_FAILED',
  
  // General Errors
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  TAB_NOT_FOUND = 'TAB_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: any;
}
```
