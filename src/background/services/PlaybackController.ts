/**
 * @fileoverview Playback Controller
 * @description Orchestrates test playback through recorded steps.
 * Coordinates DecisionEngine and ActionExecutor.
 * 
 * @module services/PlaybackController
 * @version 1.0.0
 * @since Phase 4
 */

import { DecisionEngine, getDecisionEngine } from './DecisionEngine';
import { ActionExecutor, getActionExecutor } from './ActionExecutor';
import { TelemetryLogger, getTelemetryLogger } from './TelemetryLogger';
import type { FallbackChain, LocatorStrategy } from '../../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PlaybackControllerConfig {
  stepDelay: number;
  maxRetries: number;
  retryDelay: number;
  stopOnError: boolean;
  timeout: number;
}

const DEFAULT_CONFIG: PlaybackControllerConfig = {
  stepDelay: 500,
  maxRetries: 3,
  retryDelay: 1000,
  stopOnError: false,
  timeout: 30000
};

export interface RecordedStep {
  id: string;
  type: 'click' | 'type' | 'select' | 'navigate' | 'assert' | 'scroll' | 'hover';
  fallbackChain: FallbackChain;
  value?: string;
  url?: string;
  timestamp: number;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  strategyUsed?: LocatorStrategy;
  duration: number;
  retries: number;
  error?: string;
}

export interface PlaybackResult {
  success: boolean;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  duration: number;
  stepResults: StepResult[];
}

type PlaybackState = 'idle' | 'running' | 'paused' | 'stopping';

// ============================================================================
// PLAYBACK CONTROLLER CLASS
// ============================================================================

export class PlaybackController {
  private config: PlaybackControllerConfig;
  private decisionEngine: DecisionEngine;
  private _actionExecutor: ActionExecutor;
  private _telemetry: TelemetryLogger;

  private state: PlaybackState = 'idle';
  private currentStepIndex = 0;
  private steps: RecordedStep[] = [];
  private stepResults: StepResult[] = [];
  private tabId = 0;

  private resolvePlayback: ((result: PlaybackResult) => void) | null = null;

  constructor(
    decisionEngine: DecisionEngine,
    actionExecutor: ActionExecutor,
    telemetry: TelemetryLogger,
    config?: Partial<PlaybackControllerConfig>
  ) {
    this.decisionEngine = decisionEngine;
    this._actionExecutor = actionExecutor;
    this._telemetry = telemetry;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  async start(tabId: number, steps: RecordedStep[]): Promise<PlaybackResult> {
    if (this.state !== 'idle') {
      throw new Error('Playback already in progress');
    }

    this.tabId = tabId;
    this.steps = steps;
    this.currentStepIndex = 0;
    this.stepResults = [];
    this.state = 'running';

    console.log(`[PlaybackController] Starting playback of ${steps.length} steps`);

    return new Promise(resolve => {
      this.resolvePlayback = resolve;
      this.executeNextStep();
    });
  }

  pause(): void {
    if (this.state === 'running') {
      this.state = 'paused';
      console.log('[PlaybackController] Paused');
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'running';
      console.log('[PlaybackController] Resumed');
      this.executeNextStep();
    }
  }

  stop(): void {
    if (this.state !== 'idle') {
      this.state = 'stopping';
      console.log('[PlaybackController] Stopping');
      this.completePlayback();
    }
  }

  getState(): PlaybackState {
    return this.state;
  }

  getProgress(): { current: number; total: number } {
    return { current: this.currentStepIndex, total: this.steps.length };
  }

  // ==========================================================================
  // STEP EXECUTION
  // ==========================================================================

  private async executeNextStep(): Promise<void> {
    if (this.state !== 'running') return;

    if (this.currentStepIndex >= this.steps.length) {
      this.completePlayback();
      return;
    }

    const step = this.steps[this.currentStepIndex];
    const result = await this.executeStep(step);

    this.stepResults.push(result);
    this.notifyProgress(result);

    if (!result.success && this.config.stopOnError) {
      this.completePlayback();
      return;
    }

    this.currentStepIndex++;

    // Delay between steps
    await this.delay(this.config.stepDelay);

    // Continue to next step
    this.executeNextStep();
  }

  private async executeStep(step: RecordedStep): Promise<StepResult> {
    const startTime = Date.now();
    let retries = 0;
    let lastError: string | undefined;

    while (retries <= this.config.maxRetries) {
      try {
        // Handle navigation specially
        if (step.type === 'navigate' && step.url) {
          await this.executeNavigation(step.url);
          return {
            stepId: step.id,
            success: true,
            duration: Date.now() - startTime,
            retries
          };
        }

        // Find element using DecisionEngine
        const evaluationResult = await this.decisionEngine.executeAction({
          tabId: this.tabId,
          fallbackChain: step.fallbackChain,
          actionType: step.type as any,
          value: step.value,
          stepIndex: this.currentStepIndex
        });

        if (evaluationResult.success) {
          return {
            stepId: step.id,
            success: true,
            strategyUsed: evaluationResult.usedStrategy,
            duration: Date.now() - startTime,
            retries
          };
        }

        lastError = evaluationResult.error;

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      retries++;
      if (retries <= this.config.maxRetries) {
        await this.delay(this.config.retryDelay);
      }
    }

    return {
      stepId: step.id,
      success: false,
      duration: Date.now() - startTime,
      retries,
      error: lastError
    };
  }

  private async executeNavigation(url: string): Promise<void> {
    await chrome.tabs.update(this.tabId, { url });

    // Wait for navigation to complete
    await new Promise<void>(resolve => {
      const listener = (
        tabId: number,
        changeInfo: chrome.tabs.TabChangeInfo
      ) => {
        if (tabId === this.tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  // ==========================================================================
  // COMPLETION
  // ==========================================================================

  private completePlayback(): void {
    const passed = this.stepResults.filter(r => r.success).length;
    const failed = this.stepResults.filter(r => !r.success).length;
    const totalDuration = this.stepResults.reduce((sum, r) => sum + r.duration, 0);

    const result: PlaybackResult = {
      success: failed === 0,
      totalSteps: this.steps.length,
      passedSteps: passed,
      failedSteps: failed,
      duration: totalDuration,
      stepResults: this.stepResults
    };

    console.log(`[PlaybackController] Complete: ${passed}/${this.steps.length} passed`);

    this.state = 'idle';

    if (this.resolvePlayback) {
      this.resolvePlayback(result);
      this.resolvePlayback = null;
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private notifyProgress(result: StepResult): void {
    chrome.runtime?.sendMessage?.({
      type: 'PLAYBACK_PROGRESS',
      payload: {
        current: this.currentStepIndex + 1,
        total: this.steps.length,
        stepResult: result
      }
    }).catch(() => {});
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: PlaybackController | null = null;

export function getPlaybackController(): PlaybackController {
  if (!instance) {
    instance = new PlaybackController(
      getDecisionEngine(),
      getActionExecutor(),
      getTelemetryLogger()
    );
  }
  return instance;
}
