/**
 * STEP BUILDER MODULE
 * Assembles the final RecordedStep object from filtered events
 * 
 * Combines:
 * - Label from LabelGenerator
 * - Bundle from BundleBuilder
 * - Event metadata
 */

import { RecordedStep, FilteredEvent, RecordingConfig, RecordingState } from './types';
import { LabelGenerator } from './LabelGenerator';
import { BundleBuilder } from './BundleBuilder';

export class StepBuilder {
  private labelGenerator: LabelGenerator;
  private bundleBuilder: BundleBuilder;
  private config: RecordingConfig;
  
  constructor(config: RecordingConfig) {
    this.config = config;
    this.labelGenerator = new LabelGenerator(config);
    this.bundleBuilder = new BundleBuilder();
  }
  
  /**
   * Build a complete step from a filtered event
   */
  build(event: FilteredEvent, state: RecordingState): RecordedStep {
    // Generate label
    const label = this.labelGenerator.generate(event);
    
    // Build bundle with all metadata
    const bundle = this.bundleBuilder.build(event);
    
    // Determine step event type
    const stepEvent = this.determineEventType(event);
    
    // Extract value
    const value = this.extractValue(event);
    
    // Build the step
    const step: RecordedStep = {
      stepNumber: state.stepCounter,
      timestamp: event.timestamp,
      label,
      event: stepEvent,
      value,
      xpath: bundle.xpath,
      selector: bundle.cssSelector,
      x: event.coordinates?.x,
      y: event.coordinates?.y,
      bundle,
      page: window.location.href,
    };
    
    if (this.config.debugMode) {
      console.log('[StepBuilder] Built step:', step.stepNumber, step.label);
    }
    
    return step;
  }
  
  /**
   * Build an "open page" step
   */
  buildOpenStep(state: RecordingState): RecordedStep {
    return {
      stepNumber: state.stepCounter,
      timestamp: Date.now(),
      label: 'open page',
      event: 'open',
      xpath: '/html/body',
      page: window.location.href,
      bundle: {
        tag: 'body',
        dataAttrs: {},
        xpath: '/html/body',
        bounding: {
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        },
        pageUrl: window.location.href,
        contextHints: {
          isTerminal: false,
          isMonacoEditor: false,
          isCopilotChat: false,
          isVSCodeInput: false,
        },
      },
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────
  
  private determineEventType(event: FilteredEvent): RecordedStep['event'] {
    switch (event.type) {
      case 'click':
        return 'click';
        
      case 'input':
      case 'change':
        return 'input';
        
      case 'keydown':
        if (event.key === 'Enter') {
          return 'enter';
        }
        return 'keypress';
        
      default:
        return 'click';
    }
  }
  
  private extractValue(event: FilteredEvent): string | undefined {
    // For input/change events, use the captured value
    if (event.type === 'input' || event.type === 'change') {
      return event.value || undefined;
    }
    
    // For keydown, use the key
    if (event.type === 'keydown') {
      return event.key || undefined;
    }
    
    // For clicks, try to get element value
    const target = event.resolvedTarget;
    
    if (target instanceof HTMLInputElement) {
      return target.value || undefined;
    }
    
    if (target instanceof HTMLTextAreaElement) {
      return target.value || undefined;
    }
    
    if (target instanceof HTMLSelectElement) {
      const selectedOption = target.options[target.selectedIndex];
      return selectedOption?.text || target.value || undefined;
    }
    
    if (target.isContentEditable) {
      return target.innerText?.substring(0, 500) || undefined;
    }
    
    return undefined;
  }
}
