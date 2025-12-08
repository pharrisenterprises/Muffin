/**
 * @fileoverview Fallback Chain Generator
 * @description Generates FallbackChain objects at recording time by analyzing
 * captured evidence from all layers. Creates ordered strategy chains for
 * reliable playback.
 * 
 * @module services/FallbackChainGenerator
 * @version 1.0.0
 * @since Phase 4
 */

import type { StrategyType, LocatorStrategy, FallbackChain } from '../../types/strategy';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Captured evidence from all layers.
 */
export interface CapturedEvidence {
  domData: DOMCaptureResult;
  visionData?: VisionCaptureResult;
  mouseData?: MouseCaptureResult;
  networkData?: NetworkCaptureResult;
  eventType: 'click' | 'type' | 'select' | 'navigate' | 'scroll';
  value?: string;
  timestamp: number;
}

/**
 * DOM capture result from content script.
 */
export interface DOMCaptureResult {
  tagName: string;
  id?: string;
  classList: string[];
  attributes: Record<string, string>;
  textContent?: string;
  innerText?: string;
  accessibleName?: string;
  accessibleRole?: string;
  placeholder?: string;
  xpath?: string;
  cssSelector?: string;
  testId?: string;
  x: number;
  y: number;
  boundingRect: { x: number; y: number; width: number; height: number };
  isInShadowDOM?: boolean;
  shadowHostChain?: string[];
}

/**
 * Vision capture result.
 */
export interface VisionCaptureResult {
  ocrText?: string;
  confidence: number;
  textBbox?: { x: number; y: number; width: number; height: number };
  screenshot?: string;
}

/**
 * Mouse capture result.
 */
export interface MouseCaptureResult {
  trail: Array<{ x: number; y: number; timestamp: number }>;
  endpoint: { x: number; y: number };
  pattern?: 'direct' | 'hesitant' | 'corrective';
}

/**
 * Network capture result.
 */
export interface NetworkCaptureResult {
  pendingRequests: number;
  recentResponses: Array<{ url: string; status: number; timestamp: number }>;
}

/**
 * Strategy candidate before scoring.
 */
export interface StrategyCandidate {
  type: StrategyType;
  selector?: string;
  metadata: Record<string, unknown>;
  source: 'dom' | 'vision' | 'mouse' | 'accessibility' | 'computed';
  rawConfidence: number;
}

/**
 * Generator configuration.
 */
export interface FallbackChainGeneratorConfig {
  minConfidence: number;
  maxStrategies: number;
  alwaysIncludeCoordinates: boolean;
  alwaysGenerateVision: boolean;
  generateEvidenceScoring: boolean;
}

const DEFAULT_CONFIG: FallbackChainGeneratorConfig = {
  minConfidence: 0.3,
  maxStrategies: 7,
  alwaysIncludeCoordinates: true,
  alwaysGenerateVision: true,
  generateEvidenceScoring: true
};

/**
 * Chain generation result.
 */
export interface ChainGenerationResult {
  chain: FallbackChain;
  candidates: StrategyCandidate[];
  excludedCandidates: Array<{ candidate: StrategyCandidate; reason: string }>;
  metadata: {
    generatedAt: number;
    processingTime: number;
    layersUsed: string[];
  };
}

