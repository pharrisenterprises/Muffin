/**
 * @fileoverview DOM Strategy Evaluator
 * @description Evaluates DOM-based locator strategies (CSS selectors, XPath)
 * during playback. Handles shadow DOM and calculates confidence.
 * 
 * @module services/strategies/DOMStrategy
 * @version 1.0.0
 * @since Phase 4
 */

import { CDPService, getCDPService } from '../CDPService';
import { PlaywrightLocators, getPlaywrightLocators } from '../PlaywrightLocators';
import { getAccessibilityService } from '../AccessibilityService';
import type { StrategyType, LocatorStrategy } from '../../../types/strategy';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * DOM strategy configuration.
 */
export interface DOMStrategyConfig {
  queryTimeout: number;
  validateSelector: boolean;
  traverseShadowDOM: boolean;
  maxUniquenessCheck: number;
  multipleMatchPenalty: number;
}

const DEFAULT_CONFIG: DOMStrategyConfig = {
  queryTimeout: 5000,
  validateSelector: true,
  traverseShadowDOM: true,
  maxUniquenessCheck: 10,
  multipleMatchPenalty: 0.2
};

/**
 * Strategy evaluation result.
 */
export interface StrategyEvaluationResult {
  strategy: LocatorStrategy;
  found: boolean;
  confidence: number;
  backendNodeId?: number;
  nodeId?: number;
  clickPoint?: { x: number; y: number };
  duration: number;
  matchCount?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Selector validation result.
 */
export interface SelectorValidation {
  valid: boolean;
  type: 'css' | 'xpath' | 'unknown';
  issues: string[];
  normalized: string;
}

/**
 * Strategy evaluator interface.
 */
export interface StrategyEvaluator {
  readonly handledTypes: StrategyType[];
  evaluate(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult>;
  handles(type: StrategyType): boolean;
}

// ============================================================================
// DOM STRATEGY CLASS
// ============================================================================

export class DOMStrategy implements StrategyEvaluator {
  private cdpService: CDPService;
  private locators: PlaywrightLocators;
  private config: DOMStrategyConfig;

  readonly handledTypes: StrategyType[] = ['dom_selector', 'css_selector'];

  constructor(
    cdpService: CDPService,
    locators: PlaywrightLocators,
    config?: Partial<DOMStrategyConfig>
  ) {
    this.cdpService = cdpService;
    this.locators = locators;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  handles(type: StrategyType): boolean {
    return this.handledTypes.includes(type);
  }

  // ==========================================================================
  // MAIN EVALUATION
  // ==========================================================================

  async evaluate(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult> {
    const startTime = Date.now();

    if (!strategy.selector) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: 'Strategy missing selector'
      };
    }

    if (this.config.validateSelector) {
      const validation = this.validateSelector(strategy.selector);
      if (!validation.valid) {
        return {
          strategy,
          found: false,
          confidence: 0,
          duration: Date.now() - startTime,
          error: `Invalid selector: ${validation.issues.join(', ')}`
        };
      }
    }

    if (this.isXPath(strategy.selector)) {
      return this.evaluateXPath(tabId, strategy.selector, strategy);
    } else {
      return this.evaluateCSSSelector(tabId, strategy.selector, strategy);
    }
  }

  // ==========================================================================
  // CSS SELECTOR EVALUATION
  // ==========================================================================

