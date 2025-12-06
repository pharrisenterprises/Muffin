// ═══════════════════════════════════════════════════════════════════════════
// AI HEALER - Core Healing Engine
// ═══════════════════════════════════════════════════════════════════════════
// Orchestrates healing attempts across providers
// Determines action based on confidence thresholds

import {
  HealingRequest,
  HealingResponse,
  HealingAction,
  HealingProviderType,
  HealingOrchestratorConfig
} from './types';
import { RecordedStep } from '../recording/types';
import { HealingCache } from './HealingCache';
import { LocalVisionProvider } from './LocalVisionProvider';
import { ClaudeVisionClient } from './ClaudeVisionClient';
import { HealingLogger } from './HealingLogger';
import {
  DEFAULT_HEALING_ORCHESTRATOR_CONFIG,
  HEALING_PROVIDER_PRIORITY,
  HEALING_CONFIDENCE_THRESHOLDS
} from './config';

/**
 * AIHealer - Core healing engine
 * 
 * FLOW:
 * 1. Check cache for known healing
 * 2. Try local vision (pattern matching)
 * 3. Try Claude Vision API (if enabled)
 * 4. Apply based on confidence thresholds
 * 
 * INDEPENDENTLY WRAPPED:
 * - Coordinates providers but doesn't depend on their internals
 * - Clear interface for each provider
 * - Logging independent of healing logic
 */
export class AIHealer {
  private config: HealingOrchestratorConfig;
  
  // Providers
  private cache: HealingCache;
  private localVision: LocalVisionProvider;
  private claudeVision: ClaudeVisionClient;
  
  // Logger
  private logger: HealingLogger;
  
