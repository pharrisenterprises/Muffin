/**
 * @fileoverview Recording Orchestrator
 * @description Central coordinator for multi-layer evidence capture.
 * Manages DOM, Vision, Mouse, Network capture layers.
 * 
 * @module contentScript/RecordingOrchestrator
 * @version 1.0.0
 * @since Phase 4
 */

import type { LocatorStrategy, FallbackChain } from '../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RecordingOrchestratorConfig {
  enableVision: boolean;
  enableMouse: boolean;
  enableNetwork: boolean;
  visionConfig: VisionConfig;
  bufferSizeLimit: number;
  tabId: number;
}

export interface VisionConfig {
  captureScreenshot: boolean;
  runOCR: boolean;
  ocrLanguage: string;
}

const DEFAULT_CONFIG: RecordingOrchestratorConfig = {
  enableVision: true,
  enableMouse: true,
  enableNetwork: true,
  visionConfig: {
    captureScreenshot: true,
    runOCR: true,
    ocrLanguage: 'eng'
  },
  bufferSizeLimit: 73400320, // 70MB
  tabId: 0
};

export interface DOMCaptureResult {
  selector: string;
  xpath: string;
  tagName: string;
  id?: string;
  classList: string[];
  role?: string;
  accessibleName?: string;
  textContent?: string;
  x: number;
  y: number;
  boundingRect: { x: number; y: number; width: number; height: number };
  attributes: Record<string, string>;
}

export interface VisionCaptureResult {
  screenshot: string;
  ocrText?: string;
  confidence: number;
  textBbox?: { x: number; y: number; width: number; height: number };
}

export interface MouseCaptureResult {
  trail: Array<{ x: number; y: number; timestamp: number }>;
  endpoint: { x: number; y: number };
  duration: number;
}

export interface NetworkCaptureResult {
  recentRequests: Array<{
    url: string;
    method: string;
    status?: number;
    timestamp: number;
  }>;
  pendingRequests: number;
  pageLoaded: boolean;
}

export interface CapturedEvidence {
  dom: DOMCaptureResult;
  vision?: VisionCaptureResult;
  mouse?: MouseCaptureResult;
  network?: NetworkCaptureResult;
  timestamp: number;
}

export interface RecordedStep {
  id: string;
  type: 'click' | 'type' | 'select' | 'navigate' | 'assert' | 'scroll' | 'hover';
  evidence: CapturedEvidence;
  fallbackChain: FallbackChain;
  value?: string;
  timestamp: number;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopping';

// ============================================================================
// RECORDING ORCHESTRATOR CLASS
// ============================================================================

export class RecordingOrchestrator {
  private config: RecordingOrchestratorConfig;
  private state: RecordingState = 'idle';
  private steps: RecordedStep[] = [];
  private stepCounter = 0;

  // Capture layers (lazy loaded)
  // @ts-expect-error reserved for future use
  private __domCapture: any | null = null;
  private visionCapture: any | null = null;
  private mouseCapture: any | null = null;
  private networkCapture: any | null = null;
  // @ts-expect-error reserved for future use
  private __evidenceBuffer: any | null = null;

  // Event listeners (for cleanup)
  private boundHandleClick: ((e: MouseEvent) => void) | null = null;
  private boundHandleInput: ((e: Event) => void) | null = null;
  private boundHandleChange: ((e: Event) => void) | null = null;

