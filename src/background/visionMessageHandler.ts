/**
 * Vision Message Handler for Background Service Worker
 * 
 * Handles Vision-related messages that require background script privileges:
 * - VISION_SCREENSHOT: Captures visible tab using chrome.tabs.captureVisibleTab
 * - VISION_INJECT_SCRIPT: Injects content scripts into tabs
 * - Routes other VISION_* messages to content scripts
 */

// ============================================================================
// TYPES
// ============================================================================

export interface VisionScreenshotRequest {
  type: 'VISION_SCREENSHOT';
  tabId?: number;
}

export interface VisionScreenshotResponse {
  success: boolean;
  dataUrl?: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface VisionInjectScriptRequest {
  type: 'VISION_INJECT_SCRIPT';
  tabId: number;
  files?: string[];
}

export interface VisionInjectScriptResponse {
  success: boolean;
  error?: string;
}

export interface VisionForwardRequest {
  type: 'VISION_CLICK' | 'VISION_TYPE' | 'VISION_KEY' | 'VISION_SCROLL' | 'VISION_GET_ELEMENT';
  tabId: number;
  [key: string]: unknown;
}

// ============================================================================
// SCREENSHOT HANDLER (INT-006)
// ============================================================================

/**
 * Capture screenshot of the visible tab.
 * Uses chrome.tabs.captureVisibleTab which requires background context.
 * 
 * @param tabId - Optional tab ID (uses current window if not specified)
 * @returns Screenshot data URL and dimensions
 */
export async function handleVisionScreenshot(
  tabId?: number
): Promise<VisionScreenshotResponse> {
  try {
    // Determine which window to capture
    let windowId: number | undefined;
    
    if (tabId) {
      // Get the window ID for the specified tab
      const tab = await chrome.tabs.get(tabId);
      windowId = tab.windowId;
    }

    // Capture the visible tab
    const dataUrl = windowId !== undefined
      ? await chrome.tabs.captureVisibleTab(windowId, {
          format: 'png',
          quality: 100,
        })
      : await chrome.tabs.captureVisibleTab({
          format: 'png',
          quality: 100,
        });

    // Get image dimensions by creating an offscreen canvas (or estimate from tab)
    // Note: In service worker context, we can't use Image(), so we'll estimate
    // The actual dimensions will be determined by the VisionEngine
    
    console.log('[VisionHandler] Screenshot captured successfully');
    
    return {
      success: true,
      dataUrl,
      // Dimensions will be calculated by VisionEngine using Image API
    };
  } catch (error) {
    console.error('[VisionHandler] Screenshot failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// INJECT SCRIPT HANDLER (INT-007)
// ============================================================================

/**
 * Inject content scripts into a tab.
 * Used to ensure Vision handlers are available in the page.
 * 
 * @param tabId - Tab to inject into
 * @param files - Script files to inject (optional, uses default if not specified)
 * @returns Success status
 */
export async function handleVisionInjectScript(
  tabId: number,
  files?: string[]
): Promise<VisionInjectScriptResponse> {
  try {
    // Default to the content script
    const scriptsToInject = files || ['contentScript/index.js'];

    await chrome.scripting.executeScript({
      target: { tabId },
      files: scriptsToInject,
    });

    console.log(`[VisionHandler] Scripts injected into tab ${tabId}`);
    
    return { success: true };
  } catch (error) {
    console.error('[VisionHandler] Script injection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// FORWARD TO CONTENT SCRIPT
// ============================================================================

/**
 * Forward Vision messages to content script in the specified tab.
 * 
 * @param request - The Vision request to forward
 * @returns Response from content script
 */
export async function forwardToContentScript(
  request: VisionForwardRequest
): Promise<unknown> {
  const { tabId, ...message } = request;

  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    console.error('[VisionHandler] Forward to content script failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// MESSAGE ROUTER
// ============================================================================

/**
 * Handle all Vision-related messages.
 * Call this from the background script's message listener.
 * 
 * @param message - The message received
 * @param sender - Message sender info
 * @returns Response or undefined if not a Vision message
 */
export async function handleVisionMessage(
  message: { type: string; [key: string]: unknown },
  _sender: chrome.runtime.MessageSender
): Promise<unknown | undefined> {
  // Only handle VISION_* messages
  if (!message.type?.startsWith('VISION_')) {
    return undefined;
  }

  console.log(`[VisionHandler] Handling: ${message.type}`);

  switch (message.type) {
    case 'VISION_SCREENSHOT':
      return await handleVisionScreenshot(message.tabId as number | undefined);

    case 'VISION_INJECT_SCRIPT':
      return await handleVisionInjectScript(
        message.tabId as number,
        message.files as string[] | undefined
      );

    case 'VISION_CLICK':
    case 'VISION_TYPE':
    case 'VISION_KEY':
    case 'VISION_SCROLL':
    case 'VISION_GET_ELEMENT':
      // These need to be forwarded to the content script
      if (!message.tabId) {
        return { success: false, error: 'tabId is required' };
      }
      return await forwardToContentScript(message as VisionForwardRequest);

    default:
      console.warn(`[VisionHandler] Unknown Vision message type: ${message.type}`);
      return undefined;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default handleVisionMessage;
