// ═══════════════════════════════════════════════════════════════════════════════
// START FIX SP-A3
// File: src/services/RepairOrchestrator.ts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @fileoverview Repair Orchestrator Service
 * @description Coordinates post-stop verification of recorded steps.
 * Manages the flow: Record → Stop → Verify → Repair → Save
 * 
 * @module services/RepairOrchestrator
 * @version 1.0.0
 * @since Phase 4
 */

import { getStepVerifier, type RecordedStep } from './StepVerifier';
import type {
  VerificationSession,
  VerificationSummary,
  StepVerificationState,
  StepRepair,
  VerificationProgressEvent,
  VerificationProgressCallback
} from '../types/verification';

// ============================================================================
// REPAIR ORCHESTRATOR CLASS
// ============================================================================

export class RepairOrchestrator {
  private session: VerificationSession | null = null;
  private progressCallbacks: Set<VerificationProgressCallback> = new Set();
  private abortController: AbortController | null = null;

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Start verification session for recorded steps
   * Called by Recorder.tsx after [Stop] is clicked
   */
  async startVerification(
    projectId: string,
    steps: RecordedStep[],
    tabId: number
  ): Promise<VerificationSession> {
    // Abort any existing session
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    // Initialize session
    this.session = {
      sessionId: `verify_${Date.now()}`,
      projectId,
      tabId,
      status: 'running',
      steps: steps.map((step, index) => this.createInitialStepState(step, index)),
      startedAt: Date.now(),
      summary: this.calculateSummary([])
    };

    // Start verification in background
    this.runVerification(steps, tabId, this.abortController.signal);

    return this.session;
  }

  /**
   * Pause verification
   */
  pause(): void {
    if (this.session && this.session.status === 'running') {
      this.session.status = 'paused';
      this.emitProgress({ type: 'step_complete', sessionId: this.session.sessionId });
    }
  }

  /**
   * Resume verification
   */
  resume(): void {
    if (this.session && this.session.status === 'paused') {
      this.session.status = 'running';
    }
  }

  /**
   * Stop/cancel verification
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.session) {
      this.session.status = 'complete';
      this.session.endedAt = Date.now();
    }
  }

  /**
   * Get current session
   */
  getSession(): VerificationSession | null {
    return this.session;
  }

  /**
   * Check if ready to save (all steps verified/repaired)
   */
  canSave(): boolean {
    return this.session?.summary.canSave ?? false;
  }

  // ==========================================================================
  // VERIFICATION LOGIC
  // ==========================================================================

  private async runVerification(
    steps: RecordedStep[],
    tabId: number,
    signal: AbortSignal
  ): Promise<void> {
    const verifier = getStepVerifier();

    for (let i = 0; i < steps.length; i++) {
      // Check for abort
      if (signal.aborted) {
        console.log('[RepairOrchestrator] Verification aborted');
        return;
      }

      // Wait if paused
      while (this.session?.status === 'paused') {
        await this.delay(100);
        if (signal.aborted) return;
      }

      const step = steps[i];
      const stepState = this.session!.steps[i];

      // Skip navigation steps
      if (this.isNavigationStep(step)) {
        stepState.status = 'skipped';
        stepState.verificationDuration = 0;
        this.updateSummary();
        this.emitProgress({
          type: 'step_complete',
          sessionId: this.session!.sessionId,
          stepIndex: i,
          stepState
        });
        continue;
      }

      // Mark as verifying
      stepState.status = 'verifying';
      this.emitProgress({
        type: 'step_started',
        sessionId: this.session!.sessionId,
        stepIndex: i,
        stepState
      });

      // Run verification
      try {
        const result = await verifier.verifyStep(step, tabId);

        // Update step state
        stepState.status = result.verified ? 'verified' : 'flagged';
        stepState.workingStrategy = result.workingStrategy;
        stepState.confidence = result.confidence;
        stepState.strategyResults = result.strategyResults.map(r => ({
          type: r.strategy.type,
          found: r.found,
          confidence: r.confidence,
          duration: r.duration,
          error: r.error
        }));
        stepState.flagReason = result.failureReason;
        stepState.verificationDuration = result.verificationDuration;

      } catch (error) {
        stepState.status = 'flagged';
        stepState.flagReason = error instanceof Error ? error.message : 'Verification error';
        stepState.verificationDuration = 0;
      }

      // Update summary and emit progress
      this.updateSummary();
      this.emitProgress({
        type: 'step_complete',
        sessionId: this.session!.sessionId,
        stepIndex: i,
        stepState,
        summary: this.session!.summary
      });
    }

    // Mark session complete
    if (this.session) {
      this.session.status = 'complete';
      this.session.endedAt = Date.now();
      this.emitProgress({
        type: 'session_complete',
        sessionId: this.session.sessionId,
        summary: this.session.summary
      });
    }
  }

