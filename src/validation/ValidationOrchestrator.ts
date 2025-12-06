// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION ORCHESTRATOR - Master Coordinator
// ═══════════════════════════════════════════════════════════════════════════
// Coordinates all validation modules without confusion

import {
  StepValidationResult,
  PlaybackPlan,
  ScreenshotCapture,
  HealingCacheKey,
  CachedHealing,
  IVisionProvider,
  VisionAnalysisContext,
  VisionAnalysisResult
} from './types';
import { RecordedStep } from '../recording/types';
import { VisualContextValidator } from './VisualContextValidator';
import { RecordingValidator } from './RecordingValidator';
import { PostRecordingCorrector } from './PostRecordingCorrector';
import {
  VALIDATION_ORCHESTRATOR_CONFIG,
  DEFAULT_HEALING_CACHE_CONFIG
} from './config';

/**
 * ValidationOrchestrator - Master coordinator for all validation
 */
export class ValidationOrchestrator {
  private contextValidator: VisualContextValidator;
  private recordingValidator: RecordingValidator;
  private postCorrector: PostRecordingCorrector;
  
  private config: typeof VALIDATION_ORCHESTRATOR_CONFIG;
  private visionProvider?: IVisionProvider;
  private healingCache: Map<string, CachedHealing>;
  private cacheConfig: typeof DEFAULT_HEALING_CACHE_CONFIG;
  
