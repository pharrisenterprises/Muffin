/**
 * @fileoverview Decision Engine
 * @description Central coordinator for the 7-tier strategy evaluation system.
 * Evaluates ALL strategies in parallel, selects highest-confidence match,
 * and executes actions. The brain of the playback system.
 * 
 * @module services/DecisionEngine
 * @version 1.0.0
 * @since Phase 4
 */

import { CDPService, getCDPService } from './CDPService';
import { PlaywrightLocators, getPlaywrightLocators } from './PlaywrightLocators';
import { AccessibilityService, getAccessibilityService } from './AccessibilityService';
import { AutoWaiting, getAutoWaiting } from './AutoWaiting';
import { VisionService, getVisionService } from './VisionService';
import { TelemetryLogger, getTelemetryLogger, type StrategyEvaluation } from './TelemetryLogger';
import type { StrategyType, LocatorStrategy, FallbackChain } from '../../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DecisionEngineConfig {
  timeout: number;
  minConfidence: number;
  parallelEvaluation: boolean;
  maxParallelStrategies: number;
  enableTelemetry: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

const DEFAULT_CONFIG: DecisionEngineConfig = {
  timeout: 30000,
  minConfidence: 0.5,
  parallelEvaluation: true,
  maxParallelStrategies: 7,
  enableTelemetry: true,
  retryOnFailure: true,
  maxRetries: 2
};

export interface StrategyEvaluationResult {
  strategy: LocatorStrategy;
  found: boolean;
  confidence: number;
  backendNodeId?: number;
  clickPoint?: { x: number; y: number };
  duration: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluationResults {
  results: StrategyEvaluationResult[];
  bestStrategy: StrategyEvaluationResult | null;
  totalDuration: number;
  strategiesEvaluated: number;
  strategiesSucceeded: number;
}

export interface ActionExecutionResult {
  success: boolean;
  usedStrategy: LocatorStrategy;
  evaluationResults: EvaluationResults;
  executionDuration: number;
  totalDuration: number;
  error?: string;
  telemetryId?: string;
}

export interface ActionRequest {
  tabId: number;
  fallbackChain: FallbackChain;
  actionType: 'click' | 'type' | 'select' | 'hover' | 'scroll';
  value?: string;
  stepIndex?: number;
  timeout?: number;
  pageDomain?: string;
}

export type DecisionEngineStatus = 'idle' | 'evaluating' | 'executing' | 'error';

interface ServiceDependencies {
  cdpService: CDPService;
  locators: PlaywrightLocators;
  accessibilityService: AccessibilityService;
  autoWaiting: AutoWaiting;
  visionService: VisionService;
  telemetryLogger: TelemetryLogger;
}

// ============================================================================
// DECISION ENGINE CLASS
// ============================================================================

export class DecisionEngine {
  private config: DecisionEngineConfig;
  private status: DecisionEngineStatus = 'idle';
  private services: ServiceDependencies;

  /** Fixed strategy weights (Architecture Decision #6) */
  private readonly STRATEGY_WEIGHTS: Record<StrategyType, number> = {
    cdp_semantic: 0.95,
    cdp_power: 0.90,
    dom_selector: 0.85,
    evidence_scoring: 0.80,
    css_selector: 0.75,
    vision_ocr: 0.70,
    coordinates: 0.60
  };

