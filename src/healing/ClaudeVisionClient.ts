// ═══════════════════════════════════════════════════════════════════════════
// CLAUDE VISION CLIENT - API Integration (Expansion Ready)
// ═══════════════════════════════════════════════════════════════════════════
// Claude Vision API integration for AI-powered element finding
// Disabled by default - enable when API key is configured

import {
  IVisionProvider,
  VisionAnalysisContext,
  VisionAnalysisResult,
  ClaudeVisionConfig,
  ClaudeVisionRequest,
  ClaudeVisionResponse,
  ClaudeVisionElementResult,
  RateLimiterState,
  CircuitBreakerState
} from './types';
import { ScreenshotCapture } from '../validation/types';
import {
  DEFAULT_CLAUDE_VISION_CONFIG,
  CLAUDE_VISION_PROMPT_TEMPLATE,
  DEFAULT_RATE_LIMIT_CONFIG
} from './config';

/**
 * ClaudeVisionClient - Claude Vision API integration
 * 
 * IMPLEMENTS IVisionProvider:
 * - isAvailable() - checks if API is configured and circuit is closed
 * - analyzeScreenshot() - sends screenshot to Claude for analysis
 * 
 * FEATURES:
 * - Rate limiting (50 calls/minute)
 * - Circuit breaker (opens after 3 failures)
 * - Retry with exponential backoff
 * - Cost tracking
 * 
 * EXPANSION READY:
 * - Disabled by default (no API key)
 * - Enable by setting config.enabled = true and providing API key
 * - Integrates with ValidationOrchestrator via IVisionProvider
 */
export class ClaudeVisionClient implements IVisionProvider {
  name = 'claude-vision';
  
  private config: ClaudeVisionConfig;
  private apiKey?: string;
  
  // Rate limiting
  private rateLimiter: RateLimiterState;
  
  // Circuit breaker
  private circuitBreaker: CircuitBreakerState;
  
  // Cost tracking
  private totalCost: number = 0;
  
  constructor(config?: Partial<ClaudeVisionConfig>, apiKey?: string) {
    this.config = { ...DEFAULT_CLAUDE_VISION_CONFIG, ...config };
    this.apiKey = apiKey;
    
    // Initialize rate limiter
    this.rateLimiter = {
      requestsInWindow: 0,
      windowStart: Date.now(),
      windowDuration: DEFAULT_RATE_LIMIT_CONFIG.windowDurationMs,
      maxRequests: DEFAULT_RATE_LIMIT_CONFIG.maxCallsPerWindow,
      currentWaitTime: 0
    };
    
    // Initialize circuit breaker
    this.circuitBreaker = {
      state: 'closed',
      failureCount: 0,
      failureThreshold: DEFAULT_RATE_LIMIT_CONFIG.circuitBreakerThreshold,
      openDuration: DEFAULT_RATE_LIMIT_CONFIG.circuitBreakerDurationMs
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // IVisionProvider Implementation
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Check if Claude Vision API is available
   */
  async isAvailable(): Promise<boolean> {
    // Check if enabled
    if (!this.config.enabled) return false;
    
    // Check if API key is set
    if (!this.apiKey) return false;
    
    // Check circuit breaker
    if (this.circuitBreaker.state === 'open') {
      // Check if should transition to half-open
      if (this.circuitBreaker.openedAt) {
        const elapsed = Date.now() - this.circuitBreaker.openedAt;
        if (elapsed >= this.circuitBreaker.openDuration) {
          this.circuitBreaker.state = 'half-open';
          return true;
        }
      }
      return false;
    }
    
    // Check rate limit
    if (this.isRateLimited()) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Analyze screenshot to find element
   */
  async analyzeScreenshot(
    screenshot: ScreenshotCapture,
    context: VisionAnalysisContext
  ): Promise<VisionAnalysisResult> {
    
    try {
      // Check availability
      if (!await this.isAvailable()) {
        return {
          found: false,
          confidence: 0,
          reasoning: 'Claude Vision API not available'
        };
      }
      
      // Build request
      const request = this.buildRequest(screenshot, context);
      
      // Make API call with retry
      const response = await this.callAPI(request);
      
      // Parse response
      const result = this.parseResponse(response);
      
      // Record success
      this.recordSuccess();
      
      // Track cost
      this.totalCost += this.config.costPerRequest;
      
      // Convert to VisionAnalysisResult
      if (result.found) {
        return {
          found: true,
          suggestedSelector: result.suggested_selectors?.[0],
          confidence: result.confidence / 100, // Convert 0-100 to 0-1
          reasoning: result.reasoning,
          alternatives: result.suggested_selectors?.slice(1).map(s => ({
            selector: s,
            confidence: (result.confidence - 10) / 100
          }))
        };
      }
      
      return {
        found: false,
        confidence: 0,
        reasoning: result.reasoning || 'Element not found in screenshot'
      };
    } catch (error) {
      // Record failure
      this.recordFailure();
      
      return {
        found: false,
        confidence: 0,
        reasoning: `Claude Vision API error: ${error}`
      };
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Set API key (for runtime configuration)
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  /**
   * Enable/disable the client
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
  
  /**
   * Get total API cost
   */
  getTotalCost(): number {
    return this.totalCost;
  }
  
  /**
   * Get rate limiter state
   */
  getRateLimiterState(): RateLimiterState {
    return { ...this.rateLimiter };
  }
  
  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }
  
  /**
   * Reset circuit breaker (manual intervention)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      state: 'closed',
      failureCount: 0,
      failureThreshold: DEFAULT_RATE_LIMIT_CONFIG.circuitBreakerThreshold,
      openDuration: DEFAULT_RATE_LIMIT_CONFIG.circuitBreakerDurationMs
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Build API request
   */
  private buildRequest(
    screenshot: ScreenshotCapture,
    context: VisionAnalysisContext
  ): ClaudeVisionRequest {
    // Build prompt from template
    const prompt = CLAUDE_VISION_PROMPT_TEMPLATE
      .replace('{{action}}', context.elementType)
      .replace('{{selector}}', context.hints?.[2] || 'unknown')
      .replace('{{elementType}}', this.getElementTypeHint(context.elementType))
      .replace('{{label}}', context.targetLabel)
      .replace('{{position}}', context.expectedBounds
        ? `x:${context.expectedBounds.x}, y:${context.expectedBounds.y}`
        : 'unknown'
      );
    
    return {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshot.imageData
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }]
    };
  }
  
  /**
   * Call Claude API with retry
   */
  private async callAPI(request: ClaudeVisionRequest): Promise<ClaudeVisionResponse> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
      try {
        // Update rate limiter
        this.incrementRateLimit();
        
        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey!,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.config.timeoutMs)
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json() as ClaudeVisionResponse;
      } catch (error) {
        lastError = error as Error;
        
        // Wait before retry
        if (attempt < this.config.retryCount) {
          await this.sleep(this.config.retryDelayMs * (attempt + 1));
        }
      }
    }
    
