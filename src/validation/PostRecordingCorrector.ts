// ═══════════════════════════════════════════════════════════════════════════
// POST-RECORDING CORRECTOR - Independently Wrapped Module
// ═══════════════════════════════════════════════════════════════════════════
// Improves low-confidence labels after recording completes

import {
  StepValidationResult,
  AppliedCorrection,
  PlaybackMapping,
  PlaybackStrategy,
  PlaybackPlan
} from './types';
import { RecordedStep } from '../recording/types';
import { CONFIDENCE_THRESHOLDS, PLAYBACK_TIMEOUTS } from './config';

/**
 * PostRecordingCorrector - Improves recording quality after capture
 */
export class PostRecordingCorrector {
  private autoCorrectThreshold: number;
  
  constructor(autoCorrectThreshold?: number) {
    this.autoCorrectThreshold = autoCorrectThreshold ?? CONFIDENCE_THRESHOLDS.MEDIUM;
  }
  
  correctLabels(
    steps: RecordedStep[],
    validationResults: StepValidationResult[]
  ): { correctedSteps: RecordedStep[]; corrections: AppliedCorrection[] } {
    const correctedSteps: RecordedStep[] = [];
    const allCorrections: AppliedCorrection[] = [];
    
    for (const step of steps) {
      const validation = validationResults.find(v => v.stepNumber === step.stepNumber);
      
      if (!validation) {
        correctedSteps.push(step);
        continue;
      }
      
      if (validation.labelConfidence.overallScore < this.autoCorrectThreshold && validation.labelConfidence.suggestedLabel) {
        const correctedStep: RecordedStep = {
          ...step,
          label: validation.labelConfidence.suggestedLabel
        };
        
        correctedSteps.push(correctedStep);
        allCorrections.push({
          field: 'label',
          originalValue: step.label,
          correctedValue: validation.labelConfidence.suggestedLabel,
          reason: `Confidence ${(validation.labelConfidence.overallScore * 100).toFixed(0)}% below threshold`,
          confidence: validation.labelConfidence.overallScore
        });
      } else {
        correctedSteps.push(step);
      }
    }
    
    return { correctedSteps, corrections: allCorrections };
  }
  
  generatePlaybackPlan(
    steps: RecordedStep[],
    validationResults: StepValidationResult[],
    projectId: string
  ): PlaybackPlan {
    const mappings: PlaybackMapping[] = [];
    const stepsNeedingReview: number[] = [];
    
    for (const step of steps) {
      const validation = validationResults.find(v => v.stepNumber === step.stepNumber);
      
      if (!validation) {
        mappings.push(this.createDefaultMapping(step));
        stepsNeedingReview.push(step.stepNumber);
        continue;
      }
      
      const mapping = this.createOptimizedMapping(step, validation);
      mappings.push(mapping);
      
      if (validation.status === 'needs-review' || validation.status === 'corrected') {
        stepsNeedingReview.push(step.stepNumber);
      }
    }
    
    const overallConfidence = this.calculateOverallConfidence(mappings);
    
    return { projectId, mappings, overallConfidence, stepsNeedingReview, createdAt: Date.now() };
  }
  
  getStepsNeedingReview(validationResults: StepValidationResult[]): number[] {
    return validationResults
      .filter(v => 
        v.status === 'needs-review' ||
        v.status === 'invalid' ||
        v.labelConfidence.tier === 'critical' ||
        v.warnings.some(w => w.severity === 'error')
      )
      .map(v => v.stepNumber);
  }
  
  generateSummary(validationResults: StepValidationResult[]) {
    const summary = {
      total: validationResults.length,
      valid: 0,
      corrected: 0,
      needsReview: 0,
      invalid: 0,
      overallConfidence: 0
    };
    
    let totalConfidence = 0;
    
    for (const result of validationResults) {
      switch (result.status) {
        case 'valid': summary.valid++; break;
        case 'corrected': summary.corrected++; break;
        case 'needs-review': summary.needsReview++; break;
        case 'invalid': summary.invalid++; break;
      }
      totalConfidence += result.labelConfidence.overallScore;
    }
    
    summary.overallConfidence = validationResults.length > 0 ? totalConfidence / validationResults.length : 0;
    return summary;
  }
  