  constructor(services: ServiceDependencies, config?: Partial<DecisionEngineConfig>) {
    this.services = services;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // MAIN EXECUTION
  // ==========================================================================

  async executeAction(request: ActionRequest): Promise<ActionExecutionResult> {
    const totalStartTime = Date.now();
    let telemetryId: string | undefined;

    // Start telemetry tracking
    if (this.config.enableTelemetry && request.actionType !== 'hover') {
      telemetryId = this.services.telemetryLogger.startAction({
        stepIndex: request.stepIndex,
        actionType: request.actionType,
        pageDomain: request.pageDomain
      });
    }

    try {
      this.status = 'evaluating';

      // Evaluate all strategies
      const evaluationResults = await this.evaluateStrategies(
        request.tabId,
        request.fallbackChain,
        request.timeout
      );

      // Select best strategy
      const bestStrategy = this.selectBestStrategy(evaluationResults);

      if (!bestStrategy) {
        this.status = 'error';
        const result: ActionExecutionResult = {
          success: false,
          usedStrategy: request.fallbackChain.strategies[0],
          evaluationResults,
          executionDuration: 0,
          totalDuration: Date.now() - totalStartTime,
          error: 'No strategy found element with sufficient confidence',
          telemetryId
        };

        await this.logTelemetry(telemetryId, result, evaluationResults);
        return result;
      }

      // Wait for element to be actionable
      if (bestStrategy.backendNodeId) {
        const waitResult = await this.services.autoWaiting.waitForActionable(
          request.tabId,
          bestStrategy.backendNodeId,
          { timeout: 5000 }
        );

        if (!waitResult.success) {
          console.warn('[DecisionEngine] Element not actionable:', waitResult.failureReason);
        }
      }

      // Execute the action
      this.status = 'executing';
      const execStartTime = Date.now();

      const execResult = await this.performAction(
        request.tabId,
        bestStrategy.backendNodeId,
        bestStrategy.clickPoint,
        request.actionType,
        request.value
      );

      const executionDuration = Date.now() - execStartTime;
      this.status = 'idle';

      const result: ActionExecutionResult = {
        success: execResult.success,
        usedStrategy: bestStrategy.strategy,
        evaluationResults,
        executionDuration,
        totalDuration: Date.now() - totalStartTime,
        error: execResult.error,
        telemetryId
      };

      await this.logTelemetry(telemetryId, result, evaluationResults);
      return result;

    } catch (error) {
      this.status = 'error';
      const result: ActionExecutionResult = {
        success: false,
        usedStrategy: request.fallbackChain.strategies[0],
        evaluationResults: {
          results: [],
          bestStrategy: null,
          totalDuration: Date.now() - totalStartTime,
          strategiesEvaluated: 0,
          strategiesSucceeded: 0
        },
        executionDuration: 0,
        totalDuration: Date.now() - totalStartTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        telemetryId
      };

      await this.logTelemetry(telemetryId, result, result.evaluationResults);
      return result;
    }
  }

  // ==========================================================================
  // STRATEGY EVALUATION
  // ==========================================================================

  async evaluateStrategies(
    tabId: number,
    fallbackChain: FallbackChain,
    timeout?: number
  ): Promise<EvaluationResults> {
    const startTime = Date.now();
    const evalTimeout = timeout ?? this.config.timeout;
    const strategies = fallbackChain.strategies.slice(0, this.config.maxParallelStrategies);

    let results: StrategyEvaluationResult[];

    if (this.config.parallelEvaluation) {
      // Evaluate all strategies in parallel
      const promises = strategies.map(strategy =>
        this.withTimeout(
          this.evaluateStrategy(tabId, strategy),
          evalTimeout,
          `Strategy ${strategy.type}`
        ).catch(error => ({
          strategy,
          found: false,
          confidence: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Evaluation failed'
        }))
      );

      results = await Promise.all(promises);
    } else {
      // Sequential evaluation (fallback)
      results = [];
      for (const strategy of strategies) {
        const result = await this.evaluateStrategy(tabId, strategy);
        results.push(result);
      }
    }

    const successfulResults = results.filter(r => r.found);
    const bestStrategy = this.selectBestStrategy({ 
      results, 
      bestStrategy: null, 
      totalDuration: 0, 
      strategiesEvaluated: 0, 
      strategiesSucceeded: 0 
    });

    return {
      results,
      bestStrategy,
      totalDuration: Date.now() - startTime,
      strategiesEvaluated: results.length,
      strategiesSucceeded: successfulResults.length
    };
  }

  async evaluateStrategy(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult> {
    const startTime = Date.now();

    try {
      switch (strategy.type) {
        case 'cdp_semantic':
          return await this.evaluateCDPSemantic(tabId, strategy, startTime);

        case 'cdp_power':
          return await this.evaluateCDPPower(tabId, strategy, startTime);

        case 'dom_selector':
        case 'css_selector':
          return await this.evaluateCSSSelector(tabId, strategy, startTime);

        case 'vision_ocr':
          return await this.evaluateVisionOCR(tabId, strategy, startTime);

        case 'coordinates':
          return await this.evaluateCoordinates(tabId, strategy, startTime);

        case 'evidence_scoring':
          return await this.evaluateEvidenceScoring(tabId, strategy, startTime);

        default:
          return {
            strategy,
            found: false,
            confidence: 0,
            duration: Date.now() - startTime,
            error: `Unknown strategy type: ${strategy.type}`
          };
      }
    } catch (error) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Evaluation error'
      };
    }
  }

