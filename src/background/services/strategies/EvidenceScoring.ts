/**
 * @fileoverview Evidence Scoring Strategy Evaluator
 * @description Uses mouse trail patterns and element attributes to find elements.
 * Bridges vision and DOM by using behavioral evidence.
 * 
 * @module services/strategies/EvidenceScoring
 * @version 1.0.0
 * @since Phase 4
 */

import { CDPService, getCDPService } from '../CDPService';
import type { StrategyType, LocatorStrategy } from '../../../types';
import type { StrategyEvaluator, StrategyEvaluationResult } from './DOMStrategy';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EvidenceScoringConfig {
  searchRadius: number;
  minMatchScore: number;
  tagWeight: number;
  idWeight: number;
  classWeight: number;
  positionWeight: number;
  patternWeight: number;
  maxCandidates: number;
  useTrailDirection: boolean;
}

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

export interface EvidenceScoringMetadata {
  endpoint: { x: number; y: number };
  expectedTag?: string;
  expectedId?: string;
  expectedClasses?: string[];
  trailDirection?: { dx: number; dy: number };
  boundingRect?: { x: number; y: number; width: number; height: number };
}

interface ElementCandidate {
  backendNodeId: number;
  nodeId: number;
  tagName: string;
  id?: string;
  classList: string[];
  boundingRect: { x: number; y: number; width: number; height: number };
  center: { x: number; y: number };
  distance: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

interface ScoreBreakdown {
  tagScore: number;
  idScore: number;
  classScore: number;
  positionScore: number;
  patternScore: number;
}

// ============================================================================
// EVIDENCE SCORING CLASS
// ============================================================================

export class EvidenceScoring implements StrategyEvaluator {
  readonly handledTypes: StrategyType[] = ['evidence_scoring'];

  private cdpService: CDPService;
  private config: EvidenceScoringConfig;

  constructor(cdpService: CDPService, config?: Partial<EvidenceScoringConfig>) {
    this.cdpService = cdpService;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  handles(type: StrategyType): boolean {
    return this.handledTypes.includes(type);
  }

  // ==========================================================================
  // MAIN EVALUATION
  // ==========================================================================

  async evaluate(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult> {
    const startTime = Date.now();

    try {
      const metadata = strategy.metadata as EvidenceScoringMetadata | undefined;

      if (!metadata?.endpoint) {
        return this.createFailureResult(strategy, startTime, 'Missing endpoint in metadata');
      }

      // Find candidates near the endpoint
      const candidates = await this.findCandidatesNearPoint(
        tabId,
        metadata.endpoint.x,
        metadata.endpoint.y,
        this.config.searchRadius
      );

      if (candidates.length === 0) {
        return this.createFailureResult(strategy, startTime, 'No elements found near endpoint');
      }

      // Score each candidate
      const scoredCandidates = this.scoreCandidates(candidates, metadata);

      // Find best match above threshold
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
        strategy.confidence ?? 0.75,
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

  // ==========================================================================
  // CANDIDATE FINDING
  // ==========================================================================

  private async findCandidatesNearPoint(
    tabId: number,
    x: number,
    y: number,
    radius: number
  ): Promise<ElementCandidate[]> {
    const candidates: ElementCandidate[] = [];
    const seenIds = new Set<number>();

    // Get element at exact point first
    const exactResult = await this.cdpService.sendCommand<{
      backendNodeId: number;
      nodeId: number;
    }>(tabId, 'DOM.getNodeForLocation', {
      x: Math.round(x),
      y: Math.round(y),
      includeUserAgentShadowDOM: false
    });

    if (exactResult.success && exactResult.result?.backendNodeId) {
      seenIds.add(exactResult.result.backendNodeId);
      const candidate = await this.nodeToCandidate(
        tabId,
        exactResult.result.backendNodeId,
        exactResult.result.nodeId ?? 0,
        x,
        y
      );
      if (candidate) candidates.push(candidate);
    }

    // Search grid around the point
    const gridPoints = this.generateSearchGrid(x, y, radius);

    for (const point of gridPoints) {
      if (candidates.length >= this.config.maxCandidates) break;

      const result = await this.cdpService.sendCommand<{
        backendNodeId: number;
        nodeId: number;
      }>(tabId, 'DOM.getNodeForLocation', {
        x: Math.round(point.x),
        y: Math.round(point.y),
        includeUserAgentShadowDOM: false
      });

      if (result.success && result.result?.backendNodeId) {
        if (!seenIds.has(result.result.backendNodeId)) {
          seenIds.add(result.result.backendNodeId);
          const candidate = await this.nodeToCandidate(
            tabId,
            result.result.backendNodeId,
            result.result.nodeId ?? 0,
            x,
            y
          );
          if (candidate) candidates.push(candidate);
        }
      }
    }

    return candidates;
  }

  private generateSearchGrid(centerX: number, centerY: number, radius: number): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const step = radius / 3;

    for (let r = step; r <= radius; r += step) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        points.push({
          x: centerX + r * Math.cos(angle),
          y: centerY + r * Math.sin(angle)
        });
      }
    }

    return points;
  }

  private async nodeToCandidate(
    tabId: number,
    backendNodeId: number,
    nodeId: number,
    endpointX: number,
    endpointY: number
  ): Promise<ElementCandidate | null> {
    try {
      // Get node description
      const descResult = await this.cdpService.sendCommand<{
        node: {
          nodeName: string;
          attributes?: string[];
          backendNodeId: number;
        };
      }>(tabId, 'DOM.describeNode', { backendNodeId, depth: 0 });

      if (!descResult.success || !descResult.result?.node) return null;

      const node = descResult.result.node;

      // Skip non-element nodes
      if (node.nodeName.startsWith('#')) return null;

      // Parse attributes
      const attrs = this.parseAttributes(node.attributes ?? []);

      // Get bounding box
      const boxResult = await this.cdpService.sendCommand<{
        model: { content: number[] };
      }>(tabId, 'DOM.getBoxModel', { backendNodeId });

      if (!boxResult.success || !boxResult.result?.model?.content) return null;

      const [x1, y1, x2, , , , _x4, y4] = boxResult.result.model.content;
      const boundingRect = {
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y4 - y1
      };

      const center = {
        x: x1 + boundingRect.width / 2,
        y: y1 + boundingRect.height / 2
      };

      const distance = Math.sqrt(
        Math.pow(center.x - endpointX, 2) +
        Math.pow(center.y - endpointY, 2)
      );

      return {
        backendNodeId,
        nodeId,
        tagName: node.nodeName.toLowerCase(),
        id: attrs.id,
        classList: attrs.class?.split(/\s+/).filter(Boolean) ?? [],
        boundingRect,
        center,
        distance,
        score: 0,
        scoreBreakdown: { tagScore: 0, idScore: 0, classScore: 0, positionScore: 0, patternScore: 0 }
      };

    } catch {
      return null;
    }
  }

  private parseAttributes(attrs: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < attrs.length; i += 2) {
      result[attrs[i]] = attrs[i + 1] ?? '';
    }
    return result;
  }

