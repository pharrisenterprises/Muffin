// ═══════════════════════════════════════════════════════════════════════════
// SELF-HEALING PLAYBACK ENGINE - Complete Playback with Automatic Recovery
// ═══════════════════════════════════════════════════════════════════════════

import type {
  SelfHealingPlaybackConfig,
  StepExecutionResult,
  PlaybackSessionState,
  Resolution,
  BoundingBox
} from './self-healing-types';
import type { RecordedStep } from '../recording/types';
import { PlaybackTroubleshooter, createPlaybackTroubleshooter } from './PlaybackTroubleshooter';
import { ScreenshotComparator, createScreenshotComparator } from './ScreenshotComparator';
import { createHealingOrchestrator } from '../healing';
import { createScreenshotCapture } from '../validation/ScreenshotCapture';
import { DEFAULT_SELF_HEALING_PLAYBACK_CONFIG, PLAYBACK_TIMEOUTS } from './self-healing-config';

export class SelfHealingPlaybackEngine {
  private config: SelfHealingPlaybackConfig;
  private troubleshooter: PlaybackTroubleshooter;
  private screenshotComparator: ScreenshotComparator;
  private screenshotCapture: ReturnType<typeof createScreenshotCapture>;
  private healingOrchestrator: ReturnType<typeof createHealingOrchestrator>;
  private session: PlaybackSessionState | null = null;
  
  private onStepStart?: (step: RecordedStep) => void;
  private onStepComplete?: (result: StepExecutionResult) => void;
  private onHealingApplied?: (step: RecordedStep, resolution: Resolution) => void;
  private onSessionComplete?: (session: PlaybackSessionState) => void;
  
  constructor(config?: Partial<SelfHealingPlaybackConfig>, claudeApiKey?: string) {
    this.config = { ...DEFAULT_SELF_HEALING_PLAYBACK_CONFIG, ...config };
    
    this.healingOrchestrator = createHealingOrchestrator({
      enabled: this.config.selfHealingEnabled,
      claudeVisionEnabled: this.config.aiHealingEnabled
    }, claudeApiKey);
    
    this.troubleshooter = createPlaybackTroubleshooter(this.healingOrchestrator);
    this.screenshotComparator = createScreenshotComparator();
    this.screenshotCapture = createScreenshotCapture();
  }
  
  /**
   * Execute all steps in a recording
   */
  async execute(steps: RecordedStep[], projectId: string): Promise<PlaybackSessionState> {
    this.session = this.createSession(projectId, steps.length);
    
    try {
      for (let i = 0; i < steps.length; i++) {
        if (this.session.status === 'aborted') break;
        
        const step = steps[i];
        this.session.currentStepIndex = i;
        
        this.onStepStart?.(step);
        
        const result = await this.executeStep(step);
        this.session.stepsExecuted.push(result);
        
        this.onStepComplete?.(result);
        
        if (!result.success && this.shouldAbort(result)) {
          this.session.status = 'failed';
          break;
        }
      }
      
      this.session.status = this.session.status === 'running' ? 'completed' : this.session.status;
    } catch {
      this.session.status = 'failed';
    }
    
    this.onSessionComplete?.(this.session);
    return this.session;
  }
  
  /**
   * Execute a single step
   */
  async executeStep(step: RecordedStep): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const attemptedSelectors: string[] = [];
    
    if (!step.selector) {
      return {
        stepNumber: step.stepNumber,
        success: false,
        healingApplied: false,
        finalSelector: '',
        duration: Date.now() - startTime,
        error: 'No selector provided',
        suggestRecordingUpdate: false
      };
    }
    
