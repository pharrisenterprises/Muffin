# FallbackChainGenerator Content Specification

**File ID:** C2  
**File Path:** `src/background/services/FallbackChainGenerator.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Generates FallbackChain objects at recording time by analyzing captured evidence from all 4 layers (DOM, Vision, Mouse, Network). Takes raw capture data from RecordingOrchestrator, scores each potential strategy, builds an ordered chain sorted by confidence, and returns a complete FallbackChain ready for storage. This service ensures that every recorded step has multiple fallback options for reliable playback even when the page changes.

---

## Dependencies

### Uses (imports from)
- `./StrategyScorer`: StrategyScorer for confidence calculation
- `./StrategyChainBuilder`: StrategyChainBuilder for chain construction
- `../../types/strategy`: StrategyType, LocatorStrategy, FallbackChain
- `../../types/vision`: VisionCaptureResult
- `../../contentScript/layers/DOMCapture`: DOMCaptureResult
- `../../contentScript/layers/MouseCapture`: MouseCaptureResult
- `../../contentScript/layers/NetworkCapture`: NetworkCaptureResult

### Used By (exports to)
- `../../contentScript/RecordingOrchestrator`: Generates chains during recording
- `../background.ts`: Message handler delegation

---

## Interfaces

```typescript
/**
 * Captured evidence from all layers
 */
interface CapturedEvidence {
  /** DOM layer capture result */
  domData: DOMCaptureResult;
  /** Vision layer capture result (optional) */
  visionData?: VisionCaptureResult;
  /** Mouse layer capture result (optional) */
  mouseData?: MouseCaptureResult;
  /** Network layer capture result (optional) */
  networkData?: NetworkCaptureResult;
  /** Original event type */
  eventType: 'click' | 'type' | 'select' | 'navigate' | 'scroll';
  /** Input value if applicable */
  value?: string;
  /** Timestamp of capture */
  timestamp: number;
}

/**
 * Strategy candidate before scoring
 */
interface StrategyCandidate {
  /** Strategy type */
  type: StrategyType;
  /** CSS/XPath selector (for DOM strategies) */
  selector?: string;
  /** Strategy metadata */
  metadata: Record<string, any>;
  /** Data source (which layer provided this) */
  source: 'dom' | 'vision' | 'mouse' | 'accessibility' | 'computed';
  /** Raw confidence before weighting */
  rawConfidence: number;
}

/**
 * Generator configuration
 */
interface FallbackChainGeneratorConfig {
  /** Minimum confidence to include strategy (default: 0.3) */
  minConfidence: number;
  /** Maximum strategies per chain (default: 7) */
  maxStrategies: number;
  /** Whether to always include coordinates fallback (default: true) */
  alwaysIncludeCoordinates: boolean;
  /** Whether to generate vision strategy even if DOM works (default: true) */
  alwaysGenerateVision: boolean;
  /** Whether to generate evidence scoring strategy (default: true) */
  generateEvidenceScoring: boolean;
}

/**
 * Chain generation result
 */
interface ChainGenerationResult {
  /** Generated fallback chain */
  chain: FallbackChain;
  /** All candidates considered */
  candidates: StrategyCandidate[];
  /** Candidates that were excluded */
  excludedCandidates: Array<{
    candidate: StrategyCandidate;
    reason: string;
  }>;
  /** Generation metadata */
  metadata: {
    generatedAt: number;
    processingTime: number;
    layersUsed: string[];
  };
}

/**
 * Element context for strategy generation
 */
interface ElementContext {
  /** Element tag name */
  tagName: string;
  /** Whether element has ID */
  hasId: boolean;
  /** Whether element has test ID */
  hasTestId: boolean;
  /** Whether element has accessible name */
  hasAccessibleName: boolean;
  /** Whether element is in form */
  isFormElement: boolean;
  /** Whether element is in shadow DOM */
  isInShadowDOM: boolean;
  /** Whether element has unique selector */
  hasUniqueSelector: boolean;
  /** Computed ARIA role */
  role?: string;
}
```

---

## Functions

```typescript
/**
 * FallbackChainGenerator - Creates fallback chains from captured evidence
 */
class FallbackChainGenerator {
  private config: FallbackChainGeneratorConfig;
  private strategyScorer: StrategyScorer;
  private chainBuilder: StrategyChainBuilder;

