# StrategyChainBuilder Content Specification

**File ID:** C4  
**File Path:** `src/background/services/StrategyChainBuilder.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Constructs optimized FallbackChain objects from scored strategy candidates. Takes an array of scored candidates from StrategyScorer, removes duplicates, ensures diversity of strategy types, enforces maximum chain length, and produces a final FallbackChain ready for storage. Implements chain optimization rules to ensure effective fallback coverage across different strategy categories (semantic, DOM, vision, coordinates).

---

## Dependencies

### Uses (imports from)
- `../../types/strategy`: StrategyType, LocatorStrategy, FallbackChain
- `../FallbackChainGenerator`: StrategyCandidate

### Used By (exports to)
- `../FallbackChainGenerator`: Uses for chain construction

---

## Interfaces

```typescript
/**
 * Chain builder configuration
 */
interface StrategyChainBuilderConfig {
  /** Maximum strategies in chain (default: 7) */
  maxStrategies: number;
  /** Minimum strategies in chain (default: 2) */
  minStrategies: number;
  /** Whether to ensure strategy diversity (default: true) */
  ensureDiversity: boolean;
  /** Minimum different strategy types (default: 3) */
  minDiverseTypes: number;
  /** Whether to always include coordinates fallback (default: true) */
  includeCoordinatesFallback: boolean;
  /** Whether to deduplicate similar selectors (default: true) */
  deduplicateSimilar: boolean;
  /** Similarity threshold for deduplication (default: 0.9) */
  similarityThreshold: number;
}

/**
 * Chain building result
 */
interface ChainBuildResult {
  /** Built fallback chain */
  chain: FallbackChain;
  /** Strategies that were included */
  included: StrategyCandidate[];
  /** Strategies that were excluded */
  excluded: Array<{
    candidate: StrategyCandidate;
    reason: ExclusionReason;
  }>;
  /** Build metadata */
  metadata: {
    originalCount: number;
    finalCount: number;
    diversityScore: number;
    buildTime: number;
  };
}

/**
 * Reason for strategy exclusion
 */
type ExclusionReason =
  | 'duplicate_selector'
  | 'similar_selector'
  | 'low_confidence'
  | 'max_strategies_reached'
  | 'type_already_covered'
  | 'invalid_candidate';

/**
 * Strategy category for diversity
 */
type StrategyCategory = 'semantic' | 'dom' | 'vision' | 'evidence' | 'coordinates';

/**
 * Chain optimization options
 */
interface OptimizationOptions {
  /** Prefer certain strategy types */
  preferredTypes?: StrategyType[];
  /** Required strategy types */
  requiredTypes?: StrategyType[];
  /** Maximum per category */
  maxPerCategory?: number;
}

/**
 * Diversity analysis result
 */
interface DiversityAnalysis {
  /** Categories represented */
  categories: StrategyCategory[];
  /** Count per category */
  categoryCount: Record<StrategyCategory, number>;
  /** Diversity score (0-1) */
  score: number;
  /** Missing categories */
  missingCategories: StrategyCategory[];
  /** Recommendations */
  recommendations: string[];
}
```

---

## Functions

```typescript
/**
 * StrategyChainBuilder - Builds optimized fallback chains
 */
class StrategyChainBuilder {
  private config: StrategyChainBuilderConfig;

  /**
   * Create new StrategyChainBuilder instance
   * @param config - Builder configuration
   */
  constructor(config?: Partial<StrategyChainBuilderConfig>);

  /**
   * Build fallback chain from scored candidates
   * @param candidates - Scored strategy candidates
   * @param options - Optimization options
   * @returns Chain build result
   */
  build(
    candidates: StrategyCandidate[],
    options?: OptimizationOptions
  ): ChainBuildResult;

