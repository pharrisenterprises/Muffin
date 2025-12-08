/**
 * Step Executor Module
 * 
 * Unified module for executing recording steps.
 * Handles both DOM-based and Vision-based step execution,
 * including delays and conditional clicks.
 * 
 * Build Cards:
 * - ENG-017: Unified Step Executor Module (DOM/Vision routing)
 * - ENG-018: Delay Execution Logic (per-step and global delays)
 */

import type { Step, Recording, ConditionalClickResult } from '../types/vision';
import { visionEngine } from './visionEngine';
import {
  substituteSearchTerms,
  StepToColumnMapping,
} from './csvPositionMapping';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of step execution.
 */
export interface StepExecutionResult {
  success: boolean;
  error?: string;
  duration: number;
  stepIndex: number;
  /** For conditional clicks */
  conditionalResult?: ConditionalClickResult;
}

/**
 * Options for step execution.
 */
export interface StepExecutionOptions {
  /** Tab ID for executing in specific tab */
  tabId: number;
  /** Global delay in ms to apply after step */
  globalDelayMs?: number;
  /** CSV row for variable substitution */
  csvRow?: string[];
  /** Step to column mapping for substitution */
  stepToColumn?: StepToColumnMapping;
  /** Column index map for substitution */
  columnIndexMap?: Map<string, number>;
  /** Callback when step starts */
  onStepStart?: (step: Step, index: number) => void;
  /** Callback when step completes */
  onStepComplete?: (result: StepExecutionResult) => void;
  /** Whether to use auto-detection failsafe */
  enableAutoDetection?: boolean;
  /** Search terms for auto-detection */
  autoDetectionTerms?: string[];
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

// ============================================================================
// DELAY FUNCTIONS (ENG-018)
// ============================================================================

/**
 * Execute a blocking delay.
 * 
 * @param ms - Milliseconds to wait
 * @param abortSignal - Optional abort signal
 * @returns Promise that resolves after delay
 */
export async function delay(ms: number, abortSignal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    if (abortSignal) {
      if (abortSignal.aborted) {
        clearTimeout(timeout);
        reject(new Error('Aborted'));
        return;
      }

      const abortHandler = () => {
        clearTimeout(timeout);
        reject(new Error('Aborted'));
      };
      abortSignal.addEventListener('abort', abortHandler, { once: true });
    }
  });
}

/**
 * Execute per-step delay (before step execution).
 * Part of ENG-018: Delay Execution Logic.
 * Per-step delays are in seconds and run BEFORE the step.
 * 
 * @param step - Step with optional delaySeconds
 * @param abortSignal - Optional abort signal
 */
export async function executeStepDelay(step: Step, abortSignal?: AbortSignal): Promise<void> {
  if (step.delaySeconds && step.delaySeconds > 0) {
    const delayMs = step.delaySeconds * 1000;
    console.log(`[StepExecutor] Waiting ${step.delaySeconds}s before step...`);
    await delay(delayMs, abortSignal);
  }
}

/**
 * Execute global delay (after step execution).
 * Part of ENG-018: Delay Execution Logic.
 * Global delays are in milliseconds and run AFTER the step.
 * Only applied if no per-step delay was set.
 * 
 * @param globalDelayMs - Global delay in milliseconds
 * @param abortSignal - Optional abort signal
 */
export async function executeGlobalDelay(
  globalDelayMs: number,
  abortSignal?: AbortSignal
): Promise<void> {
  if (globalDelayMs > 0) {
    console.log(`[StepExecutor] Global delay: ${globalDelayMs}ms`);
    await delay(globalDelayMs, abortSignal);
  }
}

/**
 * Execute navigation delay (for page loads).
 * 
 * @param abortSignal - Optional abort signal
 */
export async function executeNavigationDelay(abortSignal?: AbortSignal): Promise<void> {
  const NAVIGATION_DELAY_MS = 5000;
  console.log(`[StepExecutor] Navigation detected, waiting ${NAVIGATION_DELAY_MS}ms...`);
  await delay(NAVIGATION_DELAY_MS, abortSignal);
}

// ============================================================================
// STEP EXECUTION ROUTING
// ============================================================================

/**
 * Execute a single step using the appropriate method (DOM or Vision).
 * Part of ENG-017: Unified Step Executor Module.
 * Routes execution between DOM-based and Vision-based pathways.
 * 
 * @param step - Step to execute
 * @param stepIndex - Index of the step
 * @param options - Execution options
 * @returns Execution result
 */
