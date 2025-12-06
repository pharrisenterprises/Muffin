// ═══════════════════════════════════════════════════════════════════════════
// GRAPH-BASED FINDER - Find Elements Using Relationship Graph
// ═══════════════════════════════════════════════════════════════════════════

import type {
  ElementGraph,
  ElementNode,
  GraphFindResult,
  GraphFindStrategy,
  BoundingBox
} from './self-healing-types';

export class GraphBasedFinder {
  /**
   * Find element using graph relationships
   */
  find(graph: ElementGraph): GraphFindResult {
    const strategies: GraphFindStrategy[] = [
      'parent-child',
      'sibling-relative',
      'landmark-path',
      'nearby-text'
    ];
    
    const alternatives: Array<{
      element: HTMLElement;
      selector: string;
      confidence: number;
    }> = [];
    
    for (const strategy of strategies) {
      const result = this.tryStrategy(strategy, graph);
      
      if (result.found && result.element) {
        for (const otherStrategy of strategies) {
          if (otherStrategy !== strategy) {
            const altResult = this.tryStrategy(otherStrategy, graph);
            if (altResult.found && altResult.element && altResult.element !== result.element) {
              alternatives.push({
                element: altResult.element,
                selector: altResult.selector!,
                confidence: altResult.confidence
              });
            }
          }
        }
        
        return { ...result, alternatives: alternatives.slice(0, 3) };
      }
    }
    
    return {
      found: false,
      strategy: 'combined',
      relationshipPath: [],
      confidence: 0,
      alternatives
    };
  }
  
  private tryStrategy(strategy: GraphFindStrategy, graph: ElementGraph): GraphFindResult {
    switch (strategy) {
      case 'parent-child':
        return this.findViaParent(graph);
      case 'sibling-relative':
        return this.findViaSibling(graph);
      case 'landmark-path':
        return this.findViaLandmark(graph);
      case 'nearby-text':
        return this.findViaNearby(graph);
      default:
        return this.emptyResult(strategy);
    }
  }
  
  // Strategy implementations
  
  private findViaParent(graph: ElementGraph): GraphFindResult {
    const stableParent = graph.parents.find(p => p.isStable);
    if (!stableParent) return this.emptyResult('parent-child');
    
    const parentElement = this.findNode(stableParent);
    if (!parentElement) return this.emptyResult('parent-child');
    
    const targetElement = this.findTargetWithinParent(parentElement, graph.target);
    if (!targetElement) return this.emptyResult('parent-child');
    
    return {
      found: true,
      element: targetElement,
      selector: this.generateSelector(targetElement),
      strategy: 'parent-child',
      relationshipPath: ['parent', stableParent.selector, 'child'],
      confidence: 0.8,
      alternatives: []
    };
  }
  
  private findViaSibling(graph: ElementGraph): GraphFindResult {
    const stableSibling = graph.siblings.find(s => s.isStable);
    if (!stableSibling) return this.emptyResult('sibling-relative');
    
    const siblingElement = this.findNode(stableSibling);
    if (!siblingElement) return this.emptyResult('sibling-relative');
    
    const parent = siblingElement.parentElement;
    if (!parent) return this.emptyResult('sibling-relative');
    
    const targetElement = this.findMatchingChild(parent, graph.target, siblingElement);
    if (!targetElement) return this.emptyResult('sibling-relative');
    
    return {
      found: true,
      element: targetElement,
      selector: this.generateSelector(targetElement),
      strategy: 'sibling-relative',
      relationshipPath: ['sibling', stableSibling.selector, 'relative'],
      confidence: 0.7,
      alternatives: []
    };
  }
  
  private findViaLandmark(graph: ElementGraph): GraphFindResult {
    const landmarks = graph.landmarks.filter(l => this.findNode(l) !== null);
    if (landmarks.length === 0) return this.emptyResult('landmark-path');
    
    for (const landmark of landmarks) {
      const landmarkElement = this.findNode(landmark);
      if (!landmarkElement) continue;
      
      const targetElement = this.findTargetWithinParent(landmarkElement, graph.target);
      if (targetElement) {
        return {
          found: true,
          element: targetElement,
          selector: this.generateSelector(targetElement),
          strategy: 'landmark-path',
          relationshipPath: ['landmark', landmark.selector, 'descendant'],
          confidence: 0.65,
          alternatives: []
        };
      }
    }
    
    return this.emptyResult('landmark-path');
  }
  