  /**
   * Optimize an existing chain
   * @param chain - Chain to optimize
   * @param additionalCandidates - Additional candidates to consider
   * @returns Optimized chain
   */
  optimize(
    chain: FallbackChain,
    additionalCandidates?: StrategyCandidate[]
  ): FallbackChain;

  /**
   * Merge multiple chains into one
   * @param chains - Chains to merge
   * @returns Merged chain
   */
  merge(chains: FallbackChain[]): FallbackChain;

  /**
   * Deduplicate candidates
   * @param candidates - Candidates to deduplicate
   * @returns Deduplicated candidates
   */
  deduplicate(candidates: StrategyCandidate[]): StrategyCandidate[];

  /**
   * Check if two selectors are similar
   * @param selector1 - First selector
   * @param selector2 - Second selector
   * @returns Similarity score (0-1)
   */
  calculateSelectorSimilarity(selector1: string, selector2: string): number;

  /**
   * Get strategy category
   * @param type - Strategy type
   * @returns Strategy category
   */
  getCategory(type: StrategyType): StrategyCategory;

  /**
   * Analyze chain diversity
   * @param strategies - Strategies to analyze
   * @returns Diversity analysis
   */
  analyzeDiversity(strategies: LocatorStrategy[]): DiversityAnalysis;

  /**
   * Ensure minimum diversity in chain
   * @param selected - Currently selected candidates
   * @param available - Available candidates to add
   * @returns Updated selection with diversity
   */
  ensureMinimumDiversity(
    selected: StrategyCandidate[],
    available: StrategyCandidate[]
  ): StrategyCandidate[];

  /**
   * Sort candidates by priority
   * @param candidates - Candidates to sort
   * @param preferredTypes - Preferred strategy types
   * @returns Sorted candidates
   */
  sortByPriority(
    candidates: StrategyCandidate[],
    preferredTypes?: StrategyType[]
  ): StrategyCandidate[];

  /**
   * Convert candidate to locator strategy
   * @param candidate - Candidate to convert
   * @returns Locator strategy
   */
  toLocatorStrategy(candidate: StrategyCandidate): LocatorStrategy;

  /**
   * Validate chain structure
   * @param chain - Chain to validate
   * @returns Validation result
   */
  validate(chain: FallbackChain): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };

  // Private helper methods
  private selectTopCandidates(candidates: StrategyCandidate[], max: number): StrategyCandidate[];
  private findBestFromCategory(candidates: StrategyCandidate[], category: StrategyCategory): StrategyCandidate | null;
  private removeDuplicateSelectors(candidates: StrategyCandidate[]): StrategyCandidate[];
  private removeSimilarSelectors(candidates: StrategyCandidate[]): StrategyCandidate[];
  private calculateDiversityScore(strategies: LocatorStrategy[]): number;
}