  // ==========================================================================
  // STRATEGY EVALUATORS
  // ==========================================================================

  private async evaluateCDPSemantic(
    tabId: number,
    strategy: LocatorStrategy,
    startTime: number
  ): Promise<StrategyEvaluationResult> {
    const metadata = strategy.metadata as Record<string, unknown> | undefined;
    const role = metadata?.role as string | undefined;
    const name = metadata?.name as string | undefined;

    if (!role) {
      return { strategy, found: false, confidence: 0, duration: Date.now() - startTime, error: 'No role in metadata' };
    }

    const result = await this.services.locators.getByRole(tabId, role, { name });

    return {
      strategy,
      found: result.found,
      confidence: result.found ? result.confidence : 0,
      backendNodeId: result.backendNodeId,
      clickPoint: result.boundingBox ? {
        x: result.boundingBox.x + result.boundingBox.width / 2,
        y: result.boundingBox.y + result.boundingBox.height / 2
      } : undefined,
      duration: Date.now() - startTime
    };
  }

  private async evaluateCDPPower(
    tabId: number,
    strategy: LocatorStrategy,
    startTime: number
  ): Promise<StrategyEvaluationResult> {
    const result = await this.services.locators.executeStrategy(tabId, strategy);

    return {
      strategy,
      found: result.found,
      confidence: result.found ? result.confidence : 0,
      backendNodeId: result.backendNodeId,
      clickPoint: result.boundingBox ? {
        x: result.boundingBox.x + result.boundingBox.width / 2,
        y: result.boundingBox.y + result.boundingBox.height / 2
      } : undefined,
      duration: Date.now() - startTime
    };
  }

  private async evaluateCSSSelector(
    tabId: number,
    strategy: LocatorStrategy,
    startTime: number
  ): Promise<StrategyEvaluationResult> {
    const selector = strategy.selector ?? strategy.value;
    if (!selector) {
      return { strategy, found: false, confidence: 0, duration: Date.now() - startTime, error: 'No selector' };
    }

    const result = await this.services.locators.locator(tabId, selector);

    return {
      strategy,
      found: result.found,
      confidence: result.found ? result.confidence : 0,
      backendNodeId: result.backendNodeId,
      clickPoint: result.boundingBox ? {
        x: result.boundingBox.x + result.boundingBox.width / 2,
        y: result.boundingBox.y + result.boundingBox.height / 2
      } : undefined,
      duration: Date.now() - startTime
    };
  }

  private async evaluateVisionOCR(
    tabId: number,
    strategy: LocatorStrategy,
    startTime: number
  ): Promise<StrategyEvaluationResult> {
    const result = await this.services.visionService.evaluateStrategy(tabId, strategy);

    return {
      strategy,
      found: result.success,
      confidence: result.confidence,
      clickPoint: result.clickPoint,
      duration: Date.now() - startTime,
      metadata: { matchedText: result.matchedText }
    };
  }

