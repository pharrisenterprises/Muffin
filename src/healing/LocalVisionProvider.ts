// ═══════════════════════════════════════════════════════════════════════════
// LOCAL VISION PROVIDER - Pattern-Based Element Finding
// ═══════════════════════════════════════════════════════════════════════════
// Finds elements using local pattern matching - no API required
// Implements IVisionProvider interface from BATCH 7

import {
  IVisionProvider,
  VisionAnalysisContext,
  VisionAnalysisResult,
  LocalVisionResult,
  ElementCandidate,
  LocalVisionMethod,
  BoundingBox
} from './types';
import { ScreenshotCapture } from '../validation/types';
import { LOCAL_VISION_CONFIG } from './config';

/**
 * LocalVisionProvider - Finds elements using local pattern matching
 * 
 * IMPLEMENTS IVisionProvider:
 * - isAvailable() - always returns true (no API needed)
 * - analyzeScreenshot() - finds elements using text/position matching
 * 
 * METHODS:
 * - Text search: Find elements by visible text
 * - Attribute scan: Scan all attributes for matches
 * - Position-based: Find elements near recorded position
 * - Structure match: Match DOM structure patterns
 * 
 * INDEPENDENTLY WRAPPED:
 * - No external API dependencies
 * - Works offline
 * - Fast fallback when API unavailable
 */
export class LocalVisionProvider implements IVisionProvider {
  name = 'local-vision';
  private config = LOCAL_VISION_CONFIG;
  
