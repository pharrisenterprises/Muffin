/**
 * LocalDecisionEngine - Thin wrapper around EvidenceAggregator
 * Provides backwards compatibility for existing code
 * @deprecated Use EvidenceAggregator directly for new code
 */

import { EvidenceAggregator, createEvidenceAggregator, evidenceAggregator } from './EvidenceAggregator';
import { EvidenceConfig, EvidenceResult, StepWithEvidence } from './types';

export type DecisionResult = EvidenceResult;
export type DecisionEngineConfig = EvidenceConfig;

export class LocalDecisionEngine {
  private aggregator: EvidenceAggregator;
  
  constructor(config: Partial<DecisionEngineConfig> = {}) {
    this.aggregator = createEvidenceAggregator(config);
  }
  
  startTracking(): void { this.aggregator.startRecordingTracking(); }
  stopTracking(): void { this.aggregator.stopRecordingTracking(); }
  
  recordStep(step: StepWithEvidence): void {
    this.aggregator.captureStepEvidence(step);
  }
  
  async findElement(
    targetStep: StepWithEvidence,
    previousSteps: StepWithEvidence[] = []
  ): Promise<DecisionResult> {
    return this.aggregator.findElement(targetStep, previousSteps);
  }
  
  reset(): void { this.aggregator.reset(); }
  exportPatterns(): object { return this.aggregator.exportPatterns(); }
  importPatterns(patterns: object): void { this.aggregator.importPatterns(patterns as any); }
  getAggregator(): EvidenceAggregator { return this.aggregator; }
}

export function createLocalDecisionEngine(config?: Partial<DecisionEngineConfig>): LocalDecisionEngine {
  return new LocalDecisionEngine(config);
}

export const decisionEngine = new LocalDecisionEngine();

// Re-export for convenience
export { EvidenceAggregator, createEvidenceAggregator, evidenceAggregator };
