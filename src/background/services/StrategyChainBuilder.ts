/**
 * @fileoverview Strategy Chain Builder
 * @description Constructs optimized FallbackChain objects from scored candidates.
 * Ensures diversity, removes duplicates, and enforces chain constraints.
 * 
 * @module services/StrategyChainBuilder
 * @version 1.0.0
 * @since Phase 4
 */

import type { StrategyType, LocatorStrategy, FallbackChain } from '../../types/strategy';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Strategy candidate (mirrors FallbackChainGenerator).
 */
export interface StrategyCandidate {
  type: StrategyType;
  selector?: string;
  metadata: Record<string, unknown>;
  source: 'dom' | 'vision' | 'mouse' | 'accessibility' | 'computed';
  rawConfidence: number;
}

/**
 * Chain builder configuration.
 */
export interface StrategyChainBuilderConfig {
  maxStrategies: number;
  minStrategies: number;
  ensureDiversity: boolean;
  minDiverseTypes: number;
  includeCoordinatesFallback: boolean;
  deduplicateSimilar: boolean;
  similarityThreshold: number;
}

const DEFAULT_CONFIG: StrategyChainBuilderConfig = {
  maxStrategies: 7,
  minStrategies: 2,
  ensureDiversity: true,
  minDiverseTypes: 3,
  includeCoordinatesFallback: true,
  deduplicateSimilar: true,
  similarityThreshold: 0.9
};

/**
 * Exclusion reason.
 */
export type ExclusionReason =
  | 'duplicate_selector'
  | 'similar_selector'
  | 'low_confidence'
  | 'max_strategies_reached'
  | 'type_already_covered'
  | 'invalid_candidate';

/**
 * Strategy category for diversity.
 */
export type StrategyCategory = 'semantic' | 'dom' | 'vision' | 'evidence' | 'coordinates';

/**
 * Chain build result.
 */
export interface ChainBuildResult {
  chain: FallbackChain;
  included: StrategyCandidate[];
  excluded: Array<{ candidate: StrategyCandidate; reason: ExclusionReason }>;
  metadata: {
    originalCount: number;
    finalCount: number;
    diversityScore: number;
    buildTime: number;
  };
}

/**
 * Optimization options.
 */
export interface OptimizationOptions {
  preferredTypes?: StrategyType[];
  requiredTypes?: StrategyType[];
  maxPerCategory?: number;
}

/**
 * Diversity analysis result.
 */
export interface DiversityAnalysis {
  categories: StrategyCategory[];
  categoryCount: Record<StrategyCategory, number>;
  score: number;
  missingCategories: StrategyCategory[];
  recommendations: string[];
}

// ============================================================================
// STRATEGY CHAIN BUILDER CLASS
// ============================================================================

export class StrategyChainBuilder {
  private config: StrategyChainBuilderConfig;