    try {
      let element = await this.findElement(step.selector);
      
      if (element) {
        attemptedSelectors.push(step.selector);
        
        if (this.config.screenshotComparisonEnabled) {
          const validationResult = (step as any).validationResult;
          if (validationResult?.screenshot) {
            const verified = await this.verifyElement(step, element);
            if (!verified) element = null;
          }
        }
      }
      
      let healingApplied = false;
      let resolution: Resolution | undefined;
      
      if (!element && this.config.selfHealingEnabled) {
        const quickResult = await this.troubleshooter.quickTroubleshoot(step);
        resolution = quickResult || undefined;
        
        if (resolution) {
          element = resolution.element;
          healingApplied = true;
          attemptedSelectors.push(resolution.selector);
          
          this.onHealingApplied?.(step, resolution);
          
          if (this.session) {
            this.session.healingStats.attempted++;
            this.session.healingStats.successful++;
          }
        }
      }
      
      if (!element && this.config.selfHealingEnabled) {
        const troubleSession = await this.troubleshooter.troubleshoot(step, attemptedSelectors);
        
        if (troubleSession.finalResolution) {
          element = troubleSession.finalResolution.element;
          resolution = troubleSession.finalResolution;
          healingApplied = true;
          
          this.onHealingApplied?.(step, resolution);
          
          if (this.session) {
            this.session.healingStats.attempted++;
            this.session.healingStats.successful++;
          }
        }
      }
      
      if (!element) {
        return {
          stepNumber: step.stepNumber,
          success: false,
          healingApplied: false,
          finalSelector: step.selector,
          duration: Date.now() - startTime,
          error: 'Element not found after all healing attempts',
          suggestRecordingUpdate: false
        };
      }
      
      await this.executeAction(step, element);
      
      if (healingApplied && resolution) {
        await this.healingOrchestrator.recordHealingResult(step, resolution.selector, true);
      }
      
      return {
        stepNumber: step.stepNumber,
        success: true,
        healingApplied,
        healingDetails: healingApplied && resolution ? {
          strategy: resolution.strategy,
          originalSelector: step.selector,
          healedSelector: resolution.selector,
          confidence: resolution.confidence
        } : undefined,
        finalSelector: resolution?.selector || step.selector,
        finalBounds: this.getBounds(element),
        duration: Date.now() - startTime,
        suggestRecordingUpdate: resolution?.shouldUpdateRecording || false
      };
    } catch (error) {
      return {
        stepNumber: step.stepNumber,
        success: false,
        healingApplied: false,
        finalSelector: step.selector,
        duration: Date.now() - startTime,
        error: String(error),
        suggestRecordingUpdate: false
      };
    }
  }
  
  /**
   * Pause playback
   */
  pause(reason?: string): void {
    if (this.session) {
      this.session.status = 'paused';
      this.session.pauseReason = reason;
    }
  }
  
  /**
   * Resume playback
   */
  resume(): void {
    if (this.session?.status === 'paused') {
      this.session.status = 'running';
      this.session.pauseReason = undefined;
    }
  }
  
  /**
   * Abort playback
   */
  abort(): void {
    if (this.session) {
      this.session.status = 'aborted';
    }
  }
  
  /**
   * Set Claude API key
   */
  setClaudeApiKey(apiKey: string): void {
    this.healingOrchestrator.setClaudeApiKey(apiKey);
    this.config.aiHealingEnabled = true;
  }
  
  /**
   * Register event callbacks
   */
  on(event: 'stepStart', callback: (step: RecordedStep) => void): void;
  on(event: 'stepComplete', callback: (result: StepExecutionResult) => void): void;
  on(event: 'healingApplied', callback: (step: RecordedStep, resolution: Resolution) => void): void;
  on(event: 'sessionComplete', callback: (session: PlaybackSessionState) => void): void;
  on(event: string, callback: Function): void {
    switch (event) {
      case 'stepStart':
        this.onStepStart = callback as any;
        break;
      case 'stepComplete':
        this.onStepComplete = callback as any;
        break;
      case 'healingApplied':
        this.onHealingApplied = callback as any;
        break;
      case 'sessionComplete':
        this.onSessionComplete = callback as any;
        break;
    }
  }
  
  // Private methods
  
  private async findElement(selector: string): Promise<HTMLElement | null> {
    const timeout = this.config.elementTimeout;
    const interval = PLAYBACK_TIMEOUTS.RETRY_INTERVAL;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && this.isVisible(element)) return element;
      } catch {
        return null;
      }
      
      await this.sleep(interval);
    }
    
    return null;
  }
  
  private async verifyElement(step: RecordedStep, element: HTMLElement): Promise<boolean> {
    try {
      const validationResult = (step as any).validationResult;
      const currentScreenshot = await this.screenshotCapture.captureElement(element, step.stepNumber);
      const match = await this.screenshotComparator.quickCompare(validationResult.screenshot, currentScreenshot);
      return match;
    } catch {
      return true;
    }
  }
  
  private async executeAction(step: RecordedStep, element: HTMLElement): Promise<void> {
    switch (step.event) {
      case 'click':
        await this.humanClick(element);
        break;
      case 'input':
        await this.humanInput(element, step.value || '');
        break;
      case 'keypress':
        await this.humanKeypress(element, step.value || 'Enter');
        break;
      default:
        element.dispatchEvent(new Event(step.event, { bubbles: true }));
    }
  }
  
  private async humanClick(element: HTMLElement): Promise<void> {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.sleep(100);
    
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));
    await this.sleep(50);
    
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
    await this.sleep(30);
    
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
    
    if (element.click) element.click();
  }
  
  private async humanInput(element: HTMLElement, value: string): Promise<void> {
    element.focus();
    await this.sleep(50);
    
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = '';
    }
    
    if (element instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(element, value);
    } else if (element instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(element, value);
    } else if (element.isContentEditable) {
      element.innerText = value;
    }
    
    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  private async humanKeypress(element: HTMLElement, key: string): Promise<void> {
    const keyCode = key === 'Enter' ? 13 : key === 'Tab' ? 9 : key.charCodeAt(0);
    
    element.dispatchEvent(new KeyboardEvent('keydown', { key, keyCode, bubbles: true }));
    await this.sleep(30);
    element.dispatchEvent(new KeyboardEvent('keypress', { key, keyCode, bubbles: true }));
    await this.sleep(30);
    element.dispatchEvent(new KeyboardEvent('keyup', { key, keyCode, bubbles: true }));
  }
  
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      parseFloat(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }
  
  private getBounds(element: HTMLElement): BoundingBox {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  }
  
  private createSession(projectId: string, totalSteps: number): PlaybackSessionState {
    return {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      currentStepIndex: 0,
      totalSteps,
      stepsExecuted: [],
      healingStats: {
        attempted: 0,
        successful: 0,
        failed: 0,
        cached: 0
      },
      startTime: Date.now(),
      status: 'running'
    };
  }
  
  private shouldAbort(_result: StepExecutionResult): boolean {
    return false; // Continue on failure by default
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createSelfHealingPlaybackEngine(
  config?: Partial<SelfHealingPlaybackConfig>,
  claudeApiKey?: string
): SelfHealingPlaybackEngine {
  return new SelfHealingPlaybackEngine(config, claudeApiKey);
}