  constructor(config?: Partial<RecordingOrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  async start(): Promise<void> {
    if (this.state !== 'idle') {
      console.warn('[RecordingOrchestrator] Already started');
      return;
    }

    console.log('[RecordingOrchestrator] Starting recording...');
    this.state = 'recording';
    this.steps = [];
    this.stepCounter = 0;

    await this.initializeLayers();
    this.attachEventListeners();

    console.log('[RecordingOrchestrator] Recording started');
  }

  pause(): void {
    if (this.state !== 'recording') return;
    this.state = 'paused';
    console.log('[RecordingOrchestrator] Recording paused');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'recording';
    console.log('[RecordingOrchestrator] Recording resumed');
  }

  async stop(): Promise<RecordedStep[]> {
    if (this.state === 'idle') return this.steps;

    console.log('[RecordingOrchestrator] Stopping recording...');
    this.state = 'stopping';

    this.detachEventListeners();
    await this.shutdownLayers();

    this.state = 'idle';
    console.log(`[RecordingOrchestrator] Recording stopped. ${this.steps.length} steps captured.`);

    return this.steps;
  }

  getState(): RecordingState {
    return this.state;
  }

  getSteps(): RecordedStep[] {
    return [...this.steps];
  }

  // ==========================================================================
  // LAYER INITIALIZATION
  // ==========================================================================

  private async initializeLayers(): Promise<void> {
    // DOM capture is always enabled
    this.__domCapture = { capture: this.captureDOMFallback.bind(this) };

    if (this.config.enableMouse) {
      this.mouseCapture = { 
        startTracking: () => {},
        getTrail: () => ({ trail: [], endpoint: { x: 0, y: 0 }, duration: 0 }),
        reset: () => {}
      };
    }

    if (this.config.enableVision) {
      this.visionCapture = {
        capture: async () => ({ screenshot: '', confidence: 0 })
      };
    }

    if (this.config.enableNetwork) {
      this.networkCapture = {
        getSnapshot: () => ({ recentRequests: [], pendingRequests: 0, pageLoaded: true })
      };
    }

    this.__evidenceBuffer = {
      add: () => {},
      flush: () => []
    };
  }

  private async shutdownLayers(): Promise<void> {
    this.__domCapture = null;
    this.visionCapture = null;
    this.mouseCapture = null;
    this.networkCapture = null;
    this.__evidenceBuffer = null;
  }

  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================

  private attachEventListeners(): void {
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleInput = this.handleInput.bind(this);
    this.boundHandleChange = this.handleChange.bind(this);

    document.addEventListener('click', this.boundHandleClick, true);
    document.addEventListener('input', this.boundHandleInput, true);
    document.addEventListener('change', this.boundHandleChange, true);
  }

  private detachEventListeners(): void {
    if (this.boundHandleClick) {
      document.removeEventListener('click', this.boundHandleClick, true);
    }
    if (this.boundHandleInput) {
      document.removeEventListener('input', this.boundHandleInput, true);
    }
    if (this.boundHandleChange) {
      document.removeEventListener('change', this.boundHandleChange, true);
    }
  }

  private async handleClick(event: MouseEvent): Promise<void> {
    if (this.state !== 'recording') return;

    const target = event.target as HTMLElement;
    if (!target) return;

    const evidence = await this.captureAllLayers(target, event.clientX, event.clientY);
    const fallbackChain = this.generateFallbackChain(evidence);

    const step: RecordedStep = {
      id: `step_${++this.stepCounter}`,
      type: 'click',
      evidence,
      fallbackChain,
      timestamp: Date.now()
    };

    this.steps.push(step);
    this.notifyStepCaptured(step);
  }

  private async handleInput(event: Event): Promise<void> {
    if (this.state !== 'recording') return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target || !('value' in target)) return;

    // Debounce input events
    // (In real implementation, use actual debouncing)
  }

  private async handleChange(event: Event): Promise<void> {
    if (this.state !== 'recording') return;

    const target = event.target as HTMLSelectElement;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const evidence = await this.captureAllLayers(target, rect.x + rect.width / 2, rect.y + rect.height / 2);
    const fallbackChain = this.generateFallbackChain(evidence);

    const step: RecordedStep = {
      id: `step_${++this.stepCounter}`,
      type: target.tagName === 'SELECT' ? 'select' : 'type',
      evidence,
      fallbackChain,
      value: (target as HTMLSelectElement).value,
      timestamp: Date.now()
    };

    this.steps.push(step);
    this.notifyStepCaptured(step);
  }

  // ==========================================================================
  // EVIDENCE CAPTURE
  // ==========================================================================

  private async captureAllLayers(
    element: HTMLElement,
    x: number,
    y: number
  ): Promise<CapturedEvidence> {
    const timestamp = Date.now();

    // Capture DOM (always)
    const dom = this.captureDOMFallback(element, x, y);

    // Capture other layers in parallel
    const [vision, mouse, network] = await Promise.all([
      this.captureVision(x, y),
      this.captureMouse(),
      this.captureNetwork()
    ]);

    return { dom, vision, mouse, network, timestamp };
  }

  private captureDOMFallback(element: HTMLElement, x: number, y: number): DOMCaptureResult {
    const rect = element.getBoundingClientRect();
    const attrs: Record<string, string> = {};

    for (const attr of Array.from(element.attributes)) {
      attrs[attr.name] = attr.value;
    }

    return {
      selector: this.generateSelector(element),
      xpath: this.generateXPath(element),
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      classList: Array.from(element.classList),
      role: element.getAttribute('role') || undefined,
      accessibleName: element.getAttribute('aria-label') || element.textContent?.slice(0, 50) || undefined,
      textContent: element.textContent?.slice(0, 100),
      x,
      y,
      boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      attributes: attrs
    };
  }

