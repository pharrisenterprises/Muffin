// =============================================================================
// BATCH 10: Evidence Types
// =============================================================================

/**
 * Mouse position with timestamp during recording
 */
export interface MouseTrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Step sequence pattern for learning form flows
 * Example: "First Name" → "Last Name" → "Email" → "Phone"
 */
export interface SequencePattern {
  patternId: string;
  pageUrlPattern: string;        // Wildcard pattern
  labelSequence: string[];       // Ordered labels
  confidence: number;            // How often this pattern occurs
  occurrences: number;
  lastSeen: number;
}

/**
 * Evidence scores for a candidate element
 */
export interface EvidenceScores {
  spatial: number;   // 0-1: Position match + drift + mouse path
  sequence: number;  // 0-1: Fits step pattern
  visual: number;    // 0-1: Screenshot + visual context
  dom: number;       // 0-1: Graph structure + attributes
  history: number;   // 0-1: Past success from healing cache
}

/**
 * Candidate element with evidence scores
 */
export interface ScoredCandidate {
  element: HTMLElement;
  selector: string;
  scores: EvidenceScores;
  totalScore: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
}

/**
 * Result of evidence-based element finding
 */
export interface EvidenceResult {
  success: boolean;
  selectedElement?: HTMLElement;
  selectedSelector?: string;
  confidence: number;
  candidates: ScoredCandidate[];
  reasoning: string[];
  fallbackRequired: boolean;
}

/**
 * Evidence scoring weights (must sum to 1.0)
 */
export interface EvidenceWeights {
  spatial: number;   // Default: 0.25
  sequence: number;  // Default: 0.20
  visual: number;    // Default: 0.15
  dom: number;       // Default: 0.25
  history: number;   // Default: 0.15
}

/**
 * Evidence scoring thresholds
 */
export interface EvidenceThresholds {
  autoApply: number;   // >= this = auto-apply (default 0.85)
  applyFlag: number;   // >= this = apply + flag (default 0.60)
  reject: number;      // < this = reject candidate (default 0.30)
}

/**
 * Evidence scoring configuration
 */
export interface EvidenceConfig {
  weights: EvidenceWeights;
  thresholds: EvidenceThresholds;
  maxCandidates: number;       // Max elements to evaluate (default 50)
  searchRadius: number;        // Pixels from expected position (default 300)
  mouseTrailMaxPoints: number; // Max trail points to keep (default 200)
  mouseTrailThrottleMs: number;// Throttle mouse events (default 50)
}

/**
 * Recorded step extended with evidence data
 */
export interface StepWithEvidence {
  // From RecordedStep (Batch 1)
  stepNumber: number;
  event: string;
  selector?: string;
  bundle: any;  // LocatorBundle
  label: string;
  labelConfidence: number;
  value?: string;
  timestamp: number;
  url: string;
  
  // From Batch 9
  elementGraph?: any;         // ElementGraph
  validationResult?: any;     // StepValidationResult
  
  // NEW: From Batch 10
  mouseTrailAtCapture?: MouseTrailPoint[];  // Mouse path leading to element
  previousLabels?: string[];                 // Labels of previous N steps
}

/**
 * Exportable patterns for persistence
 */
export interface ExportedPatterns {
  sequencePatterns: SequencePattern[];
  spatialPatterns: Record<string, any>;  // Page-specific position patterns
  exportedAt: number;
  version: string;
}

/**
 * Extended step with scroll position at record time
 * Needed for scroll compensation during playback
 */
export interface StepWithScrollContext extends StepWithEvidence {
  scrollAtCapture?: {
    x: number;
    y: number;
  };
}

/**
 * Traversal result with full context
 */
export interface TraversalResult {
  element: HTMLElement;
  iframeChain: number[];
  shadowHosts: string[];
  scrollOffset: { x: number; y: number };
}
