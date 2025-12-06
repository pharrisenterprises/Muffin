// =============================================================================
// BATCH 11: ELEMENT TRAVERSER
// Purpose: Unified iframe + shadow DOM traversal for candidate gathering
// Fixes: Audit Issues #1 (Iframe), #2 (Shadow DOM), #3 (Iframe Chain), #5 (CSS.escape)
// =============================================================================

import type { Bundle, IframeInfo } from '../../recording/types';

// =============================================================================
// TYPES
// =============================================================================

export interface TraversalContext {
  document: Document;
  iframeChain: number[];      // Indices of iframes traversed
  shadowHosts: string[];      // Selectors of shadow hosts traversed
  scrollOffset: { x: number; y: number };
}

export interface CandidateWithContext {
  element: HTMLElement;
  context: TraversalContext;
}

export interface TraverserConfig {
  maxIframeDepth: number;     // Max iframe nesting (default: 5)
  maxShadowDepth: number;     // Max shadow DOM nesting (default: 10)
  searchRadius: number;       // Pixels from expected position (default: 300)
  maxCandidates: number;      // Max candidates to return (default: 50)
  includeHidden: boolean;     // Include hidden elements (default: false)
}

const DEFAULT_CONFIG: TraverserConfig = {
  maxIframeDepth: 5,
  maxShadowDepth: 10,
  searchRadius: 300,
  maxCandidates: 50,
  includeHidden: false
};

// =============================================================================
// ELEMENT TRAVERSER CLASS
// =============================================================================

export class ElementTraverser {
  private config: TraverserConfig;
  