export {
  StrategyChainBuilder,
  StrategyChainBuilderConfig,
  ChainBuildResult,
  ExclusionReason,
  StrategyCategory,
  OptimizationOptions,
  DiversityAnalysis
};
```

---

## Key Implementation Details

### Constructor with Configuration
```typescript
constructor(config?: Partial<StrategyChainBuilderConfig>) {
  this.config = {
    maxStrategies: config?.maxStrategies ?? 7,
    minStrategies: config?.minStrategies ?? 2,
    ensureDiversity: config?.ensureDiversity ?? true,
    minDiverseTypes: config?.minDiverseTypes ?? 3,
    includeCoordinatesFallback: config?.includeCoordinatesFallback ?? true,
    deduplicateSimilar: config?.deduplicateSimilar ?? true,
    similarityThreshold: config?.similarityThreshold ?? 0.9
  };
}
```

### Main Build Method
```typescript
build(
  candidates: StrategyCandidate[],
  options?: OptimizationOptions
): ChainBuildResult {
  const startTime = Date.now();
  const excluded: ChainBuildResult['excluded'] = [];

  // Step 1: Filter invalid candidates
  const validCandidates = candidates.filter(c => {
    if (!c.type || c.rawConfidence <= 0) {
      excluded.push({ candidate: c, reason: 'invalid_candidate' });
      return false;
    }
    return true;
  });

  // Step 2: Sort by confidence (highest first)
  let sortedCandidates = this.sortByPriority(validCandidates, options?.preferredTypes);

  // Step 3: Deduplicate
  if (this.config.deduplicateSimilar) {
    const beforeDedup = sortedCandidates.length;
    sortedCandidates = this.deduplicate(sortedCandidates);
    
    // Track excluded due to deduplication
    const dedupExcluded = beforeDedup - sortedCandidates.length;
    // Note: detailed tracking would require returning which were excluded
  }

  // Step 4: Select top candidates
  let selected = this.selectTopCandidates(sortedCandidates, this.config.maxStrategies);

  // Step 5: Ensure diversity if enabled
  if (this.config.ensureDiversity) {
    selected = this.ensureMinimumDiversity(selected, sortedCandidates);
  }

  // Step 6: Ensure coordinates fallback if enabled
  if (this.config.includeCoordinatesFallback) {
    const hasCoordinates = selected.some(c => c.type === 'coordinates');
    if (!hasCoordinates) {
      const coordinatesCandidate = sortedCandidates.find(c => c.type === 'coordinates');
      if (coordinatesCandidate && selected.length < this.config.maxStrategies) {
        selected.push(coordinatesCandidate);
      } else if (coordinatesCandidate) {
        // Replace lowest confidence strategy
        selected[selected.length - 1] = coordinatesCandidate;
      }
    }
  }

  // Step 7: Handle required types
  if (options?.requiredTypes) {
    for (const requiredType of options.requiredTypes) {
      const hasRequired = selected.some(c => c.type === requiredType);
      if (!hasRequired) {
        const requiredCandidate = sortedCandidates.find(c => c.type === requiredType);
        if (requiredCandidate) {
          if (selected.length < this.config.maxStrategies) {
            selected.push(requiredCandidate);
          } else {
            // Replace lowest non-required
            for (let i = selected.length - 1; i >= 0; i--) {
              if (!options.requiredTypes.includes(selected[i].type)) {
                selected[i] = requiredCandidate;
                break;
              }
            }
          }
        }
      }
    }
  }

  // Step 8: Final sort by confidence
  selected.sort((a, b) => b.rawConfidence - a.rawConfidence);

  // Step 9: Convert to strategies
  const strategies = selected.map(c => this.toLocatorStrategy(c));

  // Step 10: Build chain
  const chain: FallbackChain = {
    strategies,
    primaryStrategy: strategies[0]?.type || 'coordinates',
    recordedAt: Date.now()
  };

  // Track excluded candidates
  for (const candidate of sortedCandidates) {
    if (!selected.includes(candidate)) {
      const category = this.getCategory(candidate.type);
      const selectedOfCategory = selected.filter(s => this.getCategory(s.type) === category);
      
      if (selectedOfCategory.length >= (options?.maxPerCategory || 2)) {
        excluded.push({ candidate, reason: 'type_already_covered' });
      } else if (selected.length >= this.config.maxStrategies) {
        excluded.push({ candidate, reason: 'max_strategies_reached' });
      }
    }
  }

  return {
    chain,
    included: selected,
    excluded,
    metadata: {
      originalCount: candidates.length,
      finalCount: selected.length,
      diversityScore: this.calculateDiversityScore(strategies),
      buildTime: Date.now() - startTime
    }
  };
}
```

### Deduplication
```typescript
deduplicate(candidates: StrategyCandidate[]): StrategyCandidate[] {
  // First pass: Remove exact duplicates
  const unique = this.removeDuplicateSelectors(candidates);

  // Second pass: Remove similar selectors
  if (this.config.deduplicateSimilar) {
    return this.removeSimilarSelectors(unique);
  }

  return unique;
}

