/**
 * VISION OCR TIER (TIER 3)
 * 
 * Uses coordinates from bundle + visual verification
 * Fallback when DOM methods and CDP fail
 */

import { RecordedStep } from '../../recording/types';
import { TierResult } from '../types';
import { cdpClient } from '../CDPClient';

export class VisionOCRTier {
  
  /**
   * Execute a step using coordinate-based clicking
   */
  async execute(step: RecordedStep): Promise<TierResult> {
    const startTime = Date.now();
    
    console.log('[VisionOCRTier] Executing:', step.label);
    
    try {
      // Get coordinates from bundle or step
      let x: number | undefined;
      let y: number | undefined;
      
      // Priority 1: Recorded step coordinates
      if (step.x !== undefined && step.y !== undefined) {
        x = step.x;
        y = step.y;
      }
      // Priority 2: Bundle bounding box center
      else if (step.bundle.bounding && step.bundle.bounding.width > 0) {
        const b = step.bundle.bounding;
        x = b.x + b.width / 2;
        y = b.y + b.height / 2;
      }
      
      if (x === undefined || y === undefined) {
        return {
          tier: 'vision_ocr',
          success: false,
          error: 'No coordinates available for vision-based click',
          duration: Date.now() - startTime,
        };
      }
      
      // Ensure CDP is connected for Input events
      if (!cdpClient.isConnected()) {
        await cdpClient.attach();
      }
      
      // Execute based on event type
      switch (step.event) {
        case 'click':
          await cdpClient.clickAt(x, y);
          break;
          
        case 'input':
          // Click to focus, then type
          await cdpClient.clickAt(x, y);
          await this.sleep(100);
          if (step.value) {
            await cdpClient.typeText(step.value);
          }
          break;
          
        case 'enter':
          await cdpClient.clickAt(x, y);
          await this.sleep(50);
          await cdpClient.pressEnter();
          break;
          
        case 'keypress':
          await cdpClient.clickAt(x, y);
          await this.sleep(50);
          if (step.value) {
            await cdpClient.typeText(step.value);
          }
          break;
          
        case 'open':
          // Skip
          break;
      }
      
      return {
        tier: 'vision_ocr',
        success: true,
        duration: Date.now() - startTime,
        confidence: 0.6, // Lower confidence for coordinate-based
      };
      
    } catch (error) {
      return {
        tier: 'vision_ocr',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
