// ═══════════════════════════════════════════════════════════════════════════
// RECORDING VALIDATOR - Cross-Validation Module
// ═══════════════════════════════════════════════════════════════════════════
// Cross-validates steps using screenshot, visual context, and label scoring

import {
  StepValidationResult,
  ValidationStatus,
  ValidationWarning,
  AppliedCorrection,
  ScreenshotCapture
} from './types';
import { RecordedStep } from '../recording/types';
import { ScreenshotCaptureService } from './ScreenshotCapture';
import { VisualContextValidator } from './VisualContextValidator';
import { LabelConfidenceScorer } from './LabelConfidenceScorer';
import { VALIDATION_ORCHESTRATOR_CONFIG } from './config';

/**
 * RecordingValidator - Cross-validates recorded steps
 */
export class RecordingValidator {
  private screenshotCapture: ScreenshotCaptureService;
  private contextValidator: VisualContextValidator;
  private labelScorer: LabelConfidenceScorer;
  private config: typeof VALIDATION_ORCHESTRATOR_CONFIG;
  
  constructor(config?: Partial<typeof VALIDATION_ORCHESTRATOR_CONFIG>) {
    this.config = { ...VALIDATION_ORCHESTRATOR_CONFIG, ...config };
    this.screenshotCapture = new ScreenshotCaptureService();
    this.contextValidator = new VisualContextValidator();
    this.labelScorer = new LabelConfidenceScorer();
  }
  
  async validateStep(step: RecordedStep, element?: HTMLElement): Promise<StepValidationResult> {
    const warnings: ValidationWarning[] = [];
    const corrections: AppliedCorrection[] = [];
    
    const targetElement = element || this.findElement(step);
    if (!targetElement) {
      return this.createFailedValidation(step, 'Element not found');
    }
    
    // Capture screenshot
    let screenshot: ScreenshotCapture | undefined;
    if (this.config.captureScreenshots) {
      try {
        screenshot = await this.screenshotCapture.captureElement(targetElement, step.stepNumber);
      } catch (error) {
        warnings.push({
          code: 'SCREENSHOT_FAILED',
          severity: 'warning',
          message: `Screenshot capture failed: ${error}`
        });
      }
    }
    
    // Validate visual context
    const visualContext = this.contextValidator.validateContext(targetElement, screenshot);
    
    if (visualContext.contextWarning) {
      warnings.push({
        code: 'CONTEXT_WARNING',
        severity: 'warning',
        message: visualContext.contextWarning.message,
        suggestedFix: visualContext.contextWarning.suggestedAction
      });
    }
    
    // Score label confidence
    const labelConfidence = this.labelScorer.scoreLabel(step.label, targetElement);
    
    if (labelConfidence.tier === 'low' || labelConfidence.tier === 'critical') {
      if (this.config.enableLabelCorrection && labelConfidence.suggestedLabel) {
        corrections.push({
          field: 'label',
          originalValue: step.label,
          correctedValue: labelConfidence.suggestedLabel,
          reason: 'Low confidence label replaced',
          confidence: labelConfidence.overallScore
        });
      } else {
        warnings.push({
          code: 'LOW_LABEL_CONFIDENCE',
          severity: 'warning',
          message: `Label "${step.label}" has low confidence`,
          suggestedFix: labelConfidence.suggestedLabel
        });
      }
    }
    
    const status = this.determineStatus(warnings, corrections);
    
    return {
      stepNumber: step.stepNumber,
      status,
      screenshot,
      visualContext,
      labelConfidence,
      timestamp: Date.now(),
      warnings,
      corrections
    };
  }
  
  async validateAllSteps(steps: RecordedStep[]): Promise<StepValidationResult[]> {
    const results: StepValidationResult[] = [];
    const batchSize = this.config.parallelValidation;
    
    for (let i = 0; i < steps.length; i += batchSize) {
      const batch = steps.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(step => this.validateStep(step)));
      results.push(...batchResults);
    }
    
    return results;
  }
  
  quickValidate(step: RecordedStep, element: HTMLElement): boolean {
    const visualContext = this.contextValidator.validateContext(element);
    const labelConfidence = this.labelScorer.scoreLabel(step.label, element);
    return visualContext.confidence >= 0.6 && !visualContext.contextWarning && labelConfidence.tier !== 'critical';
  }
  
  private findElement(step: RecordedStep): HTMLElement | null {
    if (step.bundle?.xpath) {
      try {
        const result = document.evaluate(step.bundle.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue) return result.singleNodeValue as HTMLElement;
      } catch { /* fall through */ }
    }
    
    if (step.selector) {
      const el = document.querySelector(step.selector);
      if (el) return el as HTMLElement;
    }
    
    if (step.bundle?.id) {
      const el = document.getElementById(step.bundle.id);
      if (el) return el;
    }
    
    return null;
  }
  
  private createFailedValidation(step: RecordedStep, reason: string): StepValidationResult {
    return {
      stepNumber: step.stepNumber,
      status: 'invalid',
      visualContext: {
        contextType: 'unknown',
        confidence: 0,
        detectedPatterns: [],
        visualCharacteristics: {
          backgroundColor: '#000000',
          textColor: '#ffffff',
          fontFamily: 'unknown',
          isMonospace: false,
          hasDarkTheme: false,
          hasPromptIndicators: false,
          borderStyle: 'none',
          isInCodeBlock: false
        }
      },
      labelConfidence: {
        originalLabel: step.label,
        overallScore: 0,
        factors: [],
        tier: 'critical'
      },
      timestamp: Date.now(),
      warnings: [{ code: 'VALIDATION_FAILED', severity: 'error', message: reason }],
      corrections: []
    };
  }
  
  private determineStatus(warnings: ValidationWarning[], corrections: AppliedCorrection[]): ValidationStatus {
    const hasErrors = warnings.some(w => w.severity === 'error');
    const hasCorrections = corrections.length > 0;
    const hasWarnings = warnings.some(w => w.severity === 'warning');
    
    if (hasErrors) return 'invalid';
    if (hasCorrections) return 'corrected';
    if (hasWarnings) return 'needs-review';
    return 'valid';
  }
}

export function createRecordingValidator(config?: Partial<typeof VALIDATION_ORCHESTRATOR_CONFIG>): RecordingValidator {
  return new RecordingValidator(config);
}
