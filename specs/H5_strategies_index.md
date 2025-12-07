# Strategies Index Specification

**File ID:** H5  
**File Path:** `src/background/services/strategies/index.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Central export file for all strategy evaluator modules. Provides a single import point for DOMStrategy, CDPStrategy, VisionStrategy, CoordinatesStrategy, and EvidenceScoring. Defines the StrategyEvaluator interface and provides factory functions for creating evaluator instances with proper dependency injection.

---

## Dependencies

### Exports (from)
- `./DOMStrategy`: DOMStrategy class
- `./CDPStrategy`: CDPStrategy class
- `./VisionStrategy`: VisionStrategy class
- `./CoordinatesStrategy`: CoordinatesStrategy class
- `./EvidenceScoring`: EvidenceScoring class

### Used By (imports to)
- `../DecisionEngine`: Strategy evaluation
- `../services/index.ts`: Re-export

---

## Complete Implementation

```typescript
/**
 * ============================================================================
 * STRATEGY EVALUATOR INTERFACE
 * ============================================================================
 */

import { StrategyType, LocatorStrategy, StrategyEvaluationResult } from '../../../types/strategy';

/**
 * Common interface for all strategy evaluators
 */
export interface StrategyEvaluator {
  /**
   * Strategy types this evaluator handles
   */
  readonly handledTypes: StrategyType[];

  /**
   * Check if this evaluator handles the given strategy type
   */
  handles(type: StrategyType): boolean;

  /**
   * Evaluate a strategy and attempt to locate the element
   * @param tabId - Chrome tab ID
   * @param strategy - Strategy to evaluate
   * @returns Evaluation result with found status, confidence, and element info
   */
  evaluate(
    tabId: number,
    strategy: LocatorStrategy
  ): Promise<StrategyEvaluationResult>;
}

/**
 * ============================================================================
 * STRATEGY EVALUATOR EXPORTS
 * ============================================================================
 */

// DOM-based strategies
export { DOMStrategy } from './DOMStrategy';
export type { DOMStrategyConfig } from './DOMStrategy';

// CDP-based strategies (semantic and power locators)
export { CDPStrategy } from './CDPStrategy';
export type { CDPStrategyConfig } from './CDPStrategy';

// Vision-based strategies (OCR)
export { VisionStrategy } from './VisionStrategy';
export type { VisionStrategyConfig } from './VisionStrategy';

// Coordinates-based strategies (fallback)
export { CoordinatesStrategy } from './CoordinatesStrategy';
export type { CoordinatesStrategyConfig } from './CoordinatesStrategy';

// Evidence scoring strategy
export { EvidenceScoring } from './EvidenceScoring';
export type { EvidenceScoringConfig } from './EvidenceScoring';

/**
 * ============================================================================
 * STRATEGY FACTORY
 * ============================================================================
 */

import { DOMStrategy } from './DOMStrategy';
import { CDPStrategy } from './CDPStrategy';
import { VisionStrategy } from './VisionStrategy';
import { CoordinatesStrategy } from './CoordinatesStrategy';
import { EvidenceScoring } from './EvidenceScoring';

import { CDPService } from '../CDPService';
import { AccessibilityService } from '../AccessibilityService';
import { PlaywrightLocators } from '../PlaywrightLocators';
import { VisionService } from '../VisionService';

/**
 * Strategy evaluator instances container
 */
export interface StrategyEvaluators {
  dom: DOMStrategy;
  cdp: CDPStrategy;
  vision: VisionStrategy;
  coordinates: CoordinatesStrategy;
  evidence: EvidenceScoring;
}

/**
 * Dependencies required for strategy creation
 */
export interface StrategyDependencies {
  cdpService: CDPService;
  accessibilityService: AccessibilityService;
  playwrightLocators: PlaywrightLocators;
  visionService: VisionService;
}

/**
 * Strategy factory configuration
 */
