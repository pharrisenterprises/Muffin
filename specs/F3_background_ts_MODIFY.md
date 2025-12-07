# background.ts Modifications Specification

**File ID:** F3  
**File Path:** `src/background/background.ts`  
**Status:** MODIFY  
**Priority:** P0

---

## Purpose

Modify the existing background script to initialize and coordinate all Phase 3 services. The background script serves as the central hub for CDP operations, DecisionEngine, VisionService, TelemetryLogger, and message routing between content scripts and the popup UI. Must handle service lifecycle, message dispatch, and error recovery while maintaining backward compatibility with existing functionality.

---

## Current State Analysis

The existing background.ts likely has:
- Basic message listeners for V1 recording/playback
- Simple chrome.runtime.onMessage handlers
- Storage operations
- Tab management

---

## Dependencies

### Uses (imports from)
- `./services/CDPService`: CDPService
- `./services/AccessibilityService`: AccessibilityService
- `./services/PlaywrightLocators`: PlaywrightLocators
- `./services/AutoWaiting`: AutoWaiting
- `./services/VisionService`: VisionService
- `./services/DecisionEngine`: DecisionEngine
- `./services/TelemetryLogger`: TelemetryLogger
- `./services/FallbackChainGenerator`: FallbackChainGenerator
- `./services/StrategyScorer`: StrategyScorer
- `./services/StrategyChainBuilder`: StrategyChainBuilder
- `../types/strategy`: All strategy types
- `../types/telemetry`: Telemetry types

### Used By (exports to)
- Content scripts via chrome.runtime messaging
- Popup UI via chrome.runtime messaging

---

## Modifications Required

### 1. New Imports

```typescript
// Add to existing imports
import { CDPService } from './services/CDPService';
import { AccessibilityService } from './services/AccessibilityService';
import { PlaywrightLocators } from './services/PlaywrightLocators';
import { AutoWaiting } from './services/AutoWaiting';
import { VisionService } from './services/VisionService';
import { DecisionEngine } from './services/DecisionEngine';
import { TelemetryLogger } from './services/TelemetryLogger';
import { FallbackChainGenerator } from './services/FallbackChainGenerator';
import { StrategyScorer } from './services/StrategyScorer';
import { StrategyChainBuilder } from './services/StrategyChainBuilder';

import {
  StrategyType,
  FallbackChain,
  CapturedAction,
  StrategyEvaluationResult
} from '../types/strategy';

import {
  TelemetryEvent,
  RunSummary,
  generateRunId
} from '../types/telemetry';
```

### 2. Service Instances (Module Level)

```typescript
/**
 * ============================================================================
 * SERVICE INSTANCES
 * ============================================================================
 */

/** CDP Service - Chrome DevTools Protocol operations */
let cdpService: CDPService | null = null;

/** Accessibility Service - AX tree queries */
let accessibilityService: AccessibilityService | null = null;

/** Playwright-style locators */
let playwrightLocators: PlaywrightLocators | null = null;

/** Auto-waiting for actionability */
let autoWaiting: AutoWaiting | null = null;

/** Vision Service - OCR operations */
let visionService: VisionService | null = null;

/** Decision Engine - Strategy evaluation and execution */
let decisionEngine: DecisionEngine | null = null;

/** Telemetry Logger - Execution tracking */
let telemetryLogger: TelemetryLogger | null = null;

/** Fallback Chain Generator */
let chainGenerator: FallbackChainGenerator | null = null;

/** Service initialization state */
let servicesInitialized = false;
let initializationPromise: Promise<void> | null = null;
```

### 3. Service Initialization

