/**
 * BUNDLE BUILDER MODULE
 * Creates comprehensive element metadata bundles for replay
 * 
 * Includes CONTEXT HINTS for disambiguation during playback
 * (e.g., terminal vs editor vs Copilot chat)
 */

import { Bundle, IframeInfo, FilteredEvent } from './types';
import { AUTO_GENERATED_ID_PATTERNS, CONTEXT_SELECTORS } from './config';

export class BundleBuilder {
  
  /**
   * Build a complete bundle from an element
   */
  build(event: FilteredEvent): Bundle {
    const element = event.resolvedTarget;
    
    return {
      // ─────────────────────────────────────────────────────────────────
      // Identifiers
      // ─────────────────────────────────────────────────────────────────
      id: element.id || undefined,
      name: element.getAttribute('name') || undefined,
      className: this.getClassName(element),
      tag: element.tagName.toLowerCase(),
      
      // ─────────────────────────────────────────────────────────────────
      // Accessibility
      // ─────────────────────────────────────────────────────────────────
      ariaLabel: element.getAttribute('aria-label') || undefined,
      ariaLabelledBy: element.getAttribute('aria-labelledby') || undefined,
      placeholder: element.getAttribute('placeholder') || undefined,
      role: element.getAttribute('role') || undefined,
      
      // ─────────────────────────────────────────────────────────────────
      // Data Attributes
      // ─────────────────────────────────────────────────────────────────
      dataAttrs: this.getDataAttributes(element),
      testId: this.getTestId(element),
      
      // ─────────────────────────────────────────────────────────────────
      // Selectors
      // ─────────────────────────────────────────────────────────────────
      xpath: this.getXPath(element),
      cssSelector: this.getCssSelector(element),
      
      // ─────────────────────────────────────────────────────────────────
      // Position
      // ─────────────────────────────────────────────────────────────────
      bounding: this.getBoundingBox(element),
      
      // ─────────────────────────────────────────────────────────────────
      // Scroll Position (Batch 11: scroll compensation)
      // ─────────────────────────────────────────────────────────────────
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY,
      },
      
      // ─────────────────────────────────────────────────────────────────
      // Context
      // ─────────────────────────────────────────────────────────────────
      iframeChain: this.getIframeChain(element),
      shadowHosts: this.getShadowHosts(element),
      pageUrl: window.location.href,
      
      // ─────────────────────────────────────────────────────────────────
      // Text Content
      // ─────────────────────────────────────────────────────────────────
      visibleText: this.getVisibleText(element),
      innerText: element.innerText?.substring(0, 200) || undefined,
      
      // ─────────────────────────────────────────────────────────────────
      // CONTEXT HINTS (Critical for playback disambiguation)
      // ─────────────────────────────────────────────────────────────────
      contextHints: {
        isTerminal: !!element.closest(CONTEXT_SELECTORS.terminal),
        isMonacoEditor: !!element.closest(CONTEXT_SELECTORS.monacoEditor),
        isCopilotChat: !!element.closest(CONTEXT_SELECTORS.copilotChat),
        isVSCodeInput: !!element.closest(CONTEXT_SELECTORS.vscodeInput),
        containerSelector: this.getContainerSelector(element),
      },
    };
  }

  
  // ─────────────────────────────────────────────────────────────────────────
  // XPath Generation
  // ─────────────────────────────────────────────────────────────────────────
  
  private getXPath(element: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current !== document.body && current !== document.documentElement) {
      let tag = current.tagName.toLowerCase();
      
      // Skip SVG elements in path (they cause issues)
      if (tag === 'svg' || current instanceof SVGElement) {
        current = current.parentElement;
        continue;
      }
      
      // Calculate index among same-tag siblings
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      parts.unshift(`${tag}[${index}]`);
      current = current.parentElement;
    }
    
    return '/html/body/' + parts.join('/');
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CSS Selector Generation
  // ─────────────────────────────────────────────────────────────────────────
  
  private getCssSelector(element: HTMLElement): string | undefined {
    // Priority 1: ID (if semantic)
    if (element.id && this.isSemanticId(element.id)) {
      return `#${CSS.escape(element.id)}`;
    }
    
    // Priority 2: data-testid
    const testId = this.getTestId(element);
    if (testId) {
      return `[data-testid="${testId}"]`;
    }
    
    // Priority 3: data-test
    const dataTest = element.getAttribute('data-test');
    if (dataTest) {
      return `[data-test="${dataTest}"]`;
    }
    
    // Priority 4: name attribute
    const name = element.getAttribute('name');
    if (name) {
      return `[name="${name}"]`;
    }
    
    // Priority 5: aria-label (unique enough)
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.length < 50) {
      return `[aria-label="${ariaLabel}"]`;
    }
    
    return undefined;
  }
  
  private isSemanticId(id: string): boolean {
    return !AUTO_GENERATED_ID_PATTERNS.some(p => p.test(id));
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Attribute Extraction
  // ─────────────────────────────────────────────────────────────────────────
  
  private getClassName(element: HTMLElement): string | undefined {
    const className = element.className;
    if (typeof className === 'string') {
      return className || undefined;
    }
    // SVGAnimatedString or other
    if (className && typeof (className as any).toString === 'function') {
      return (className as any).toString() || undefined;
    }
    return undefined;
  }
  
  private getDataAttributes(element: HTMLElement): Record<string, string> {
    const attrs: Record<string, string> = {};
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        attrs[attr.name.replace('data-', '')] = attr.value;
      }
    });
    return attrs;
  }
  
  private getTestId(element: HTMLElement): string | undefined {
    return (
      element.getAttribute('data-testid') ||
      element.getAttribute('data-test-id') ||
      element.getAttribute('data-test') ||
      element.getAttribute('data-cy') ||
      undefined
    );
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Bounding Box
  // ─────────────────────────────────────────────────────────────────────────
  
  private getBoundingBox(element: HTMLElement): Bundle['bounding'] {
    try {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    } catch (e) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Context Methods
  // ─────────────────────────────────────────────────────────────────────────
  
  private getIframeChain(element: HTMLElement): IframeInfo[] | undefined {
    const chain: IframeInfo[] = [];
    let win: Window | null = element.ownerDocument?.defaultView || null;
    
    try {
      while (win && win !== window.top) {
        const frameElement = win.frameElement as HTMLIFrameElement;
        if (frameElement) {
          chain.unshift({
            id: frameElement.id || undefined,
            name: frameElement.name || undefined,
            index: this.getFrameIndex(frameElement),
            src: frameElement.src || undefined,
          });
        }
        win = win.parent;
      }
    } catch (e) {
      // Cross-origin, stop traversal
    }
    
    return chain.length > 0 ? chain : undefined;
  }
  
  private getFrameIndex(iframe: HTMLIFrameElement): number {
    const iframes = iframe.parentElement?.querySelectorAll('iframe') || [];
    return Array.from(iframes).indexOf(iframe);
  }
  
  private getShadowHosts(element: HTMLElement): string[] | undefined {
    const hosts: string[] = [];
    let current: Node | null = element;
    
    try {
      while (current) {
        const root = current.getRootNode();
        if (root instanceof ShadowRoot) {
          const host = root.host as HTMLElement;
          hosts.unshift(this.getXPath(host));
          current = host;
        } else {
          break;
        }
      }
    } catch (e) {
      // Shadow DOM traversal failed
    }
    
    return hosts.length > 0 ? hosts : undefined;
  }
  
  private getContainerSelector(element: HTMLElement): string | undefined {
    // Find the most specific container for disambiguation
    const containers = [
      { selector: '.xterm', name: 'terminal' },
      { selector: '[class*="copilot"]', name: 'copilot' },
      { selector: '[class*="chat-input"]', name: 'chat' },
      { selector: '.monaco-editor', name: 'editor' },
      { selector: '[class*="quick-input"]', name: 'quickinput' },
    ];
    
    for (const { selector, name } of containers) {
      const container = element.closest(selector);
      if (container) {
        return `${name}:${selector}`;
      }
    }
    
    return undefined;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Text Content
  // ─────────────────────────────────────────────────────────────────────────
  
  private getVisibleText(element: HTMLElement): string | undefined {
    // Get text that's actually visible (not hidden children)
    const text = element.innerText?.trim();
    if (text && text.length <= 100) {
      return text;
    }
    if (text && text.length > 100) {
      return text.substring(0, 100) + '...';
    }
    return undefined;
  }
}
