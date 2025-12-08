/**
 * @fileoverview Strategy Scorer
 * @description Calculates confidence scores for strategy candidates based on
 * selector quality, element characteristics, and recording context.
 * 
 * @module services/StrategyScorer
 * @version 1.0.0
 * @since Phase 4
 */

import type { StrategyType } from '../../types/strategy';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Strategy candidate (simplified - matches FallbackChainGenerator).
 */
export interface StrategyCandidate {
  type: StrategyType;
  selector?: string;
  metadata: Record<string, unknown>;
  source: 'dom' | 'vision' | 'mouse' | 'accessibility' | 'computed';
  rawConfidence: number;
}

/**
 * Element context for scoring.
 */
export interface ElementContext {
  tagName: string;
  hasId: boolean;
  hasTestId: boolean;
  hasAccessibleName: boolean;
  isFormElement: boolean;
  isInShadowDOM: boolean;
  hasUniqueSelector: boolean;
  role?: string;
}

/**
 * Scorer configuration.
 */
export interface StrategyScorerConfig {
  baseWeights: Record<StrategyType, number>;
  dynamicSelectorPenalty: number;
  testIdBonus: number;
  stableIdBonus: number;
  longSelectorPenalty: number;
  nthChildPenalty: number;
  accessibleNameBonus: number;
}

const DEFAULT_CONFIG: StrategyScorerConfig = {
  baseWeights: {
    cdp_semantic: 0.95,
    cdp_power: 0.90,
    dom_selector: 0.85,
    evidence_scoring: 0.80,
    css_selector: 0.75,
    vision_ocr: 0.70,
    coordinates: 0.60
  },
  dynamicSelectorPenalty: 0.3,
  testIdBonus: 0.1,
  stableIdBonus: 0.05,
  longSelectorPenalty: 0.1,
  nthChildPenalty: 0.15,
  accessibleNameBonus: 0.1
};

/**
 * Detailed scoring factors.
 */
export interface ScoringFactors {
  baseScore: number;
  selectorQuality: number;
  contextFactor: number;
  uniquenessFactor: number;
  bonuses: Array<{ name: string; value: number }>;
  penalties: Array<{ name: string; value: number }>;
  finalScore: number;
}

/**
 * Selector analysis result.
 */
export interface SelectorAnalysis {
  isStable: boolean;
  complexity: number;
  hasDynamicPatterns: boolean;
  hasPositionalSelectors: boolean;
  estimatedUniqueness: number;
  issues: string[];
}

/**
 * Dynamic pattern detection rule.
 */
export interface DynamicPatternRule {
  name: string;
  pattern: RegExp;
  penalty: number;
}

// ============================================================================
// STRATEGY SCORER CLASS
// ============================================================================

export class StrategyScorer {
  private config: StrategyScorerConfig;
  private dynamicPatterns: DynamicPatternRule[];

  constructor(config?: Partial<StrategyScorerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.dynamicPatterns = [
      { name: 'ember-id', pattern: /ember\d+/i, penalty: 0.3 },
      { name: 'react-id', pattern: /^react-|:r[a-z0-9]{2,}:/i, penalty: 0.3 },
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

  // ==========================================================================
  // MAIN SCORING
  // ==========================================================================

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
        return 0.5;
    }
  }

  getDetailedScore(candidate: StrategyCandidate, context: ElementContext): ScoringFactors {
    const baseScore = this.config.baseWeights[candidate.type] ?? 0.5;
    const bonuses: Array<{ name: string; value: number }> = [];
    const penalties: Array<{ name: string; value: number }> = [];

    let selectorQuality = 1.0;
    let contextFactor = 1.0;
    let uniquenessFactor = 0.8;

    // Analyze selector if present
    if (candidate.selector) {
      const analysis = this.analyzeSelector(candidate.selector);
      selectorQuality = analysis.isStable ? 1.0 : 0.7;
      uniquenessFactor = analysis.estimatedUniqueness;

      if (analysis.hasDynamicPatterns) {
        penalties.push({ name: 'dynamic-pattern', value: this.config.dynamicSelectorPenalty });
      }
      if (analysis.hasPositionalSelectors) {
        penalties.push({ name: 'positional-selector', value: this.config.nthChildPenalty });
      }
      if (analysis.complexity > 5) {
        penalties.push({ name: 'high-complexity', value: this.config.longSelectorPenalty });
      }
    }

    // Context bonuses
    if (context.hasTestId) {
      bonuses.push({ name: 'test-id', value: this.config.testIdBonus });
    }
    if (context.hasAccessibleName && (candidate.type === 'cdp_semantic' || candidate.type === 'cdp_power')) {
      bonuses.push({ name: 'accessible-name', value: this.config.accessibleNameBonus });
    }
    if (context.hasId && !this.detectDynamicId(candidate.metadata?.id as string)) {
      bonuses.push({ name: 'stable-id', value: this.config.stableIdBonus });
    }

    // Calculate final score
    let finalScore = baseScore * selectorQuality * contextFactor;
    
    for (const bonus of bonuses) {
      finalScore = Math.min(finalScore + bonus.value, 1.0);
    }
    for (const penalty of penalties) {
      finalScore = Math.max(finalScore - penalty.value, 0.1);
    }

    return {
      baseScore,
      selectorQuality,
      contextFactor,
      uniquenessFactor,
      bonuses,
      penalties,
      finalScore: this.normalizeScore(finalScore)
    };
  }

