// ═══════════════════════════════════════════════════════════════════════════
// LABEL CONFIDENCE SCORER - Independently Wrapped Module
// ═══════════════════════════════════════════════════════════════════════════
// Scores label quality for reliable playback
// No external dependencies - uses local analysis

import {
  LabelConfidenceResult,
  ConfidenceFactor,
  ConfidenceFactorType,
  ConfidenceTier
} from './types';
import { CONFIDENCE_THRESHOLDS, CONFIDENCE_WEIGHTS } from './config';

/**
 * LabelConfidenceScorer - Scores label quality for playback reliability
 */
export class LabelConfidenceScorer {
  private weights: Record<ConfidenceFactorType, number>;
  private thresholds: typeof CONFIDENCE_THRESHOLDS;
  
  constructor() {
    this.weights = { ...CONFIDENCE_WEIGHTS };
    this.thresholds = { ...CONFIDENCE_THRESHOLDS };
  }
  
  /**
   * Score label confidence
   */
  scoreLabel(label: string, element: HTMLElement): LabelConfidenceResult {
    const factors: ConfidenceFactor[] = [
      this.scoreTextClarity(label),
      this.scoreUniqueness(label, element),
      this.scoreAriaMatch(label, element),
      this.scorePlaceholderMatch(label, element),
      this.scoreVisualMatch(label, element),
      this.scoreSemanticMeaning(label),
      this.scoreLengthAppropriate(label)
    ];
    
    const overallScore = this.calculateOverallScore(factors);
    const tier = this.determineTier(overallScore);
    const suggestedLabel = (tier === 'low' || tier === 'critical')
      ? this.generateSuggestedLabel(element)
      : undefined;
    
    return { originalLabel: label, overallScore, factors, tier, suggestedLabel };
  }
  
  needsImprovement(label: string, element: HTMLElement): boolean {
    const result = this.scoreLabel(label, element);
    return result.tier === 'low' || result.tier === 'critical';
  }
  
  getBestLabel(element: HTMLElement): string {
    return this.generateSuggestedLabel(element);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // FACTOR SCORING
  // ─────────────────────────────────────────────────────────────────────────
  
  private scoreTextClarity(label: string): ConfidenceFactor {
    const genericLabels = [
      'button', 'input', 'link', 'text', 'field', 'click',
      'submit', 'enter', 'type', 'box', 'area', 'element'
    ];
    
    const lowerLabel = label.toLowerCase().trim();
    const isGeneric = genericLabels.some(g => lowerLabel === g);
    const isVague = lowerLabel.length < 3;
    const words = lowerLabel.split(/\s+/);
    const hasMeaningfulWords = words.some(w => w.length > 3 && !genericLabels.includes(w));
    
    let score = 1.0;
    let explanation = 'Label is clear and specific';
    
    if (isGeneric) {
      score = 0.2;
      explanation = 'Label is too generic';
    } else if (isVague) {
      score = 0.3;
      explanation = 'Label is too short or vague';
    } else if (!hasMeaningfulWords) {
      score = 0.5;
      explanation = 'Label lacks meaningful context';
    }
    
    return { name: 'text-clarity', score, weight: this.weights['text-clarity'], explanation };
  }
  
  private scoreUniqueness(label: string, element: HTMLElement): ConfidenceFactor {
    const lowerLabel = label.toLowerCase();
    const allElements = document.querySelectorAll('*');
    let matches = 0;
    
    allElements.forEach(el => {
      if (el === element) return;
      const elLabel = this.getElementLabel(el as HTMLElement);
      if (elLabel.toLowerCase().includes(lowerLabel) || lowerLabel.includes(elLabel.toLowerCase())) {
        matches++;
      }
    });
    
    let score = 1.0;
    let explanation = 'Label is unique on page';
    
    if (matches > 5) {
      score = 0.2;
      explanation = `Found ${matches}+ similar labels on page`;
    } else if (matches > 2) {
      score = 0.5;
      explanation = `Found ${matches} similar labels on page`;
    } else if (matches > 0) {
      score = 0.7;
      explanation = `Found ${matches} similar label on page`;
    }
    
    return { name: 'uniqueness', score, weight: this.weights['uniqueness'], explanation };
  }
  
  private scoreAriaMatch(label: string, element: HTMLElement): ConfidenceFactor {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    let ariaText = '';
    
    if (ariaLabel) {
      ariaText = ariaLabel;
    } else if (ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl) ariaText = labelEl.textContent || '';
    }
    
    if (!ariaText) {
      return {
        name: 'aria-match',
        score: 0.5,
        weight: this.weights['aria-match'],
        explanation: 'No ARIA attributes to compare'
      };
    }
    
    const similarity = this.calculateSimilarity(label, ariaText);
    return {
      name: 'aria-match',
      score: similarity,
      weight: this.weights['aria-match'],
      explanation: similarity > 0.7 ? 'Label matches ARIA attributes' : 'Label differs from ARIA attributes'
    };
  }
  
  private scorePlaceholderMatch(label: string, element: HTMLElement): ConfidenceFactor {
    const placeholder = element.getAttribute('placeholder');
    if (!placeholder) {
      return {
        name: 'placeholder-match',
        score: 0.5,
        weight: this.weights['placeholder-match'],
        explanation: 'No placeholder to compare'
      };
    }
    
    const similarity = this.calculateSimilarity(label, placeholder);
    return {
      name: 'placeholder-match',
      score: similarity,
      weight: this.weights['placeholder-match'],
      explanation: similarity > 0.7 ? 'Label matches placeholder' : 'Label differs from placeholder'
    };
  }
  