```typescript
/**
 * Initialize all Phase 3 services
 */
async function initializeServices(): Promise<void> {
  // Prevent double initialization
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = doInitializeServices();
  return initializationPromise;
}

async function doInitializeServices(): Promise<void> {
  if (servicesInitialized) {
    console.log('[Background] Services already initialized');
    return;
  }

  console.log('[Background] Initializing Phase 3 services...');
  const startTime = Date.now();

  try {
    // 1. Initialize CDP Service (foundation for everything)
    cdpService = new CDPService({
      retryAttempts: 3,
      retryDelayMs: 100,
      debugLogging: false
    });
    console.log('[Background] CDPService initialized');

    // 2. Initialize Accessibility Service (depends on CDP)
    accessibilityService = new AccessibilityService(cdpService, {
      cacheTtlMs: 1000,
      includeIgnored: false,
      maxDepth: 100
    });
    console.log('[Background] AccessibilityService initialized');

    // 3. Initialize Playwright Locators (depends on CDP, Accessibility)
    playwrightLocators = new PlaywrightLocators(
      cdpService,
      accessibilityService
    );
    console.log('[Background] PlaywrightLocators initialized');

    // 4. Initialize Auto-Waiting (depends on CDP)
    autoWaiting = new AutoWaiting(cdpService, {
      timeout: 30000,
      pollingInterval: 100,
      stabilityThreshold: 100
    });
    console.log('[Background] AutoWaiting initialized');

    // 5. Initialize Vision Service (independent, async init)
    visionService = new VisionService({
      confidenceThreshold: 60,
      language: 'eng',
      ocrTimeout: 5000,
      cacheTtlMs: 2000,
      preInitialize: true
    });
    // Don't await - let it initialize in background
    visionService.initialize().catch(err => {
      console.warn('[Background] VisionService init warning:', err);
    });
    console.log('[Background] VisionService created (initializing async)');

    // 6. Initialize Telemetry Logger
    telemetryLogger = new TelemetryLogger({
      enabled: true,
      maxEvents: 10000,
      retentionDays: 30,
      batchSize: 10,
      flushIntervalMs: 5000
    });
    await telemetryLogger.initialize();
    console.log('[Background] TelemetryLogger initialized');

    // 7. Initialize Chain Generator components
    const strategyScorer = new StrategyScorer();
    const chainBuilder = new StrategyChainBuilder();
    chainGenerator = new FallbackChainGenerator(
      strategyScorer,
      chainBuilder
    );
    console.log('[Background] FallbackChainGenerator initialized');

    // 8. Initialize Decision Engine (depends on everything)
    decisionEngine = new DecisionEngine({
      cdpService,
      accessibilityService,
      playwrightLocators,
      autoWaiting,
      visionService,
      telemetryLogger
    }, {
      timeout: 30000,
      minConfidence: 0.5,
      parallelEvaluation: true,
      enableTelemetry: true,
      retryOnFailure: true,
      maxRetries: 2
    });
    console.log('[Background] DecisionEngine initialized');

    servicesInitialized = true;
    const duration = Date.now() - startTime;
    console.log(`[Background] All services initialized in ${duration}ms`);

  } catch (error) {
    console.error('[Background] Service initialization failed:', error);
    servicesInitialized = false;
    initializationPromise = null;
    throw error;
  }
}

/**
 * Ensure services are ready before handling requests
 */
async function ensureServicesReady(): Promise<void> {
  if (!servicesInitialized) {
    await initializeServices();
  }
}
```

### 4. Message Handler Setup

```typescript
/**
 * ============================================================================
 * MESSAGE HANDLERS
 * ============================================================================
 */

/**
 * Main message listener
 */
chrome.runtime.onMessage.addListener(
  (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    // Handle async messages
    handleMessage(message, sender)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error('[Background] Message handler error:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });

    // Return true to indicate async response
    return true;
  }
);

/**
 * Route messages to appropriate handlers
 */
async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender
): Promise<any> {
  const { action, payload } = message;

  // Log for debugging
  console.log(`[Background] Received: ${action}`, payload ? '(with payload)' : '');

  switch (action) {
    // ========== CDP Operations ==========
    case 'CDP_ATTACH':
      return handleCDPAttach(payload);
    case 'CDP_DETACH':
      return handleCDPDetach(payload);
    case 'CDP_COMMAND':
      return handleCDPCommand(payload);

    // ========== Decision Engine ==========
    case 'EXECUTE_STEP':
      return handleExecuteStep(payload);
    case 'EVALUATE_STRATEGIES':
      return handleEvaluateStrategies(payload);

    // ========== Vision Service ==========
    case 'VISION_INIT':
      return handleVisionInit();
    case 'VISION_OCR':
      return handleVisionOCR(payload);
    case 'VISION_FIND_TEXT':
      return handleVisionFindText(payload);
    case 'VISION_CONDITIONAL_CLICK':
      return handleVisionConditionalClick(payload);

    // ========== Telemetry ==========
    case 'START_TELEMETRY_RUN':
      return handleStartTelemetryRun(payload);
    case 'END_TELEMETRY_RUN':
      return handleEndTelemetryRun(payload);
    case 'LOG_TELEMETRY_EVENT':
      return handleLogTelemetryEvent(payload);
    case 'GET_STRATEGY_METRICS':
      return handleGetStrategyMetrics(payload);
    case 'GET_RUN_SUMMARY':
      return handleGetRunSummary(payload);

    // ========== Chain Generation ==========
    case 'GENERATE_FALLBACK_CHAIN':
      return handleGenerateFallbackChain(payload);

    // ========== Recording/Playback (existing, keep for compatibility) ==========
    case 'SAVE_RECORDING':
      return handleSaveRecording(payload);
    case 'LOAD_RECORDING':
      return handleLoadRecording(payload);
    case 'LIST_RECORDINGS':
      return handleListRecordings();
    case 'DELETE_RECORDING':
      return handleDeleteRecording(payload);

    // ========== Service Status ==========
    case 'GET_SERVICE_STATUS':
      return handleGetServiceStatus();
    case 'REINITIALIZE_SERVICES':
      return handleReinitializeServices();

    default:
      console.warn(`[Background] Unknown action: ${action}`);
      return { success: false, error: `Unknown action: ${action}` };
  }
}
```

