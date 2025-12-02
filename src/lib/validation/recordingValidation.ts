/**
 * Recording Validation Utility
 * 
 * Provides validation functions for Recording objects.
 * Uses stepValidation for individual step validation.
 */

import type { Recording, Step } from '../../types/vision';
import { validateSteps, StepValidationResult } from './stepValidation';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of recording validation.
 */
export interface RecordingValidationResult {
  /** Whether the recording is valid */
  valid: boolean;
  /** Recording-level error messages */
  errors: string[];
  /** Recording-level warning messages */
  warnings: string[];
  /** Per-step validation results */
  stepErrors: Map<number, StepValidationResult>;
  /** Total count of step errors */
  totalStepErrors: number;
  /** Total count of step warnings */
  totalStepWarnings: number;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a recording and all its steps.
 * 
 * @param recording - The recording to validate
 * @returns Comprehensive validation result
 */
export function validateRecording(recording: Partial<Recording>): RecordingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (recording.projectId === undefined) {
    errors.push('Missing required field: projectId');
  }

  if (!recording.steps) {
    errors.push('Missing required field: steps');
  } else if (!Array.isArray(recording.steps)) {
    errors.push('Field "steps" must be an array');
  }

  // Loop start index validation
  if (recording.loopStartIndex !== undefined) {
    const loopErrors = validateLoopStartIndex(
      recording.loopStartIndex,
      recording.steps?.length || 0
    );
    errors.push(...loopErrors.errors);
    warnings.push(...loopErrors.warnings);
  }

  // Global delay validation
  if (recording.globalDelayMs !== undefined) {
    const delayErrors = validateGlobalDelay(recording.globalDelayMs);
    errors.push(...delayErrors.errors);
    warnings.push(...delayErrors.warnings);
  }

  // Conditional defaults validation
  if (recording.conditionalDefaults) {
    const conditionalErrors = validateConditionalDefaults(recording.conditionalDefaults);
    errors.push(...conditionalErrors.errors);
    warnings.push(...conditionalErrors.warnings);
  }

  // Schema version check
  if (recording.schemaVersion !== undefined && recording.schemaVersion < 1) {
    errors.push(`Invalid schema version: ${recording.schemaVersion}`);
  }

  // Validate all steps
  const stepValidation = recording.steps 
    ? validateSteps(recording.steps)
    : { valid: true, stepResults: new Map(), totalErrors: 0, totalWarnings: 0 };

  // Check for logical issues across steps
  if (recording.steps && recording.steps.length > 0) {
    const crossStepWarnings = validateCrossStepLogic(recording.steps, recording.loopStartIndex);
    warnings.push(...crossStepWarnings);
  }

  return {
    valid: errors.length === 0 && stepValidation.valid,
    errors,
    warnings,
    stepErrors: stepValidation.stepResults,
    totalStepErrors: stepValidation.totalErrors,
    totalStepWarnings: stepValidation.totalWarnings,
  };
}

// ============================================================================
// HELPER VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate loop start index.
 */
function validateLoopStartIndex(
  loopStartIndex: number,
  stepCount: number
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof loopStartIndex !== 'number') {
    errors.push('loopStartIndex must be a number');
  } else if (loopStartIndex < 0) {
    errors.push('loopStartIndex cannot be negative');
  } else if (stepCount > 0 && loopStartIndex >= stepCount) {
    errors.push(`loopStartIndex (${loopStartIndex}) exceeds step count (${stepCount})`);
  } else if (loopStartIndex > 0 && loopStartIndex === stepCount - 1) {
    warnings.push('loopStartIndex is at last step - only one step will loop');
  }

  return { errors, warnings };
}

/**
 * Validate global delay.
 */
