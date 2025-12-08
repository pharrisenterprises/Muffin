/**
 * @fileoverview Coordinates Strategy Evaluator
 * @description Last-resort fallback using recorded x,y coordinates.
 * Always succeeds but with lowest confidence (0.60).
 * 
 * @module services/strategies/CoordinatesStrategy
 * @version 1.0.0
 * @since Phase 4
 */

import { CDPService, getCDPService } from '../CDPService';
import type { StrategyType, LocatorStrategy } from '../../../types';
import type { StrategyEvaluator, StrategyEvaluationResult } from './DOMStrategy';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CoordinatesStrategyConfig {
  baseConfidence: number;
  validateElementExists: boolean;
  confidenceBoostIfElementExists: number;
}

const DEFAULT_CONFIG: CoordinatesStrategyConfig = {
  baseConfidence: 0.60,
  validateElementExists: true,
  confidenceBoostIfElementExists: 0.05
};

export interface CoordinatesMetadata {
  x: number;
  y: number;
  boundingRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ============================================================================
// COORDINATES STRATEGY CLASS
// ============================================================================

export class CoordinatesStrategy implements StrategyEvaluator {
  private cdpService: CDPService;
  private config: CoordinatesStrategyConfig;

  readonly handledTypes: StrategyType[] = ['coordinates'];

  constructor(cdpService: CDPService, config?: Partial<CoordinatesStrategyConfig>) {
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
      const metadata = strategy.metadata as CoordinatesMetadata | undefined;

      if (metadata?.x === undefined || metadata?.y === undefined) {
        return {
          strategy,
          found: false,
          confidence: 0,
          duration: Date.now() - startTime,
          error: 'Coordinates strategy requires x and y in metadata'
        };
      }

      const x = Math.round(metadata.x);
      const y = Math.round(metadata.y);

      let confidence = this.config.baseConfidence;
      let backendNodeId: number | undefined;

      // Optionally validate element exists at coordinates
      if (this.config.validateElementExists) {
        const elementResult = await this.getElementAtPoint(tabId, x, y);
        if (elementResult) {
          backendNodeId = elementResult;
          confidence = Math.min(confidence + this.config.confidenceBoostIfElementExists, 0.70);
        }
      }

      // Coordinates always "find" the target - it's just a location
      return {
        strategy,
        found: true,
        confidence,
        backendNodeId,
        clickPoint: { x, y },
        duration: Date.now() - startTime,
        metadata: {
          originalCoordinates: { x: metadata.x, y: metadata.y },
          roundedCoordinates: { x, y },
          elementValidated: !!backendNodeId
        }
      };

    } catch (error) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Coordinates evaluation failed'
      };
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async getElementAtPoint(tabId: number, x: number, y: number): Promise<number | null> {
    try {
      const result = await this.cdpService.sendCommand<{ backendNodeId: number }>(
        tabId,
        'DOM.getNodeForLocation',
        { x, y, includeUserAgentShadowDOM: false }
      );

      return result.result?.backendNodeId ?? null;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: CoordinatesStrategy | null = null;

export function getCoordinatesStrategy(cdpService?: CDPService): CoordinatesStrategy {
  if (!instance) {
    const cdp = cdpService ?? getCDPService();
    instance = new CoordinatesStrategy(cdp);
  }
  return instance;
}
