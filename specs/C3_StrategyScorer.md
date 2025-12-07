# StrategyScorer Content Specification

**File ID:** C3  
**File Path:** `src/background/services/StrategyScorer.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Calculates confidence scores for individual strategy candidates based on selector quality, element characteristics, and recording context. Used by FallbackChainGenerator to rank strategies during chain creation. Implements heuristics for determining how reliable each strategy type will be during playback - accounting for factors like selector stability, uniqueness, accessibility information completeness, and vision OCR confidence.

---

## Dependencies

### Uses (imports from)
- `../../types/strategy`: StrategyType, LocatorStrategy
- `../FallbackChainGenerator`: StrategyCandidate, ElementContext

### Used By (exports to)
- `../FallbackChainGenerator`: Uses for candidate scoring
- `../DecisionEngine`: May use for runtime re-scoring

---

## Interfaces

```typescript
/**
 * Scoring configuration
 */
interface StrategyScorerConfig {
  /** Base weights for each strategy type */
  baseWeights: Record<StrategyType, number>;
  /** Penalty for dynamic-looking selectors (default: 0.3) */
  dynamicSelectorPenalty: number;
  /** Bonus for test ID attributes (default: 0.1) */
  testIdBonus: number;
  /** Bonus for stable ID patterns (default: 0.05) */
  stableIdBonus: number;
  /** Penalty for long selectors (default: 0.1) */
  longSelectorPenalty: number;
  /** Penalty for nth-child selectors (default: 0.15) */
  nthChildPenalty: number;
  /** Bonus for accessible name presence (default: 0.1) */
  accessibleNameBonus: number;
}

/**
 * Scoring factors applied to a candidate
 */
interface ScoringFactors {
  /** Base score from strategy type */
  baseScore: number;
  /** Selector quality factor (0-1) */
  selectorQuality: number;
  /** Element context factor (0-1) */
  contextFactor: number;
  /** Uniqueness factor (0-1) */
  uniquenessFactor: number;
  /** Applied bonuses */
  bonuses: Array<{ name: string; value: number }>;
  /** Applied penalties */
  penalties: Array<{ name: string; value: number }>;
  /** Final calculated score */
  finalScore: number;
}

/**
 * Selector analysis result
 */
interface SelectorAnalysis {
  /** Whether selector looks stable */
  isStable: boolean;
  /** Selector complexity (1-10) */
  complexity: number;
  /** Whether contains dynamic patterns */
  hasDynamicPatterns: boolean;
  /** Whether contains nth-child/nth-of-type */
  hasPositionalSelectors: boolean;
  /** Estimated uniqueness (0-1) */
  estimatedUniqueness: number;
  /** Issues found */
  issues: string[];
}

/**
 * Dynamic pattern detection rules
 */
interface DynamicPatternRule {
  /** Pattern name */
  name: string;
  /** Regex to match */
  pattern: RegExp;
  /** Penalty to apply */
  penalty: number;
}
```

---

## Functions

```typescript
/**
 * StrategyScorer - Calculates confidence scores for strategies
 */
class StrategyScorer {
  private config: StrategyScorerConfig;
  private dynamicPatterns: DynamicPatternRule[];

  /**
   * Create new StrategyScorer instance
   * @param config - Scorer configuration
   */
  constructor(config?: Partial<StrategyScorerConfig>);

  /**
   * Score a strategy candidate
   * @param candidate - Candidate to score
   * @param context - Element context
   * @returns Confidence score (0-1)
   */
  scoreCandidate(candidate: StrategyCandidate, context: ElementContext): number;

  /**
   * Get detailed scoring factors for a candidate
   * @param candidate - Candidate to analyze
   * @param context - Element context
   * @returns Detailed scoring factors
   */
  getDetailedScore(
    candidate: StrategyCandidate,
    context: ElementContext
  ): ScoringFactors;

