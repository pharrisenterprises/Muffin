/**
 * RECORDING ENGINE - MAIN ORCHESTRATOR
 * 
 * Single entry point for the entire recording pipeline:
 * 
 * Browser Event
 *      ↓
 * EventCapture (listen)
 *      ↓
 * EventFilter (filter garbage)
 *      ↓
 * TargetResolver (SVG → button)
 *      ↓
 * StepBuilder (assemble step)
 *      ↓
 * StepEmitter (send to background)
 */

import { CapturedEvent, RecordingConfig, RecordingState } from './types';
import { DEFAULT_CONFIG } from './config';
import { EventCapture } from './EventCapture';
import { EventFilter } from './EventFilter';
import { TargetResolver } from './TargetResolver';
import { StepBuilder } from './StepBuilder';
import { StepEmitter } from './StepEmitter';

export class RecordingEngine {
  private config: RecordingConfig;
  private state: RecordingState;
  
  // Pipeline components
  private eventCapture: EventCapture;
  private eventFilter: EventFilter;
  private targetResolver: TargetResolver;
  private stepBuilder: StepBuilder;
  private stepEmitter: StepEmitter;
  
  constructor(config: Partial<RecordingConfig> = {}) {
    // Merge config with defaults
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize state
    this.state = {
      isRecording: false,
      stepCounter: 0,
      lastEventTime: 0,
      lastEventKey: '',
    };
    
    // Initialize pipeline components
    this.eventCapture = new EventCapture(this.config);
    this.eventFilter = new EventFilter(this.config);
    this.targetResolver = new TargetResolver();
    this.stepBuilder = new StepBuilder(this.config);
    this.stepEmitter = new StepEmitter(this.config);
    
    console.log('[RecordingEngine] Initialized with config:', this.config);
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Start recording user interactions
   */
  start(): void {
    if (this.state.isRecording) {
      console.warn('[RecordingEngine] Already recording');
      return;
    }
    
    // Reset state
    this.state.isRecording = true;
    this.state.stepCounter = 0;
    this.state.lastEventTime = 0;
    this.state.lastEventKey = '';
    
    // Reset components
    this.eventFilter.reset();
    this.stepEmitter.reset();
    
    // Start event capture
    this.eventCapture.start(this.handleEvent.bind(this));
    
    // Emit "open page" step
    this.emitOpenStep();
    
    console.log('[RecordingEngine] ▶ Recording started');
  }
  
  /**
   * Stop recording
   */
  stop(): void {
    if (!this.state.isRecording) {
      console.warn('[RecordingEngine] Not recording');
      return;
    }
    
    this.state.isRecording = false;
    this.eventCapture.stop();
    
    console.log(
      `[RecordingEngine] ■ Recording stopped. Total steps: ${this.state.stepCounter}`
    );
  }
  
  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.state.isRecording;
  }
  
  /**
   * Get current step count
   */
  getStepCount(): number {
    return this.state.stepCounter;
  }
  
  /**
   * Get recording state
   */
  getState(): RecordingState {
    return { ...this.state };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // PIPELINE PROCESSING
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Main event handler - processes events through the pipeline
   */
  private handleEvent(event: CapturedEvent): void {
    // Safety check
    if (!this.state.isRecording) {
      return;
    }
    
    try {
      // ─────────────────────────────────────────────────────────────────
      // STAGE 1: FILTER
      // ─────────────────────────────────────────────────────────────────
      const filterResult = this.eventFilter.filter(event);
      
      if (!filterResult.shouldRecord) {
        if (this.config.debugMode) {
          console.log('[RecordingEngine] Filtered:', filterResult.reason);
        }
        return;
      }
      
      // ─────────────────────────────────────────────────────────────────
      // STAGE 2: RESOLVE TARGET
      // ─────────────────────────────────────────────────────────────────
      const filteredEvent = this.targetResolver.resolve(event);
      
      // ─────────────────────────────────────────────────────────────────
      // STAGE 3: INCREMENT COUNTER
      // ─────────────────────────────────────────────────────────────────
      this.state.stepCounter++;
      
      // ─────────────────────────────────────────────────────────────────
      // STAGE 4: BUILD STEP
      // ─────────────────────────────────────────────────────────────────
      const step = this.stepBuilder.build(filteredEvent, this.state);
      
      // ─────────────────────────────────────────────────────────────────
      // STAGE 5: EMIT STEP
      // ─────────────────────────────────────────────────────────────────
      const emitted = this.stepEmitter.emit(step);
      
      if (!emitted) {
        // Step was deduplicated, decrement counter
        this.state.stepCounter--;
      }
      
      // Update state
      this.state.lastEventTime = event.timestamp;
      
    } catch (error) {
      console.error('[RecordingEngine] Error processing event:', error);
    }
  }
  
  /**
   * Emit the initial "open page" step
   */
  private emitOpenStep(): void {
    this.state.stepCounter++;
    const openStep = this.stepBuilder.buildOpenStep(this.state);
    this.stepEmitter.emit(openStep);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// Export a ready-to-use instance for simple integration
// ═══════════════════════════════════════════════════════════════════════════

export const recordingEngine = new RecordingEngine();