export interface StrategyFactoryConfig {
  /** DOM strategy config */
  dom?: Partial<DOMStrategyConfig>;
  /** CDP strategy config */
  cdp?: Partial<CDPStrategyConfig>;
  /** Vision strategy config */
  vision?: Partial<VisionStrategyConfig>;
  /** Coordinates strategy config */
  coordinates?: Partial<CoordinatesStrategyConfig>;
  /** Evidence scoring config */
  evidence?: Partial<EvidenceScoringConfig>;
}

/**
 * Create all strategy evaluators with dependencies
 */
export function createStrategyEvaluators(
  deps: StrategyDependencies,
  config: StrategyFactoryConfig = {}
): StrategyEvaluators {
  return {
    dom: new DOMStrategy(deps.cdpService, config.dom),
    cdp: new CDPStrategy(
      deps.cdpService,
      deps.accessibilityService,
      deps.playwrightLocators,
      config.cdp
    ),
    vision: new VisionStrategy(deps.visionService, config.vision),
    coordinates: new CoordinatesStrategy(deps.cdpService, config.coordinates),
    evidence: new EvidenceScoring(deps.cdpService, config.evidence)
  };
}

/**
 * Get all evaluators as an array (for iteration)
 */
export function getEvaluatorsArray(evaluators: StrategyEvaluators): StrategyEvaluator[] {
  return [
    evaluators.dom,
    evaluators.cdp,
    evaluators.vision,
    evaluators.coordinates,
    evaluators.evidence
  ];
}

/**
 * Find evaluator that handles a specific strategy type
 */
export function findEvaluatorForType(
  evaluators: StrategyEvaluators,
  type: StrategyType
): StrategyEvaluator | null {
  const all = getEvaluatorsArray(evaluators);
  return all.find(e => e.handles(type)) || null;
}

/**
 * ============================================================================
 * STRATEGY TYPE MAPPINGS
 * ============================================================================
 */

/**
 * Map of strategy types to their evaluator keys
 */
export const STRATEGY_EVALUATOR_MAP: Record<StrategyType, keyof StrategyEvaluators> = {
  'cdp_semantic': 'cdp',
  'cdp_power': 'cdp',
  'dom_selector': 'dom',
  'evidence_scoring': 'evidence',
  'css_selector': 'dom',
  'vision_ocr': 'vision',
  'coordinates': 'coordinates'
};

/**
 * Get evaluator key for a strategy type
 */
export function getEvaluatorKey(type: StrategyType): keyof StrategyEvaluators {
  return STRATEGY_EVALUATOR_MAP[type];
}

/**
 * Get evaluator for a strategy type
 */
export function getEvaluatorForStrategy(
  evaluators: StrategyEvaluators,
  type: StrategyType
): StrategyEvaluator {
  const key = getEvaluatorKey(type);
  return evaluators[key];
}

/**
 * ============================================================================
 * EVALUATION HELPERS
 * ============================================================================
 */

/**
 * Evaluate a single strategy
 */
export async function evaluateStrategy(
  evaluators: StrategyEvaluators,
  tabId: number,
  strategy: LocatorStrategy
): Promise<StrategyEvaluationResult> {
  const evaluator = getEvaluatorForStrategy(evaluators, strategy.type);
  return evaluator.evaluate(tabId, strategy);
}

/**
 * Evaluate multiple strategies in sequence
 */
export async function evaluateStrategiesSequential(
  evaluators: StrategyEvaluators,
  tabId: number,
  strategies: LocatorStrategy[]
): Promise<StrategyEvaluationResult[]> {
  const results: StrategyEvaluationResult[] = [];

  for (const strategy of strategies) {
    const result = await evaluateStrategy(evaluators, tabId, strategy);
    results.push(result);

    // Stop on first success if desired
    // if (result.found) break;
  }

  return results;
}

/**
 * Evaluate multiple strategies in parallel
 */
export async function evaluateStrategiesParallel(
  evaluators: StrategyEvaluators,
  tabId: number,
  strategies: LocatorStrategy[]
): Promise<StrategyEvaluationResult[]> {
  const promises = strategies.map(strategy =>
    evaluateStrategy(evaluators, tabId, strategy)
  );

  return Promise.all(promises);
}

/**
 * Evaluate strategies with timeout
 */
