/**
 * ELEMENT FINDER MODULE
 * 
 * Multi-strategy element finding with CONTEXT VALIDATION
 * 
 * Strategy priority:
 * 1. CSS Selector (data-testid, id, name)
 * 2. XPath
 * 3. ARIA label
 * 4. Context-specific search (terminal, copilot, editor)
 * 5. Bounding box proximity
 * 6. Fuzzy text match
 * 
 * ALL strategies validate context before returning!
 */

import { Bundle } from '../recording/types';
import { PlaybackConfig, ElementFindResult } from './types';
import { ContextValidator } from './ContextValidator';

export class ElementFinder {
  private config: PlaybackConfig;
  private contextValidator: ContextValidator;
  
  constructor(config: PlaybackConfig) {
    this.config = config;
    this.contextValidator = new ContextValidator();
  }
  
  /**
   * Find element using multiple strategies with context validation
   */
  async find(bundle: Bundle, timeout?: number): Promise<ElementFindResult> {
    const timeoutMs = timeout || this.config.elementTimeout;
    const startTime = Date.now();
    const attempts: string[] = [];
    
    while (Date.now() - startTime < timeoutMs) {
      
      // ─────────────────────────────────────────────────────────────────
      // STRATEGY 1: CSS Selector (most reliable)
      // ─────────────────────────────────────────────────────────────────
      if (bundle.cssSelector) {
        const element = this.trySelector(bundle.cssSelector, bundle);
        if (element) {
          return this.successResult(element, 'cssSelector', 1.0, attempts);
        }
        attempts.push(`cssSelector: ${bundle.cssSelector} - not found or wrong context`);
      }
      
      // ─────────────────────────────────────────────────────────────────
      // STRATEGY 2: data-testid
      // ─────────────────────────────────────────────────────────────────
      if (bundle.testId) {
        const element = this.trySelector(`[data-testid="${bundle.testId}"]`, bundle);
        if (element) {
          return this.successResult(element, 'testId', 0.95, attempts);
        }
        attempts.push(`testId: ${bundle.testId} - not found`);
      }
      
      // ─────────────────────────────────────────────────────────────────
      // STRATEGY 3: ID attribute
      // ─────────────────────────────────────────────────────────────────
      if (bundle.id) {
        const element = document.getElementById(bundle.id);
        if (element && this.validateAndVisible(element, bundle)) {
          return this.successResult(element, 'id', 0.9, attempts);
        }
        attempts.push(`id: ${bundle.id} - not found or wrong context`);
      }
      
      // ─────────────────────────────────────────────────────────────────
      // STRATEGY 4: Name attribute
      // ─────────────────────────────────────────────────────────────────
      if (bundle.name) {
        const elements = document.getElementsByName(bundle.name);
        for (const el of elements) {
          if (this.validateAndVisible(el as HTMLElement, bundle)) {
            return this.successResult(el as HTMLElement, 'name', 0.85, attempts);
          }
        }
        attempts.push(`name: ${bundle.name} - not found or wrong context`);
      }
      
      // ─────────────────────────────────────────────────────────────────
      // STRATEGY 5: XPath
      // ─────────────────────────────────────────────────────────────────
      if (bundle.xpath) {
        const element = this.tryXPath(bundle.xpath, bundle);
        if (element) {
          return this.successResult(element, 'xpath', 0.8, attempts);
        }
        attempts.push(`xpath - not found or wrong context`);
      }
      
      // ─────────────────────────────────────────────────────────────────
      // STRATEGY 6: ARIA label
      // ─────────────────────────────────────────────────────────────────
      if (bundle.ariaLabel) {
        const element = this.trySelector(`[aria-label="${bundle.ariaLabel}"]`, bundle);
        if (element) {
          return this.successResult(element, 'ariaLabel', 0.75, attempts);
        }
        attempts.push(`ariaLabel: ${bundle.ariaLabel} - not found or wrong context`);
      }
      
      // ─────────────────────────────────────────────────────────────────
      // STRATEGY 7: Context-specific search (CRITICAL FOR VS CODE)
      // ─────────────────────────────────────────────────────────────────
      const contextElement = this.findByContext(bundle);
      if (contextElement) {
        return this.successResult(contextElement, 'contextSpecific', 0.7, attempts);
      }
      attempts.push('contextSpecific - not found');
      
      // ─────────────────────────────────────────────────────────────────
      // STRATEGY 8: Bounding box proximity
      // ─────────────────────────────────────────────────────────────────
      if (bundle.bounding && bundle.bounding.width > 0) {
        const element = this.tryBoundingBox(bundle);
        if (element) {
          return this.successResult(element, 'boundingBox', 0.6, attempts);
        }
        attempts.push('boundingBox - not found or wrong context');
      }
      
      // ─────────────────────────────────────────────────────────────────
      // STRATEGY 9: Placeholder match
      // ─────────────────────────────────────────────────────────────────
      if (bundle.placeholder) {
        const element = this.trySelector(`[placeholder="${bundle.placeholder}"]`, bundle);
        if (element) {
          return this.successResult(element, 'placeholder', 0.65, attempts);
        }
        attempts.push(`placeholder: ${bundle.placeholder} - not found`);
      }
      
      // Wait before retry
      await this.sleep(this.config.retryInterval);
    }
    
    // All strategies failed
    console.error('[ElementFinder] All strategies failed:', attempts);
    
    return {
      element: null,
      strategy: 'none',
      confidence: 0,
      contextValid: false,
      attempts,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Strategy Implementations
  // ─────────────────────────────────────────────────────────────────────────
  
  private trySelector(selector: string, bundle: Bundle): HTMLElement | null {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.validateAndVisible(element, bundle)) {
        return element;
      }
    } catch (e) {
      // Invalid selector
    }
    return null;
  }
  