  constructor(config: Partial<TraverserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  // ===========================================================================
  // MAIN PUBLIC API
  // ===========================================================================
  
  /**
   * Gather all candidate elements matching criteria across all frames and shadow DOMs
   */
  gatherCandidates(
    bundle: Bundle,
    expectedIframeChain?: IframeInfo[]
  ): CandidateWithContext[] {
    const candidates: CandidateWithContext[] = [];
    const seen = new WeakSet<HTMLElement>();
    
    const rootContext: TraversalContext = {
      document: document,
      iframeChain: [],
      shadowHosts: [],
      scrollOffset: { x: window.scrollX, y: window.scrollY }
    };
    
    // Start recursive traversal from main document
    this.traverseDocument(document, rootContext, bundle, candidates, seen, 0, 0);
    
    // Sort by iframe chain match if expected chain provided
    if (expectedIframeChain && expectedIframeChain.length > 0) {
      const expectedIndices = this.iframeInfoToIndices(expectedIframeChain);
      candidates.sort((a, b) => {
        const aMatch = this.iframeChainMatchScore(a.context.iframeChain, expectedIndices);
        const bMatch = this.iframeChainMatchScore(b.context.iframeChain, expectedIndices);
        return bMatch - aMatch; // Higher match first
      });
    }
    
    // Limit candidates
    return candidates.slice(0, this.config.maxCandidates);
  }
  
  /**
   * Find element by exact iframe chain + shadow host path
   */
  findByExactPath(
    iframeChain: number[],
    shadowHosts: string[],
    selector: string
  ): HTMLElement | null {
    try {
      // Navigate to correct iframe
      let doc: Document = document;
      
      for (const iframeIndex of iframeChain) {
        const iframes = doc.querySelectorAll('iframe');
        const iframe = iframes[iframeIndex] as HTMLIFrameElement;
        
        if (!iframe) return null;
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return null;
        
        doc = iframeDoc;
      }
      
      // Navigate through shadow hosts
      let root: Document | ShadowRoot = doc;
      
      for (const hostSelector of shadowHosts) {
        const host = root.querySelector(hostSelector);
        if (!host) return null;
        
        const shadow = this.getShadowRoot(host as HTMLElement);
        if (!shadow) return null;
        
        root = shadow;
      }
      
      // Find element
      return root.querySelector(selector) as HTMLElement;
      
    } catch (e) {
      console.warn('[ElementTraverser] findByExactPath failed:', e);
      return null;
    }
  }
  
  // ===========================================================================
  // RECURSIVE TRAVERSAL
  // ===========================================================================
  
  /**
   * Traverse a document, collecting candidates and recursing into iframes/shadows
   */
  private traverseDocument(
    doc: Document,
    context: TraversalContext,
    bundle: Bundle,
    candidates: CandidateWithContext[],
    seen: WeakSet<HTMLElement>,
    iframeDepth: number,
    shadowDepth: number
  ): void {
    if (iframeDepth > this.config.maxIframeDepth) return;
    
    // Gather from this document
    this.gatherFromRoot(doc, context, bundle, candidates, seen, shadowDepth);
    
    // Recurse into iframes
    const iframes = doc.querySelectorAll('iframe');
    iframes.forEach((iframe, index) => {
      try {
        const iframeEl = iframe as HTMLIFrameElement;
        const iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow?.document;
        
        if (iframeDoc) {
          const iframeRect = iframeEl.getBoundingClientRect();
          const iframeContext: TraversalContext = {
            document: iframeDoc,
            iframeChain: [...context.iframeChain, index],
            shadowHosts: [...context.shadowHosts],
            scrollOffset: {
              x: context.scrollOffset.x + (iframeRect.left || 0),
              y: context.scrollOffset.y + (iframeRect.top || 0)
            }
          };
          
          this.traverseDocument(
            iframeDoc,
            iframeContext,
            bundle,
            candidates,
            seen,
            iframeDepth + 1,
            shadowDepth
          );
        }
      } catch (e) {
        // Cross-origin iframe, skip silently
      }
    });
  }
  
  /**
   * Gather candidates from a document/shadow root, recursing into shadow DOMs
   */
  private gatherFromRoot(
    root: Document | ShadowRoot,
    context: TraversalContext,
    bundle: Bundle,
    candidates: CandidateWithContext[],
    seen: WeakSet<HTMLElement>,
    shadowDepth: number
  ): void {
    if (shadowDepth > this.config.maxShadowDepth) return;
    
    const addCandidate = (el: HTMLElement) => {
      if (!seen.has(el) && this.isCandidate(el, bundle)) {
        seen.add(el);
        candidates.push({ element: el, context });
      }
    };
    
    // Strategy 1: By ID (fastest)
    if (bundle.id) {
      try {
        const byId = root.getElementById?.(bundle.id) || 
                     root.querySelector?.(`#${CSS.escape(bundle.id)}`);
        if (byId) addCandidate(byId as HTMLElement);
      } catch (e) {
        // CSS.escape might fail on invalid IDs
      }
    }
    
    // Strategy 2: By name attribute
    if (bundle.name) {
      try {
        const byName = root.querySelectorAll(`[name="${CSS.escape(bundle.name)}"]`);
        byName.forEach(el => addCandidate(el as HTMLElement));
      } catch (e) {
        // Invalid selector
      }
    }
    
    // Strategy 3: By aria-label
    if (bundle.ariaLabel) {
      try {
        const byAria = root.querySelectorAll(`[aria-label="${CSS.escape(bundle.ariaLabel)}"]`);
        byAria.forEach(el => addCandidate(el as HTMLElement));
      } catch (e) {
        // Invalid selector
      }
    }
    
    // Strategy 4: By placeholder
    if (bundle.placeholder) {
      try {
        const byPlaceholder = root.querySelectorAll(`[placeholder="${CSS.escape(bundle.placeholder)}"]`);
        byPlaceholder.forEach(el => addCandidate(el as HTMLElement));
      } catch (e) {
        // Invalid selector
      }
    }
    
    // Strategy 5: By data-testid
    if (bundle.testId) {
      try {
        const byTestId = root.querySelectorAll(
          `[data-testid="${CSS.escape(bundle.testId)}"]`
        );
        byTestId.forEach(el => addCandidate(el as HTMLElement));
      } catch (e) {
        // Invalid selector
      }
    }
    
    // Strategy 6: By other data attributes
    if (bundle.dataAttrs && Object.keys(bundle.dataAttrs).length > 0) {
      for (const [key, value] of Object.entries(bundle.dataAttrs)) {
        try {
          const selector = `[data-${CSS.escape(key)}="${CSS.escape(value)}"]`;
          root.querySelectorAll(selector).forEach(el => {
            addCandidate(el as HTMLElement);
          });
        } catch (e) {
          // Invalid selector
        }
      }
    }
    
    // Strategy 7: By tag near expected position
    if (bundle.tag) {
      try {
        const byTag = root.querySelectorAll(bundle.tag);
        byTag.forEach(el => {
          const htmlEl = el as HTMLElement;
          if (this.isNearExpectedPosition(htmlEl, bundle, context.scrollOffset)) {
            addCandidate(htmlEl);
          }
        });
      } catch (e) {
        // Invalid tag selector
      }
    }
    
    // Strategy 8: By text content (fuzzy)
    if (bundle.visibleText && bundle.visibleText.length > 2) {
      try {
        const allElements = root.querySelectorAll('*');
        allElements.forEach(el => {
          const htmlEl = el as HTMLElement;
          const text = htmlEl.innerText?.trim() || htmlEl.textContent?.trim() || '';
          
          if (text && this.fuzzyMatch(text, bundle.visibleText!) > 0.6) {
            addCandidate(htmlEl);
          }
        });
      } catch (e) {
        // Query failed
      }
    }
    
    // Recurse into shadow DOMs
    try {
      const allElements = root.querySelectorAll('*');
      allElements.forEach(el => {
        const shadow = this.getShadowRoot(el as HTMLElement);
        if (shadow) {
          const shadowContext: TraversalContext = {
            ...context,
            shadowHosts: [...context.shadowHosts, this.generateSelector(el as HTMLElement)]
          };
          
          this.gatherFromRoot(shadow, shadowContext, bundle, candidates, seen, shadowDepth + 1);
        }
      });
    } catch (e) {
      // Shadow DOM traversal failed
    }
  }
  
  // ===========================================================================
  // SHADOW DOM HELPERS
  // ===========================================================================
  
  /**
   * Get shadow root (handles both open and intercepted closed shadows)
   */
  private getShadowRoot(element: HTMLElement): ShadowRoot | null {
    // Open shadow root
    if (element.shadowRoot) {
      return element.shadowRoot;
    }
    
    // Intercepted closed shadow root (from page-interceptor.tsx)
    if ((element as any).__realShadowRoot) {
      return (element as any).__realShadowRoot;
    }
    
    // Alternative property names that might be used
    if ((element as any)._shadowRoot) {
      return (element as any)._shadowRoot;
    }
    
    return null;
  }
  
  // ===========================================================================
  // POSITION HELPERS (with scroll compensation)
  // ===========================================================================
  
  /**
   * Check if element is near expected position (with scroll compensation)
   */
  private isNearExpectedPosition(
    element: HTMLElement,
    bundle: Bundle,
    _scrollOffset: { x: number; y: number }
  ): boolean {
    if (!bundle.bounding) return true; // No position constraint
    
    const rect = element.getBoundingClientRect();
    
    // Current element position (viewport-relative)
    const currentX = rect.left + rect.width / 2;
    const currentY = rect.top + rect.height / 2;
    
    // Expected position (recorded position was viewport-relative)
    const expectedX = bundle.bounding.x + bundle.bounding.width / 2;
    const expectedY = bundle.bounding.y + bundle.bounding.height / 2;
    
    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(currentX - expectedX, 2) +
      Math.pow(currentY - expectedY, 2)
    );
    
    return distance <= this.config.searchRadius;
  }
  
