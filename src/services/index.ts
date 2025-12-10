// ═══════════════════════════════════════════════════════════════════════════════
// SP-A6: Services Barrel Export
// Centralized exports for all service classes
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Verification Services (Track A)
// ─────────────────────────────────────────────────────────────────────────────
export { 
  StepVerifier, 
  getStepVerifier,
  type StepVerificationResult,
  type StrategyTestResult,
  type StepVerifierConfig,
  type RecordedStep
} from './StepVerifier';

export { 
  RepairOrchestrator, 
  getRepairOrchestrator 
} from './RepairOrchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// END SP-A6
// ═══════════════════════════════════════════════════════════════════════════════