export async function executeStep(
  step: Step,
  stepIndex: number,
  options: StepExecutionOptions
): Promise<StepExecutionResult> {
  const startTime = Date.now();
  const { tabId, abortSignal } = options;

  try {
    // Check for abort
    if (abortSignal?.aborted) {
      throw new Error('Execution aborted');
    }

    // Notify step start
    options.onStepStart?.(step, stepIndex);

    // Execute per-step delay (before step)
    await executeStepDelay(step, abortSignal);

    // Route to appropriate executor
    let success = false;

    switch (step.event) {
      case 'open':
        success = await executeOpenStep(step, tabId);
        // Add navigation delay for page loads
        await executeNavigationDelay(abortSignal);
        break;

      case 'click':
        success = await executeClickStep(step, tabId);
        break;

      case 'input':
        success = await executeInputStep(step, tabId);
        break;

      case 'dropdown':
        success = await executeDropdownStep(step, tabId);
        break;

      case 'conditional-click':
        const conditionalResult = await executeConditionalStep(step, tabId, options);
        return {
          success: !conditionalResult.timedOut || conditionalResult.buttonsClicked > 0,
          duration: Date.now() - startTime,
          stepIndex,
          conditionalResult,
        };

      default:
        console.warn(`[StepExecutor] Unknown event type: ${step.event}`);
        success = false;
    }

    // Execute global delay (after step)
    if (options.globalDelayMs) {
      await executeGlobalDelay(options.globalDelayMs, abortSignal);
    }

    // Auto-detection failsafe (after step, before global delay completes)
    if (options.enableAutoDetection && options.autoDetectionTerms) {
      await executeAutoDetection(options.autoDetectionTerms, tabId);
    }

    const result: StepExecutionResult = {
      success,
      duration: Date.now() - startTime,
      stepIndex,
    };

    options.onStepComplete?.(result);
    return result;

  } catch (error) {
    const result: StepExecutionResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
      stepIndex,
    };

    options.onStepComplete?.(result);
    return result;
  }
}

// ============================================================================
// STEP TYPE EXECUTORS
// ============================================================================

/**
 * Execute an 'open' step (URL navigation).
 */
async function executeOpenStep(step: Step, tabId: number): Promise<boolean> {
  if (!step.url) {
    console.error('[StepExecutor] Open step missing URL');
    return false;
  }

  return new Promise((resolve) => {
    chrome.tabs.update(tabId, { url: step.url }, (_tab) => {
      if (chrome.runtime.lastError) {
        console.error('[StepExecutor] Open failed:', chrome.runtime.lastError.message);
        resolve(false);
      } else {
        console.log(`[StepExecutor] Navigated to: ${step.url}`);
        resolve(true);
      }
    });
  });
}

/**
 * Execute a 'click' step.
 * Routes to Vision or DOM based on recordedVia.
 */
async function executeClickStep(step: Step, tabId: number): Promise<boolean> {
  if (step.recordedVia === 'vision' && step.coordinates) {
    // Vision-based click
    return await visionEngine.clickAtCoordinates(
      step.coordinates.x + step.coordinates.width / 2,
      step.coordinates.y + step.coordinates.height / 2,
      tabId
    );
  } else {
    // DOM-based click (via content script)
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        {
          type: 'EXECUTE_CLICK',
          selector: step.selector,
          xpath: step.xpath,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[StepExecutor] Click failed:', chrome.runtime.lastError.message);
            resolve(false);
          } else {
            resolve(response?.success === true);
          }
        }
      );
    });
  }
}

/**
 * Execute an 'input' step.
 */
async function executeInputStep(step: Step, tabId: number): Promise<boolean> {
  const value = step.value || '';

  if (step.recordedVia === 'vision' && step.coordinates) {
    // Vision: click then type
    const clicked = await visionEngine.clickAtCoordinates(
      step.coordinates.x + step.coordinates.width / 2,
      step.coordinates.y + step.coordinates.height / 2,
      tabId
    );
    if (!clicked) return false;

    await delay(100); // Let focus settle
    return await visionEngine.typeText(tabId, value);
  } else {
    // DOM-based input
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        {
          type: 'EXECUTE_INPUT',
          selector: step.selector,
          xpath: step.xpath,
          value,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[StepExecutor] Input failed:', chrome.runtime.lastError.message);
            resolve(false);
          } else {
            resolve(response?.success === true);
          }
        }
      );
    });
  }
}

/**
 * Execute a 'dropdown' step.
 */
async function executeDropdownStep(step: Step, tabId: number): Promise<boolean> {
  const value = step.value || '';

  // Dropdown via DOM (Vision dropdown is complex)
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      {
        type: 'EXECUTE_DROPDOWN',
        selector: step.selector,
        xpath: step.xpath,
        value,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('[StepExecutor] Dropdown failed:', chrome.runtime.lastError.message);
          resolve(false);
        } else {
          resolve(response?.success === true);
        }
      }
    );
  });
}