  constructor(
    config?: Partial<HealingOrchestratorConfig>,
    claudeApiKey?: string
  ) {
    this.config = { ...DEFAULT_HEALING_ORCHESTRATOR_CONFIG, ...config };
    
    // Initialize providers
    this.cache = new HealingCache(this.config.cache);
    this.localVision = new LocalVisionProvider();
    this.claudeVision = new ClaudeVisionClient(this.config.claudeVision, claudeApiKey);
    
    // Initialize logger
    this.logger = new HealingLogger();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Attempt to heal a failing step
   * @param request Healing request with step and screenshot
   * @returns Healing response with suggestion and action
   */
  async heal(request: HealingRequest): Promise<HealingResponse> {
    const startTime = Date.now();
    
    if (!this.config.enabled) {
      return this.createResponse(false, 'fallback', 0, 'Healing disabled', startTime);
    }
    
    // Extract cache key components
    const pageURLPattern = this.extractURLPattern(request.pageUrl);
    const selectorHash = this.hashString(request.step.selector || '');
    
    // Try providers in priority order
    for (const { provider, enabled } of HEALING_PROVIDER_PRIORITY) {
      if (!enabled(this.config)) continue;
      
      try {
        const result = await this.tryProvider(
          provider as HealingProviderType,
          request,
          pageURLPattern,
          selectorHash
        );
        
        if (result && result.success) {
          // Log successful healing
          await this.logAttempt(request, result, true);
          return result;
        }
      } catch (error) {
        if (this.config.debugLogging) {
          console.warn(`[AIHealer] Provider ${provider} failed:`, error);
        }
      }
    }
    
    // All providers failed
    const failedResponse = this.createResponse(
      false,
      'fallback',
      0,
      'All healing providers failed',
      startTime
    );
    
    await this.logAttempt(request, failedResponse, false);
    
    return failedResponse;
  }
  
  /**
   * Record healing result (success or failure)
   * Call this after attempting to use a healed selector
   */
  async recordResult(
    step: RecordedStep,
    _healedSelector: string,
    success: boolean
  ): Promise<void> {
    const pageURLPattern = this.extractURLPattern(window.location.href);
    const selectorHash = this.hashString(step.selector || '');
    const cacheKey = `${pageURLPattern}:${step.event}:${step.label}:${selectorHash}`;
    
    if (success) {
      await this.cache.recordSuccess(cacheKey);
    } else {
      await this.cache.recordFailure(cacheKey);
    }
  }
  
  /**
   * Set Claude Vision API key
   */
  setClaudeApiKey(apiKey: string): void {
    this.claudeVision.setApiKey(apiKey);
    this.claudeVision.setEnabled(true);
    this.config.claudeVisionEnabled = true;
  }
  
  /**
   * Get healing analytics
   */
  async getAnalytics(since?: number): Promise<ReturnType<HealingLogger['getAnalytics']>> {
    return this.logger.getAnalytics(since);
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<ReturnType<HealingCache['getStats']>> {
    return this.cache.getStats();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Try a specific healing provider
   */
  private async tryProvider(
    provider: HealingProviderType,
    request: HealingRequest,
    pageURLPattern: string,
    selectorHash: string
  ): Promise<HealingResponse | null> {
    const startTime = Date.now();
    
    switch (provider) {
      case 'cache':
        return this.tryCache(request, pageURLPattern, selectorHash, startTime);
      
      case 'local-vision':
        return this.tryLocalVision(request, startTime);
      
      case 'claude-vision':
        return this.tryClaudeVision(request, pageURLPattern, selectorHash, startTime);
      
      default:
        return null;
    }
  }
  
  /**
   * Try cache provider
   */
  private async tryCache(
    request: HealingRequest,
    pageURLPattern: string,
    selectorHash: string,
    startTime: number
  ): Promise<HealingResponse | null> {
    const cached = await this.cache.get(
      pageURLPattern,
      request.step.event,
      request.step.label,
      selectorHash
    );
    
    if (!cached) return null;
    
    return {
      success: true,
      provider: 'cache',
      suggestedSelector: cached.healedSelector,
      confidence: cached.confidence,
      reasoning: 'Using cached healing result',
      duration: Date.now() - startTime,
      action: this.determineAction(cached.confidence)
    };
  }
  
  /**
   * Try local vision provider
   */
  private async tryLocalVision(
    request: HealingRequest,
    startTime: number
  ): Promise<HealingResponse | null> {
    if (!await this.localVision.isAvailable()) return null;
    
    const result = await this.localVision.analyzeScreenshot(
      request.screenshot,
      {
        targetLabel: request.step.label,
        elementType: request.step.event,
        expectedBounds: request.step.bundle?.bounding
      }
    );
    
    if (!result.found) return null;
    
    const confidence = result.confidence;
    
    return {
      success: true,
      provider: 'local-vision',
      suggestedSelector: result.suggestedSelector,
      confidence,
      reasoning: result.reasoning,
      alternatives: result.alternatives,
      duration: Date.now() - startTime,
      action: this.determineAction(confidence)
    };
  }
  
  /**
   * Try Claude Vision provider
   */
  private async tryClaudeVision(
    request: HealingRequest,
    pageURLPattern: string,
    selectorHash: string,
    startTime: number
  ): Promise<HealingResponse | null> {
    if (!await this.claudeVision.isAvailable()) return null;
    
    const result = await this.claudeVision.analyzeScreenshot(
      request.screenshot,
      {
        targetLabel: request.step.label,
        elementType: request.step.event,
        expectedBounds: request.step.bundle?.bounding,
        hints: [
          `Looking for: ${request.step.label}`,
          `Action: ${request.step.event}`,
          `Original selector: ${request.step.selector}`
        ]
      }
    );
    
    if (!result.found) return null;
    
    const confidence = result.confidence;
    
    // Cache successful Claude result
    if (result.suggestedSelector) {
      await this.cache.set({
        pageURLPattern,
        stepType: request.step.event,
        fieldLabel: request.step.label,
        selectorHash,
        originalSelector: request.step.selector || '',
        healedSelector: result.suggestedSelector,
        confidence,
        provider: 'claude-vision',
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        successCount: 1,
        failureCount: 0,
        expiresAt: Date.now() + this.config.cache.ttlMs
      });
    }
    
    return {
      success: true,
      provider: 'claude-vision',
      suggestedSelector: result.suggestedSelector,
      confidence,
      reasoning: result.reasoning,
      alternatives: result.alternatives,
      duration: Date.now() - startTime,
      action: this.determineAction(confidence)
    };
  }
  
  /**
   * Determine action based on confidence
   */
  private determineAction(confidence: number): HealingAction {
    if (confidence >= this.config.confidenceThresholds.autoApply) {
      return 'auto-apply';
    }
    
    if (confidence >= this.config.confidenceThresholds.applyFlag) {
      return 'apply-flag';
    }
    
    if (confidence >= HEALING_CONFIDENCE_THRESHOLDS.MINIMUM) {
      return 'suggest-only';
    }
    
    return 'no-action';
  }
  
  /**
   * Create response object
   */
  private createResponse(
    success: boolean,
    provider: HealingProviderType,
    confidence: number,
    reasoning: string,
    startTime: number,
    selector?: string
  ): HealingResponse {
    return {
      success,
      provider,
      suggestedSelector: selector,
      confidence,
      reasoning,
      duration: Date.now() - startTime,
      action: success ? this.determineAction(confidence) : 'no-action'
    };
  }
  
  /**
   * Log healing attempt
   */
  private async logAttempt(
    request: HealingRequest,
    response: HealingResponse,
    success: boolean
  ): Promise<void> {
    await this.logger.log({
      stepNumber: request.step.stepNumber,
      stepLabel: request.step.label,
      projectId: request.projectId,
      sessionId: request.sessionId,
      pageUrl: request.pageUrl,
      originalSelector: request.step.selector || '',
      healedSelector: response.suggestedSelector,
      provider: response.provider,
      success,
      confidence: response.confidence,
      action: response.action,
      reasoning: response.reasoning,
      duration: response.duration,
      error: response.error,
      timestamp: Date.now(),
      cacheHit: response.provider === 'cache',
      apiCost: response.provider === 'claude-vision' 
        ? this.config.claudeVision.costPerRequest 
        : undefined
    });
  }
  
  /**
   * Extract URL pattern (remove dynamic parts)
   */
  private extractURLPattern(url: string): string {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/');
      const normalizedParts = pathParts.map(part => {
        // Replace UUIDs, numbers
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
          return '*';
        }
        if (/^\d+$/.test(part)) {
          return '*';
        }
        return part;
      });
      
      return `${parsed.host}${normalizedParts.join('/')}`;
    } catch {
      return url;
    }
  }
  
  /**
   * Simple string hash
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create AIHealer instance
 * @param config Optional configuration
 * @param claudeApiKey Optional Claude API key
 * @returns Configured healer instance
 */
export function createAIHealer(
  config?: Partial<HealingOrchestratorConfig>,
  claudeApiKey?: string
): AIHealer {
  return new AIHealer(config, claudeApiKey);
}
