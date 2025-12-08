/**
 * @fileoverview Strategy Evaluators Barrel Export
 * @description Re-exports all strategy evaluators for DecisionEngine.
 * 
 * @module services/strategies
 * @version 1.0.0
 * @since Phase 4
 */

// ============================================================================
// STRATEGY EVALUATORS
// ============================================================================

export {
  DOMStrategy,
  getDOMStrategy,
  type DOMStrategyConfig,
  type StrategyEvaluationResult,
  type SelectorValidation,
  type StrategyEvaluator
} from './DOMStrategy';

export {
  CDPStrategy,
  getCDPStrategy,
  type CDPStrategyConfig,
  type CDPSemanticMetadata,
  type CDPPowerMetadata,
  type CDPLocatorMethod
} from './CDPStrategy';

export {
  VisionStrategy,
  getVisionStrategy,
  type VisionStrategyConfig,
  type VisionMetadata
} from './VisionStrategy';

export {
  CoordinatesStrategy,
  getCoordinatesStrategy,
  type CoordinatesStrategyConfig,
  type CoordinatesMetadata
} from './CoordinatesStrategy';

export {
  EvidenceScoring,
  getEvidenceScoring,
  type EvidenceScoringConfig,
  type EvidenceScoringMetadata
} from './EvidenceScoring';

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

import { CDPService, getCDPService } from '../CDPService';
import { AccessibilityService, getAccessibilityService } from '../AccessibilityService';
import { PlaywrightLocators, getPlaywrightLocators } from '../PlaywrightLocators';
import { VisionService, getVisionService } from '../VisionService';

import { DOMStrategy } from './DOMStrategy';
import { CDPStrategy } from './CDPStrategy';
import { VisionStrategy } from './VisionStrategy';
import { CoordinatesStrategy } from './CoordinatesStrategy';
import { EvidenceScoring } from './EvidenceScoring';
import type { StrategyEvaluator } from './DOMStrategy';

/**
 * Services required to create all strategy evaluators.
 */
export interface StrategyServices {
  cdpService: CDPService;
  accessibilityService: AccessibilityService;
  locators: PlaywrightLocators;
  visionService: VisionService;
}

/**
 * Create all strategy evaluators with shared services.
 * @param services - Optional services (created if not provided)
 * @returns Array of all strategy evaluators
 */
export function createAllStrategies(services?: Partial<StrategyServices>): StrategyEvaluator[] {
  const cdp = services?.cdpService ?? getCDPService();
  const ax = services?.accessibilityService ?? getAccessibilityService(cdp);
  const locators = services?.locators ?? getPlaywrightLocators(cdp, ax);
  const vision = services?.visionService ?? getVisionService();

  return [
    new DOMStrategy(cdp, locators),
    new CDPStrategy(cdp, ax, locators),
    new VisionStrategy(vision),
    new CoordinatesStrategy(cdp),
    new EvidenceScoring(cdp)
  ];
}

/**
 * Get strategy evaluator by type.
 * @param type - Strategy type
 * @param evaluators - Array of evaluators
 * @returns Matching evaluator or undefined
 */
export function getEvaluatorForType(
  type: string,
  evaluators: StrategyEvaluator[]
): StrategyEvaluator | undefined {
  return evaluators.find(e => e.handles(type as any));
}
