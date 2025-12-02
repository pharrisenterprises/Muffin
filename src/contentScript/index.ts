/**
 * Content Script Entry Point
 * 
 * Initializes all content script modules including Vision handlers.
 */

import { initializeVisionHandlers } from './visionHandlers';

// Initialize Vision handlers
initializeVisionHandlers();

// Re-export for external use
export * from './visionHandlers';

console.log('[ContentScript] Muffin Lite content script loaded');