  /**
   * Create new FallbackChainGenerator instance
   * @param strategyScorer - Scorer for confidence calculation
   * @param chainBuilder - Builder for chain construction
   * @param config - Generator configuration
   */
  constructor(
    strategyScorer: StrategyScorer,
    chainBuilder: StrategyChainBuilder,
    config?: Partial<FallbackChainGeneratorConfig>
  );

  /**
   * Generate fallback chain from captured evidence
   * @param evidence - Captured evidence from all layers
   * @returns Promise resolving to chain generation result
   */
  async generate(evidence: CapturedEvidence): Promise<ChainGenerationResult>;

  /**
   * Generate strategy candidates from DOM data
   * @param domData - DOM capture result
   * @param context - Element context
   * @returns Array of strategy candidates
   */
  generateDOMStrategies(
    domData: DOMCaptureResult,
    context: ElementContext
  ): StrategyCandidate[];

  /**
   * Generate strategy candidates from CDP/accessibility data
   * @param domData - DOM capture result (contains accessibility info)
   * @param context - Element context
   * @returns Array of strategy candidates
   */
  generateCDPStrategies(
    domData: DOMCaptureResult,
    context: ElementContext
  ): StrategyCandidate[];

  /**
   * Generate vision strategy from OCR data
   * @param visionData - Vision capture result
   * @param domData - DOM data for correlation
   * @returns Strategy candidate or null
   */
  generateVisionStrategy(
    visionData: VisionCaptureResult | undefined,
    domData: DOMCaptureResult
  ): StrategyCandidate | null;

  /**
   * Generate evidence scoring strategy from mouse data
   * @param mouseData - Mouse capture result
   * @param domData - DOM data for attributes
   * @returns Strategy candidate or null
   */
  generateEvidenceScoringStrategy(
    mouseData: MouseCaptureResult | undefined,
    domData: DOMCaptureResult
  ): StrategyCandidate | null;

  /**
   * Generate coordinates fallback strategy
   * @param domData - DOM data with coordinates
   * @returns Strategy candidate
   */
  generateCoordinatesStrategy(domData: DOMCaptureResult): StrategyCandidate;

  /**
   * Analyze element to build context
   * @param domData - DOM capture result
   * @returns Element context
   */
  analyzeElement(domData: DOMCaptureResult): ElementContext;

  /**
   * Filter and sort candidates into final chain
   * @param candidates - All strategy candidates
   * @returns Filtered and sorted candidates
   */
  filterAndSortCandidates(candidates: StrategyCandidate[]): StrategyCandidate[];

  /**
   * Convert candidate to LocatorStrategy
   * @param candidate - Strategy candidate
   * @returns Locator strategy
   */
  candidateToStrategy(candidate: StrategyCandidate): LocatorStrategy;

  /**
   * Validate generated chain
   * @param chain - Chain to validate
   * @returns Validation result with any issues
   */
  validateChain(chain: FallbackChain): {
    valid: boolean;
    issues: string[];
  };

  // Private helper methods
  private generateIdSelector(domData: DOMCaptureResult): StrategyCandidate | null;
  private generateTestIdSelector(domData: DOMCaptureResult): StrategyCandidate | null;
  private generateClassSelector(domData: DOMCaptureResult): StrategyCandidate | null;
  private generateAttributeSelector(domData: DOMCaptureResult): StrategyCandidate | null;
  private generateXPathStrategy(domData: DOMCaptureResult): StrategyCandidate | null;
  private generateRoleStrategy(domData: DOMCaptureResult): StrategyCandidate | null;
  private generateTextStrategy(domData: DOMCaptureResult): StrategyCandidate | null;
  private generateLabelStrategy(domData: DOMCaptureResult): StrategyCandidate | null;
  private generatePlaceholderStrategy(domData: DOMCaptureResult): StrategyCandidate | null;
  private detectDuplicates(candidates: StrategyCandidate[]): StrategyCandidate[];
  private estimateSelectorUniqueness(selector: string): number;
}

