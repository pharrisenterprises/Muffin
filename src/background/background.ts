import { DB } from "../common/services/indexedDB";
import { handleVisionMessage } from './visionMessageHandler';

// ============================================================================
// PHASE 4 IMPORTS
// ============================================================================

import { getCDPService } from './services/CDPService';
import { getPlaybackController } from './services/PlaybackController';
import { getVisionService } from './services/VisionService';
import { getTelemetryLogger } from './services/TelemetryLogger';

// P40: Additional Phase 4 service imports
import { getDecisionEngine, type ActionExecutionResult } from './services/DecisionEngine';
// @ts-expect-error - Reserved for future direct action execution
import { getActionExecutor } from './services/ActionExecutor';
import { 
  initializeServices,
  type ServiceInstances 
} from './services';

async function ensurePersistentStorage() {
  if ('storage' in navigator && navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    console.log("Storage persisted?", isPersisted);
    if (!isPersisted) {
      const granted = await navigator.storage.persist();
      console.log("Persistence granted:", granted);
    }
  } else {
    console.log("navigator.storage.persist not available in this context");
  }
}


//Call this ONCE when service worker starts
ensurePersistentStorage();

// ═══════════════════════════════════════════════════════════════════════════════
// P40: SERVICE INSTANCE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/** Singleton service container - initialized on extension startup */
let serviceInstances: ServiceInstances | null = null;

/** Flag to prevent multiple initialization attempts */
let servicesInitializing = false;

/**
 * Initialize all Phase 4 services with proper dependency injection
 * Called on extension install/startup
 */
async function initializePhase4Services(): Promise<boolean> {
  if (serviceInstances) {
    console.log('[Muffin P40] Services already initialized');
    return true;
  }
  
  if (servicesInitializing) {
    console.log('[Muffin P40] Services initialization already in progress');
    return false;
  }
  
  servicesInitializing = true;
  
  try {
    console.log('[Muffin P40] Initializing Phase 4 services...');
    
    // Initialize all services with async init (Vision OCR, Telemetry DB)
    serviceInstances = await initializeServices();
    
    console.log('[Muffin P40] ✅ All services initialized:');
    console.log('  - CDP Service: Ready for Chrome DevTools Protocol');
    console.log('  - Accessibility Service: Ready for semantic element finding');
    console.log('  - Vision Service: Tesseract OCR loaded');
    console.log('  - Telemetry Logger: IndexedDB ready');
    console.log('  - Decision Engine: 7-tier fallback chain ready');
    
    servicesInitializing = false;
    return true;
    
  } catch (error) {
    console.error('[Muffin P40] ❌ Failed to initialize services:', error);
    servicesInitializing = false;
    return false;
  }
}

/**
 * Get current services instance (may be null if not initialized)
 * Reserved for future use
 */
// @ts-expect-error - Unused function reserved for future use
function getServiceInstances(): ServiceInstances | null {
  return serviceInstances;
}

/**
 * Check if Phase 4 services are ready for use
 */
function isServicesReady(): boolean {
  return serviceInstances !== null;
}

let openedTabId: number | null = null;
const trackedTabs = new Set<number>();

// ============================================
// BATCH B-40: Vision Recording Support
// Captures screenshots for OCR during recording
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VISION_CAPTURE_FOR_RECORDING') {
    (async () => {
      try {
        if (!sender.tab?.windowId) {
          sendResponse({ error: 'No window context' });
          return;
        }
        
        // Capture the visible tab
        const screenshot = await chrome.tabs.captureVisibleTab(
          sender.tab.windowId,
          { format: 'png' }
        );
        
        // For now, return screenshot and let content script handle OCR
        // (Tesseract works better in content script context)
        sendResponse({
          screenshot: screenshot,
          bounds: message.bounds,
          text: null // Content script will extract via DOM first
        });
        
      } catch (error) {
        console.error('[TestFlow Background] Screenshot capture failed:', error);
        sendResponse({ error: String(error) });
      }
    })();
    
    return true; // Keep channel open for async response
  }
});

