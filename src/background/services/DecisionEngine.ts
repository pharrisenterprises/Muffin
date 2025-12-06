// src/background/services/DecisionEngine.ts
import { cdpService } from "./CDPService";
import { playwrightLocators } from "./PlaywrightLocators";
import type { StrategyType, LocatorStrategy, FallbackChain, StrategyAttempt, StrategyTelemetry } from "../../types/strategy";
import type { LocatorResult } from "../../types/cdp";

export interface DecisionResult {
  success: boolean;
  strategy: StrategyType | null;
  element?: Element;
  nodeId?: number;
  telemetry: StrategyTelemetry;
}

class DecisionEngine {
  private readonly _strategyOrder: StrategyType[] = [
    "dom_selector",
    "css_selector",
    "cdp_semantic",
    "cdp_power",
    "evidence_scoring",
    "vision_ocr",
    "coordinates"
  ];

  async executeWithFallback(tabId: number, fallbackChain: FallbackChain, stepId: number): Promise<DecisionResult> {
    const attempts: StrategyAttempt[] = [];
    const startTime = Date.now();
    for (const strategy of fallbackChain.strategies) {
      const attemptStart = Date.now();
      try {
        const result = await this.tryStrategy(tabId, strategy);
        attempts.push({
          strategy: strategy.type,
          success: result.found,
          duration: Date.now() - attemptStart,
          confidence: result.confidence,
          attemptNumber: attempts.length + 1
        });
        if (result.found) {
          return {
            success: true,
            strategy: strategy.type,
            nodeId: result.cdpNode?.nodeId,
            telemetry: { stepId, attempts, finalStrategy: strategy.type, totalDuration: Date.now() - startTime, timestamp: Date.now() }
          };
        }
      } catch (e) {
        attempts.push({
          strategy: strategy.type,
          success: false,
          duration: Date.now() - attemptStart,
          confidence: 0,
          error: String(e),
          attemptNumber: attempts.length + 1
        });
      }
    }
    return {
      success: false,
      strategy: null,
      telemetry: { stepId, attempts, finalStrategy: null, totalDuration: Date.now() - startTime, timestamp: Date.now() }
    };
  }

  private async tryStrategy(tabId: number, strategy: LocatorStrategy): Promise<LocatorResult> {
    switch (strategy.type) {
      case "dom_selector":
      case "css_selector":
        if (!strategy.selector) return { found: false, confidence: 0, duration: 0 };
        const nodeId = await cdpService.querySelector(tabId, strategy.selector);
        return { found: !!nodeId, confidence: nodeId ? 0.95 : 0, duration: 0 };
      case "cdp_semantic":
        if (strategy.metadata?.role) {
          return playwrightLocators.getByRole(tabId, strategy.metadata.role, { name: strategy.metadata.text });
        }
        if (strategy.metadata?.text) {
          return playwrightLocators.getByText(tabId, strategy.metadata.text);
        }
        return { found: false, confidence: 0, duration: 0 };
      case "cdp_power":
        if (strategy.metadata?.testId) {
          return playwrightLocators.getByTestId(tabId, strategy.metadata.testId);
        }
        if (strategy.metadata?.label) {
          return playwrightLocators.getByLabel(tabId, strategy.metadata.label);
        }
        if (strategy.metadata?.placeholder) {
          return playwrightLocators.getByPlaceholder(tabId, strategy.metadata.placeholder);
        }
        return { found: false, confidence: 0, duration: 0 };
      default:
        return { found: false, confidence: 0, duration: 0 };
    }
  }

  buildFallbackChain(selector?: string, metadata?: LocatorStrategy["metadata"]): FallbackChain {
    const strategies: LocatorStrategy[] = [];
    if (selector) {
      strategies.push({ type: "dom_selector", selector, confidence: 0.9 });
      strategies.push({ type: "css_selector", selector, confidence: 0.85 });
    }
    if (metadata?.role) {
      strategies.push({ type: "cdp_semantic", confidence: 0.9, metadata });
    }
    if (metadata?.testId || metadata?.label || metadata?.placeholder) {
      strategies.push({ type: "cdp_power", confidence: 0.85, metadata });
    }
    if (metadata?.text) {
      strategies.push({ type: "cdp_semantic", confidence: 0.8, metadata: { text: metadata.text } });
    }
    strategies.push({ type: "vision_ocr", confidence: 0.7, metadata });
    if (metadata?.coordinates) {
      strategies.push({ type: "coordinates", confidence: 0.6, metadata });
    }
    return { strategies, primaryStrategy: strategies[0]?.type || "dom_selector", recordedAt: Date.now() };
  }
}

export const decisionEngine = new DecisionEngine();
