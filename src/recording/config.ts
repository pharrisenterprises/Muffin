/**
 * RECORDING ENGINE CONFIGURATION
 * All constants and defaults in one place
 */

import { RecordingConfig } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_CONFIG: RecordingConfig = {
  filterScrollbars: true,
  filterSyntheticEvents: true,
  filterHiddenElements: true,
  captureClicks: true,
  captureInputs: true,
  captureKeyboard: true,
  debounceMs: 50,
  maxLabelLength: 100,
  debugMode: true,
  logEvents: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKED ELEMENTS - Never record these
// ═══════════════════════════════════════════════════════════════════════════

export const BLOCKED_ELEMENTS: string[] = [
  // Scrollbars
  '[class*="scrollbar"]',
  '[class*="Scrollbar"]',
  '[data-vscode-scrollbar]',
  '.slider.active',
  
  // VS Code specific
  '.sash',
  '.monaco-sash',
  '[class*="resize"]',
  
  // Decorative
  '[aria-hidden="true"]:not([role="button"]):not(button)',
  
  // Extension UI
  '.testflow-overlay',
  '.recorder-highlight',
  
  // Scrollbar sliders
  '.slider',
];

// ═══════════════════════════════════════════════════════════════════════════
// SVG TAGS - Need parent resolution
// ═══════════════════════════════════════════════════════════════════════════

export const SVG_TAGS: string[] = [
  'svg', 'path', 'g', 'use', 'polygon', 'line', 
  'circle', 'rect', 'polyline', 'ellipse', 'text', 'tspan'
];

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTIVE ELEMENTS
// ═══════════════════════════════════════════════════════════════════════════

export const INTERACTIVE_TAGS: string[] = [
  'button', 'a', 'input', 'select', 'textarea', 'summary'
];

export const INTERACTIVE_ROLES: string[] = [
  'button', 'link', 'menuitem', 'tab', 'option', 
  'checkbox', 'radio', 'switch', 'textbox', 'combobox',
  'menuitemcheckbox', 'menuitemradio'
];

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-GENERATED ID PATTERNS - Skip these for labeling
// ═══════════════════════════════════════════════════════════════════════════

export const AUTO_GENERATED_ID_PATTERNS: RegExp[] = [
  /^[a-f0-9]{8,}$/i,      // UUID-like hex strings
  /^\d+$/,                 // Pure numbers
  /^_/,                    // Leading underscore
  /^rc-/,                  // React auto-generated
  /^ember\d+/,             // Ember auto-generated
  /^:r\d+:/,               // React 18 useId()
  /^ng-/,                  // Angular auto-generated
  /^react-/,               // React prefixed
];

// ═══════════════════════════════════════════════════════════════════════════
// VS CODE ARIA LABEL CLEANUP PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

export const VSCODE_ARIA_CLEANUP_PATTERNS: RegExp[] = [
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
  /,\s*active/gi,
];

// ═══════════════════════════════════════════════════════════════════════════
// SIGNIFICANT KEYS - Only record these keydown events
// ═══════════════════════════════════════════════════════════════════════════

export const SIGNIFICANT_KEYS: string[] = [
  'Enter', 'Tab', 'Escape', 'Backspace', 'Delete',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
];

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT DETECTION SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

export const CONTEXT_SELECTORS = {
  terminal: '.xterm, .terminal, [class*="terminal"]',
  monacoEditor: '.monaco-editor, [class*="monaco"]',
  copilotChat: '[class*="copilot"], [class*="chat-input"], [class*="inline-chat"]',
  vscodeInput: '.input, .inputarea, [class*="quick-input"]',
};
