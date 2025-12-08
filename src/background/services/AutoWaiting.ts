/**
 * @fileoverview Auto Waiting Service
 * @description Implements Playwright-style auto-waiting for element actionability.
 * Waits for elements to be visible, enabled, stable before performing actions.
 * Prevents flaky tests caused by timing issues.
 * 
 * @module services/AutoWaiting
 * @version 1.0.0
 * @since Phase 4
 */

import { CDPService } from './CDPService';
import type { PlaywrightLocators } from './PlaywrightLocators';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AutoWaitConfig {
  timeout: number;
  pollingInterval: number;
  waitForVisible: boolean;
  waitForEnabled: boolean;
  waitForStable: boolean;
  stabilityThreshold: number;
  waitForNetworkIdle: boolean;
  networkIdleThreshold: number;
}

const DEFAULT_CONFIG: AutoWaitConfig = {
  timeout: 30000,
  pollingInterval: 100,
  waitForVisible: true,
  waitForEnabled: true,
  waitForStable: true,
  stabilityThreshold: 100,
  waitForNetworkIdle: false,
  networkIdleThreshold: 500
};

export interface WaitOptions {
  timeout?: number;
  visible?: boolean;
  enabled?: boolean;
  stable?: boolean;
  attached?: boolean;
  editable?: boolean;
  receivesPointerEvents?: boolean;
}

export interface ActionabilityState {
  attached: boolean;
  visible: boolean;
  enabled: boolean;
  stable: boolean;
  receivesPointerEvents: boolean;
  editable: boolean;
  inViewport: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
  lastPosition?: { x: number; y: number };
  positionChangedAt?: number;
}

export interface WaitResult {
  success: boolean;
  state: ActionabilityState;
  waitedMs: number;
  failureReason?: WaitFailureReason;
  error?: string;
}

export type WaitFailureReason =
  | 'timeout'
  | 'detached'
  | 'hidden'
  | 'disabled'
  | 'unstable'
  | 'not_editable'
  | 'covered'
  | 'outside_viewport'
  | 'node_not_found';

interface StabilityTracker {
  backendNodeId: number;
  positionHistory: Array<{ x: number; y: number; timestamp: number }>;
  isStable: boolean;
  stableSince?: number;
}

// ============================================================================
// AUTO WAITING CLASS
// ============================================================================

export class AutoWaiting {
  private cdpService: CDPService;
  private locators: PlaywrightLocators;
  private config: AutoWaitConfig;
  private stabilityTrackers: Map<number, StabilityTracker> = new Map();

