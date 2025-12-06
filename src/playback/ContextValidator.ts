/**
 * CONTEXT VALIDATOR MODULE
 * 
 * Prevents element confusion by validating that found elements
 * are in the expected context (terminal vs editor vs Copilot chat)
 * 
 * THIS IS THE FIX FOR:
 * - "hello" going to terminal instead of Copilot
 * - Wrong element being found when multiple similar elements exist
 */

import { Bundle } from '../recording/types';
import { ContextValidation } from './types';

export class ContextValidator {
  
  /**
   * Validate that a found element matches the expected context from the bundle
   */
  validate(element: HTMLElement, bundle: Bundle): ContextValidation {
    const expectedContext = this.getExpectedContext(bundle);
    const actualContext = this.getActualContext(element);
    
    const isValid = this.contextsMatch(expectedContext, actualContext);
    
    const validation: ContextValidation = {
      expectedContext,
      actualContext,
      isValid,
    };
    
    if (!isValid) {
      validation.reason = `Expected ${expectedContext}, found element in ${actualContext}`;
      console.warn('[ContextValidator] MISMATCH:', validation.reason);
    } else {
      console.log('[ContextValidator] ✓ Context valid:', expectedContext);
    }
    
    return validation;
  }
  
  /**
   * Get the expected context from the bundle's contextHints
   */
  private getExpectedContext(bundle: Bundle): ContextValidation['expectedContext'] {
    // Use contextHints if available (from new recording engine)
    if (bundle.contextHints) {
      if (bundle.contextHints.isTerminal) return 'terminal';
      if (bundle.contextHints.isCopilotChat) return 'copilot';
      if (bundle.contextHints.isMonacoEditor) return 'editor';
    }
    
    // Fallback: infer from className/xpath
    const className = bundle.className?.toLowerCase() || '';
    const xpath = bundle.xpath?.toLowerCase() || '';
    const ariaLabel = bundle.ariaLabel?.toLowerCase() || '';
    
    // Terminal detection
    if (
      className.includes('xterm') ||
      xpath.includes('xterm') ||
      className.includes('terminal')
    ) {
      return 'terminal';
    }
    
    // Copilot/chat detection
    if (
      className.includes('copilot') ||
      className.includes('chat-input') ||
      className.includes('inline-chat') ||
      ariaLabel.includes('chat') ||
      ariaLabel.includes('copilot')
    ) {
      return 'copilot';
    }
    
    // Editor detection
    if (
      className.includes('monaco') ||
      xpath.includes('monaco')
    ) {
      return 'editor';
    }
    
    return 'generic';
  }
  
  /**
   * Get the actual context of a found element
   */
  private getActualContext(element: HTMLElement): ContextValidation['actualContext'] {
    // Check terminal
    if (element.closest('.xterm, .terminal, [class*="terminal"]')) {
      return 'terminal';
    }
    
    // Check Copilot/chat - must check BEFORE monaco since Copilot uses monaco
    if (element.closest('[class*="copilot"], [class*="chat-input"], [class*="inline-chat"]')) {
      return 'copilot';
    }
    
    // Check editor
    if (element.closest('.monaco-editor')) {
      return 'editor';
    }
    
    return 'generic';
  }
  
  /**
   * Check if contexts match (with some flexibility)
   */
  private contextsMatch(
    expected: ContextValidation['expectedContext'],
    actual: ContextValidation['actualContext']
  ): boolean {
    // Exact match
    if (expected === actual) {
      return true;
    }
    
    // Generic expected matches anything
    if (expected === 'generic') {
      return true;
    }
    
    // Special case: Copilot uses monaco editor
    // If we expected copilot and found editor, need to check more carefully
    if (expected === 'copilot' && actual === 'editor') {
      // This might be OK - Copilot input is a monaco editor
      // But we should NOT find terminal when expecting copilot
      return true;
    }
    
    // Strict mismatch for terminal vs others
    if (expected === 'terminal' && actual !== 'terminal') {
      return false;
    }
    if (expected !== 'terminal' && actual === 'terminal') {
      return false; // CRITICAL: Never put non-terminal input in terminal
    }
    
    return false;
  }
}
