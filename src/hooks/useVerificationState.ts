// ═══════════════════════════════════════════════════════════════════════════════
// SP-A5: useVerificationState React Hook
// Provides React components with verification state and actions
// ADAPTED: Uses VerificationSession (current type name, not VerificationState)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import type { VerificationSession, StepRepair } from '../types/verification';

/**
 * Initial empty verification session
 */
const INITIAL_SESSION: VerificationSession | null = null;

/**
 * Return type for useVerificationState hook
 */
export interface UseVerificationStateReturn {
  /** Current verification session (null if not started) */
  session: VerificationSession | null;
  /** Whether verification is in progress */
  isVerifying: boolean;
  /** Whether verification is complete */
  isComplete: boolean;
  /** Start verification for recorded steps */
  startVerification: (projectId: string, steps: any[], tabId: number) => Promise<boolean>;
  /** Apply a repair action to a step */
  applyRepair: (stepIndex: number, repair: StepRepair, tabId: number) => Promise<boolean>;
  /** Reset state to idle */
  reset: () => void;
  /** Error message if any operation failed */
  error: string | null;
}

/**
 * React hook for managing verification state
 * 
 * Usage:
 * ```tsx
 * const { session, isVerifying, startVerification, applyRepair } = useVerificationState();
 * 
 * // Start verification when Stop is clicked
 * await startVerification(projectId, recordedSteps, tabId);
 * 
 * // Show progress
 * {session && (
 *   <div>Verified {session.summary.verifiedCount} of {session.summary.totalSteps} steps</div>
 * )}
 * 
 * // Apply repair when user fixes a step
 * await applyRepair(stepIndex, { 
 *   repairType: 'manual_selector', 
 *   newStrategy: { type: 'dom_selector', selector: '#btn' },
 *   repairedAt: Date.now(),
 *   notes: 'Fixed selector'
 * }, tabId);
 * ```
 */
export function useVerificationState(): UseVerificationStateReturn {
  const [session, setSession] = useState<VerificationSession | null>(INITIAL_SESSION);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to session updates from background
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'VERIFICATION_SESSION_UPDATE' && message.session) {
        setSession(message.session);
        setError(null);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Sync initial session in case verification is already in progress
    chrome.runtime.sendMessage({ type: 'GET_VERIFICATION_STATE' }, (response) => {
      if (response?.success && response.session) {
        setSession(response.session);
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Start verification
  const startVerification = useCallback(async (
    projectId: string, 
    steps: any[], 
    tabId: number
  ): Promise<boolean> => {
    setError(null);
    
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'START_VERIFICATION', projectId, steps, tabId },
        (response) => {
          if (chrome.runtime.lastError) {
            setError(chrome.runtime.lastError.message || 'Failed to start verification');
            resolve(false);
          } else if (response?.success) {
            if (response.session) {
              setSession(response.session);
            }
            resolve(true);
          } else {
            setError(response?.error || 'Verification failed');
            resolve(false);
          }
        }
      );
    });
  }, []);

  // Apply repair
  const applyRepair = useCallback(async (
    stepIndex: number,
    repair: StepRepair,
    tabId: number
  ): Promise<boolean> => {
    setError(null);

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'APPLY_REPAIR', stepIndex, repair, tabId },
        (response) => {
          if (chrome.runtime.lastError) {
            setError(chrome.runtime.lastError.message || 'Failed to apply repair');
            resolve(false);
          } else if (response?.success) {
            if (response.session) {
              setSession(response.session);
            }
            resolve(true);
          } else {
            setError(response?.error || 'Repair failed');
            resolve(false);
          }
        }
      );
    });
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setSession(INITIAL_SESSION);
    setError(null);
    
    // Tell background to reset as well
    chrome.runtime.sendMessage({ type: 'RESET_VERIFICATION' });
  }, []);

  return {
    session,
    isVerifying: session?.status === 'running',
    isComplete: session?.status === 'complete',
    startVerification,
    applyRepair,
    reset,
    error
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// END SP-A5
// ═══════════════════════════════════════════════════════════════════════════════
