/**
 * Step Validation Utility
 * 
 * Provides validation functions for Step objects to ensure data integrity.
 * All functions are pure with no side effects.
 */

import type { Step, ConditionalConfig, StepCoordinates } from '../../types/vision';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of step validation.
 */
export interface StepValidationResult {
  /** Whether the step is valid */
  valid: boolean;
  /** List of validation error messages */
  errors: string[];
  /** List of validation warning messages (non-fatal) */
  warnings: string[];
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a single step.
 * Returns all errors found, not just the first one.
 * 
 * @param step - The step to validate
 * @param index - Optional step index for error messages
 * @returns Validation result with errors and warnings
 */
export function validateStep(step: Partial<Step>, index?: number): StepValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = index !== undefined ? `Step ${index}: ` : '';

  // Required fields
  if (!step.event) {
    errors.push(`${prefix}Missing required field 'event'`);
  } else if (!isValidEventType(step.event)) {
    errors.push(`${prefix}Invalid event type '${step.event}'`);
  }

  // Label validation
  if (step.label === undefined || step.label === null) {
    warnings.push(`${prefix}Missing label (will use empty string)`);
  }

  // Event-specific validation
  if (step.event) {
    const eventErrors = validateEventSpecificFields(step, prefix);
    errors.push(...eventErrors.errors);
    warnings.push(...eventErrors.warnings);
  }

  // Vision-specific validation
  if (step.recordedVia === 'vision') {
    const visionErrors = validateVisionFields(step, prefix);
    errors.push(...visionErrors.errors);
    warnings.push(...visionErrors.warnings);
  }

  // Conditional click validation
  if (step.event === 'conditional-click') {
    const conditionalErrors = validateConditionalConfig(step.conditionalConfig, prefix);
    errors.push(...conditionalErrors.errors);
    warnings.push(...conditionalErrors.warnings);
  }

