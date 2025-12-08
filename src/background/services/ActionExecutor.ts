/**
 * @fileoverview Action Executor Service
 * @description Executes user actions (click, type, select) via CDP.
 * Used by DecisionEngine after element location.
 * 
 * @module services/ActionExecutor
 * @version 1.0.0
 * @since Phase 4
 */

import { CDPService, getCDPService } from './CDPService';
import { AutoWaiting, getAutoWaiting } from './AutoWaiting';
import { getPlaywrightLocators } from './PlaywrightLocators';
import { getAccessibilityService } from './AccessibilityService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ActionEventType = 'click' | 'type' | 'select' | 'hover' | 'scroll' | 'dblclick' | 'rightclick' | 'keydown';

export interface ActionExecutorConfig {
  clickDelay: number;
  typeDelay: number;
  moveBeforeClick: boolean;
  mouseMoveSteps: number;
  focusBeforeType: boolean;
  clearBeforeType: boolean;
  scrollMargin: number;
  verifyAfterAction: boolean;
  timeout: number;
}

const DEFAULT_CONFIG: ActionExecutorConfig = {
  clickDelay: 50,
  typeDelay: 50,
  moveBeforeClick: true,
  mouseMoveSteps: 10,
  focusBeforeType: true,
  clearBeforeType: true,
  scrollMargin: 100,
  verifyAfterAction: true,
  timeout: 30000
};

export interface ActionRequest {
  tabId: number;
  actionType: ActionEventType;
  clickPoint: { x: number; y: number };
  backendNodeId: number;
  nodeId?: number;
  value?: string;
  key?: string;
  modifiers?: {
    alt?: boolean;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
  };
}

export interface ActionResult {
  success: boolean;
  actionType: ActionEventType;
  duration: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ACTION EXECUTOR CLASS
// ============================================================================

export class ActionExecutor {
  private cdpService: CDPService;
  private autoWaiting: AutoWaiting;
  private config: ActionExecutorConfig;
  private currentMousePosition = { x: 0, y: 0 };

  constructor(
    cdpService: CDPService,
    autoWaiting: AutoWaiting,
    config?: Partial<ActionExecutorConfig>
  ) {
    this.cdpService = cdpService;
    this.autoWaiting = autoWaiting;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // MAIN EXECUTION
  // ==========================================================================

  async execute(request: ActionRequest): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      // Scroll element into view first
      await this.scrollIntoView(request.tabId, request.backendNodeId);

      // Wait for element to be actionable
      const waitResult = await this.autoWaiting.waitForActionable(
        request.tabId,
        request.backendNodeId
      );

      if (!waitResult.success) {
        throw new Error(`Element not actionable: ${waitResult.failureReason || waitResult.error}`);
      }

      // Execute action
      switch (request.actionType) {
        case 'click':
          await this.executeClick(request);
          break;
        case 'dblclick':
          await this.executeDoubleClick(request);
          break;
        case 'rightclick':
          await this.executeRightClick(request);
          break;
        case 'type':
          await this.executeType(request);
          break;
        case 'select':
          await this.executeSelect(request);
          break;
        case 'hover':
          await this.executeHover(request);
          break;
        case 'scroll':
          await this.executeScroll(request);
          break;
        case 'keydown':
          await this.executeKeydown(request);
          break;
        default:
          throw new Error(`Unknown action type: ${request.actionType}`);
      }

      return {
        success: true,
        actionType: request.actionType,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        actionType: request.actionType,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Action failed'
      };
    }
  }

  // ==========================================================================
  // CLICK ACTIONS
  // ==========================================================================

  private async executeClick(request: ActionRequest): Promise<void> {
    const { tabId, clickPoint } = request;

    if (this.config.moveBeforeClick) {
      await this.moveMouse(tabId, clickPoint.x, clickPoint.y);
    }

    await this.dispatchMouseEvent(tabId, 'mousePressed', clickPoint.x, clickPoint.y, 'left');
    await this.delay(this.config.clickDelay);
    await this.dispatchMouseEvent(tabId, 'mouseReleased', clickPoint.x, clickPoint.y, 'left');
  }

  private async executeDoubleClick(request: ActionRequest): Promise<void> {
    const { tabId, clickPoint } = request;

    if (this.config.moveBeforeClick) {
      await this.moveMouse(tabId, clickPoint.x, clickPoint.y);
    }

    // First click
    await this.dispatchMouseEvent(tabId, 'mousePressed', clickPoint.x, clickPoint.y, 'left', 1);
    await this.dispatchMouseEvent(tabId, 'mouseReleased', clickPoint.x, clickPoint.y, 'left', 1);

    // Second click (double)
    await this.dispatchMouseEvent(tabId, 'mousePressed', clickPoint.x, clickPoint.y, 'left', 2);
    await this.dispatchMouseEvent(tabId, 'mouseReleased', clickPoint.x, clickPoint.y, 'left', 2);
  }

  private async executeRightClick(request: ActionRequest): Promise<void> {
    const { tabId, clickPoint } = request;

    if (this.config.moveBeforeClick) {
      await this.moveMouse(tabId, clickPoint.x, clickPoint.y);
    }

    await this.dispatchMouseEvent(tabId, 'mousePressed', clickPoint.x, clickPoint.y, 'right');
    await this.delay(this.config.clickDelay);
    await this.dispatchMouseEvent(tabId, 'mouseReleased', clickPoint.x, clickPoint.y, 'right');
  }

  // ==========================================================================
  // TYPE ACTION
  // ==========================================================================