  constructor(
    cdpService: CDPService,
    locators: PlaywrightLocators,
    config?: Partial<AutoWaitConfig>
  ) {
    this.cdpService = cdpService;
    this.locators = locators;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // MAIN WAIT METHODS
  // ==========================================================================

  async waitForActionable(
    tabId: number,
    backendNodeId: number,
    options?: WaitOptions
  ): Promise<WaitResult> {
    const startTime = Date.now();
    const timeout = options?.timeout ?? this.config.timeout;
    const shouldWaitVisible = options?.visible ?? this.config.waitForVisible;
    const shouldWaitEnabled = options?.enabled ?? this.config.waitForEnabled;
    const shouldWaitStable = options?.stable ?? this.config.waitForStable;

    let lastState = this.createEmptyState();

    while (Date.now() - startTime < timeout) {
      const state = await this.getActionabilityState(tabId, backendNodeId);
      lastState = state;

      // Check attached first
      if (!state.attached) {
        await this.sleep(this.config.pollingInterval);
        continue;
      }

      // Check conditions
      let allConditionsMet = true;
      let __failureReason: WaitFailureReason | undefined;

      if (shouldWaitVisible && !state.visible) {
        allConditionsMet = false;
        __failureReason = 'hidden';
      }

      if (shouldWaitEnabled && !state.enabled) {
        allConditionsMet = false;
        _failureReason = 'disabled';
      }

      if (shouldWaitStable && !state.stable) {
        allConditionsMet = false;
        _failureReason = 'unstable';
      }

      if (options?.editable && !state.editable) {
        allConditionsMet = false;
        _failureReason = 'not_editable';
      }

      if (options?.receivesPointerEvents && !state.receivesPointerEvents) {
        allConditionsMet = false;
        _failureReason = 'covered';
      }

      if (allConditionsMet) {
        return {
          success: true,
          state,
          waitedMs: Date.now() - startTime
        };
      }

      await this.sleep(this.config.pollingInterval);
    }

    return {
      success: false,
      state: lastState,
      waitedMs: Date.now() - startTime,
      failureReason: 'timeout',
      error: `Timeout waiting for element to be actionable after ${timeout}ms`
    };
  }

  async waitForVisible(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult> {
    return this.waitForActionable(tabId, backendNodeId, {
      timeout,
      visible: true,
      enabled: false,
      stable: false
    });
  }

  async waitForEnabled(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult> {
    return this.waitForActionable(tabId, backendNodeId, {
      timeout,
      visible: false,
      enabled: true,
      stable: false
    });
  }

  async waitForStable(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult> {
    return this.waitForActionable(tabId, backendNodeId, {
      timeout,
      visible: false,
      enabled: false,
      stable: true
    });
  }

  async waitForAttached(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult> {
    return this.waitForActionable(tabId, backendNodeId, {
      timeout,
      attached: true,
      visible: false,
      enabled: false,
      stable: false
    });
  }

  async waitForEditable(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult> {
    return this.waitForActionable(tabId, backendNodeId, {
      timeout,
      editable: true
    });
  }

  // ==========================================================================
  // ACTIONABILITY STATE
  // ==========================================================================

  async getActionabilityState(
    tabId: number,
    backendNodeId: number
  ): Promise<ActionabilityState> {
    const state = this.createEmptyState();

    try {
      // Check attached
      const attached = await this.checkAttached(tabId, backendNodeId);
      state.attached = attached;
      if (!attached) return state;

      // Get bounding box
      const boundingBox = await this.locators.getBoundingBox(tabId, backendNodeId);
      state.boundingBox = boundingBox ?? undefined;

      // Check visible
      state.visible = await this.checkVisible(tabId, backendNodeId, boundingBox);

      // Check enabled
      state.enabled = await this.checkEnabled(tabId, backendNodeId);

      // Check stable
      state.stable = await this.checkStable(tabId, backendNodeId, boundingBox);

      // Check editable
      state.editable = await this.checkEditable(tabId, backendNodeId);

      // Check receives pointer events
      if (boundingBox) {
        state.receivesPointerEvents = await this.checkReceivesPointerEvents(
          tabId,
          backendNodeId,
          boundingBox
        );
      }

      // Check in viewport
      state.inViewport = await this.checkInViewport(tabId, backendNodeId, boundingBox);

    } catch (error) {
      console.error('[AutoWaiting] getActionabilityState error:', error);
    }

    return state;
  }

  async isActionable(
    tabId: number,
    backendNodeId: number,
    options?: WaitOptions
  ): Promise<boolean> {
    const state = await this.getActionabilityState(tabId, backendNodeId);

    if (!state.attached) return false;
    if (options?.visible !== false && !state.visible) return false;
    if (options?.enabled !== false && !state.enabled) return false;
    if (options?.stable !== false && !state.stable) return false;
    if (options?.editable && !state.editable) return false;
    if (options?.receivesPointerEvents && !state.receivesPointerEvents) return false;

    return true;
  }

  // ==========================================================================
  // CHECK METHODS
  // ==========================================================================

  private async checkAttached(tabId: number, backendNodeId: number): Promise<boolean> {
    try {
      const result = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
        backendNodeId,
        depth: 0
      });
      return result.success && !!(result.result as any)?.node;
    } catch {
      return false;
    }
  }

  private async checkVisible(
    tabId: number,
    backendNodeId: number,
    boundingBox: { x: number; y: number; width: number; height: number } | null
  ): Promise<boolean> {
    if (!boundingBox) return false;
    if (boundingBox.width === 0 || boundingBox.height === 0) return false;

    // Check computed style for visibility
    try {
      const result = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
        backendNodeId,
        depth: 0
      });

      if (!result.success || !(result.result as any)?.node?.nodeId) return false;

      const styleResult = await this.cdpService.sendCommand(tabId, 'CSS.getComputedStyleForNode', {
        nodeId: (result.result as any).node.nodeId
      });

      if (styleResult.success && (styleResult.result as any)?.computedStyle) {
        const styles = (styleResult.result as any).computedStyle as Array<{ name: string; value: string }>;
        
        for (const style of styles) {
          if (style.name === 'visibility' && style.value === 'hidden') return false;
          if (style.name === 'display' && style.value === 'none') return false;
          if (style.name === 'opacity' && parseFloat(style.value) === 0) return false;
        }
      }

      return true;
    } catch {
      return boundingBox !== null;
    }
  }

  private async checkEnabled(tabId: number, backendNodeId: number): Promise<boolean> {
    try {
      const result = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
        backendNodeId,
        depth: 0
      });

      if (!result.success || !(result.result as any)?.node) return true;

      const node = (result.result as any).node;
      const nodeId = node.nodeId;

      // Check for disabled attribute
      const attrsResult = await this.cdpService.sendCommand(tabId, 'DOM.getAttributes', {
        nodeId
      });
      if (attrsResult.success && (attrsResult.result as any)?.attributes) {
        const attrs = (attrsResult.result as any).attributes as string[];
        for (let i = 0; i < attrs.length; i += 2) {
          if (attrs[i] === 'disabled') return false;
          if (attrs[i] === 'aria-disabled' && attrs[i + 1] === 'true') return false;
        }
      }

      return true;
    } catch {
      return true;
    }
  }

