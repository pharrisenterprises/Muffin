// src/types/strategy.ts
export type StrategyType = 
  | "dom_selector"
  | "css_selector"
  | "cdp_semantic"
  | "cdp_power"
  | "evidence_scoring"
  | "vision_ocr"
  | "coordinates";

export type RecordedVia = "dom" | "vision" | "manual" | "cdp";

export interface LocatorStrategy {
  type: StrategyType;
  selector?: string;
  confidence: number;
  speed?: number;
  metadata?: {
    role?: string;
    text?: string;
    label?: string;
    placeholder?: string;
    testId?: string;
    coordinates?: { x: number; y: number };
  };
}

export interface FallbackChain {
  strategies: LocatorStrategy[];
  primaryStrategy: StrategyType;
  recordedAt: number;
}

export interface StrategyAttempt {
  strategy: StrategyType;
  success: boolean;
  duration: number;
  confidence: number;
  error?: string;
  attemptNumber: number;
}

export interface StrategyTelemetry {
  stepId: number;
  attempts: StrategyAttempt[];
  finalStrategy: StrategyType | null;
  totalDuration: number;
  timestamp: number;
}
