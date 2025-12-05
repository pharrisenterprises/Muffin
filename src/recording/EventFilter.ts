/**
 * EVENT FILTER MODULE
 * Single source of truth for what should/shouldn't be recorded
 * ALL filtering logic lives here - nowhere else
 */

import { CapturedEvent, FilterResult, RecordingConfig } from './types';
import { BLOCKED_ELEMENTS, SIGNIFICANT_KEYS } from './config';

export class EventFilter {
  private config: RecordingConfig;
  private lastEventTime: number = 0;
  private lastEventKey: string = '';
  
  constructor(config: RecordingConfig) {
    this.config = config;
  }
  
  /**
   * Determine if an event should be recorded
   * Returns { shouldRecord: boolean, reason?: string }
   */
  filter(event: CapturedEvent): FilterResult {
    console.log('[FILTER] Evaluating event:', event.type, 'target:', event.target.tagName);
    
    // ─────────────────────────────────────────────────────────────────────
    // FILTER 1: Synthetic events (not user-initiated)
    // ─────────────────────────────────────────────────────────────────────
    if (this.config.filterSyntheticEvents) {
      const isTrusted = (event.originalEvent as any).isTrusted;
      if (!isTrusted) {
        console.log('[FILTER] Exiting: synthetic event');
        return { shouldRecord: false, reason: 'synthetic_event' };
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // FILTER 2: Blocked elements (scrollbars, resize handles, etc.)
    // ─────────────────────────────────────────────────────────────────────
    if (this.config.filterScrollbars) {
      for (const selector of BLOCKED_ELEMENTS) {
        try {
          if (event.target.matches?.(selector)) {
            console.log('[FILTER] Exiting: blocked element direct -', selector);
            return { shouldRecord: false, reason: `blocked_element_direct: ${selector}` };
          }
          if (event.target.closest?.(selector)) {
            console.log('[FILTER] Exiting: blocked element ancestor -', selector);
            return { shouldRecord: false, reason: `blocked_element_ancestor: ${selector}` };
          }
        } catch (e) {
          // Invalid selector, skip
        }
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // FILTER 3: Hidden elements
    // ─────────────────────────────────────────────────────────────────────
    if (this.config.filterHiddenElements) {
      if (!this.isVisible(event.target)) {
        console.log('[FILTER] Exiting: hidden element');
        return { shouldRecord: false, reason: 'hidden_element' };
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // FILTER 4: Debounce duplicate events
    // ─────────────────────────────────────────────────────────────────────
    const eventKey = this.getEventKey(event);
    const timeSinceLastEvent = event.timestamp - this.lastEventTime;
    
    if (timeSinceLastEvent < this.config.debounceMs && eventKey === this.lastEventKey) {
      console.log('[FILTER] Exiting: debounced duplicate');
      return { shouldRecord: false, reason: 'debounced_duplicate' };
    }
    
    this.lastEventTime = event.timestamp;
    this.lastEventKey = eventKey;
    
    // ─────────────────────────────────────────────────────────────────────
    // FILTER 5: Event-type specific filters
    // ─────────────────────────────────────────────────────────────────────
    switch (event.type) {
      case 'click':
        return this.filterClick(event);
      case 'input':
      case 'change':
        return this.filterInput(event);
      case 'keydown':
        return this.filterKeydown(event);
      default:
        console.log('[FILTER] Passed: event should be recorded');
        return { shouldRecord: true };
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Event-Specific Filters
  // ─────────────────────────────────────────────────────────────────────────
  
  private filterClick(event: CapturedEvent): FilterResult {
    const target = event.target;
    
    // Allow clicks on interactive elements
    if (this.isInteractive(target)) {
      return { shouldRecord: true };
    }
    
    // Allow clicks on elements with pointer cursor
    try {
      const style = window.getComputedStyle(target);
      if (style.cursor === 'pointer') {
        return { shouldRecord: true };
      }
    } catch (e) {
      // getComputedStyle failed
    }
    
    // Allow clicks in terminals and editors (they have special input handling)
    if (target.closest('.xterm') || target.closest('.monaco-editor')) {
      return { shouldRecord: true };
    }
    
    // Skip non-interactive elements
    console.log('[FILTER] Exiting: non-interactive click');
    return { shouldRecord: false, reason: 'non_interactive_click' };
  }
  
  private filterInput(event: CapturedEvent): FilterResult {
    // Always record input events if they have a value
    if (event.value && event.value.trim()) {
      return { shouldRecord: true };
    }
    
    // Skip empty inputs
    console.log('[FILTER] Exiting: empty input');
    return { shouldRecord: false, reason: 'empty_input' };
  }
  
  private filterKeydown(event: CapturedEvent): FilterResult {
    // Only record significant keys
    if (!SIGNIFICANT_KEYS.includes(event.key || '')) {
      console.log('[FILTER] Exiting: non-significant key -', event.key);
      return { shouldRecord: false, reason: 'non_significant_key' };
    }
    
    return { shouldRecord: true };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────
  
  private isVisible(element: HTMLElement): boolean {
    try {
      const style = window.getComputedStyle(element);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0
      );
    } catch (e) {
      return true; // Assume visible if check fails
    }
  }
  
  private isInteractive(element: HTMLElement): boolean {
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'summary', 'details'];
    const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'option', 'checkbox', 'radio', 'switch'];
    
    return (
      interactiveTags.includes(tag) ||
      interactiveRoles.includes(role || '') ||
      element.hasAttribute('onclick') ||
      element.hasAttribute('tabindex') ||
      element.isContentEditable
    );
  }
  
  private getEventKey(event: CapturedEvent): string {
    const target = event.target;
    const x = event.coordinates?.x || 0;
    const y = event.coordinates?.y || 0;
    return `${event.type}:${target.tagName}:${target.id || ''}:${Math.round(x)}:${Math.round(y)}`;
  }
  
  /**
   * Reset filter state (call when starting new recording)
   */
  reset(): void {
    this.lastEventTime = 0;
    this.lastEventKey = '';
  }
}
