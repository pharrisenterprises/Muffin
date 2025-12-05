/**
 * EVENT CAPTURE MODULE
 * Single entry point for all event listening
 * Uses AbortController for clean teardown
 */

import { CapturedEvent, RecordingConfig } from './types';

export type EventCallback = (event: CapturedEvent) => void;

export class EventCapture {
  private config: RecordingConfig;
  private callback: EventCallback | null = null;
  private abortController: AbortController | null = null;
  
  constructor(config: RecordingConfig) {
    this.config = config;
  }
  
  /**
   * Start capturing events on the document
   */
  start(callback: EventCallback): void {
    if (this.abortController) {
      this.stop();
    }
    
    this.callback = callback;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    
    // Click events
    if (this.config.captureClicks) {
      document.addEventListener('click', this.handleClick, { capture: true, signal });
      document.addEventListener('mousedown', this.handleMouseDown, { capture: true, signal });
    }
    
    // Input events
    if (this.config.captureInputs) {
      document.addEventListener('input', this.handleInput, { capture: true, signal });
      document.addEventListener('change', this.handleChange, { capture: true, signal });
    }
    
    // Keyboard events
    if (this.config.captureKeyboard) {
      document.addEventListener('keydown', this.handleKeydown, { capture: true, signal });
    }
    
    // Attach to existing iframes
    this.attachToIframes(signal);
    
    // Watch for new iframes
    this.observeNewIframes(signal);
    
    if (this.config.debugMode) {
      console.log('[EventCapture] Started - listeners attached');
    }
  }
  
  /**
   * Stop capturing events
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.callback = null;
    
    if (this.config.debugMode) {
      console.log('[EventCapture] Stopped - listeners removed');
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────
  
  private handleClick = (e: Event): void => {
    console.log('[CLICK] Event received:', (e.target as HTMLElement)?.tagName, 'isTrusted:', (e as MouseEvent).isTrusted);
    const mouseEvent = e as MouseEvent;
    this.emit({
      type: 'click',
      originalEvent: e,
      target: e.target as HTMLElement,
      timestamp: Date.now(),
      coordinates: { x: mouseEvent.clientX, y: mouseEvent.clientY },
    });
  };
  
  private handleMouseDown = (e: Event): void => {
    // Used for detecting focus changes before click
    if (this.config.debugMode) {
      console.log('[EventCapture] mousedown on:', (e.target as HTMLElement)?.tagName);
    }
  };
  
  private handleInput = (e: Event): void => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const value = target.value || target.innerText || '';
    
    this.emit({
      type: 'input',
      originalEvent: e,
      target: target,
      timestamp: Date.now(),
      value: value,
    });
  };
  
  private handleChange = (e: Event): void => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    this.emit({
      type: 'change',
      originalEvent: e,
      target: target,
      timestamp: Date.now(),
      value: target.value,
    });
  };
  
  private handleKeydown = (e: Event): void => {
    const keyEvent = e as KeyboardEvent;
    this.emit({
      type: 'keydown',
      originalEvent: e,
      target: e.target as HTMLElement,
      timestamp: Date.now(),
      key: keyEvent.key,
      value: keyEvent.key,
    });
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────
  
  private emit(event: CapturedEvent): void {
    if (this.callback) {
      try {
        this.callback(event);
      } catch (error) {
        console.error('[EventCapture] Callback error:', error);
      }
    }
  }
  
  private attachToIframes(signal: AbortSignal): void {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        const doc = iframe.contentDocument;
        if (doc && doc.readyState !== 'loading') {
          this.attachListenersToDocument(doc, signal);
        }
      } catch (e) {
        // Cross-origin iframe, skip silently
      }
    });
  }
  
  private attachListenersToDocument(doc: Document, signal: AbortSignal): void {
    if (this.config.captureClicks) {
      doc.addEventListener('click', this.handleClick, { capture: true, signal });
    }
    if (this.config.captureInputs) {
      doc.addEventListener('input', this.handleInput, { capture: true, signal });
      doc.addEventListener('change', this.handleChange, { capture: true, signal });
    }
    if (this.config.captureKeyboard) {
      doc.addEventListener('keydown', this.handleKeydown, { capture: true, signal });
    }
  }
  
  private observeNewIframes(signal: AbortSignal): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLIFrameElement) {
            try {
              const doc = node.contentDocument;
              if (doc) {
                this.attachListenersToDocument(doc, signal);
              }
            } catch (e) {
              // Cross-origin
            }
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Disconnect on abort
    signal.addEventListener('abort', () => observer.disconnect());
  }
}
