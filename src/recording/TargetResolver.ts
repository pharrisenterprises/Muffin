/**
 * TARGET RESOLVER MODULE
 * Resolves the actual interactive element from event.target
 * 
 * Handles:
 * - SVG elements → parent button/link
 * - Icon elements → parent interactive element
 * - Unlabeled elements → labeled ancestor
 * - Select2 dropdowns → original select
 */

import { CapturedEvent, FilteredEvent } from './types';
import { SVG_TAGS, INTERACTIVE_TAGS, INTERACTIVE_ROLES } from './config';

export class TargetResolver {
  
  /**
   * Resolve the actual interactive target from an event
   * Returns FilteredEvent with resolvedTarget set
   */
  resolve(event: CapturedEvent): FilteredEvent {
    let resolvedTarget = event.target;
    
    // ─────────────────────────────────────────────────────────────────────
    // CASE 1: SVG Element - Walk up to find parent button/link
    // Paper airplane icons, menu icons, etc.
    // ─────────────────────────────────────────────────────────────────────
    if (this.isSvgElement(resolvedTarget)) {
      const interactive = this.findInteractiveAncestor(resolvedTarget);
      if (interactive) {
        console.log('[TargetResolver] SVG → parent:', interactive.tagName);
        resolvedTarget = interactive;
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // CASE 2: Icon element (codicon, font-awesome, material icons)
    // ─────────────────────────────────────────────────────────────────────
    if (this.isIconElement(resolvedTarget)) {
      const interactive = this.findInteractiveAncestor(resolvedTarget);
      if (interactive) {
        console.log('[TargetResolver] Icon → parent:', interactive.tagName);
        resolvedTarget = interactive;
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // CASE 3: Element with no text/label - look for labeled parent
    // ─────────────────────────────────────────────────────────────────────
    const hasText = resolvedTarget.innerText?.trim();
    const hasAriaLabel = resolvedTarget.getAttribute('aria-label');
    
    if (!hasText && !hasAriaLabel) {
      const labeledAncestor = this.findLabeledAncestor(resolvedTarget);
      if (labeledAncestor && this.isInteractive(labeledAncestor)) {
        console.log('[TargetResolver] Unlabeled → labeled ancestor');
        resolvedTarget = labeledAncestor;
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // CASE 4: Select2 dropdown - find original select
    // ─────────────────────────────────────────────────────────────────────
    if (this.isSelect2Element(resolvedTarget)) {
      const originalSelect = this.findSelect2Original(resolvedTarget);
      if (originalSelect) {
        console.log('[TargetResolver] Select2 → original select');
        resolvedTarget = originalSelect;
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // CASE 5: Pseudo-button (div/span with role="button")
    // ─────────────────────────────────────────────────────────────────────
    if (!this.isNativeInteractive(resolvedTarget)) {
      const roleButton = resolvedTarget.closest('[role="button"], [role="link"], [role="menuitem"]') as HTMLElement;
      if (roleButton && roleButton !== resolvedTarget) {
        console.log('[TargetResolver] Non-native → role ancestor');
        resolvedTarget = roleButton;
      }
    }
    
    return {
      ...event,
      resolvedTarget,
      shouldRecord: true,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Detection Methods
  // ─────────────────────────────────────────────────────────────────────────
  
  private isSvgElement(element: HTMLElement): boolean {
    const tagName = element.tagName?.toLowerCase() || '';
    return SVG_TAGS.includes(tagName);
  }
  
  private isIconElement(element: HTMLElement): boolean {
    const className = element.className?.toString?.() || '';
    const iconPatterns = [
      'codicon',      // VS Code icons
      'fa-',          // Font Awesome
      'fa ',          // Font Awesome
      'material-icons',
      'mdi-',         // Material Design Icons
      'bi-',          // Bootstrap Icons
      'icon-',
      'glyphicon',
    ];
    
    const hasIconClass = iconPatterns.some(pattern => className.includes(pattern));
    const isIconTag = element.tagName === 'I' || element.tagName === 'SPAN';
    
    return hasIconClass || (isIconTag && !element.innerText?.trim());
  }
  
  private isSelect2Element(element: HTMLElement): boolean {
    return !!(
      element.closest('[class*="select2"]') ||
      element.getAttribute('data-select2-id')
    );
  }
  
  private isNativeInteractive(element: HTMLElement): boolean {
    const tag = element.tagName?.toLowerCase() || '';
    return INTERACTIVE_TAGS.includes(tag);
  }
  
  private isInteractive(element: HTMLElement): boolean {
    const tag = element.tagName?.toLowerCase() || '';
    const role = element.getAttribute('role') || '';
    
    return (
      INTERACTIVE_TAGS.includes(tag) ||
      INTERACTIVE_ROLES.includes(role) ||
      element.hasAttribute('onclick') ||
      element.hasAttribute('tabindex') ||
      element.isContentEditable
    );
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Ancestor Finding Methods
  // ─────────────────────────────────────────────────────────────────────────
  
  private findInteractiveAncestor(element: HTMLElement, maxDepth: number = 10): HTMLElement | null {
    let current = element.parentElement;
    let depth = 0;
    
    while (current && depth < maxDepth) {
      if (this.isInteractive(current)) {
        return current;
      }
      current = current.parentElement;
      depth++;
    }
    
    return null;
  }
  
  private findLabeledAncestor(element: HTMLElement, maxDepth: number = 5): HTMLElement | null {
    let current = element.parentElement;
    let depth = 0;
    
    while (current && depth < maxDepth) {
      if (current.getAttribute('aria-label') || current.getAttribute('title')) {
        return current;
      }
      current = current.parentElement;
      depth++;
    }
    
    return null;
  }
  
  private findSelect2Original(element: HTMLElement): HTMLElement | null {
    // Try to find via data-select2-id
    const select2Id = element.getAttribute('data-select2-id') ||
                      element.closest('[data-select2-id]')?.getAttribute('data-select2-id');
    
    if (select2Id) {
      // Select2 stores reference to original element
      const original = document.querySelector(`select[data-select2-id="${select2Id}"]`);
      if (original) {
        return original as HTMLElement;
      }
    }
    
    // Fallback: look for hidden select nearby
    const container = element.closest('.select2-container');
    if (container) {
      const sibling = container.previousElementSibling;
      if (sibling?.tagName === 'SELECT') {
        return sibling as HTMLElement;
      }
    }
    
    return null;
  }
}