### 5. CDP Handlers

```typescript
/**
 * ============================================================================
 * CDP HANDLERS
 * ============================================================================
 */

async function handleCDPAttach(payload: { tabId: number }): Promise<any> {
  await ensureServicesReady();
  
  try {
    await cdpService!.attach(payload.tabId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to attach'
    };
  }
}

async function handleCDPDetach(payload: { tabId: number }): Promise<any> {
  await ensureServicesReady();
  
  try {
    await cdpService!.detach(payload.tabId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to detach'
    };
  }
}

async function handleCDPCommand(payload: {
  tabId: number;
  method: string;
  params?: any;
}): Promise<any> {
  await ensureServicesReady();
  
  const result = await cdpService!.sendCommand(
    payload.tabId,
    payload.method,
    payload.params
  );
  
  return result;
}
```

### 6. Decision Engine Handlers

```typescript
/**
 * ============================================================================
 * DECISION ENGINE HANDLERS
 * ============================================================================
 */

async function handleExecuteStep(payload: {
  tabId: number;
  stepIndex: number;
  fallbackChain: FallbackChain;
  actionType: string;
  value?: string;
  timeout: number;
  runId: string;
}): Promise<any> {
  await ensureServicesReady();

  try {
    const result = await decisionEngine!.executeAction({
      tabId: payload.tabId,
      fallbackChain: payload.fallbackChain,
      actionType: payload.actionType as any,
      value: payload.value,
      stepIndex: payload.stepIndex,
      timeout: payload.timeout,
      runId: payload.runId
    });

    return {
      success: result.success,
      usedStrategy: result.usedStrategy?.type,
      confidence: result.usedStrategy?.confidence,
      evaluationResults: result.evaluationResults,
      duration: result.totalDuration,
      error: result.error
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Step execution failed',
      duration: 0
    };
  }
}

async function handleEvaluateStrategies(payload: {
  tabId: number;
  fallbackChain: FallbackChain;
}): Promise<any> {
  await ensureServicesReady();

  try {
    const results = await decisionEngine!.evaluateStrategies(
      payload.tabId,
      payload.fallbackChain
    );

    return {
      success: true,
      results: results.results,
      bestStrategy: results.bestStrategy,
      totalDuration: results.totalDuration
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Evaluation failed'
    };
  }
}
```

### 7. Vision Service Handlers

```typescript
/**
 * ============================================================================
 * VISION SERVICE HANDLERS
 * ============================================================================
 */

async function handleVisionInit(): Promise<any> {
  await ensureServicesReady();

  try {
    await visionService!.initialize();
    return { success: true, ready: visionService!.isReady() };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Vision init failed'
    };
  }
}

async function handleVisionOCR(payload: {
  tabId: number;
  useCache?: boolean;
}): Promise<any> {
  await ensureServicesReady();

  try {
    const results = await visionService!.analyzeTab(
      payload.tabId,
      payload.useCache ?? true
    );

    return {
      success: true,
      results,
      count: results.length
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR failed'
    };
  }
}

async function handleVisionFindText(payload: {
  tabId: number;
  text: string;
  options?: {
    exact?: boolean;
    caseSensitive?: boolean;
  };
}): Promise<any> {
  await ensureServicesReady();

  try {
    const result = await visionService!.findText(
      payload.tabId,
      payload.text,
      payload.options
    );

    return {
      success: result.found,
      clickPoint: result.clickPoint,
      matchedText: result.matchedText,
      confidence: result.confidence,
      processingTime: result.processingTime
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Find text failed'
    };
  }
}

async function handleVisionConditionalClick(payload: {
  tabId: number;
  searchTerms: string[];
  timeoutSeconds: number;
  pollIntervalMs: number;
  interactionType: string;
  typeValue?: string;
}): Promise<any> {
  await ensureServicesReady();

  try {
    const result = await visionService!.conditionalClick(payload.tabId, {
      searchTerms: payload.searchTerms,
      timeoutSeconds: payload.timeoutSeconds,
      pollIntervalMs: payload.pollIntervalMs,
      interactionType: payload.interactionType as any,
      typeValue: payload.typeValue
    });

    return {
      success: result.success,
      foundText: result.foundText,
      clickedAt: result.clickedAt,
      attempts: result.attempts,
      totalTime: result.totalTime,
      error: result.error
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Conditional click failed'
    };
  }
}
```

