/**
 * @fileoverview Playwright Locators Service
 * @description Implements Playwright-style locator methods for element location.
 * Powers cdp_semantic (0.95) and cdp_power (0.90) strategies.
 * 
 * @module services/PlaywrightLocators
 * @version 1.0.0
 * @since Phase 4
 */

import { CDPService, getCDPService } from './CDPService';
import {
  AccessibilityService,
  getAccessibilityService,
  type ARIARole
} from './AccessibilityService';
import type { LocatorStrategy } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

export type LocatorMethod =
  | 'getByRole' | 'getByText' | 'getByLabel' | 'getByPlaceholder'
  | 'getByTestId' | 'getByAltText' | 'getByTitle' | 'locator';

export interface LocatorResult {
  found: boolean;
  backendNodeId?: number;
  nodeId?: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  confidence: number;
  duration: number;
  method: LocatorMethod;
  matchCount: number;
  error?: string;
}

export interface LocatorOptions {
  exact?: boolean;
  includeHidden?: boolean;
  timeout?: number;
}

export interface GetByRoleOptions extends LocatorOptions {
  name?: string | RegExp;
  checked?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  pressed?: boolean;
  selected?: boolean;
  level?: number;
}

export interface GetByTextOptions extends LocatorOptions {
  substring?: boolean;
}

export interface GetByTestIdOptions extends LocatorOptions {
  testIdAttribute?: string;
}

export interface PlaywrightLocator {
  method: LocatorMethod;
  arg: string;
  options?: Record<string, unknown>;
}

// ============================================================================
// CLASS
// ============================================================================

export class PlaywrightLocators {
  constructor(
    private cdpService: CDPService,
    private accessibilityService: AccessibilityService
  ) {}

  async getByRole(tabId: number, role: string, options?: GetByRoleOptions): Promise<LocatorResult> {
    const startTime = Date.now();
    try {
      const matches = await this.accessibilityService.getByRole(tabId, {
        role: role as ARIARole,
        name: options?.name,
        exact: options?.exact,
        includeHidden: options?.includeHidden,
        checked: options?.checked,
        disabled: options?.disabled,
        expanded: options?.expanded,
        pressed: options?.pressed,
        selected: options?.selected,
        level: options?.level
      });

      if (matches.length === 0) {
        return this.buildResult(false, 'getByRole', startTime, {
          error: `No element with role "${role}"${options?.name ? ` and name "${options.name}"` : ''} found`,
          matchCount: 0
        });
      }

      const match = matches[0];
      const boundingBox = await this.getBoundingBox(tabId, match.backendNodeId);

      return this.buildResult(true, 'getByRole', startTime, {
        backendNodeId: match.backendNodeId,
        boundingBox: boundingBox ?? undefined,
        confidence: match.confidence,
        matchCount: matches.length
      });
    } catch (error) {
      return this.buildResult(false, 'getByRole', startTime, {
        error: error instanceof Error ? error.message : 'getByRole failed',
        matchCount: 0
      });
    }
  }

  async getByText(tabId: number, text: string | RegExp, options?: GetByTextOptions): Promise<LocatorResult> {
    const startTime = Date.now();
    try {
      const axMatches = await this.accessibilityService.getByText(tabId, {
        text,
        exact: options?.exact,
        includeHidden: options?.includeHidden
      });

      if (axMatches.length > 0) {
        const match = axMatches[0];
        const boundingBox = await this.getBoundingBox(tabId, match.backendNodeId);
        return this.buildResult(true, 'getByText', startTime, {
          backendNodeId: match.backendNodeId,
          boundingBox: boundingBox ?? undefined,
          confidence: match.confidence,
          matchCount: axMatches.length
        });
      }

      const textStr = text instanceof RegExp ? text.source : text;
      return this.buildResult(false, 'getByText', startTime, {
        error: `No element with text "${textStr}" found`,
        matchCount: 0
      });
    } catch (error) {
      return this.buildResult(false, 'getByText', startTime, {
        error: error instanceof Error ? error.message : 'getByText failed',
        matchCount: 0
      });
    }
  }

  async getByLabel(tabId: number, label: string | RegExp, options?: LocatorOptions): Promise<LocatorResult> {
    const startTime = Date.now();
    try {
      const matches = await this.accessibilityService.getByLabel(tabId, {
        label,
        exact: options?.exact
      });

      if (matches.length === 0) {
        const labelStr = label instanceof RegExp ? label.source : label;
        return this.buildResult(false, 'getByLabel', startTime, {
          error: `No element with label "${labelStr}" found`,
          matchCount: 0
        });
      }

      const match = matches[0];
      const boundingBox = await this.getBoundingBox(tabId, match.backendNodeId);
      return this.buildResult(true, 'getByLabel', startTime, {
        backendNodeId: match.backendNodeId,
        boundingBox: boundingBox ?? undefined,
        confidence: match.confidence,
        matchCount: matches.length
      });
    } catch (error) {
      return this.buildResult(false, 'getByLabel', startTime, {
        error: error instanceof Error ? error.message : 'getByLabel failed',
        matchCount: 0
      });
    }
  }