/**
 * Element context for strategy generation.
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

// ============================================================================
// FALLBACK CHAIN GENERATOR CLASS
// ============================================================================

export class FallbackChainGenerator {
  private config: FallbackChainGeneratorConfig;

  constructor(config?: Partial<FallbackChainGeneratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // MAIN GENERATION
  // ==========================================================================

  async generate(evidence: CapturedEvidence): Promise<ChainGenerationResult> {
    const startTime = Date.now();
    const layersUsed: string[] = ['dom'];
    const allCandidates: StrategyCandidate[] = [];
    const excludedCandidates: Array<{ candidate: StrategyCandidate; reason: string }> = [];

    // Analyze element context
    const context = this.analyzeElement(evidence.domData);

    // Generate DOM strategies
    const domStrategies = this.generateDOMStrategies(evidence.domData, context);
    allCandidates.push(...domStrategies);

    // Generate CDP/Accessibility strategies
    const cdpStrategies = this.generateCDPStrategies(evidence.domData, context);
    allCandidates.push(...cdpStrategies);

    // Generate Vision strategy
    if (evidence.visionData) {
      layersUsed.push('vision');
    }
    const visionStrategy = this.generateVisionStrategy(evidence.visionData, evidence.domData);
    if (visionStrategy) {
      allCandidates.push(visionStrategy);
    }

    // Generate Evidence Scoring strategy
    if (evidence.mouseData) {
      layersUsed.push('mouse');
    }
    if (this.config.generateEvidenceScoring) {
      const evidenceStrategy = this.generateEvidenceScoringStrategy(evidence.mouseData, evidence.domData);
      if (evidenceStrategy) {
        allCandidates.push(evidenceStrategy);
      }
    }

    // Generate Coordinates fallback
    if (this.config.alwaysIncludeCoordinates) {
      allCandidates.push(this.generateCoordinatesStrategy(evidence.domData));
    }

    // Filter and sort candidates
    const filteredCandidates = this.filterAndSortCandidates(allCandidates);

    // Track excluded candidates
    for (const candidate of allCandidates) {
      if (!filteredCandidates.includes(candidate)) {
        excludedCandidates.push({
          candidate,
          reason: candidate.rawConfidence < this.config.minConfidence
            ? `Below minimum confidence (${candidate.rawConfidence} < ${this.config.minConfidence})`
            : 'Duplicate or exceeded max strategies'
        });
      }
    }

    // Limit to max strategies
    const finalCandidates = filteredCandidates.slice(0, this.config.maxStrategies);

    // Build the chain
    const strategies = finalCandidates.map(c => this.candidateToStrategy(c));
    const chain: FallbackChain = {
      strategies,
      primaryStrategy: strategies[0]?.type ?? 'dom_selector',
      recordedAt: evidence.timestamp
    };

    return {
      chain,
      candidates: allCandidates,
      excludedCandidates,
      metadata: {
        generatedAt: Date.now(),
        processingTime: Date.now() - startTime,
        layersUsed
      }
    };
  }

  // ==========================================================================
  // ELEMENT ANALYSIS
  // ==========================================================================

  analyzeElement(domData: DOMCaptureResult): ElementContext {
    const formElements = ['input', 'select', 'textarea', 'button'];
    const tagName = domData.tagName.toLowerCase();

    return {
      tagName,
      hasId: !!domData.id && !this.isLikelyDynamicId(domData.id),
      hasTestId: !!domData.testId,
      hasAccessibleName: !!domData.accessibleName,
      isFormElement: formElements.includes(tagName),
      isInShadowDOM: !!domData.isInShadowDOM,
      hasUniqueSelector: !!domData.cssSelector,
      role: domData.accessibleRole
    };
  }

  private isLikelyDynamicId(id: string): boolean {
    // Detect IDs that look auto-generated
    const dynamicPatterns = [
      /^[a-f0-9]{8,}$/i,           // Hex strings
      /^\d+$/,                      // Pure numbers
      /^[a-z]+[-_]\d+$/i,          // prefix-123
      /^react-/i,                   // React internal
      /^ember\d+$/i,               // Ember internal
      /^__/,                        // Double underscore
      /:r\d+:$/                     // React 18+ internal
    ];

    return dynamicPatterns.some(pattern => pattern.test(id));
  }

  // ==========================================================================
  // DOM STRATEGY GENERATION
  // ==========================================================================

  generateDOMStrategies(domData: DOMCaptureResult, context: ElementContext): StrategyCandidate[] {
    const strategies: StrategyCandidate[] = [];

    // Test ID (highest confidence)
    const testIdStrategy = this.generateTestIdSelector(domData);
    if (testIdStrategy) strategies.push(testIdStrategy);

    // ID selector
    const idStrategy = this.generateIdSelector(domData, context);
    if (idStrategy) strategies.push(idStrategy);

    // CSS selector
    if (domData.cssSelector) {
      strategies.push({
        type: 'css_selector',
        selector: domData.cssSelector,
        metadata: { source: 'computed' },
        source: 'dom',
        rawConfidence: 0.75
      });
    }

    // XPath
    const xpathStrategy = this.generateXPathStrategy(domData);
    if (xpathStrategy) strategies.push(xpathStrategy);

    return strategies;
  }

  private generateTestIdSelector(domData: DOMCaptureResult): StrategyCandidate | null {
    if (!domData.testId) return null;

    return {
      type: 'dom_selector',
      selector: `[data-testid="${domData.testId}"]`,
      metadata: { testId: domData.testId },
      source: 'dom',
      rawConfidence: 0.95
    };
  }

  private generateIdSelector(domData: DOMCaptureResult, context: ElementContext): StrategyCandidate | null {
    if (!context.hasId || !domData.id) return null;

    return {
      type: 'dom_selector',
      selector: `#${CSS.escape(domData.id)}`,
      metadata: { id: domData.id },
      source: 'dom',
      rawConfidence: 0.90
    };
  }

  private generateXPathStrategy(domData: DOMCaptureResult): StrategyCandidate | null {
    if (!domData.xpath) return null;

    return {
      type: 'css_selector',
      selector: domData.xpath,
      metadata: { type: 'xpath' },
      source: 'dom',
      rawConfidence: 0.65
    };
  }

  // ==========================================================================
  // CDP STRATEGY GENERATION
  // ==========================================================================

  generateCDPStrategies(domData: DOMCaptureResult, context: ElementContext): StrategyCandidate[] {
    const strategies: StrategyCandidate[] = [];

    // Role strategy (semantic)
    const roleStrategy = this.generateRoleStrategy(domData, context);
    if (roleStrategy) strategies.push(roleStrategy);

    // Text strategy
    const textStrategy = this.generateTextStrategy(domData);
    if (textStrategy) strategies.push(textStrategy);

    // Label strategy
    const labelStrategy = this.generateLabelStrategy(domData, context);
    if (labelStrategy) strategies.push(labelStrategy);

    // Placeholder strategy
    const placeholderStrategy = this.generatePlaceholderStrategy(domData);
    if (placeholderStrategy) strategies.push(placeholderStrategy);

    return strategies;
  }

  private generateRoleStrategy(domData: DOMCaptureResult, context: ElementContext): StrategyCandidate | null {
    if (!domData.accessibleRole) return null;

    const metadata: Record<string, unknown> = { role: domData.accessibleRole };
    if (domData.accessibleName) {
      metadata.name = domData.accessibleName;
    }

    return {
      type: 'cdp_semantic',
      metadata,
      source: 'accessibility',
      rawConfidence: context.hasAccessibleName ? 0.95 : 0.80
    };
  }

  private generateTextStrategy(domData: DOMCaptureResult): StrategyCandidate | null {
    const text = domData.textContent || domData.innerText;
    if (!text || text.length === 0 || text.length > 50) return null;

    return {
      type: 'cdp_power',
      metadata: { text: text.trim() },
      source: 'dom',
      rawConfidence: 0.85
    };
  }

  private generateLabelStrategy(domData: DOMCaptureResult, context: ElementContext): StrategyCandidate | null {
    if (!domData.accessibleName || !context.isFormElement) return null;

    return {
      type: 'cdp_power',
      metadata: { label: domData.accessibleName },
      source: 'accessibility',
      rawConfidence: 0.85
    };
  }

  private generatePlaceholderStrategy(domData: DOMCaptureResult): StrategyCandidate | null {
    const placeholder = domData.placeholder || domData.attributes['placeholder'];
    if (!placeholder) return null;

    return {
      type: 'cdp_power',
      metadata: { placeholder },
      source: 'dom',
      rawConfidence: 0.80
    };
  }

  // ==========================================================================
  // VISION STRATEGY
  // ==========================================================================

  generateVisionStrategy(
    visionData: VisionCaptureResult | undefined,
    domData: DOMCaptureResult
  ): StrategyCandidate | null {
    // If we have vision data with good OCR
    if (visionData?.ocrText && visionData.confidence >= 60) {
      return {
        type: 'vision_ocr',
        metadata: {
          targetText: visionData.ocrText,
          textBbox: visionData.textBbox,
          ocrConfidence: visionData.confidence
        },
        source: 'vision',
        rawConfidence: visionData.confidence / 100
      };
    }

    // If no vision data but we have text content, create potential vision strategy
    if (this.config.alwaysGenerateVision) {
      const text = domData.textContent || domData.innerText || domData.accessibleName;
      if (text && text.length > 0 && text.length < 50) {
        return {
          type: 'vision_ocr',
          metadata: {
            targetText: text.trim(),
            ocrConfidence: 70
          },
          source: 'computed',
          rawConfidence: 0.70
        };
      }
    }

    return null;
  }

  // ==========================================================================
  // EVIDENCE SCORING STRATEGY
  // ==========================================================================

  generateEvidenceScoringStrategy(
    mouseData: MouseCaptureResult | undefined,
    domData: DOMCaptureResult
  ): StrategyCandidate | null {
    if (!mouseData || mouseData.trail.length === 0) return null;

    return {
      type: 'evidence_scoring',
      metadata: {
        endpoint: mouseData.endpoint,
        mouseTrail: mouseData.trail.slice(-10),
        pattern: mouseData.pattern,
        attributes: {
          tagName: domData.tagName,
          id: domData.id,
          classList: domData.classList.slice(0, 3)
        }
      },
      source: 'mouse',
      rawConfidence: 0.75
    };
  }

  // ==========================================================================
  // COORDINATES STRATEGY
  // ==========================================================================

  generateCoordinatesStrategy(domData: DOMCaptureResult): StrategyCandidate {
    return {
      type: 'coordinates',
      metadata: {
        x: domData.x,
        y: domData.y,
        boundingRect: domData.boundingRect
      },
      source: 'dom',
      rawConfidence: 0.60
    };
  }

  // ==========================================================================
  // FILTERING AND SORTING
  // ==========================================================================

  filterAndSortCandidates(candidates: StrategyCandidate[]): StrategyCandidate[] {
    // Remove duplicates
    const unique = this.detectDuplicates(candidates);

    // Filter by minimum confidence
    const filtered = unique.filter(c => c.rawConfidence >= this.config.minConfidence);

    // Sort by confidence (highest first)
    return filtered.sort((a, b) => b.rawConfidence - a.rawConfidence);
  }

  private detectDuplicates(candidates: StrategyCandidate[]): StrategyCandidate[] {
    const seen = new Set<string>();
    const unique: StrategyCandidate[] = [];

    for (const candidate of candidates) {
      const key = candidate.selector
        ? `${candidate.type}:${candidate.selector}`
        : `${candidate.type}:${JSON.stringify(candidate.metadata)}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(candidate);
      }
    }

    return unique;
  }

  // ==========================================================================
  // CONVERSION AND VALIDATION
  // ==========================================================================

  candidateToStrategy(candidate: StrategyCandidate): LocatorStrategy {
    return {
      type: candidate.type,
      selector: candidate.selector,
      value: candidate.selector,
      confidence: candidate.rawConfidence,
      metadata: candidate.metadata
    };
  }

  validateChain(chain: FallbackChain): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (chain.strategies.length === 0) {
      issues.push('Chain has no strategies');
    }

    if (!chain.primaryStrategy) {
      issues.push('Chain has no primary strategy');
    }

    const hasReliable = chain.strategies.some(s => s.confidence >= 0.7);
    if (!hasReliable) {
      issues.push('No strategy with confidence >= 0.7');
    }

    const hasCoordinates = chain.strategies.some(s => s.type === 'coordinates');
    if (!hasCoordinates && this.config.alwaysIncludeCoordinates) {
      issues.push('Missing coordinates fallback');
    }

    return { valid: issues.length === 0, issues };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: FallbackChainGenerator | null = null;

export function getFallbackChainGenerator(
  config?: Partial<FallbackChainGeneratorConfig>
): FallbackChainGenerator {
  if (!instance) {
    instance = new FallbackChainGenerator(config);
  }
  return instance;
}