  private async executeType(request: ActionRequest): Promise<void> {
    const { tabId, backendNodeId, value } = request;

    if (!value) return;

    // Focus the element
    if (this.config.focusBeforeType) {
      await this.focusElement(tabId, backendNodeId);
    }

    // Clear existing content
    if (this.config.clearBeforeType) {
      await this.clearInput(tabId);
    }

    // Type each character
    for (const char of value) {
      await this.dispatchKeyEvent(tabId, 'keyDown', char);
      await this.dispatchKeyEvent(tabId, 'char', char);
      await this.dispatchKeyEvent(tabId, 'keyUp', char);
      await this.delay(this.config.typeDelay);
    }
  }

  private async clearInput(tabId: number): Promise<void> {
    // Select all
    await this.dispatchKeyEvent(tabId, 'keyDown', 'a', { ctrl: true });
    await this.dispatchKeyEvent(tabId, 'keyUp', 'a', { ctrl: true });

    // Delete
    await this.dispatchKeyEvent(tabId, 'keyDown', 'Backspace');
    await this.dispatchKeyEvent(tabId, 'keyUp', 'Backspace');
  }

  // ==========================================================================
  // SELECT ACTION
  // ==========================================================================

  private async executeSelect(request: ActionRequest): Promise<void> {
    const { tabId, backendNodeId, value } = request;

    if (!value) return;

    // Focus the select
    await this.focusElement(tabId, backendNodeId);

    // Set the value via CDP
    await this.cdpService.sendCommand(tabId, 'Runtime.evaluate', {
      expression: `
        (function() {
          const select = document.activeElement;
          if (select && select.tagName === 'SELECT') {
            select.value = ${JSON.stringify(value)};
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()
      `
    });
  }

  // ==========================================================================
  // OTHER ACTIONS
  // ==========================================================================

  private async executeHover(request: ActionRequest): Promise<void> {
    await this.moveMouse(request.tabId, request.clickPoint.x, request.clickPoint.y);
  }

  private async executeScroll(request: ActionRequest): Promise<void> {
    const { tabId, clickPoint } = request;

    await this.cdpService.sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: clickPoint.x,
      y: clickPoint.y,
      deltaX: 0,
      deltaY: 100
    });
  }

  private async executeKeydown(request: ActionRequest): Promise<void> {
    const { tabId, key, modifiers } = request;

    if (!key) return;

    await this.dispatchKeyEvent(tabId, 'keyDown', key, modifiers);
    await this.dispatchKeyEvent(tabId, 'keyUp', key, modifiers);
  }

  // ==========================================================================
  // MOUSE HELPERS
  // ==========================================================================

  private async moveMouse(tabId: number, targetX: number, targetY: number): Promise<void> {
    const steps = this.config.mouseMoveSteps;
    const startX = this.currentMousePosition.x;
    const startY = this.currentMousePosition.y;

    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const x = startX + (targetX - startX) * progress;
      const y = startY + (targetY - startY) * progress;

      await this.dispatchMouseEvent(tabId, 'mouseMoved', x, y);
      await this.delay(5);
    }

    this.currentMousePosition = { x: targetX, y: targetY };
  }

  private async dispatchMouseEvent(
    tabId: number,
    type: string,
    x: number,
    y: number,
    button: 'left' | 'right' | 'middle' = 'left',
    clickCount = 1
  ): Promise<void> {
    await this.cdpService.sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type,
      x: Math.round(x),
      y: Math.round(y),
      button,
      clickCount
    });
  }

  // ==========================================================================
  // KEYBOARD HELPERS
  // ==========================================================================

  private async dispatchKeyEvent(
    tabId: number,
    type: 'keyDown' | 'keyUp' | 'char',
    key: string,
    modifiers?: { alt?: boolean; ctrl?: boolean; meta?: boolean; shift?: boolean }
  ): Promise<void> {
    const params: Record<string, unknown> = { type };

    if (type === 'char') {
      params.text = key;
    } else {
      params.key = key;
      params.code = this.keyToCode(key);
    }

    if (modifiers) {
      let modifierFlags = 0;
      if (modifiers.alt) modifierFlags |= 1;
      if (modifiers.ctrl) modifierFlags |= 2;
      if (modifiers.meta) modifierFlags |= 4;
      if (modifiers.shift) modifierFlags |= 8;
      params.modifiers = modifierFlags;
    }

    await this.cdpService.sendCommand(tabId, 'Input.dispatchKeyEvent', params);
  }

  private keyToCode(key: string): string {
    const codes: Record<string, string> = {
      'Enter': 'Enter',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Escape': 'Escape',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight'
    };

    return codes[key] ?? `Key${key.toUpperCase()}`;
  }

  // ==========================================================================
  // ELEMENT HELPERS
  // ==========================================================================

  private async focusElement(tabId: number, backendNodeId: number): Promise<void> {
    await this.cdpService.sendCommand(tabId, 'DOM.focus', { backendNodeId });
  }

  private async scrollIntoView(tabId: number, backendNodeId: number): Promise<void> {
    await this.cdpService.sendCommand(tabId, 'DOM.scrollIntoViewIfNeeded', {
      backendNodeId
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: ActionExecutor | null = null;

export function getActionExecutor(
  cdpService?: CDPService,
  autoWaiting?: AutoWaiting
): ActionExecutor {
  if (!instance) {
    const cdp = cdpService ?? getCDPService();
    const accessibilityService = getAccessibilityService(cdp);
    const locators = getPlaywrightLocators(cdp, accessibilityService);
    const waiting = autoWaiting ?? getAutoWaiting(cdp, locators);
    instance = new ActionExecutor(cdp, waiting);
  }
  return instance;
}