  async getByPlaceholder(tabId: number, placeholder: string | RegExp, options?: LocatorOptions): Promise<LocatorResult> {
    const startTime = Date.now();
    try {
      const str = placeholder instanceof RegExp ? placeholder.source : placeholder;
      const exact = options?.exact ?? false;
      const selector = exact ? `[placeholder="${str}"]` : `[placeholder*="${str}"]`;
      
      const result = await this.cdpService.querySelector(tabId, selector);
      if (result.success && result.result) {
        const descResult = await this.cdpService.describeNode(tabId, result.result);
        if (descResult.success && descResult.result?.backendNodeId) {
          const boundingBox = await this.getBoundingBox(tabId, descResult.result.backendNodeId);
          return this.buildResult(true, 'getByPlaceholder', startTime, {
            backendNodeId: descResult.result.backendNodeId,
            nodeId: result.result,
            boundingBox: boundingBox ?? undefined,
            confidence: 0.88,
            matchCount: 1
          });
        }
      }
      return this.buildResult(false, 'getByPlaceholder', startTime, {
        error: `No element with placeholder "${str}" found`,
        matchCount: 0
      });
    } catch (error) {
      return this.buildResult(false, 'getByPlaceholder', startTime, {
        error: error instanceof Error ? error.message : 'getByPlaceholder failed',
        matchCount: 0
      });
    }
  }

  async getByTestId(tabId: number, testId: string | RegExp, options?: GetByTestIdOptions): Promise<LocatorResult> {
    const startTime = Date.now();
    const attr = options?.testIdAttribute ?? 'data-testid';
    try {
      const str = testId instanceof RegExp ? testId.source : testId;
      const selector = `[${attr}="${str}"]`;
      
      const result = await this.cdpService.querySelector(tabId, selector);
      if (result.success && result.result) {
        const descResult = await this.cdpService.describeNode(tabId, result.result);
        if (descResult.success && descResult.result?.backendNodeId) {
          const boundingBox = await this.getBoundingBox(tabId, descResult.result.backendNodeId);
          return this.buildResult(true, 'getByTestId', startTime, {
            backendNodeId: descResult.result.backendNodeId,
            nodeId: result.result,
            boundingBox: boundingBox ?? undefined,
            confidence: 0.95,
            matchCount: 1
          });
        }
      }
      return this.buildResult(false, 'getByTestId', startTime, {
        error: `No element with ${attr}="${str}" found`,
        matchCount: 0
      });
    } catch (error) {
      return this.buildResult(false, 'getByTestId', startTime, {
        error: error instanceof Error ? error.message : 'getByTestId failed',
        matchCount: 0
      });
    }
  }

  async getByAltText(tabId: number, alt: string | RegExp, options?: LocatorOptions): Promise<LocatorResult> {
    const startTime = Date.now();
    try {
      const str = alt instanceof RegExp ? alt.source : alt;
      const exact = options?.exact ?? false;
      const selector = exact ? `[alt="${str}"]` : `[alt*="${str}"]`;
      
      const result = await this.cdpService.querySelector(tabId, selector);
      if (result.success && result.result) {
        const descResult = await this.cdpService.describeNode(tabId, result.result);
        if (descResult.success && descResult.result?.backendNodeId) {
          const boundingBox = await this.getBoundingBox(tabId, descResult.result.backendNodeId);
          return this.buildResult(true, 'getByAltText', startTime, {
            backendNodeId: descResult.result.backendNodeId,
            nodeId: result.result,
            boundingBox: boundingBox ?? undefined,
            confidence: 0.90,
            matchCount: 1
          });
        }
      }
      return this.buildResult(false, 'getByAltText', startTime, {
        error: `No element with alt="${str}" found`,
        matchCount: 0
      });
    } catch (error) {
      return this.buildResult(false, 'getByAltText', startTime, {
        error: error instanceof Error ? error.message : 'getByAltText failed',
        matchCount: 0
      });
    }
  }

  async getByTitle(tabId: number, title: string | RegExp, options?: LocatorOptions): Promise<LocatorResult> {
    const startTime = Date.now();
    try {
      const str = title instanceof RegExp ? title.source : title;
      const exact = options?.exact ?? false;
      const selector = exact ? `[title="${str}"]` : `[title*="${str}"]`;
      
      const result = await this.cdpService.querySelector(tabId, selector);
      if (result.success && result.result) {
        const descResult = await this.cdpService.describeNode(tabId, result.result);
        if (descResult.success && descResult.result?.backendNodeId) {
          const boundingBox = await this.getBoundingBox(tabId, descResult.result.backendNodeId);
          return this.buildResult(true, 'getByTitle', startTime, {
            backendNodeId: descResult.result.backendNodeId,
            nodeId: result.result,
            boundingBox: boundingBox ?? undefined,
            confidence: 0.85,
            matchCount: 1
          });
        }
      }
      return this.buildResult(false, 'getByTitle', startTime, {
        error: `No element with title="${str}" found`,
        matchCount: 0
      });
    } catch (error) {
      return this.buildResult(false, 'getByTitle', startTime, {
        error: error instanceof Error ? error.message : 'getByTitle failed',
        matchCount: 0
      });
    }
  }

