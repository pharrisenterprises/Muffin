/**
 * Background Service Worker Entry Point
 * 
 * Sets up message listeners and handles extension lifecycle.
 */

import { handleVisionMessage } from './visionMessageHandler';

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

/**
 * Main message listener for the background service worker.
 */
chrome.runtime.onMessage.addListener(
  (
    message: { type: string; [key: string]: unknown },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    // Log incoming messages
    console.log('[Background] Received message:', message.type);

    // Handle Vision messages
    if (message.type?.startsWith('VISION_')) {
      handleVisionMessage(message, sender)
        ?.then(sendResponse)
        .catch((error) => {
          console.error('[Background] Vision handler error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    // Handle Manual Selector Screenshot Capture
    if (message.type === 'CAPTURE_SCREENSHOT_FOR_SELECTOR') {
      (async () => {
        try {
          console.log('[Background] Capturing screenshot for selector tool');
          
          const [activeTab] = await chrome.tabs.query({ 
            active: true, 
            currentWindow: true 
          });
          
          if (!activeTab?.id || !activeTab?.windowId) {
            sendResponse({ error: 'No active tab found' });
            return;
          }

          // Capture the visible tab
          const screenshot = await chrome.tabs.captureVisibleTab(
            activeTab.windowId,
            { format: 'png', quality: 100 }
          );

          console.log('[Background] Screenshot captured successfully');

          sendResponse({
            success: true,
            screenshot: screenshot,
            tabId: activeTab.id,
            url: activeTab.url,
            viewport: {
              width: activeTab.width || 1920,
              height: activeTab.height || 1080,
            },
          });
        } catch (error) {
          console.error('[Background] Screenshot capture error:', error);
          sendResponse({ error: error instanceof Error ? error.message : 'Screenshot capture failed' });
        }
      })();
      return true; // Keep channel open for async response
    }

    // Handle other message types here...
    
    // Recording messages - pass through to Recorder UI
    if (message.type === 'START_RECORDING') {
      console.log('[Background] Start recording (passthrough)');
      return false; // Allow Recorder UI to receive
    }

    if (message.type === 'STOP_RECORDING') {
      console.log('[Background] Stop recording (passthrough)');
      return false; // Allow Recorder UI to receive
    }

    // logEvent messages - pass through to Recorder UI
    if (message.type === 'logEvent') {
      // Don't log every event to reduce noise
      return false; // Allow Recorder UI to receive
    }

    // Tab management
    if (message.type === 'GET_ACTIVE_TAB') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          sendResponse({ success: true, tab: tabs[0] });
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
      });
      return true;
    }

    // CDP Click Handler
    if (message.type === 'CDP_CLICK') {
      const { tabId, x, y } = message as any;
      
      chrome.debugger.attach({ tabId }, '1.3', () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        
        // Mouse down
        chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x, y,
          button: 'left',
          clickCount: 1
        }, () => {
          // Mouse up
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x, y,
            button: 'left',
            clickCount: 1
          }, () => {
            chrome.debugger.detach({ tabId }, () => {
              sendResponse({ success: true });
            });
          });
        });
      });
      
      return true; // Async response
    }

    // CDP Type Handler
    if (message.type === 'CDP_TYPE') {
      const { tabId, text, nodeSelector } = message as any;
      
      chrome.debugger.attach({ tabId }, '1.3', async () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        
        try {
          // Get document
          const docResult = await new Promise<any>((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'DOM.getDocument', {}, resolve);
          });
          
          // Find element
          const queryResult = await new Promise<any>((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'DOM.querySelector', {
              nodeId: docResult.root.nodeId,
              selector: nodeSelector
            }, resolve);
          });
          
          if (!queryResult.nodeId) {
            throw new Error('Element not found');
          }
          
          // Focus element
          await new Promise<void>((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'DOM.focus', {
              nodeId: queryResult.nodeId
            }, () => resolve());
          });
          
          // Type text
          for (const char of text) {
            await new Promise<void>((resolve) => {
              chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
                type: 'keyDown',
                text: char
              }, () => {
                chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
                  type: 'keyUp',
                  text: char
                }, () => resolve());
              });
            });
            await new Promise(r => setTimeout(r, 30));
          }
          
          chrome.debugger.detach({ tabId }, () => {
            sendResponse({ success: true });
          });
          
        } catch (error) {
          chrome.debugger.detach({ tabId }, () => {
            sendResponse({ success: false, error: String(error) });
          });
        }
      });
      
      return true;
    }

    // Unknown message
    console.warn('[Background] Unknown message type:', message.type);
    return false;
  }
);

// ============================================================================
// EXTENSION LIFECYCLE
// ============================================================================

/**
 * Handle extension installation/update.
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // First-time install
    console.log('[Background] First-time installation');
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('[Background] Updated from version:', details.previousVersion);
  }
});

/**
 * Handle extension startup.
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Extension started');
});

// ============================================================================
// EXPORTS
// ============================================================================

export { handleVisionMessage };

console.log('[Background] Service worker initialized');