// ============================================================================
// PHASE 4 MESSAGE HANDLERS
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    // ═══════════════════════════════════════════════════════════════════════
    // P40: EXECUTE_STEP - Run step using DecisionEngine with fallback chain
    // Called by TestRunner during playback
    // ═══════════════════════════════════════════════════════════════════════
    case 'EXECUTE_STEP': {
      const { tabId: targetTabId, step } = message as {
        tabId: number;
        step: any; // Step from TestRunner
      };
      
      if (!serviceInstances) {
        console.warn('[Muffin P40] DecisionEngine not available - services not initialized');
        sendResponse({ 
          success: false, 
          error: 'Services not initialized. Try reloading the extension.',
          fallback: 'basic'
        });
        return true;
      }
      
      // Execute step with 7-tier fallback chain
      const decisionEngine = getDecisionEngine();
      decisionEngine.executeAction({
        tabId: targetTabId,
        fallbackChain: step.fallbackChain || { strategies: [] },
        actionType: step.action || 'click',
        value: step.value,
        stepIndex: step.index
      })
        .then((result: ActionExecutionResult) => {
          console.log(`[Muffin P40] Step "${step.label}" executed via ${result.usedStrategy.type} (${result.success ? 'success' : 'failed'})`);
          sendResponse({ 
            success: result.success, 
            strategyUsed: result.usedStrategy,
            duration: result.totalDuration 
          });
        })
        .catch((error: Error) => {
          console.error('[Muffin P40] Step execution failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      
      return true; // Keep channel open for async response
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // P40: GET_SERVICE_STATUS - Check if Phase 4 services are available
    // Used by UI to show service indicators
    // ═══════════════════════════════════════════════════════════════════════
    case 'GET_SERVICE_STATUS': {
      sendResponse({
        ready: isServicesReady(),
        services: serviceInstances ? {
          cdp: !!serviceInstances.cdpService,
          accessibility: !!serviceInstances.accessibilityService,
          vision: !!serviceInstances.visionService,
          telemetry: !!serviceInstances.telemetryLogger,
          playwrightLocators: !!serviceInstances.playwrightLocators,
          autoWaiting: !!serviceInstances.autoWaiting
        } : null,
        version: '4.0.0'
      });
      return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // P40: GET_ANALYTICS - Retrieve strategy metrics and run history
    // Called by Analytics dashboard
    // ═══════════════════════════════════════════════════════════════════════
    case 'GET_ANALYTICS': {
      if (!serviceInstances?.telemetryLogger) {
        sendResponse({ metrics: null, recentRuns: [], error: 'Telemetry not available' });
        return true;
      }
      
      const { days = 30 } = message;
      // Parallel query: metrics + recent run summaries
      const now = Date.now();
      const startTime = days ? now - (days * 24 * 60 * 60 * 1000) : undefined;
      const timeRange = startTime ? { start: startTime, end: now } : undefined;
      
      Promise.all([
        serviceInstances.telemetryLogger.getStrategyMetrics(timeRange),
        serviceInstances.telemetryLogger.getRunSummaries(timeRange)
      ]).then(([metrics, runSummaries]) => {
        // Return strategy metrics and run summaries
        const recentRuns = runSummaries.slice(0, 20).map(summary => ({
          runId: summary.runId,
          startTime: summary.startTime,
          endTime: summary.endTime,
          totalSteps: summary.totalSteps,
          successfulSteps: summary.successfulSteps,
          passRate: summary.passRate
        }));
        
        sendResponse({ metrics, recentRuns });
      }).catch((error) => {
        console.error('[Muffin P40] Failed to get analytics:', error);
        sendResponse({ metrics: null, recentRuns: [], error: error.message });
      });
      
      return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // P40: ATTACH_CDP - Attach Chrome DevTools Protocol to a tab
    // Required for advanced element finding strategies
    // ═══════════════════════════════════════════════════════════════════════
    case 'ATTACH_CDP': {
      const { tabId: targetTabId } = message;
      
      if (!serviceInstances?.cdpService) {
        sendResponse({ success: false, error: 'CDP service not available' });
        return true;
      }
      
      serviceInstances.cdpService.attach(targetTabId)
        .then(() => {
          console.log(`[Muffin P40] CDP attached to tab ${targetTabId}`);
          sendResponse({ success: true });
        })
        .catch((error: Error) => {
          // Some tabs can't be debugged (chrome://, devtools, etc.)
          console.warn(`[Muffin P40] CDP attach failed for tab ${targetTabId}:`, error.message);
          sendResponse({ success: false, error: error.message });
        });
      
      return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // P40: DETACH_CDP - Detach CDP from a tab
    // Called when recording/playback ends
    // ═══════════════════════════════════════════════════════════════════════
    case 'DETACH_CDP': {
      const { tabId: targetTabId } = message;
      
      if (!serviceInstances?.cdpService) {
        sendResponse({ success: true }); // No-op if service unavailable
        return true;
      }
      
      serviceInstances.cdpService.detach(targetTabId)
        .then(() => sendResponse({ success: true }))
        .catch((error: Error) => sendResponse({ success: false, error: error.message }));
      
      return true;
    }
    
    // ========================================================================
    // SCREENSHOT / VISION (Existing handlers preserved)
    // ========================================================================
    case 'CAPTURE_SCREENSHOT':
      handleScreenshotCapture(tabId, message.payload)
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // Async response

    case 'RUN_OCR':
      handleOCRRequest(message.payload)
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    // ========================================================================
    // PLAYBACK
    // ========================================================================
    case 'START_PLAYBACK':
      handleStartPlayback(message.payload)
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'PAUSE_PLAYBACK':
      getPlaybackController().pause();
      sendResponse({ success: true });
      return false;

    case 'RESUME_PLAYBACK':
      getPlaybackController().resume();
      sendResponse({ success: true });
      return false;

    case 'STOP_PLAYBACK':
      getPlaybackController().stop();
      sendResponse({ success: true });
      return false;

    // ========================================================================
    // CDP COMMANDS
    // ========================================================================
    case 'CDP_COMMAND':
      handleCDPCommand(tabId, message.payload)
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    // ========================================================================
    // TELEMETRY
    // ========================================================================
    case 'GET_TELEMETRY':
      handleGetTelemetry()
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
  }

  // Return false for unhandled messages (let other listeners handle)
  return false;
});

// ============================================================================
// HANDLER IMPLEMENTATIONS
// ============================================================================

async function handleScreenshotCapture(
  tabId: number | undefined,
  payload: { format?: string; quality?: number }
): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  if (!tabId) {
    return { success: false, error: 'No tab ID' };
  }

  try {
    const screenshot = await chrome.tabs.captureVisibleTab({
      format: (payload.format as 'png' | 'jpeg') ?? 'jpeg',
      quality: payload.quality ?? 80
    });

    return { success: true, screenshot };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Screenshot failed' 
    };
  }
}

async function handleOCRRequest(
  payload: { screenshot: string; region?: object; language?: string }
): Promise<{ success: boolean; result?: object; error?: string }> {
  try {
    const visionService = getVisionService();

    if (!visionService.isReady()) {
      await visionService.initialize();
    }

    const result = await visionService.performOCR({
      data: payload.screenshot,
      width: 0,
      height: 0,
      scale: 1,
      timestamp: Date.now(),
      tabId: 0
    });

    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'OCR failed' 
    };
  }
}

async function handleStartPlayback(
  payload: { tabId: number; steps: any[] }
): Promise<{ success: boolean; result?: object; error?: string }> {
  try {
    const controller = getPlaybackController();
    const result = await controller.start(payload.tabId, payload.steps);

    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Playback failed' 
    };
  }
}

