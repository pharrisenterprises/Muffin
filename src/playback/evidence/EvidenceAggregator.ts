// =============================================================================
// BATCH 10: Evidence Aggregator
// Purpose: Combine evidence scores and make decisions
// =============================================================================
//
// INTEGRATION POINTS:
// - Batch 9 PlaybackTroubleshooter: Called as resolution strategy #4
// - Batch 9 ElementGraphCapture: Uses captured relationships
// - Batch 9 ScreenshotComparator: Uses for visual scoring
// - Batch 8 HealingCache: Uses for history scoring
//
// DATA FLOW:
//   Recording Phase:
//   User clicks → MouseTrailTracker captures trajectory
//              → SequenceAnalyzer learns patterns
//              → Evidence stored with RecordedStep
//
//   Playback Phase:
//   Element not found → EvidenceAggregator.findElement()
//                    → Gathers candidates (7 strategies)
//                    → Scores via 5 evidence types (weighted)
//                    → Returns ranked candidates with confidence
//
// SCORING FORMULA:
//   Total = (Spatial × 0.25) + (Sequence × 0.20) + (Visual × 0.15)
//         + (DOM × 0.25) + (History × 0.15)
//
//   Thresholds: ≥0.85 auto-apply, ≥0.60 suggest, <0.30 reject
// =============================================================================

import type {
  EvidenceScores,
  EvidenceConfig,
  EvidenceResult,
  ScoredCandidate,
  StepWithEvidence,
  ExportedPatterns
} from './types';
import { MouseTrailTracker, createMouseTrailTracker } from './MouseTrailTracker';
import { SequencePatternAnalyzer, createSequencePatternAnalyzer } from './SequencePatternAnalyzer';
import { scoreCandidate } from './EvidenceScorers';
import { ElementTraverser, createElementTraverser, type CandidateWithContext } from './ElementTraverser';
import { createAutoPersistence, type AutoPersistence } from './utils/autoPersistence';
import { withTimeout } from './utils/timeout';

// Default configuration
const DEFAULT_CONFIG: EvidenceConfig = {
  weights: {
    spatial: 0.25,
    sequence: 0.20,
    visual: 0.15,
    dom: 0.25,
    history: 0.15
  },
  thresholds: {
    autoApply: 0.85,
    applyFlag: 0.60,
    reject: 0.30
  },
  maxCandidates: 50,
  searchRadius: 300,
  mouseTrailMaxPoints: 200,
  mouseTrailThrottleMs: 50
};

/**
 * EvidenceAggregator combines multiple evidence sources to make
 * intelligent element selection decisions.
 */
export class EvidenceAggregator {
  private config: EvidenceConfig;
  private mouseTrailTracker: MouseTrailTracker;
  private sequenceAnalyzer: SequencePatternAnalyzer;
  private elementTraverser: ElementTraverser; // Batch 11: Iframe + shadow DOM support
  private autoPersistence: AutoPersistence<ExportedPatterns>; // Batch 12: Auto-save patterns
  
  // Optional integrations (set via setIntegrations)
  private healingCache?: any;
  private screenshotComparator?: any;
  private graphFinder?: any;
  private driftDetector?: any;
  
  // Performance metrics
  private lastAggregationTime: number = 0;
  private totalAggregations: number = 0;
  private averageAggregationTime: number = 0;
  
  constructor(config: Partial<EvidenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mouseTrailTracker = createMouseTrailTracker(this.config);
    this.sequenceAnalyzer = createSequencePatternAnalyzer(this.config);
    this.elementTraverser = createElementTraverser({
      searchRadius: config.searchRadius || 300,
      maxCandidates: config.maxCandidates || 50
    });
    
    // Batch 12: Wire auto-persistence for learned patterns
    this.autoPersistence = createAutoPersistence(
      () => this.exportPatterns(),
      (patterns) => this.importPatterns(patterns),
      { storageKey: 'muffin_evidence_patterns', autoSaveInterval: 30000, debounceMs: 2000 }
    );
    
    // Load saved patterns on initialization
    this.autoPersistence.load().then(loaded => {
      if (loaded) {
        console.log('[EvidenceAggregator] Loaded saved evidence patterns');
      }
    });
    
    // Start auto-save timer
    this.autoPersistence.start();
  }
  
  // ===========================================================================
  // INTEGRATION SETUP
  // ===========================================================================
  