### 8. Telemetry Handlers

```typescript
/**
 * ============================================================================
 * TELEMETRY HANDLERS
 * ============================================================================
 */

async function handleStartTelemetryRun(payload: {
  runId?: string;
}): Promise<any> {
  await ensureServicesReady();

  const runId = telemetryLogger!.startRun(payload.runId);
  return { success: true, runId };
}

async function handleEndTelemetryRun(payload: {
  runId: string;
}): Promise<any> {
  await ensureServicesReady();

  try {
    const summary = await telemetryLogger!.endRun(payload.runId);
    return { success: true, summary };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'End run failed'
    };
  }
}

async function handleLogTelemetryEvent(payload: {
  event: Omit<TelemetryEvent, 'id'>;
}): Promise<any> {
  await ensureServicesReady();

  try {
    const id = await telemetryLogger!.logEvent(payload.event);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Log event failed'
    };
  }
}

async function handleGetStrategyMetrics(payload: {
  timeRange?: { start: number; end: number };
}): Promise<any> {
  await ensureServicesReady();

  try {
    const metrics = await telemetryLogger!.getStrategyMetrics(payload.timeRange);
    return { success: true, metrics };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Get metrics failed'
    };
  }
}

async function handleGetRunSummary(payload: {
  runId: string;
}): Promise<any> {
  await ensureServicesReady();

  try {
    const summary = await telemetryLogger!.getRunSummary(payload.runId);
    return { success: true, summary };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Get summary failed'
    };
  }
}
```

### 9. Chain Generation Handlers

```typescript
/**
 * ============================================================================
 * CHAIN GENERATION HANDLERS
 * ============================================================================
 */

async function handleGenerateFallbackChain(payload: {
  evidence: any;
}): Promise<any> {
  await ensureServicesReady();

  try {
    const result = await chainGenerator!.generate(payload.evidence);
    return {
      success: true,
      chain: result.chain,
      candidateCount: result.candidates.length,
      processingTime: result.metadata.processingTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Chain generation failed'
    };
  }
}
```

### 10. Storage Handlers (Existing, Keep/Enhance)

```typescript
/**
 * ============================================================================
 * STORAGE HANDLERS
 * ============================================================================
 */

async function handleSaveRecording(payload: {
  name: string;
  actions: CapturedAction[];
  metadata?: Record<string, any>;
}): Promise<any> {
  try {
    const recording = {
      id: `rec_${Date.now()}`,
      name: payload.name,
      actions: payload.actions,
      metadata: {
        ...payload.metadata,
        savedAt: Date.now(),
        actionCount: payload.actions.length,
        version: 'v2'
      }
    };

    // Get existing recordings
    const { recordings = [] } = await chrome.storage.local.get('recordings');
    recordings.push(recording);

    // Save updated list
    await chrome.storage.local.set({ recordings });

    return { success: true, id: recording.id };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Save failed'
    };
  }
}

async function handleLoadRecording(payload: {
  id: string;
}): Promise<any> {
  try {
    const { recordings = [] } = await chrome.storage.local.get('recordings');
    const recording = recordings.find((r: any) => r.id === payload.id);

    if (!recording) {
      return { success: false, error: 'Recording not found' };
    }

    return { success: true, recording };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Load failed'
    };
  }
}

async function handleListRecordings(): Promise<any> {
  try {
    const { recordings = [] } = await chrome.storage.local.get('recordings');
    
    // Return summary info (not full actions)
    const summaries = recordings.map((r: any) => ({
      id: r.id,
      name: r.name,
      actionCount: r.metadata?.actionCount || r.actions?.length || 0,
      savedAt: r.metadata?.savedAt,
      version: r.metadata?.version || 'v1'
    }));

    return { success: true, recordings: summaries };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'List failed'
    };
  }
}

async function handleDeleteRecording(payload: {
  id: string;
}): Promise<any> {
  try {
    const { recordings = [] } = await chrome.storage.local.get('recordings');
    const filtered = recordings.filter((r: any) => r.id !== payload.id);
    await chrome.storage.local.set({ recordings: filtered });

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    };
  }
}
```