  private async checkStable(
    _tabId: number,
    backendNodeId: number,
    boundingBox: { x: number; y: number; width: number; height: number } | null
  ): Promise<boolean> {
    if (!boundingBox) return false;

    let tracker = this.stabilityTrackers.get(backendNodeId);
    const now = Date.now();
    const currentPosition = { x: boundingBox.x, y: boundingBox.y };

    if (!tracker) {
      tracker = {
        backendNodeId,
        positionHistory: [{ ...currentPosition, timestamp: now }],
        isStable: false
      };
      this.stabilityTrackers.set(backendNodeId, tracker);
      return false;
    }

    const lastPosition = tracker.positionHistory[tracker.positionHistory.length - 1];

    if (lastPosition.x !== currentPosition.x || lastPosition.y !== currentPosition.y) {
      tracker.positionHistory.push({ ...currentPosition, timestamp: now });
      tracker.isStable = false;
      tracker.stableSince = undefined;

      // Keep only recent history
      if (tracker.positionHistory.length > 10) {
        tracker.positionHistory = tracker.positionHistory.slice(-5);
      }
      return false;
    }

    if (!tracker.stableSince) {
      tracker.stableSince = now;
    }

    if (now - tracker.stableSince >= this.config.stabilityThreshold) {
      tracker.isStable = true;
      return true;
    }

    return false;
  }

  private async checkEditable(tabId: number, backendNodeId: number): Promise<boolean> {
    try {
      const result = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
        backendNodeId,
        depth: 0
      });

      if (!result.success || !(result.result as any)?.node) return false;

      const node = (result.result as any).node;
      const tagName = node.nodeName.toLowerCase();
      const editableElements = ['input', 'textarea', 'select'];