  /**
   * Score a DOM selector strategy
   * @param candidate - DOM selector candidate
   * @param context - Element context
   * @returns Score (0-1)
   */
  scoreDOMSelector(candidate: StrategyCandidate, context: ElementContext): number;

  /**
   * Score a CSS selector strategy
   * @param candidate - CSS selector candidate
   * @param context - Element context
   * @returns Score (0-1)
   */
  scoreCSSSelector(candidate: StrategyCandidate, context: ElementContext): number;

  /**
   * Score a CDP semantic strategy (role + name)
   * @param candidate - CDP semantic candidate
   * @param context - Element context
   * @returns Score (0-1)
   */
  scoreCDPSemantic(candidate: StrategyCandidate, context: ElementContext): number;

  /**
   * Score a CDP power strategy (text/label/placeholder)
   * @param candidate - CDP power candidate
   * @param context - Element context
   * @returns Score (0-1)
   */
  scoreCDPPower(candidate: StrategyCandidate, context: ElementContext): number;

  /**
   * Score a Vision OCR strategy
   * @param candidate - Vision candidate
   * @param context - Element context
   * @returns Score (0-1)
   */
  scoreVisionOCR(candidate: StrategyCandidate, context: ElementContext): number;

  /**
   * Score an Evidence Scoring strategy
   * @param candidate - Evidence scoring candidate
   * @param context - Element context
   * @returns Score (0-1)
   */
  scoreEvidenceScoring(candidate: StrategyCandidate, context: ElementContext): number;

  /**
   * Score a Coordinates strategy
   * @param candidate - Coordinates candidate
   * @param context - Element context
   * @returns Score (0-1)
   */
  scoreCoordinates(candidate: StrategyCandidate, context: ElementContext): number;

  /**
   * Analyze a CSS/DOM selector for quality
   * @param selector - Selector string
   * @returns Selector analysis
   */
  analyzeSelector(selector: string): SelectorAnalysis;

  /**
   * Check if selector contains dynamic patterns
   * @param selector - Selector to check
   * @returns Whether dynamic patterns found
   */
  hasDynamicPatterns(selector: string): boolean;

  /**
   * Calculate selector complexity
   * @param selector - Selector string
   * @returns Complexity score (1-10)
   */
  calculateComplexity(selector: string): number;

  /**
   * Estimate selector uniqueness
   * @param selector - Selector string
   * @param context - Element context
   * @returns Estimated uniqueness (0-1)
   */
  estimateUniqueness(selector: string, context: ElementContext): number;

  /**
   * Get base weight for strategy type
   * @param type - Strategy type
   * @returns Base weight (0-1)
   */
  getBaseWeight(type: StrategyType): number;

  // Private helper methods
  private applyBonuses(score: number, candidate: StrategyCandidate, context: ElementContext): number;
  private applyPenalties(score: number, candidate: StrategyCandidate): number;
  private normalizeScore(score: number): number;
  private detectDynamicId(id: string): boolean;
  private scoreTextReliability(text: string): number;
}

