// ═══════════════════════════════════════════════════════════════════════════
// VISUAL CONTEXT VALIDATOR - Independently Wrapped Module
// ═══════════════════════════════════════════════════════════════════════════
// Validates element context to prevent terminal vs Copilot confusion
// Uses local pattern matching - no server API required

import {
  VisualContextResult,
  ContextType,
  DetectedPattern,
  VisualCharacteristics,
  ContextWarning,
  ScreenshotCapture
} from './types';
import {
  TERMINAL_PATTERNS,
  COPILOT_PATTERNS,
  INPUT_PATTERNS
} from './config';

/**
 * VisualContextValidator - Analyzes visual context of elements
 * 
 * PREVENTS TERMINAL VS COPILOT CONFUSION:
 * - Detects terminal prompt patterns ($, >, #)
 * - Identifies Copilot suggestion boxes
 * - Distinguishes standard input fields
 * - Warns on ambiguous contexts
 */
export class VisualContextValidator {
  /**
   * Validate visual context of an element
   */
  validateContext(
    element: HTMLElement,
    _screenshot?: ScreenshotCapture
  ): VisualContextResult {
    const visualCharacteristics = this.analyzeVisualCharacteristics(element);
    const detectedPatterns = this.detectPatterns(element);
    const { contextType, confidence } = this.determineContextType(
      element,
      visualCharacteristics,
      detectedPatterns
    );
    const contextWarning = this.checkForWarnings(
      contextType,
      confidence,
      visualCharacteristics
    );
    
    return {
      contextType,
      confidence,
      detectedPatterns,
      visualCharacteristics,
      contextWarning
    };
  }
  
  /**
   * Quick check if element might be misidentified
   */
  isContextAmbiguous(element: HTMLElement): boolean {
    const result = this.validateContext(element);
    return result.confidence < 0.7 || result.contextWarning !== undefined;
  }
  
  /**
   * Get context type without full analysis
   */
  quickContextType(element: HTMLElement): ContextType {
    if (this.isTerminalElement(element)) return 'terminal';
    if (this.isCopilotElement(element)) return 'copilot-prompt';
    if (this.isStandardInput(element)) return 'input-field';
    if (this.isButton(element)) return 'button';
    if (this.isLink(element)) return 'link';
    if (this.isDropdown(element)) return 'dropdown';
    return 'unknown';
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // VISUAL CHARACTERISTICS ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  
  private analyzeVisualCharacteristics(element: HTMLElement): VisualCharacteristics {
    const style = window.getComputedStyle(element);
    const backgroundColor = this.rgbToHex(style.backgroundColor);
    const textColor = this.rgbToHex(style.color);
    const fontFamily = style.fontFamily;
    
    return {
      backgroundColor,
      textColor,
      fontFamily,
      isMonospace: this.isMonospaceFont(fontFamily),
      hasDarkTheme: this.isDarkBackground(backgroundColor),
      hasPromptIndicators: this.hasPromptPatterns(element),
      borderStyle: style.borderStyle,
      isInCodeBlock: this.isInsideCodeBlock(element)
    };
  }
  
  private isMonospaceFont(fontFamily: string): boolean {
    const lower = fontFamily.toLowerCase();
    return TERMINAL_PATTERNS.terminalFonts.some(
      font => lower.includes(font.toLowerCase())
    );
  }
  
  private isDarkBackground(hexColor: string): boolean {
    return TERMINAL_PATTERNS.darkBackgrounds.some(
      dark => this.colorsAreSimilar(hexColor, dark)
    );
  }
  
  private hasPromptPatterns(element: HTMLElement): boolean {
    const text = element.textContent || '';
    return TERMINAL_PATTERNS.textPatterns.some(pattern => pattern.test(text));
  }
  
  private isInsideCodeBlock(element: HTMLElement): boolean {
    let current: HTMLElement | null = element;
    while (current) {
      const tag = current.tagName.toLowerCase();
      if (tag === 'pre' || tag === 'code') return true;
      if (current.classList.contains('code') || current.classList.contains('terminal')) return true;
      current = current.parentElement;
    }
    return false;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PATTERN DETECTION
  // ─────────────────────────────────────────────────────────────────────────
  
  private detectPatterns(element: HTMLElement): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    patterns.push(...this.detectTextPatterns(element, 'inside'));
    if (element.parentElement) {
      patterns.push(...this.detectTextPatterns(element.parentElement, 'above'));
    }
    patterns.push(...this.detectVisualPatterns(element));
    return patterns;
  }
  
  private detectTextPatterns(
    element: HTMLElement,
    position: 'inside' | 'above' | 'below' | 'left' | 'right'
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const text = element.textContent || '';
    
    for (const pattern of TERMINAL_PATTERNS.textPatterns) {
      if (pattern.test(text)) {
        patterns.push({
          type: 'text',
          value: `Terminal prompt: ${pattern.toString()}`,
          confidence: 0.9,
          position
        });
      }
    }
    
    for (const pattern of COPILOT_PATTERNS.textPatterns) {
      if (pattern.test(text)) {
        patterns.push({
          type: 'text',
          value: `Copilot indicator: ${pattern.toString()}`,
          confidence: 0.85,
          position
        });
      }
    }
    
    return patterns;
  }
  
  private detectVisualPatterns(element: HTMLElement): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const style = window.getComputedStyle(element);
    
    if (style.borderWidth && parseFloat(style.borderWidth) > 0) {
      patterns.push({
        type: 'border',
        value: `${style.borderStyle} ${style.borderColor}`,
        confidence: 0.5,
        position: 'inside'
      });
    }
    
    if (this.isDarkBackground(this.rgbToHex(style.backgroundColor))) {
      patterns.push({
        type: 'background',
        value: 'dark',
        confidence: 0.7,
        position: 'inside'
      });
    }
    
    return patterns;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT TYPE DETERMINATION
  // ─────────────────────────────────────────────────────────────────────────
  
  private determineContextType(
    element: HTMLElement,
    visual: VisualCharacteristics,
    patterns: DetectedPattern[]
  ): { contextType: ContextType; confidence: number } {
    const scores: Record<ContextType, number> = {
      'terminal': 0, 'copilot-prompt': 0, 'input-field': 0,
      'button': 0, 'link': 0, 'dropdown': 0, 'modal': 0, 'editor': 0, 'unknown': 0
    };
    
    if (visual.isMonospace) scores['terminal'] += 0.3;
    if (visual.hasDarkTheme) scores['terminal'] += 0.2;
    if (visual.hasPromptIndicators) scores['terminal'] += 0.4;
    if (visual.isInCodeBlock) scores['terminal'] += 0.2;
    
    for (const pattern of patterns) {
      if (pattern.value.includes('Terminal')) scores['terminal'] += pattern.confidence * 0.3;
      if (pattern.value.includes('Copilot')) scores['copilot-prompt'] += pattern.confidence * 0.4;
    }
    
    if (this.isTerminalElement(element)) scores['terminal'] += 0.5;
    if (this.isCopilotElement(element)) scores['copilot-prompt'] += 0.5;
    if (this.isStandardInput(element)) scores['input-field'] += 0.6;
    if (this.isButton(element)) scores['button'] += 0.7;
    if (this.isLink(element)) scores['link'] += 0.7;
    if (this.isDropdown(element)) scores['dropdown'] += 0.7;
    
    let maxScore = 0;
    let contextType: ContextType = 'unknown';
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        contextType = type as ContextType;
      }
    }
    