  private createDefaultMapping(step: RecordedStep): PlaybackMapping {
    return {
      recordedStep: step,
      validation: {
        stepNumber: step.stepNumber,
        status: 'needs-review',
        visualContext: {
          contextType: 'unknown',
          confidence: 0,
          detectedPatterns: [],
          visualCharacteristics: {
            backgroundColor: '#ffffff',
            textColor: '#000000',
            fontFamily: 'sans-serif',
            isMonospace: false,
            hasDarkTheme: false,
            hasPromptIndicators: false,
            borderStyle: 'none',
            isInCodeBlock: false
          }
        },
        labelConfidence: { originalLabel: step.label, overallScore: 0.5, factors: [], tier: 'medium' },
        timestamp: Date.now(),
        warnings: [{ code: 'NO_VALIDATION', severity: 'warning', message: 'Step was not validated' }],
        corrections: []
      },
      playbackBundle: step.bundle,
      playbackConfidence: 0.5,
      fallbackStrategies: this.generateDefaultStrategies(step)
    };
  }
  
  private createOptimizedMapping(step: RecordedStep, validation: StepValidationResult): PlaybackMapping {
    const strategies = this.generateDefaultStrategies(step);
    const playbackConfidence = this.calculatePlaybackConfidence(validation, strategies);
    
    return {
      recordedStep: step,
      validation,
      playbackBundle: step.bundle,
      playbackConfidence,
      fallbackStrategies: strategies
    };
  }
  
  private generateDefaultStrategies(step: RecordedStep): PlaybackStrategy[] {
    const strategies: PlaybackStrategy[] = [];
    let priority = 1;
    
    if (step.bundle?.xpath) {
      strategies.push({
        name: 'xpath',
        priority: priority++,
        selector: step.bundle.xpath,
        expectedConfidence: 1.0,
        timeout: PLAYBACK_TIMEOUTS.XPATH
      });
    }
    
    if (step.bundle?.id) {
      strategies.push({
        name: 'id',
        priority: priority++,
        selector: `#${step.bundle.id}`,
        expectedConfidence: 0.9,
        timeout: PLAYBACK_TIMEOUTS.ID
      });
    }
    
    if (step.bundle?.ariaLabel) {
      strategies.push({
        name: 'aria',
        priority: priority++,
        selector: `[aria-label="${step.bundle.ariaLabel}"]`,
        expectedConfidence: 0.75,
        timeout: PLAYBACK_TIMEOUTS.ARIA
      });
    }
    
    if (step.selector) {
      strategies.push({
        name: 'css',
        priority: priority++,
        selector: step.selector,
        expectedConfidence: 0.65,
        timeout: PLAYBACK_TIMEOUTS.ARIA
      });
    }
    
    strategies.push({
      name: 'fuzzy-text',
      priority: priority++,
      selector: `text:${step.label}`,
      expectedConfidence: 0.4,
      timeout: PLAYBACK_TIMEOUTS.FUZZY_TEXT
    });
    
    return strategies;
  }
  
  private calculatePlaybackConfidence(validation: StepValidationResult, _strategies: PlaybackStrategy[]): number {
    let confidence = validation.labelConfidence.overallScore;
    if (validation.visualContext.confidence > 0.8) confidence += 0.1;
    const errorCount = validation.warnings.filter(w => w.severity === 'error').length;
    confidence -= errorCount * 0.1;
    return Math.max(0, Math.min(1, confidence));
  }
  
  private calculateOverallConfidence(mappings: PlaybackMapping[]): number {
    if (mappings.length === 0) return 0;
    const total = mappings.reduce((sum, m) => sum + m.playbackConfidence, 0);
    return total / mappings.length;
  }
}

export function createPostRecordingCorrector(autoCorrectThreshold?: number): PostRecordingCorrector {
  return new PostRecordingCorrector(autoCorrectThreshold);
}
