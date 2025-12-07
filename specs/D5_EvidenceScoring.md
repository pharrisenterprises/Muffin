# EvidenceScoring Strategy Evaluator Specification

**File ID:** D5  
**File Path:** `src/background/services/strategies/EvidenceScoring.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Implements the EvidenceScoring strategy evaluator (evidence_scoring type, weight 0.80) that uses captured mouse trail patterns and element attributes to locate elements during playback. This strategy bridges vision and DOM approaches by using behavioral evidence (how the user navigated to the element) combined with attribute matching to find the most likely target. Particularly effective when DOM structure changes but user interaction patterns remain consistent.

---

## Dependencies

### Uses (imports from)
- `../../types/strategy`: LocatorStrategy, StrategyEvaluationResult, EvidenceScoringMetadata, isEvidenceScoringMetadata
- `../../types/cdp`: CDPNode, BoxModel, BoundingRect
- `../CDPService`: CDPService
- `./StrategyEvaluator`: StrategyEvaluator interface

### Used By (exports to)
- `../DecisionEngine`: Strategy evaluation

---

## Interfaces

```typescript
import {
  LocatorStrategy,
  StrategyEvaluationResult,
  StrategyType,
  EvidenceScoringMetadata,
  isEvidenceScoringMetadata
} from '../../types/strategy';
import { CDPNode, BoxModel, BoundingRect } from '../../types/cdp';
import { CDPService } from '../CDPService';

/**
 * Strategy evaluator interface
 */
interface StrategyEvaluator {
  handledTypes: StrategyType[];
  handles(type: StrategyType): boolean;
  evaluate(
    tabId: number,
    strategy: LocatorStrategy
  ): Promise<StrategyEvaluationResult>;
}

/**
 * EvidenceScoring configuration
 */
interface EvidenceScoringConfig {
  /** Maximum radius to search from endpoint (pixels) */
  searchRadius: number;
  /** Minimum score to consider a match (0-1) */
  minMatchScore: number;
  /** Weight for tag name match */
  tagWeight: number;
  /** Weight for ID match */
  idWeight: number;
  /** Weight for class overlap */
  classWeight: number;
  /** Weight for position proximity */
  positionWeight: number;
  /** Weight for mouse pattern alignment */
  patternWeight: number;
  /** Maximum elements to evaluate */
  maxCandidates: number;
  /** Whether to use trail direction */
  useTrailDirection: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: EvidenceScoringConfig = {
  searchRadius: 50,
  minMatchScore: 0.4,
  tagWeight: 0.25,
  idWeight: 0.20,
  classWeight: 0.15,
  positionWeight: 0.20,
  patternWeight: 0.20,
  maxCandidates: 20,
  useTrailDirection: true
};

/**
 * Candidate element for scoring
 */
interface ElementCandidate {
  /** Backend node ID */
  backendNodeId: number;
  /** Node ID */
  nodeId: number;
  /** Element tag name */
  tagName: string;
  /** Element ID */
  id?: string;
  /** Class list */
  classList: string[];
  /** Bounding rect */
  boundingRect: BoundingRect;
  /** Center point */
  center: { x: number; y: number };
  /** Distance from endpoint */
  distance: number;
  /** Match score */
  score: number;
  /** Score breakdown */
  scoreBreakdown: ScoreBreakdown;
}

/**
 * Score breakdown by factor
 */
interface ScoreBreakdown {
  tagScore: number;
  idScore: number;
  classScore: number;
  positionScore: number;
  patternScore: number;
}
```

---

## Class Implementation

```typescript
/**
 * EvidenceScoring - Uses mouse trail and attributes to find elements
 */
export class EvidenceScoring implements StrategyEvaluator {
  public readonly handledTypes: StrategyType[] = ['evidence_scoring'];
  
  private cdpService: CDPService;
  private config: EvidenceScoringConfig;

