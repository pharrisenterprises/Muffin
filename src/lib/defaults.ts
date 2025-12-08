/**
 * Default Values Factory
 * 
 * Centralized factory functions and constants for creating
 * new Steps, Recordings, and configuration objects.
 */

import type {
  Step,
  Recording,
  ConditionalConfig,
  RecordingConditionalDefaults,
  VisionConfig,
  StepEventType,
} from '../types/vision';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Current schema version for new recordings */
export const CURRENT_SCHEMA_VERSION = 3;

/** Default Vision configuration */
export const DEFAULT_VISION_CONFIG: VisionConfig = {
  enabled: true,
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  useSIMD: true,
  language: 'eng',
  debugMode: false,
  screenshotQuality: 0.92,
  devicePixelRatio: 1,
  fuzzyMatchThreshold: 0.7,
};

/** Default conditional configuration for new conditional steps */
export const DEFAULT_CONDITIONAL_CONFIG: ConditionalConfig = {
  enabled: true,
  searchTerms: ['Allow', 'Keep'],
  timeoutSeconds: 120,
  pollIntervalMs: 1000,
  interactionType: 'click',
};

/** Default conditional defaults for new recordings */
export const DEFAULT_RECORDING_CONDITIONAL: RecordingConditionalDefaults = {
  searchTerms: ['Allow', 'Keep'],
  timeoutSeconds: 120,
  confidenceThreshold: 60,
};

/** Default step values */
export const DEFAULT_STEP: Readonly<Step> = {
  label: '',
  event: 'click',
  recordedVia: 'dom',
};

// ============================================================================
// STEP FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new Step with default values.
 * 
 * @param overrides - Fields to override from defaults
 * @returns A new Step object
 */
export function createStep(overrides: Partial<Step> = {}): Step {
  return {
    ...DEFAULT_STEP,
    timestamp: Date.now(),
    ...overrides,
  };
}

/**
 * Create an 'open' step for URL navigation.
 */
export function createOpenStep(url: string, label?: string): Step {
  return createStep({
    event: 'open',
    url,
    label: label || `Navigate to ${new URL(url).hostname}`,
  });
}

/**
 * Create a 'click' step.
 */
export function createClickStep(
  selector: string,
  label?: string,
  xpath?: string
): Step {
  return createStep({
    event: 'click',
    selector,
    xpath,
    label: label || 'Click element',
  });
}

/**
 * Create an 'input' step.
 */
export function createInputStep(
  selector: string,
  value: string,
  label?: string,
  xpath?: string
): Step {
  return createStep({
    event: 'input',
    selector,
    xpath,
    value,
    label: label || 'Enter text',
  });
}

/**
 * Create a 'dropdown' step.
 */
export function createDropdownStep(
  selector: string,
  value: string,
  label?: string,
  xpath?: string
): Step {
  return createStep({
    event: 'dropdown',
    selector,
    xpath,
    value,
    label: label || 'Select option',
  });
}

/**
 * Create a 'conditional-click' step.
 */
export function createConditionalStep(
  config: Partial<ConditionalConfig> = {},
  label?: string
): Step {
  return createStep({
    event: 'conditional-click',
    label: label || 'Wait for button',
    conditionalConfig: {
      ...DEFAULT_CONDITIONAL_CONFIG,
      ...config,
    },
  });
}

/**
 * Create a Vision-recorded step.
 */
export function createVisionStep(
  coordinates: Step['coordinates'],
  ocrText: string,
  confidence: number,
  event: StepEventType = 'click',
  label?: string
): Step {
  return createStep({
    event,
    recordedVia: 'vision',
    coordinates,
    ocrText,
    confidenceScore: confidence,
    label: label || `Vision: ${ocrText}`,
  });
}

// ============================================================================
// RECORDING FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new Recording with default values.
 * 
 * @param projectId - The project ID this recording belongs to
 * @param overrides - Fields to override from defaults
 * @returns A new Recording object
 */
export function createRecording(
  projectId: number,
  overrides: Partial<Recording> = {}
): Recording {
  const now = Date.now();
  return {
    projectId,
    steps: [],
    schemaVersion: CURRENT_SCHEMA_VERSION,
    loopStartIndex: -1,
    globalDelayMs: 0,
    conditionalDefaults: { ...DEFAULT_RECORDING_CONDITIONAL },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a Recording with initial steps.
 */
export function createRecordingWithSteps(
  projectId: number,
  steps: Step[],
  overrides: Partial<Recording> = {}
): Recording {
  return createRecording(projectId, {
    steps: steps.map((step, index) => ({
      ...step,
      order: index,
    })),
    ...overrides,
  });
}

// ============================================================================
// CONDITIONAL CONFIG FACTORY
// ============================================================================

/**
 * Create a new ConditionalConfig with defaults.
 */
export function createConditionalConfig(
  overrides: Partial<ConditionalConfig> = {}
): ConditionalConfig {
  return {
    ...DEFAULT_CONDITIONAL_CONFIG,
    ...overrides,
  };
}

/**
 * Create ConditionalConfig from recording defaults.
 */
export function createConditionalConfigFromDefaults(
  defaults: RecordingConditionalDefaults,
  overrides: Partial<ConditionalConfig> = {}
): ConditionalConfig {
  return {
    enabled: true,
    searchTerms: defaults.searchTerms,
    timeoutSeconds: defaults.timeoutSeconds,
    pollIntervalMs: 1000,
    interactionType: 'click',
    ...overrides,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Clone a step with optional modifications.
 */
export function cloneStep(step: Step, overrides: Partial<Step> = {}): Step {
  return {
    ...step,
    // Remove id so it gets a new one when saved
    id: undefined,
    timestamp: Date.now(),
    ...overrides,
  };
}

/**
 * Clone a recording with optional modifications.
 */
export function cloneRecording(
  recording: Recording,
  newProjectId?: number,
  overrides: Partial<Recording> = {}
): Recording {
  return {
    ...recording,
    id: undefined,
    projectId: newProjectId ?? recording.projectId,
    steps: recording.steps.map(step => cloneStep(step)),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Get default value for a step field.
 */
export function getStepDefault<K extends keyof Step>(field: K): Step[K] {
  return DEFAULT_STEP[field];
}

/**
 * Check if a value differs from the default.
 */
export function isNonDefaultValue<K extends keyof Step>(
  field: K,
  value: Step[K]
): boolean {
  return value !== DEFAULT_STEP[field];
}
