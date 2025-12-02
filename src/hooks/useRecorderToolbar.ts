/**
 * useRecorderToolbar Hook
 * 
 * Combines recording config and step config for toolbar integration.
 * Provides a unified API for the Recorder toolbar controls.
 * 
 * Build Card: UI-014
 */

import { useMemo } from 'react';
import { useRecordingConfig } from './useRecordingConfig';
import { useStepConfig } from './useStepConfig';
import type { Recording, Step, ConditionalConfig } from '../types/vision';

// ============================================================================
// TYPES
// ============================================================================

export interface UseRecorderToolbarReturn {
  // Recording-level config
  globalDelayMs: number;
  loopStartIndex: number;
  
  // Setters
  setGlobalDelayMs: (ms: number) => void;
  setLoopStartIndex: (index: number) => void;
  
  // Step operations
  setStepDelay: (stepIndex: number, delaySeconds: number | null) => void;
  setStepConditionalConfig: (stepIndex: number, config: ConditionalConfig | null) => void;
  addConditionalStep: (config: ConditionalConfig) => Step;
  
  // Save helpers
  hasUnsavedChanges: boolean;
  getUpdatedRecording: () => Recording;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Unified hook for Recorder toolbar state management.
 * 
 * @param recording - Current recording
 * @param steps - Current steps array
 * @param onRecordingChange - Callback when recording changes
 * @param onStepsChange - Callback when steps change
 */
export function useRecorderToolbar(
  recording: Recording | null,
  steps: Step[],
  _onRecordingChange: (recording: Recording) => void,
  onStepsChange: (steps: Step[]) => void
): UseRecorderToolbarReturn {
  // Recording-level config
  const {
    config,
    setGlobalDelayMs,
    setLoopStartIndex,
    applyToRecording,
    hasChanges: hasRecordingChanges,
  } = useRecordingConfig(recording);
  
  // Step-level config
  const {
    setStepDelay,
    setStepConditionalConfig,
    addConditionalStep,
  } = useStepConfig(steps, onStepsChange);
  
  // Get updated recording with all changes
  const getUpdatedRecording = useMemo(() => {
    return (): Recording => {
      if (!recording) {
        throw new Error('No recording available');
      }
      return applyToRecording(recording);
    };
  }, [recording, applyToRecording]);
  
  return {
    // Config values
    globalDelayMs: config.globalDelayMs,
    loopStartIndex: config.loopStartIndex,
    
    // Setters
    setGlobalDelayMs,
    setLoopStartIndex,
    
    // Step operations
    setStepDelay,
    setStepConditionalConfig,
    addConditionalStep,
    
    // Save helpers
    hasUnsavedChanges: hasRecordingChanges,
    getUpdatedRecording,
  };
}