### 11. Service Status Handlers

```typescript
/**
 * ============================================================================
 * SERVICE STATUS HANDLERS
 * ============================================================================
 */

async function handleGetServiceStatus(): Promise<any> {
  return {
    success: true,
    status: {
      initialized: servicesInitialized,
      services: {
        cdp: cdpService !== null,
        accessibility: accessibilityService !== null,
        locators: playwrightLocators !== null,
        autoWaiting: autoWaiting !== null,
        vision: visionService?.isReady() ?? false,
        decisionEngine: decisionEngine !== null,
        telemetry: telemetryLogger !== null,
        chainGenerator: chainGenerator !== null
      }
    }
  };
}

async function handleReinitializeServices(): Promise<any> {
  try {
    // Reset state
    servicesInitialized = false;
    initializationPromise = null;

    // Close existing services
    if (telemetryLogger) {
      await telemetryLogger.close();
    }
    if (visionService) {
      await visionService.terminate();
    }

    // Clear references
    cdpService = null;
    accessibilityService = null;
    playwrightLocators = null;
    autoWaiting = null;
    visionService = null;
    decisionEngine = null;
    telemetryLogger = null;
    chainGenerator = null;

    // Reinitialize
    await initializeServices();

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Reinitialize failed'
    };
  }
}
```

### 12. Lifecycle Handlers

```typescript
/**
 * ============================================================================
 * LIFECYCLE
 * ============================================================================
 */

// Initialize services on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`[Background] Extension ${details.reason}:`, details);
  
  // Initialize services
  try {
    await initializeServices();
  } catch (error) {
    console.error('[Background] Failed to initialize on install:', error);
  }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Extension startup');
  
  try {
    await initializeServices();
  } catch (error) {
    console.error('[Background] Failed to initialize on startup:', error);
  }
});

// Handle tab close - detach debugger
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (cdpService) {
    try {
      await cdpService.detach(tabId);
    } catch {
      // Ignore - tab already gone
    }
  }
});

// Handle debugger detach events
chrome.debugger.onDetach.addListener((source, reason) => {
  console.log(`[Background] Debugger detached from tab ${source.tabId}: ${reason}`);
  // CDPService handles internal cleanup
});

// Keep service worker alive during long operations
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

function startKeepAlive(): void {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(() => {
    // Simple keep-alive ping
  }, 20000);
}

function stopKeepAlive(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}
```

---

## Integration Points

### With Content Script
```typescript
// Content script sends messages like:
chrome.runtime.sendMessage({
  action: 'GENERATE_FALLBACK_CHAIN',
  payload: { evidence: capturedData }
});
```

### With Popup UI
```typescript
// Popup sends messages like:
chrome.runtime.sendMessage({
  action: 'GET_SERVICE_STATUS'
});
```

---

## Acceptance Criteria

- [ ] All services initialize correctly on startup
- [ ] CDP operations work (attach/detach/command)
- [ ] DecisionEngine executes steps correctly
- [ ] VisionService handles OCR requests
- [ ] TelemetryLogger tracks runs and events
- [ ] Chain generation works from content script
- [ ] Storage operations save/load recordings
- [ ] Service status reported accurately
- [ ] Tab close cleans up debugger
- [ ] Error handling returns useful messages
- [ ] Backward compatible with existing features
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Service init fails**: Return error, allow retry
2. **Tab closes during operation**: Handle gracefully
3. **Concurrent requests**: Service handles properly
4. **Memory pressure**: VisionService manages cache
5. **Debugger already attached**: Handle gracefully
6. **Extension update**: Reinitialize services
7. **Storage quota exceeded**: Warn and handle
8. **Invalid message format**: Return error response
9. **Timeout on CDP command**: Retry with backoff
10. **Vision service not ready**: Queue or init on demand

---

## Estimated Lines

500-600 lines modified/added