  private async evaluateCoordinates(
    tabId: number,
    strategy: LocatorStrategy,
    startTime: number
  ): Promise<StrategyEvaluationResult> {
    const metadata = strategy.metadata as Record<string, unknown> | undefined;
    const x = metadata?.x as number | undefined;
    const y = metadata?.y as number | undefined;

    if (x === undefined || y === undefined) {
      return { strategy, found: false, confidence: 0, duration: Date.now() - startTime, error: 'No coordinates' };
    }

    // Coordinates always "find" the element (it's just a location)
    return {
      strategy,
      found: true,
      confidence: this.STRATEGY_WEIGHTS.coordinates,
      clickPoint: { x, y },
      duration: Date.now() - startTime
    };
  }

  private async evaluateEvidenceScoring(
    tabId: number,
    strategy: LocatorStrategy,
    startTime: number
  ): Promise<StrategyEvaluationResult> {
    const metadata = strategy.metadata as Record<string, unknown> | undefined;
    const endpoint = metadata?.endpoint as { x: number; y: number } | undefined;

    if (!endpoint) {
      return { strategy, found: false, confidence: 0, duration: Date.now() - startTime, error: 'No endpoint' };
    }

    // Get element at recorded coordinates
    const cdp = this.services.cdpService;
    const result = await cdp.sendCommand<{ backendNodeId: number }>(tabId, 'DOM.getNodeForLocation', {
      x: Math.round(endpoint.x),
      y: Math.round(endpoint.y)
    });

    if (!result.success || !(result.result as any)?.backendNodeId) {
      return { strategy, found: false, confidence: 0, duration: Date.now() - startTime, error: 'No element at coordinates' };
    }

    return {
      strategy,
      found: true,
      confidence: this.STRATEGY_WEIGHTS.evidence_scoring,
      backendNodeId: (result.result as any).backendNodeId,
      clickPoint: endpoint,
      duration: Date.now() - startTime
    };
  }

  // ==========================================================================
  // STRATEGY SELECTION
  // ==========================================================================

  selectBestStrategy(results: EvaluationResults): StrategyEvaluationResult | null {
    const successful = results.results.filter(r => r.found && r.confidence >= this.config.minConfidence);

    if (successful.length === 0) return null;

    // Sort by weighted confidence (strategy weight * evaluation confidence)
    successful.sort((a, b) => {
      const aWeighted = this.calculateWeightedConfidence(a);
      const bWeighted = this.calculateWeightedConfidence(b);
      return bWeighted - aWeighted;
    });

    return successful[0];
  }

  calculateWeightedConfidence(result: StrategyEvaluationResult): number {
    const baseWeight = this.STRATEGY_WEIGHTS[result.strategy.type] ?? 0.5;
    return baseWeight * result.confidence;
  }

  getStrategyWeight(type: StrategyType): number {
    return this.STRATEGY_WEIGHTS[type] ?? 0.5;
  }

  // ==========================================================================
  // ACTION EXECUTION
  // ==========================================================================

  async performAction(
    tabId: number,
    backendNodeId: number | undefined,
    clickPoint: { x: number; y: number } | undefined,
    actionType: ActionRequest['actionType'],
    value?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cdp = this.services.cdpService;

      switch (actionType) {
        case 'click':
          await this.executeClick(tabId, backendNodeId, clickPoint);
          break;

        case 'type':
          if (!value) return { success: false, error: 'No value for type action' };
          if (!backendNodeId) return { success: false, error: 'No element for type action' };
          await this.executeType(tabId, backendNodeId, value);
          break;

        case 'select':
          if (!value) return { success: false, error: 'No value for select action' };
          if (!backendNodeId) return { success: false, error: 'No element for select action' };
          await this.executeSelect(tabId, backendNodeId, value);
          break;

        case 'hover':
          if (clickPoint) {
            await cdp.dispatchMouseEvent(tabId, 'mouseMoved', clickPoint.x, clickPoint.y);
          }
          break;

        case 'scroll':
          if (backendNodeId) {
            const descResult = await cdp.sendCommand<{ node: { nodeId: number } }>(tabId, 'DOM.describeNode', { backendNodeId, depth: 0 });
            if (descResult.success && (descResult.result as any)?.node?.nodeId) {
              await cdp.sendCommand(tabId, 'DOM.scrollIntoViewIfNeeded', { backendNodeId });
            }
          }
          break;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Action failed' };
    }
  }