  // ==========================================================================
  // SCORING
  // ==========================================================================

  private scoreCandidates(
    candidates: ElementCandidate[],
    metadata: EvidenceScoringMetadata
  ): ElementCandidate[] {
    return candidates.map(candidate => {
      const breakdown: ScoreBreakdown = {
        tagScore: this.scoreTag(candidate.tagName, metadata.expectedTag),
        idScore: this.scoreId(candidate.id, metadata.expectedId),
        classScore: this.scoreClasses(candidate.classList, metadata.expectedClasses),
        positionScore: this.scorePosition(candidate.distance, this.config.searchRadius),
        patternScore: this.scorePattern(candidate, metadata)
      };

      const score =
        breakdown.tagScore * this.config.tagWeight +
        breakdown.idScore * this.config.idWeight +
        breakdown.classScore * this.config.classWeight +
        breakdown.positionScore * this.config.positionWeight +
        breakdown.patternScore * this.config.patternWeight;

      return { ...candidate, score, scoreBreakdown: breakdown };
    });
  }

  private scoreTag(actual: string, expected?: string): number {
    if (!expected) return 0.5; // Neutral if no expectation
    return actual.toLowerCase() === expected.toLowerCase() ? 1.0 : 0.0;
  }

  private scoreId(actual?: string, expected?: string): number {
    if (!expected) return 0.5;
    if (!actual) return 0.0;
    return actual === expected ? 1.0 : 0.0;
  }

  private scoreClasses(actual: string[], expected?: string[]): number {
    if (!expected || expected.length === 0) return 0.5;
    if (actual.length === 0) return 0.0;

    const overlap = actual.filter(c => expected.includes(c)).length;
    return overlap / Math.max(actual.length, expected.length);
  }

  private scorePosition(distance: number, maxRadius: number): number {
    if (distance <= 0) return 1.0;
    if (distance >= maxRadius) return 0.0;
    return 1.0 - (distance / maxRadius);
  }

  private scorePattern(candidate: ElementCandidate, metadata: EvidenceScoringMetadata): number {
    if (!this.config.useTrailDirection || !metadata.trailDirection) return 0.5;

    const dx = metadata.trailDirection.dx;
    const dy = metadata.trailDirection.dy;

    // Check if trail direction points toward this element
    const vecX = candidate.center.x - metadata.endpoint.x;
    const vecY = candidate.center.y - metadata.endpoint.y;

    // Normalize vectors
    const trailLen = Math.sqrt(dx * dx + dy * dy);
    const vecLen = Math.sqrt(vecX * vecX + vecY * vecY);

    if (trailLen === 0 || vecLen === 0) return 0.5;

    // Dot product for alignment
    const dot = (dx / trailLen) * (vecX / vecLen) + (dy / trailLen) * (vecY / vecLen);

    // Convert from [-1, 1] to [0, 1]
    return (dot + 1) / 2;
  }

  private calculateConfidence(
    baseConfidence: number,
    matchScore: number,
    candidateCount: number
  ): number {
    // Higher score = higher confidence
    let confidence = baseConfidence * matchScore;

    // Penalty for many competing candidates
    if (candidateCount > 5) {
      confidence *= 0.95;
    }

    return Math.min(0.85, Math.max(0.3, confidence));
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

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

// ============================================================================
// SINGLETON
// ============================================================================

let instance: EvidenceScoring | null = null;

export function getEvidenceScoring(cdpService?: CDPService): EvidenceScoring {
  if (!instance) {
    const cdp = cdpService ?? getCDPService();
    instance = new EvidenceScoring(cdp);
  }
  return instance;
}