function validateGlobalDelay(
  globalDelayMs: number
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof globalDelayMs !== 'number') {
    errors.push('globalDelayMs must be a number');
  } else if (globalDelayMs < 0) {
    errors.push('globalDelayMs cannot be negative');
  } else if (globalDelayMs > 60000) {
    errors.push('globalDelayMs cannot exceed 60000 (60 seconds)');
  } else if (globalDelayMs > 10000) {
    warnings.push(`globalDelayMs is quite long (${globalDelayMs}ms)`);
  }

  return { errors, warnings };
}

/**
 * Validate conditional defaults.
 */
function validateConditionalDefaults(
  defaults: Recording['conditionalDefaults']
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!defaults) {
    return { errors, warnings };
  }

  // Search terms
  if (!Array.isArray(defaults.searchTerms)) {
    errors.push('conditionalDefaults.searchTerms must be an array');
  } else if (defaults.searchTerms.length === 0) {
    warnings.push('conditionalDefaults.searchTerms is empty');
  }

  // Timeout
  if (typeof defaults.timeoutSeconds !== 'number') {
    errors.push('conditionalDefaults.timeoutSeconds must be a number');
  } else if (defaults.timeoutSeconds < 1) {
    errors.push('conditionalDefaults.timeoutSeconds must be at least 1');
  }

  // Confidence threshold
  if (defaults.confidenceThreshold !== undefined) {
    if (typeof defaults.confidenceThreshold !== 'number') {
      errors.push('conditionalDefaults.confidenceThreshold must be a number');
    } else if (defaults.confidenceThreshold < 0 || defaults.confidenceThreshold > 100) {
      errors.push('conditionalDefaults.confidenceThreshold must be between 0 and 100');
    }
  }

  return { errors, warnings };
}

/**
 * Validate logical relationships across steps.
 */
function validateCrossStepLogic(
  steps: Partial<Step>[],
  loopStartIndex?: number
): string[] {
  const warnings: string[] = [];

  // Check for 'open' steps after loop start
  if (loopStartIndex !== undefined && loopStartIndex > 0) {
    steps.slice(loopStartIndex).forEach((step, idx) => {
      if (step.event === 'open') {
        warnings.push(
          `Step ${loopStartIndex + idx} is 'open' event inside loop - will navigate on each row`
        );
      }
    });
  }

  // Check for first step not being 'open'
  if (steps.length > 0 && steps[0].event !== 'open') {
    warnings.push('First step is not an "open" event - recording may fail if no page is loaded');
  }

  // Check for consecutive conditional clicks
  let consecutiveConditional = 0;
  steps.forEach((step, idx) => {
    if (step.event === 'conditional-click') {
      consecutiveConditional++;
      if (consecutiveConditional > 2) {
        warnings.push(`Multiple consecutive conditional clicks at step ${idx} may cause long waits`);
      }
    } else {
      consecutiveConditional = 0;
    }
  });

  // Check for Vision steps without fallback
  const visionSteps = steps.filter(s => s.recordedVia === 'vision');
  if (visionSteps.length > 0 && visionSteps.length === steps.length) {
    warnings.push('All steps are Vision-recorded - DOM fallback not available');
  }

  return warnings;
}

// ============================================================================
// QUICK VALIDATION HELPERS
// ============================================================================

/**
 * Quick check if a recording is valid.
 */
export function isValidRecording(recording: Partial<Recording>): boolean {
  return validateRecording(recording).valid;
}

/**
 * Check if recording has minimum required fields.
 */
export function hasRequiredRecordingFields(recording: Partial<Recording>): boolean {
  return (
    recording.projectId !== undefined &&
    Array.isArray(recording.steps)
  );
}

/**
 * Get a summary of validation issues.
 */
export function getValidationSummary(result: RecordingValidationResult): string {
  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} recording error(s)`);
  }
  if (result.totalStepErrors > 0) {
    parts.push(`${result.totalStepErrors} step error(s)`);
  }
  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`);
  }

  if (parts.length === 0) {
    return 'Recording is valid';
  }

  return parts.join(', ');
}
