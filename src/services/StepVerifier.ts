/**
 * @fileoverview Step Verifier Service
 * @description Verifies that recorded steps have working strategies.
 * Tests each strategy in a step's fallback chain against the current page.
 * Flags steps that cannot be reliably replayed.
 * 
 * @module services/StepVerifier
 * @version 1.0.0
 * @since Phase 4
 */

import type { 
  StrategyType, 
  LocatorStrategy, 
  FallbackChain 
} from '../types/strategy';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result of verifying a single step
 */
export interface StepVerificationResult {
  /** Step identifier */
  stepId: string;
  
  /** Whether the step has at least one working strategy */
  verified: boolean;
  
  /** The best strategy that successfully found the element */
  workingStrategy?: LocatorStrategy;
  
  /** Confidence score of the working strategy (0-1) */
  confidence: number;
  
  /** All strategies tested and their results */
  strategyResults: StrategyTestResult[];
  
  /** If not verified, the reason why */
  failureReason?: string;
  
  /** Time taken to verify in milliseconds */
  verificationDuration: number;
}

/**
 * Result of testing a single strategy
 */
export interface StrategyTestResult {
  /** Strategy that was tested */
  strategy: LocatorStrategy;
  
  /** Whether the strategy found the element */
  found: boolean;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Time taken to test in milliseconds */
  duration: number;
  
  /** Error message if strategy failed */
  error?: string;
}

/**
 * Configuration for the verifier
 */
export interface StepVerifierConfig {
  /** Minimum confidence required to consider a step verified */
  minConfidence: number;
  
  /** Timeout for each strategy test in milliseconds */
  strategyTimeout: number;
  
  /** Maximum strategies to test per step */
  maxStrategiesToTest: number;
}

const DEFAULT_CONFIG: StepVerifierConfig = {
  minConfidence: 0.5,
  strategyTimeout: 5000,
  maxStrategiesToTest: 7
};

/**
 * Recorded step structure (matches what Recorder produces)
 */
export interface RecordedStep {
  id?: string;
  stepIndex?: number;
  event: string;
  label?: string;
  value?: string;
  fallbackChain?: FallbackChain;
  bundle?: {
    xpath?: string;
    id?: string;
    className?: string;
    aria?: string;
    coordinates?: { x: number; y: number };
    [key: string]: unknown;
  };
}

// ============================================================================
// STEP VERIFIER CLASS
// ============================================================================

export class StepVerifier {
  private config: StepVerifierConfig;
  
  constructor(config?: Partial<StepVerifierConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  // ==========================================================================
  // MAIN VERIFICATION
  // ==========================================================================
  
  /**
   * Verify a single step has working strategies
   * 
   * @param step - The recorded step to verify
   * @param tabId - Tab ID where the page is loaded
   * @returns Verification result
   */
  async verifyStep(step: RecordedStep, tabId: number): Promise<StepVerificationResult> {
    const startTime = Date.now();
    const stepId = step.id || `step_${step.stepIndex || 0}`;
    
    // Skip verification for navigation steps (open, navigate)
    if (step.event === 'open' || step.event === 'navigate') {
      return {
        stepId,
        verified: true,
        confidence: 1.0,
        strategyResults: [],
        verificationDuration: Date.now() - startTime
      };
    }
    
    // Get fallback chain or generate basic one from bundle
    const fallbackChain = step.fallbackChain || this.generateBasicFallbackChain(step);
    
    if (!fallbackChain || fallbackChain.strategies.length === 0) {
      return {
        stepId,
        verified: false,
        confidence: 0,
        strategyResults: [],
        failureReason: 'No strategies available for this step',
        verificationDuration: Date.now() - startTime
      };
    }
    
    // Test each strategy
    const strategyResults: StrategyTestResult[] = [];
    let bestResult: StrategyTestResult | null = null;
    
    const strategiesToTest = fallbackChain.strategies.slice(0, this.config.maxStrategiesToTest);
    
    for (const strategy of strategiesToTest) {
      const result = await this.testStrategy(strategy, tabId);
      strategyResults.push(result);
      
      // Track best result
      if (result.found && result.confidence >= this.config.minConfidence) {
        if (!bestResult || result.confidence > bestResult.confidence) {
          bestResult = result;
        }
      }
    }
    
    // Determine verification result
    const verified = bestResult !== null;
    
    return {
      stepId,
      verified,
      workingStrategy: bestResult?.strategy,
      confidence: bestResult?.confidence || 0,
      strategyResults,
      failureReason: verified ? undefined : this.determineFailureReason(strategyResults),
      verificationDuration: Date.now() - startTime
    };
  }
  
  /**
   * Verify multiple steps
   * 
   * @param steps - Array of recorded steps
   * @param tabId - Tab ID where the page is loaded
   * @param onProgress - Callback for progress updates
   * @returns Array of verification results
   */
  async verifyAllSteps(
    steps: RecordedStep[],
    tabId: number,
    onProgress?: (completed: number, total: number, current: StepVerificationResult) => void
  ): Promise<StepVerificationResult[]> {
    const results: StepVerificationResult[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      const result = await this.verifyStep(steps[i], tabId);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, steps.length, result);
      }
    }
    
