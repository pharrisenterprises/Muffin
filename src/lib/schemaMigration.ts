/**
 * Schema Migration Utilities
 * 
 * Provides functions for migrating recordings and steps between schema versions.
 * All migrations are idempotent and immutable (original data not modified).
 * 
 * Schema Versions:
 * - v1: Original (no Vision fields)
 * - v2: Current (loopStartIndex, globalDelayMs, conditionalDefaults, recordedVia)
 */

import type { 
  Step, 
  Recording, 
  ConditionalConfig,
  RecordingConditionalDefaults,
  RecordedVia 
} from '../types/vision';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Current schema version */
export const CURRENT_SCHEMA_VERSION = 3;

/** Default values for migration */
export const MIGRATION_DEFAULTS = {
  recordedVia: 'dom' as RecordedVia,
  loopStartIndex: 0,
  globalDelayMs: 0,
  conditionalDefaults: {
    searchTerms: ['Allow', 'Keep'],
    timeoutSeconds: 120,
    confidenceThreshold: 60,
  } as RecordingConditionalDefaults,
} as const;

/** Maximum allowed values (for validation/repair) */
export const MAX_VALUES = {
  delaySeconds: 3600,      // 1 hour max
  globalDelayMs: 60000,    // 60 seconds max
  timeoutSeconds: 600,     // 10 minutes max
  loopStartIndex: 1000,    // Reasonable max steps
} as const;

// ============================================================================
// STEP MIGRATION
// ============================================================================

/**
 * Migrate a single step to the current schema.
 * Adds default values for missing Vision fields.
 * 
 * @param step - The step to migrate (may be partial/legacy)
 * @returns A fully-typed Step with all required fields
 */
export function migrateStep(step: Partial<Step>): Step {
  // Start with a copy to ensure immutability
  const migrated: Step = {
    // Existing required fields
    label: step.label || '',
    event: normalizeEventType(step.event),
    
    // Existing optional fields (preserve if present)
    ...(step.id !== undefined && { id: step.id }),
    ...(step.value !== undefined && { value: step.value }),
    ...(step.selector !== undefined && { selector: step.selector }),
    ...(step.xpath !== undefined && { xpath: step.xpath }),
    ...(step.url !== undefined && { url: step.url }),
    ...(step.timestamp !== undefined && { timestamp: step.timestamp }),
    ...(step.order !== undefined && { order: step.order }),
    
    // Vision fields with defaults
    recordedVia: step.recordedVia || MIGRATION_DEFAULTS.recordedVia,
    
    // Vision optional fields (only include if present)
    ...(step.coordinates !== undefined && { coordinates: step.coordinates }),
    ...(step.ocrText !== undefined && { ocrText: step.ocrText }),
    ...(step.confidenceScore !== undefined && { confidenceScore: step.confidenceScore }),
    ...(step.delaySeconds !== undefined && { delaySeconds: repairDelaySeconds(step.delaySeconds) }),
    ...(step.conditionalConfig !== undefined && { conditionalConfig: repairConditionalConfig(step.conditionalConfig) }),
  };

  return migrated;
}

/**
 * Normalize event type to valid StepEventType.
 */
function normalizeEventType(event: string | undefined): Step['event'] {
  const validEvents = ['open', 'click', 'input', 'dropdown', 'conditional-click'];
  if (event && validEvents.includes(event)) {
    return event as Step['event'];
  }
  return 'click'; // Default fallback
}

/**
 * Repair delay seconds to valid range.
 */
function repairDelaySeconds(value: number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || isNaN(value)) return undefined;
  if (value < 0) return 0;
  if (value > MAX_VALUES.delaySeconds) return MAX_VALUES.delaySeconds;
  return value;
}

/**
 * Repair conditional config to valid state.
 */
function repairConditionalConfig(config: ConditionalConfig | null | undefined): ConditionalConfig | null {
  if (!config) return null;
  if (typeof config !== 'object') return null;
  
  return {
    enabled: Boolean(config.enabled),
    searchTerms: Array.isArray(config.searchTerms) ? config.searchTerms : ['Allow', 'Keep'],
    timeoutSeconds: Math.min(
      Math.max(1, config.timeoutSeconds || 120),
      MAX_VALUES.timeoutSeconds
    ),
    pollIntervalMs: Math.max(100, config.pollIntervalMs || 1000),
    interactionType: ['click', 'dropdown', 'input'].includes(config.interactionType) 
      ? config.interactionType 
      : 'click',
    ...(config.dropdownOption && { dropdownOption: config.dropdownOption }),
    ...(config.inputValue && { inputValue: config.inputValue }),
  };
}