  /**
   * Set optional integrations with other modules
   */
  setIntegrations(integrations: {
    healingCache?: any;
    screenshotComparator?: any;
    graphFinder?: any;
    driftDetector?: any;
  }): void {
    this.healingCache = integrations.healingCache;
    this.screenshotComparator = integrations.screenshotComparator;
    this.graphFinder = integrations.graphFinder;
    this.driftDetector = integrations.driftDetector;
  }
  
  // ===========================================================================
  // RECORDING PHASE
  // ===========================================================================
  
  /**
   * Start tracking evidence during recording
   */
  startRecordingTracking(): void {
    this.mouseTrailTracker.startTracking();
  }
  
  /**
   * Stop tracking evidence
   */
  stopRecordingTracking(): void {
    this.mouseTrailTracker.stopTracking();
  }
  
  /**
   * Capture evidence for a step during recording
   */
  captureStepEvidence(step: StepWithEvidence): StepWithEvidence {
    // Add mouse trail
    step.mouseTrailAtCapture = this.mouseTrailTracker.getTrailSnapshot();
    
    // Record for sequence learning
    this.sequenceAnalyzer.addStep(step);
    
    // Batch 12: Mark patterns dirty for auto-save
    this.autoPersistence.markDirty();
    
    return step;
  }
  
  // ===========================================================================
  // PLAYBACK PHASE - MAIN DECISION METHOD
  // ===========================================================================
  