    return { contextType, confidence: Math.min(1, maxScore) };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // ELEMENT TYPE CHECKS
  // ─────────────────────────────────────────────────────────────────────────
  
  private isTerminalElement(element: HTMLElement): boolean {
    const classes = element.className.toLowerCase();
    if (classes.includes('terminal') || classes.includes('console')) return true;
    if (element.dataset.terminal || element.dataset.console) return true;
    const parent = element.closest('[class*="terminal"], [class*="console"]');
    return !!parent;
  }
  
  private isCopilotElement(element: HTMLElement): boolean {
    const classes = element.className.toLowerCase();
    for (const pattern of COPILOT_PATTERNS.classPatterns) {
      if (pattern.test(classes)) return true;
    }
    const ariaLabel = element.getAttribute('aria-label') || '';
    for (const pattern of COPILOT_PATTERNS.ariaPatterns) {
      if (pattern.test(ariaLabel)) return true;
    }
    return false;
  }
  
  private isStandardInput(element: HTMLElement): boolean {
    const tag = element.tagName.toLowerCase();
    if (tag === 'input') {
      const type = (element as HTMLInputElement).type;
      return INPUT_PATTERNS.inputTypes.includes(type);
    }
    if (tag === 'textarea') return true;
    if (element.isContentEditable) return true;
    const role = element.getAttribute('role');
    return !!(role && INPUT_PATTERNS.ariaRoles.includes(role));
  }
  
  private isButton(element: HTMLElement): boolean {
    const tag = element.tagName.toLowerCase();
    if (tag === 'button') return true;
    const type = (element as HTMLInputElement).type;
    if (type === 'submit' || type === 'button') return true;
    return element.getAttribute('role') === 'button';
  }
  
  private isLink(element: HTMLElement): boolean {
    const tag = element.tagName.toLowerCase();
    if (tag === 'a' && (element as HTMLAnchorElement).href) return true;
    return element.getAttribute('role') === 'link';
  }
  
  private isDropdown(element: HTMLElement): boolean {
    const tag = element.tagName.toLowerCase();
    if (tag === 'select') return true;
    const role = element.getAttribute('role');
    return role === 'listbox' || role === 'combobox';
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // WARNINGS
  // ─────────────────────────────────────────────────────────────────────────
  
  private checkForWarnings(
    contextType: ContextType,
    confidence: number,
    visual: VisualCharacteristics
  ): ContextWarning | undefined {
    if (contextType === 'terminal' && confidence < 0.8 && !visual.hasPromptIndicators) {
      return {
        type: 'terminal-vs-input',
        message: 'Element may be an input field mistaken for terminal',
        suggestedAction: 'Verify element has terminal prompt ($, >, #)'
      };
    }
    
    if (contextType === 'copilot-prompt' && confidence < 0.8) {
      return {
        type: 'copilot-vs-editor',
        message: 'Element may be a code editor mistaken for Copilot prompt',
        suggestedAction: 'Verify element is a Copilot suggestion box'
      };
    }
    
    if (confidence < 0.6) {
      return {
        type: 'similar-elements',
        message: `Context detection confidence is low (${(confidence * 100).toFixed(0)}%)`,
        suggestedAction: 'Manually verify element type before playback'
      };
    }
    
    return undefined;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  private rgbToHex(rgb: string): string {
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return '#000000';
    const [r, g, b] = match.map(n => parseInt(n));
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  
  private colorsAreSimilar(hex1: string, hex2: string): boolean {
    const parse = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    
    const c1 = parse(hex1);
    const c2 = parse(hex2);
    
    const distance = Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
    
    return distance < 50;
  }
}

export function createVisualContextValidator(): VisualContextValidator {
  return new VisualContextValidator();
}
