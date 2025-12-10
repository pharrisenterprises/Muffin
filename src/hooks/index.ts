/**
 * Hooks Index
 * 
 * Exports all custom hooks for Recorder integration.
 * 
 * Build Card: UI-014
 */

export { useRecordingConfig } from './useRecordingConfig';
export type { RecordingConfig, UseRecordingConfigReturn } from './useRecordingConfig';

export { useStepConfig } from './useStepConfig';
export type { UseStepConfigReturn, StepModification } from './useStepConfig';

export { useRecorderToolbar } from './useRecorderToolbar';
export type { UseRecorderToolbarReturn } from './useRecorderToolbar';

// ═══════════════════════════════════════════════════════════════════════════════
// SP-A7: Verification Hook exports (Track A)
// ═══════════════════════════════════════════════════════════════════════════════
export { useVerificationState } from './useVerificationState';
export type { UseVerificationStateReturn } from './useVerificationState';
