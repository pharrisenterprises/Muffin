/**
 * @fileoverview Vision Capture Layer
 * @description Captures visual evidence (screenshots, OCR text).
 * Layer 2 of 4 in recording capture system.
 * 
 * @module contentScript/layers/VisionCapture
 * @version 1.0.0
 * @since Phase 4
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface VisionCaptureConfig {
  captureScreenshot: boolean;
  runOCR: boolean;
  ocrLanguage: string;
  screenshotQuality: number;
  screenshotFormat: 'png' | 'jpeg';
  ocrRegionSize: number;
}

const DEFAULT_CONFIG: VisionCaptureConfig = {
  captureScreenshot: true,
  runOCR: true,
  ocrLanguage: 'eng',
  screenshotQuality: 0.8,
  screenshotFormat: 'jpeg',
  ocrRegionSize: 200
};

export interface VisionCaptureResult {
  screenshot?: string;
  ocrText?: string;
  confidence: number;
  textBbox?: { x: number; y: number; width: number; height: number };
  captureTimestamp: number;
}

// ============================================================================
// VISION CAPTURE CLASS
// ============================================================================

export class VisionCapture {
  private config: VisionCaptureConfig;

  constructor(config?: Partial<VisionCaptureConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // MAIN CAPTURE
  // ==========================================================================

  async capture(x: number, y: number): Promise<VisionCaptureResult> {
    const captureTimestamp = Date.now();
    const result: VisionCaptureResult = {
      confidence: 0,
      captureTimestamp
    };

    // Capture screenshot via background script
    if (this.config.captureScreenshot) {
      result.screenshot = await this.captureScreenshot();
    }

    // Run OCR via background script
    if (this.config.runOCR && result.screenshot) {
      const ocrResult = await this.runOCR(result.screenshot, x, y);
      if (ocrResult) {
        result.ocrText = ocrResult.text;
        result.confidence = ocrResult.confidence;
        result.textBbox = ocrResult.bbox;
      }
    }

    return result;
  }

  // ==========================================================================
  // SCREENSHOT
  // ==========================================================================

  private async captureScreenshot(): Promise<string | undefined> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT',
        payload: {
          format: this.config.screenshotFormat,
          quality: this.config.screenshotQuality * 100
        }
      });

      if (response?.success && response.screenshot) {
        return response.screenshot;
      }

      return undefined;
    } catch (error) {
      console.warn('[VisionCapture] Screenshot capture failed:', error);
      return undefined;
    }
  }

  // ==========================================================================
  // OCR
  // ==========================================================================

  private async runOCR(
    screenshot: string,
    x: number,
    y: number
  ): Promise<{ text: string; confidence: number; bbox?: { x: number; y: number; width: number; height: number } } | null> {
    try {
      // Define region around click point
      const regionSize = this.config.ocrRegionSize;
      const region = {
        x: Math.max(0, x - regionSize / 2),
        y: Math.max(0, y - regionSize / 2),
        width: regionSize,
        height: regionSize
      };

      const response = await chrome.runtime.sendMessage({
        type: 'RUN_OCR',
        payload: {
          screenshot,
          region,
          language: this.config.ocrLanguage
        }
      });

      if (response?.success && response.result) {
        return {
          text: response.result.text,
          confidence: response.result.confidence,
          bbox: response.result.bbox
        };
      }

      return null;
    } catch (error) {
      console.warn('[VisionCapture] OCR failed:', error);
      return null;
    }
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  updateConfig(config: Partial<VisionCaptureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): VisionCaptureConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: VisionCapture | null = null;

export function getVisionCapture(config?: Partial<VisionCaptureConfig>): VisionCapture {
  if (!instance) {
    instance = new VisionCapture(config);
  }
  return instance;
}
