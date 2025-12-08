/**
 * @fileoverview Vision Strategy Evaluator
 * @description Evaluates vision_ocr strategies using Tesseract.js OCR.
 * Fallback for when DOM-based strategies fail.
 * 
 * @module services/strategies/VisionStrategy
 * @version 1.0.0
 * @since Phase 4
 */

import { VisionService, getVisionService } from '../VisionService';
import type { StrategyType, LocatorStrategy } from '../../../types/strategy';
import type { StrategyEvaluator, StrategyEvaluationResult } from './DOMStrategy';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface VisionStrategyConfig {
  minOCRConfidence: number;
  useCache: boolean;
  exactMatch: boolean;
  caseSensitive: boolean;
}

const DEFAULT_CONFIG: VisionStrategyConfig = {
  minOCRConfidence: 60,
  useCache: true,
  exactMatch: false,
  caseSensitive: false
};

export interface VisionMetadata {
  targetText: string;
  ocrConfidence?: number;
  textBbox?: { x: number; y: number; width: number; height: number };
}

// ============================================================================
// VISION STRATEGY CLASS
// ============================================================================

export class VisionStrategy implements StrategyEvaluator {
  private visionService: VisionService;
  private config: VisionStrategyConfig;

  readonly handledTypes: StrategyType[] = ['vision_ocr'];

  constructor(visionService: VisionService, config?: Partial<VisionStrategyConfig>) {
    this.visionService = visionService;
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
      const metadata = strategy.metadata as VisionMetadata | undefined;

      if (!metadata?.targetText) {
        return {
          strategy,
          found: false,
          confidence: 0,
          duration: Date.now() - startTime,
          error: 'Vision strategy requires targetText in metadata'
        };
      }

      // Ensure vision service is ready
      if (!this.visionService.isReady()) {
        await this.visionService.initialize();
      }

      // Find the text
      const result = await this.visionService.findText(tabId, metadata.targetText, {
        exact: this.config.exactMatch,
        caseSensitive: this.config.caseSensitive,
        useCache: this.config.useCache
      });

      if (result.found && result.clickPoint) {
        // Normalize confidence to 0-1 and cap at 0.85
        const normalizedConfidence = Math.min(result.confidence / 100, 0.85);

        return {
          strategy,
          found: true,
          confidence: normalizedConfidence,
          clickPoint: result.clickPoint,
          duration: Date.now() - startTime,
          matchCount: result.allMatches.length,
          metadata: {
            matchedText: result.matchedText,
            ocrConfidence: result.confidence,
            allMatches: result.allMatches.length
          }
        };
      }

      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: result.error ?? `Text "${metadata.targetText}" not found`
      };

    } catch (error) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Vision evaluation failed'
      };
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: VisionStrategy | null = null;

export function getVisionStrategy(visionService?: VisionService): VisionStrategy {
  if (!instance) {
    const vision = visionService ?? getVisionService();
    instance = new VisionStrategy(vision);
  }
  return instance;
}
