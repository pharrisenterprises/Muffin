/**
 * STEP EMITTER MODULE
 * Sends recorded steps to the background script
 * 
 * Features:
 * - Deduplication (prevents double-recording)
 * - Error handling
 * - Debug logging
 */

import { RecordedStep, RecordingConfig } from './types';
import { evidenceAggregator } from '../playback/evidence';

export class StepEmitter {
  private config: RecordingConfig;
  private lastEmittedStep: RecordedStep | null = null;
  private emitCount: number = 0;
  
  constructor(config: RecordingConfig) {
    this.config = config;
  }
  
  /**
   * Emit a step to the background script
   */
  emit(step: RecordedStep): boolean {
    // ─────────────────────────────────────────────────────────────────────
    // Capture evidence (Batch 10-11: mouse trail, sequence patterns)
    // This enriches the step with mouseTrailAtCapture and previousLabels
    // ─────────────────────────────────────────────────────────────────────
    evidenceAggregator.captureStepEvidence(step as any);
    
    // ─────────────────────────────────────────────────────────────────────
    // Deduplication check
    // ─────────────────────────────────────────────────────────────────────
    if (this.isDuplicate(step)) {
      if (this.config.debugMode) {
        console.log('[StepEmitter] Skipping duplicate:', step.label);
      }
      return false;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Build message payload
    // ─────────────────────────────────────────────────────────────────────
    const payload = {
      type: 'logEvent',
      data: {
        eventType: step.event,
        xpath: step.xpath,
        value: step.value,
        label: step.label,
        page: step.page,
        x: step.x,
        y: step.y,
        bundle: step.bundle,
        stepNumber: step.stepNumber,
        timestamp: step.timestamp,
      },
    };
    
    // ─────────────────────────────────────────────────────────────────────
    // Send to background
    // ─────────────────────────────────────────────────────────────────────
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[StepEmitter] Send error:', chrome.runtime.lastError.message);
        } else if (this.config.debugMode && response) {
          console.log('[StepEmitter] Response:', response);
        }
      });
      
      this.lastEmittedStep = step;
      this.emitCount++;
      
      if (this.config.logEvents) {
        console.log(
          `[StepEmitter] ✓ Step ${step.stepNumber}: ${step.event} - "${step.label}"`
        );
      }
      
      return true;
      
    } catch (error) {
      console.error('[StepEmitter] Failed to emit:', error);
      return false;
    }
  }
  
  /**
   * Check if step is a duplicate of the last emitted step
   */
  private isDuplicate(step: RecordedStep): boolean {
    if (!this.lastEmittedStep) {
      return false;
    }
    
    const timeDiff = step.timestamp - this.lastEmittedStep.timestamp;
    
    // Within 100ms window
    if (timeDiff < 100) {
      // Same event type and xpath
      if (
        step.event === this.lastEmittedStep.event &&
        step.xpath === this.lastEmittedStep.xpath
      ) {
        // For input events, check if value is the same
        if (step.event === 'input') {
          return step.value === this.lastEmittedStep.value;
        }
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Reset emitter state (call when starting new recording)
   */
  reset(): void {
    this.lastEmittedStep = null;
    this.emitCount = 0;
    
    if (this.config.debugMode) {
      console.log('[StepEmitter] Reset');
    }
  }
  
  /**
   * Get count of emitted steps
   */
  getEmitCount(): number {
    return this.emitCount;
  }
}
