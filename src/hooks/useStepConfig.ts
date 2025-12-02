/**
 * useStepConfig Hook
 * 
 * Manages step-level configuration for Vision features:
 * - Per-step delays
 * - Conditional click configurations
 * - Step updates
 * 
 * Build Card: UI-014
 */

import { useState, useCallback } from 'react';
import type { Step, ConditionalConfig } from '../types/vision';

// ============================================================================
// TYPES
// ============================================================================

export interface UseStepConfigReturn {
  /** Update delay for a specific step */
  setStepDelay: (stepIndex: number, delaySeconds: number | null) => void;
  
  /** Update conditional config for a step */
  setStepConditionalConfig: (stepIndex: number, config: ConditionalConfig | null) => void;
  
  /** Add a new conditional click step */
  addConditionalStep: (config: ConditionalConfig) => Step;
  
  /** Update a step's recordedVia property */
  setStepRecordedVia: (stepIndex: number, via: 'dom' | 'vision') => void;
  
  /** Get updated steps array after modifications */
  getUpdatedSteps: () => Step[];
  
  /** Apply pending changes to steps array */
  applyChanges: (steps: Step[]) => Step[];
}

export interface StepModification {
  stepIndex: number;
  field: 'delaySeconds' | 'conditionalConfig' | 'recordedVia';
  value: unknown;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing step-level configuration changes.
 * 
 * @param steps - Current steps array
 * @param onStepsChange - Callback when steps are modified
 */
export function useStepConfig(
  steps: Step[],
  onStepsChange: (steps: Step[]) => void
): UseStepConfigReturn {
  // Track pending modifications
  const [modifications, setModifications] = useState<StepModification[]>([]);
  
  // Set delay for a specific step
  const setStepDelay = useCallback((stepIndex: number, delaySeconds: number | null) => {
    // Validate
    const validDelay = delaySeconds === null 
      ? undefined
      : Math.max(0, Math.min(3600, delaySeconds));
    
    // Update steps
    const updatedSteps = steps.map((step, index) => {
      if (index === stepIndex) {
        return { ...step, delaySeconds: validDelay };
      }
      return step;
    });
    
    onStepsChange(updatedSteps);
  }, [steps, onStepsChange]);
  
  // Set conditional config for a step
  const setStepConditionalConfig = useCallback((
    stepIndex: number, 
    config: ConditionalConfig | null
  ) => {
    const updatedSteps = steps.map((step, index) => {
      if (index === stepIndex) {
        return { ...step, conditionalConfig: config };
      }
      return step;
    });
    
    onStepsChange(updatedSteps);
  }, [steps, onStepsChange]);
  
  // Add a new conditional click step
  const addConditionalStep = useCallback((config: ConditionalConfig): Step => {
    const newStep: Step = {
      id: Date.now(),
      label: `Conditional Click: ${config.searchTerms.slice(0, 2).join(', ')}`,
      event: 'conditional-click',
      recordedVia: 'vision',
      conditionalConfig: config,
      timestamp: Date.now(),
      xpath: '',
      value: '',
    };
    
    onStepsChange([...steps, newStep]);
    
    return newStep;
  }, [steps, onStepsChange]);
  
  // Set recordedVia for a step
  const setStepRecordedVia = useCallback((
    stepIndex: number, 
    via: 'dom' | 'vision'
  ) => {
    const updatedSteps = steps.map((step, index) => {
      if (index === stepIndex) {
        return { ...step, recordedVia: via };
      }
      return step;
    });
    
    onStepsChange(updatedSteps);
  }, [steps, onStepsChange]);
  
  // Get updated steps with all modifications applied
  const getUpdatedSteps = useCallback((): Step[] => {
    let result = [...steps];
    
    modifications.forEach((mod) => {
      if (mod.stepIndex >= 0 && mod.stepIndex < result.length) {
        result[mod.stepIndex] = {
          ...result[mod.stepIndex],
          [mod.field]: mod.value,
        };
      }
    });
    
    return result;
  }, [steps, modifications]);
  
  // Apply pending changes
  const applyChanges = useCallback((currentSteps: Step[]): Step[] => {
    let result = [...currentSteps];
    
    modifications.forEach((mod) => {
      if (mod.stepIndex >= 0 && mod.stepIndex < result.length) {
        result[mod.stepIndex] = {
          ...result[mod.stepIndex],
          [mod.field]: mod.value,
        };
      }
    });
    
    setModifications([]);
    return result;
  }, [modifications]);
  
  return {
    setStepDelay,
    setStepConditionalConfig,
    addConditionalStep,
    setStepRecordedVia,
    getUpdatedSteps,
    applyChanges,
  };
}
