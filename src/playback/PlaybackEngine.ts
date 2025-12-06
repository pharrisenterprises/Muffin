/**
 * PLAYBACK ENGINE - MAIN ORCHESTRATOR
 * 
 * Executes recorded steps with:
 * - Context-validated element finding
 * - Special handling for terminal/editor/copilot
 * - Error recovery and reporting
 */

import { RecordedStep } from '../recording/types';
import { PlaybackConfig, DEFAULT_PLAYBACK_CONFIG, StepResult, PlaybackResult } from './types';
import { ElementFinder } from './ElementFinder';
import { ActionExecutor } from './ActionExecutor';

export class PlaybackEngine {
  private config: PlaybackConfig;
  private elementFinder: ElementFinder;
  private actionExecutor: ActionExecutor;
  private isPlaying: boolean = false;
  
  constructor(config: Partial<PlaybackConfig> = {}) {
    this.config = { ...DEFAULT_PLAYBACK_CONFIG, ...config };
    this.elementFinder = new ElementFinder(this.config);
    this.actionExecutor = new ActionExecutor(this.config);
  }
  
  /**
   * Execute a single step
   */
  async executeStep(step: RecordedStep): Promise<StepResult> {
    const startTime = Date.now();
    
    console.log(`[PlaybackEngine] Executing step ${step.stepNumber}: ${step.event} - ${step.label}`);
    
    try {
      // Skip "open" events (page already loaded)
      if (step.event === 'open') {
        return {
          stepNumber: step.stepNumber,
          success: true,
          duration: Date.now() - startTime,
          strategy: 'skip',
        };
      }
      
      // Find element with context validation
      const findResult = await this.elementFinder.find(step.bundle);
      
      if (!findResult.element) {
        return {
          stepNumber: step.stepNumber,
          success: false,
          error: `Element not found. Attempts: ${findResult.attempts.join(', ')}`,
          duration: Date.now() - startTime,
        };
      }
      
      // Execute action based on event type
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
      }
      
      return {
        stepNumber: step.stepNumber,
        success: true,
        duration: Date.now() - startTime,
        strategy: findResult.strategy,
        element: findResult.element,
      };
      
    } catch (error) {
      console.error(`[PlaybackEngine] Step ${step.stepNumber} failed:`, error);
      return {
        stepNumber: step.stepNumber,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Execute all steps
   */
  async executeAll(steps: RecordedStep[]): Promise<PlaybackResult> {
    this.isPlaying = true;
    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    let passedSteps = 0;
    let failedSteps = 0;
    
    console.log(`[PlaybackEngine] Starting playback of ${steps.length} steps`);
    
    for (const step of steps) {
      if (!this.isPlaying) {
        console.log('[PlaybackEngine] Playback stopped');
        break;
      }
      
      const result = await this.executeStep(step);
      stepResults.push(result);
      
      if (result.success) {
        passedSteps++;
      } else {
        failedSteps++;
        if (this.config.stopOnError) {
          console.log('[PlaybackEngine] Stopping on error');
          break;
        }
      }
      
      // Delay between steps
      await this.sleep(this.config.stepDelay);
    }
    
    this.isPlaying = false;
    
    const result: PlaybackResult = {
      success: failedSteps === 0,
      totalSteps: steps.length,
      passedSteps,
      failedSteps,
      duration: Date.now() - startTime,
      stepResults,
    };
    
    console.log('[PlaybackEngine] Playback complete:', result);
    return result;
  }
  
  /**
   * Stop playback
   */
  stop(): void {
    this.isPlaying = false;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const playbackEngine = new PlaybackEngine();
