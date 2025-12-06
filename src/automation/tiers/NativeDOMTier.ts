/**
 * NATIVE DOM TIER (TIER 1)
 * 
 * Uses standard DOM methods with context validation
 * This is the primary/fastest tier
 */

import { RecordedStep } from '../../recording/types';
import { TierResult } from '../types';
import { ElementFinder } from '../../playback/ElementFinder';
import { ActionExecutor } from '../../playback/ActionExecutor';
import { DEFAULT_PLAYBACK_CONFIG } from '../../playback/types';

export class NativeDOMTier {
  private elementFinder: ElementFinder;
  private actionExecutor: ActionExecutor;
  
  constructor() {
    this.elementFinder = new ElementFinder({
      ...DEFAULT_PLAYBACK_CONFIG,
      validateContext: true, // CRITICAL: Enable context validation
    });
    this.actionExecutor = new ActionExecutor(DEFAULT_PLAYBACK_CONFIG);
  }
  
  /**
   * Execute a step using native DOM methods
   */
  async execute(step: RecordedStep): Promise<TierResult> {
    const startTime = Date.now();
    
    console.log('[NativeDOMTier] Executing:', step.label);
    
    try {
      // Find element with context validation
      const findResult = await this.elementFinder.find(step.bundle, 3000);
      
      if (!findResult.element) {
        return {
          tier: 'native_dom',
          success: false,
          error: `Element not found: ${findResult.attempts.join(', ')}`,
          duration: Date.now() - startTime,
        };
      }
      
      // Execute action
      switch (step.event) {
        case 'click':
          await this.actionExecutor.click(findResult.element);
          break;
        case 'input':
          if (step.value) {
            await this.actionExecutor.type(findResult.element, step.value, step.bundle);
          }
          break;
        case 'enter':
          await this.actionExecutor.pressEnter(findResult.element, step.bundle);
          break;
        case 'keypress':
          if (step.value) {
            await this.actionExecutor.pressKey(findResult.element, step.value);
          }
          break;
        case 'open':
          // Skip open events
          break;
      }
      
      return {
        tier: 'native_dom',
        success: true,
        element: findResult.element,
        duration: Date.now() - startTime,
        confidence: findResult.confidence,
      };
      
    } catch (error) {
      return {
        tier: 'native_dom',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }
}