  async locator(tabId: number, selector: string): Promise<LocatorResult> {
    const startTime = Date.now();
    try {
      const result = await this.cdpService.querySelector(tabId, selector);
      if (result.success && result.result) {
        const descResult = await this.cdpService.describeNode(tabId, result.result);
        if (descResult.success && descResult.result?.backendNodeId) {
          const boundingBox = await this.getBoundingBox(tabId, descResult.result.backendNodeId);
          return this.buildResult(true, 'locator', startTime, {
            backendNodeId: descResult.result.backendNodeId,
            nodeId: result.result,
            boundingBox: boundingBox ?? undefined,
            confidence: 0.75,
            matchCount: 1
          });
        }
      }
      return this.buildResult(false, 'locator', startTime, {
        error: `No element matching "${selector}" found`,
        matchCount: 0
      });
    } catch (error) {
      return this.buildResult(false, 'locator', startTime, {
        error: error instanceof Error ? error.message : 'locator failed',
        matchCount: 0
      });
    }
  }

  async executeStrategy(tabId: number, strategy: LocatorStrategy): Promise<LocatorResult> {
    const startTime = Date.now();
    switch (strategy.type) {
      case 'cdp_semantic':
        if (strategy.metadata && 'role' in strategy.metadata) {
          return this.getByRole(tabId, strategy.metadata.role, { name: strategy.metadata.name });
        }
        break;
      case 'cdp_power':
        if (strategy.metadata && 'text' in strategy.metadata && strategy.metadata.text) {
          const r = await this.getByText(tabId, strategy.metadata.text);
          if (r.found) return r;
        }
        if (strategy.metadata && 'label' in strategy.metadata && strategy.metadata.label) {
          const r = await this.getByLabel(tabId, strategy.metadata.label);
          if (r.found) return r;
        }
        if (strategy.metadata && 'placeholder' in strategy.metadata && strategy.metadata.placeholder) {
          const r = await this.getByPlaceholder(tabId, strategy.metadata.placeholder);
          if (r.found) return r;
        }
        if (strategy.metadata && 'testId' in strategy.metadata && strategy.metadata.testId) {
          const r = await this.getByTestId(tabId, strategy.metadata.testId);
          if (r.found) return r;
        }
        break;
      case 'dom_selector':
      case 'css_selector':
        if (strategy.value) return this.locator(tabId, strategy.value);
        break;
    }
    return this.buildResult(false, 'locator', startTime, {
      error: `Strategy "${strategy.type}" not supported`,
      matchCount: 0
    });
  }

  async getBoundingBox(tabId: number, backendNodeId: number): Promise<{ x: number; y: number; width: number; height: number } | null> {
    try {
      const boxResult = await this.cdpService.getBoxModelByBackendId(tabId, backendNodeId);
      if (!boxResult.success || !boxResult.result) return null;
      const b = boxResult.result.border;
      const x = Math.min(b[0], b[2], b[4], b[6]);
      const y = Math.min(b[1], b[3], b[5], b[7]);
      return { x, y, width: Math.max(b[0], b[2], b[4], b[6]) - x, height: Math.max(b[1], b[3], b[5], b[7]) - y };
    } catch { return null; }
  }

  async getClickPoint(tabId: number, backendNodeId: number): Promise<{ x: number; y: number } | null> {
    const box = await this.getBoundingBox(tabId, backendNodeId);
    return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null;
  }

  async isVisible(tabId: number, backendNodeId: number): Promise<boolean> {
    const box = await this.getBoundingBox(tabId, backendNodeId);
    return box !== null && box.width > 0 && box.height > 0;
  }

  private buildResult(found: boolean, method: LocatorMethod, startTime: number, data?: Partial<LocatorResult>): LocatorResult {
    return {
      found,
      method,
      duration: Date.now() - startTime,
      confidence: data?.confidence ?? (found ? 0.85 : 0),
      matchCount: data?.matchCount ?? (found ? 1 : 0),
      backendNodeId: data?.backendNodeId,
      nodeId: data?.nodeId,
      boundingBox: data?.boundingBox,
      error: data?.error
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: PlaywrightLocators | null = null;

export function getPlaywrightLocators(
  cdpService: CDPService,
  accessibilityService: AccessibilityService
): PlaywrightLocators {
  if (!instance) {
    instance = new PlaywrightLocators(cdpService, accessibilityService);
  }
  return instance;
}

// Legacy export for backward compatibility
export const playwrightLocators = getPlaywrightLocators(getCDPService(), getAccessibilityService(getCDPService()));
