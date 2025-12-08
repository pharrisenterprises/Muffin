# Phase 3 Strategy Evaluators Rollup

**Generated:** December 7, 2025  
**Included Specs:** D1-D5, H5 (6 specifications)  
**Purpose:** Complete 7-tier strategy evaluation system for element location

---

## Table of Contents

- [D1: DOMStrategy](#d1-domstrategy) - DOM/CSS selector strategy
- [D2: CDPStrategy](#d2-cdpstrategy) - CDP semantic/power locators  
- [D3: VisionStrategy](#d3-visionstrategy) - Vision OCR text matching
- [D4: CoordinatesStrategy](#d4-coordinatesstrategy) - X,Y coordinate fallback
- [D5: EvidenceScoring](#d5-evidencescoring) - Evidence-based scoring
- [H5: Strategies Index](#h5-strategies-index) - Strategy exports

---

## D1: DOMStrategy
**File:** `src/background/services/strategies/DOMStrategy.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Generates dom_selector and css_selector strategies from DOM capture data. Produces ID-based, data-testid, unique class, and CSS path selectors.

### Strategy Types Generated
1. **dom_selector** (0.85 confidence) - ID, data-testid, unique attributes
2. **css_selector** (0.75 confidence) - CSS path selectors

### Selector Priority
```typescript
// dom_selector candidates (best to worst):
1. #elementId                    // ID selector
2. [data-testid="value"]        // Test ID
3. [name="unique-name"]         // Unique name
4. .unique-class                // Unique class
5. input[type="email"]          // Type + tag

// css_selector candidates:
6. div > form > input:nth-child(2)  // CSS path
7. .container .form .field          // Class path
```

### Core Methods
```typescript
class DOMStrategy implements StrategyEvaluator {
  readonly handledTypes = ['dom_selector', 'css_selector'];
  
  async evaluate(action: BufferedAction): Promise<StrategyCandidate[]> {
    const candidates: StrategyCandidate[] = [];
    const domData = action.domData;
    
    // Try ID selector
    if (domData.element.id) {
      candidates.push({
        type: 'dom_selector',
        selector: `#${domData.element.id}`,
        confidence: 0.90,
        metadata: { selectorType: 'id' }
      });
    }
    
    // Try data-testid
    if (domData.element.dataAttributes['data-testid']) {
      candidates.push({
        type: 'dom_selector',
        selector: `[data-testid="${domData.element.dataAttributes['data-testid']}"]`,
        confidence: 0.88,
        metadata: { selectorType: 'data-testid' }
      });
    }
    
    // Generate CSS path
    const cssPath = this.generateCSSPath(domData);
    candidates.push({
      type: 'css_selector',
      selector: cssPath,
      confidence: 0.75,
      metadata: { selectorType: 'css-path' }
    });
    
    return candidates;
  }
  
  generateCSSPath(domData: DOMCaptureResult): string {
    // Generate hierarchical CSS selector
  }
  
  testUniqueness(selector: string): boolean {
    // Verify selector matches single element
  }
}
```

### Dependencies
- **Uses:** DOMCaptureResult (E3), StrategyCandidate (E1)
- **Used By:** FallbackChainGenerator (C2)

---

## D2: CDPStrategy
**File:** `src/background/services/strategies/CDPStrategy.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Generates cdp_semantic and cdp_power strategies using Chrome DevTools Protocol and accessibility tree. Produces Playwright-style locators.

### Strategy Types Generated
1. **cdp_semantic** (0.95 confidence) - getByRole with accessible name
2. **cdp_power** (0.90 confidence) - getByText, getByLabel, getByPlaceholder

### Locator Examples
```typescript
// cdp_semantic (highest confidence):
getByRole('button', { name: 'Submit Form' })
getByRole('textbox', { name: 'Email Address' })
getByRole('checkbox', { name: 'Accept terms' })

// cdp_power (high confidence):
getByText('Click here')
getByLabel('Username')
getByPlaceholder('Enter your email')
getByTitle('Close dialog')
```

### Core Methods
```typescript
class CDPStrategy implements StrategyEvaluator {
  readonly handledTypes = ['cdp_semantic', 'cdp_power'];
  
  constructor(
    private accessibilityService: AccessibilityService,
    private playwrightLocators: PlaywrightLocators
  ) {}
  
  async evaluate(action: BufferedAction, tabId: number): Promise<StrategyCandidate[]> {
    const candidates: StrategyCandidate[] = [];
    const domData = action.domData;
    
    // Get accessibility node
    const axNode = await this.accessibilityService.getAXNodeForDOMNode(
      tabId,
      domData.element.nodeId
    );
    
    if (axNode?.role && axNode?.name) {
      // Generate cdp_semantic
      candidates.push({
        type: 'cdp_semantic',
        selector: `getByRole('${axNode.role}', { name: '${axNode.name}' })`,
        confidence: 0.95,
        metadata: {
          role: axNode.role,
          name: axNode.name,
          locatorType: 'semantic'
        }
      });
    }
    
    // Generate cdp_power locators
    const powerLocators = await this.playwrightLocators.generateForNode(tabId, domData.element.nodeId);
    candidates.push(...powerLocators.map(loc => ({
      type: 'cdp_power' as StrategyType,
      selector: loc.selector,
      confidence: 0.90,
      metadata: loc.metadata
    })));
    
    return candidates;
  }
}
```

### Dependencies
- **Uses:** AccessibilityService (B2), PlaywrightLocators (B3), AXNode (E2)
- **Used By:** FallbackChainGenerator (C2)

---

## D3: VisionStrategy
**File:** `src/background/services/strategies/VisionStrategy.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Generates vision_ocr strategies from vision capture data. Uses OCR text extraction to locate elements by visible text when DOM/CDP methods fail.

### Strategy Type Generated
- **vision_ocr** (0.70 confidence) - Text-based visual matching

### When Vision Strategy Excels
- Dynamic content with unstable DOM
- Canvas/SVG text rendering
- Shadow DOM with closed roots
- Text that changes but stays visually similar
- Heavily obfuscated class names

### Core Methods
```typescript
class VisionStrategy implements StrategyEvaluator {
  readonly handledTypes = ['vision_ocr'];
  
  constructor(private visionService: VisionService) {}
  
  async evaluate(action: BufferedAction): Promise<StrategyCandidate[]> {
    const candidates: StrategyCandidate[] = [];
    const visionData = action.visionData;
    
    if (!visionData || !visionData.ocrText) {
      return candidates;
    }
    
    // Extract OCR text near click point
    const clickPoint = { x: action.domData.x, y: action.domData.y };
    const nearbyText = this.findNearbyText(visionData.ocrResults, clickPoint);
    
    if (nearbyText && nearbyText.confidence > 60) {
      candidates.push({
        type: 'vision_ocr',
        selector: nearbyText.text,
        confidence: nearbyText.confidence / 100,
        metadata: {
          ocrText: nearbyText.text,
          ocrConfidence: nearbyText.confidence,
          bbox: nearbyText.bbox,
          clickOffset: {
            x: clickPoint.x - nearbyText.bbox.x,
            y: clickPoint.y - nearbyText.bbox.y
          }
        }
      });
    }
    
    return candidates;
  }
  
  findNearbyText(ocrResults: OCRResult[], clickPoint: Point): OCRResult | null {
    // Find text closest to click point within threshold
    const DISTANCE_THRESHOLD = 50; // pixels
    
    let closest: OCRResult | null = null;
    let minDistance = Infinity;
    
    for (const result of ocrResults) {
      const distance = this.calculateDistance(result.bbox, clickPoint);
      if (distance < DISTANCE_THRESHOLD && distance < minDistance) {
        closest = result;
        minDistance = distance;
      }
    }
    
    return closest;
  }
}
```

### Dependencies
- **Uses:** VisionService (B5), VisionCaptureResult (E3), OCRResult (E4)
- **Used By:** FallbackChainGenerator (C2)

---

## D4: CoordinatesStrategy
**File:** `src/background/services/strategies/CoordinatesStrategy.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Generates coordinates strategy as last-resort fallback. Uses X,Y coordinates from mouse capture data to click at absolute or relative positions.

### Strategy Type Generated
- **coordinates** (0.60 confidence) - X,Y position-based clicking

### Coordinate Types
```typescript
// Viewport-relative (preferred)
{ x: 450, y: 320, relative: 'viewport' }

// Element-relative (more resilient)
{ x: 12, y: 8, relative: 'parent', parentSelector: '#container' }

// Document-relative (absolute)
{ x: 1200, y: 850, relative: 'document' }
```

### When Coordinates Strategy Used
- All other strategies failed
- Highly dynamic UI with no stable selectors
- Canvas-based interfaces
- Custom-rendered controls
- Last resort before test failure

### Core Methods
```typescript
class CoordinatesStrategy implements StrategyEvaluator {
  readonly handledTypes = ['coordinates'];
  
  async evaluate(action: BufferedAction): Promise<StrategyCandidate[]> {
    const candidates: StrategyCandidate[] = [];
    const mouseData = action.mouseData;
    const domData = action.domData;
    
    if (!mouseData) {
      return candidates;
    }
    
    // Viewport-relative coordinates
    candidates.push({
      type: 'coordinates',
      selector: '',
      confidence: 0.60,
      metadata: {
        x: mouseData.endpoint.x,
        y: mouseData.endpoint.y,
        relative: 'viewport',
        mousePattern: mouseData.pattern,
        hesitationPoints: mouseData.hesitationPoints.length
      }
    });
    
    // Try element-relative if parent available
    if (domData?.element?.parent) {
      const parentRect = domData.boundingRect;
      const relX = mouseData.endpoint.x - parentRect.x;
      const relY = mouseData.endpoint.y - parentRect.y;
      
      candidates.push({
        type: 'coordinates',
        selector: '',
        confidence: 0.65,
        metadata: {
          x: relX,
          y: relY,
          relative: 'element',
          parentSelector: this.getParentSelector(domData.element.parent),
          mousePattern: mouseData.pattern
        }
      });
    }
    
    return candidates;
  }
}
```

### Dependencies
- **Uses:** MouseCaptureResult (E3), StrategyCandidate (E1)
- **Used By:** FallbackChainGenerator (C2)

---

## D5: EvidenceScoring
**File:** `src/background/services/strategies/EvidenceScoring.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Generates evidence_scoring strategy by analyzing mouse trail patterns and element attributes. Uses behavioral evidence to improve selector confidence.

### Strategy Type Generated
- **evidence_scoring** (0.80 confidence) - Mouse trail + attribute matching

### Evidence Factors
1. **Mouse Pattern** - Direct, curved, searching, hesitant
2. **Hover Time** - Time spent hovering before click
3. **Trail Curvature** - Straightness of mouse path
4. **Attribute Density** - Number of identifying attributes
5. **Text Similarity** - Match between labels and OCR

### Scoring Algorithm
```typescript
evidenceScore = 
  (mousePatternScore * 0.3) +
  (attributeDensityScore * 0.3) +
  (textSimilarityScore * 0.2) +
  (hoverTimeScore * 0.2);
```

### Core Methods
```typescript
class EvidenceScoring implements StrategyEvaluator {
  readonly handledTypes = ['evidence_scoring'];
  
  async evaluate(action: BufferedAction): Promise<StrategyCandidate[]> {
    const candidates: StrategyCandidate[] = [];
    
    const mouseScore = this.scoreMousePattern(action.mouseData);
    const attrScore = this.scoreAttributes(action.domData);
    const textScore = this.scoreTextSimilarity(action.domData, action.visionData);
    
    const combinedScore = (
      mouseScore * 0.4 +
      attrScore * 0.3 +
      textScore * 0.3
    );
    
    // Only add if evidence is strong enough
    if (combinedScore > 0.60) {
      candidates.push({
        type: 'evidence_scoring',
        selector: this.buildCompositeSelector(action.domData),
        confidence: combinedScore,
        metadata: {
          mousePattern: action.mouseData?.pattern,
          mouseScore,
          attrScore,
          textScore,
          hoverTime: action.mouseData?.duration,
          trailCurvature: action.mouseData?.curvature
        }
      });
    }
    
    return candidates;
  }
  
  scoreMousePattern(mouseData: MouseCaptureResult | null): number {
    if (!mouseData) return 0;
    
    switch (mouseData.pattern) {
      case 'direct': return 0.90;      // High confidence
      case 'curved': return 0.80;      // Good confidence
      case 'hesitant': return 0.60;    // Lower confidence
      case 'searching': return 0.40;   // Low confidence
      case 'corrective': return 0.50;  // Medium confidence
      default: return 0.50;
    }
  }
  
  scoreAttributes(domData: DOMCaptureResult | null): number {
    if (!domData) return 0;
    
    const element = domData.element;
    let score = 0;
    
    // ID is strongest
    if (element.id) score += 0.40;
    
    // data-testid is very strong
    if (element.dataAttributes['data-testid']) score += 0.35;
    
    // name attribute is good
    if (element.name) score += 0.25;
    
    // ARIA attributes are valuable
    if (element.ariaLabel || element.ariaRole) score += 0.20;
    
    // Unique class names help
    if (element.classList.length > 0 && element.classList.length < 3) score += 0.15;
    
    // Cap at 1.0
    return Math.min(score, 1.0);
  }
  
  scoreTextSimilarity(domData: DOMCaptureResult | null, visionData: VisionCaptureResult | null): number {
    if (!domData || !visionData) return 0;
    
    const domText = domData.element.textContent || domData.element.innerText || '';
    const ocrText = visionData.ocrText || '';
    
    if (!domText || !ocrText) return 0;
    
    // Simple similarity check (could use Levenshtein distance)
    const similarity = this.calculateTextSimilarity(domText, ocrText);
    return similarity;
  }
}
```

### Dependencies
- **Uses:** DOMCaptureResult, MouseCaptureResult, VisionCaptureResult (E3)
- **Used By:** FallbackChainGenerator (C2)

---

## H5: Strategies Index
**File:** `src/background/services/strategies/index.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Central export file for all strategy evaluators. Provides single import point and defines StrategyEvaluator interface.

### Implementation
```typescript
/**
 * ============================================================================
 * STRATEGY EVALUATOR INTERFACE
 * ============================================================================
 */

import { StrategyType, LocatorStrategy, StrategyCandidate } from '../../../types/strategy';
import { BufferedAction } from '../../../types/recording';

/**
 * Common interface for all strategy evaluators
 */
export interface StrategyEvaluator {
  /**
   * Strategy types this evaluator handles
   */
  readonly handledTypes: StrategyType[];
  
  /**
   * Evaluate captured action and generate strategy candidates
   * @param action - Buffered action with evidence from all layers
   * @param context - Optional evaluation context (tabId, etc.)
   * @returns Array of strategy candidates with confidence scores
   */
  evaluate(action: BufferedAction, context?: EvaluationContext): Promise<StrategyCandidate[]>;
}

/**
 * Evaluation context
 */
export interface EvaluationContext {
  tabId: number;
  sessionId: string;
  timestamp: number;
}

/**
 * ============================================================================
 * STRATEGY EVALUATOR EXPORTS
 * ============================================================================
 */

export { DOMStrategy } from './DOMStrategy';
export { CDPStrategy } from './CDPStrategy';
export { VisionStrategy } from './VisionStrategy';
export { CoordinatesStrategy } from './CoordinatesStrategy';
export { EvidenceScoring } from './EvidenceScoring';

/**
 * Factory function to create all strategy evaluators
 */
export function createStrategyEvaluators(deps: {
  accessibilityService: AccessibilityService;
  playwrightLocators: PlaywrightLocators;
  visionService: VisionService;
}): StrategyEvaluator[] {
  return [
    new DOMStrategy(),
    new CDPStrategy(deps.accessibilityService, deps.playwrightLocators),
    new VisionStrategy(deps.visionService),
    new CoordinatesStrategy(),
    new EvidenceScoring()
  ];
}
```

### Dependencies
- **Exports To:** FallbackChainGenerator (C2), background services index (H1)

---

## Strategy System Architecture

### 7-Tier Fallback Chain

```
┌─────────────────────────────────────────────┐
│  Priority 1: cdp_semantic (0.95)           │
│  getByRole('button', { name: 'Submit' })   │
└─────────────────┬───────────────────────────┘
                  │ ↓ (if fails)
┌─────────────────┴───────────────────────────┐
│  Priority 2: cdp_power (0.90)              │
│  getByText('Submit'), getByLabel('Email')  │
└─────────────────┬───────────────────────────┘
                  │ ↓ (if fails)
┌─────────────────┴───────────────────────────┐
│  Priority 3: dom_selector (0.85)           │
│  #submit-btn, [data-testid="submit"]       │
└─────────────────┬───────────────────────────┘
                  │ ↓ (if fails)
┌─────────────────┴───────────────────────────┐
│  Priority 4: evidence_scoring (0.80)       │
│  .btn-primary (with high mouse confidence) │
└─────────────────┬───────────────────────────┘
                  │ ↓ (if fails)
┌─────────────────┴───────────────────────────┐
│  Priority 5: css_selector (0.75)           │
│  div > form > button:nth-child(2)          │
└─────────────────┬───────────────────────────┘
                  │ ↓ (if fails)
┌─────────────────┴───────────────────────────┐
│  Priority 6: vision_ocr (0.70)             │
│  "Submit" text via OCR matching            │
└─────────────────┬───────────────────────────┘
                  │ ↓ (if fails)
┌─────────────────┴───────────────────────────┐
│  Priority 7: coordinates (0.60)            │
│  Click at (x: 450, y: 320)                 │
└─────────────────────────────────────────────┘
```

### Strategy Selection Flow

```
BufferedAction (from EvidenceBuffer)
         │
         ↓
    FallbackChainGenerator
         │
         ├──> DOMStrategy → [dom_selector, css_selector]
         ├──> CDPStrategy → [cdp_semantic, cdp_power]
         ├──> VisionStrategy → [vision_ocr]
         ├──> CoordinatesStrategy → [coordinates]
         └──> EvidenceScoring → [evidence_scoring]
         │
         ↓
    StrategyScorer (score all candidates)
         │
         ↓
    StrategyChainBuilder (select 5-7 best)
         │
         ↓
    FallbackChain (saved with recorded step)
```

### Evidence Requirements by Strategy

| Strategy | Required Evidence | Optional Evidence |
|----------|------------------|-------------------|
| dom_selector | DOM capture | - |
| css_selector | DOM capture | - |
| cdp_semantic | DOM capture, CDP attached | Accessibility tree |
| cdp_power | DOM capture, CDP attached | Accessibility tree |
| evidence_scoring | DOM capture, mouse trail | Vision, network |
| vision_ocr | Vision capture (OCR) | DOM for context |
| coordinates | Mouse trail | DOM for relative coords |

---

## Implementation Order

### Week 3: Strategy Evaluators
1. **D1** - DOMStrategy (simplest, no external deps)
2. **D2** - CDPStrategy (requires B2, B3)
3. **D3** - VisionStrategy (requires B5)
4. **D4** - CoordinatesStrategy (simple)
5. **D5** - EvidenceScoring (combines all evidence)
6. **H5** - Strategies index

**Verification:** Each evaluator returns candidates with correct confidence scores

---

## Success Criteria

- [ ] All 6 strategy files created in `src/background/services/strategies/`
- [ ] DOMStrategy generates ID, data-testid, CSS selectors
- [ ] CDPStrategy generates semantic and power locators
- [ ] VisionStrategy generates OCR text matches
- [ ] CoordinatesStrategy generates X,Y fallbacks
- [ ] EvidenceScoring combines mouse + attributes
- [ ] H5 exports all evaluators with factory function
- [ ] Unit tests pass for each evaluator

---

**Status:** Ready for implementation  
**Next Step:** Implement D1-D5 after B1-B5 complete, then integrate with C2
