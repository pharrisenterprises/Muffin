/**
 * ACTION EXECUTOR MODULE
 * 
 * Executes actions (click, type, keypress) with special handling for:
 * - Terminal input (requires keyboard events, not value assignment)
 * - React inputs (requires native setter + events)
 * - ContentEditable (requires execCommand or input events)
 */

import { Bundle } from '../recording/types';
import { PlaybackConfig } from './types';

export class ActionExecutor {
  private config: PlaybackConfig;
  
  constructor(config: PlaybackConfig) {
    this.config = config;
  }
  
  /**
   * Execute a click action
   */
  async click(element: HTMLElement): Promise<void> {
    if (this.config.highlightElements) {
      this.highlight(element);
    }
    
    // Focus first
    element.focus();
    await this.sleep(50);
    
    // Simulate human-like click sequence
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    const eventInit: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      view: window,
    };
    
    element.dispatchEvent(new MouseEvent('mouseover', eventInit));
    await this.sleep(20);
    element.dispatchEvent(new MouseEvent('mousedown', { ...eventInit, buttons: 1 }));
    await this.sleep(20);
    element.dispatchEvent(new MouseEvent('mouseup', eventInit));
    await this.sleep(20);
    element.dispatchEvent(new MouseEvent('click', eventInit));
    
    console.log('[ActionExecutor] Clicked:', element.tagName);
  }
  
  /**
   * Execute an input action - with special handling for terminals
   */
  async type(element: HTMLElement, value: string, bundle: Bundle): Promise<void> {
    if (!value) return;
    
    if (this.config.highlightElements) {
      this.highlight(element);
    }
    
    // Determine context
    const isTerminal = bundle.contextHints?.isTerminal || 
                       element.closest('.xterm, .terminal') !== null;
    const isContentEditable = element.isContentEditable;
    const isInput = element instanceof HTMLInputElement || 
                    element instanceof HTMLTextAreaElement;
    
    console.log('[ActionExecutor] Typing:', { isTerminal, isContentEditable, isInput, value });
    
    // ─────────────────────────────────────────────────────────────────
    // TERMINAL: Use keyboard events (value assignment doesn't work)
    // ─────────────────────────────────────────────────────────────────
    if (isTerminal) {
      await this.typeInTerminal(element, value);
      return;
    }
    
    // ─────────────────────────────────────────────────────────────────
    // STANDARD INPUT: Use React-safe method
    // ─────────────────────────────────────────────────────────────────
    if (isInput) {
      await this.typeInInput(element as HTMLInputElement | HTMLTextAreaElement, value);
      return;
    }
    
    // ─────────────────────────────────────────────────────────────────
    // CONTENTEDITABLE: Use insertText or keyboard events
    // ─────────────────────────────────────────────────────────────────
    if (isContentEditable) {
      await this.typeInContentEditable(element, value);
      return;
    }
    
    // Fallback: try keyboard events
    await this.typeViaKeyboard(element, value);
  }
  
  /**
   * Execute an Enter key press
   */
  async pressEnter(element: HTMLElement, bundle: Bundle): Promise<void> {
    const isTerminal = bundle.contextHints?.isTerminal ||
                       element.closest('.xterm, .terminal') !== null;
    
    element.focus();
    await this.sleep(30);
    
    const keyEventInit: KeyboardEventInit = {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    };
    
    element.dispatchEvent(new KeyboardEvent('keydown', keyEventInit));
    await this.sleep(20);
    element.dispatchEvent(new KeyboardEvent('keypress', keyEventInit));
    await this.sleep(20);
    element.dispatchEvent(new KeyboardEvent('keyup', keyEventInit));
    
    // For terminals, also send the actual Enter to the terminal emulator
    if (isTerminal) {
      // xterm listens for data events
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: '\r',
        inputType: 'insertLineBreak',
      });
      element.dispatchEvent(inputEvent);
    }
    
    console.log('[ActionExecutor] Pressed Enter');
  }
  
  /**
   * Press any key
   */
  async pressKey(element: HTMLElement, key: string): Promise<void> {
    element.focus();
    await this.sleep(30);
    
    const keyEventInit: KeyboardEventInit = {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
    };
    
    element.dispatchEvent(new KeyboardEvent('keydown', keyEventInit));
    await this.sleep(20);
    element.dispatchEvent(new KeyboardEvent('keyup', keyEventInit));
    
    console.log('[ActionExecutor] Pressed key:', key);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Specialized Input Methods
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Type in terminal using keyboard events
   * Terminal doesn't respond to value assignment
   */
  private async typeInTerminal(element: HTMLElement, value: string): Promise<void> {
    console.log('[ActionExecutor] Terminal typing:', value);
    
    element.focus();
    await this.sleep(50);
    
    // Type character by character with keyboard events
    for (const char of value) {
      const keyEventInit: KeyboardEventInit = {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
      };
      
      element.dispatchEvent(new KeyboardEvent('keydown', keyEventInit));
      
      // Also send input event with data
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: char,
        inputType: 'insertText',
      });
      element.dispatchEvent(inputEvent);
      
      element.dispatchEvent(new KeyboardEvent('keyup', keyEventInit));
      
      // Small delay between characters for human-like typing
      if (this.config.useHumanLikeInput) {
        await this.sleep(30 + Math.random() * 50);
      }
    }
    
    console.log('[ActionExecutor] Terminal typing complete');
  }
  
  /**
   * Type in standard input with React-safe method
   */
  private async typeInInput(
    element: HTMLInputElement | HTMLTextAreaElement, 
    value: string
  ): Promise<void> {
    element.focus();
    await this.sleep(30);
    
    // Clear existing value
    element.value = '';
    
    // Use native property descriptor (React-safe)
    const descriptor = Object.getOwnPropertyDescriptor(
      element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
      'value'
    );
    
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
    
    // Dispatch events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('[ActionExecutor] Input value set:', value.substring(0, 20));
  }
  
  /**
   * Type in contenteditable element
   */
  private async typeInContentEditable(element: HTMLElement, value: string): Promise<void> {
    element.focus();
    await this.sleep(30);
    
    // Try execCommand first (deprecated but still works)
    if (document.execCommand) {
      document.execCommand('selectAll', false);
      document.execCommand('insertText', false, value);
    } else {
      // Fallback: direct innerHTML
      element.innerHTML = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    console.log('[ActionExecutor] ContentEditable value set');
  }
  
  /**
   * Type via keyboard events (fallback)
   */
  private async typeViaKeyboard(element: HTMLElement, value: string): Promise<void> {
    element.focus();
    await this.sleep(30);
    
    for (const char of value) {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
      element.dispatchEvent(new InputEvent('input', { data: char, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      
      if (this.config.useHumanLikeInput) {
        await this.sleep(30 + Math.random() * 40);
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────
  
  private highlight(element: HTMLElement): void {
    const originalOutline = element.style.outline;
    element.style.outline = '3px solid #00ff00';
    setTimeout(() => {
      element.style.outline = originalOutline;
    }, 500);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
