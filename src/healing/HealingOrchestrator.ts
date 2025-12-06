// ═══════════════════════════════════════════════════════════════════════════
// HEALING ORCHESTRATOR - Master Coordinator
// ═══════════════════════════════════════════════════════════════════════════
// Top-level coordinator for all healing operations
// Integrates with BATCH 7 ValidationOrchestrator

import {
  HealingRequest,
  HealingResponse,
  HealingOrchestratorConfig,
  HealingSessionState,
  HealingAnalytics
} from './types';
import { RecordedStep } from '../recording/types';
import { ScreenshotCapture } from '../validation/types';
import { AIHealer } from './AIHealer';
import { HealingCache } from './HealingCache';
import { HealingLogger } from './HealingLogger';
import { LocalVisionProvider } from './LocalVisionProvider';
import { ClaudeVisionClient } from './ClaudeVisionClient';
import { DEFAULT_HEALING_ORCHESTRATOR_CONFIG } from './config';
import { createScreenshotCapture } from '../validation/ScreenshotCapture';

/**
 * HealingOrchestrator - Master coordinator for healing system
 * 
 * RESPONSIBILITIES:
 * - Coordinate healing across all providers
 * - Manage healing sessions
 * - Track rate limiting and circuit breaker
 * - Provide unified API for playback engine
 * 
 * INTEGRATION:
 * - Works with ValidationOrchestrator from BATCH 7
 * - Provides IVisionProvider implementations
 * - Shares screenshot capture service
 */
export class HealingOrchestrator {
  private config: HealingOrchestratorConfig;
  
  // Core healer
  private healer: AIHealer;
  
  // Providers (for direct access)
  private localVision: LocalVisionProvider;
  private claudeVision: ClaudeVisionClient;
  
  // Services
  private cache: HealingCache;
  private logger: HealingLogger;
  private screenshotCapture: ReturnType<typeof createScreenshotCapture>;
  
  // Session state
  private session: HealingSessionState;
  