export async function evaluateWithTimeout(
  evaluators: StrategyEvaluators,
  tabId: number,
  strategy: LocatorStrategy,
  timeoutMs: number
): Promise<StrategyEvaluationResult> {
  const timeoutPromise = new Promise<StrategyEvaluationResult>((_, reject) => {
    setTimeout(() => reject(new Error('Evaluation timeout')), timeoutMs);
  });

  try {
    return await Promise.race([
      evaluateStrategy(evaluators, tabId, strategy),
      timeoutPromise
    ]);
  } catch (error) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: timeoutMs,
      error: error instanceof Error ? error.message : 'Timeout'
    };
  }
}

/**
 * Find first successful strategy
 */
export async function findFirstSuccessful(
  evaluators: StrategyEvaluators,
  tabId: number,
  strategies: LocatorStrategy[],
  minConfidence: number = 0.5
): Promise<{
  result: StrategyEvaluationResult;
  index: number;
} | null> {
  for (let i = 0; i < strategies.length; i++) {
    const result = await evaluateStrategy(evaluators, tabId, strategies[i]);

    if (result.found && result.confidence >= minConfidence) {
      return { result, index: i };
    }
  }

  return null;
}

/**
 * ============================================================================
 * STRATEGY ORDERING
 * ============================================================================
 */

import { STRATEGY_WEIGHTS } from '../../../types/strategy';

/**
 * Sort strategies by weight (highest first)
 */
export function sortByWeight(strategies: LocatorStrategy[]): LocatorStrategy[] {
  return [...strategies].sort((a, b) => {
    const weightA = STRATEGY_WEIGHTS[a.type] || 0;
    const weightB = STRATEGY_WEIGHTS[b.type] || 0;
    return weightB - weightA;
  });
}

/**
 * Sort strategies by confidence (highest first)
 */
