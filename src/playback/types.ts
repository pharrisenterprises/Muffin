/**
 * PLAYBACK ENGINE TYPES
 */

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBACK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export interface PlaybackConfig {
  // Timeouts
  elementTimeout: number;       // How long to wait for element (ms)
  stepDelay: number;            // Delay between steps (ms)
  retryInterval: number;        // Retry interval when element not found
  
  // Behavior
  validateContext: boolean;     // Enable context validation
  useHumanLikeInput: boolean;   // Type character by character
  stopOnError: boolean;         // Stop playback on first error
  
  // Debug
  debugMode: boolean;
  highlightElements: boolean;   // Flash elements before action
}

export const DEFAULT_PLAYBACK_CONFIG: PlaybackConfig = {
  elementTimeout: 3000,
  stepDelay: 100,
  retryInterval: 150,
  validateContext: true,
  useHumanLikeInput: true,
  stopOnError: false,
  debugMode: true,
  highlightElements: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBACK RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ElementFindResult {
  element: HTMLElement | null;
  strategy: string;
  confidence: number;
  contextValid: boolean;
  attempts: string[];
}

export interface StepResult {
  stepNumber: number;
  success: boolean;
  error?: string;
  duration: number;
  strategy?: string;
  element?: HTMLElement;
}

export interface PlaybackResult {
  success: boolean;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  duration: number;
  stepResults: StepResult[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ContextValidation {
  expectedContext: 'terminal' | 'editor' | 'copilot' | 'generic';
  actualContext: 'terminal' | 'editor' | 'copilot' | 'generic';
  isValid: boolean;
  reason?: string;
}