    return results;
  }
  
  // ==========================================================================
  // STRATEGY TESTING
  // ==========================================================================
  
  /**
   * Test a single strategy against the page
   * Public for use by RepairOrchestrator
   */
  async testStrategy(strategy: LocatorStrategy, tabId: number): Promise<StrategyTestResult> {
    const startTime = Date.now();
    
    try {
      // Send message to background to test strategy using DecisionEngine
      const response = await this.sendTestStrategyMessage(tabId, strategy);
      
      return {
        strategy,
        found: response.found,
        confidence: response.confidence || 0,
        duration: Date.now() - startTime,
        error: response.error
      };
    } catch (error) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Strategy test failed'
      };
    }
  }
  
  /**
   * Send message to background script to test strategy
   */
  private sendTestStrategyMessage(
    tabId: number, 
    strategy: LocatorStrategy
  ): Promise<{ found: boolean; confidence?: number; error?: string }> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { 
          type: 'TEST_STRATEGY', 
          tabId, 
          strategy 
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ found: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { found: false });
          }
        }
      );
    });
  }
  
  // ==========================================================================
  // HELPERS
  // ==========================================================================
  
  /**
   * Generate a basic fallback chain from step bundle
   * Used when step doesn't have a pre-generated fallback chain
   */
  private generateBasicFallbackChain(step: RecordedStep): FallbackChain {
    const strategies: LocatorStrategy[] = [];
    const bundle = step.bundle || {};
    
    // ID selector
    if (bundle.id) {
      strategies.push({
        type: 'dom_selector' as StrategyType,
        selector: `#${bundle.id}`,
        confidence: 0.85
      });
    }
    
    // XPath
    if (bundle.xpath) {
      strategies.push({
        type: 'css_selector' as StrategyType,
        selector: bundle.xpath,
        confidence: 0.75
      });
    }
    
    // Aria label
    if (bundle.aria) {
      strategies.push({
        type: 'cdp_semantic' as StrategyType,
        selector: '',
        confidence: 0.80,
        metadata: { 
          role: 'button', // Default role, will be refined during execution
          name: bundle.aria 
        }
      });
    }
    
    // Coordinates (always available as last resort)
    if (bundle.coordinates) {
      strategies.push({
        type: 'coordinates' as StrategyType,
        selector: '',
        confidence: 0.60,
        metadata: bundle.coordinates
      });
    }
    
    return {
      strategies,
      primaryStrategy: strategies[0]?.type || 'coordinates',
      recordedAt: Date.now()
    };
  }
  
  /**
   * Determine why verification failed based on strategy results
   */
  private determineFailureReason(results: StrategyTestResult[]): string {
    if (results.length === 0) {
      return 'No strategies were available to test';
    }
    
    const allErrors = results.filter(r => r.error);
    if (allErrors.length === results.length) {
      return `All strategies errored: ${allErrors[0].error}`;
    }
    
    const lowConfidence = results.filter(r => r.found && r.confidence < this.config.minConfidence);
    if (lowConfidence.length > 0) {
      return `Best strategy confidence (${Math.max(...lowConfidence.map(r => r.confidence)).toFixed(2)}) below threshold (${this.config.minConfidence})`;
    }
    
    return 'No strategy could reliably locate the element';
  }
  
  /**
   * Get summary statistics for verification results
   */
  static getSummary(results: StepVerificationResult[]): {
    total: number;
    verified: number;
    flagged: number;
    verificationRate: number;
  } {
    const verified = results.filter(r => r.verified).length;
    return {
      total: results.length,
      verified,
      flagged: results.length - verified,
      verificationRate: results.length > 0 ? verified / results.length : 0
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: StepVerifier | null = null;

export function getStepVerifier(config?: Partial<StepVerifierConfig>): StepVerifier {
  if (!instance) {
    instance = new StepVerifier(config);
  }
  return instance;
}
