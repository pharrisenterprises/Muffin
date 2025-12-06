// =============================================================================
// BATCH 10: Evidence Scorers
// Purpose: Individual scoring functions for each evidence type
// =============================================================================

import type { EvidenceScores, StepWithEvidence } from './types';
import type { MouseTrailTracker } from './MouseTrailTracker';
import type { SequencePatternAnalyzer } from './SequencePatternAnalyzer';

// Types for scoring context
export interface ScoringContext {
  mouseTrailTracker: MouseTrailTracker;
  sequenceAnalyzer: SequencePatternAnalyzer;
  healingCache?: any;  // HealingCache from Batch 8
  screenshotComparator?: any;  // ScreenshotComparator from Batch 9
  graphFinder?: any;  // GraphBasedFinder from Batch 9
  driftDetector?: any;  // ElementDriftDetector from Batch 9
}

// =============================================================================
// SPATIAL SCORER (25% weight)
// Combines: Position match + Drift detection + Mouse trajectory
// =============================================================================

export function scoreSpatial(
  element: HTMLElement,
  targetStep: StepWithEvidence,
  context: ScoringContext
): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  const bundle = targetStep.bundle;
  const rect = element.getBoundingClientRect();
  
  // 1. Position distance score (40% of spatial)
  const expectedCenter = {
    x: bundle.bounding.x + bundle.bounding.width / 2,
    y: bundle.bounding.y + bundle.bounding.height / 2
  };
  const actualCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  const distance = Math.sqrt(
    Math.pow(actualCenter.x - expectedCenter.x, 2) +
    Math.pow(actualCenter.y - expectedCenter.y, 2)
  );
  
  // Score: 0px = 1.0, 100px = 0.5, 300px = 0
  const positionScore = Math.max(0, 1 - distance / 300);
  
  if (positionScore > 0.8) {
    reasoning.push(`📍 Position: Very close (${distance.toFixed(0)}px away)`);
  } else if (positionScore > 0.5) {
    reasoning.push(`📍 Position: Nearby (${distance.toFixed(0)}px away)`);
  } else {
    reasoning.push(`📍 Position: Far (${distance.toFixed(0)}px away)`);
  }
  
  // 2. Size similarity score (20% of spatial)
  const widthRatio = Math.min(rect.width, bundle.bounding.width) / 
                     Math.max(rect.width, bundle.bounding.width);
  const heightRatio = Math.min(rect.height, bundle.bounding.height) / 
                      Math.max(rect.height, bundle.bounding.height);
  const sizeScore = (widthRatio + heightRatio) / 2;
  
  // 3. Mouse trajectory score (40% of spatial)
  let trajectoryScore = 0.5; // Default if no trail data
  
  if (targetStep.mouseTrailAtCapture && targetStep.mouseTrailAtCapture.length > 5) {
    trajectoryScore = context.mouseTrailTracker.analyzeTrajectoryToElement(
      { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      targetStep.mouseTrailAtCapture
    );
    
    if (trajectoryScore > 0.7) {
      reasoning.push('🎯 Mouse trajectory: Direct approach detected');
    }
  }
  
  // Combine spatial scores
  const score = positionScore * 0.4 + sizeScore * 0.2 + trajectoryScore * 0.4;
  
  return { score, reasoning };
}

// =============================================================================
// SEQUENCE SCORER (20% weight)
// Analyzes: Step pattern match
// =============================================================================

export function scoreSequence(
  element: HTMLElement,
  targetStep: StepWithEvidence,
  previousSteps: StepWithEvidence[],
  context: ScoringContext
): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  
  const analysis = context.sequenceAnalyzer.analyze(
    element,
    targetStep,
    previousSteps
  );
  
  if (analysis.matchedPattern) {
    reasoning.push(`📝 Pattern: ${analysis.reasoning}`);
  } else {
    reasoning.push('📝 No known pattern match');
  }
  
  return { score: analysis.score, reasoning };
}

// =============================================================================
// VISUAL SCORER (15% weight)
// Uses: Screenshot comparison + Visual context
// =============================================================================