export {
  FallbackChainGenerator,
  FallbackChainGeneratorConfig,
  CapturedEvidence,
  StrategyCandidate,
  ChainGenerationResult,
  ElementContext
};
```

---

## Key Implementation Details

### Constructor and Configuration
```typescript
constructor(
  strategyScorer: StrategyScorer,
  chainBuilder: StrategyChainBuilder,
  config?: Partial<FallbackChainGeneratorConfig>
) {
  this.strategyScorer = strategyScorer;
  this.chainBuilder = chainBuilder;
  this.config = {
    minConfidence: config?.minConfidence ?? 0.3,
    maxStrategies: config?.maxStrategies ?? 7,
    alwaysIncludeCoordinates: config?.alwaysIncludeCoordinates ?? true,
    alwaysGenerateVision: config?.alwaysGenerateVision ?? true,
    generateEvidenceScoring: config?.generateEvidenceScoring ?? true
  };
}
```

### Main Generate Method
```typescript
async generate(evidence: CapturedEvidence): Promise<ChainGenerationResult> {
  const startTime = Date.now();
  const candidates: StrategyCandidate[] = [];
  const excludedCandidates: ChainGenerationResult['excludedCandidates'] = [];
  const layersUsed: string[] = ['dom']; // DOM is always used

  // Analyze element context
  const context = this.analyzeElement(evidence.domData);

  // 1. Generate DOM strategies
  const domStrategies = this.generateDOMStrategies(evidence.domData, context);
  candidates.push(...domStrategies);

  // 2. Generate CDP/Accessibility strategies
  const cdpStrategies = this.generateCDPStrategies(evidence.domData, context);
  candidates.push(...cdpStrategies);

  // 3. Generate Vision strategy (if vision data available)
  if (evidence.visionData || this.config.alwaysGenerateVision) {
    const visionStrategy = this.generateVisionStrategy(
      evidence.visionData,
      evidence.domData
    );
    if (visionStrategy) {
      candidates.push(visionStrategy);
      layersUsed.push('vision');
    }
  }

  // 4. Generate Evidence Scoring strategy (if mouse data available)
  if (evidence.mouseData && this.config.generateEvidenceScoring) {
    const evidenceStrategy = this.generateEvidenceScoringStrategy(
      evidence.mouseData,
      evidence.domData
    );
    if (evidenceStrategy) {
      candidates.push(evidenceStrategy);
      layersUsed.push('mouse');
    }
  }

  // 5. Always add coordinates fallback
  if (this.config.alwaysIncludeCoordinates) {
    candidates.push(this.generateCoordinatesStrategy(evidence.domData));
  }

  // Track network layer usage
  if (evidence.networkData) {
    layersUsed.push('network');
  }

  // Score all candidates
  const scoredCandidates = candidates.map(candidate => ({
    ...candidate,
    rawConfidence: this.strategyScorer.scoreCandidate(candidate, context)
  }));

  // Filter and sort candidates
  const filteredCandidates = this.filterAndSortCandidates(scoredCandidates);

  // Track excluded candidates
  for (const candidate of scoredCandidates) {
    if (!filteredCandidates.includes(candidate)) {
      excludedCandidates.push({
        candidate,
        reason: candidate.rawConfidence < this.config.minConfidence
          ? `Confidence ${candidate.rawConfidence.toFixed(2)} below threshold ${this.config.minConfidence}`
          : 'Duplicate or lower priority'
      });
    }
  }

  // Build final chain
  const strategies = filteredCandidates
    .slice(0, this.config.maxStrategies)
    .map(c => this.candidateToStrategy(c));

  const chain: FallbackChain = {
    strategies,
    primaryStrategy: strategies[0]?.type || 'coordinates',
    recordedAt: evidence.timestamp
  };

  // Validate chain
  const validation = this.validateChain(chain);
  if (!validation.valid) {
    console.warn('[FallbackChainGenerator] Chain validation issues:', validation.issues);
  }

  return {
    chain,
    candidates: scoredCandidates,
    excludedCandidates,
    metadata: {
      generatedAt: Date.now(),
      processingTime: Date.now() - startTime,
      layersUsed
    }
  };
}
```

### Element Context Analysis
```typescript
analyzeElement(domData: DOMCaptureResult): ElementContext {
  const formElements = ['input', 'select', 'textarea', 'button'];
  const tagName = domData.tagName.toLowerCase();

  return {
    tagName,
    hasId: !!domData.id && domData.id.length > 0,
    hasTestId: !!domData.testId,
    hasAccessibleName: !!domData.accessibleName && domData.accessibleName.length > 0,
    isFormElement: formElements.includes(tagName),
    isInShadowDOM: domData.isInShadowDOM,
    hasUniqueSelector: !!domData.uniqueSelector,
    role: domData.role || this.getImplicitRole(tagName)
  };
}

