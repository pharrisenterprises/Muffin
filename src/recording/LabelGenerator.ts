/**
 * LABEL GENERATOR MODULE
 * Single source of truth for generating human-readable labels
 * 
 * CRITICAL: NO COUNTERS! NO "prompt_input_1" GARBAGE!
 * 
 * Label generation uses a priority cascade:
 * 1. aria-label (sanitized)
 * 2. aria-labelledby reference
 * 3. Associated <label> element
 * 4. Placeholder attribute
 * 5. Title attribute
 * 6. Semantic name/id
 * 7. Button/link text
 * 8. Context-based fallback
 */

import { FilteredEvent, RecordingConfig } from './types';
import { VSCODE_ARIA_CLEANUP_PATTERNS, AUTO_GENERATED_ID_PATTERNS } from './config';

export class LabelGenerator {
  private config: RecordingConfig;
  
  constructor(config: RecordingConfig) {
    this.config = config;
  }
  
  /**
   * Generate a human-readable label for an event
   */
  generate(event: FilteredEvent): string {
    const target = event.resolvedTarget;
    
    // Build action prefix
    const action = this.getActionPrefix(event);
    
    // Get target description
    const description = this.getTargetDescription(target);
    
    // Compose final label
    let label = `${action} ${description}`.trim();
    
    // Truncate if needed
    if (label.length > this.config.maxLabelLength) {
      label = label.substring(0, this.config.maxLabelLength - 3) + '...';
    }
    
    // Fallback if empty
    if (!label || label === action) {
      label = this.getFallbackLabel(event);
    }
    
    return label;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Action Prefix Generation
  // ─────────────────────────────────────────────────────────────────────────
  
  private getActionPrefix(event: FilteredEvent): string {
    const target = event.resolvedTarget;
    const tag = target.tagName?.toLowerCase() || '';
    
    switch (event.type) {
      case 'click':
        // Contextual click labels
        if (tag === 'a') return 'Click link';
        if (tag === 'button' || target.getAttribute('role') === 'button') return 'Click';
        if (tag === 'input') {
          const inputType = (target as HTMLInputElement).type;
          if (inputType === 'checkbox') return 'Toggle';
          if (inputType === 'radio') return 'Select';
          if (inputType === 'submit') return 'Submit';
        }
        if (tag === 'select') return 'Select';
        return 'Click';
        
      case 'input':
      case 'change':
        if (event.value) {
          const truncatedValue = this.truncate(event.value, 25);
          return `Enter "${truncatedValue}" in`;
        }
        return 'Type in';
        
      case 'keydown':
        if (event.key === 'Enter') return 'Press Enter in';
        if (event.key === 'Tab') return 'Press Tab in';
        if (event.key === 'Escape') return 'Press Escape in';
        return `Press ${event.key} in`;
        
      default:
        return 'Interact with';
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Target Description (Priority Cascade)
  // ─────────────────────────────────────────────────────────────────────────
  
  private getTargetDescription(target: HTMLElement): string {
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 0: Special contexts (terminal, editor, chat)
    // ─────────────────────────────────────────────────────────────────────
    if (target.closest('.xterm, .terminal')) {
      return 'terminal';
    }
    if (target.closest('[class*="copilot"], [class*="chat-input"], [class*="inline-chat"]')) {
      return 'Copilot chat';
    }
    if (target.closest('.monaco-editor')) {
      return 'editor';
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 1: aria-label (sanitized for VS Code garbage)
    // ─────────────────────────────────────────────────────────────────────
    const ariaLabel = target.getAttribute('aria-label');
    if (ariaLabel) {
      const sanitized = this.sanitizeAriaLabel(ariaLabel);
      if (sanitized && sanitized.length > 0 && sanitized.length < 60) {
        return sanitized;
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 2: aria-labelledby reference
    // ─────────────────────────────────────────────────────────────────────
    const labelledBy = target.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      const text = labelElement?.textContent?.trim();
      if (text && text.length < 60) {
        return this.cleanLabelText(text);
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 3: Associated <label> element
    // ─────────────────────────────────────────────────────────────────────
    if (target.id) {
      const labelFor = document.querySelector(`label[for="${target.id}"]`);
      const text = labelFor?.textContent?.trim();
      if (text && text.length < 60) {
        return this.cleanLabelText(text);
      }
    }
    
    // Check parent <label>
    const parentLabel = target.closest('label');
    if (parentLabel) {
      let text = parentLabel.textContent?.trim() || '';
      // Remove the input's own value from the label text
      if (target instanceof HTMLInputElement && target.value) {
        text = text.replace(target.value, '').trim();
      }
      if (text && text.length < 60) {
        return this.cleanLabelText(text);
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 4: Placeholder attribute
    // ─────────────────────────────────────────────────────────────────────
    const placeholder = target.getAttribute('placeholder');
    if (placeholder && placeholder.length < 50) {
      return `${placeholder} field`;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 5: Title attribute
    // ─────────────────────────────────────────────────────────────────────
    const title = target.getAttribute('title');
    if (title && title.length < 50) {
      return title;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 6: Semantic name attribute
    // ─────────────────────────────────────────────────────────────────────
    const name = target.getAttribute('name');
    if (name && this.isSemanticIdentifier(name)) {
      return this.humanize(name) + ' field';
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 7: Semantic ID
    // ─────────────────────────────────────────────────────────────────────
    if (target.id && this.isSemanticIdentifier(target.id)) {
      return this.humanize(target.id);
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 8: Button/link text content
    // ─────────────────────────────────────────────────────────────────────
    const innerText = target.innerText?.trim();
    if (innerText && innerText.length > 0 && innerText.length < 50) {
      // Don't wrap in quotes if it's already descriptive
      if (innerText.length < 20) {
        return `"${innerText}"`;
      }
      return this.truncate(innerText, 40);
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 9: Role attribute
    // ─────────────────────────────────────────────────────────────────────
    const role = target.getAttribute('role');
    if (role && role !== 'presentation' && role !== 'none') {
      return role;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // PRIORITY 10: Tag name fallback
    // ─────────────────────────────────────────────────────────────────────
    return this.getFriendlyTagName(target.tagName);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Sanitization & Cleaning Methods
  // ─────────────────────────────────────────────────────────────────────────
  
  private sanitizeAriaLabel(label: string): string {
    let sanitized = label;
    
    // Remove VS Code state garbage
    for (const pattern of VSCODE_ARIA_CLEANUP_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return sanitized;
  }
  
  private cleanLabelText(text: string): string {
    return text
      .replace(/\*/g, '')           // Remove required asterisks
      .replace(/:/g, '')            // Remove colons
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .trim();
  }
  
  private isSemanticIdentifier(id: string): boolean {
    if (!id) return false;
    
    // Check against auto-generated patterns
    for (const pattern of AUTO_GENERATED_ID_PATTERNS) {
      if (pattern.test(id)) {
        return false;
      }
    }
    
    // Must be at least 2 characters and contain letters
    return id.length >= 2 && /[a-zA-Z]/.test(id);
  }
  
  private humanize(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')           // camelCase → camel Case
      .replace(/[_-]+/g, ' ')               // snake_case → snake case
      .replace(/\s+/g, ' ')                 // Multiple spaces → single
      .trim()
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
  }
  
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  
  private getFriendlyTagName(tag: string): string {
    const map: Record<string, string> = {
      'A': 'link',
      'BUTTON': 'button',
      'INPUT': 'input field',
      'TEXTAREA': 'text area',
      'SELECT': 'dropdown',
      'IMG': 'image',
      'DIV': 'element',
      'SPAN': 'element',
      'LI': 'list item',
      'TD': 'table cell',
      'TH': 'table header',
    };
    return map[tag.toUpperCase()] || `${tag.toLowerCase()} element`;
  }
  
  private getFallbackLabel(event: FilteredEvent): string {
    const action = this.getActionPrefix(event);
    const tag = event.resolvedTarget.tagName?.toLowerCase() || 'element';
    return `${action} ${tag}`;
  }
}
