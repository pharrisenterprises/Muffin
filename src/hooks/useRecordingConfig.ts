/**
 * useRecordingConfig Hook
 * 
 * Manages recording-level configuration state for Vision features:
 * - Global delay (ms)
 * - Loop start index
 * - Conditional defaults
 * 
 * Build Card: UI-014
 */

import { useState, useEffect, useCallback } from 'react';
import type { Recording, RecordingConditionalDefaults } from '../types/vision';

type ConditionalDefaults = RecordingConditionalDefaults;

// ============================================================================
// TYPES
// ============================================================================

export interface RecordingConfig {
  globalDelayMs: number;
  loopStartIndex: number;
  conditionalDefaults: ConditionalDefaults;
}

export interface UseRecordingConfigReturn {
  /** Current configuration */
  config: RecordingConfig;
  
  /** Set global delay in milliseconds */
  setGlobalDelayMs: (ms: number) => void;
  
  /** Set loop start index */
  setLoopStartIndex: (index: number) => void;
  
  /** Set conditional defaults */
  setConditionalDefaults: (defaults: ConditionalDefaults) => void;
  
  /** Update recording with current config */
  applyToRecording: (recording: Recording) => Recording;
  
  /** Reset to default values */
  resetConfig: () => void;
  
  /** Check if config has unsaved changes */
  hasChanges: boolean;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_RECORDING_CONFIG: RecordingConfig = {
  globalDelayMs: 0,
  loopStartIndex: 0,
  conditionalDefaults: {
    searchTerms: ['Allow', 'Keep'],
    timeoutSeconds: 120,
    confidenceThreshold: 60,
  },
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing recording configuration state.
 * 
 * @param recording - Current recording (can be null during loading)
 * @param onConfigChange - Optional callback when config changes
 */
export function useRecordingConfig(
  recording: Recording | null,
  onConfigChange?: (config: RecordingConfig) => void
): UseRecordingConfigReturn {
  // Initialize state from recording or defaults
  const [config, setConfig] = useState<RecordingConfig>(() => {
    if (recording) {
      return {
        globalDelayMs: recording.globalDelayMs ?? DEFAULT_RECORDING_CONFIG.globalDelayMs,
        loopStartIndex: recording.loopStartIndex ?? DEFAULT_RECORDING_CONFIG.loopStartIndex,
        conditionalDefaults: recording.conditionalDefaults ?? DEFAULT_RECORDING_CONFIG.conditionalDefaults,
      };
    }
    return { ...DEFAULT_RECORDING_CONFIG };
  });
  
  // Track initial values for change detection
  const [initialConfig, setInitialConfig] = useState<RecordingConfig>(config);
  
  // Sync with recording when it changes
  useEffect(() => {
    if (recording) {
      const newConfig: RecordingConfig = {
        globalDelayMs: recording.globalDelayMs ?? DEFAULT_RECORDING_CONFIG.globalDelayMs,
        loopStartIndex: recording.loopStartIndex ?? DEFAULT_RECORDING_CONFIG.loopStartIndex,
        conditionalDefaults: recording.conditionalDefaults ?? DEFAULT_RECORDING_CONFIG.conditionalDefaults,
      };
      setConfig(newConfig);
      setInitialConfig(newConfig);
    }
  }, [recording?.id]); // Only re-sync when recording ID changes
  
  // Notify parent of changes
  useEffect(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);
  
  // Set global delay with validation
  const setGlobalDelayMs = useCallback((ms: number) => {
    const clampedMs = Math.max(0, Math.min(60000, ms));
    setConfig((prev) => ({ ...prev, globalDelayMs: clampedMs }));
  }, []);
  
  // Set loop start index with validation
  const setLoopStartIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(0, index);
    setConfig((prev) => ({ ...prev, loopStartIndex: clampedIndex }));
  }, []);
  
  // Set conditional defaults
  const setConditionalDefaults = useCallback((defaults: ConditionalDefaults) => {
    setConfig((prev) => ({ ...prev, conditionalDefaults: defaults }));
  }, []);
  
  // Apply config to recording object
  const applyToRecording = useCallback((rec: Recording): Recording => {
    return {
      ...rec,
      globalDelayMs: config.globalDelayMs,
      loopStartIndex: config.loopStartIndex,
      conditionalDefaults: config.conditionalDefaults,
    };
  }, [config]);
  
  // Reset to defaults
  const resetConfig = useCallback(() => {
    setConfig({ ...DEFAULT_RECORDING_CONFIG });
  }, []);
  
  // Check for unsaved changes
  const hasChanges = 
    config.globalDelayMs !== initialConfig.globalDelayMs ||
    config.loopStartIndex !== initialConfig.loopStartIndex ||
    JSON.stringify(config.conditionalDefaults) !== JSON.stringify(initialConfig.conditionalDefaults);
  
  return {
    config,
    setGlobalDelayMs,
    setLoopStartIndex,
    setConditionalDefaults,
    applyToRecording,
    resetConfig,
    hasChanges,
  };
}