  // Delay validation
  if (step.delaySeconds !== undefined) {
    const delayErrors = validateDelay(step.delaySeconds, prefix);
    errors.push(...delayErrors.errors);
    warnings.push(...delayErrors.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate multiple steps.
 */
export function validateSteps(steps: Partial<Step>[]): {
  valid: boolean;
  stepResults: Map<number, StepValidationResult>;
  totalErrors: number;
  totalWarnings: number;
} {
  const stepResults = new Map<number, StepValidationResult>();
  let totalErrors = 0;
  let totalWarnings = 0;

  steps.forEach((step, index) => {
    const result = validateStep(step, index);
    stepResults.set(index, result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  });

  return {
    valid: totalErrors === 0,
    stepResults,
    totalErrors,
    totalWarnings,
  };
}

// ============================================================================
// HELPER VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if event type is valid.
 */
function isValidEventType(event: string): boolean {
  const validEvents = ['open', 'click', 'input', 'dropdown', 'conditional-click'];
  return validEvents.includes(event);
}

/**
 * Validate fields required for specific event types.
 */
function validateEventSpecificFields(
  step: Partial<Step>,
  prefix: string
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (step.event) {
    case 'open':
      if (!step.url) {
        errors.push(`${prefix}'open' event requires 'url' field`);
      } else if (!isValidUrl(step.url)) {
        warnings.push(`${prefix}URL may be invalid: ${step.url}`);
      }
      break;

    case 'input':
      if (!step.selector && !step.xpath && step.recordedVia !== 'vision') {
        errors.push(`${prefix}'input' event requires 'selector', 'xpath', or Vision coordinates`);
      }
      break;

    case 'click':
      if (!step.selector && !step.xpath && step.recordedVia !== 'vision') {
        warnings.push(`${prefix}'click' event has no selector/xpath (may use Vision fallback)`);
      }
      break;

    case 'dropdown':
      if (!step.selector && !step.xpath && step.recordedVia !== 'vision') {
        errors.push(`${prefix}'dropdown' event requires 'selector', 'xpath', or Vision coordinates`);
      }
      if (!step.value) {
        warnings.push(`${prefix}'dropdown' event has no value to select`);
      }
      break;

    case 'conditional-click':
      if (!step.conditionalConfig) {
        errors.push(`${prefix}'conditional-click' event requires 'conditionalConfig'`);
      }
      break;
  }

  return { errors, warnings };
}

/**
 * Validate Vision-specific fields.
 */
function validateVisionFields(
  step: Partial<Step>,
  prefix: string
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Coordinates required for Vision steps
  if (!step.coordinates) {
    errors.push(`${prefix}Vision step requires 'coordinates'`);
  } else {
    const coordErrors = validateCoordinates(step.coordinates, prefix);
    errors.push(...coordErrors);
  }

  // OCR text is recommended but not required
  if (!step.ocrText) {
    warnings.push(`${prefix}Vision step has no 'ocrText' for matching`);
  }

  // Confidence score validation
  if (step.confidenceScore !== undefined) {
    if (step.confidenceScore < 0 || step.confidenceScore > 100) {
      errors.push(`${prefix}confidenceScore must be between 0 and 100`);
    } else if (step.confidenceScore < 50) {
      warnings.push(`${prefix}Low confidence score (${step.confidenceScore}%) may cause matching issues`);
    }
  }

  return { errors, warnings };
}

/**
 * Validate coordinate object.
 */
function validateCoordinates(coords: StepCoordinates, prefix: string): string[] {
  const errors: string[] = [];

  if (typeof coords.x !== 'number' || coords.x < 0) {
    errors.push(`${prefix}Invalid coordinate x: ${coords.x}`);
  }
  if (typeof coords.y !== 'number' || coords.y < 0) {
    errors.push(`${prefix}Invalid coordinate y: ${coords.y}`);
  }
  if (typeof coords.width !== 'number' || coords.width <= 0) {
    errors.push(`${prefix}Invalid coordinate width: ${coords.width}`);
  }
  if (typeof coords.height !== 'number' || coords.height <= 0) {
    errors.push(`${prefix}Invalid coordinate height: ${coords.height}`);
  }

  return errors;
}

/**
 * Validate conditional configuration.
 */
function validateConditionalConfig(
  config: ConditionalConfig | null | undefined,
  prefix: string
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    errors.push(`${prefix}Conditional step requires configuration`);
    return { errors, warnings };
  }

  // Search terms validation
  if (!Array.isArray(config.searchTerms) || config.searchTerms.length === 0) {
    errors.push(`${prefix}conditionalConfig.searchTerms must be a non-empty array`);
  } else {
    const emptyTerms = config.searchTerms.filter(t => !t || t.trim() === '');
    if (emptyTerms.length > 0) {
      warnings.push(`${prefix}conditionalConfig has ${emptyTerms.length} empty search term(s)`);
    }
  }

  // Timeout validation
  if (typeof config.timeoutSeconds !== 'number' || config.timeoutSeconds < 1) {
    errors.push(`${prefix}conditionalConfig.timeoutSeconds must be at least 1`);
  } else if (config.timeoutSeconds > 600) {
    warnings.push(`${prefix}conditionalConfig.timeoutSeconds is very long (${config.timeoutSeconds}s)`);
  }

  // Poll interval validation
  if (typeof config.pollIntervalMs !== 'number' || config.pollIntervalMs < 100) {
    errors.push(`${prefix}conditionalConfig.pollIntervalMs must be at least 100ms`);
  }

  // Interaction type validation
  const validTypes = ['click', 'dropdown', 'input'];
  if (!validTypes.includes(config.interactionType)) {
    errors.push(`${prefix}conditionalConfig.interactionType must be one of: ${validTypes.join(', ')}`);
  }

  // Type-specific validation
  if (config.interactionType === 'dropdown' && !config.dropdownOption) {
    errors.push(`${prefix}Dropdown interaction requires 'dropdownOption'`);
  }
  if (config.interactionType === 'input' && !config.inputValue) {
    errors.push(`${prefix}Input interaction requires 'inputValue'`);
  }

  return { errors, warnings };
}

/**
 * Validate delay value.
 */
function validateDelay(
  delaySeconds: number,
  prefix: string
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof delaySeconds !== 'number') {
    errors.push(`${prefix}delaySeconds must be a number`);
  } else if (delaySeconds < 0) {
    errors.push(`${prefix}delaySeconds cannot be negative`);
  } else if (delaySeconds > 3600) {
    errors.push(`${prefix}delaySeconds cannot exceed 3600 (1 hour)`);
  } else if (delaySeconds > 300) {
    warnings.push(`${prefix}delaySeconds is very long (${delaySeconds}s)`);
  }

  return { errors, warnings };
}

/**
 * Basic URL validation.
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    // Could be a relative URL or special protocol
    return url.startsWith('/') || url.startsWith('chrome://') || url.startsWith('chrome-extension://');
  }
}

// ============================================================================
// QUICK VALIDATION HELPERS
// ============================================================================

/**
 * Quick check if a step is valid (no detailed errors).
 */
export function isValidStep(step: Partial<Step>): boolean {
  return validateStep(step).valid;
}

/**
 * Quick check if a step has required fields for its event type.
 */
export function hasRequiredFields(step: Partial<Step>): boolean {
  if (!step.event) return false;
  
  switch (step.event) {
    case 'open':
      return !!step.url;
    case 'conditional-click':
      return !!step.conditionalConfig;
    default:
      return true;
  }
}
