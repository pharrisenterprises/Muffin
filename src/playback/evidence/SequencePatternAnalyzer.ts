// =============================================================================
// BATCH 10: Sequence Pattern Analyzer
// Purpose: Learn and recognize step patterns (First Name → Last Name → Email)
// =============================================================================

import type { SequencePattern, StepWithEvidence, EvidenceConfig } from './types';

interface StepForPattern {
  label: string;
  stepNumber: number;
  pageUrl: string;
}

/**
 * Learns patterns in step sequences to predict next element.
 * 
 * Example patterns learned:
 * - "First Name" → "Last Name" → "Email" (registration forms)
 * - "Username" → "Password" → "Submit" (login forms)
 * - "Search" → "First Result" → "Add to Cart" (e-commerce)
 */
export class SequencePatternAnalyzer {
  private patterns: Map<string, SequencePattern> = new Map();
  private currentSequence: StepForPattern[] = [];
  
  constructor(_config: Partial<EvidenceConfig> = {}) {
    // Config reserved for future use
  }
  
  // ===========================================================================
  // PATTERN LEARNING (During Recording)
  // ===========================================================================
  
  /**
   * Add a step to current sequence for pattern learning
   */
  addStep(step: StepWithEvidence): void {
    this.currentSequence.push({
      label: step.label,
      stepNumber: step.stepNumber,
      pageUrl: step.url
    });
    
    // Learn patterns from sliding windows
    this.learnFromWindow();
  }
  
  /**
   * Load existing steps for analysis
   */
  loadSteps(steps: StepWithEvidence[]): void {
    this.currentSequence = steps.map(s => ({
      label: s.label,
      stepNumber: s.stepNumber,
      pageUrl: s.url
    }));
    
    // Re-learn patterns
    for (let i = 0; i < this.currentSequence.length; i++) {
      this.learnFromWindowAt(i);
    }
  }
  
  /**
   * Learn patterns from current position
   */
  private learnFromWindow(): void {
    this.learnFromWindowAt(this.currentSequence.length - 1);
  }
  
  /**
   * Learn patterns ending at specific index
   */
  private learnFromWindowAt(endIndex: number): void {
    // Learn 2-step, 3-step, and 4-step patterns
    for (const windowSize of [2, 3, 4]) {
      if (endIndex >= windowSize - 1) {
        const startIndex = endIndex - windowSize + 1;
        const window = this.currentSequence.slice(startIndex, endIndex + 1);
        this.recordPattern(window);
      }
    }
  }
  
  /**
   * Record a pattern occurrence
   */
  private recordPattern(steps: StepForPattern[]): void {
    const labels = steps.map(s => s.label);
    const patternId = this.generatePatternId(labels);
    const pagePattern = this.generatePagePattern(steps[0].pageUrl);
    
    const existing = this.patterns.get(patternId);
    
    if (existing) {
      // Increment occurrence
      existing.occurrences++;
      existing.confidence = Math.min(1, existing.occurrences / 10); // Max at 10 occurrences
      existing.lastSeen = Date.now();
    } else {
      // New pattern
      this.patterns.set(patternId, {
        patternId,
        pageUrlPattern: pagePattern,
        labelSequence: labels,
        confidence: 0.1,
        occurrences: 1,
        lastSeen: Date.now()
      });
    }
  }
  
  // ===========================================================================
  // PATTERN MATCHING (During Playback)
  // ===========================================================================
  
  /**
   * Analyze how well an element fits the expected sequence pattern
   * 
   * @param element - Candidate element
   * @param targetStep - The step we're trying to find
   * @param previousSteps - Steps already executed
   * @returns Score 0-1 indicating pattern match
   */
  analyze(
    element: HTMLElement,
    targetStep: StepWithEvidence,
    previousSteps: StepWithEvidence[]
  ): { score: number; matchedPattern?: SequencePattern; reasoning: string } {
    // Get element's potential label
    const elementLabel = this.extractLabel(element);
    
    // If element label matches target label exactly, good sign
    const labelMatch = this.fuzzyMatch(elementLabel, targetStep.label);
    
    // Check if this fits a known pattern
    const previousLabels = previousSteps.slice(-3).map(s => s.label);
    const sequenceToCheck = [...previousLabels, targetStep.label];
    
    const matchedPattern = this.findMatchingPattern(sequenceToCheck, targetStep.url);
    
    if (matchedPattern) {
      // Check if element label fits pattern expectation
      const expectedLabel = matchedPattern.labelSequence[previousLabels.length];
      const patternFit = this.fuzzyMatch(elementLabel, expectedLabel);
      
      // Combine pattern confidence with fit
      const score = matchedPattern.confidence * 0.4 + patternFit * 0.4 + labelMatch * 0.2;
      
      return {
        score,
        matchedPattern,
        reasoning: `Matches pattern: ${matchedPattern.labelSequence.join(' → ')}`
      };
    }
    
    // No pattern match - use label similarity only
    return {
      score: labelMatch * 0.5, // Half weight without pattern support
      reasoning: elementLabel 
        ? `Label similarity: ${(labelMatch * 100).toFixed(0)}%`
        : 'No label found on element'
    };
  }
  