  // ==========================================================================
  // STRATEGY-SPECIFIC SCORING
  // ==========================================================================

  scoreDOMSelector(candidate: StrategyCandidate, context: ElementContext): number {
    let score = this.config.baseWeights.dom_selector;

    if (!candidate.selector) return 0.3;

    const analysis = this.analyzeSelector(candidate.selector);

    // Test ID gets highest score
    if (/\[data-testid/.test(candidate.selector)) {
      return this.normalizeScore(0.95);
    }

    // Clean ID selector
    if (/^#[^#\s]+$/.test(candidate.selector) && !analysis.hasDynamicPatterns) {
      return this.normalizeScore(0.90);
    }

    // Apply penalties
    if (analysis.hasDynamicPatterns) {
      score -= this.config.dynamicSelectorPenalty;
    }
    if (analysis.hasPositionalSelectors) {
      score -= this.config.nthChildPenalty;
    }
    if (analysis.complexity > 5) {
      score -= this.config.longSelectorPenalty;
    }

    return this.normalizeScore(score);
  }

  scoreCSSSelector(candidate: StrategyCandidate, context: ElementContext): number {
    let score = this.config.baseWeights.css_selector;

    if (!candidate.selector) return 0.3;

    const analysis = this.analyzeSelector(candidate.selector);

    if (analysis.hasDynamicPatterns) {
      score -= this.config.dynamicSelectorPenalty;
    }
    if (analysis.hasPositionalSelectors) {
      score -= this.config.nthChildPenalty;
    }
    if (analysis.complexity > 7) {
      score -= this.config.longSelectorPenalty * 1.5;
    }

    return this.normalizeScore(score);
  }

  scoreCDPSemantic(candidate: StrategyCandidate, context: ElementContext): number {
    let score = this.config.baseWeights.cdp_semantic;

    const { role, name } = candidate.metadata as { role?: string; name?: string };

    if (!role) return 0.4;

    // Role + name is most reliable
    if (name && name.length > 0) {
      score = Math.min(score + this.config.accessibleNameBonus, 0.98);
    } else {
      // Role-only is less specific
      score *= 0.85;
    }

    // Interactive roles are more stable
    const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'textbox', 'combobox', 'menuitem'];
    if (role && interactiveRoles.includes(role.toLowerCase())) {
      score = Math.min(score + 0.02, 0.98);
    }

    return this.normalizeScore(score);
  }

  scoreCDPPower(candidate: StrategyCandidate, context: ElementContext): number {
    let score = this.config.baseWeights.cdp_power;

    const { text, label, placeholder } = candidate.metadata as { text?: string; label?: string; placeholder?: string };
    const textValue = text || label || placeholder;

    if (!textValue) return 0.4;

    // Score text reliability
    const textReliability = this.scoreTextReliability(textValue);
    score *= textReliability;

    // Label is more reliable than text
    if (label) {
      score = Math.min(score + 0.05, 0.95);
    }

    return this.normalizeScore(score);
  }

  scoreVisionOCR(candidate: StrategyCandidate, context: ElementContext): number {
    let score = this.config.baseWeights.vision_ocr;

    const { targetText, ocrConfidence } = candidate.metadata as { targetText?: string; ocrConfidence?: number };

    if (!targetText) return 0.3;

    // Use OCR confidence if provided
    if (ocrConfidence !== undefined) {
      score = (ocrConfidence / 100) * 0.9; // Cap at 0.9
    }

    // Longer unique text is more reliable
    if (targetText.length > 10 && targetText.length < 30) {
      score = Math.min(score + 0.05, 0.85);
    }

    return this.normalizeScore(score);
  }