export {
  StrategyScorer,
  StrategyScorerConfig,
  ScoringFactors,
  SelectorAnalysis,
  DynamicPatternRule
};
```

---

## Key Implementation Details

### Constructor with Default Configuration
```typescript
constructor(config?: Partial<StrategyScorerConfig>) {
  this.config = {
    baseWeights: config?.baseWeights ?? {
      cdp_semantic: 0.95,
      cdp_power: 0.90,
      dom_selector: 0.85,
      evidence_scoring: 0.80,
      css_selector: 0.75,
      vision_ocr: 0.70,
      coordinates: 0.60
    },
    dynamicSelectorPenalty: config?.dynamicSelectorPenalty ?? 0.3,
    testIdBonus: config?.testIdBonus ?? 0.1,
    stableIdBonus: config?.stableIdBonus ?? 0.05,
    longSelectorPenalty: config?.longSelectorPenalty ?? 0.1,
    nthChildPenalty: config?.nthChildPenalty ?? 0.15,
    accessibleNameBonus: config?.accessibleNameBonus ?? 0.1
  };

  // Dynamic pattern detection rules
  this.dynamicPatterns = [
    { name: 'ember-id', pattern: /ember\d+/i, penalty: 0.3 },
    { name: 'react-id', pattern: /^react-|r[a-z0-9]{4,}/i, penalty: 0.3 },
    { name: 'angular-id', pattern: /^ng-|ngcontent/i, penalty: 0.3 },
    { name: 'vue-id', pattern: /^v-|data-v-[a-f0-9]+/i, penalty: 0.3 },
    { name: 'uuid', pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i, penalty: 0.35 },
    { name: 'hash', pattern: /[a-z]{1,3}[0-9a-f]{6,}/i, penalty: 0.25 },
    { name: 'timestamp', pattern: /\d{10,13}/, penalty: 0.35 },
    { name: 'random-suffix', pattern: /_[a-z0-9]{5,}$/i, penalty: 0.2 },
    { name: 'index-suffix', pattern: /-\d+$/, penalty: 0.15 },
    { name: 'css-modules', pattern: /___[a-zA-Z0-9]+/, penalty: 0.25 }
  ];
}
```

### Main Scoring Method
```typescript
scoreCandidate(candidate: StrategyCandidate, context: ElementContext): number {
  switch (candidate.type) {
    case 'dom_selector':
      return this.scoreDOMSelector(candidate, context);
    case 'css_selector':
      return this.scoreCSSSelector(candidate, context);
    case 'cdp_semantic':
      return this.scoreCDPSemantic(candidate, context);
    case 'cdp_power':
      return this.scoreCDPPower(candidate, context);
    case 'vision_ocr':
      return this.scoreVisionOCR(candidate, context);
    case 'evidence_scoring':
      return this.scoreEvidenceScoring(candidate, context);
    case 'coordinates':
      return this.scoreCoordinates(candidate, context);
    default:
      return 0.5; // Unknown type
  }
}
```

### Detailed Scoring with Factors
```typescript
getDetailedScore(
  candidate: StrategyCandidate,
  context: ElementContext
): ScoringFactors {
  const baseScore = this.getBaseWeight(candidate.type);
  const bonuses: ScoringFactors['bonuses'] = [];
  const penalties: ScoringFactors['penalties'] = [];

  let selectorQuality = 1.0;
  let contextFactor = 1.0;
  let uniquenessFactor = 1.0;

  // Analyze selector if present
  if (candidate.selector) {
    const analysis = this.analyzeSelector(candidate.selector);
    selectorQuality = analysis.isStable ? 1.0 : 0.7;
    uniquenessFactor = analysis.estimatedUniqueness;

    // Apply selector-based penalties
    if (analysis.hasDynamicPatterns) {
      penalties.push({ name: 'dynamicPattern', value: this.config.dynamicSelectorPenalty });
    }
    if (analysis.hasPositionalSelectors) {
      penalties.push({ name: 'positionalSelector', value: this.config.nthChildPenalty });
    }
    if (analysis.complexity > 5) {
      penalties.push({ name: 'complexSelector', value: this.config.longSelectorPenalty });
    }
  }

  // Apply context-based bonuses
  if (context.hasTestId && candidate.metadata?.selectorType === 'testId') {
    bonuses.push({ name: 'testId', value: this.config.testIdBonus });
  }
  if (context.hasAccessibleName && (candidate.type === 'cdp_semantic' || candidate.type === 'cdp_power')) {
    bonuses.push({ name: 'accessibleName', value: this.config.accessibleNameBonus });
  }
  if (context.hasId && !this.detectDynamicId(candidate.metadata?.id || '')) {
    bonuses.push({ name: 'stableId', value: this.config.stableIdBonus });
  }

  // Calculate final score
  const totalBonuses = bonuses.reduce((sum, b) => sum + b.value, 0);
  const totalPenalties = penalties.reduce((sum, p) => sum + p.value, 0);
  
  const rawScore = baseScore * selectorQuality * contextFactor * uniquenessFactor;
  const finalScore = this.normalizeScore(rawScore + totalBonuses - totalPenalties);

  return {
    baseScore,
    selectorQuality,
    contextFactor,
    uniquenessFactor,
    bonuses,
    penalties,
    finalScore
  };
}
```

### DOM Selector Scoring
```typescript
scoreDOMSelector(candidate: StrategyCandidate, context: ElementContext): number {
  const selector = candidate.selector;
  if (!selector) return 0.5;

  const factors = this.getDetailedScore(candidate, context);
  let score = factors.finalScore;

  // Additional DOM-specific scoring
  const selectorType = candidate.metadata?.selectorType;

  switch (selectorType) {
    case 'id':
      // Check if ID looks stable
      const idMatch = selector.match(/^#(.+)$/);
      if (idMatch) {
        const id = idMatch[1];
        if (this.detectDynamicId(id)) {
          score *= 0.6;
        } else {
          score = Math.min(score + 0.05, 0.95);
        }
      }
      break;

    case 'testId':
      // Test IDs are very reliable
      score = Math.min(score + 0.1, 0.98);
      break;

    case 'unique':
      // Unique selector generated by recorder
      score = Math.min(score, 0.90);
      break;

    default:
      // Generic selector
      break;
  }

  return this.normalizeScore(score);
}
```

### CDP Semantic Scoring
```typescript
scoreCDPSemantic(candidate: StrategyCandidate, context: ElementContext): number {
  const baseScore = this.config.baseWeights.cdp_semantic;
  let score = baseScore;

  const { role, name } = candidate.metadata || {};

  // Role without name is less reliable
  if (!name) {
    score *= 0.8;
  }

  // Interactive roles are more reliable
  const interactiveRoles = ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'menuitem', 'tab'];
  if (role && interactiveRoles.includes(role)) {
    score = Math.min(score + 0.05, 0.98);
  }

  // Landmark roles are less specific
  const landmarkRoles = ['main', 'navigation', 'banner', 'contentinfo', 'region'];
  if (role && landmarkRoles.includes(role)) {
    score *= 0.9;
  }

  // Generic role is very unreliable
  if (role === 'generic' || role === 'none' || role === 'presentation') {
    score *= 0.5;
  }

  // Name quality
  if (name) {
    score *= this.scoreTextReliability(name);
  }

  return this.normalizeScore(score);
}
```

### CDP Power Scoring
```typescript
scoreCDPPower(candidate: StrategyCandidate, context: ElementContext): number {
  const baseScore = this.config.baseWeights.cdp_power;
  let score = baseScore;

  const { text, label, placeholder, testId } = candidate.metadata || {};

  // Test ID is highest confidence
  if (testId) {
    return Math.min(0.95, baseScore + 0.1);
  }

  // Label for form elements is very reliable
  if (label && context.isFormElement) {
    score = Math.min(score + 0.05, 0.95);
  }

  // Placeholder is moderately reliable
  if (placeholder) {
    score *= 0.95;
  }

  // Text reliability depends on content
  if (text) {
    score *= this.scoreTextReliability(text);
  }

  return this.normalizeScore(score);
}
```

### Vision OCR Scoring
```typescript
scoreVisionOCR(candidate: StrategyCandidate, context: ElementContext): number {
  const baseScore = this.config.baseWeights.vision_ocr;
  let score = baseScore;

  const { targetText, ocrConfidence } = candidate.metadata || {};

  // OCR confidence directly affects score
  if (ocrConfidence !== undefined) {
    // ocrConfidence is 0-100, normalize to factor
    const confidenceFactor = ocrConfidence / 100;
    score *= confidenceFactor;
  }

  // Text reliability
  if (targetText) {
    score *= this.scoreTextReliability(targetText);
  }

  // Very short text is less reliable (might match multiple elements)
  if (targetText && targetText.length < 3) {
    score *= 0.7;
  }

  // Very long text is less reliable (OCR errors accumulate)
  if (targetText && targetText.length > 50) {
    score *= 0.85;
  }

  return this.normalizeScore(score);
}
```

### Evidence Scoring Strategy
```typescript
scoreEvidenceScoring(candidate: StrategyCandidate, context: ElementContext): number {
  const baseScore = this.config.baseWeights.evidence_scoring;
  let score = baseScore;

  const { endpoint, pattern, attributes } = candidate.metadata || {};

  // Must have endpoint
  if (!endpoint) {
    return 0.3;
  }

  // Mouse pattern affects reliability
  if (pattern) {
    switch (pattern) {
      case 'direct':
        score = Math.min(score + 0.05, 0.90);
        break;
      case 'hesitant':
        score *= 0.95;
        break;
      case 'searching':
        score *= 0.85;
        break;
      case 'corrective':
        score *= 0.90;
        break;
    }
  }

  // More attributes = more reliable matching
  if (attributes) {
    const attrCount = Object.keys(attributes).length;
    if (attrCount >= 3) {
      score = Math.min(score + 0.05, 0.90);
    }
  }

  return this.normalizeScore(score);
}
```

### Coordinates Strategy Scoring
```typescript
scoreCoordinates(candidate: StrategyCandidate, context: ElementContext): number {
  // Coordinates is always lowest priority
  const baseScore = this.config.baseWeights.coordinates;
  let score = baseScore;

  const { boundingRect } = candidate.metadata || {};

  // Larger elements are more forgiving
  if (boundingRect) {
    const area = boundingRect.width * boundingRect.height;
    if (area > 10000) { // Large button/element
      score = Math.min(score + 0.05, 0.70);
    } else if (area < 500) { // Small element - risky
      score *= 0.8;
    }
  }

  return this.normalizeScore(score);
}
```

### Selector Analysis
```typescript
analyzeSelector(selector: string): SelectorAnalysis {
  const issues: string[] = [];
  let isStable = true;
  let hasDynamicPatterns = false;
  let hasPositionalSelectors = false;

  // Check for dynamic patterns
  for (const rule of this.dynamicPatterns) {
    if (rule.pattern.test(selector)) {
      hasDynamicPatterns = true;
      isStable = false;
      issues.push(`Dynamic pattern: ${rule.name}`);
      break;
    }
  }

  // Check for positional selectors
  if (/:(nth-child|nth-of-type|first-child|last-child)\(/i.test(selector)) {
    hasPositionalSelectors = true;
    issues.push('Contains positional selector');
  }

  // Calculate complexity
  const complexity = this.calculateComplexity(selector);
  if (complexity > 5) {
    issues.push(`High complexity: ${complexity}`);
  }

  // Estimate uniqueness
  const estimatedUniqueness = this.estimateUniqueness(selector, {} as ElementContext);

  return {
    isStable,
    complexity,
    hasDynamicPatterns,
    hasPositionalSelectors,
    estimatedUniqueness,
    issues
  };
}

calculateComplexity(selector: string): number {
  // Count different parts of selector
  let complexity = 1;

  // Count descendant combinators
  complexity += (selector.match(/\s+/g) || []).length;

  // Count child combinators
  complexity += (selector.match(/>/g) || []).length;

  // Count pseudo-selectors
  complexity += (selector.match(/:/g) || []).length;

  // Count attribute selectors
  complexity += (selector.match(/\[/g) || []).length;

  // Count classes
  complexity += (selector.match(/\./g) || []).length * 0.5;

  return Math.min(Math.round(complexity), 10);
}

estimateUniqueness(selector: string, context: ElementContext): number {
  // Heuristics for uniqueness
  let uniqueness = 0.7; // Default

  // ID selector is highly unique
  if (/^#[^#\s]+$/.test(selector)) {
    uniqueness = 0.95;
  }

  // Test ID is highly unique
  if (/\[data-testid/.test(selector)) {
    uniqueness = 0.95;
  }

  // More specific selectors are more unique
  const parts = selector.split(/\s+/);
  if (parts.length >= 3) {
    uniqueness = Math.min(uniqueness + 0.1, 0.95);
  }

  // Generic tag selectors are less unique
  if (/^(div|span|a|button)$/.test(selector)) {
    uniqueness = 0.2;
  }

  return uniqueness;
}
```

### Helper Methods
```typescript
private detectDynamicId(id: string): boolean {
  if (!id) return false;

  for (const rule of this.dynamicPatterns) {
    if (rule.pattern.test(id)) {
      return true;
    }
  }

  return false;
}

private scoreTextReliability(text: string): number {
  if (!text) return 0.5;

  let reliability = 1.0;

  // Very generic text is less reliable
  const genericWords = ['submit', 'click', 'ok', 'cancel', 'yes', 'no', 'close', 'next', 'back', 'continue'];
  if (genericWords.includes(text.toLowerCase())) {
    reliability *= 0.85;
  }

  // Numbers only is less reliable
  if (/^\d+$/.test(text)) {
    reliability *= 0.7;
  }

  // Very short is less reliable
  if (text.length < 3) {
    reliability *= 0.8;
  }

  // Contains special characters only
  if (/^[^a-zA-Z0-9]+$/.test(text)) {
    reliability *= 0.6;
  }

  return reliability;
}

private normalizeScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}

getBaseWeight(type: StrategyType): number {
  return this.config.baseWeights[type] ?? 0.5;
}
```

---

## Integration Points

### With FallbackChainGenerator
```typescript
// FallbackChainGenerator uses StrategyScorer
class FallbackChainGenerator {
  private strategyScorer: StrategyScorer;

  constructor(strategyScorer: StrategyScorer) {
    this.strategyScorer = strategyScorer;
  }

  async generate(evidence: CapturedEvidence): Promise<ChainGenerationResult> {
    const context = this.analyzeElement(evidence.domData);
    
    // Score each candidate
    const scoredCandidates = candidates.map(candidate => ({
      ...candidate,
      rawConfidence: this.strategyScorer.scoreCandidate(candidate, context)
    }));

    // Sort and filter by score...
  }
}
```

### With DecisionEngine (Runtime Re-scoring)
```typescript
// DecisionEngine can re-score strategies at runtime
class DecisionEngine {
  private strategyScorer: StrategyScorer;

  async reevaluateConfidence(strategy: LocatorStrategy, currentContext: ElementContext): number {
    const candidate: StrategyCandidate = {
      type: strategy.type,
      selector: strategy.selector,
      metadata: strategy.metadata,
      source: 'computed',
      rawConfidence: strategy.confidence
    };

    return this.strategyScorer.scoreCandidate(candidate, currentContext);
  }
}
```

---

## Acceptance Criteria

- [ ] Scores all 7 strategy types correctly
- [ ] Detects dynamic/unstable ID patterns
- [ ] Penalizes positional selectors (nth-child)
- [ ] Rewards test IDs with bonus
- [ ] Analyzes selector complexity
- [ ] Estimates selector uniqueness
- [ ] Scores text reliability
- [ ] Returns detailed scoring factors
- [ ] Normalizes all scores to 0-1 range
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Empty selector**: Return low score
2. **Very long selector**: Apply complexity penalty
3. **UUID in selector**: Detect and penalize
4. **Framework-specific IDs**: Detect Ember/React/Angular/Vue patterns
5. **Generic button text**: Lower text reliability
6. **Numbers-only text**: Lower reliability
7. **Unicode text**: Handle properly
8. **CSS escape sequences**: Parse correctly
9. **Invalid selectors**: Return minimum score
10. **Missing metadata**: Use defaults

---

## Estimated Lines

350-400 lines
