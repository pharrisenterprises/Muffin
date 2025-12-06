// src/types/vision.ts
export interface VisionConfig {
  enabled: boolean;
  confidenceThreshold: number;
  pollIntervalMs: number;
  scrollRetries: number;
  useSIMD: boolean;
  language: "eng" | "spa" | "fra" | "deu";
  debugMode: boolean;
  screenshotQuality: number;
  devicePixelRatio: number;
  fuzzyMatchThreshold: number;
}

export interface TextResult {
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ClickTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
  timestamp: number;
  center: { x: number; y: number };
}

export interface ConditionalConfig {
  enabled: boolean;
  searchTerms: string[];
  timeoutSeconds: number;
  pollIntervalMs: number;
  interactionType: "click" | "type" | "dropdown";
  successText?: string;
}

export interface ConditionalClickResult {
  success: boolean;
  attempts: number;
  totalWaitMs: number;
  buttonsClicked: number;
  clickTargets: ClickTarget[];
  error?: string;
}

export interface VisionData {
  targetText: string;
  clickTarget: ClickTarget;
  screenshot?: string;
  ocrConfidence: number;
}

export interface Screenshot {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface OcrResult {
  results: TextResult[];
  duration: number;
  timestamp: number;
}

export const DEFAULT_VISION_CONFIG: VisionConfig = {
  enabled: true,
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  useSIMD: true,
  language: "eng",
  debugMode: false,
  screenshotQuality: 0.92,
  devicePixelRatio: 1,
  fuzzyMatchThreshold: 0.7
};

export const DEFAULT_CONDITIONAL_CONFIG: ConditionalConfig = {
  enabled: false,
  searchTerms: ["Allow", "Keep", "Continue", "Accept"],
  timeoutSeconds: 120,
  pollIntervalMs: 1000,
  interactionType: "click"
};
