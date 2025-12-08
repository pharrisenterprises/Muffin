// src/lib/factories/defaultValues.ts
// Factory functions for creating default objects

import type { RecordedVia, FallbackChain, LocatorStrategy } from "../../types/strategy";
import type { ConditionalConfig, VisionConfig } from "../../types/vision";
import { DEFAULT_VISION_CONFIG, DEFAULT_CONDITIONAL_CONFIG } from "../../types/vision";

export function createDefaultStep(overrides?: Partial<{ label: string; event: string; selector: string; value: string; recordedVia: RecordedVia }>) {
  return {
    label: "",
    event: "click",
    value: "",
    selector: "",
    xpath: "",
    url: "",
    timestamp: Date.now(),
    recordedVia: "dom" as RecordedVia,
    delaySeconds: null,
    conditionalConfig: null,
    coordinates: null,
    ocrText: null,
    confidenceScore: null,
    ...overrides
  };
}

export function createDefaultRecording(projectId: number) {
  return {
    projectId,
    steps: [],
    schemaVersion: 3,
    loopStartIndex: 0,
    globalDelayMs: 0,
    conditionalDefaults: {
      searchTerms: DEFAULT_CONDITIONAL_CONFIG.searchTerms,
      timeoutSeconds: DEFAULT_CONDITIONAL_CONFIG.timeoutSeconds,
      pollIntervalMs: DEFAULT_CONDITIONAL_CONFIG.pollIntervalMs
    }
  };
}

export function createDefaultFallbackChain(selector?: string, metadata?: LocatorStrategy["metadata"]): FallbackChain {
  const strategies: LocatorStrategy[] = [];
  if (selector) {
    strategies.push({ type: "dom_selector", selector, confidence: 0.9 });
    strategies.push({ type: "css_selector", selector, confidence: 0.85 });
  }
  if (metadata && 'role' in metadata && metadata.role) {
    strategies.push({ type: "cdp_semantic", confidence: 0.9, metadata });
  }
  strategies.push({ type: "vision_ocr", confidence: 0.7 });
  strategies.push({ type: "coordinates", confidence: 0.5 });
  return { strategies, primaryStrategy: strategies[0]?.type || "dom_selector", recordedAt: Date.now() };
}

export function createDefaultVisionConfig(overrides?: Partial<VisionConfig>): VisionConfig {
  return { ...DEFAULT_VISION_CONFIG, ...overrides };
}

export function createDefaultConditionalConfig(overrides?: Partial<ConditionalConfig>): ConditionalConfig {
  return { ...DEFAULT_CONDITIONAL_CONFIG, ...overrides };
}