  private async captureVision(x: number, y: number): Promise<VisionCaptureResult | undefined> {
    if (!this.config.enableVision || !this.visionCapture) return undefined;

    try {
      return await this.visionCapture.capture(x, y);
    } catch {
      return undefined;
    }
  }

  private async captureMouse(): Promise<MouseCaptureResult | undefined> {
    if (!this.config.enableMouse || !this.mouseCapture) return undefined;

    try {
      const result = this.mouseCapture.getTrail();
      this.mouseCapture.reset();
      return result;
    } catch {
      return undefined;
    }
  }

  private async captureNetwork(): Promise<NetworkCaptureResult | undefined> {
    if (!this.config.enableNetwork || !this.networkCapture) return undefined;

    try {
      return this.networkCapture.getSnapshot();
    } catch {
      return undefined;
    }
  }

  // ==========================================================================
  // FALLBACK CHAIN GENERATION
  // ==========================================================================

  private generateFallbackChain(evidence: CapturedEvidence): FallbackChain {
    const strategies: LocatorStrategy[] = [];
    const dom = evidence.dom;

    // 1. CDP Semantic (highest confidence)
    if (dom.role && dom.accessibleName) {
      strategies.push({
        type: 'cdp_semantic',
        selector: '',
        confidence: 0.95,
        metadata: { role: dom.role, name: dom.accessibleName }
      });
    }

    // 2. CDP Power - Test ID
    if (dom.attributes['data-testid']) {
      strategies.push({
        type: 'cdp_power',
        selector: `[data-testid="${dom.attributes['data-testid']}"]`,
        confidence: 0.90,
        metadata: { testId: dom.attributes['data-testid'] }
      });
    }

    // 3. DOM Selector - ID
    if (dom.id) {
      strategies.push({
        type: 'dom_selector',
        selector: `#${dom.id}`,
        confidence: 0.85
      });
    }

    // 4. CSS Selector
    strategies.push({
      type: 'css_selector',
      selector: dom.selector,
      confidence: 0.75
    });

    // 5. Vision OCR
    if (evidence.vision?.ocrText) {
      strategies.push({
        type: 'vision_ocr',
        selector: '',
        confidence: 0.70,
        metadata: { targetText: evidence.vision.ocrText }
      });
    }

    // 6. Evidence Scoring
    if (evidence.mouse?.endpoint) {
      strategies.push({
        type: 'evidence_scoring',
        selector: '',
        confidence: 0.75,
        metadata: {
          endpoint: evidence.mouse.endpoint,
          attributes: {
            tagName: dom.tagName,
            id: dom.id,
            classList: dom.classList
          }
        }
      });
    }

    // 7. Coordinates (always, last resort)
    strategies.push({
      type: 'coordinates',
      selector: '',
      confidence: 0.60,
      metadata: { x: dom.x, y: dom.y }
    });

    return {
      strategies,
      primaryStrategy: strategies[0].type,
      recordedAt: Date.now()
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private generateSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;

    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${current.id}`;
        parts.unshift(selector);
        break;
      }

      if (current.className) {
        const classes = current.className.split(/\s+/).filter(c => c && !c.match(/^[0-9]/));
        if (classes.length) {
          selector += `.${classes.slice(0, 2).join('.')}`;
        }
      }

      const parent: HTMLElement | null = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => (c as Element).tagName === current!.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(selector);
      current = parent;
    }

    return parts.join(' > ');
  }

  private generateXPath(element: HTMLElement): string {
    if (element.id) return `//*[@id="${element.id}"]`;

    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase();

      const parent: HTMLElement | null = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => (c as Element).tagName === current!.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          part += `[${index}]`;
        }
      }

      parts.unshift(part);
      current = parent;
    }

    return '//' + parts.join('/');
  }

  private notifyStepCaptured(step: RecordedStep): void {
    // Send message to background script
    chrome.runtime?.sendMessage?.({
      type: 'STEP_CAPTURED',
      payload: { stepId: step.id, stepType: step.type }
    }).catch(() => {});

    console.log(`[RecordingOrchestrator] Step captured: ${step.type} (${step.id})`);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: RecordingOrchestrator | null = null;

export function getRecordingOrchestrator(config?: Partial<RecordingOrchestratorConfig>): RecordingOrchestrator {
  if (!instance) {
    instance = new RecordingOrchestrator(config);
  }
  return instance;
}