  constructor(cdpService: CDPService, config: Partial<EvidenceScoringConfig> = {}) {
    this.cdpService = cdpService;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if this evaluator handles the strategy type
   */
  handles(type: StrategyType): boolean {
    return this.handledTypes.includes(type);
  }

  /**
   * Evaluate evidence_scoring strategy
   */
  async evaluate(
    tabId: number,
    strategy: LocatorStrategy
  ): Promise<StrategyEvaluationResult> {
    const startTime = Date.now();

    try {
      // Validate metadata
      if (!isEvidenceScoringMetadata(strategy.metadata)) {
        return this.createFailureResult(strategy, startTime, 'Missing evidence scoring metadata');
      }

      const metadata = strategy.metadata;
      const endpoint = metadata.endpoint;

      // Get candidate elements near the endpoint
      const candidates = await this.findCandidatesNearPoint(
        tabId,
        endpoint.x,
        endpoint.y,
        this.config.searchRadius
      );

      if (candidates.length === 0) {
        return this.createFailureResult(strategy, startTime, 'No elements found near endpoint');
      }

      // Score each candidate
      const scoredCandidates = await this.scoreCandidates(
        candidates,
        metadata,
        tabId
      );

      // Find best match
      const bestMatch = scoredCandidates
        .filter(c => c.score >= this.config.minMatchScore)
        .sort((a, b) => b.score - a.score)[0];

      if (!bestMatch) {
        return this.createFailureResult(
          strategy,
          startTime,
          `No candidates above threshold (best: ${scoredCandidates[0]?.score.toFixed(2) ?? 'none'})`
        );
      }

      // Calculate confidence
      const confidence = this.calculateConfidence(
        strategy.confidence,
        bestMatch.score,
        scoredCandidates.length
      );

      return {
        strategy,
        found: true,
        confidence,
        backendNodeId: bestMatch.backendNodeId,
        nodeId: bestMatch.nodeId,
        clickPoint: bestMatch.center,
        duration: Date.now() - startTime,
        matchCount: scoredCandidates.filter(c => c.score >= this.config.minMatchScore).length,
        metadata: {
          matchScore: bestMatch.score,
          scoreBreakdown: bestMatch.scoreBreakdown,
          candidatesEvaluated: candidates.length,
          distance: bestMatch.distance
        }
      };

    } catch (error) {
      return this.createFailureResult(
        strategy,
        startTime,
        error instanceof Error ? error.message : 'Evidence scoring failed'
      );
    }
  }

  /**
   * Find candidate elements near a point
   */
  private async findCandidatesNearPoint(
    tabId: number,
    x: number,
    y: number,
    radius: number
  ): Promise<ElementCandidate[]> {
    const candidates: ElementCandidate[] = [];

    // Get document
    const docResult = await this.cdpService.sendCommand(tabId, 'DOM.getDocument', {
      depth: 0
    });
    if (!docResult.success || !docResult.result?.root) {
      return candidates;
    }

    // Get elements at the exact point first
    const exactResult = await this.cdpService.sendCommand(tabId, 'DOM.getNodeForLocation', {
      x: Math.round(x),
      y: Math.round(y),
      includeUserAgentShadowDOM: false
    });

    if (exactResult.success && exactResult.result?.backendNodeId) {
      const candidate = await this.nodeToCandidate(
        tabId,
        exactResult.result.backendNodeId,
        exactResult.result.nodeId,
        x,
        y
      );
      if (candidate) {
        candidates.push(candidate);
      }
    }

    // Search in a grid pattern around the point
    const gridPoints = this.generateSearchGrid(x, y, radius);
    
    for (const point of gridPoints) {
      if (candidates.length >= this.config.maxCandidates) break;

      const result = await this.cdpService.sendCommand(tabId, 'DOM.getNodeForLocation', {
        x: Math.round(point.x),
        y: Math.round(point.y),
        includeUserAgentShadowDOM: false
      });

      if (result.success && result.result?.backendNodeId) {
        // Check if we already have this element
        const existing = candidates.find(c => c.backendNodeId === result.result.backendNodeId);
        if (!existing) {
          const candidate = await this.nodeToCandidate(
            tabId,
            result.result.backendNodeId,
            result.result.nodeId,
            x,
            y
          );
          if (candidate) {
            candidates.push(candidate);
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Generate search grid points around center
   */
  private generateSearchGrid(
    centerX: number,
    centerY: number,
    radius: number
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const step = radius / 3; // 3 rings

    for (let r = step; r <= radius; r += step) {
      // 8 points per ring
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        points.push({
          x: centerX + r * Math.cos(angle),
          y: centerY + r * Math.sin(angle)
        });
      }
    }

    return points;
  }

  /**
   * Convert node to candidate with info
   */
  private async nodeToCandidate(
    tabId: number,
    backendNodeId: number,
    nodeId: number,
    endpointX: number,
    endpointY: number
  ): Promise<ElementCandidate | null> {
    try {
      // Get node description
      const descResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
        backendNodeId,
        depth: 0
      });

      if (!descResult.success || !descResult.result?.node) {
        return null;
      }

      const node = descResult.result.node;
      
      // Skip non-element nodes
      if (node.nodeType !== 1) return null;

      // Get box model
      const boxResult = await this.cdpService.sendCommand(tabId, 'DOM.getBoxModel', {
        backendNodeId
      });

      if (!boxResult.success || !boxResult.result?.model) {
        return null;
      }

      const model = boxResult.result.model;
      const boundingRect = this.quadToBoundingRect(model.border);
      const center = {
        x: boundingRect.x + boundingRect.width / 2,
        y: boundingRect.y + boundingRect.height / 2
      };

      // Calculate distance from endpoint
      const distance = Math.sqrt(
        Math.pow(center.x - endpointX, 2) +
        Math.pow(center.y - endpointY, 2)
      );

      // Parse attributes
      const attrs = this.parseAttributes(node.attributes);

      return {
        backendNodeId,
        nodeId,
        tagName: node.nodeName.toLowerCase(),
        id: attrs.id,
        classList: attrs.class ? attrs.class.split(/\s+/).filter(Boolean) : [],
        boundingRect,
        center,
        distance,
        score: 0,
        scoreBreakdown: {
          tagScore: 0,
          idScore: 0,
          classScore: 0,
          positionScore: 0,
          patternScore: 0
        }
      };

    } catch {
      return null;
    }
  }

  /**
   * Score candidates against evidence
   */
  private async scoreCandidates(
    candidates: ElementCandidate[],
    metadata: EvidenceScoringMetadata,
    tabId: number
  ): Promise<ElementCandidate[]> {
    const expectedAttrs = metadata.attributes || {};
    const mouseTrail = metadata.mouseTrail || [];
    const pattern = metadata.pattern || 'unknown';

    for (const candidate of candidates) {
      const breakdown: ScoreBreakdown = {
        tagScore: 0,
        idScore: 0,
        classScore: 0,
        positionScore: 0,
        patternScore: 0
      };

      // Tag name matching
      if (expectedAttrs.tagName) {
        breakdown.tagScore = candidate.tagName === expectedAttrs.tagName.toLowerCase()
          ? 1.0
          : 0.0;
      } else {
        // Interactive elements get bonus
        const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
        breakdown.tagScore = interactiveTags.includes(candidate.tagName) ? 0.5 : 0.2;
      }

      // ID matching
      if (expectedAttrs.id && candidate.id) {
        breakdown.idScore = candidate.id === expectedAttrs.id ? 1.0 : 0.0;
      } else if (candidate.id) {
        // Having an ID is slightly positive
        breakdown.idScore = 0.2;
      }

      // Class overlap
      if (expectedAttrs.classList && expectedAttrs.classList.length > 0) {
        const expectedClasses = expectedAttrs.classList;
        const overlap = candidate.classList.filter(c => expectedClasses.includes(c)).length;
        breakdown.classScore = expectedClasses.length > 0
          ? overlap / expectedClasses.length
          : 0;
      }

      // Position proximity (inverse of distance, normalized)
      const maxDistance = this.config.searchRadius;
      breakdown.positionScore = Math.max(0, 1 - (candidate.distance / maxDistance));

      // Mouse pattern alignment
      if (this.config.useTrailDirection && mouseTrail.length >= 2) {
        breakdown.patternScore = this.scoreTrailAlignment(
          mouseTrail,
          candidate.center,
          pattern
        );
      } else {
        // Default pattern score based on distance
        breakdown.patternScore = breakdown.positionScore;
      }

      // Calculate weighted total
      candidate.scoreBreakdown = breakdown;
      candidate.score = (
        breakdown.tagScore * this.config.tagWeight +
        breakdown.idScore * this.config.idWeight +
        breakdown.classScore * this.config.classWeight +
        breakdown.positionScore * this.config.positionWeight +
        breakdown.patternScore * this.config.patternWeight
      );
    }

    return candidates;
  }

  /**
   * Score how well trail aligns with candidate
   */
  private scoreTrailAlignment(
    trail: Array<{ x: number; y: number; timestamp: number }>,
    targetCenter: { x: number; y: number },
    pattern: string
  ): number {
    if (trail.length < 2) return 0.5;

    // Get last few points of trail
    const recentTrail = trail.slice(-5);
    
    // Calculate trail direction vector
    const lastPoint = recentTrail[recentTrail.length - 1];
    const prevPoint = recentTrail[recentTrail.length - 2];
    
    const trailDirX = lastPoint.x - prevPoint.x;
    const trailDirY = lastPoint.y - prevPoint.y;
    const trailLength = Math.sqrt(trailDirX * trailDirX + trailDirY * trailDirY);

    if (trailLength < 1) return 0.5; // Stationary

    // Calculate direction to target
    const toTargetX = targetCenter.x - lastPoint.x;
    const toTargetY = targetCenter.y - lastPoint.y;
    const toTargetLength = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);

    if (toTargetLength < 1) return 1.0; // On target

    // Dot product for alignment (-1 to 1)
    const dotProduct = (
      (trailDirX / trailLength) * (toTargetX / toTargetLength) +
      (trailDirY / trailLength) * (toTargetY / toTargetLength)
    );

    // Convert to 0-1 score (1 = same direction, 0 = opposite)
    let alignmentScore = (dotProduct + 1) / 2;

    // Adjust based on pattern
    switch (pattern) {
      case 'direct':
        // High alignment expected
        alignmentScore = alignmentScore * 0.8 + 0.2;
        break;
      case 'corrective':
        // Moderate alignment, user corrected course
        alignmentScore = alignmentScore * 0.6 + 0.3;
        break;
      case 'searching':
        // Lower alignment expected, position matters more
        alignmentScore = alignmentScore * 0.4 + 0.3;
        break;
      case 'hesitant':
        // Moderate importance
        alignmentScore = alignmentScore * 0.5 + 0.25;
        break;
      default:
        // Default weighting
        break;
    }

    return alignmentScore;
  }

  /**
   * Calculate final confidence
   */
  private calculateConfidence(
    strategyConfidence: number,
    matchScore: number,
    candidateCount: number
  ): number {
    // Base from strategy weight (0.80)
    const base = strategyConfidence;

    // Adjust by match score
    let confidence = base * matchScore;

    // Bonus for unique match
    if (candidateCount === 1) {
      confidence += 0.05;
    }

    // Cap at strategy weight
    return Math.min(confidence, strategyConfidence);
  }

  /**
   * Parse attributes array to record
   */
  private parseAttributes(attributes: string[] | undefined): Record<string, string> {
    const result: Record<string, string> = {};
    if (!attributes) return result;
    
    for (let i = 0; i < attributes.length; i += 2) {
      result[attributes[i]] = attributes[i + 1];
    }
    return result;
  }

  /**
   * Convert quad to bounding rect
   */
  private quadToBoundingRect(quad: number[]): BoundingRect {
    const x = Math.min(quad[0], quad[2], quad[4], quad[6]);
    const y = Math.min(quad[1], quad[3], quad[5], quad[7]);
    const maxX = Math.max(quad[0], quad[2], quad[4], quad[6]);
    const maxY = Math.max(quad[1], quad[3], quad[5], quad[7]);
    
    return {
      x,
      y,
      width: maxX - x,
      height: maxY - y
    };
  }

  /**
   * Create failure result
   */
  private createFailureResult(
    strategy: LocatorStrategy,
    startTime: number,
    error: string
  ): StrategyEvaluationResult {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error
    };
  }
}

export { EvidenceScoring, EvidenceScoringConfig, DEFAULT_CONFIG as DEFAULT_EVIDENCE_SCORING_CONFIG };
```

---

## Algorithm Details

### Search Pattern
1. Start at mouse endpoint coordinates
2. Search exact point first
3. Expand in concentric rings (8 points per ring)
4. Stop when max candidates reached

### Scoring Factors
| Factor | Weight | Description |
|--------|--------|-------------|
| Tag Name | 0.25 | Exact match or interactive element bonus |
| ID | 0.20 | Exact match with recorded ID |
| Classes | 0.15 | Percentage of class overlap |
| Position | 0.20 | Inverse of distance from endpoint |
| Pattern | 0.20 | Trail direction alignment |

### Pattern Adjustments
- **direct**: High alignment expected (0.8× alignment + 0.2)
- **corrective**: User corrected course (0.6× alignment + 0.3)
- **searching**: Position matters more (0.4× alignment + 0.3)
- **hesitant**: Moderate importance (0.5× alignment + 0.25)

---

## Usage Example

```typescript
import { EvidenceScoring } from './strategies/EvidenceScoring';
import { CDPService } from './CDPService';

const cdpService = new CDPService();
const evidenceScoring = new EvidenceScoring(cdpService, {
  searchRadius: 50,
  minMatchScore: 0.4
});

const strategy: LocatorStrategy = {
  type: 'evidence_scoring',
  confidence: 0.80,
  metadata: {
    endpoint: { x: 500, y: 300 },
    mouseTrail: [
      { x: 100, y: 100, timestamp: 1000 },
      { x: 300, y: 200, timestamp: 1200 },
      { x: 500, y: 300, timestamp: 1400 }
    ],
    pattern: 'direct',
    attributes: {
      tagName: 'button',
      id: 'submit-btn',
      classList: ['btn', 'btn-primary']
    }
  }
};

const result = await evidenceScoring.evaluate(tabId, strategy);
```

---

## Acceptance Criteria

- [ ] Finds elements near recorded endpoint
- [ ] Scores candidates using all 5 factors
- [ ] Tag name matching works (exact + interactive bonus)
- [ ] ID matching works
- [ ] Class overlap calculated correctly
- [ ] Position proximity scored (inverse distance)
- [ ] Mouse trail direction analyzed
- [ ] Pattern type adjusts alignment score
- [ ] Returns best match above threshold
- [ ] Confidence capped at strategy weight (0.80)
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **No elements at endpoint**: Expand search radius
2. **Many overlapping elements**: Score and rank all
3. **No mouse trail**: Fall back to position scoring
4. **Element moved slightly**: Position tolerance helps
5. **ID changed but classes same**: Partial match
6. **Very short trail**: Skip direction analysis
7. **All candidates below threshold**: Return failure
8. **Shadow DOM elements**: Handle if accessible
9. **Zero-size elements**: Skip in candidates
10. **Circular trail (searching)**: Low alignment expected

---

## Estimated Lines

350-400 lines