  async evaluateCSSSelector(
    tabId: number,
    selector: string,
    strategy: LocatorStrategy
  ): Promise<StrategyEvaluationResult> {
    const startTime = Date.now();
    const normalized = this.normalizeSelector(selector);

    try {
      const docResult = await this.cdpService.getDocument(tabId);
      if (!docResult.success || !docResult.result) {
        return {
          strategy,
          found: false,
          confidence: 0,
          duration: Date.now() - startTime,
          error: 'Failed to get document'
        };
      }

      const queryResult = await this.cdpService.querySelector(tabId, normalized, docResult.result.nodeId);

      if (!queryResult.success || !queryResult.result) {
        // Try shadow DOM
        if (this.config.traverseShadowDOM) {
          const shadowNodeId = await this.findInShadowDOM(tabId, normalized);
          if (shadowNodeId) {
            return this.buildSuccessResult(tabId, shadowNodeId, strategy, startTime, {
              foundInShadowDOM: true
            });
          }
        }

        return {
          strategy,
          found: false,
          confidence: 0,
          duration: Date.now() - startTime,
          error: 'Element not found'
        };
      }

      // Get match count for confidence
      const matchCount = await this.getMatchCount(tabId, normalized);
      const baseConfidence = strategy.confidence ?? 0.85;
      const confidence = this.calculateConfidence(matchCount, baseConfidence);

      // Get backend node ID
      const backendNodeId = await this.nodeIdToBackendNodeId(tabId, queryResult.result);

      return this.buildSuccessResult(tabId, queryResult.result, strategy, startTime, {
        matchCount,
        confidence,
        backendNodeId: backendNodeId ?? undefined
      });

    } catch (error) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'CSS evaluation failed'
      };
    }
  }

  // ==========================================================================
  // XPATH EVALUATION
  // ==========================================================================

  async evaluateXPath(
    tabId: number,
    xpath: string,
    strategy: LocatorStrategy
  ): Promise<StrategyEvaluationResult> {
    const startTime = Date.now();

    try {
      const nodeIds = await this.executeXPathQuery(tabId, xpath);

      if (nodeIds.length === 0) {
        return {
          strategy,
          found: false,
          confidence: 0,
          duration: Date.now() - startTime,
          error: 'XPath returned no results'
        };
      }

      const nodeId = nodeIds[0];
      const baseConfidence = strategy.confidence ?? 0.65;
      const confidence = this.calculateConfidence(nodeIds.length, baseConfidence);

      const backendNodeId = await this.nodeIdToBackendNodeId(tabId, nodeId);

      return this.buildSuccessResult(tabId, nodeId, strategy, startTime, {
        matchCount: nodeIds.length,
        confidence,
        backendNodeId: backendNodeId ?? undefined,
        isXPath: true
      });

    } catch (error) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'XPath evaluation failed'
      };
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  validateSelector(selector: string): SelectorValidation {
    const issues: string[] = [];
    let type: 'css' | 'xpath' | 'unknown' = 'css';

    if (this.isXPath(selector)) {
      type = 'xpath';
      // Basic XPath validation
      if (!selector.startsWith('/') && !selector.startsWith('(')) {
        issues.push('XPath must start with / or (');
      }
    } else {
      // Basic CSS validation
      try {
        // Test if it's a valid selector (browser will throw if invalid)
        if (typeof document !== 'undefined') {
          document.createElement('div').querySelector(selector);
        }
      } catch {
        issues.push('Invalid CSS selector syntax');
      }
    }

    return {
      valid: issues.length === 0,
      type,
      issues,
      normalized: this.normalizeSelector(selector)
    };
  }

  isXPath(selector: string): boolean {
    return selector.startsWith('/') || selector.startsWith('(//') || selector.startsWith('//');
  }

  async getMatchCount(tabId: number, selector: string): Promise<number> {
    try {
      const docResult = await this.cdpService.getDocument(tabId);
      if (!docResult.success || !docResult.result) return 0;

      const queryAllResult = await this.cdpService.querySelectorAll(
        tabId,
        selector,
        docResult.result.nodeId
      );

      if (queryAllResult.success && queryAllResult.result) {
        return Math.min(queryAllResult.result.length, this.config.maxUniquenessCheck);
      }

      return 0;
    } catch {
      return 0;
    }
  }

  calculateConfidence(matchCount: number, baseConfidence: number): number {
    if (matchCount === 0) return 0;
    if (matchCount === 1) return baseConfidence;

    // Apply penalty for multiple matches
    const penalty = (matchCount - 1) * this.config.multipleMatchPenalty;
    return Math.max(0.3, baseConfidence - penalty);
  }