  scoreEvidenceScoring(candidate: StrategyCandidate, context: ElementContext): number {
    let score = this.config.baseWeights.evidence_scoring;

    const { endpoint, pattern, attributes } = candidate.metadata as {
      endpoint?: { x: number; y: number };
      pattern?: string;
      attributes?: Record<string, unknown>;
    };

    if (!endpoint) return 0.3;

    // Mouse pattern affects reliability
    if (pattern) {
      switch (pattern) {
        case 'direct':
          score = Math.min(score + 0.05, 0.90);
          break;
        case 'hesitant':
          score *= 0.95;
          break;
        case 'corrective':
          score *= 0.90;
          break;
      }
    }

    // More attributes = more reliable
    if (attributes && Object.keys(attributes).length >= 3) {
      score = Math.min(score + 0.05, 0.90);
    }

    return this.normalizeScore(score);
  }

  scoreCoordinates(candidate: StrategyCandidate, context: ElementContext): number {
    let score = this.config.baseWeights.coordinates;

    const { boundingRect } = candidate.metadata as { boundingRect?: { width: number; height: number } };

    if (boundingRect) {
      const area = boundingRect.width * boundingRect.height;
      if (area > 10000) {
        score = Math.min(score + 0.05, 0.70);
      } else if (area < 500) {
        score *= 0.8;
      }
    }

    return this.normalizeScore(score);
  }

  // ==========================================================================
  // SELECTOR ANALYSIS
  // ==========================================================================

  analyzeSelector(selector: string): SelectorAnalysis {
    const issues: string[] = [];
    let isStable = true;
    let hasDynamicPatterns = false;
    let hasPositionalSelectors = false;

    for (const rule of this.dynamicPatterns) {
      if (rule.pattern.test(selector)) {
        hasDynamicPatterns = true;
        isStable = false;
        issues.push(`Dynamic pattern: ${rule.name}`);
        break;
      }
    }

    if (/:(nth-child|nth-of-type|first-child|last-child)\(/i.test(selector)) {
      hasPositionalSelectors = true;
      issues.push('Contains positional selector');
    }

    const complexity = this.calculateComplexity(selector);
    if (complexity > 5) {
      issues.push(`High complexity: ${complexity}`);
    }

    const estimatedUniqueness = this.estimateUniqueness(selector);

    return {
      isStable,
      complexity,
      hasDynamicPatterns,
      hasPositionalSelectors,
      estimatedUniqueness,
      issues
    };
  }

  hasDynamicPatterns(selector: string): boolean {
    return this.dynamicPatterns.some(rule => rule.pattern.test(selector));
  }

  calculateComplexity(selector: string): number {
    let complexity = 1;
    complexity += (selector.match(/\s+/g) || []).length;
    complexity += (selector.match(/>/g) || []).length;
    complexity += (selector.match(/:/g) || []).length;
    complexity += (selector.match(/\[/g) || []).length;
    complexity += (selector.match(/\./g) || []).length * 0.5;
    return Math.min(Math.round(complexity), 10);
  }

  estimateUniqueness(selector: string): number {
    let uniqueness = 0.7;

    if (/^#[^#\s]+$/.test(selector)) uniqueness = 0.95;
    if (/\[data-testid/.test(selector)) uniqueness = 0.95;

    const parts = selector.split(/\s+/);
    if (parts.length >= 3) uniqueness = Math.min(uniqueness + 0.1, 0.95);
    if (/^(div|span|a|button)$/.test(selector)) uniqueness = 0.2;

    return uniqueness;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private detectDynamicId(id: string | undefined): boolean {
    if (!id) return false;
    return this.dynamicPatterns.some(rule => rule.pattern.test(id));
  }

  private scoreTextReliability(text: string): number {
    if (!text) return 0.5;

    let reliability = 1.0;

    const genericWords = ['submit', 'click', 'ok', 'cancel', 'yes', 'no', 'close', 'next', 'back', 'continue'];
    if (genericWords.includes(text.toLowerCase())) reliability *= 0.85;
    if (/^\d+$/.test(text)) reliability *= 0.7;
    if (text.length < 3) reliability *= 0.8;
    if (/^[^a-zA-Z0-9]+$/.test(text)) reliability *= 0.6;

    return reliability;
  }

  private normalizeScore(score: number): number {
    return Math.max(0, Math.min(1, score));
  }

  getBaseWeight(type: StrategyType): number {
    return this.config.baseWeights[type] ?? 0.5;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: StrategyScorer | null = null;

export function getStrategyScorer(config?: Partial<StrategyScorerConfig>): StrategyScorer {
  if (!instance) {
    instance = new StrategyScorer(config);
  }
  return instance;
}