  /**
   * Find the best matching element using evidence-based scoring
   * 
   * MAIN ENTRY POINT for evidence system. Called when standard locators fail.
   * Coordinates all 5 evidence collectors and produces ranked candidates.
   * 
   * @param targetStep - The step we're trying to find an element for
   * @param previousSteps - Steps already executed (for sequence context)
   * @returns EvidenceResult with ranked candidates and recommendation
   */
  async findElement(
    targetStep: StepWithEvidence,
    previousSteps: StepWithEvidence[] = []
  ): Promise<EvidenceResult> {
    // Batch 12: Apply timeout protection (5 seconds)
    try {
      return await withTimeout(
        this._findElementInternal(targetStep, previousSteps),
        5000,
        'Evidence scoring'
      );
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        candidates: [],
        reasoning: [`❌ Evidence scoring timeout: ${error instanceof Error ? error.message : String(error)}`],
        fallbackRequired: true
      };
    }
  }
  
  private async _findElementInternal(
    targetStep: StepWithEvidence,
    previousSteps: StepWithEvidence[] = []
  ): Promise<EvidenceResult> {
    const startTime = performance.now();
    const reasoning: string[] = [];
    reasoning.push(`🔍 Evidence analysis for step ${targetStep.stepNumber}: "${targetStep.label}"`);
    
    // Step 1: Gather candidate elements
    const candidates = this.gatherCandidates(targetStep);
    reasoning.push(`📋 Found ${candidates.length} candidate elements`);
    
    if (candidates.length === 0) {
      return {
        success: false,
        confidence: 0,
        candidates: [],
        reasoning: [...reasoning, '❌ No candidate elements found'],
        fallbackRequired: true
      };
    }
    
    // Step 2: Score each candidate
    const scoredCandidates: ScoredCandidate[] = [];
    const context = {
      mouseTrailTracker: this.mouseTrailTracker,
      sequenceAnalyzer: this.sequenceAnalyzer,
      healingCache: this.healingCache,
      screenshotComparator: this.screenshotComparator,
      graphFinder: this.graphFinder,
      driftDetector: this.driftDetector
    };
    
    for (const element of candidates) {
      const scores = scoreCandidate(element, targetStep, previousSteps, context);
      const totalScore = this.calculateTotalScore(scores);
      
      if (totalScore >= this.config.thresholds.reject) {
        scoredCandidates.push({
          element,
          selector: this.generateSelector(element),
          scores: {
            spatial: scores.spatial,
            sequence: scores.sequence,
            visual: scores.visual,
            dom: scores.dom,
            history: scores.history
          },
          totalScore,
          confidence: this.getConfidenceLevel(totalScore),
          reasoning: scores.reasoning
        });
      }
    }
    
    // Step 3: Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
    
    // Step 4: Make decision
    const topCandidate = scoredCandidates[0];
    
    if (!topCandidate) {
      return {
        success: false,
        confidence: 0,
        candidates: [],
        reasoning: [...reasoning, '❌ No candidates scored above threshold'],
        fallbackRequired: true
      };
    }
    
    // Determine action based on score
    const autoApply = topCandidate.totalScore >= this.config.thresholds.autoApply;
    const applyFlag = topCandidate.totalScore >= this.config.thresholds.applyFlag;
    
    if (autoApply) {
      reasoning.push(`✅ AUTO-APPLY: Score ${(topCandidate.totalScore * 100).toFixed(1)}%`);
    } else if (applyFlag) {
      reasoning.push(`⚠️ APPLY+FLAG: Score ${(topCandidate.totalScore * 100).toFixed(1)}% (needs review)`);
    } else {
      reasoning.push(`❓ LOW CONFIDENCE: Score ${(topCandidate.totalScore * 100).toFixed(1)}%`);
    }
    
    // Add score breakdown
    reasoning.push(`  Spatial: ${(topCandidate.scores.spatial * 100).toFixed(0)}%`);
    reasoning.push(`  Sequence: ${(topCandidate.scores.sequence * 100).toFixed(0)}%`);
    reasoning.push(`  Visual: ${(topCandidate.scores.visual * 100).toFixed(0)}%`);
    reasoning.push(`  DOM: ${(topCandidate.scores.dom * 100).toFixed(0)}%`);
    reasoning.push(`  History: ${(topCandidate.scores.history * 100).toFixed(0)}%`);
    
    // Update performance metrics
    const aggregationTime = performance.now() - startTime;
    this.updatePerformanceMetrics(aggregationTime);
    
    return {
      success: autoApply || applyFlag,
      selectedElement: topCandidate.element,
      selectedSelector: topCandidate.selector,
      confidence: topCandidate.totalScore,
      candidates: scoredCandidates.slice(0, 5), // Top 5
      reasoning,
      fallbackRequired: !autoApply && !applyFlag
    };
  }
  
  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================
  
  private calculateTotalScore(scores: EvidenceScores): number {
    const { weights } = this.config;
    
    return (
      scores.spatial * weights.spatial +
      scores.sequence * weights.sequence +
      scores.visual * weights.visual +
      scores.dom * weights.dom +
      scores.history * weights.history
    );
  }
  
  private getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= this.config.thresholds.autoApply) return 'high';
    if (score >= this.config.thresholds.applyFlag) return 'medium';
    return 'low';
  }
  
  /**
   * Gather candidate elements using ElementTraverser (Batch 11)
   * 
   * NEW: Now supports:
   * - Iframe traversal (recursive, up to 5 levels)
   * - Shadow DOM traversal (open + intercepted closed)
   * - CSS.escape() for all attribute selectors
   * - Scroll position compensation
   * - Iframe chain matching
   * 
   * Replaces old implementation that only searched main document
   */
  private gatherCandidates(step: StepWithEvidence): HTMLElement[] {
    // Use ElementTraverser to gather across all contexts
    const candidatesWithContext: CandidateWithContext[] = this.elementTraverser.gatherCandidates(
      step.bundle,
      step.bundle.iframeChain
    );
    
    // Extract just the elements
    return candidatesWithContext.map(c => c.element);
  }
  
  /**
   * Generate selector for element (with XPath fallback)
   * 
   * Priority:
   * 1. ID selector (#myId)
   * 2. Name attribute (input[name="firstName"])
   * 3. XPath (as robust fallback)
   */
  private generateSelector(element: HTMLElement): string {
    // Priority 1: ID
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Priority 2: Name attribute
    const name = element.getAttribute('name');
    if (name) {
      return `${element.tagName.toLowerCase()}[name="${name}"]`;
    }
    
    // Priority 3: XPath fallback (robust, works for dynamic elements)
    return this.getXPath(element);
  }
  
  /**
   * Generate XPath for element
   * 
   * Creates a robust XPath that works even when DOM changes.
   * Example: /html/body/div[2]/form/input[3]
   */
  private getXPath(element: HTMLElement): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    
    if (element === document.body) {
      return '/html/body';
    }
    
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current !== document.body) {
      let tagName = current.tagName.toLowerCase();
      
      // Count siblings with same tag
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          child => child.tagName === current!.tagName
        );
        
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          tagName += `[${index}]`;
        }
      }
      
      parts.unshift(tagName);
      current = current.parentElement;
    }
    
    return '/html/body/' + parts.join('/');
  }
  
  // ===========================================================================
  // PATTERN PERSISTENCE
  // ===========================================================================
  
  /**
   * Export learned patterns for persistence
   * 
   * Version Format: MAJOR.MINOR
   * - MAJOR: Breaking changes (incompatible structure)
   * - MINOR: Backward-compatible additions
   * 
   * USAGE:
   * ```typescript
   * // In background script or extension lifecycle
   * const patterns = evidenceAggregator.exportPatterns();
   * await chrome.storage.local.set({ 'evidencePatterns': patterns });
   * ```
   */
  exportPatterns(): ExportedPatterns {
    return {
      version: '1.0',  // Evidence system version
      exportedAt: Date.now(),
      sequencePatterns: this.sequenceAnalyzer.exportPatterns(),
      spatialPatterns: {}  // Reserved for future position pattern persistence
    };
  }
  
  /**
   * Import learned patterns from storage
   * 
   * Validates version compatibility:
   * - Same MAJOR version: Compatible
   * - Different MAJOR version: Reject (breaking changes)
   * - Logs warning if MINOR version mismatch
   * 
   * USAGE:
   * ```typescript
   * // On extension start
   * const { evidencePatterns } = await chrome.storage.local.get('evidencePatterns');
   * if (evidencePatterns) {
   *   const success = evidenceAggregator.importPatterns(evidencePatterns);
   *   if (!success) console.warn('Pattern import failed - version incompatible');
   * }
   * ```
   * 
   * @returns true if import succeeded, false if rejected (version incompatible)
   */
  importPatterns(exported: ExportedPatterns): boolean {
    const currentVersion = '1.0';
    const exportedVersion = exported.version || '1.0';
    
    // Parse versions
    const [currentMajor, currentMinor] = currentVersion.split('.').map(Number);
    const [exportedMajor, exportedMinor] = exportedVersion.split('.').map(Number);
    
    // Check MAJOR version compatibility
    if (currentMajor !== exportedMajor) {
      console.warn(
        `[EvidenceAggregator] Pattern version mismatch: current=${currentVersion}, exported=${exportedVersion}. Rejecting patterns.`
      );
      return false;
    }
    
    // Warn on MINOR version mismatch
    if (currentMinor !== exportedMinor) {
      console.warn(
        `[EvidenceAggregator] Pattern MINOR version mismatch: current=${currentVersion}, exported=${exportedVersion}. Attempting import...`
      );
    }
    
    // Import patterns
    try {
      if (exported.sequencePatterns) {
        this.sequenceAnalyzer.loadPatterns(exported.sequencePatterns);
        console.log(
          `[EvidenceAggregator] Imported ${exported.sequencePatterns.length} sequence patterns from ${new Date(exported.exportedAt).toLocaleString()}`
        );
      }
      return true;
    } catch (error) {
      console.error('[EvidenceAggregator] Failed to import patterns:', error);
      return false;
    }
  }
  
  /**
   * Reset all state (for testing or new recording session)
   */
  reset(): void {
    this.mouseTrailTracker.reset();
    this.sequenceAnalyzer.reset();
    this.lastAggregationTime = 0;
    this.totalAggregations = 0;
    this.averageAggregationTime = 0;
  }
  
  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================
  
  // fuzzyMatch removed - ElementTraverser has its own implementation
  
  /**
   * Update performance tracking metrics
   */
  private updatePerformanceMetrics(aggregationTime: number): void {
    this.lastAggregationTime = aggregationTime;
    this.totalAggregations++;
    
    // Rolling average
    this.averageAggregationTime =
      (this.averageAggregationTime * (this.totalAggregations - 1) + aggregationTime) /
      this.totalAggregations;
  }
  
  // ===========================================================================
  // PUBLIC API - State Management
  // ===========================================================================
  
  /**
   * Get current tracking state
   */
  getTrackingState(): {
    isTracking: boolean;
    mouseTrailLength: number;
  } {
    const state = this.mouseTrailTracker.getState();
    return {
      isTracking: state.isTracking,
      mouseTrailLength: state.pointCount
    };
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    lastAggregationTime: number;
    averageAggregationTime: number;
    totalAggregations: number;
  } {
    return {
      lastAggregationTime: this.lastAggregationTime,
      averageAggregationTime: this.averageAggregationTime,
      totalAggregations: this.totalAggregations
    };
  }
  
  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<EvidenceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Get current configuration (readonly)
   */
  getConfig(): Readonly<EvidenceConfig> {
    return { ...this.config };
  }
  
  /**
   * Get learned patterns for debugging/analysis
   */
  getPatterns(): {
    sequence: any[];
  } {
    return {
      sequence: this.sequenceAnalyzer.getPatterns()
    };
  }
}

// Factory function
export function createEvidenceAggregator(
  config?: Partial<EvidenceConfig>
): EvidenceAggregator {
  return new EvidenceAggregator(config);
}

// Singleton for easy access
export const evidenceAggregator = new EvidenceAggregator();
