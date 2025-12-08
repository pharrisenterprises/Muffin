/**
 * @fileoverview CDP Service - Chrome DevTools Protocol Manager
 * @description Core service for managing Chrome debugger attachment,
 * command execution, and event handling. Foundation for CDP-based strategies.
 * 
 * @module services/CDPService
 * @version 1.0.0
 * @since Phase 4
 */

import type { CDPNode, AXNode, BoxModel, BoundingRect } from '../../types';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

/**
 * CDP Service configuration.
 */
export interface CDPServiceConfig {
  /** Auto-detach timeout in ms (default: 300000 = 5 min) */
  autoDetachTimeoutMs: number;
  /** Retry attempts for failed commands (default: 3) */
  retryAttempts: number;
  /** Retry delay in ms (default: 100) */
  retryDelayMs: number;
  /** Log CDP commands for debugging (default: false) */
  debugLogging: boolean;
}

/**
 * Default configuration.
 */
const DEFAULT_CDP_CONFIG: CDPServiceConfig = {
  autoDetachTimeoutMs: 300000,
  retryAttempts: 3,
  retryDelayMs: 100,
  debugLogging: false
};

/**
 * CDP connection state.
 */
export interface CDPConnection {
  tabId: number;
  attached: boolean;
  attachedAt: number;
  sessionId?: string;
  pendingCommands: Map<number, PendingCommand>;
  eventListeners: Map<string, Set<CDPEventListener>>;
}

/**
 * Pending command tracking.
 */
export interface PendingCommand {
  method: string;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  sentAt: number;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

/**
 * CDP event listener callback.
 */
export type CDPEventListener = (params: unknown) => void;

/**
 * CDP command result wrapper.
 */
export interface CDPCommandResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  duration: number;
}

// ============================================================================
// SECTION 2: CDP SERVICE CLASS
// ============================================================================

/**
 * CDPService - Chrome DevTools Protocol manager.
 */
export class CDPService {
  private config: CDPServiceConfig;
  private connections: Map<number, CDPConnection> = new Map();
  private commandIdCounter: number = 0;
  private isInitialized: boolean = false;

  constructor(config?: Partial<CDPServiceConfig>) {
    this.config = { ...DEFAULT_CDP_CONFIG, ...config };
  }

  /**
   * Initialize the service - sets up chrome.debugger event listeners.
   */
  initialize(): void {
    if (this.isInitialized) return;

    chrome.debugger.onEvent.addListener(
      (source, method, params) => this.handleDebuggerEvent(source, method, params)
    );

    chrome.debugger.onDetach.addListener(
      (source, reason) => this.handleDebuggerDetach(source, reason)
    );

    this.isInitialized = true;
    console.log('[CDPService] Initialized');
  }