private removeDuplicateSelectors(candidates: StrategyCandidate[]): StrategyCandidate[] {
  const seen = new Map<string, StrategyCandidate>();

  for (const candidate of candidates) {
    const key = this.getCandidateKey(candidate);
    
    if (!seen.has(key)) {
      seen.set(key, candidate);
    } else {
      // Keep the one with higher confidence
      const existing = seen.get(key)!;
      if (candidate.rawConfidence > existing.rawConfidence) {
        seen.set(key, candidate);
      }
    }
  }

  return Array.from(seen.values());
}

private getCandidateKey(candidate: StrategyCandidate): string {
  if (candidate.selector) {
    return `${candidate.type}:selector:${candidate.selector}`;
  }
  
  // For non-selector strategies, use metadata
  const metaKey = JSON.stringify(candidate.metadata || {});
  return `${candidate.type}:meta:${metaKey}`;
}

private removeSimilarSelectors(candidates: StrategyCandidate[]): StrategyCandidate[] {
  const result: StrategyCandidate[] = [];

  for (const candidate of candidates) {
    if (!candidate.selector) {
      // Non-selector strategies are always included
      result.push(candidate);
      continue;
    }

    // Check similarity with already selected
    let isSimilar = false;
    for (const selected of result) {
      if (!selected.selector) continue;
      
      const similarity = this.calculateSelectorSimilarity(
        candidate.selector,
        selected.selector
      );

      if (similarity >= this.config.similarityThreshold) {
        isSimilar = true;
        break;
      }
    }

    if (!isSimilar) {
      result.push(candidate);
    }
  }

  return result;
}

calculateSelectorSimilarity(selector1: string, selector2: string): number {
  if (selector1 === selector2) return 1.0;

  // Normalize selectors
  const norm1 = selector1.toLowerCase().replace(/\s+/g, ' ').trim();
  const norm2 = selector2.toLowerCase().replace(/\s+/g, ' ').trim();

  if (norm1 === norm2) return 1.0;

  // Calculate Levenshtein distance based similarity
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 1.0;

  const distance = this.levenshteinDistance(norm1, norm2);
  return 1 - (distance / maxLen);
}

private levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}
```

### Category Management
```typescript
getCategory(type: StrategyType): StrategyCategory {
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

analyzeDiversity(strategies: LocatorStrategy[]): DiversityAnalysis {
  const allCategories: StrategyCategory[] = ['semantic', 'dom', 'vision', 'evidence', 'coordinates'];
  const categoryCount: Record<StrategyCategory, number> = {
    semantic: 0,
    dom: 0,
    vision: 0,
    evidence: 0,
    coordinates: 0
  };

  for (const strategy of strategies) {
    const category = this.getCategory(strategy.type);
    categoryCount[category]++;
  }

  const presentCategories = allCategories.filter(c => categoryCount[c] > 0);
  const missingCategories = allCategories.filter(c => categoryCount[c] === 0);

  // Diversity score = unique categories / total categories
  const score = presentCategories.length / allCategories.length;

  const recommendations: string[] = [];
  if (missingCategories.includes('semantic') && !missingCategories.includes('dom')) {
    recommendations.push('Consider adding CDP semantic strategy for better accessibility');
  }
  if (missingCategories.includes('vision')) {
    recommendations.push('Vision strategy missing - may help with dynamic content');
  }
  if (missingCategories.includes('coordinates')) {
    recommendations.push('Coordinates fallback recommended for resilience');
  }

  return {
    categories: presentCategories,
    categoryCount,
    score,
    missingCategories,
    recommendations
  };
}
```

### Diversity Enforcement
```typescript
ensureMinimumDiversity(
  selected: StrategyCandidate[],
  available: StrategyCandidate[]
): StrategyCandidate[] {
  const result = [...selected];
  const allCategories: StrategyCategory[] = ['semantic', 'dom', 'vision', 'evidence', 'coordinates'];

  // Find missing categories
  const presentCategories = new Set(result.map(c => this.getCategory(c.type)));
  const missingCategories = allCategories.filter(c => !presentCategories.has(c));

  // Try to add one from each missing category
  for (const missingCategory of missingCategories) {
    if (result.length >= this.config.maxStrategies) break;

    const candidate = this.findBestFromCategory(available, missingCategory);
    if (candidate && !result.includes(candidate)) {
      result.push(candidate);
    }
  }

  // If still below minimum diverse types, try harder
  const currentDiversity = new Set(result.map(c => this.getCategory(c.type))).size;
  if (currentDiversity < this.config.minDiverseTypes && result.length < this.config.maxStrategies) {
    // Add best available from any new category
    for (const candidate of available) {
      if (result.length >= this.config.maxStrategies) break;
      if (result.includes(candidate)) continue;

      const candidateCategory = this.getCategory(candidate.type);
      const resultCategories = new Set(result.map(c => this.getCategory(c.type)));
      
      if (!resultCategories.has(candidateCategory)) {
        result.push(candidate);
      }
    }
  }

  return result;
}

private findBestFromCategory(
  candidates: StrategyCandidate[],
  category: StrategyCategory
): StrategyCandidate | null {
  const categoryStrategies = candidates.filter(c => this.getCategory(c.type) === category);
  
  if (categoryStrategies.length === 0) return null;

  // Return highest confidence
  return categoryStrategies.reduce((best, current) =>
    current.rawConfidence > best.rawConfidence ? current : best
  );
}
```

### Priority Sorting
```typescript
sortByPriority(
  candidates: StrategyCandidate[],
  preferredTypes?: StrategyType[]
): StrategyCandidate[] {
  return [...candidates].sort((a, b) => {
    // First: Check if either is a preferred type
    if (preferredTypes && preferredTypes.length > 0) {
      const aPreferred = preferredTypes.includes(a.type);
      const bPreferred = preferredTypes.includes(b.type);
      
      if (aPreferred && !bPreferred) return -1;
      if (bPreferred && !aPreferred) return 1;
    }

    // Second: Sort by confidence
    return b.rawConfidence - a.rawConfidence;
  });
}

private selectTopCandidates(
  candidates: StrategyCandidate[],
  max: number
): StrategyCandidate[] {
  return candidates.slice(0, max);
}
```

### Conversion and Validation
```typescript
toLocatorStrategy(candidate: StrategyCandidate): LocatorStrategy {
  return {
    type: candidate.type,
    selector: candidate.selector,
    confidence: candidate.rawConfidence,
    metadata: candidate.metadata
  };
}

validate(chain: FallbackChain): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum strategies
  if (chain.strategies.length < this.config.minStrategies) {
    errors.push(`Chain has ${chain.strategies.length} strategies, minimum is ${this.config.minStrategies}`);
  }

  // Check maximum strategies
  if (chain.strategies.length > this.config.maxStrategies) {
    warnings.push(`Chain has ${chain.strategies.length} strategies, maximum is ${this.config.maxStrategies}`);
  }

  // Check primary strategy exists
  if (!chain.primaryStrategy) {
    errors.push('Chain missing primary strategy');
  }

  // Check all strategies have type
  for (let i = 0; i < chain.strategies.length; i++) {
    const strategy = chain.strategies[i];
    if (!strategy.type) {
      errors.push(`Strategy at index ${i} missing type`);
    }
    if (strategy.confidence === undefined || strategy.confidence < 0 || strategy.confidence > 1) {
      warnings.push(`Strategy ${strategy.type} at index ${i} has invalid confidence: ${strategy.confidence}`);
    }
  }

  // Check diversity
  const diversity = this.analyzeDiversity(chain.strategies);
  if (diversity.score < 0.4) {
    warnings.push(`Low diversity score: ${diversity.score.toFixed(2)}`);
  }

  // Check for coordinates fallback
  if (this.config.includeCoordinatesFallback) {
    const hasCoordinates = chain.strategies.some(s => s.type === 'coordinates');
    if (!hasCoordinates) {
      warnings.push('Missing coordinates fallback strategy');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Optimize Existing Chain
```typescript
optimize(
  chain: FallbackChain,
  additionalCandidates?: StrategyCandidate[]
): FallbackChain {
  // Convert existing strategies to candidates
  const existingCandidates: StrategyCandidate[] = chain.strategies.map(s => ({
    type: s.type,
    selector: s.selector,
    metadata: s.metadata || {},
    source: 'computed' as const,
    rawConfidence: s.confidence
  }));

  // Merge with additional candidates
  const allCandidates = additionalCandidates
    ? [...existingCandidates, ...additionalCandidates]
    : existingCandidates;

  // Rebuild the chain
  const result = this.build(allCandidates);
  
  // Preserve original timestamp if present
  result.chain.recordedAt = chain.recordedAt || result.chain.recordedAt;

  return result.chain;
}

merge(chains: FallbackChain[]): FallbackChain {
  // Collect all strategies from all chains
  const allCandidates: StrategyCandidate[] = [];

  for (const chain of chains) {
    for (const strategy of chain.strategies) {
      allCandidates.push({
        type: strategy.type,
        selector: strategy.selector,
        metadata: strategy.metadata || {},
        source: 'computed' as const,
        rawConfidence: strategy.confidence
      });
    }
  }

  // Build merged chain
  const result = this.build(allCandidates);
  
  // Use earliest timestamp
  const timestamps = chains
    .map(c => c.recordedAt)
    .filter((t): t is number => t !== undefined);
  
  if (timestamps.length > 0) {
    result.chain.recordedAt = Math.min(...timestamps);
  }

  return result.chain;
}
```

---

## Integration Points

### With FallbackChainGenerator
```typescript
// FallbackChainGenerator uses StrategyChainBuilder
class FallbackChainGenerator {
  private chainBuilder: StrategyChainBuilder;

  async generate(evidence: CapturedEvidence): Promise<ChainGenerationResult> {
    // ... generate and score candidates ...

    // Build chain using builder
    const buildResult = this.chainBuilder.build(scoredCandidates, {
      requiredTypes: evidence.eventType === 'click' ? ['coordinates'] : undefined
    });

    return {
      chain: buildResult.chain,
      candidates: scoredCandidates,
      excludedCandidates: buildResult.excluded.map(e => ({
        candidate: e.candidate,
        reason: e.reason
      })),
      metadata: {
        generatedAt: Date.now(),
        processingTime: buildResult.metadata.buildTime,
        layersUsed: ['dom']
      }
    };
  }
}
```

---

## Acceptance Criteria

- [ ] Builds chains from scored candidates
- [ ] Removes exact duplicate selectors
- [ ] Removes similar selectors (configurable threshold)
- [ ] Enforces maximum chain length
- [ ] Ensures minimum diversity of strategy types
- [ ] Always includes coordinates fallback (configurable)
- [ ] Handles required strategy types
- [ ] Sorts by confidence (highest first)
- [ ] Calculates diversity score
- [ ] Validates built chains
- [ ] Optimize and merge existing chains
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Empty candidates array**: Return chain with just coordinates
2. **All candidates below threshold**: Use best available
3. **Single candidate type**: Include anyway with warning
4. **Very similar selectors**: Keep only highest confidence
5. **No coordinates candidate**: Create minimal one from metadata
6. **Required type not available**: Skip with warning
7. **Over maximum strategies**: Truncate lowest confidence
8. **Conflicting strategies**: Deduplicate by key
9. **Invalid candidates**: Filter out before processing
10. **Merging chains with conflicts**: Keep highest confidence

---

## Estimated Lines

350-400 lines