  /**
   * Get absolute position of element (accounting for scroll)
   */
  getAbsolutePosition(element: HTMLElement): { x: number; y: number; width: number; height: number } {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  }
  
  /**
   * Compare positions with scroll compensation
   */
  comparePositions(
    current: { x: number; y: number; width: number; height: number },
    recorded: { x: number; y: number; width: number; height: number },
    recordedScroll: { x: number; y: number },
    currentScroll: { x: number; y: number }
  ): { distance: number; score: number } {
    // Adjust recorded position to current scroll context
    const adjustedRecordedX = recorded.x - recordedScroll.x + currentScroll.x;
    const adjustedRecordedY = recorded.y - recordedScroll.y + currentScroll.y;
    
    const currentCenterX = current.x + current.width / 2;
    const currentCenterY = current.y + current.height / 2;
    const recordedCenterX = adjustedRecordedX + recorded.width / 2;
    const recordedCenterY = adjustedRecordedY + recorded.height / 2;
    
    const distance = Math.sqrt(
      Math.pow(currentCenterX - recordedCenterX, 2) +
      Math.pow(currentCenterY - recordedCenterY, 2)
    );
    
    // Score: 0px = 1.0, 100px = 0.5, 300px = 0
    const score = Math.max(0, 1 - distance / 300);
    
    return { distance, score };
  }
  
  // ===========================================================================
  // IFRAME CHAIN HELPERS
  // ===========================================================================
  