  async findInShadowDOM(tabId: number, selector: string): Promise<number | null> {
    try {
      // Use locators which handle shadow DOM
      const result = await this.locators.locator(tabId, selector);
      if (result.found && result.backendNodeId) {
        return result.backendNodeId;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getClickPoint(tabId: number, nodeId: number): Promise<{ x: number; y: number } | null> {
    try {
      const boxResult = await this.cdpService.getBoxModel(tabId, nodeId);
      if (boxResult.success && boxResult.result?.content) {
        const [x1, y1, x2, , , , _x4, y4] = boxResult.result.content;
        return {
          x: (x1 + x2) / 2,
          y: (y1 + y4) / 2
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private normalizeSelector(selector: string): string {
    return selector.trim();
  }

  private async executeXPathQuery(tabId: number, xpath: string): Promise<number[]> {
    const docResult = await this.cdpService.getDocument(tabId);
    if (!docResult.success || !docResult.result) return [];

    // Use DOM.performSearch for XPath
    const searchResult = await this.cdpService.sendCommand<{
      searchId: string;
      resultCount: number;
    }>(tabId, 'DOM.performSearch', {
      query: xpath,
      includeUserAgentShadowDOM: this.config.traverseShadowDOM
    });

    if (!searchResult.success || !searchResult.result || searchResult.result.resultCount === 0) {
      return [];
    }

    // Get search results
    const resultsResult = await this.cdpService.sendCommand<{ nodeIds: number[] }>(
      tabId,
      'DOM.getSearchResults',
      {
        searchId: searchResult.result.searchId,
        fromIndex: 0,
        toIndex: Math.min(searchResult.result.resultCount, this.config.maxUniquenessCheck)
      }
    );

    // Discard search
    await this.cdpService.sendCommand(tabId, 'DOM.discardSearchResults', {
      searchId: searchResult.result.searchId
    });

    return resultsResult.result?.nodeIds ?? [];
  }

  private async nodeIdToBackendNodeId(tabId: number, nodeId: number): Promise<number | null> {
    try {
      const descResult = await this.cdpService.sendCommand<{ node: { backendNodeId: number } }>(
        tabId,
        'DOM.describeNode',
        { nodeId, depth: 0 }
      );

      return descResult.result?.node?.backendNodeId ?? null;
    } catch {
      return null;
    }
  }

  private async buildSuccessResult(
    tabId: number,
    nodeId: number,
    strategy: LocatorStrategy,
    startTime: number,
    extra: {
      matchCount?: number;
      confidence?: number;
      backendNodeId?: number;
      foundInShadowDOM?: boolean;
      isXPath?: boolean;
    }
  ): Promise<StrategyEvaluationResult> {
    const clickPoint = await this.getClickPoint(tabId, nodeId);
    const backendNodeId = extra.backendNodeId ?? await this.nodeIdToBackendNodeId(tabId, nodeId);

    return {
      strategy,
      found: true,
      confidence: extra.confidence ?? strategy.confidence ?? 0.85,
      backendNodeId: backendNodeId ?? undefined,
      nodeId,
      clickPoint: clickPoint ?? undefined,
      duration: Date.now() - startTime,
      matchCount: extra.matchCount,
      metadata: {
        foundInShadowDOM: extra.foundInShadowDOM,
        isXPath: extra.isXPath
      }
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: DOMStrategy | null = null;

export function getDOMStrategy(
  cdpService?: CDPService,
  locators?: PlaywrightLocators
): DOMStrategy {
  if (!instance) {
    const cdp = cdpService ?? getCDPService();
    const accessibility = getAccessibilityService(cdp);
    const loc = locators ?? getPlaywrightLocators(cdp, accessibility);
    instance = new DOMStrategy(cdp, loc);
  }
  return instance;
}
