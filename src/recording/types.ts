/**
 * RECORDING ENGINE TYPES
 * Single source of truth for all recording interfaces
 */

// ═══════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CapturedEvent {
  type: 'click' | 'input' | 'keydown' | 'change';
  originalEvent: Event;
  target: HTMLElement;
  timestamp: number;
  coordinates?: { x: number; y: number };
  key?: string;
  value?: string;
}

export interface FilteredEvent extends CapturedEvent {
  resolvedTarget: HTMLElement;
  shouldRecord: true;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUNDLE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Bundle {
  // Identifiers
  id?: string;
  name?: string;
  className?: string;
  tag: string;
  
  // Accessibility
  ariaLabel?: string;
  ariaLabelledBy?: string;
  placeholder?: string;
  role?: string;
  
  // Data attributes
  dataAttrs: Record<string, string>;
  testId?: string;
  
  // Selectors
  xpath: string;
  cssSelector?: string;
  
  // Position
  bounding: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Scroll position at capture (Batch 11: scroll compensation)
  scrollPosition?: {
    x: number;
    y: number;
  };
  
  // Context
  iframeChain?: IframeInfo[];
  shadowHosts?: string[];
  pageUrl: string;
  
  // Text content
  visibleText?: string;
  innerText?: string;
  
  // Context hints for playback disambiguation
  contextHints: {
    isTerminal: boolean;
    isMonacoEditor: boolean;
    isCopilotChat: boolean;
    isVSCodeInput: boolean;
    containerSelector?: string;
  };
  
  // Manual override (if user defined)
  manualSelector?: ManualSelector;
}

export interface IframeInfo {
  id?: string;
  name?: string;
  index: number;
  src?: string;
}

export interface ManualSelector {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  timestamp: number;
  viewportWidth: number;
  viewportHeight: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RecordedStep {
  stepNumber: number;
  timestamp: number;
  label: string;
  event: 'click' | 'input' | 'enter' | 'open' | 'keypress';
  value?: string;
  xpath: string;
  selector?: string;
  x?: number;
  y?: number;
  bundle: Bundle;
  page: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RecordingConfig {
  filterScrollbars: boolean;
  filterSyntheticEvents: boolean;
  filterHiddenElements: boolean;
  captureClicks: boolean;
  captureInputs: boolean;
  captureKeyboard: boolean;
  debounceMs: number;
  maxLabelLength: number;
  debugMode: boolean;
  logEvents: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  stepCounter: number;
  lastEventTime: number;
  lastEventKey: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FilterResult {
  shouldRecord: boolean;
  reason?: string;
}