// ============================================================================
// RECORDING MIGRATION
// ============================================================================

/**
 * Migrate a recording to the current schema.
 * Adds default values and migrates all steps.
 * 
 * @param recording - The recording to migrate (may be partial/legacy)
 * @param projectId - Project ID to use if not present
 * @returns A fully-typed Recording with all required fields
 */
export function migrateRecording(
  recording: Partial<Recording>,
  projectId: number
): Recording {
  // Migrate all steps
  const migratedSteps = (recording.steps || []).map(migrateStep);
  
  // Repair loop start index
  const loopStartIndex = repairLoopStartIndex(
    recording.loopStartIndex,
    migratedSteps.length
  );
  
  // Repair global delay
  const globalDelayMs = repairGlobalDelayMs(recording.globalDelayMs);
  
  // Build migrated recording
  const migrated: Recording = {
    // Existing fields
    projectId: recording.projectId ?? projectId,
    steps: migratedSteps,
    
    // Optional existing fields
    ...(recording.id !== undefined && { id: recording.id }),
    ...(recording.name !== undefined && { name: recording.name }),
    ...(recording.createdAt !== undefined && { createdAt: recording.createdAt }),
    
    // Always update updatedAt
    updatedAt: Date.now(),
    
    // Vision fields with defaults
    schemaVersion: CURRENT_SCHEMA_VERSION,
    loopStartIndex,
    globalDelayMs,
    conditionalDefaults: migrateConditionalDefaults(recording.conditionalDefaults),
    
    // Optional data fields
    ...(recording.parsedFields !== undefined && { parsedFields: recording.parsedFields }),
    ...(recording.csvData !== undefined && { csvData: recording.csvData }),
  };

  return migrated;
}

/**
 * Repair loop start index to valid range.
 */
function repairLoopStartIndex(value: number | undefined, stepCount: number): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== 'number' || isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > stepCount) return Math.max(0, stepCount - 1);
  if (value > MAX_VALUES.loopStartIndex) return MAX_VALUES.loopStartIndex;
  return Math.floor(value);
}

/**
 * Repair global delay to valid range.
 */
function repairGlobalDelayMs(value: number | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== 'number' || isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > MAX_VALUES.globalDelayMs) return MAX_VALUES.globalDelayMs;
  return Math.floor(value);
}

/**
 * Migrate conditional defaults with repairs.
 */
function migrateConditionalDefaults(
  defaults: Partial<RecordingConditionalDefaults> | undefined
): RecordingConditionalDefaults {
  if (!defaults) {
    return { ...MIGRATION_DEFAULTS.conditionalDefaults };
  }
  
  return {
    searchTerms: Array.isArray(defaults.searchTerms) && defaults.searchTerms.length > 0
      ? defaults.searchTerms
      : MIGRATION_DEFAULTS.conditionalDefaults.searchTerms,
    timeoutSeconds: Math.min(
      Math.max(1, defaults.timeoutSeconds || 120),
      MAX_VALUES.timeoutSeconds
    ),
    confidenceThreshold: Math.min(
      Math.max(0, defaults.confidenceThreshold || 60),
      100
    ),
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a step needs migration.
 */
export function stepNeedsMigration(step: Partial<Step>): boolean {
  return step.recordedVia === undefined;
}

/**
 * Check if a recording needs migration.
 */
export function recordingNeedsMigration(recording: Partial<Recording>): boolean {
  // Check schema version
  if (recording.schemaVersion !== CURRENT_SCHEMA_VERSION) return true;
  
  // Check required Vision fields
  if (recording.loopStartIndex === undefined) return true;
  if (recording.globalDelayMs === undefined) return true;
  if (recording.conditionalDefaults === undefined) return true;
  
  // Check if any steps need migration
  if (recording.steps?.some(stepNeedsMigration)) return true;
  
  return false;
}

/**
 * Verify a recording is fully migrated and valid.
 */
export function verifyRecordingMigration(recording: Recording): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check schema version
  if (recording.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    issues.push(`Schema version ${recording.schemaVersion} !== ${CURRENT_SCHEMA_VERSION}`);
  }
  
  // Check required fields
  if (typeof recording.loopStartIndex !== 'number') {
    issues.push('loopStartIndex is not a number');
  }
  if (typeof recording.globalDelayMs !== 'number') {
    issues.push('globalDelayMs is not a number');
  }
  if (!recording.conditionalDefaults) {
    issues.push('conditionalDefaults is missing');
  }
  
  // Check steps
  recording.steps.forEach((step, index) => {
    if (!step.recordedVia) {
      issues.push(`Step ${index} missing recordedVia`);
    }
    if (!step.event) {
      issues.push(`Step ${index} missing event`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
