/**
 * @fileoverview DOM Capture Layer
 * @description Captures DOM-level evidence (selectors, attributes, accessibility).
 * Layer 1 of 4 in recording capture system.
 * 
 * @module contentScript/layers/DOMCapture
 * @version 1.0.0
 * @since Phase 4
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DOMCaptureConfig {
  maxTextLength: number;
  includeComputedStyles: boolean;
  includeShadowDOM: boolean;
  maxDepth: number;
}

const DEFAULT_CONFIG: DOMCaptureConfig = {
  maxTextLength: 100,
  includeComputedStyles: false,
  includeShadowDOM: true,
  maxDepth: 10
};

export interface DOMCaptureResult {
  selector: string;
  xpath: string;
  tagName: string;
  id?: string;
  classList: string[];
  role?: string;
  accessibleName?: string;
  textContent?: string;
  x: number;
  y: number;
  boundingRect: { x: number; y: number; width: number; height: number };
  attributes: Record<string, string>;
  inputType?: string;
  inputValue?: string;
  isContentEditable: boolean;
  frameIndex?: number;
}

// ============================================================================
// DOM CAPTURE CLASS
// ============================================================================

export class DOMCapture {
  private config: DOMCaptureConfig;

  constructor(config?: Partial<DOMCaptureConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // MAIN CAPTURE
  // ==========================================================================

  capture(element: Element, x: number, y: number): DOMCaptureResult {
    const htmlElement = element as HTMLElement;
    const rect = element.getBoundingClientRect();

    // Get all attributes
    const attributes: Record<string, string> = {};
    for (const attr of Array.from(element.attributes)) {
      attributes[attr.name] = attr.value;
    }

    // Get accessible name
    const accessibleName = this.getAccessibleName(element);

    // Get input-specific info
    let inputType: string | undefined;
    let inputValue: string | undefined;

    if (element instanceof HTMLInputElement) {
      inputType = element.type;
      inputValue = element.type === 'password' ? '***' : element.value;
    } else if (element instanceof HTMLTextAreaElement) {
      inputType = 'textarea';
      inputValue = element.value;
    } else if (element instanceof HTMLSelectElement) {
      inputType = 'select';
      inputValue = element.value;
    }

    return {
      selector: this.generateSelector(element),
      xpath: this.generateXPath(element),
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      classList: Array.from(element.classList),
      role: element.getAttribute('role') || this.getImplicitRole(element) || undefined,
      accessibleName,
      textContent: this.getTextContent(element),
      x,
      y,
      boundingRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },
      attributes,
      inputType,
      inputValue,
      isContentEditable: htmlElement.isContentEditable ?? false,
      frameIndex: this.getFrameIndex()
    };
  }

  // ==========================================================================
  // SELECTOR GENERATION
  // ==========================================================================

  generateSelector(element: Element): string {
    // Priority: data-testid > id > unique CSS path
    const testId = element.getAttribute('data-testid');
    if (testId) return `[data-testid="${testId}"]`;

    if (element.id && !this.isDynamicId(element.id)) {
      return `#${CSS.escape(element.id)}`;
    }

    return this.generateCSSPath(element);
  }

  private generateCSSPath(element: Element): string {
    const parts: string[] = [];
    let current: Element | null = element;
    let depth = 0;

    while (current && current !== document.body && depth < this.config.maxDepth) {
      let part = current.tagName.toLowerCase();

      // Try ID first
      if (current.id && !this.isDynamicId(current.id)) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }

      // Add classes (filter dynamic ones)
      const classes = Array.from(current.classList)
        .filter(c => !this.isDynamicClass(c))
        .slice(0, 2);

      if (classes.length) {
        part += '.' + classes.map(c => CSS.escape(c)).join('.');
      }

      // Add nth-of-type if needed
      const parent: HTMLElement | null = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => (c as Element).tagName === current!.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          part += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(part);
      current = parent;
      depth++;
    }

    return parts.join(' > ');
  }

  // ==========================================================================
  // XPATH GENERATION
  // ==========================================================================

  generateXPath(element: Element): string {
    // Priority: data-testid > id > path
    const testId = element.getAttribute('data-testid');
    if (testId) return `//*[@data-testid="${testId}"]`;

    if (element.id && !this.isDynamicId(element.id)) {
      return `//*[@id="${element.id}"]`;
    }

    return this.generateXPathPath(element);
  }

  private generateXPathPath(element: Element): string {
    const parts: string[] = [];
    let current: Element | null = element;
    let depth = 0;

    while (current && current !== document.body && depth < this.config.maxDepth) {
      let part = current.tagName.toLowerCase();

      const parent: HTMLElement | null = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => (c as Element).tagName === current!.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          part += `[${index}]`;
        }
      }

      parts.unshift(part);
      current = parent;
      depth++;
    }

    return '//' + parts.join('/');
  }

  // ==========================================================================
  // ACCESSIBILITY
  // ==========================================================================

  private getAccessibleName(element: Element): string | undefined {
    // aria-label takes priority
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent?.trim().slice(0, this.config.maxTextLength);
    }

    // Associated label (for inputs)
    if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
      const labels = document.querySelectorAll(`label[for="${element.id}"]`);
      if (labels.length) {
        return labels[0].textContent?.trim().slice(0, this.config.maxTextLength);
      }
    }

    // Title attribute
    const title = element.getAttribute('title');
    if (title) return title;

    // Placeholder
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (element.placeholder) return element.placeholder;
    }

    // Alt text (for images)
    if (element instanceof HTMLImageElement && element.alt) {
      return element.alt;
    }

    // Text content for buttons/links
    if (element.tagName === 'BUTTON' || element.tagName === 'A') {
      return element.textContent?.trim().slice(0, this.config.maxTextLength);
    }

    return undefined;
  }

  private getImplicitRole(element: Element): string | null {
    const tagRoles: Record<string, string> = {
      'A': 'link',
      'BUTTON': 'button',
      'INPUT': 'textbox',
      'SELECT': 'combobox',
      'TEXTAREA': 'textbox',
      'IMG': 'img',
      'NAV': 'navigation',
      'MAIN': 'main',
      'HEADER': 'banner',
      'FOOTER': 'contentinfo',
      'ARTICLE': 'article',
      'ASIDE': 'complementary',
      'FORM': 'form',
      'TABLE': 'table',
      'UL': 'list',
      'OL': 'list',
      'LI': 'listitem'
    };

    return tagRoles[element.tagName] ?? null;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getTextContent(element: Element): string | undefined {
    const text = element.textContent?.trim();
    if (!text) return undefined;
    return text.slice(0, this.config.maxTextLength);
  }

  private isDynamicId(id: string): boolean {
    // Common patterns for dynamic IDs
    const patterns = [
      /^ember\d+$/i,
      /^react-/i,
      /^ng-/,
      /^v-/,
      /[a-f0-9]{8}-[a-f0-9]{4}/i, // UUID
      /[a-z]{1,3}[0-9a-f]{6,}/i,   // Hash
      /\d{10,}/,                    // Timestamp
      /_[a-z0-9]{5,}$/i            // Random suffix
    ];

    return patterns.some(p => p.test(id));
  }

  private isDynamicClass(className: string): boolean {
    const patterns = [
      /^css-[a-z0-9]+$/i,     // Emotion/styled-components
      /^sc-[a-z]+$/i,         // styled-components
      /___[a-zA-Z0-9]+$/,     // CSS modules
      /^_[a-f0-9]{5,}$/i      // Random hashes
    ];

    return patterns.some(p => p.test(className));
  }

  private getFrameIndex(): number | undefined {
    if (window === window.top) return undefined;

    try {
      const frames = window.parent.frames;
      for (let i = 0; i < frames.length; i++) {
        if (frames[i] === window) return i;
      }
    } catch {
      // Cross-origin frame
    }

    return undefined;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: DOMCapture | null = null;

export function getDOMCapture(config?: Partial<DOMCaptureConfig>): DOMCapture {
  if (!instance) {
    instance = new DOMCapture(config);
  }
  return instance;
}