  constructor(
    config?: Partial<typeof VALIDATION_ORCHESTRATOR_CONFIG>,
    visionProvider?: IVisionProvider
  ) {
    this.config = { ...VALIDATION_ORCHESTRATOR_CONFIG, ...config };
    this.cacheConfig = { ...DEFAULT_HEALING_CACHE_CONFIG };
    
    this.contextValidator = new VisualContextValidator();
    this.recordingValidator = new RecordingValidator(this.config);
    this.postCorrector = new PostRecordingCorrector(this.config.autoCorrectThreshold);
    
    this.visionProvider = visionProvider;
    this.healingCache = new Map();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // RECORDING-TIME VALIDATION
  // ─────────────────────────────────────────────────────────────────────────
  
  async validateDuringRecording(
    step: RecordedStep,
    element: HTMLElement
  ): Promise<StepValidationResult> {
    if (this.config.debugLogging) {
      console.log(`[ValidationOrchestrator] Validating step ${step.stepNumber}`);
    }
    
    const result = await this.recordingValidator.validateStep(step, element);
    
    if (result.visualContext.contextWarning) {
      console.warn(
        `[ValidationOrchestrator] Step ${step.stepNumber}: ${result.visualContext.contextWarning.message}`
      );
    }
    
    return result;
  }
  
  quickValidate(step: RecordedStep, element: HTMLElement): boolean {
    return this.recordingValidator.quickValidate(step, element);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // POST-RECORDING VALIDATION
  // ─────────────────────────────────────────────────────────────────────────
  
  async validateRecording(
    steps: RecordedStep[],
    projectId: string
  ): Promise<{
    validationResults: StepValidationResult[];
    correctedSteps: RecordedStep[];
    playbackPlan: PlaybackPlan;
    summary: {
      total: number;
      valid: number;
      corrected: number;
      needsReview: number;
      invalid: number;
      overallConfidence: number;
    };
  }> {
    if (this.config.debugLogging) {
      console.log(`[ValidationOrchestrator] Validating ${steps.length} steps`);
    }
    
    const validationResults = await this.recordingValidator.validateAllSteps(steps);
    const { correctedSteps, corrections } = this.postCorrector.correctLabels(steps, validationResults);
    
    if (this.config.debugLogging && corrections.length > 0) {
      console.log(`[ValidationOrchestrator] Applied ${corrections.length} corrections`);
    }
    
    const playbackPlan = this.postCorrector.generatePlaybackPlan(correctedSteps, validationResults, projectId);
    const summary = this.postCorrector.generateSummary(validationResults);
    
    return { validationResults, correctedSteps, playbackPlan, summary };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PLAYBACK-TIME VALIDATION
  // ─────────────────────────────────────────────────────────────────────────
  
  validateBeforeExecution(
    _step: RecordedStep,
    foundElement: HTMLElement
  ): { shouldExecute: boolean; reason: string; alternativeAction?: string } {
    const visualContext = this.contextValidator.validateContext(foundElement);
    
    if (visualContext.contextWarning?.type === 'terminal-vs-input') {
      return {
        shouldExecute: false,
        reason: 'Element appears to be terminal, not input field',
        alternativeAction: 'Wait for correct element or use manual selection'
      };
    }
    
    if (visualContext.contextWarning?.type === 'copilot-vs-editor') {
      return {
        shouldExecute: false,
        reason: 'Element appears to be Copilot prompt, not code editor',
        alternativeAction: 'Verify Copilot prompt location'
      };
    }
    
    if (visualContext.confidence < 0.5) {
      return {
        shouldExecute: false,
        reason: `Low context confidence: ${(visualContext.confidence * 100).toFixed(0)}%`,
        alternativeAction: 'Trigger AI healing or manual selection'
      };
    }
    
    return {
      shouldExecute: true,
      reason: `Context validated (${(visualContext.confidence * 100).toFixed(0)}% confidence)`
    };
  }
  
  checkHealingCache(step: RecordedStep): CachedHealing | undefined {
    const key = this.createCacheKey(step);
    const keyString = JSON.stringify(key);
    const cached = this.healingCache.get(keyString);
    
    if (!cached || Date.now() > cached.expiresAt) {
      if (cached) this.healingCache.delete(keyString);
      return undefined;
    }
    
    const successRate = cached.successCount / (cached.successCount + cached.failureCount);
    if (successRate < this.cacheConfig.minSuccessRate) {
      return undefined;
    }
    
    return cached;
  }
  
  addToHealingCache(step: RecordedStep, healedSelector: string, confidence: number): void {
    const key = this.createCacheKey(step);
    const keyString = JSON.stringify(key);
    const existing = this.healingCache.get(keyString);
    
    if (existing) {
      existing.successCount++;
      existing.expiresAt = Date.now() + this.cacheConfig.ttlMs;
    } else {
      const cached: CachedHealing = {
        key,
        originalSelector: step.selector || '',
        healedSelector,
        confidence,
        timestamp: Date.now(),
        successCount: 1,
        failureCount: 0,
        expiresAt: Date.now() + this.cacheConfig.ttlMs
      };
      this.healingCache.set(keyString, cached);
    }
    
    if (this.healingCache.size > this.cacheConfig.maxEntries) {
      this.evictOldestCacheEntry();
    }
  }
  
  recordHealingFailure(step: RecordedStep): void {
    const key = this.createCacheKey(step);
    const keyString = JSON.stringify(key);
    const existing = this.healingCache.get(keyString);
    if (existing) existing.failureCount++;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // VISION API
  // ─────────────────────────────────────────────────────────────────────────
  
  async requestVisionHealing(
    step: RecordedStep,
    screenshot: ScreenshotCapture
  ): Promise<VisionAnalysisResult | null> {
    if (!this.visionProvider) {
      if (this.config.debugLogging) {
        console.log('[ValidationOrchestrator] No vision provider configured');
      }
      return null;
    }
    
    const isAvailable = await this.visionProvider.isAvailable();
    if (!isAvailable) {
      if (this.config.debugLogging) {
        console.log('[ValidationOrchestrator] Vision provider not available');
      }
      return null;
    }
    
    const context: VisionAnalysisContext = {
      targetLabel: step.label,
      elementType: step.event,
      expectedBounds: step.bundle?.bounding,
      hints: [
        `Looking for: ${step.label}`,
        `Action type: ${step.event}`,
        `Original selector: ${step.selector}`
      ]
    };
    
    try {
      const result = await this.visionProvider.analyzeScreenshot(screenshot, context);
      
      if (result.found && result.suggestedSelector && result.confidence > 0.7) {
        this.addToHealingCache(step, result.suggestedSelector, result.confidence);
      }
      
      return result;
    } catch (error) {
      console.error('[ValidationOrchestrator] Vision healing failed:', error);
      return null;
    }
  }
  
  setVisionProvider(provider: IVisionProvider): void {
    this.visionProvider = provider;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────
  
  private createCacheKey(step: RecordedStep): HealingCacheKey {
    return {
      pageURLPattern: this.extractURLPattern(window.location.href),
      stepType: step.event,
      fieldLabel: step.label,
      selectorHash: this.hashString(step.selector || '')
    };
  }
  
  private extractURLPattern(url: string): string {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/');
      const normalizedParts = pathParts.map(part => {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) return '*';
        if (/^\d+$/.test(part)) return '*';
        return part;
      });
      return `${parsed.host}${normalizedParts.join('/')}`;
    } catch {
      return url;
    }
  }
  
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
  
  private evictOldestCacheEntry(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    
    for (const [key, value] of this.healingCache) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) this.healingCache.delete(oldestKey);
  }
  
  clearHealingCache(): void {
    this.healingCache.clear();
  }
  
  getHealingCacheStats() {
    let totalHits = 0;
    let totalMisses = 0;
    
    for (const cached of this.healingCache.values()) {
      totalHits += cached.successCount;
      totalMisses += cached.failureCount;
    }
    
    return { size: this.healingCache.size, hits: totalHits, misses: totalMisses };
  }
}

export function createValidationOrchestrator(
  config?: Partial<typeof VALIDATION_ORCHESTRATOR_CONFIG>,
  visionProvider?: IVisionProvider
): ValidationOrchestrator {
  return new ValidationOrchestrator(config, visionProvider);
}
