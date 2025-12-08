/**
 * @fileoverview Capture Layers Barrel Export
 * @description Re-exports all 4 capture layers for RecordingOrchestrator.
 * 
 * @module contentScript/layers
 * @version 1.0.0
 * @since Phase 4
 */

// ============================================================================
// CAPTURE LAYERS
// ============================================================================

export {
  DOMCapture,
  getDOMCapture,
  type DOMCaptureConfig,
  type DOMCaptureResult
} from './DOMCapture';

export {
  VisionCapture,
  getVisionCapture,
  type VisionCaptureConfig,
  type VisionCaptureResult
} from './VisionCapture';

export {
  MouseCapture,
  getMouseCapture,
  type MouseCaptureConfig,
  type MouseCaptureResult,
  type MousePoint
} from './MouseCapture';

export {
  NetworkCapture,
  getNetworkCapture,
  type NetworkCaptureConfig,
  type NetworkCaptureResult,
  type NetworkRequest
} from './NetworkCapture';

// ============================================================================
// COMBINED TYPES
// ============================================================================

import type { DOMCaptureResult } from './DOMCapture';
import type { VisionCaptureResult } from './VisionCapture';
import type { MouseCaptureResult } from './MouseCapture';
import type { NetworkCaptureResult } from './NetworkCapture';

/**
 * Combined evidence from all 4 capture layers.
 */
export interface CapturedEvidence {
  dom: DOMCaptureResult;
  vision?: VisionCaptureResult;
  mouse?: MouseCaptureResult;
  network?: NetworkCaptureResult;
  timestamp: number;
}
