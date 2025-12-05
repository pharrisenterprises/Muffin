// =============================================================================
// BATCH 10-11: Evidence System - Barrel Exports
// =============================================================================

// Types
export * from './types';

// Components
export { MouseTrailTracker, createMouseTrailTracker } from './MouseTrailTracker';
export { SequencePatternAnalyzer, createSequencePatternAnalyzer } from './SequencePatternAnalyzer';
export * from './EvidenceScorers';
export { EvidenceAggregator, createEvidenceAggregator, evidenceAggregator } from './EvidenceAggregator';

// Batch 11: Element Traverser (Iframe + Shadow DOM support)
export {
  ElementTraverser,
  createElementTraverser,
  elementTraverser,
  type TraversalContext,
  type CandidateWithContext,
  type TraverserConfig
} from './ElementTraverser';

// Batch 13: Utilities
export * from './utils';

// Batch 13: LocalDecisionEngine (backwards compatibility wrapper)
export { 
  LocalDecisionEngine, 
  createLocalDecisionEngine, 
  decisionEngine,
  type DecisionResult,
  type DecisionEngineConfig
} from './LocalDecisionEngine';
