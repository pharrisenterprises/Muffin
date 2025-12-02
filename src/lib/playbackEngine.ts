/**
 * PlaybackEngine
 * 
 * Orchestrates recording playback with support for:
 * - DOM-based step execution
 * - Vision-based step execution (INT-008)
 * - CSV loop iteration
 * - Delays (global and per-step)
 * - Conditional click polling
 */

import type { Step, Recording } from '../types/vision';
import { visionEngine } from './visionEngine';
import { executeStep } from './stepExecutor';
import {
  buildColumnMappingFromRecording,
  buildColumnIndexMap,
  processStepsForRow,
} from './csvPositionMapping';

// ============================================================================
// TYPES
// ============================================================================

export interface PlaybackOptions {
  /** Tab ID to execute in */
  tabId: number;
  /** CSV data (headers + rows) */
  csvData?: string[][];
  /** Callback when playback starts */
  onStart?: () => void;
  /** Callback when a step starts */
  onStepStart?: (step: Step, stepIndex: number, rowIndex: number) => void;
  /** Callback when a step completes */
  onStepComplete?: (step: Step, stepIndex: number, rowIndex: number, success: boolean) => void;
  /** Callback when a row completes */
  onRowComplete?: (rowIndex: number, success: boolean) => void;
  /** Callback when playback completes */
  onComplete?: (success: boolean, error?: string) => void;
  /** Callback for progress updates */
  onProgress?: (current: number, total: number) => void;
  /** Enable auto-detection failsafe */
  enableAutoDetection?: boolean;
  /** Search terms for auto-detection */
  autoDetectionTerms?: string[];
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentRowIndex: number;
  currentStepIndex: number;
  totalRows: number;
  totalSteps: number;
  error?: string;
}

// ============================================================================
// PLAYBACK ENGINE CLASS
// ============================================================================

/**
 * PlaybackEngine - Orchestrates recording playback.
 */
export class PlaybackEngine {
  private abortController: AbortController | null = null;
  private state: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    currentRowIndex: 0,
    currentStepIndex: 0,
    totalRows: 0,
    totalSteps: 0,
  };

  /**
   * Get current playback state.
   */
  getState(): PlaybackState {
    return { ...this.state };
  }

  /**
   * Play a recording.
   * 
   * @param recording - The recording to play
   * @param options - Playback options
   */
  async play(recording: Recording, options: PlaybackOptions): Promise<void> {
    // Prevent multiple playbacks
    if (this.state.isPlaying) {
      throw new Error('Playback already in progress');
    }

    // Initialize state
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const csvRows = options.csvData && options.csvData.length > 1
      ? options.csvData.slice(1)
      : [[]];
    
    this.state = {
      isPlaying: true,
      isPaused: false,
      currentRowIndex: 0,
      currentStepIndex: 0,
      totalRows: csvRows.length,
      totalSteps: recording.steps.length,
    };

    options.onStart?.();

    try {
      // Initialize Vision Engine if any steps use Vision
      const hasVisionSteps = recording.steps.some(s => s.recordedVia === 'vision');
      const hasConditionalSteps = recording.steps.some(s => s.event === 'conditional-click');
      
      if (hasVisionSteps || hasConditionalSteps || options.enableAutoDetection) {
        if (!visionEngine.isInitialized) {
          console.log('[PlaybackEngine] Initializing Vision Engine...');
          await visionEngine.initialize();
        }
      }

      // Build column mappings for CSV substitution
      const stepToColumn = buildColumnMappingFromRecording(recording);
      const columnIndexMap = options.csvData && options.csvData.length > 0
        ? buildColumnIndexMap(options.csvData[0])
        : new Map<string, number>();

      // Execute rows
      for (let rowIndex = 0; rowIndex < csvRows.length; rowIndex++) {
        if (signal.aborted) break;
        
        this.state.currentRowIndex = rowIndex;
        const csvRow = csvRows[rowIndex];

        console.log(`[PlaybackEngine] Processing row ${rowIndex + 1}/${csvRows.length}`);

        // Process steps with CSV substitution
        const processedSteps = processStepsForRow(
          recording,
          csvRow,
          rowIndex,
          stepToColumn,
          columnIndexMap
        );

        // Execute steps
        let rowSuccess = true;
        for (let stepIndex = 0; stepIndex < processedSteps.length; stepIndex++) {
          if (signal.aborted) break;
          
          this.state.currentStepIndex = stepIndex;
          const step = processedSteps[stepIndex];

          options.onStepStart?.(step, stepIndex, rowIndex);
          options.onProgress?.(
            rowIndex * recording.steps.length + stepIndex,
            csvRows.length * recording.steps.length
          );

          // Execute step using appropriate method (DOM/Vision switch - INT-008)
          const result = await executeStep(step, stepIndex, {
            tabId: options.tabId,
            globalDelayMs: recording.globalDelayMs,
            csvRow,
            stepToColumn,
            columnIndexMap,
            enableAutoDetection: options.enableAutoDetection,
            autoDetectionTerms: options.autoDetectionTerms,
            abortSignal: signal,
          });

          options.onStepComplete?.(step, stepIndex, rowIndex, result.success);

          if (!result.success) {
            rowSuccess = false;
            this.state.error = result.error;
            console.error(`[PlaybackEngine] Step ${stepIndex + 1} failed:`, result.error);
            break;
          }
        }

        options.onRowComplete?.(rowIndex, rowSuccess);

        if (!rowSuccess) {
          break;
        }
      }

      // Complete
      const success = !this.state.error && !signal.aborted;
      options.onComplete?.(success, this.state.error);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.state.error = errorMessage;
      options.onComplete?.(false, errorMessage);
      throw error;
    } finally {
      this.state.isPlaying = false;
      this.abortController = null;
    }
  }

  /**
   * Stop the current playback.
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      console.log('[PlaybackEngine] Playback stopped');
    }
    this.state.isPlaying = false;
  }

  /**
   * Pause the current playback.
   * Note: This is a soft pause - current step will complete.
   */
  pause(): void {
    this.state.isPaused = true;
    console.log('[PlaybackEngine] Playback paused');
  }

  /**
   * Resume paused playback.
   */
  resume(): void {
    this.state.isPaused = false;
    console.log('[PlaybackEngine] Playback resumed');
  }
}

// ============================================================================
// DOM/VISION SWITCH HELPER (INT-008)
// ============================================================================

/**
 * Determine whether to use DOM or Vision execution for a step.
 * 
 * @param step - The step to check
 * @returns 'dom' or 'vision'
 */
export function getExecutionMethod(step: Step): 'dom' | 'vision' {
  // Explicit recordedVia takes precedence
  if (step.recordedVia === 'vision') {
    return 'vision';
  }

  // Conditional clicks always use Vision
  if (step.event === 'conditional-click') {
    return 'vision';
  }

  // Default to DOM
  return 'dom';
}

/**
 * Check if a step can fall back to Vision if DOM fails.
 * 
 * @param step - The step to check
 * @returns Whether Vision fallback is possible
 */
export function canFallbackToVision(step: Step): boolean {
  // Steps with Vision data can fall back
  if (step.coordinates && step.ocrText) {
    return true;
  }

  // Click and input steps on common elements may work
  if (step.event === 'click' || step.event === 'input') {
    return true;
  }

  return false;
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const playbackEngine = new PlaybackEngine();

// ============================================================================
// EXPORTS
// ============================================================================

export default PlaybackEngine;