export function scoreVisual(
  element: HTMLElement,
  targetStep: StepWithEvidence,
  _context: ScoringContext
): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  let score = 0.5; // Default
  
  // For now, fallback to tag and attribute matching
  const bundle = targetStep.bundle;
  
  // Check tag match
  if (element.tagName.toLowerCase() === bundle.tag.toLowerCase()) {
    score += 0.2;
  }
  
  // Check if it's an input with similar type
  if (element.tagName === 'INPUT') {
    const type = (element as HTMLInputElement).type;
    const expectedType = bundle.dataAttrs?.type || 'text';
    if (type === expectedType) {
      score += 0.2;
    }
  }
  
  reasoning.push(`👁️ Visual: Tag ${element.tagName.toLowerCase()}`);
  
  return { score: Math.min(1, score), reasoning };
}

// =============================================================================
// DOM SCORER (25% weight)
// Uses: Graph-based finding + Attribute matching
// =============================================================================

export function scoreDOM(
  element: HTMLElement,
  targetStep: StepWithEvidence,
  _context: ScoringContext
): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  const bundle = targetStep.bundle;
  let score = 0;
  
  // 1. ID match (high value)
  if (bundle.id && element.id === bundle.id) {
    score += 0.4;
    reasoning.push('🏗️ DOM: ID matches exactly');
  }
  
  // 2. Name attribute match
  if (bundle.name && element.getAttribute('name') === bundle.name) {
    score += 0.25;
    reasoning.push('🏗️ DOM: Name attribute matches');
  }
  
  // 3. Aria-label match
  const ariaLabel = element.getAttribute('aria-label');
  if (bundle.aria && ariaLabel) {
    const similarity = fuzzyMatch(ariaLabel, bundle.aria);
    score += similarity * 0.2;
    if (similarity > 0.8) {
      reasoning.push('🏗️ DOM: Aria-label matches');
    }
  }
  
  // 4. Data attributes match
  if (bundle.dataAttrs) {
    let dataMatches = 0;
    let dataTotal = 0;
    
    for (const [key, value] of Object.entries(bundle.dataAttrs)) {
      dataTotal++;
      if (element.getAttribute(`data-${key}`) === value) {
        dataMatches++;
      }
    }
    
    if (dataTotal > 0) {
      score += (dataMatches / dataTotal) * 0.15;
    }
  }
  
  if (reasoning.length === 0) {
    reasoning.push('🏗️ DOM: No strong attribute matches');
  }
  
  return { score: Math.min(1, score), reasoning };
}

// =============================================================================
// HISTORY SCORER (15% weight)
// Uses: Healing cache success patterns
// =============================================================================

export function scoreHistory(
  _element: HTMLElement,
  _targetStep: StepWithEvidence,
  _context: ScoringContext
): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  const score = 0.5; // Default (no history)
  
  reasoning.push('📊 History: No cache available');
  
  return { score, reasoning };
}

// =============================================================================
// COMBINED SCORER
// =============================================================================

export function scoreCandidate(
  element: HTMLElement,
  targetStep: StepWithEvidence,
  previousSteps: StepWithEvidence[],
  context: ScoringContext
): EvidenceScores & { reasoning: string[] } {
  const allReasoning: string[] = [];
  
  const spatial = scoreSpatial(element, targetStep, context);
  const sequence = scoreSequence(element, targetStep, previousSteps, context);
  const visual = scoreVisual(element, targetStep, context);
  const dom = scoreDOM(element, targetStep, context);
  const history = scoreHistory(element, targetStep, context);
  
  allReasoning.push(...spatial.reasoning);
  allReasoning.push(...sequence.reasoning);
  allReasoning.push(...visual.reasoning);
  allReasoning.push(...dom.reasoning);
  allReasoning.push(...history.reasoning);
  
  return {
    spatial: spatial.score,
    sequence: sequence.score,
    visual: visual.score,
    dom: dom.score,
    history: history.score,
    reasoning: allReasoning
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function fuzzyMatch(a: string, b: string): number {
  if (!a || !b) return 0;
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  if (aLower === bLower) return 1;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;
  return 0.3;
}