  private async executeClick(
    tabId: number,
    backendNodeId: number | undefined,
    clickPoint: { x: number; y: number } | undefined
  ): Promise<void> {
    const cdp = this.services.cdpService;
    let point = clickPoint;

    if (!point && backendNodeId) {
      point = await this.services.locators.getClickPoint(tabId, backendNodeId) ?? undefined;
    }

    if (!point) throw new Error('No click point available');

    await cdp.dispatchMouseEvent(tabId, 'mouseMoved', point.x, point.y);
    await cdp.dispatchMouseEvent(tabId, 'mousePressed', point.x, point.y, { button: 'left', clickCount: 1 });
    await cdp.dispatchMouseEvent(tabId, 'mouseReleased', point.x, point.y, { button: 'left', clickCount: 1 });
  }

  private async executeType(tabId: number, backendNodeId: number, value: string): Promise<void> {
    const cdp = this.services.cdpService;
    const descResult = await cdp.sendCommand<{ node: { nodeId: number } }>(tabId, 'DOM.describeNode', { backendNodeId, depth: 0 });

    if (!descResult.success || !(descResult.result as any)?.node?.nodeId) {
      throw new Error('Could not resolve node for typing');
    }

    await cdp.sendCommand(tabId, 'DOM.focus', { backendNodeId });
    await cdp.insertText(tabId, value);
  }

  private async executeSelect(tabId: number, backendNodeId: number, value: string): Promise<void> {
    const clickPoint = await this.services.locators.getClickPoint(tabId, backendNodeId);
    if (clickPoint) {
      await this.executeClick(tabId, undefined, clickPoint);
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const optionResult = await this.services.locators.getByText(tabId, value, { exact: true });
    if (optionResult.found && optionResult.backendNodeId) {
      await this.executeClick(tabId, optionResult.backendNodeId, undefined);
    } else {
      throw new Error(`Option "${value}" not found`);
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      )
    ]);
  }

  private async logTelemetry(
    actionId: string | undefined,
    result: ActionExecutionResult,
    evaluationResults: EvaluationResults
  ): Promise<void> {
    if (!this.config.enableTelemetry || !actionId) return;

    const strategyEvals: StrategyEvaluation[] = evaluationResults.results.map(r => ({
      type: r.strategy.type,
      found: r.found,
      confidence: r.confidence,
      duration: r.duration,
      error: r.error
    }));

    await this.services.telemetryLogger.endAction(actionId, {
      success: result.success,
      usedStrategy: result.usedStrategy.type,
      confidence: result.usedStrategy ? this.calculateWeightedConfidence({
        strategy: result.usedStrategy,
        found: true,
        confidence: evaluationResults.bestStrategy?.confidence ?? 0,
        duration: 0
      }) : 0,
      evaluationResults: { results: strategyEvals },
      executionDuration: result.executionDuration,
      error: result.error
    });
  }

  getStatus(): DecisionEngineStatus {
    return this.status;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: DecisionEngine | null = null;

export function getDecisionEngine(services?: ServiceDependencies): DecisionEngine {
  if (!instance) {
    if (!services) {
      throw new Error('DecisionEngine requires services on first initialization');
    }
    instance = new DecisionEngine(services);
  }
  return instance;
}
