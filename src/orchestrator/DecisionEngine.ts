/**
 * DecisionEngine - Selects optimal technology for element resolution
 */

export type TechnologyTier = 
  | 'manual_selector'
  | 'cdp_protocol'
  | 'native_dom'
  | 'vision_ocr';

export interface DecisionContext {
  hasManualSelector: boolean;
  hasId: boolean;
  hasName: boolean;
  hasTestId: boolean;
  isInShadowDOM: boolean;
  isInIframe: boolean;
  isTerminal: boolean;
  isEditor: boolean;
  cdpAvailable: boolean;
  previousFailures: TechnologyTier[];
}

export class DecisionEngine {
  
  /**
   * Select technology sequence based on context
   * Returns ordered list from most to least reliable
   */
  selectSequence(context: DecisionContext): TechnologyTier[] {
    const sequence: TechnologyTier[] = [];
    
    // TIER 0: Manual selector ALWAYS first (100% reliable)
    if (context.hasManualSelector) {
      sequence.push('manual_selector');
    }
    
    // TIER 1: CDP for simple elements with good selectors
    if (context.cdpAvailable && (context.hasId || context.hasTestId || context.hasName)) {
      sequence.push('cdp_protocol');
    }
    
    // TIER 2: Native DOM (current implementation)
    sequence.push('native_dom');
    
    // TIER 3: Vision OCR (last resort)
    sequence.push('vision_ocr');
    
    // Remove already-failed technologies
    return sequence.filter(tech => !context.previousFailures.includes(tech));
  }
  
  /**
   * Build context from bundle and environment
   */
  buildContext(bundle: any, environment: { cdpAvailable: boolean }): DecisionContext {
    return {
      hasManualSelector: !!bundle.manualSelector,
      hasId: !!bundle.id && this.isSemanticId(bundle.id),
      hasName: !!bundle.name,
      hasTestId: !!bundle.testId || !!bundle.dataAttrs?.testid,
      isInShadowDOM: !!bundle.shadowHosts?.length,
      isInIframe: !!bundle.iframeChain?.length,
      isTerminal: bundle.className?.includes('xterm') || false,
      isEditor: bundle.className?.includes('monaco') || false,
      cdpAvailable: environment.cdpAvailable,
      previousFailures: []
    };
  }
  
  private isSemanticId(id: string): boolean {
    const autoGenPatterns = [/^[a-f0-9]{8,}$/i, /^\d+$/, /^_/, /^rc-/];
    return !autoGenPatterns.some(p => p.test(id));
  }
}

export const decisionEngine = new DecisionEngine();