/**
 * Execute a 'conditional-click' step.
 */
async function executeConditionalStep(
  step: Step,
  tabId: number,
  options: StepExecutionOptions
): Promise<ConditionalClickResult> {
  if (!step.conditionalConfig) {
    console.error('[StepExecutor] Conditional step missing config');
    return { success: false, attempts: 0, totalWaitMs: 0, buttonsClicked: 0, clickTargets: [], timedOut: true, duration: 0, clickedTexts: [] };
  }

  const config = step.conditionalConfig;

  // Substitute variables in search terms if CSV data is available
  let searchTerms = config.searchTerms;
  if (options.csvRow && options.columnIndexMap) {
    searchTerms = substituteSearchTerms(
      config.searchTerms,
      options.csvRow,
      options.columnIndexMap
    );
  }

  // Ensure VisionEngine is initialized
  if (!visionEngine.isInitialized) {
    await visionEngine.initialize();
  }

  return await visionEngine.waitAndClickButtons(
    tabId,
    { ...config, searchTerms }
  );
}

/**
 * Execute auto-detection failsafe.
 * Quick single-attempt to find and click approval buttons.
 */
async function executeAutoDetection(
  searchTerms: string[],
  tabId: number
): Promise<boolean> {
  if (!visionEngine.isInitialized) {
    return false;
  }

  const result = await visionEngine.waitAndClickButtons(tabId, { searchTerms });
  return result.success;
}

// ============================================================================
// BATCH EXECUTION
// ============================================================================

/**
 * Execute multiple steps in sequence.
 * 
 * @param steps - Steps to execute
 * @param options - Execution options
 * @returns Array of execution results
 */
export async function executeSteps(
  steps: Step[],
  options: StepExecutionOptions
): Promise<StepExecutionResult[]> {
  const results: StepExecutionResult[] = [];

  for (let i = 0; i < steps.length; i++) {
    if (options.abortSignal?.aborted) {
      break;
    }

    const result = await executeStep(steps[i], i, options);
    results.push(result);

    // Stop on failure (configurable?)
    if (!result.success) {
      console.error(`[StepExecutor] Step ${i} failed, stopping execution`);
      break;
    }
  }

  return results;
}

/**
 * Execute a full recording with CSV loop support.
 * 
 * @param recording - Recording to execute
 * @param csvData - CSV data (headers + rows)
 * @param options - Execution options
 * @returns Results for all rows
 */
export async function executeRecording(
  recording: Recording,
  csvData: string[][] | undefined,
  options: Omit<StepExecutionOptions, 'csvRow' | 'stepToColumn' | 'columnIndexMap'>
): Promise<StepExecutionResult[][]> {
  const allResults: StepExecutionResult[][] = [];

  // Build column mappings if CSV data is available
  let stepToColumn: StepToColumnMapping = {};
  let columnIndexMap = new Map<string, number>();

  if (csvData && csvData.length > 1) {
    const headers = csvData[0];
    columnIndexMap = new Map(headers.map((h, i) => [h, i]));
    
    // Build step to column mapping from recording
    const { buildColumnMappingFromRecording } = await import('./csvPositionMapping');
    stepToColumn = buildColumnMappingFromRecording(recording);
  }

  // Determine rows to process
  const rows = csvData && csvData.length > 1 ? csvData.slice(1) : [[]];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    if (options.abortSignal?.aborted) {
      break;
    }

    console.log(`[StepExecutor] Processing row ${rowIndex + 1}/${rows.length}`);
    const csvRow = rows[rowIndex];

    // Get steps for this row
    const { getStepsForRow, getAbsoluteStepIndex, substituteStepValue } = await import('./csvPositionMapping');
    const stepsForRow = getStepsForRow(recording.steps, recording.loopStartIndex, rowIndex);

    // Process steps with substitution
    const processedSteps = stepsForRow.map((step, relativeIndex) => {
      const absoluteIndex = getAbsoluteStepIndex(relativeIndex, recording.loopStartIndex, rowIndex);
      const result = substituteStepValue(step, absoluteIndex, csvRow, stepToColumn, columnIndexMap);
      return result.step;
    });

    // Execute steps for this row
    const rowResults = await executeSteps(processedSteps, {
      ...options,
      csvRow,
      stepToColumn,
      columnIndexMap,
      globalDelayMs: recording.globalDelayMs,
    });

    allResults.push(rowResults);

    // Stop if row failed
    if (rowResults.some(r => !r.success)) {
      console.error(`[StepExecutor] Row ${rowIndex + 1} failed, stopping execution`);
      break;
    }
  }

  return allResults;
}
