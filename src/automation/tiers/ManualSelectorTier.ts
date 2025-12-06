/**
 * MANUAL SELECTOR TIER (TIER 4 - LAST RESORT)
 * 
 * Uses user-defined manual coordinates stored in the bundle
 * This is the FALLBACK OF LAST RESORT when all other methods fail
 * 
 * ⚠️ CRITICAL: This tier should ONLY be reached after tiers 1-3 have failed
 */

import { RecordedStep } from '../../recording/types';
import { TierResult } from '../types';
import { cdpClient } from '../CDPClient';

export class ManualSelectorTier {
  
  /**
   * Execute a step using manual selector coordinates
   */
  async execute(step: RecordedStep): Promise<TierResult> {
    const startTime = Date.now();
    
    console.log('[ManualSelectorTier] ⚠️ LAST RESORT - Using manual coordinates');
    
    try {
      // Check if manual selector data exists
      const manual = step.bundle.manualSelector;
      
      if (!manual) {
        return {
          tier: 'manual_selector',
          success: false,
          error: 'No manual selector data available. User must define coordinates via Manual Selector Tool.',
          duration: Date.now() - startTime,
        };
      }
      
      // Validate coordinates
      if (manual.centerX === undefined || manual.centerY === undefined) {
        return {
          tier: 'manual_selector',
          success: false,
          error: 'Invalid manual selector data - missing coordinates',
          duration: Date.now() - startTime,
        };
      }
      
      // Check viewport dimensions match (coordinates might be stale)
      const viewportMatches = 
        Math.abs(window.innerWidth - manual.viewportWidth) < 50 &&
        Math.abs(window.innerHeight - manual.viewportHeight) < 50;
      
      if (!viewportMatches) {
        console.warn('[ManualSelectorTier] Viewport size changed since recording. Coordinates may be inaccurate.');
      }
      
      // Ensure CDP is connected
      if (!cdpClient.isConnected()) {
        await cdpClient.attach();
      }
      
      // Execute at manual coordinates
      const x = manual.centerX;
      const y = manual.centerY;
      
      console.log('[ManualSelectorTier] Clicking at manual coordinates:', x, y);
      
      switch (step.event) {
        case 'click':
          await cdpClient.clickAt(x, y);
          break;
          
        case 'input':
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
        tier: 'manual_selector',
        success: true,
        duration: Date.now() - startTime,
        confidence: 0.5, // Lowest confidence - purely coordinate based
      };
      
    } catch (error) {
      return {
        tier: 'manual_selector',
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