  private findViaNearby(graph: ElementGraph): GraphFindResult {
    const sortedNearby = [...graph.nearby].sort((a, b) => {
      if (a.isStable && !b.isStable) return -1;
      if (!a.isStable && b.isStable) return 1;
      return (a.distanceFromTarget || 0) - (b.distanceFromTarget || 0);
    });
    
    for (const nearby of sortedNearby) {
      const nearbyElement = this.findNode(nearby);
      if (!nearbyElement) continue;
      
      const targetBounds = graph.target.bounds;
      const nearbyBounds = nearby.bounds;
      
      const expectedX = targetBounds.x - nearbyBounds.x;
      const expectedY = targetBounds.y - nearbyBounds.y;
      
      const nearbyRect = nearbyElement.getBoundingClientRect();
      const expectedAbsX = nearbyRect.left + window.scrollX + expectedX;
      const expectedAbsY = nearbyRect.top + window.scrollY + expectedY;
      
      const targetElement = this.findElementNearPosition(
        expectedAbsX + targetBounds.width / 2,
        expectedAbsY + targetBounds.height / 2,
        graph.target.tagName
      );
      
      if (targetElement) {
        return {
          found: true,
          element: targetElement,
          selector: this.generateSelector(targetElement),
          strategy: 'nearby-text',
          relationshipPath: ['nearby', nearby.selector, 'offset'],
          confidence: 0.6,
          alternatives: []
        };
      }
    }
    
    return this.emptyResult('nearby-text');
  }
  
  // Helper methods
  
  private findNode(node: ElementNode): HTMLElement | null {
    try {
      const element = document.querySelector(node.selector) as HTMLElement;
      if (element && this.matchesNode(element, node)) return element;
    } catch {}
    
    if (node.attributes.id) {
      const element = document.getElementById(node.attributes.id);
      if (element && this.matchesNode(element, node)) return element;
    }
    
    if (node.attributes.dataTestId) {
      const element = document.querySelector(
        `[data-testid="${node.attributes.dataTestId}"]`
      ) as HTMLElement;
      if (element && this.matchesNode(element, node)) return element;
    }
    
    return null;
  }
  
  private matchesNode(element: HTMLElement, node: ElementNode): boolean {
    if (element.tagName.toLowerCase() !== node.tagName) return false;
    
    if (node.text) {
      const elementText = element.innerText?.trim() || '';
      if (this.textSimilarity(elementText, node.text) < 0.5) return false;
    }
    
    return true;
  }
  
  private findTargetWithinParent(parent: HTMLElement, targetNode: ElementNode): HTMLElement | null {
    const children = parent.getElementsByTagName(targetNode.tagName);
    
    let bestMatch: HTMLElement | null = null;
    let bestScore = 0;
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const score = this.scoreMatch(child, targetNode);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = child;
      }
    }
    
    return bestScore > 0.5 ? bestMatch : null;
  }
  
  private findMatchingChild(
    parent: HTMLElement,
    targetNode: ElementNode,
    exclude: HTMLElement
  ): HTMLElement | null {
    const children = parent.getElementsByTagName(targetNode.tagName);
    
    let bestMatch: HTMLElement | null = null;
    let bestScore = 0;
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (child === exclude) continue;
      
      const score = this.scoreMatch(child, targetNode);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = child;
      }
    }
    
    return bestScore > 0.4 ? bestMatch : null;
  }
  
  private findElementNearPosition(x: number, y: number, tagName: string): HTMLElement | null {
    const elements = document.getElementsByTagName(tagName);
    
    let closest: HTMLElement | null = null;
    let minDistance = Infinity;
    
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + window.scrollX + rect.width / 2;
      const centerY = rect.top + window.scrollY + rect.height / 2;
      
      const distance = Math.sqrt(Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2));
      
      if (distance < minDistance && distance < 100) {
        minDistance = distance;
        closest = el;
      }
    }
    
    return closest;
  }
  
  private scoreMatch(element: HTMLElement, node: ElementNode): number {
    let score = 0;
    
    const elementText = element.innerText?.trim() || '';
    if (node.text) {
      score += this.textSimilarity(elementText, node.text) * 0.4;
    }
    
    if (node.attributes.ariaLabel) {
      const ariaLabel = element.getAttribute('aria-label') || '';
      if (ariaLabel === node.attributes.ariaLabel) score += 0.3;
    }
    
    if (node.attributes.role) {
      const role = element.getAttribute('role') || '';
      if (role === node.attributes.role) score += 0.2;
    }
    
    const bounds = this.getBounds(element);
    const positionSimilarity = this.boundsSimilarity(bounds, node.bounds);
    score += positionSimilarity * 0.1;
    
    return score;
  }
  
  private textSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const s1 = a.toLowerCase();
    const s2 = b.toLowerCase();
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    return 0.3;
  }
  
  private boundsSimilarity(a: BoundingBox, b: BoundingBox): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, 1 - distance / 200);
  }
  
  private getBounds(element: HTMLElement): BoundingBox {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  }
  
  private generateSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.dataset.testid) return `[data-testid="${element.dataset.testid}"]`;
    
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
      current = current.parentElement;
    }
    
    return '/' + parts.join('/');
  }
  
  private emptyResult(strategy: GraphFindStrategy): GraphFindResult {
    return {
      found: false,
      strategy,
      relationshipPath: [],
      confidence: 0,
      alternatives: []
    };
  }
}

export function createGraphBasedFinder(): GraphBasedFinder {
  return new GraphBasedFinder();
}