async function handleCDPCommand(
  tabId: number | undefined,
  payload: { method: string; params?: Record<string, unknown> }
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  if (!tabId) {
    return { success: false, error: 'No tab ID' };
  }

  try {
    const cdpService = getCDPService();
    const result = await cdpService.sendCommand(tabId, payload.method, payload.params);

    return { success: result.success, result: result.result, error: result.error };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'CDP command failed' 
    };
  }
}

async function handleGetTelemetry(): Promise<{ success: boolean; runs?: any[]; events?: any[]; error?: string }> {
  try {
    const telemetry = getTelemetryLogger();
    const runs = await telemetry.getRunSummaries();
    const events = await telemetry.getEvents({ limit: 20 });

    return { success: true, runs, events };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Telemetry fetch failed' 
    };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BACKGROUND] Message:', (message as any).action || message.type);
  console.log("[Background] Message received:", message, "from sender:", sender);
  
  // Handle Vision messages first
  const visionResponse = handleVisionMessage(message, sender);
  if (visionResponse !== undefined) {
    console.log("[Background] Handling as Vision message");
    // Return true to indicate async response
    Promise.resolve(visionResponse).then(sendResponse);
    return true;
  }
  
  // B-60: Handle logEvent messages from content script
  // Let the message pass through to Recorder dashboard - don't consume it
  if (message.type === "logEvent") {
    // FIX 9-9: Removed debug log (fires for every recorded event)
    // Return false to allow other listeners (Recorder page) to receive the message
    return false;
  }
  
  if (!message.action) {
    console.log("[Background] No action specified, returning false");
    return false;
  }
  
  console.log("[Background] Processing action:", message.action);
  try {
    //const senderTabId = sender?.tab?.id;
    if (message.action === "add_project") {
      console.log("Background: Received add_project request", message.payload);
      const newProject = {
        ...message.payload,
        recorded_steps: [],
        parsed_fields: [],
        csv_data: []
      };
      DB.addProject(newProject)
        .then(id => {
          console.log("Background: Project added successfully with ID:", id);
          sendResponse({ success: true, id });
        })
        .catch(error => {
          console.error("Background: Error adding project:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (message.action === "update_project") {
      const { id, ...updates } = message.payload;
      
      // Support both old and new field names, and Vision fields
      const projectUpdates: any = {};
      if (updates.name || updates.projectName) {
        projectUpdates.projectName = updates.name || updates.projectName;
      }
      if (updates.target_url || updates.project_url) {
        projectUpdates.project_url = updates.target_url || updates.project_url;
      }
      if (updates.recorded_steps !== undefined) {
        projectUpdates.recorded_steps = updates.recorded_steps;
      }
      if (updates.loopStartIndex !== undefined) {
        projectUpdates.loopStartIndex = updates.loopStartIndex;
      }
      if (updates.globalDelayMs !== undefined) {
        projectUpdates.globalDelayMs = updates.globalDelayMs;
      }
      if (updates.conditionalDefaults !== undefined) {
        projectUpdates.conditionalDefaults = updates.conditionalDefaults;
      }
      if (updates.schemaVersion !== undefined) {
        projectUpdates.schemaVersion = updates.schemaVersion;
      }
      
      DB.updateProject(id, projectUpdates)
        .then(() => sendResponse({ success: true }))
        .catch(error =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }
    
    if (message.action === "get_project") {
      const projectId = message.payload?.id;
      DB.projects.get(projectId)
        .then((project) => {
          if (project) {
            sendResponse({ success: true, project });
          } else {
            sendResponse({ success: false, error: 'Project not found' });
          }
        })
        .catch(error =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    if (message.action === "get_all_projects") {
      DB.getAllProjects()
        .then(projects => sendResponse({ success: true, projects }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (message.action === "delete_project") {
      const projectId = message.payload?.projectId;
      DB.deleteProject(projectId)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (message.action === "get_project_by_id") {
      const id = message.payload?.id;
      DB.projects.get(id)
        .then((project) => {
          if (project) {
            sendResponse({ success: true, project });
          } else {
            sendResponse({ success: false, error: "Process  not found" });
          }
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (message.action === "open_project_url_and_inject") {
      const projectId = message.payload?.id;
      DB.getAllProjects()
        .then((projects) => {
          const project = projects.find(p => p.id === projectId);
          if (!project) {
            sendResponse({ success: false, error: "Process not found" });
            return;
          }

          // FIX-003: Support both target_url and project_url field names
          const targetUrl = (project as any).target_url || project.project_url;
          if (!targetUrl) {
            sendResponse({ success: false, error: 'No target URL configured for project' });
            return;
          }

          chrome.tabs.create({ url: targetUrl }, (tab) => {
            if (tab?.id) {
              openedTabId = tab.id;
              trackedTabs.add(tab.id);
              injectMain(tab.id);
              sendResponse({ success: true, tabId: tab.id });
            } else {
              sendResponse({ success: false, error: 'Failed to create tab' });
            }
          });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (message.action === "update_project_steps") {
      const { id, recorded_steps, loopStartIndex, globalDelayMs, delayMode } = message.payload;

      DB.projects.update(id, {
        recorded_steps,
        // VISION: Save Vision fields
          ...(loopStartIndex !== undefined && { loopStartIndex }),
          ...(globalDelayMs !== undefined && { globalDelayMs }),
          ...(delayMode !== undefined && { delayMode }),
        ...(delayMode !== undefined && { delayMode }), // B-43: Add this
        updated_date: new Date().toISOString()
      })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (message.action === "update_project_fields") {
      const { id, parsed_fields } = message.payload;

      DB.projects.update(id, { parsed_fields })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message.action === "update_project_csv") {
      const { id, csv_data } = message.payload;

      DB.projects.update(id, { csv_data })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message.action === 'createTestRun') {
      (async () => {
        try {
          const id = await DB.testRuns.add(message.payload);
          const testRun = await DB.testRuns.get(id);
          sendResponse({ success: true, testRun });
        } catch (err) {
          //console.error("Error creating test run:", err);
          sendResponse({ success: false, error: err });
        }
      })();
      return true;
    }

    if (message.action === 'updateTestRun') {
      (async () => {
        try {
          await DB.testRuns.update(message.id, message.payload);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err });
        }
      })();
      return true;
    }

    if (message.action === "getTestRunsByProject") {
      const projectId = message.projectId;

      DB.getTestRunsByProject(projectId)
        .then((runs) => {
          sendResponse({ success: true, data: runs });
        })
        .catch((error) => {
          //console.error("Error fetching test runs:", error);
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message.action === "openTab") {
      const target_url = message.url;

      // Create new tab
      chrome.tabs.create({ url: target_url }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to create tab:", chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        if (!tab?.id) {
          sendResponse({ success: false, error: "No tab ID returned" });
          return;
        }

        // Once tab is created, inject your content script
        injectMain(tab.id, (result) => {
          if (result.success) {
            console.log("Injected into tab", tab.id);
            if (tab?.id) {
              openedTabId = tab.id;
              trackedTabs.add(tab.id);
              sendResponse({ success: true, tabId: tab.id });
            }
          } else {
            console.error("Injection failed:", result.error);
            sendResponse({ success: false, error: result.error });
          }
        });
      });

      // Return true so sendResponse stays alive (async)
      return true;
    }
    if (message.action === "close_opened_tab") {
      if (openedTabId !== null) {
        chrome.tabs.remove(openedTabId, () => {
          openedTabId = null;
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: "No opened tab to close" });
      }
      return true;
    }

    if (message.action === "openDashBoard") {
      chrome.tabs.create({ url: chrome.runtime.getURL("pages.html") }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    // Unknown action
    console.warn("Background: Unknown action:", message.action);
    sendResponse({ success: false, error: `Unknown action: ${message.action}` });
    return false;

  } catch (err: any) {
    console.error("Background: Exception in message handler:", err);
    sendResponse({ success: false, error: err.message });
    return false;
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("pages.html"),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// P40: EXTENSION LIFECYCLE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize services when extension is installed or updated
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Muffin P40] Extension installed/updated:', details.reason);
  
  // Initialize comprehensive Phase 4 services
  const success = await initializePhase4Services();
  
  if (success) {
    console.log('[Muffin P40] ✅ Ready for multi-layer recording and 7-tier playback');
  } else {
    console.log('[Muffin P40] ⚠️ Running in basic mode (Phase 4 services unavailable)');
    
    // Fallback: Initialize legacy singletons
    getCDPService();
    getTelemetryLogger();
  }

  if (details.reason === "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("pages.html#dashboard"),
    });
  }
});

/**
 * Re-initialize services when service worker wakes up
 * (Service workers can be terminated and restarted by Chrome)
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Muffin P40] Service worker startup - re-initializing services');
  await initializePhase4Services();
});

// helper function
function injectMain(tabId: number, cb?: (result: any) => void) {
  chrome.scripting.executeScript(
    {
      target: { tabId, allFrames: true },
      files: ["js/main.js"]
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn("Inject failed:", chrome.runtime.lastError.message);
        cb?.({ success: false });
      } else {
        console.log("Injected main.js into tab", tabId);
        cb?.({ success: true });
      }
    }
  );
}

// Reinjection on navigation (main or iframe)
chrome.webNavigation.onCommitted.addListener((details) => {
  if (trackedTabs.has(details.tabId)) {
    console.log("Frame navigated:", details.frameId, details.url);
    injectMain(details.tabId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// P40: TAB EVENT HANDLERS
// Auto-attach CDP for better element finding
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Optionally attach CDP when a tab becomes active
 * This enables faster step execution during playback
 */
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!serviceInstances?.cdpService) return;
  
  try {
    // Get tab info to check if it's debuggable
    const tab = await chrome.tabs.get(tabId);
    
    // Skip chrome:// and other restricted URLs
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('devtools://')) {
      return;
    }
    
    // Attach CDP (will be no-op if already attached)
    await serviceInstances.cdpService.attach(tabId);
    console.log(`[Muffin P40] CDP auto-attached to tab ${tabId}`);
  } catch (_e) {
    // Silently ignore - tab may not be debuggable
  }
});

/**
 * Clean up CDP connection when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  if (serviceInstances?.cdpService) {
    serviceInstances.cdpService.detach(tabId).catch(() => {
      // Ignore - tab already gone
    });
    console.log(`[Muffin P40] CDP detached from closed tab ${tabId}`);
  }
});