private getImplicitRole(tagName: string): string | undefined {
  const roleMap: Record<string, string> = {
    'button': 'button',
    'a': 'link',
    'input': 'textbox',
    'select': 'combobox',
    'textarea': 'textbox',
    'img': 'img',
    'nav': 'navigation',
    'main': 'main',
    'header': 'banner',
    'footer': 'contentinfo',
    'form': 'form',
    'table': 'table'
  };
  return roleMap[tagName];
}
```

### DOM Strategy Generation
```typescript
generateDOMStrategies(
  domData: DOMCaptureResult,
  context: ElementContext
): StrategyCandidate[] {
  const candidates: StrategyCandidate[] = [];

  // 1. ID selector (highest priority for DOM)
  const idStrategy = this.generateIdSelector(domData);
  if (idStrategy) {
    candidates.push(idStrategy);
  }

  // 2. Test ID selector
  const testIdStrategy = this.generateTestIdSelector(domData);
  if (testIdStrategy) {
    candidates.push(testIdStrategy);
  }

  // 3. Unique selector (if available)
  if (domData.uniqueSelector) {
    candidates.push({
      type: 'dom_selector',
      selector: domData.uniqueSelector,
      metadata: { selectorType: 'unique' },
      source: 'dom',
      rawConfidence: 0.85
    });
  }

  // 4. Class-based selector
  const classStrategy = this.generateClassSelector(domData);
  if (classStrategy) {
    candidates.push(classStrategy);
  }

  // 5. Attribute selector
  const attrStrategy = this.generateAttributeSelector(domData);
  if (attrStrategy) {
    candidates.push(attrStrategy);
  }

  // 6. XPath strategy
  const xpathStrategy = this.generateXPathStrategy(domData);
  if (xpathStrategy) {
    candidates.push(xpathStrategy);
  }

  // 7. CSS path selector (always available)
  candidates.push({
    type: 'css_selector',
    selector: domData.selector,
    metadata: { selectorType: 'path' },
    source: 'dom',
    rawConfidence: 0.70
  });

  return candidates;
}

private generateIdSelector(domData: DOMCaptureResult): StrategyCandidate | null {
  if (!domData.id) return null;

  // Check if ID looks stable (not auto-generated)
  const isStableId = !domData.id.match(/^(ember|react|ng-|_|[a-z]{1,2}\d+)/i);

  return {
    type: 'dom_selector',
    selector: `#${CSS.escape(domData.id)}`,
    metadata: {
      selectorType: 'id',
      isStable: isStableId
    },
    source: 'dom',
    rawConfidence: isStableId ? 0.90 : 0.60
  };
}

private generateTestIdSelector(domData: DOMCaptureResult): StrategyCandidate | null {
  if (!domData.testId) return null;

  return {
    type: 'dom_selector',
    selector: `[data-testid="${CSS.escape(domData.testId)}"]`,
    metadata: {
      selectorType: 'testId',
      testId: domData.testId
    },
    source: 'dom',
    rawConfidence: 0.95 // Test IDs are very reliable
  };
}

private generateClassSelector(domData: DOMCaptureResult): StrategyCandidate | null {
  if (!domData.classList || domData.classList.length === 0) return null;

  // Filter out dynamic/generated classes
  const stableClasses = domData.classList.filter(c =>
    !c.startsWith('ng-') &&
    !c.startsWith('_') &&
    !c.match(/^[a-z]{1,3}\d+/) && // CSS-in-JS hashes
    !c.match(/active|selected|hover|focus|disabled/) // State classes
  );

  if (stableClasses.length === 0) return null;

  const selector = `${domData.tagName.toLowerCase()}.${stableClasses.slice(0, 2).map(c => CSS.escape(c)).join('.')}`;

  return {
    type: 'css_selector',
    selector,
    metadata: {
      selectorType: 'class',
      classes: stableClasses
    },
    source: 'dom',
    rawConfidence: 0.65
  };
}