  /**
   * Get predicted next label based on current sequence
   */
  predictNextLabel(previousLabels: string[], _pageUrl: string): string | null {
    for (const pattern of this.patterns.values()) {
      // Check if previous labels match start of pattern
      const patternStart = pattern.labelSequence.slice(0, previousLabels.length);
      
      if (this.sequencesMatch(previousLabels, patternStart)) {
        // Return next label in pattern
        if (pattern.labelSequence.length > previousLabels.length) {
          return pattern.labelSequence[previousLabels.length];
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get all patterns for debugging
   */
  getPatterns(): SequencePattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.occurrences - a.occurrences);
  }
  
  /**
   * Load patterns from export
   */
  loadPatterns(patterns: SequencePattern[]): void {
    this.patterns.clear();
    for (const pattern of patterns) {
      this.patterns.set(pattern.patternId, pattern);
    }
  }
  
  /**
   * Export patterns for persistence
   */
  exportPatterns(): SequencePattern[] {
    return this.getPatterns();
  }
  
  /**
   * Reset analyzer
   */
  reset(): void {
    this.currentSequence = [];
    // Keep patterns - they're learned knowledge
  }
  
  /**
   * Clear all patterns
   */
  clearPatterns(): void {
    this.patterns.clear();
    this.currentSequence = [];
  }
  
  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================
  
  private generatePatternId(labels: string[]): string {
    return labels.map(l => l.toLowerCase().replace(/\s+/g, '_')).join('→');
  }
  
  private generatePagePattern(url: string): string {
    try {
      const parsed = new URL(url);
      // Convert path to pattern: /user/123/edit → /user/*/edit
      const pathPattern = parsed.pathname.replace(/\/\d+/g, '/*');
      return parsed.hostname + pathPattern;
    } catch {
      return '*';
    }
  }
  
  private findMatchingPattern(
    labels: string[],
    _pageUrl: string
  ): SequencePattern | undefined {
    let bestMatch: SequencePattern | undefined;
    let bestScore = 0;
    
    for (const pattern of this.patterns.values()) {
      // Check sequence match
      const patternPrefix = pattern.labelSequence.slice(0, labels.length);
      if (this.sequencesMatch(labels, patternPrefix)) {
        const score = pattern.confidence * pattern.occurrences;
        if (score > bestScore) {
          bestMatch = pattern;
          bestScore = score;
        }
      }
    }
    
    return bestMatch;
  }
  
  private sequencesMatch(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (this.fuzzyMatch(a[i], b[i]) < 0.8) {
        return false;
      }
    }
    
    return true;
  }
  
  private extractLabel(element: HTMLElement): string {
    // Try various label sources
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl?.textContent) return labelEl.textContent.trim();
    }
    
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) return placeholder;
    
    const name = element.getAttribute('name');
    if (name) return name.replace(/[_-]/g, ' ');
    
    // Check for associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label?.textContent) return label.textContent.trim();
    }
    
    // Direct text content (for buttons, etc.)
    const text = element.textContent?.trim();
    if (text && text.length < 50) return text;
    
    return '';
  }
  
  private fuzzyMatch(a: string, b: string): number {
    if (!a || !b) return 0;
    
    const aLower = a.toLowerCase().trim();
    const bLower = b.toLowerCase().trim();
    
    if (aLower === bLower) return 1;
    if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;
    
    // Dice coefficient with bigrams
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
}

// Factory function
export function createSequencePatternAnalyzer(
  config?: Partial<EvidenceConfig>
): SequencePatternAnalyzer {
  return new SequencePatternAnalyzer(config);
}