  private scoreVisualMatch(label: string, element: HTMLElement): ConfidenceFactor {
    const visibleText = element.innerText || element.textContent || '';
    if (!visibleText.trim()) {
      return {
        name: 'visual-match',
        score: 0.5,
        weight: this.weights['visual-match'],
        explanation: 'No visible text to compare'
      };
    }
    
    const similarity = this.calculateSimilarity(label, visibleText);
    return {
      name: 'visual-match',
      score: similarity,
      weight: this.weights['visual-match'],
      explanation: similarity > 0.7 ? 'Label matches visible text' : 'Label differs from visible text'
    };
  }
  
  private scoreSemanticMeaning(label: string): ConfidenceFactor {
    const actionWords = [
      'submit', 'save', 'cancel', 'delete', 'edit', 'add',
      'create', 'update', 'search', 'login', 'logout', 'sign'
    ];
    
    const fieldWords = [
      'name', 'email', 'password', 'phone', 'address',
      'username', 'message', 'comment', 'description'
    ];
    
    const lowerLabel = label.toLowerCase();
    const hasActionWord = actionWords.some(w => lowerLabel.includes(w));
    const hasFieldWord = fieldWords.some(w => lowerLabel.includes(w));
    
    if (hasActionWord || hasFieldWord) {
      return {
        name: 'semantic-meaning',
        score: 0.9,
        weight: this.weights['semantic-meaning'],
        explanation: 'Label has clear semantic meaning'
      };
    }
    
    const hasCamelCase = /[a-z][A-Z]/.test(label);
    const hasSnakeCase = /_[a-z]/.test(label);
    
    if (hasCamelCase || hasSnakeCase) {
      return {
        name: 'semantic-meaning',
        score: 0.7,
        weight: this.weights['semantic-meaning'],
        explanation: 'Label follows naming convention'
      };
    }
    
    return {
      name: 'semantic-meaning',
      score: 0.4,
      weight: this.weights['semantic-meaning'],
      explanation: 'Label lacks clear semantic meaning'
    };
  }
  
  private scoreLengthAppropriate(label: string): ConfidenceFactor {
    const length = label.trim().length;
    
    if (length < 2) {
      return {
        name: 'length-appropriate',
        score: 0.1,
        weight: this.weights['length-appropriate'],
        explanation: 'Label is too short'
      };
    }
    
    if (length > 100) {
      return {
        name: 'length-appropriate',
        score: 0.3,
        weight: this.weights['length-appropriate'],
        explanation: 'Label is too long'
      };
    }
    
    if (length >= 3 && length <= 50) {
      return {
        name: 'length-appropriate',
        score: 1.0,
        weight: this.weights['length-appropriate'],
        explanation: 'Label length is appropriate'
      };
    }
    
    return {
      name: 'length-appropriate',
      score: 0.7,
      weight: this.weights['length-appropriate'],
      explanation: 'Label length is acceptable'
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  
  private calculateOverallScore(factors: ConfidenceFactor[]): number {
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const factor of factors) {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
  
  private determineTier(score: number): ConfidenceTier {
    if (score >= this.thresholds.HIGH) return 'high';
    if (score >= this.thresholds.MEDIUM) return 'medium';
    if (score >= this.thresholds.LOW) return 'low';
    return 'critical';
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0;
    
    const bigrams1 = this.getBigrams(s1);
    const bigrams2 = this.getBigrams(s2);
    
    let matches = 0;
    for (const bigram of bigrams1) {
      if (bigrams2.has(bigram)) matches++;
    }
    
    return (2 * matches) / (bigrams1.size + bigrams2.size);
  }
  
  private getBigrams(str: string): Set<string> {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  }
  
  private getElementLabel(element: HTMLElement): string {
    return element.getAttribute('aria-label') ||
           element.getAttribute('placeholder') ||
           element.getAttribute('title') ||
           element.innerText?.trim() ||
           '';
  }
  
  private generateSuggestedLabel(element: HTMLElement): string {
    const sources = [
      element.getAttribute('aria-label'),
      this.findAssociatedLabel(element),
      element.getAttribute('placeholder'),
      element.getAttribute('title'),
      (element.innerText || '').trim().substring(0, 50),
      element.getAttribute('name'),
      element.id
    ];
    
    for (const source of sources) {
      if (source && source.trim().length > 2) {
        return this.cleanLabel(source);
      }
    }
    
    const tag = element.tagName.toLowerCase();
    const type = (element as HTMLInputElement).type || '';
    return type ? `${type} ${tag}` : tag;
  }
  
  private findAssociatedLabel(element: HTMLElement): string | null {
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent?.trim() || null;
    }
    
    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel.textContent?.trim() || null;
    
    return null;
  }
  
  private cleanLabel(label: string): string {
    return label.trim().replace(/\s+/g, ' ').replace(/[*:]/g, '').substring(0, 80);
  }
}

export function createLabelConfidenceScorer(): LabelConfidenceScorer {
  return new LabelConfidenceScorer();
}
