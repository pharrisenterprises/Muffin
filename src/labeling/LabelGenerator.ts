/**
 * LabelGenerator - Single source of truth for step labels
 */

interface LabelContext {
  event: string;
  element: {
    tag: string;
    id?: string;
    name?: string;
    ariaLabel?: string;
    placeholder?: string;
    innerText?: string;
    className?: string;
    role?: string;
    type?: string;
  };
  value?: string;
  url?: string;
  isTerminal?: boolean;
  isEditor?: boolean;
  keyPressed?: string;
}

export class LabelGenerator {
  
  generate(context: LabelContext): string {
    try {
      const { event, element, value, url, isTerminal, isEditor, keyPressed } = context;
      
      // Navigation
      if (event === 'navigate' && url) {
        try {
          const domain = new URL(url).hostname.replace('www.', '');
          return `Navigate to ${domain}`;
        } catch {
          return `Navigate to ${this.truncate(url, 40)}`;
        }
      }
      
      // Keyboard events
      if (['keydown', 'keypress', 'keyup'].includes(event)) {
        const keyName = this.formatKeyName(keyPressed || 'key');
        if (isTerminal) return `Press ${keyName} in terminal`;
        if (isEditor) return `Press ${keyName} in editor`;
        return `Press ${keyName} in ${this.getTarget(element)}`;
      }
      
      // Input/Type events
      if (event === 'type' || event === 'input') {
        const displayValue = value ? `"${this.truncate(value, 20)}"` : 'text';
        if (isTerminal) return `Enter ${displayValue} in terminal`;
        if (isEditor) return `Enter ${displayValue} in editor`;
        return `Enter ${displayValue} in ${this.getTarget(element)}`;
      }
      
      // Click
      if (event === 'click') {
        return `Click ${this.getTarget(element)}`;
      }
      
      // Double-click
      if (event === 'dblclick') {
        return `Double-click ${this.getTarget(element)}`;
      }
      
      // Fallback
      return `${this.capitalize(event)} ${this.getTarget(element)}`;
      
    } catch (error) {
      console.error('[LabelGenerator] Error:', error);
      return `${this.capitalize(context.event)} element`;
    }
  }
  
  private getTarget(element: LabelContext['element']): string {
    // Priority 1: Clean aria-label
    if (element.ariaLabel) {
      const cleaned = this.sanitizeAriaLabel(element.ariaLabel);
      if (cleaned.length > 0 && cleaned.length < 50) {
        return cleaned;
      }
    }
    
    // Priority 2: Placeholder
    if (element.placeholder) {
      return `${element.placeholder} field`;
    }
    
    // Priority 3: Semantic ID
    if (element.id && this.isSemanticId(element.id)) {
      return this.humanize(element.id);
    }
    
    // Priority 4: Role
    if (element.role && element.role !== 'presentation') {
      return element.role;
    }
    
    // Priority 5: Inner text
    if (element.innerText) {
      const text = element.innerText.trim();
      if (text.length > 0 && text.length < 100) {
        return `"${this.truncate(text, 30)}"`;
      }
    }
    
    // Priority 6: Tag name
    return this.getTagName(element.tag);
  }
  
  private sanitizeAriaLabel(label: string): string {
    const patterns = [
      /,\s*editor/gi,
      /,\s*Workspace/gi,
      /,\s*Tab\s*\d+\s*of\s*\d+/gi,
      /,\s*Group\s*\d+/gi,
      /,\s*pinned/gi,
      /,\s*unsaved/gi,
      /,\s*modified/gi,
      /,\s*preview/gi,
      /,\s*focused/gi,
      /,\s*selected/gi,
    ];
    
    let cleaned = label;
    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    return cleaned.replace(/\s+/g, ' ').trim();
  }
  
  private isSemanticId(id: string): boolean {
    const autoGenPatterns = [
      /^[a-f0-9]{8,}$/i,
      /^\d+$/,
      /^_/,
      /^rc-/,
      /^ember\d+/,
      /^:r\d+:/,
      /^ng-/,
    ];
    return !autoGenPatterns.some(p => p.test(id));
  }
  
  private humanize(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }
  
  private getTagName(tag: string): string {
    const map: Record<string, string> = {
      'a': 'link', 'button': 'button', 'input': 'input field',
      'textarea': 'text area', 'select': 'dropdown', 'img': 'image',
      'div': 'element', 'span': 'text', 'form': 'form'
    };
    return map[tag.toLowerCase()] || `${tag} element`;
  }
  
  private formatKeyName(key: string): string {
    const map: Record<string, string> = {
      'Enter': 'Enter', 'Tab': 'Tab', 'Escape': 'Escape',
      ' ': 'Space', 'ArrowUp': 'Up Arrow', 'ArrowDown': 'Down Arrow'
    };
    return map[key] || key;
  }
  
  private truncate(text: string, max: number): string {
    return text.length <= max ? text : text.substring(0, max - 3) + '...';
  }
  
  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}

export const labelGenerator = new LabelGenerator();
