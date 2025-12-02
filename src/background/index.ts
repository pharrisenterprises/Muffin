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
        .then(sendResponse)
        .catch((error) => {
          console.error('[Background] Vision handler error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    // Handle other message types here...
    
    // Recording messages
    if (message.type === 'START_RECORDING') {
      console.log('[Background] Start recording');
      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'STOP_RECORDING') {
      console.log('[Background] Stop recording');
      sendResponse({ success: true });
      return true;
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