  // ==========================================================================
  // REPAIR METHODS
  // ==========================================================================

  /**
   * Apply human repair to a flagged step
   */
  async repairStep(
    stepIndex: number,
    repair: StepRepair,
    tabId: number
  ): Promise<boolean> {
    if (!this.session || stepIndex >= this.session.steps.length) {
      console.error('[RepairOrchestrator] Invalid step index for repair');
      return false;
    }

    const stepState = this.session.steps[stepIndex];
    
    if (stepState.status !== 'flagged') {
      console.warn('[RepairOrchestrator] Step is not flagged, no repair needed');
      return true;
    }

    // Test the new strategy
    const verifier = getStepVerifier();
    const testResult = await verifier.testStrategy(repair.newStrategy, tabId);

    if (testResult.found && testResult.confidence >= 0.5) {
      // Repair successful
      stepState.status = 'repaired';
      stepState.repair = repair;
      stepState.workingStrategy = repair.newStrategy;
      stepState.confidence = testResult.confidence;
      stepState.flagReason = undefined;

      this.updateSummary();
      this.emitProgress({
        type: 'step_complete',
        sessionId: this.session.sessionId,
        stepIndex,
        stepState,
        summary: this.session.summary
      });

      return true;
    }

    // Repair failed
    console.warn('[RepairOrchestrator] Repair strategy did not work');
    return false;
  }

  /**
   * Get flagged steps that need repair
   */
  getFlaggedSteps(): { index: number; state: StepVerificationState }[] {
    if (!this.session) return [];

    return this.session.steps
      .map((state, index) => ({ index, state }))
      .filter(({ state }) => state.status === 'flagged');
  }

  // ==========================================================================
  // PROGRESS CALLBACKS
  // ==========================================================================

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: VerificationProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  private emitProgress(event: VerificationProgressEvent): void {
    this.progressCallbacks.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[RepairOrchestrator] Progress callback error:', e);
      }
    });
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private createInitialStepState(_step: RecordedStep, index: number): StepVerificationState {
    return {
      stepIndex: index,
      status: 'pending',
      confidence: 0,
      strategyResults: [],
      verificationDuration: 0
    };
  }

  private isNavigationStep(step: RecordedStep): boolean {
    const navEvents = ['open', 'navigate', 'wait', 'goto'];
    return navEvents.includes(step.event?.toLowerCase() || '');
  }

  private updateSummary(): void {
    if (!this.session) return;
    this.session.summary = this.calculateSummary(this.session.steps);
  }

  private calculateSummary(steps: StepVerificationState[]): VerificationSummary {
    const verifiedCount = steps.filter(s => s.status === 'verified').length;
    const flaggedCount = steps.filter(s => s.status === 'flagged').length;
    const repairedCount = steps.filter(s => s.status === 'repaired').length;
    const skippedCount = steps.filter(s => s.status === 'skipped').length;
    
    const actionableSteps = steps.length - skippedCount;
    const resolvedSteps = verifiedCount + repairedCount;

    return {
      totalSteps: steps.length,
      verifiedCount,
      flaggedCount,
      repairedCount,
      skippedCount,
      verificationRate: actionableSteps > 0 ? resolvedSteps / actionableSteps : 1,
      canSave: flaggedCount === 0 && steps.every(s => 
        s.status === 'verified' || 
        s.status === 'repaired' || 
        s.status === 'skipped' ||
        s.status === 'pending' // Still verifying is OK
      ) && steps.some(s => s.status !== 'pending') // At least one processed
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: RepairOrchestrator | null = null;

export function getRepairOrchestrator(): RepairOrchestrator {
  if (!instance) {
    instance = new RepairOrchestrator();
  }
  return instance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// END FIX SP-A3
// ═══════════════════════════════════════════════════════════════════════════════