  /**
   * Attach debugger to a tab.
   */
  async attach(tabId: number): Promise<CDPCommandResult<void>> {
    const startTime = Date.now();

    // Check if already attached
    const existing = this.connections.get(tabId);
    if (existing?.attached) {
      return { success: true, duration: Date.now() - startTime };
    }

    try {
      await new Promise<void>((resolve, reject) => {
        chrome.debugger.attach({ tabId }, '1.3', () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      // Create connection record
      this.connections.set(tabId, {
        tabId,
        attached: true,
        attachedAt: Date.now(),
        pendingCommands: new Map(),
        eventListeners: new Map()
      });

      // Enable required domains
      await this.sendCommand(tabId, 'DOM.enable', {});
      await this.sendCommand(tabId, 'Accessibility.enable', {});

      return { success: true, duration: Date.now() - startTime };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Attach failed';
      return { success: false, error: message, duration: Date.now() - startTime };
    }
  }

  /**
   * Detach debugger from a tab.
   */
  async detach(tabId: number): Promise<CDPCommandResult<void>> {
    const startTime = Date.now();
    const connection = this.connections.get(tabId);

    if (!connection?.attached) {
      return { success: true, duration: Date.now() - startTime };
    }

    try {
      // Cancel pending commands
      for (const pending of Array.from(connection.pendingCommands.values())) {
        clearTimeout(pending.timeoutHandle);
        pending.reject(new Error('Detaching'));
      }

      await new Promise<void>((resolve, reject) => {
        chrome.debugger.detach({ tabId }, () => {
          if (chrome.runtime.lastError) {
            // Ignore "not attached" errors
            if (!chrome.runtime.lastError.message?.includes('not attached')) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
          }
          resolve();
        });
      });

      this.connections.delete(tabId);
      return { success: true, duration: Date.now() - startTime };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Detach failed';
      return { success: false, error: message, duration: Date.now() - startTime };
    }
  }

  /**
   * Check if debugger is attached to a tab.
   */
  isAttached(tabId: number): boolean {
    return this.connections.get(tabId)?.attached ?? false;
  }

  /**
   * Send CDP command with retry logic.
   */
  async sendCommand<T = unknown>(
    tabId: number,
    method: string,
    params?: Record<string, unknown>
  ): Promise<CDPCommandResult<T>> {
    const startTime = Date.now();

    if (!this.isAttached(tabId)) {
      return { success: false, error: 'Debugger not attached', duration: 0 };
    }

    const executeCommand = (): Promise<T> => {
      return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
          { tabId },
          method,
          params ?? {},
          (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result as T);
            }
          }
        );
      });
    };

    try {
      const result = await this.withRetry(executeCommand, this.config.retryAttempts);

      if (this.config.debugLogging) {
        console.log(`[CDPService] ${method}`, params, '->', result);
      }

      return { success: true, result, duration: Date.now() - startTime };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command failed';
      if (this.config.debugLogging) {
        console.error(`[CDPService] ${method} failed:`, message);
      }
      return { success: false, error: message, duration: Date.now() - startTime };
    }
  }

  /**
   * Add event listener for CDP events.
   */
  addEventListener(tabId: number, eventName: string, listener: CDPEventListener): void {
    const connection = this.connections.get(tabId);
    if (!connection) return;

    let listeners = connection.eventListeners.get(eventName);
    if (!listeners) {
      listeners = new Set();
      connection.eventListeners.set(eventName, listeners);
    }
    listeners.add(listener);
  }

  /**
   * Remove event listener.
   */
  removeEventListener(tabId: number, eventName: string, listener: CDPEventListener): void {
    const connection = this.connections.get(tabId);
    if (!connection) return;

    const listeners = connection.eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  // ==========================================================================
  // DOM METHODS
  // ==========================================================================

  /**
   * Get DOM document root.
   */
  async getDocument(tabId: number): Promise<CDPCommandResult<CDPNode>> {
    const result = await this.sendCommand<{ root: CDPNode }>(tabId, 'DOM.getDocument', {
      depth: 0,
      pierce: true
    });

    if (result.success && result.result) {
      return { ...result, result: result.result.root };
    }
    return { success: false, error: result.error, duration: result.duration };
  }

  /**
   * Query selector on document.
   */
  async querySelector(
    tabId: number,
    selector: string,
    nodeId?: number
  ): Promise<CDPCommandResult<number>> {
    if (!nodeId) {
      const docResult = await this.getDocument(tabId);
      if (!docResult.success || !docResult.result) {
        return { success: false, error: 'Failed to get document', duration: 0 };
      }
      nodeId = docResult.result.nodeId;
    }

    const result = await this.sendCommand<{ nodeId: number }>(
      tabId,
      'DOM.querySelector',
      { nodeId, selector }
    );

    if (result.success && result.result?.nodeId) {
      return { ...result, result: result.result.nodeId };
    }
    return { success: false, error: result.error ?? 'Node not found', duration: result.duration };
  }

  /**
   * Query all matching selectors.
   */
  async querySelectorAll(
    tabId: number,
    selector: string,
    nodeId?: number
  ): Promise<CDPCommandResult<number[]>> {
    if (!nodeId) {
      const docResult = await this.getDocument(tabId);
      if (!docResult.success || !docResult.result) {
        return { success: false, error: 'Failed to get document', duration: 0 };
      }
      nodeId = docResult.result.nodeId;
    }

    const result = await this.sendCommand<{ nodeIds: number[] }>(
      tabId,
      'DOM.querySelectorAll',
      { nodeId, selector }
    );

    if (result.success && result.result) {
      return { ...result, result: result.result.nodeIds };
    }
    return { success: false, error: result.error, duration: result.duration };
  }

  /**
   * Get node by backend node ID.
   */
  async describeNode(
    tabId: number,
    backendNodeId: number
  ): Promise<CDPCommandResult<CDPNode>> {
    const result = await this.sendCommand<{ node: CDPNode }>(
      tabId,
      'DOM.describeNode',
      { backendNodeId }
    );

    if (result.success && result.result) {
      return { ...result, result: result.result.node };
    }
    return { success: false, error: result.error, duration: result.duration };
  }

  /**
   * Get box model for node.
   */
  async getBoxModel(
    tabId: number,
    nodeId: number
  ): Promise<CDPCommandResult<BoxModel>> {
    const result = await this.sendCommand<{ model: BoxModel }>(
      tabId,
      'DOM.getBoxModel',
      { nodeId }
    );

    if (result.success && result.result) {
      return { ...result, result: result.result.model };
    }
    return { success: false, error: result.error, duration: result.duration };
  }

  /**
   * Get box model by backend node ID.
   */
  async getBoxModelByBackendId(
    tabId: number,
    backendNodeId: number
  ): Promise<CDPCommandResult<BoxModel>> {
    const result = await this.sendCommand<{ model: BoxModel }>(
      tabId,
      'DOM.getBoxModel',
      { backendNodeId }
    );

    if (result.success && result.result) {
      return { ...result, result: result.result.model };
    }
    return { success: false, error: result.error, duration: result.duration };
  }

  // ==========================================================================
  // ACCESSIBILITY METHODS
  // ==========================================================================

  /**
   * Get full accessibility tree.
   */
  async getAccessibilityTree(tabId: number): Promise<CDPCommandResult<AXNode[]>> {
    const result = await this.sendCommand<{ nodes: AXNode[] }>(
      tabId,
      'Accessibility.getFullAXTree',
      {}
    );

    if (result.success && result.result) {
      return { ...result, result: result.result.nodes };
    }
    return { success: false, error: result.error, duration: result.duration };
  }

  /**
   * Get accessibility node for DOM node.
   */
  async getAccessibilityNode(
    tabId: number,
    backendNodeId: number
  ): Promise<CDPCommandResult<AXNode>> {
    const result = await this.sendCommand<{ nodes: AXNode[] }>(
      tabId,
      'Accessibility.getPartialAXTree',
      { backendNodeId, fetchRelatives: false }
    );

    if (result.success && result.result?.nodes?.[0]) {
      return { ...result, result: result.result.nodes[0] };
    }
    return { success: false, error: result.error ?? 'No accessibility node', duration: result.duration };
  }

  // ==========================================================================
  // INPUT METHODS
  // ==========================================================================

  /**
   * Dispatch mouse event.
   */
  async dispatchMouseEvent(
    tabId: number,
    type: 'mousePressed' | 'mouseReleased' | 'mouseMoved' | 'mouseWheel',
    x: number,
    y: number,
    options?: {
      button?: 'none' | 'left' | 'middle' | 'right';
      clickCount?: number;
      modifiers?: number;
    }
  ): Promise<CDPCommandResult<void>> {
    return this.sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type,
      x,
      y,
      button: options?.button ?? 'left',
      clickCount: options?.clickCount ?? 1,
      modifiers: options?.modifiers ?? 0
    });
  }

  /**
   * Insert text (for typing).
   */
  async insertText(tabId: number, text: string): Promise<CDPCommandResult<void>> {
    return this.sendCommand(tabId, 'Input.insertText', { text });
  }

  /**
   * Take screenshot.
   */
  async captureScreenshot(
    tabId: number,
    options?: {
      format?: 'jpeg' | 'png' | 'webp';
      quality?: number;
      clip?: { x: number; y: number; width: number; height: number; scale: number };
    }
  ): Promise<CDPCommandResult<string>> {
    const result = await this.sendCommand<{ data: string }>(
      tabId,
      'Page.captureScreenshot',
      {
        format: options?.format ?? 'png',
        quality: options?.quality,
        clip: options?.clip
      }
    );

    if (result.success && result.result) {
      return { ...result, result: result.result.data };
    }
    return { success: false, error: result.error, duration: result.duration };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clean up all connections.
   */
  async cleanup(): Promise<void> {
    const tabIds = Array.from(this.connections.keys());
    await Promise.all(tabIds.map(tabId => this.detach(tabId)));
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private async withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on certain errors
        if (lastError.message.includes('not attached') ||
            lastError.message.includes('No node with given id')) {
          throw lastError;
        }

        if (i < attempts - 1) {
          await new Promise(r => setTimeout(r, this.config.retryDelayMs));
        }
      }
    }

    throw lastError ?? new Error('All retry attempts failed');
  }

  private handleDebuggerEvent(
    source: chrome.debugger.Debuggee,
    method: string,
    params: unknown
  ): void {
    const tabId = source.tabId;
    if (!tabId) return;

    const connection = this.connections.get(tabId);
    if (!connection) return;

    const listeners = connection.eventListeners.get(method);
    if (listeners) {
      for (const listener of Array.from(listeners)) {
        try {
          listener(params);
        } catch (error) {
          console.error(`[CDPService] Event listener error for ${method}:`, error);
        }
      }
    }
  }

  private handleDebuggerDetach(
    source: chrome.debugger.Debuggee,
    reason: string
  ): void {
    const tabId = source.tabId;
    if (!tabId) return;

    console.log(`[CDPService] Debugger detached from tab ${tabId}: ${reason}`);

    const connection = this.connections.get(tabId);
    if (connection) {
      for (const pending of Array.from(connection.pendingCommands.values())) {
        clearTimeout(pending.timeoutHandle);
        pending.reject(new Error(`Debugger detached: ${reason}`));
      }
      this.connections.delete(tabId);
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let cdpServiceInstance: CDPService | null = null;

/**
 * Get or create the singleton CDPService instance.
 */
export function getCDPService(config?: Partial<CDPServiceConfig>): CDPService {
  if (!cdpServiceInstance) {
    cdpServiceInstance = new CDPService(config);
    cdpServiceInstance.initialize();
  }
  return cdpServiceInstance;
}

// Legacy export for backward compatibility
export const cdpService = getCDPService();