private generateAttributeSelector(domData: DOMCaptureResult): StrategyCandidate | null {
  // Look for stable attributes
  const stableAttrs = ['name', 'type', 'href', 'src', 'alt', 'title', 'placeholder'];
  
  for (const attr of stableAttrs) {
    const value = domData.attributes[attr];
    if (value && value.length < 100) {
      const selector = `${domData.tagName.toLowerCase()}[${attr}="${CSS.escape(value)}"]`;
      return {
        type: 'css_selector',
        selector,
        metadata: {
          selectorType: 'attribute',
          attribute: attr,
          value
        },
        source: 'dom',
        rawConfidence: 0.70
      };
    }
  }

  return null;
}
```

### CDP Strategy Generation
```typescript
generateCDPStrategies(
  domData: DOMCaptureResult,
  context: ElementContext
): StrategyCandidate[] {
  const candidates: StrategyCandidate[] = [];

  // 1. Role + Name (cdp_semantic - highest confidence)
  const roleStrategy = this.generateRoleStrategy(domData);
  if (roleStrategy) {
    candidates.push(roleStrategy);
  }

  // 2. Text content (cdp_power)
  const textStrategy = this.generateTextStrategy(domData);
  if (textStrategy) {
    candidates.push(textStrategy);
  }

  // 3. Label (cdp_power)
  const labelStrategy = this.generateLabelStrategy(domData);
  if (labelStrategy) {
    candidates.push(labelStrategy);
  }

  // 4. Placeholder (cdp_power)
  const placeholderStrategy = this.generatePlaceholderStrategy(domData);
  if (placeholderStrategy) {
    candidates.push(placeholderStrategy);
  }

  return candidates;
}

private generateRoleStrategy(domData: DOMCaptureResult): StrategyCandidate | null {
  const role = domData.role || this.getImplicitRole(domData.tagName.toLowerCase());
  if (!role) return null;

  const name = domData.accessibleName;

  return {
    type: 'cdp_semantic',
    metadata: {
      role,
      name: name || undefined
    },
    source: 'accessibility',
    rawConfidence: name ? 0.95 : 0.75
  };
}

private generateTextStrategy(domData: DOMCaptureResult): StrategyCandidate | null {
  const text = domData.textContent || domData.innerText;
  if (!text || text.length === 0 || text.length > 100) return null;

  return {
    type: 'cdp_power',
    metadata: {
      text: text.trim().slice(0, 100)
    },
    source: 'accessibility',
    rawConfidence: 0.80
  };
}

private generateLabelStrategy(domData: DOMCaptureResult): StrategyCandidate | null {
  // Check for form element with label
  if (!domData.accessibleName) return null;
  
  const formElements = ['input', 'select', 'textarea'];
  if (!formElements.includes(domData.tagName.toLowerCase())) return null;

  return {
    type: 'cdp_power',
    metadata: {
      label: domData.accessibleName
    },
    source: 'accessibility',
    rawConfidence: 0.85
  };
}

