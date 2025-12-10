// ═══════════════════════════════════════════════════════════════════════════════
// START FIX SP-A2 (Part A)
// File: src/types/verification.ts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @fileoverview Verification Types
 * @description Type definitions for the post-stop verification system.
 * Used by RepairOrchestrator, StepVerifier, and Recorder UI.
 * 
 * @module types/verification
 * @version 1.0.0
 * @since Phase 4
 */

import type { StrategyType, LocatorStrategy } from './strategy';

// ============================================================================
// STATUS TYPES
// ============================================================================

/**
 * Verification status for a single step
 */
export type VerificationStatus = 
  | 'pending'      // Not yet verified
  | 'verifying'    // Currently being verified
  | 'verified'     // Has working strategy, ready for save
  | 'flagged'      // No working strategy, needs human intervention
  | 'repaired'     // Human provided fix, re-verified successfully
  | 'skipped';     // Navigation step, no verification needed

/**
 * Overall session status
 */
export type SessionStatus =
  | 'idle'         // No verification in progress
  | 'running'      // Verification in progress
  | 'paused'       // User paused verification
  | 'complete'     // All steps processed
  | 'error';       // Verification failed with error

// ============================================================================
// STEP VERIFICATION
// ============================================================================

/**
 * Verification state for a single step
 * Used by UI to display step status and results
 */
export interface StepVerificationState {
  /** Step index in the recording */
  stepIndex: number;
  
  /** Current verification status */
  status: VerificationStatus;
  
  /** Working strategy if verified */
  workingStrategy?: LocatorStrategy;
  
  /** Confidence of working strategy (0-1) */
  confidence: number;
  
  /** All strategies tested and their results */
  strategyResults: StrategyTestSummary[];
  
  /** Why step was flagged (if status === 'flagged') */
  flagReason?: string;
  
  /** Human-provided repair (if status === 'repaired') */
  repair?: StepRepair;
  
  /** Time taken to verify in ms */
  verificationDuration: number;
}

/**
 * Summary of a strategy test (for UI display)
 */
export interface StrategyTestSummary {
  type: StrategyType;
  found: boolean;
  confidence: number;
  duration: number;
  error?: string;
}

// ============================================================================
// REPAIR TYPES
// ============================================================================

/**
 * Human-provided repair for a flagged step
 */
export interface StepRepair {
  /** Type of repair provided */
  repairType: RepairType;
  
  /** New strategy from repair */
  newStrategy: LocatorStrategy;
  
  /** When repair was made */
  repairedAt: number;
  
  /** Optional notes from user */
  notes?: string;
}

/**
 * Types of repairs a human can provide
 */
export type RepairType =
  | 'vision_region'    // User drew a region for Vision OCR
  | 'manual_selector'  // User entered CSS/XPath selector
  | 'click_again'      // User re-clicked to capture better
  | 'accept_coordinates' // User accepted fragile coordinates
  | 'custom';          // Other repair method

// ============================================================================
// SESSION TYPES
// ============================================================================

/**
 * Complete verification session
 * Tracks progress of verifying all steps in a recording
 */
export interface VerificationSession {
  /** Unique session ID */
  sessionId: string;
  
  /** Project/recording being verified */
  projectId: string;
  
  /** Tab ID where verification is running */
  tabId: number;
  
  /** Overall session status */
  status: SessionStatus;
  
  /** Verification state for each step */
  steps: StepVerificationState[];
  
  /** When session started */
  startedAt: number;
  
  /** When session ended (if complete) */
  endedAt?: number;
  
  /** Summary statistics */
  summary: VerificationSummary;
}

/**
 * Summary statistics for a verification session
 */
export interface VerificationSummary {
  /** Total steps in recording */
  totalSteps: number;
  
  /** Steps verified successfully */
  verifiedCount: number;
  
  /** Steps flagged for repair */
  flaggedCount: number;
  
  /** Steps repaired by human */
  repairedCount: number;
  
  /** Steps skipped (navigation) */
  skippedCount: number;
  
  /** Verification rate (verified / total actionable) */
  verificationRate: number;
  
  /** Can save? (all actionable steps verified or repaired) */
  canSave: boolean;
}

// ============================================================================
// EVENT TYPES (for progress updates)
// ============================================================================

/**
 * Progress event emitted during verification
 */
export interface VerificationProgressEvent {
  type: 'step_started' | 'step_complete' | 'session_complete' | 'error';
  sessionId: string;
  stepIndex?: number;
  stepState?: StepVerificationState;
  summary?: VerificationSummary;
  error?: string;
}

/**
 * Callback for verification progress
 */
export type VerificationProgressCallback = (event: VerificationProgressEvent) => void;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a step needs human intervention
 */
export function needsRepair(status: VerificationStatus): boolean {
  return status === 'flagged';
}

/**
 * Check if a step is actionable (not navigation)
 */
export function isActionableStep(eventType: string): boolean {
  return !['open', 'navigate', 'wait'].includes(eventType.toLowerCase());
}

/**
 * Calculate if session can save
 */
export function canSaveSession(steps: StepVerificationState[]): boolean {
  return steps.every(s => 
    s.status === 'verified' || 
    s.status === 'repaired' || 
    s.status === 'skipped'
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// END FIX SP-A2 (Part A)
// ═══════════════════════════════════════════════════════════════════════════════
