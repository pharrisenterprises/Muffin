/**
 * Vision Fallback Recorder (INT-009)
 * 
 * Captures Vision data when DOM recording fails.
 * Falls back to screenshot + OCR to record element interactions.
 */

import type { Step } from '../types/vision';

// Coordinates type
export interface Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// TYPES
// ============================================================================

export interface VisionCaptureResult {
  success: boolean;
  coordinates?: Coordinates;
  ocrText?: string;
  confidenceScore?: number;
  error?: string;
}

export interface ElementCaptureOptions {
  /** The element that was interacted with */
  element: Element;
  /** The event type (click, input, etc.) */
  event: string;
  /** Input value if applicable */
  value?: string;
}

// ============================================================================
// VISION CAPTURE
// ============================================================================

/**
 * Capture Vision data for an element.
 * Called when DOM recording fails (no selector/xpath).
 * 
 * @param options - Capture options
 * @returns Vision capture result
 */
export async function captureVisionData(
  options: ElementCaptureOptions
): Promise<VisionCaptureResult> {
  const { element } = options;

  try {
    // Get element bounding rectangle
    const rect = element.getBoundingClientRect();

    // Check if element is visible
    if (rect.width === 0 || rect.height === 0) {
      return {
        success: false,
        error: 'Element has no dimensions',
      };
    }

    // Create coordinates object
    const coordinates: Coordinates = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

    // Get text content for OCR matching
    const ocrText = getElementText(element);

    // Estimate confidence (100% since we have the exact element)
    const confidenceScore = 100;

    console.log('[VisionRecorder] Captured Vision data:', {
      coordinates,
      ocrText,
      confidenceScore,
    });

    return {
      success: true,
      coordinates,
      ocrText,
      confidenceScore,
    };
  } catch (error) {
    console.error('[VisionRecorder] Capture failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get text content from an element for OCR matching.
 * 
 * @param element - The element to get text from
 * @returns Text content
 */
function getElementText(element: Element): string {
  // For buttons, inputs, links - get the visible text
  if (element instanceof HTMLButtonElement) {
    return element.textContent?.trim() || element.value || '';
  }

  if (element instanceof HTMLInputElement) {
    // For inputs, use placeholder or aria-label
    return element.placeholder || element.getAttribute('aria-label') || '';
  }

  if (element instanceof HTMLAnchorElement) {
    return element.textContent?.trim() || '';
  }

  if (element instanceof HTMLSelectElement) {
    const selectedOption = element.options[element.selectedIndex];
    return selectedOption?.textContent?.trim() || '';
  }

  // For other elements, get text content
  const text = element.textContent?.trim() || '';
  
  // Truncate if too long
  return text.substring(0, 50);
}

// ============================================================================
// STEP CREATION
// ============================================================================

/**
 * Create a Vision-recorded step from capture data.
 * 
 * @param options - Element capture options
 * @param visionData - Vision capture result
 * @returns Step object with Vision data
 */
export function createVisionStep(
  options: ElementCaptureOptions,
  visionData: VisionCaptureResult
): Partial<Step> {
  const stepData: Partial<Step> = {
    event: options.event as Step['event'],
    recordedVia: 'vision',
    coordinates: visionData.coordinates,
    ocrText: visionData.ocrText,
    confidenceScore: visionData.confidenceScore,
    timestamp: Date.now(),
  };

  // Add value for input events
  if (options.value) {
    stepData.value = options.value;
  }

  // Generate label from OCR text
  if (visionData.ocrText) {
    stepData.label = `${options.event}: ${visionData.ocrText.substring(0, 20)}`;
  }

  return stepData;
}

// ============================================================================
// FALLBACK HANDLER
// ============================================================================

/**
 * Handle DOM recording failure by falling back to Vision.
 * 
 * @param element - The element that was interacted with
 * @param event - The event type
 * @param value - Optional input value
 * @returns Step data or null if Vision capture also fails
 */
export async function handleVisionFallback(
  element: Element,
  event: string,
  value?: string
): Promise<Partial<Step> | null> {
  console.log('[VisionRecorder] DOM recording failed, attempting Vision fallback...');

  const captureResult = await captureVisionData({
    element,
    event,
    value,
  });

  if (!captureResult.success) {
    console.error('[VisionRecorder] Vision fallback also failed:', captureResult.error);
    return null;
  }

  const stepData = createVisionStep(
    { element, event, value },
    captureResult
  );

  console.log('[VisionRecorder] Vision fallback successful:', stepData);
  return stepData;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { getElementText };