  // ─────────────────────────────────────────────────────────────────────────
  // IVisionProvider Implementation
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Check if provider is available
   * Always returns true - local provider needs no external resources
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }
  
  /**
   * Analyze screenshot to find element
   * Uses local pattern matching instead of AI vision
   */
  async analyzeScreenshot(
    screenshot: ScreenshotCapture,
    context: VisionAnalysisContext
  ): Promise<VisionAnalysisResult> {
    
    try {
      // Try all local methods
      const result = await this.findElement(context, screenshot);
      
      if (result.bestMatch) {
        return {
          found: true,
          suggestedSelector: result.bestMatch.selector,
          confidence: result.bestMatch.confidence,
          reasoning: `Found via ${result.method}: ${result.bestMatch.matchReasons.join(', ')}`,
          alternatives: result.candidates
            .filter(c => c !== result.bestMatch)
            .slice(0, 3)
            .map(c => ({
              selector: c.selector,
              confidence: c.confidence
            }))
        };
      }
      
      return {
        found: false,
        confidence: 0,
        reasoning: 'No matching elements found via local analysis'
      };
    } catch (error) {
      return {
        found: false,
        confidence: 0,
        reasoning: `Local analysis error: ${error}`
      };
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Find element using all local methods
   */
  async findElement(
    context: VisionAnalysisContext,
    _screenshot?: ScreenshotCapture
  ): Promise<LocalVisionResult> {
    const startTime = Date.now();
    const candidates: ElementCandidate[] = [];
    const method: LocalVisionMethod = 'combined';
    
    // Method 1: Text search
    const textCandidates = this.findByText(context.targetLabel);
    candidates.push(...textCandidates);
    
    // Method 2: Attribute scan
    const attrCandidates = this.findByAttributes(context);
    candidates.push(...attrCandidates);
    
    // Method 3: Position-based (if we have recorded bounds)
    if (context.expectedBounds) {
      const posCandidates = this.findByPosition(context.expectedBounds);
      candidates.push(...posCandidates);
    }
    
    // Method 4: Structure match (if we have element type)
    if (context.elementType) {
      const structCandidates = this.findByStructure(context);
      candidates.push(...structCandidates);
    }
    
    // Deduplicate and score
    const uniqueCandidates = this.deduplicateAndScore(candidates, context);
    
    // Sort by confidence
    uniqueCandidates.sort((a, b) => b.confidence - a.confidence);
    
    // Limit to max candidates
    const topCandidates = uniqueCandidates.slice(0, this.config.maxCandidates);
    
    return {
      candidates: topCandidates,
      bestMatch: topCandidates[0]?.confidence >= 0.5 ? topCandidates[0] : undefined,
      method,
      duration: Date.now() - startTime
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Find elements by visible text
   */
  private findByText(targetLabel: string): ElementCandidate[] {
    const candidates: ElementCandidate[] = [];
    const normalizedTarget = this.normalizeText(targetLabel);
    
    // Get all visible elements with text
    const elements = document.querySelectorAll(
      'button, a, input, label, span, div, p, h1, h2, h3, h4, h5, h6, td, th'
    );
    
    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      
      if (!this.isVisible(htmlEl)) return;
      
      // Check visible text
      const visibleText = this.getVisibleText(htmlEl);
      const normalizedText = this.normalizeText(visibleText);
      
      const similarity = this.calculateSimilarity(normalizedTarget, normalizedText);
      
      if (similarity >= this.config.textSimilarityThreshold) {
        candidates.push({
          element: htmlEl,
          selector: this.generateSelector(htmlEl),
          confidence: similarity,
          matchReasons: [`Text match: "${visibleText}" (${(similarity * 100).toFixed(0)}%)`],
          bounds: this.getBounds(htmlEl)
        });
      }
    });
    
    return candidates;
  }
  
  /**
   * Find elements by attributes
   */
  private findByAttributes(context: VisionAnalysisContext): ElementCandidate[] {
    const candidates: ElementCandidate[] = [];
    const targetLabel = context.targetLabel.toLowerCase();
    
    // Search various attributes
    const attributeSelectors = [
      `[aria-label*="${targetLabel}"]`,
      `[placeholder*="${targetLabel}"]`,
      `[title*="${targetLabel}"]`,
      `[name*="${targetLabel}"]`,
      `[data-testid*="${targetLabel}"]`,
      `[data-cy*="${targetLabel}"]`,
      `[id*="${targetLabel}"]`
    ];
    
    for (const selector of attributeSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
          const htmlEl = el as HTMLElement;
          
          if (!this.isVisible(htmlEl)) return;
          
          const attrName = selector.match(/\[([^*=]+)/)?.[1] || 'unknown';
          const attrValue = htmlEl.getAttribute(attrName) || '';
          
          candidates.push({
            element: htmlEl,
            selector: this.generateSelector(htmlEl),
            confidence: 0.7, // Attribute matches are moderately confident
            matchReasons: [`Attribute ${attrName}="${attrValue}"`],
            bounds: this.getBounds(htmlEl)
          });
        });
      } catch {
        // Invalid selector - skip
      }
    }
    
    return candidates;
  }
  
  /**
   * Find elements by position (near recorded bounding box)
   */
  private findByPosition(expectedBounds: BoundingBox): ElementCandidate[] {
    const candidates: ElementCandidate[] = [];
    
    // Get all interactive elements
    const elements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [onclick]'
    );
    
    const expectedCenter = {
      x: expectedBounds.x + expectedBounds.width / 2,
      y: expectedBounds.y + expectedBounds.height / 2
    };
    
    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      
      if (!this.isVisible(htmlEl)) return;
      
      const bounds = this.getBounds(htmlEl);
      const center = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
      };
      
      // Calculate distance
      const distance = Math.sqrt(
        Math.pow(center.x - expectedCenter.x, 2) +
        Math.pow(center.y - expectedCenter.y, 2)
      );
      
      if (distance <= this.config.positionThreshold) {
        // Confidence inversely proportional to distance
        const confidence = Math.max(
          0.3,
          1 - (distance / this.config.positionThreshold)
        );
        
        candidates.push({
          element: htmlEl,
          selector: this.generateSelector(htmlEl),
          confidence,
          matchReasons: [`Position match: ${distance.toFixed(0)}px from expected`],
          bounds
        });
      }
    });
    
    return candidates;
  }
  
  /**
   * Find elements by DOM structure
   */
  private findByStructure(context: VisionAnalysisContext): ElementCandidate[] {
    const candidates: ElementCandidate[] = [];
    
    // Map action types to likely element types
    const elementTypes: Record<string, string[]> = {
      'click': ['button', 'a', '[role="button"]', 'input[type="submit"]'],
      'input': ['input', 'textarea', '[contenteditable]'],
      'select': ['select', '[role="listbox"]', '[role="combobox"]'],
      'hover': ['*'], // Could be anything
      'keydown': ['input', 'textarea', '[contenteditable]']
    };
    
    const selectors = elementTypes[context.elementType] || ['*'];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
          const htmlEl = el as HTMLElement;
          
          if (!this.isVisible(htmlEl)) return;
          
          // Check if element looks like it matches the context
          const matchScore = this.scoreStructureMatch(htmlEl, context);
          
          if (matchScore > 0.4) {
            candidates.push({
              element: htmlEl,
              selector: this.generateSelector(htmlEl),
              confidence: matchScore,
              matchReasons: [`Structure match for ${context.elementType}`],
              bounds: this.getBounds(htmlEl)
            });
          }
        });
      } catch {
        // Invalid selector - skip
      }
    }
    
    return candidates;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Deduplicate candidates and recalculate scores
   */
  private deduplicateAndScore(
    candidates: ElementCandidate[],
    _context: VisionAnalysisContext
  ): ElementCandidate[] {
    const elementMap = new Map<HTMLElement, ElementCandidate>();
    
    for (const candidate of candidates) {
      const existing = elementMap.get(candidate.element);
      
      if (existing) {
        // Combine confidence scores (average with boost for multiple matches)
        existing.confidence = Math.min(
          1,
          (existing.confidence + candidate.confidence) / 2 + 0.1
        );
        existing.matchReasons.push(...candidate.matchReasons);
      } else {
        elementMap.set(candidate.element, { ...candidate });
      }
    }
    
    return Array.from(elementMap.values());
  }
  
  /**
   * Check if element is visible
   */
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      parseFloat(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }
  
  /**
   * Get visible text from element
   */
  private getVisibleText(element: HTMLElement): string {
    // For inputs, get value or placeholder
    if (element instanceof HTMLInputElement) {
      return element.value || element.placeholder || '';
    }
    
    // For other elements, get text content (first level only)
    return element.innerText?.trim() || element.textContent?.trim() || '';
  }
  
  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Calculate string similarity (Dice coefficient)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length < 2 || str2.length < 2) return 0;
    
    // Check for containment
    if (str1.includes(str2) || str2.includes(str1)) {
      return 0.8;
    }
    
    // Bigram comparison
    const getBigrams = (s: string): Set<string> => {
      const bigrams = new Set<string>();
      for (let i = 0; i < s.length - 1; i++) {
        bigrams.add(s.substring(i, i + 2));
      }
      return bigrams;
    };
    
    const bigrams1 = getBigrams(str1);
    const bigrams2 = getBigrams(str2);
    
    let matches = 0;
    for (const bigram of bigrams1) {
      if (bigrams2.has(bigram)) matches++;
    }
    
    return (2 * matches) / (bigrams1.size + bigrams2.size);
  }
  
  /**
   * Get element bounding box
   */
  private getBounds(element: HTMLElement): BoundingBox {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  }
  
  /**
   * Generate selector for element
   */
  private generateSelector(element: HTMLElement): string {
    // Try ID first
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Try data-testid
    if (element.dataset.testid) {
      return `[data-testid="${element.dataset.testid}"]`;
    }
    
    // Try unique class combination
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        const selector = '.' + classes.join('.');
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }
    
    // Generate XPath
    return this.generateXPath(element);
  }
  
  /**
   * Generate XPath for element
   */
  private generateXPath(element: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      parts.unshift(`${tagName}[${index}]`);
      current = current.parentElement;
    }
    
    return '/' + parts.join('/');
  }
  
  /**
   * Score how well element matches expected structure
   */
  private scoreStructureMatch(
    element: HTMLElement,
    context: VisionAnalysisContext
  ): number {
    let score = 0.3; // Base score
    
    // Check tag name matches expected type
    const tag = element.tagName.toLowerCase();
    
    if (context.elementType === 'click') {
      if (['button', 'a'].includes(tag)) score += 0.2;
      if (element.getAttribute('role') === 'button') score += 0.15;
    }
    
    if (context.elementType === 'input') {
      if (['input', 'textarea'].includes(tag)) score += 0.2;
      if (element.isContentEditable) score += 0.15;
    }
    
    // Check for interactive attributes
    if (element.onclick || element.hasAttribute('onclick')) score += 0.1;
    if (element.hasAttribute('tabindex')) score += 0.05;
    
    return Math.min(1, score);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create LocalVisionProvider instance
 * @returns Configured provider instance
 */
export function createLocalVisionProvider(): LocalVisionProvider {
  return new LocalVisionProvider();
}
