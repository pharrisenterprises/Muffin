/**
 * @fileoverview CDP Strategy Evaluator
 * @description Evaluates CDP-based semantic strategies (role, text, label).
 * Highest confidence strategies using Chrome Accessibility Tree.
 * 
 * @module services/strategies/CDPStrategy
 * @version 1.0.0
 * @since Phase 4
 */

import { CDPService, getCDPService } from '../CDPService';
import { AccessibilityService, getAccessibilityService } from '../AccessibilityService';
import { PlaywrightLocators, getPlaywrightLocators } from '../PlaywrightLocators';
import type { StrategyType, LocatorStrategy } from '../../../types/strategy';
import type { StrategyEvaluator, StrategyEvaluationResult } from './DOMStrategy';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CDPStrategyConfig {
  queryTimeout: number;
  exactMatch: boolean;
  includeHidden: boolean;
  minRoleConfidence: number;
  minTextConfidence: number;
}

const DEFAULT_CONFIG: CDPStrategyConfig = {
  queryTimeout: 5000,
  exactMatch: false,
  includeHidden: false,
  minRoleConfidence: 0.7,
  minTextConfidence: 0.6
};

export interface CDPSemanticMetadata {
  role: string;
  name?: string;
  exact?: boolean;
  states?: {
    checked?: boolean;
    disabled?: boolean;
    expanded?: boolean;
    pressed?: boolean;
    selected?: boolean;
  };
  level?: number;
}

export interface CDPPowerMetadata {
  text?: string;
  label?: string;
  placeholder?: string;
  testId?: string;
  altText?: string;
  title?: string;
  exact?: boolean;
}

export type CDPLocatorMethod =
  | 'getByRole'
  | 'getByText'
  | 'getByLabel'
  | 'getByPlaceholder'
  | 'getByTestId'
  | 'getByAltText'
  | 'getByTitle';

// ============================================================================
// CDP STRATEGY CLASS
// ============================================================================

export class CDPStrategy implements StrategyEvaluator {
  private _cdpService: CDPService;
  private _accessibilityService: AccessibilityService;
  private locators: PlaywrightLocators;
  private config: CDPStrategyConfig;

  readonly handledTypes: StrategyType[] = ['cdp_semantic', 'cdp_power'];

  constructor(
    cdpService: CDPService,
    accessibilityService: AccessibilityService,
    locators: PlaywrightLocators,
    config?: Partial<CDPStrategyConfig>
  ) {
    this._cdpService = cdpService;
    this._accessibilityService = accessibilityService;
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

    try {
      if (strategy.type === 'cdp_semantic') {
        return await this.evaluateSemantic(tabId, strategy, startTime);
      } else if (strategy.type === 'cdp_power') {
        return await this.evaluatePower(tabId, strategy, startTime);
      }

      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: `Unknown strategy type: ${strategy.type}`
      };
    } catch (error) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'CDP evaluation failed'
      };
    }
  }

  // ==========================================================================
  // SEMANTIC EVALUATION (getByRole)
  // ==========================================================================

  private async evaluateSemantic(
    tabId: number,
    strategy: LocatorStrategy,
    startTime: number
  ): Promise<StrategyEvaluationResult> {
    const metadata = strategy.metadata as CDPSemanticMetadata | undefined;

    if (!metadata?.role) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: 'CDP semantic requires role in metadata'
      };
    }

    const result = await this.locators.getByRole(tabId, metadata.role, {
      name: metadata.name,
      exact: metadata.exact ?? this.config.exactMatch,
      checked: metadata.states?.checked,
      disabled: metadata.states?.disabled,
      expanded: metadata.states?.expanded,
      pressed: metadata.states?.pressed,
      selected: metadata.states?.selected,
      level: metadata.level
    });

    if (result.found && result.backendNodeId) {
      const clickPoint = await this.locators.getClickPoint(tabId, result.backendNodeId);

      return {
        strategy,
        found: true,
        confidence: result.confidence,
        backendNodeId: result.backendNodeId,
        clickPoint: clickPoint ?? undefined,
        duration: Date.now() - startTime,
        metadata: { method: 'getByRole', role: metadata.role, name: metadata.name }
      };
    }

    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: `No element with role "${metadata.role}"${metadata.name ? ` and name "${metadata.name}"` : ''}`
    };
  }

  // ==========================================================================
  // POWER EVALUATION (getByText, getByLabel, etc.)
  // ==========================================================================

  private async evaluatePower(
    tabId: number,
    strategy: LocatorStrategy,
    startTime: number
  ): Promise<StrategyEvaluationResult> {
    const metadata = strategy.metadata as CDPPowerMetadata | undefined;

    if (!metadata) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: 'CDP power requires metadata'
      };
    }

    const exact = metadata.exact ?? this.config.exactMatch;

    // Try each method in priority order
    const methods: Array<{ method: CDPLocatorMethod; value: string | undefined }> = [
      { method: 'getByTestId', value: metadata.testId },
      { method: 'getByLabel', value: metadata.label },
      { method: 'getByPlaceholder', value: metadata.placeholder },
      { method: 'getByText', value: metadata.text },
      { method: 'getByAltText', value: metadata.altText },
      { method: 'getByTitle', value: metadata.title }
    ];

    for (const { method, value } of methods) {
      if (!value) continue;

      const result = await this.tryMethod(tabId, method, value, exact);
      if (result.found) {
        return {
          strategy,
          found: true,
          confidence: result.confidence,
          backendNodeId: result.backendNodeId,
          clickPoint: result.clickPoint,
          duration: Date.now() - startTime,
          metadata: { method, value }
        };
      }
    }

    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: 'No matching element found'
    };
  }

  private async tryMethod(
    tabId: number,
    method: CDPLocatorMethod,
    value: string,
    exact: boolean
  ): Promise<{
    found: boolean;
    confidence: number;
    backendNodeId?: number;
    clickPoint?: { x: number; y: number };
  }> {
    let result;

    switch (method) {
      case 'getByText':
        result = await this.locators.getByText(tabId, value, { exact });
        break;
      case 'getByLabel':
        result = await this.locators.getByLabel(tabId, value, { exact });
        break;
      case 'getByPlaceholder':
        result = await this.locators.getByPlaceholder(tabId, value, { exact });
        break;
      case 'getByTestId':
        result = await this.locators.getByTestId(tabId, value);
        break;
      case 'getByAltText':
        result = await this.locators.getByAltText(tabId, value, { exact });
        break;
      case 'getByTitle':
        result = await this.locators.getByTitle(tabId, value, { exact });
        break;
      default:
        return { found: false, confidence: 0 };
    }

    if (result.found && result.backendNodeId) {
      const clickPoint = await this.locators.getClickPoint(tabId, result.backendNodeId);
      return {
        found: true,
        confidence: result.confidence,
        backendNodeId: result.backendNodeId,
        clickPoint: clickPoint ?? undefined
      };
    }

    return { found: false, confidence: 0 };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: CDPStrategy | null = null;

export function getCDPStrategy(
  cdpService?: CDPService,
  accessibilityService?: AccessibilityService,
  locators?: PlaywrightLocators
): CDPStrategy {
  if (!instance) {
    const cdp = cdpService ?? getCDPService();
    const ax = accessibilityService ?? getAccessibilityService(cdp);
    const loc = locators ?? getPlaywrightLocators(cdp, ax);
    instance = new CDPStrategy(cdp, ax, loc);
  }
  return instance;
}