  /**
   * Convert IframeInfo[] to number[] indices
   */
  private iframeInfoToIndices(iframeChain: IframeInfo[]): number[] {
    return iframeChain.map(info => info.index || 0);
  }
  
  /**
   * Score how well an iframe chain matches expected chain
   */
  iframeChainMatchScore(actual: number[], expected: number[]): number {
    if (expected.length === 0 && actual.length === 0) {
      return 1.0; // Both in main document
    }
    
    if (expected.length === 0 && actual.length > 0) {
      return 0.3; // Expected main document, found in iframe
    }
    
    if (expected.length > 0 && actual.length === 0) {
      return 0.3; // Expected iframe, found in main document
    }
    
    // Compare chains
    const minLen = Math.min(actual.length, expected.length);
    const maxLen = Math.max(actual.length, expected.length);
    
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (actual[i] === expected[i]) {
        matches++;
      } else {
        break; // Chains diverge
      }
    }
    
    // Score based on matching prefix length
    return matches / maxLen;
  }
  
  /**
   * Check if element is in main document (not in any iframe)
   */
  isInMainDocument(element: HTMLElement): boolean {
    let current: Document | null = element.ownerDocument;
    
    while (current) {
      if (current === document) {
        return true;
      }
      
      // Check if this document is inside an iframe
      const frameElement = current.defaultView?.frameElement as HTMLIFrameElement | null;
      if (!frameElement) {
        return current === document;
      }
      
      current = frameElement.ownerDocument;
    }
    
    return false;
  }
  
  /**
   * Get the iframe chain for an element
   */
  getIframeChain(element: HTMLElement): number[] {
    const chain: number[] = [];
    let currentDoc: Document | null = element.ownerDocument;
    
    while (currentDoc && currentDoc !== document) {
      const frameElement = currentDoc.defaultView?.frameElement as HTMLIFrameElement;
      if (!frameElement) break;
      
      // Find index of this iframe among siblings
      const parentDoc = frameElement.ownerDocument;
      const iframes = parentDoc.querySelectorAll('iframe');
      const index = Array.from(iframes).indexOf(frameElement);
      
      chain.unshift(index);
      currentDoc = parentDoc;
    }
    
    return chain;
  }
  
  // ===========================================================================
  // CANDIDATE VALIDATION
  // ===========================================================================
  
  /**
   * Check if element is a valid candidate
   */
  private isCandidate(element: HTMLElement, bundle: Bundle): boolean {
    // Must be visible (unless config says include hidden)
    if (!this.config.includeHidden && !this.isVisible(element)) {
      return false;
    }
    
    // Must match tag if specified
    if (bundle.tag && element.tagName.toLowerCase() !== bundle.tag.toLowerCase()) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if element is visible
   */
  private isVisible(element: HTMLElement): boolean {
    try {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        parseFloat(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    } catch {
      return false;
    }
  }
  
  // ===========================================================================
  // UTILITY HELPERS
  // ===========================================================================
  
  /**
   * Fuzzy string matching using Dice coefficient
   */
  private fuzzyMatch(a: string, b: string): number {
    if (!a || !b) return 0;
    
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    if (aLower === bLower) return 1;
    if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;
    
    // Bigram comparison
    const getBigrams = (str: string): Set<string> => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };
    
    const aBigrams = getBigrams(aLower);
    const bBigrams = getBigrams(bLower);
    
    let matches = 0;
    aBigrams.forEach(bg => {
      if (bBigrams.has(bg)) matches++;
    });
    
    return (2 * matches) / (aBigrams.size + bBigrams.size) || 0;
  }
  
  /**
   * Generate a reliable selector for an element
   */
  private generateSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }
    
    const name = element.getAttribute('name');
    if (name) {
      return `${element.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
    }
    
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${CSS.escape(testId)}"]`;
    }
    
    // Fallback: tag with nth-of-type
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        c => c.tagName === element.tagName
      );
      const index = siblings.indexOf(element) + 1;
      return `${element.tagName.toLowerCase()}:nth-of-type(${index})`;
    }
    
    return element.tagName.toLowerCase();
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<TraverserConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): Readonly<TraverserConfig> {
    return { ...this.config };
  }
}

// =============================================================================
// FACTORY & SINGLETON
// =============================================================================

export function createElementTraverser(config?: Partial<TraverserConfig>): ElementTraverser {
  return new ElementTraverser(config);
}

// Singleton for convenience
export const elementTraverser = new ElementTraverser();