export function sortByConfidence(strategies: LocatorStrategy[]): LocatorStrategy[] {
  return [...strategies].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Sort strategies by combined score (weight * confidence)
 */
export function sortByCombinedScore(strategies: LocatorStrategy[]): LocatorStrategy[] {
  return [...strategies].sort((a, b) => {
    const scoreA = (STRATEGY_WEIGHTS[a.type] || 0) * a.confidence;
    const scoreB = (STRATEGY_WEIGHTS[b.type] || 0) * b.confidence;
    return scoreB - scoreA;
  });
}

/**
 * Group strategies by category
 */
export function groupByCategory(strategies: LocatorStrategy[]): Map<string, LocatorStrategy[]> {
  const groups = new Map<string, LocatorStrategy[]>();

  const categoryMap: Record<StrategyType, string> = {
    'cdp_semantic': 'semantic',
    'cdp_power': 'semantic',
    'dom_selector': 'dom',
    'css_selector': 'dom',
    'evidence_scoring': 'evidence',
    'vision_ocr': 'vision',
    'coordinates': 'coordinates'
  };

  for (const strategy of strategies) {
    const category = categoryMap[strategy.type] || 'other';
    const existing = groups.get(category) || [];
    existing.push(strategy);
    groups.set(category, existing);
  }

  return groups;
}

/**
 * ============================================================================
 * RESULT ANALYSIS
 * ============================================================================
 */

/**
 * Find best result from evaluation results
 */
export function findBestResult(
  results: StrategyEvaluationResult[]
): StrategyEvaluationResult | null {
  const found = results.filter(r => r.found);
  if (found.length === 0) return null;

  return found.reduce((best, current) => {
    const bestScore = (STRATEGY_WEIGHTS[best.strategy.type] || 0) * best.confidence;
    const currentScore = (STRATEGY_WEIGHTS[current.strategy.type] || 0) * current.confidence;
    return currentScore > bestScore ? current : best;
  });
}

/**
 * Calculate success rate from results
 */
export function calculateResultSuccessRate(results: StrategyEvaluationResult[]): number {
  if (results.length === 0) return 0;
  const successful = results.filter(r => r.found).length;
  return successful / results.length;
}

/**
 * Get average evaluation duration
 */
export function getAverageEvaluationDuration(results: StrategyEvaluationResult[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + r.duration, 0);
  return total / results.length;
}

/**
 * Get results summary
 */
export function getResultsSummary(results: StrategyEvaluationResult[]): {
  total: number;
  found: number;
  notFound: number;
  errors: number;
  averageDuration: number;
  bestResult: StrategyEvaluationResult | null;
} {
  return {
    total: results.length,
    found: results.filter(r => r.found).length,
    notFound: results.filter(r => !r.found && !r.error).length,
    errors: results.filter(r => !!r.error).length,
    averageDuration: getAverageEvaluationDuration(results),
    bestResult: findBestResult(results)
  };
}

/**
 * ============================================================================
 * TYPE RE-EXPORTS
 * ============================================================================
 */

export type {
  StrategyType,
  LocatorStrategy,
  StrategyEvaluationResult,
  StrategyMetadata
} from '../../../types/strategy';
```

---

## Usage Examples

### Create Evaluators
```typescript
import { createStrategyEvaluators, StrategyDependencies } from './strategies';

const deps: StrategyDependencies = {
  cdpService,
  accessibilityService,
  playwrightLocators,
  visionService
};

const evaluators = createStrategyEvaluators(deps, {
  vision: { confidenceThreshold: 70 }
});
```

### Evaluate Single Strategy
```typescript
import { evaluateStrategy } from './strategies';

const result = await evaluateStrategy(evaluators, tabId, strategy);

if (result.found) {
  console.log(`Found with confidence ${result.confidence}`);
  console.log(`Click point: ${result.clickPoint?.x}, ${result.clickPoint?.y}`);
}
```

### Evaluate Chain
```typescript
import { findFirstSuccessful, sortByWeight } from './strategies';

const sorted = sortByWeight(fallbackChain.strategies);
const success = await findFirstSuccessful(evaluators, tabId, sorted, 0.6);

if (success) {
  console.log(`Strategy ${success.result.strategy.type} succeeded at index ${success.index}`);
}
```

### Parallel Evaluation
```typescript
import { evaluateStrategiesParallel, findBestResult } from './strategies';

const results = await evaluateStrategiesParallel(evaluators, tabId, strategies);
const best = findBestResult(results);

if (best) {
  console.log(`Best strategy: ${best.strategy.type} with ${best.confidence}`);
}
```

---

## Strategy Type to Evaluator Mapping

| Strategy Type | Evaluator | Description |
|---------------|-----------|-------------|
| `cdp_semantic` | CDPStrategy | Accessibility-based locators |
| `cdp_power` | CDPStrategy | Playwright-style locators |
| `dom_selector` | DOMStrategy | DOM query selectors |
| `css_selector` | DOMStrategy | CSS selectors |
| `evidence_scoring` | EvidenceScoring | Mouse trail + attributes |
| `vision_ocr` | VisionStrategy | OCR text matching |
| `coordinates` | CoordinatesStrategy | X,Y fallback |

---

## Acceptance Criteria

- [ ] StrategyEvaluator interface defined
- [ ] All strategy evaluators exported
- [ ] createStrategyEvaluators() creates all instances
- [ ] getEvaluatorsArray() returns array
- [ ] findEvaluatorForType() finds correct evaluator
- [ ] STRATEGY_EVALUATOR_MAP complete
- [ ] evaluateStrategy() works correctly
- [ ] evaluateStrategiesSequential() evaluates in order
- [ ] evaluateStrategiesParallel() evaluates concurrently
- [ ] evaluateWithTimeout() respects timeout
- [ ] findFirstSuccessful() stops on success
- [ ] Sorting functions work correctly
- [ ] Result analysis functions work
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Unknown strategy type**: Return null from find
2. **All strategies fail**: Return null from findBest
3. **Timeout during evaluation**: Return error result
4. **Empty strategies array**: Handle gracefully
5. **Missing dependencies**: Throw at creation
6. **Concurrent evaluations**: No shared state issues
7. **Very long chain**: No stack overflow
8. **Evaluator throws**: Catch and return error
9. **Tab closed during eval**: CDP error handled
10. **Vision not initialized**: Graceful fallback

---

## Estimated Lines

300-350 lines