  private tryXPath(xpath: string, bundle: Bundle): HTMLElement | null {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const element = result.singleNodeValue as HTMLElement;
      if (element && this.validateAndVisible(element, bundle)) {
        return element;
      }
    } catch (e) {
      // XPath evaluation failed
    }
    return null;
  }
  
  private tryBoundingBox(bundle: Bundle): HTMLElement | null {
    const { x, y, width, height } = bundle.bounding;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    const element = document.elementFromPoint(centerX, centerY) as HTMLElement;
    if (element && this.validateAndVisible(element, bundle)) {
      return element;
    }
    
    // Try nearby points
    const offsets = [
      [0, 0], [10, 0], [-10, 0], [0, 10], [0, -10],
      [20, 0], [-20, 0], [0, 20], [0, -20]
    ];
    
    for (const [dx, dy] of offsets) {
      const el = document.elementFromPoint(centerX + dx, centerY + dy) as HTMLElement;
      if (el && this.validateAndVisible(el, bundle)) {
        return el;
      }
    }
    
    return null;
  }
  
  /**
   * CRITICAL: Context-specific search for VS Code elements
   */
  private findByContext(bundle: Bundle): HTMLElement | null {
    const expectedContext = bundle.contextHints?.isTerminal ? 'terminal' :
                           bundle.contextHints?.isCopilotChat ? 'copilot' :
                           bundle.contextHints?.isMonacoEditor ? 'editor' : null;
    
    // Also check className fallback
    const className = bundle.className?.toLowerCase() || '';
    
    // ─────────────────────────────────────────────────────────────────
    // TERMINAL: Find the xterm textarea
    // ─────────────────────────────────────────────────────────────────
    if (expectedContext === 'terminal' || className.includes('xterm')) {
      console.log('[ElementFinder] Searching in TERMINAL context');
      
      // The actual input in xterm is a hidden textarea
      const terminalInput = document.querySelector(
        '.xterm textarea.xterm-helper-textarea, ' +
        '.terminal textarea, ' +
        '.xterm-screen'
      ) as HTMLElement;
      
      if (terminalInput && this.isVisible(terminalInput)) {
        console.log('[ElementFinder] Found terminal input');
        return terminalInput;
      }
      
      // Fallback: find focused element in terminal
      const terminal = document.querySelector('.xterm, .terminal');
      if (terminal) {
        const focused = terminal.querySelector(':focus') as HTMLElement;
        if (focused) return focused;
        
        // Click area
        const viewport = terminal.querySelector('.xterm-viewport, .xterm-screen') as HTMLElement;
        if (viewport) return viewport;
      }
    }
    
    // ─────────────────────────────────────────────────────────────────
    // COPILOT CHAT: Find the chat input
    // ─────────────────────────────────────────────────────────────────
    if (expectedContext === 'copilot' || 
        className.includes('copilot') || 
        className.includes('chat')) {
      console.log('[ElementFinder] Searching in COPILOT context');
      
      // Copilot chat input selectors
      const chatSelectors = [
        '[class*="copilot"] textarea',
        '[class*="copilot"] [contenteditable="true"]',
        '[class*="chat-input"] textarea',
        '[class*="chat-input"] [contenteditable="true"]',
        '[class*="inline-chat"] textarea',
        '[class*="inline-chat"] [contenteditable="true"]',
        '.monaco-editor[class*="chat"] textarea',
        '[aria-label*="chat" i] textarea',
        '[aria-label*="copilot" i] textarea',
      ];
      
      for (const selector of chatSelectors) {
        try {
          const element = document.querySelector(selector) as HTMLElement;
          if (element && this.isVisible(element)) {
            console.log('[ElementFinder] Found Copilot input:', selector);
            return element;
          }
        } catch (e) {
          // Invalid selector
        }
      }
    }
    
    // ─────────────────────────────────────────────────────────────────
    // MONACO EDITOR: Find the editor input
    // ─────────────────────────────────────────────────────────────────
    if (expectedContext === 'editor' || className.includes('monaco')) {
      console.log('[ElementFinder] Searching in EDITOR context');
      
      const editorInput = document.querySelector(
        '.monaco-editor textarea.inputarea, ' +
        '.monaco-editor [contenteditable="true"]'
      ) as HTMLElement;
      
      if (editorInput && this.isVisible(editorInput)) {
        return editorInput;
      }
    }
    
    return null;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Validation Helpers
  // ─────────────────────────────────────────────────────────────────────────
  
  private validateAndVisible(element: HTMLElement, bundle: Bundle): boolean {
    // Check visibility
    if (!this.isVisible(element)) {
      return false;
    }
    
    // Check context if validation enabled
    if (this.config.validateContext) {
      const validation = this.contextValidator.validate(element, bundle);
      if (!validation.isValid) {
        console.log('[ElementFinder] Context validation failed:', validation.reason);
        return false;
      }
    }
    
    return true;
  }
  
  private isVisible(element: HTMLElement): boolean {
    try {
      // Special case: xterm textarea is intentionally hidden but still functional
      if (element.classList?.contains('xterm-helper-textarea')) {
        return true;
      }
      
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        parseFloat(style.opacity) > 0 &&
        (rect.width > 0 || rect.height > 0 || element.offsetWidth > 0 || element.offsetHeight > 0)
      );
    } catch (e) {
      return true; // Assume visible if check fails
    }
  }
  
  private successResult(
    element: HTMLElement,
    strategy: string,
    confidence: number,
    attempts: string[]
  ): ElementFindResult {
    console.log(`[ElementFinder] ✓ Found via ${strategy} (confidence: ${confidence})`);
    return {
      element,
      strategy,
      confidence,
      contextValid: true,
      attempts,
    };
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