private generatePlaceholderStrategy(domData: DOMCaptureResult): StrategyCandidate | null {
  const placeholder = domData.placeholder || domData.attributes['placeholder'];
  if (!placeholder) return null;

  return {
    type: 'cdp_power',
    metadata: {
      placeholder
    },
    source: 'dom',
    rawConfidence: 0.80
  };
}
```

### Vision Strategy Generation
```typescript
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

  // If no vision data but we have text content, create a potential vision strategy
  if (this.config.alwaysGenerateVision) {
    const text = domData.textContent || domData.innerText || domData.accessibleName;
    if (text && text.length > 0 && text.length < 50) {
      return {
        type: 'vision_ocr',
        metadata: {
          targetText: text.trim(),
          ocrConfidence: 70 // Estimated
        },
        source: 'computed',
        rawConfidence: 0.70
      };
    }
  }

  return null;
}
```

### Evidence Scoring Strategy
```typescript
generateEvidenceScoringStrategy(
  mouseData: MouseCaptureResult | undefined,
  domData: DOMCaptureResult
): StrategyCandidate | null {
  if (!mouseData || mouseData.trail.length === 0) return null;

  return {
    type: 'evidence_scoring',
    metadata: {
      endpoint: mouseData.endpoint,
      mouseTrail: mouseData.trail.slice(-10), // Last 10 points
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
```

### Coordinates Strategy (Always Available)
```typescript
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
```

### Filter and Sort Candidates
```typescript
filterAndSortCandidates(candidates: StrategyCandidate[]): StrategyCandidate[] {
  // Remove duplicates
  const uniqueCandidates = this.detectDuplicates(candidates);

  // Filter by minimum confidence
  const filtered = uniqueCandidates.filter(c => c.rawConfidence >= this.config.minConfidence);

  // Sort by confidence (highest first)
  return filtered.sort((a, b) => b.rawConfidence - a.rawConfidence);
}

private detectDuplicates(candidates: StrategyCandidate[]): StrategyCandidate[] {
  const seen = new Set<string>();
  const unique: StrategyCandidate[] = [];

  for (const candidate of candidates) {
    // Create a key based on type and selector/metadata
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
```

### Convert Candidate to Strategy
```typescript
candidateToStrategy(candidate: StrategyCandidate): LocatorStrategy {
  return {
    type: candidate.type,
    selector: candidate.selector,
    confidence: candidate.rawConfidence,
    metadata: candidate.metadata
  };
}
```

### Chain Validation
```typescript
validateChain(chain: FallbackChain): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (chain.strategies.length === 0) {
    issues.push('Chain has no strategies');
  }

  if (!chain.primaryStrategy) {
    issues.push('Chain has no primary strategy');
  }

  // Check for at least one reliable strategy
  const hasReliable = chain.strategies.some(s => s.confidence >= 0.7);
  if (!hasReliable) {
    issues.push('No strategy with confidence >= 0.7');
  }

  // Check for coordinates fallback
  const hasCoordinates = chain.strategies.some(s => s.type === 'coordinates');
  if (!hasCoordinates && this.config.alwaysIncludeCoordinates) {
    issues.push('Missing coordinates fallback');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
```

---

## Integration Points

### With RecordingOrchestrator
```typescript
// In RecordingOrchestrator
class RecordingOrchestrator {
  private chainGenerator: FallbackChainGenerator;

  async generateFallbackChain(
    element: HTMLElement,
    capturedData: {
      domData: DOMCaptureResult;
      visionData?: VisionCaptureResult;
      mouseData?: MouseCaptureResult;
      networkData?: NetworkCaptureResult;
    }
  ): Promise<FallbackChain> {
    const result = await this.chainGenerator.generate({
      domData: capturedData.domData,
      visionData: capturedData.visionData,
      mouseData: capturedData.mouseData,
      networkData: capturedData.networkData,
      eventType: 'click',
      timestamp: Date.now()
    });

    return result.chain;
  }
}
```

### With Background Script
```typescript
// background.ts message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GENERATE_FALLBACK_CHAIN') {
    chainGenerator.generate(message.evidence)
      .then(result => sendResponse(result.chain));
    return true;
  }
});
```

---

## Acceptance Criteria

- [ ] Generates DOM strategies from selector data
- [ ] Generates CDP semantic strategies from role/name
- [ ] Generates CDP power strategies from text/label/placeholder
- [ ] Generates Vision OCR strategy from OCR data
- [ ] Generates Evidence Scoring strategy from mouse trail
- [ ] Always includes coordinates fallback (configurable)
- [ ] Filters candidates below minimum confidence
- [ ] Removes duplicate strategies
- [ ] Sorts strategies by confidence (highest first)
- [ ] Limits chain to maxStrategies
- [ ] Validates generated chains
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Element with no identifiers**: Falls back to XPath and coordinates
2. **Dynamic IDs**: Detect and score lower
3. **Shadow DOM elements**: Use shadow host chain
4. **SVG elements**: Handle differently than HTML
5. **Canvas elements**: Force vision strategy
6. **Contenteditable**: Handle like form element
7. **Iframes**: Include iframe chain context
8. **No text content**: Skip text-based strategies
9. **Very long text**: Truncate and lower confidence
10. **Multiple matching elements**: Lower selector confidence

---

## Estimated Lines

400-480 lines