  constructor(config?: Partial<StrategyChainBuilderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // MAIN BUILD METHOD
  // ==========================================================================

  build(candidates: StrategyCandidate[], options?: OptimizationOptions): ChainBuildResult {
    const startTime = Date.now();
    const included: StrategyCandidate[] = [];
    const excluded: Array<{ candidate: StrategyCandidate; reason: ExclusionReason }> = [];

    // Sort by confidence (highest first)
    const sorted = [...candidates].sort((a, b) => b.rawConfidence - a.rawConfidence);

    // Track seen selectors for deduplication
    const seenSelectors = new Set<string>();
    const categoryCount: Record<StrategyCategory, number> = {
      semantic: 0,
      dom: 0,
      vision: 0,
      evidence: 0,
      coordinates: 0
    };

    // Process each candidate
    for (const candidate of sorted) {
      // Check max strategies
      if (included.length >= this.config.maxStrategies) {
        excluded.push({ candidate, reason: 'max_strategies_reached' });
        continue;
      }

      // Check for invalid candidate
      if (!this.isValidCandidate(candidate)) {
        excluded.push({ candidate, reason: 'invalid_candidate' });
        continue;
      }

      // Check for duplicate selector
      if (candidate.selector && seenSelectors.has(candidate.selector)) {
        excluded.push({ candidate, reason: 'duplicate_selector' });
        continue;
      }

      // Check for similar selector
      if (this.config.deduplicateSimilar && candidate.selector) {
        const isSimilar = this.hasSimilarSelector(candidate.selector, seenSelectors);
        if (isSimilar) {
          excluded.push({ candidate, reason: 'similar_selector' });
          continue;
        }
      }

      // Check diversity constraints
      const category = this.getCategory(candidate.type);
      const maxPerCategory = options?.maxPerCategory ?? 2;
      if (this.config.ensureDiversity && categoryCount[category] >= maxPerCategory) {
        // Allow if we don't have minimum diversity yet
        const uniqueCategories = Object.values(categoryCount).filter(c => c > 0).length;
        if (uniqueCategories >= this.config.minDiverseTypes) {
          excluded.push({ candidate, reason: 'type_already_covered' });
          continue;
        }
      }

      // Include the candidate
      included.push(candidate);
      if (candidate.selector) {
        seenSelectors.add(candidate.selector);
      }
      categoryCount[category]++;
    }

    // Ensure coordinates fallback is included
    if (this.config.includeCoordinatesFallback) {
      const hasCoordinates = included.some(c => c.type === 'coordinates');
      if (!hasCoordinates) {
        const coordsCandidate = candidates.find(c => c.type === 'coordinates');
        if (coordsCandidate && included.length < this.config.maxStrategies) {
          included.push(coordsCandidate);
          categoryCount.coordinates++;
        }
      }
    }

    // Build the chain
    const strategies = included.map(c => this.candidateToStrategy(c));
    const chain: FallbackChain = {
      strategies,
      primaryStrategy: strategies[0]?.type ?? 'dom_selector',
      recordedAt: Date.now()
    };

    return {
      chain,
      included,
      excluded,
      metadata: {
        originalCount: candidates.length,
        finalCount: included.length,
        diversityScore: this.calculateDiversityScore(categoryCount),
        buildTime: Date.now() - startTime
      }
    };
  }

  // ==========================================================================
  // DIVERSITY ANALYSIS
  // ==========================================================================

  analyzeDiversity(candidates: StrategyCandidate[]): DiversityAnalysis {
    const categoryCount: Record<StrategyCategory, number> = {
      semantic: 0,
      dom: 0,
      vision: 0,
      evidence: 0,
      coordinates: 0
    };

    for (const candidate of candidates) {
      const category = this.getCategory(candidate.type);
      categoryCount[category]++;
    }

    const categories = (Object.keys(categoryCount) as StrategyCategory[])
      .filter(cat => categoryCount[cat] > 0);

    const allCategories: StrategyCategory[] = ['semantic', 'dom', 'vision', 'evidence', 'coordinates'];
    const missingCategories = allCategories.filter(cat => categoryCount[cat] === 0);

    const recommendations: string[] = [];
    if (!categories.includes('semantic')) {
      recommendations.push('Add semantic (role/name) strategy for accessibility');
    }
    if (!categories.includes('coordinates')) {
      recommendations.push('Add coordinates fallback for last resort');
    }
    if (categories.length < 3) {
      recommendations.push('Increase diversity - aim for 3+ categories');
    }

    return {
      categories,
      categoryCount,
      score: this.calculateDiversityScore(categoryCount),
      missingCategories,
      recommendations
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private isValidCandidate(candidate: StrategyCandidate): boolean {
    if (!candidate.type) return false;
    if (candidate.rawConfidence < 0 || candidate.rawConfidence > 1) return false;
    return true;
  }

  private getCategory(type: StrategyType): StrategyCategory {
    switch (type) {
      case 'cdp_semantic':
      case 'cdp_power':
        return 'semantic';
      case 'dom_selector':
      case 'css_selector':
        return 'dom';
      case 'vision_ocr':
        return 'vision';
      case 'evidence_scoring':
        return 'evidence';
      case 'coordinates':
        return 'coordinates';
      default:
        return 'dom';
    }
  }

  private hasSimilarSelector(selector: string, existing: Set<string>): boolean {
    for (const seen of Array.from(existing)) {
      const similarity = this.calculateSimilarity(selector, seen);
      if (similarity >= this.config.similarityThreshold) {
        return true;
      }
    }
    return false;
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;

    // Simple Jaccard similarity on characters
    const setA = new Set(a.split(''));
    const setB = new Set(b.split(''));

    const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
    const union = new Set([...Array.from(setA), ...Array.from(setB)]);

    return intersection.size / union.size;
  }

  private calculateDiversityScore(categoryCount: Record<StrategyCategory, number>): number {
    const nonZeroCategories = Object.values(categoryCount).filter(c => c > 0).length;
    const totalCategories = Object.keys(categoryCount).length;

    // Base score from category coverage
    let score = nonZeroCategories / totalCategories;

    // Bonus for having semantic + dom + coordinates
    if (categoryCount.semantic > 0 && categoryCount.dom > 0 && categoryCount.coordinates > 0) {
      score = Math.min(score + 0.1, 1.0);
    }

    return Math.round(score * 100) / 100;
  }

  private candidateToStrategy(candidate: StrategyCandidate): LocatorStrategy {
    return {
      type: candidate.type,
      selector: candidate.selector,
      value: candidate.selector,
      confidence: candidate.rawConfidence,
      metadata: candidate.metadata
    };
  }

  // ==========================================================================
  // CHAIN OPTIMIZATION
  // ==========================================================================

  optimize(chain: FallbackChain, additionalCandidates?: StrategyCandidate[]): FallbackChain {
    // Convert existing strategies to candidates
    const existingCandidates: StrategyCandidate[] = chain.strategies.map(s => ({
      type: s.type,
      selector: s.selector,
      metadata: (s.metadata ?? {}) as Record<string, unknown>,
      source: 'computed' as const,
      rawConfidence: s.confidence
    }));

    // Combine with additional candidates
    const allCandidates = [...existingCandidates, ...(additionalCandidates ?? [])];

    // Rebuild with optimization
    const result = this.build(allCandidates);

    // Preserve original recordedAt
    return {
      ...result.chain,
      recordedAt: chain.recordedAt
    };
  }

  reorderByPreference(chain: FallbackChain, preferredTypes: StrategyType[]): FallbackChain {
    const strategies = [...chain.strategies];

    strategies.sort((a, b) => {
      const aIndex = preferredTypes.indexOf(a.type);
      const bIndex = preferredTypes.indexOf(b.type);

      // Preferred types come first
      if (aIndex !== -1 && bIndex === -1) return -1;
      if (aIndex === -1 && bIndex !== -1) return 1;
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;

      // Then by confidence
      return b.confidence - a.confidence;
    });

    return {
      ...chain,
      strategies,
      primaryStrategy: strategies[0]?.type ?? 'dom_selector'
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: StrategyChainBuilder | null = null;

export function getStrategyChainBuilder(
  config?: Partial<StrategyChainBuilderConfig>
): StrategyChainBuilder {
  if (!instance) {
    instance = new StrategyChainBuilder(config);
  }
  return instance;
}