      // Get attributes
      const attrsResult = await this.cdpService.sendCommand(tabId, 'DOM.getAttributes', {
        nodeId: node.nodeId
      });

      if (editableElements.includes(tagName)) {
        if (attrsResult.success && (attrsResult.result as any)?.attributes) {
          const attrs = (attrsResult.result as any).attributes as string[];
          for (let i = 0; i < attrs.length; i += 2) {
            if (attrs[i] === 'readonly') return false;
          }
        }
        return await this.checkEnabled(tabId, backendNodeId);
      }

      // Check contenteditable
      if (attrsResult.success && (attrsResult.result as any)?.attributes) {
        const attrs = (attrsResult.result as any).attributes as string[];
        for (let i = 0; i < attrs.length; i += 2) {
          if (attrs[i] === 'contenteditable' && (attrs[i + 1] === 'true' || attrs[i + 1] === '')) {
            return true;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  private async checkReceivesPointerEvents(
    tabId: number,
    backendNodeId: number,
    boundingBox: { x: number; y: number; width: number; height: number }
  ): Promise<boolean> {
    try {
      const centerX = boundingBox.x + boundingBox.width / 2;
      const centerY = boundingBox.y + boundingBox.height / 2;

      const result = await this.cdpService.sendCommand(tabId, 'DOM.getNodeForLocation', {
        x: Math.round(centerX),
        y: Math.round(centerY),
        includeUserAgentShadowDOM: false,
        ignorePointerEventsNone: true
      });

      if (result.success && (result.result as any)?.backendNodeId) {
        return (result.result as any).backendNodeId === backendNodeId;
      }

      return false;
    } catch {
      return false;
    }
  }

  private async checkInViewport(
    _tabId: number,
    _backendNodeId: number,
    boundingBox: { x: number; y: number; width: number; height: number } | null
  ): Promise<boolean> {
    if (!boundingBox) return false;

    try {
      const layoutResult = await this.cdpService.sendCommand(_tabId, 'Page.getLayoutMetrics');
      if (!layoutResult.success || !layoutResult.result) return false;

      const viewport = (layoutResult.result as any).visualViewport ?? (layoutResult.result as any).layoutViewport;
      if (!viewport) return false;

      return (
        boundingBox.x >= 0 &&
        boundingBox.y >= 0 &&
        boundingBox.x + boundingBox.width <= viewport.clientWidth &&
        boundingBox.y + boundingBox.height <= viewport.clientHeight
      );
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // SCROLL HELPERS
  // ==========================================================================

  async scrollIntoViewIfNeeded(tabId: number, backendNodeId: number): Promise<void> {
    try {
      const boundingBox = await this.locators.getBoundingBox(tabId, backendNodeId);
      const inViewport = await this.checkInViewport(tabId, backendNodeId, boundingBox);

      if (inViewport) return;

      const result = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
        backendNodeId,
        depth: 0
      });

      if (result.success && (result.result as any)?.node?.nodeId) {
        await this.cdpService.sendCommand(tabId, 'DOM.scrollIntoViewIfNeeded', {
          nodeId: (result.result as any).node.nodeId
        });
        await this.sleep(100);
      }
    } catch (error) {
      console.error('[AutoWaiting] scrollIntoViewIfNeeded error:', error);
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private createEmptyState(): ActionabilityState {
    return {
      attached: false,
      visible: false,
      enabled: false,
      stable: false,
      receivesPointerEvents: false,
      editable: false,
      inViewport: false
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearStabilityTracker(backendNodeId?: number): void {
    if (backendNodeId !== undefined) {
      this.stabilityTrackers.delete(backendNodeId);
    } else {
      this.stabilityTrackers.clear();
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: AutoWaiting | null = null;

export function getAutoWaiting(
  cdpService: CDPService,
  locators: PlaywrightLocators
): AutoWaiting {
  if (!instance) {
    instance = new AutoWaiting(cdpService, locators);
  }
  return instance;
}