    throw lastError || new Error('API call failed');
  }
  
  /**
   * Parse API response
   */
  private parseResponse(response: ClaudeVisionResponse): ClaudeVisionElementResult {
    try {
      const text = response.content[0]?.text || '';
      
      // Clean up response (remove markdown if present)
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      return JSON.parse(cleanedText) as ClaudeVisionElementResult;
    } catch (error) {
      return {
        found: false,
        confidence: 0,
        reasoning: `Failed to parse API response: ${error}`
      };
    }
  }
  
  /**
   * Get element type hint for prompt
   */
  private getElementTypeHint(actionType: string): string {
    const hints: Record<string, string> = {
      'click': 'button or link',
      'input': 'input field or textarea',
      'select': 'dropdown or select',
      'hover': 'any interactive element',
      'keydown': 'input field'
    };
    
    return hints[actionType] || 'interactive element';
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // RATE LIMITING
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Check if currently rate limited
   */
  private isRateLimited(): boolean {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.rateLimiter.windowStart >= this.rateLimiter.windowDuration) {
      this.rateLimiter.windowStart = now;
      this.rateLimiter.requestsInWindow = 0;
    }
    
    return this.rateLimiter.requestsInWindow >= this.rateLimiter.maxRequests;
  }
  
  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(): void {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.rateLimiter.windowStart >= this.rateLimiter.windowDuration) {
      this.rateLimiter.windowStart = now;
      this.rateLimiter.requestsInWindow = 0;
    }
    
    this.rateLimiter.requestsInWindow++;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CIRCUIT BREAKER
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Record successful API call
   */
  private recordSuccess(): void {
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastSuccessTime = Date.now();
    
    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed';
    }
  }
  
  /**
   * Record failed API call
   */
  private recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'open';
      this.circuitBreaker.openedAt = Date.now();
    }
  }
  
  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create ClaudeVisionClient instance
 * @param config Optional configuration
 * @param apiKey Optional API key
 * @returns Configured client instance
 */
export function createClaudeVisionClient(
  config?: Partial<ClaudeVisionConfig>,
  apiKey?: string
): ClaudeVisionClient {
  return new ClaudeVisionClient(config, apiKey);
}