  constructor(
    config?: Partial<HealingOrchestratorConfig>,
    claudeApiKey?: string
  ) {
    this.config = { ...DEFAULT_HEALING_ORCHESTRATOR_CONFIG, ...config };
    
    // Initialize components
    this.healer = new AIHealer(this.config, claudeApiKey);
    this.localVision = new LocalVisionProvider();
    this.claudeVision = new ClaudeVisionClient(this.config.claudeVision, claudeApiKey);
    this.cache = new HealingCache(this.config.cache);
    this.logger = new HealingLogger();
    this.screenshotCapture = createScreenshotCapture();
    
    // Initialize session
    this.session = this.createSession();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API - Main Healing Interface
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Heal a failing step
   * Main entry point for playback engine
   * 
   * @param step The failing step
   * @param attemptedSelectors Selectors that were tried
   * @param element Optional - element if we have one
   * @returns Healing response with suggested fix
   */
  async healStep(
    step: RecordedStep,
    attemptedSelectors: Array<{ selector: string; strategy: string; error: string }>,
    element?: HTMLElement
  ): Promise<HealingResponse> {
    // Check if healing is enabled
    if (!this.config.enabled) {
      return {
        success: false,
        provider: 'fallback',
        confidence: 0,
        reasoning: 'Healing is disabled',
        duration: 0,
        action: 'no-action'
      };
    }
    
    // Check rate limiting
    if (this.isRateLimited()) {
      return {
        success: false,
        provider: 'fallback',
        confidence: 0,
        reasoning: 'Rate limit exceeded',
        duration: 0,
        action: 'no-action'
      };
    }
    
    // Check per-step attempt limit
    if (!this.canAttemptHealing(step.stepNumber)) {
      return {
        success: false,
        provider: 'fallback',
        confidence: 0,
        reasoning: 'Max healing attempts per step exceeded',
        duration: 0,
        action: 'no-action'
      };
    }
    
    // Capture screenshot
    let screenshot: ScreenshotCapture;
    try {
      if (element) {
        screenshot = await this.screenshotCapture.captureElement(element, step.stepNumber);
      } else {
        screenshot = await this.screenshotCapture.captureViewport(step.stepNumber);
      }
    } catch (error) {
      return {
        success: false,
        provider: 'fallback',
        confidence: 0,
        reasoning: `Screenshot capture failed: ${error}`,
        duration: 0,
        action: 'no-action'
      };
    }
    
    // Build healing request
    const request: HealingRequest = {
      step,
      screenshot,
      attemptedSelectors: attemptedSelectors.map(s => ({
        selector: s.selector,
        strategy: s.strategy,
        failureReason: s.error,
        duration: 0
      })),
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: Date.now(),
      sessionId: this.session.sessionId,
      projectId: (step as any).projectId
    };
    
    // Attempt healing
    const response = await this.healer.heal(request);
    
    // Update session stats
    this.session.attempts++;
    if (response.success) {
      this.session.successes++;
    }
    
    // Record attempt for per-step limiting
    this.recordAttempt(step.stepNumber);
    
    return response;
  }
  
  /**
   * Record healing result after use
   * Call this after trying to use a healed selector
   */
  async recordHealingResult(
    step: RecordedStep,
    healedSelector: string,
    success: boolean
  ): Promise<void> {
    await this.healer.recordResult(step, healedSelector, success);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API - Provider Access
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Get local vision provider (for ValidationOrchestrator)
   */
  getLocalVisionProvider(): LocalVisionProvider {
    return this.localVision;
  }
  
  /**
   * Get Claude vision provider (for ValidationOrchestrator)
   */
  getClaudeVisionProvider(): ClaudeVisionClient {
    return this.claudeVision;
  }
  
  /**
   * Set Claude API key
   */
  setClaudeApiKey(apiKey: string): void {
    this.healer.setClaudeApiKey(apiKey);
    this.claudeVision.setApiKey(apiKey);
    this.claudeVision.setEnabled(true);
    this.config.claudeVisionEnabled = true;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API - Analytics & Status
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Get healing analytics
   */
  async getAnalytics(since?: number): Promise<HealingAnalytics> {
    return this.healer.getAnalytics(since);
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    averageSuccessRate: number;
  }> {
    return this.healer.getCacheStats();
  }
  
  /**
   * Get session state
   */
  getSessionState(): HealingSessionState {
    return { ...this.session };
  }
  
  /**
   * Get rate limiter status
   */
  isRateLimited(): boolean {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.session.rateLimiter.windowStart >= this.session.rateLimiter.windowDuration) {
      this.session.rateLimiter.windowStart = now;
      this.session.rateLimiter.requestsInWindow = 0;
    }
    
    return this.session.rateLimiter.requestsInWindow >= this.session.rateLimiter.maxRequests;
  }
  
  /**
   * Get circuit breaker status
   */
  isCircuitOpen(): boolean {
    if (this.session.circuitBreaker.state !== 'open') {
      return false;
    }
    
    // Check if should transition to half-open
    if (this.session.circuitBreaker.openedAt) {
      const elapsed = Date.now() - this.session.circuitBreaker.openedAt;
      if (elapsed >= this.session.circuitBreaker.openDuration) {
        this.session.circuitBreaker.state = 'half-open';
        return false;
      }
    }
    
    return true;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API - Maintenance
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Clear healing cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }
  
  /**
   * Clean up expired cache entries
   */
  async cleanupCache(): Promise<number> {
    return this.cache.cleanup();
  }
  
  /**
   * Clear old logs
   */
  async clearOldLogs(olderThanDays: number): Promise<number> {
    const olderThan = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    return this.logger.clearOldLogs(olderThan);
  }
  
  /**
   * Reset session
   */
  resetSession(): void {
    this.session = this.createSession();
    this.stepAttempts.clear();
  }
  
  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.session.circuitBreaker.state = 'closed';
    this.session.circuitBreaker.failureCount = 0;
    this.claudeVision.resetCircuitBreaker();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  // Track attempts per step
  private stepAttempts: Map<number, number> = new Map();
  
  /**
   * Create new session
   */
  private createSession(): HealingSessionState {
    return {
      sessionId: this.generateSessionId(),
      attempts: 0,
      successes: 0,
      rateLimiter: {
        requestsInWindow: 0,
        windowStart: Date.now(),
        windowDuration: this.config.rateLimit.windowDurationMs,
        maxRequests: this.config.rateLimit.maxCallsPerWindow,
        currentWaitTime: 0
      },
      circuitBreaker: {
        state: 'closed',
        failureCount: 0,
        failureThreshold: this.config.rateLimit.circuitBreakerThreshold,
        openDuration: this.config.rateLimit.circuitBreakerDurationMs
      },
      startTime: Date.now()
    };
  }
  
  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `heal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Check if can attempt healing for step
   */
  private canAttemptHealing(stepNumber: number): boolean {
    const attempts = this.stepAttempts.get(stepNumber) || 0;
    return attempts < this.config.rateLimit.maxAttemptsPerStep;
  }
  
  /**
   * Record attempt for step
   */
  private recordAttempt(stepNumber: number): void {
    const current = this.stepAttempts.get(stepNumber) || 0;
    this.stepAttempts.set(stepNumber, current + 1);
    this.session.rateLimiter.requestsInWindow++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create HealingOrchestrator instance
 * @param config Optional configuration
 * @param claudeApiKey Optional Claude API key
 * @returns Configured orchestrator
 */
export function createHealingOrchestrator(
  config?: Partial<HealingOrchestratorConfig>,
  claudeApiKey?: string
): HealingOrchestrator {
  return new HealingOrchestrator(config, claudeApiKey);
}
