/**
 * Vision Fallback for Recording
 * 
 * Triggers Vision-based recording when DOM recording fails
 * (e.g., when XPath/selector cannot be computed for an element).
 * 
 * Build Card: INT-009
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Vision fallback data captured during recording.
 */
interface VisionFallbackData {
  /** Click coordinates relative to viewport */
  clickX: number;
  clickY: number;
  /** Element bounds */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Text content near the click (for OCR verification) */
  nearbyText?: string;
  /** Element tag name */
  tagName: string;
  /** Timestamp of capture */
  timestamp: number;
}

/**
 * Result of Vision fallback attempt.
 */
interface VisionFallbackResult {
  success: boolean;
  data?: VisionFallbackData;
  error?: string;
}

// ============================================================================
// FALLBACK DETECTION
// ============================================================================

/**
 * Check if an element should trigger Vision fallback.
 * Returns true if DOM-based recording is likely to fail.
 * 
 * @param element - Element to check
 * @returns true if Vision fallback should be used
 */
export function shouldTriggerVisionFallback(element: Element): boolean {
  // Check if element has no useful identifiers
  const hasId = !!element.id;
  const hasUsefulClass = element.className && 
    !element.className.includes('generated') &&
    !element.className.match(/^[a-z]{8,}$/i); // Random hash classes
  
  // Check if element is in a shadow DOM
  const inShadowDOM = !!element.getRootNode() && 
    element.getRootNode() !== document;
  
  // Check if element is in an iframe
  // const inIframe = window.self !== window.top;
  
  // Check if XPath would be too long/fragile
  const depth = getElementDepth(element);
  const tooDeep = depth > 15;
  
  // Trigger fallback if:
  // - No useful identifiers AND too deep
  // - In shadow DOM
  // - In cross-origin iframe (detected by error)
  if (inShadowDOM) {
    console.log('[VisionFallback] Triggering: element in shadow DOM');
    return true;
  }
  
  if (!hasId && !hasUsefulClass && tooDeep) {
    console.log('[VisionFallback] Triggering: no identifiers and deep nesting');
    return true;
  }
  
  return false;
}

/**
 * Get the depth of an element in the DOM tree.
 */
function getElementDepth(element: Element): number {
  let depth = 0;
  let current: Element | null = element;
  
  while (current && current !== document.documentElement) {
    depth++;
    current = current.parentElement;
  }
  
  return depth;
}

// ============================================================================
// FALLBACK CAPTURE
// ============================================================================

/**
 * Capture Vision fallback data for an element.
 * Called when DOM recording fails or is unreliable.
 * 
 * @param element - Element that was clicked
 * @param event - Original mouse event
 * @returns Fallback data for Vision-based playback
 */
export function captureVisionFallback(
  element: Element,
  event: MouseEvent
): VisionFallbackResult {
  try {
    const rect = element.getBoundingClientRect();
    
    // Get click coordinates (prefer event coordinates, fall back to center)
    const clickX = event.clientX || (rect.left + rect.width / 2);
    const clickY = event.clientY || (rect.top + rect.height / 2);
    
    // Get nearby text content for OCR verification
    const nearbyText = getNearbyText(element);
    
    const data: VisionFallbackData = {
      clickX,
      clickY,
      bounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      nearbyText,
      tagName: element.tagName.toLowerCase(),
      timestamp: Date.now(),
    };
    
    console.log('[VisionFallback] Captured fallback data:', data);
    
    return {
      success: true,
      data,
    };
    
  } catch (error) {
    console.error('[VisionFallback] Capture error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get text content near an element for OCR verification.
 */
function getNearbyText(element: Element): string | undefined {
  // Try element's own text
  const ownText = element.textContent?.trim();
  if (ownText && ownText.length > 0 && ownText.length < 100) {
    return ownText;
  }
  
  // Try aria-label or title
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  const title = element.getAttribute('title');
  if (title) return title;
  
  // Try placeholder for inputs
  if (element instanceof HTMLInputElement) {
    if (element.placeholder) return element.placeholder;
  }
  
  // Try associated label
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label?.textContent) return label.textContent.trim();
  }
  
  return undefined;
}

// ============================================================================
// INTEGRATION WITH RECORDER
// ============================================================================

/**
 * Process a click event and determine recording method.
 * Returns Vision fallback data if DOM recording is unreliable.
 * 
 * @param element - Clicked element
 * @param event - Mouse event
 * @param domRecordingFailed - Whether DOM recording already failed
 * @returns Vision data if fallback triggered, null otherwise
 */
export function processClickForRecording(
  element: Element,
  event: MouseEvent,
  domRecordingFailed: boolean = false
): VisionFallbackData | null {
  // Always use Vision fallback if DOM recording failed
  if (domRecordingFailed) {
    const result = captureVisionFallback(element, event);
    return result.success ? result.data! : null;
  }
  
  // Check if we should proactively use Vision
  if (shouldTriggerVisionFallback(element)) {
    const result = captureVisionFallback(element, event);
    return result.success ? result.data! : null;
  }
  
  // DOM recording should work fine
  return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { VisionFallbackData, VisionFallbackResult };
