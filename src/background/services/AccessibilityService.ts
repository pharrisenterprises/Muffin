/**
 * @fileoverview Accessibility Service
 * @description High-level accessibility tree operations for Playwright-style
 * semantic locators. Enables getByRole, getByLabel, getByText methods.
 * Powers the cdp_semantic strategy (highest confidence: 0.95).
 * 
 * @module services/AccessibilityService
 * @version 1.0.0
 * @since Phase 4
 */

import { CDPService, getCDPService, type CDPCommandResult } from './CDPService';
import type { AXNode, AXProperty, AXValue } from '../../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AccessibilityServiceConfig {
  cacheTtlMs: number;
  includeIgnored: boolean;
  maxDepth: number;
}

const DEFAULT_CONFIG: AccessibilityServiceConfig = {
  cacheTtlMs: 1000,
  includeIgnored: false,
  maxDepth: 100
};

export type ARIARole =
  | 'alert' | 'alertdialog' | 'application' | 'article' | 'banner'
  | 'button' | 'cell' | 'checkbox' | 'columnheader' | 'combobox'
  | 'complementary' | 'contentinfo' | 'definition' | 'dialog' | 'document'
  | 'feed' | 'figure' | 'form' | 'grid' | 'gridcell' | 'group'
  | 'heading' | 'img' | 'link' | 'list' | 'listbox' | 'listitem'
  | 'log' | 'main' | 'menu' | 'menubar' | 'menuitem' | 'menuitemcheckbox'
  | 'menuitemradio' | 'navigation' | 'none' | 'note' | 'option'
  | 'presentation' | 'progressbar' | 'radio' | 'radiogroup' | 'region'
  | 'row' | 'rowgroup' | 'rowheader' | 'scrollbar' | 'search' | 'searchbox'
  | 'separator' | 'slider' | 'spinbutton' | 'status' | 'switch' | 'tab'
  | 'table' | 'tablist' | 'tabpanel' | 'term' | 'textbox' | 'timer'
  | 'toolbar' | 'tooltip' | 'tree' | 'treegrid' | 'treeitem'
  | string;

export interface RoleMatchOptions {
  role: ARIARole;
  name?: string | RegExp;
  exact?: boolean;
  includeHidden?: boolean;
  expanded?: boolean;
  pressed?: boolean;
  checked?: boolean | 'mixed';
  disabled?: boolean;
  selected?: boolean;
  level?: number;
}

export interface TextMatchOptions {
  text: string | RegExp;
  exact?: boolean;
  includeHidden?: boolean;
}

export interface LabelMatchOptions {
  label: string | RegExp;
  exact?: boolean;
}

export interface AXMatchResult {
  axNode: AXNode;
  backendNodeId: number;
  accessibleName: string;
  role: string;
  confidence: number;
  matchType: 'role' | 'name' | 'label' | 'description' | 'text';
}

interface CachedAXTree {
  nodes: AXNode[];
  cachedAt: number;
  tabId: number;
}

// ============================================================================
// ACCESSIBILITY SERVICE CLASS
// ============================================================================

export class AccessibilityService {
  private cdpService: CDPService;
  private config: AccessibilityServiceConfig;
  private cache: Map<number, CachedAXTree> = new Map();

  constructor(cdpService: CDPService, config?: Partial<AccessibilityServiceConfig>) {
    this.cdpService = cdpService;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // TREE MANAGEMENT
  // ==========================================================================

  async getTree(tabId: number, forceRefresh = false): Promise<AXNode[]> {
    if (!forceRefresh) {
      const cached = this.cache.get(tabId);
      if (cached && Date.now() - cached.cachedAt < this.config.cacheTtlMs) {
        return cached.nodes;
      }
    }

    const result = await this.cdpService.getAccessibilityTree(tabId);
    if (!result.success || !result.result) {
      console.error('[AccessibilityService] Failed to get tree:', result.error);
      return [];
    }

    this.cache.set(tabId, {
      nodes: result.result,
      cachedAt: Date.now(),
      tabId
    });

    return result.result;
  }

  clearCache(tabId?: number): void {
    if (tabId !== undefined) {
      this.cache.delete(tabId);
    } else {
      this.cache.clear();
    }
  }

  // ==========================================================================
  // LOCATOR METHODS
  // ==========================================================================

  async getByRole(tabId: number, options: RoleMatchOptions): Promise<AXMatchResult[]> {
    const tree = await this.getTree(tabId);
    const matches: AXMatchResult[] = [];

    for (const node of tree) {
      if (node.ignored && !this.config.includeIgnored) continue;
      if (!options.includeHidden && this.isHidden(node)) continue;

      const role = this.getRole(node);
      if (role.toLowerCase() !== options.role.toLowerCase()) continue;

      if (options.name !== undefined) {
        const name = this.getAccessibleName(node);
        if (!this.matchText(name, options.name, options.exact ?? false)) continue;
      }

      if (!this.matchesStates(node, options)) continue;

      if (options.level !== undefined && options.role === 'heading') {
        if (this.getHeadingLevel(node) !== options.level) continue;
      }

      const match = this.nodeToMatchResult(node, 'role');
      if (match) {
        match.confidence = options.name ? 0.95 : 0.85;
        matches.push(match);
      }
    }

    return matches;
  }

  async getByName(
    tabId: number,
    name: string | RegExp,
    options?: { exact?: boolean; includeHidden?: boolean }
  ): Promise<AXMatchResult[]> {
    const tree = await this.getTree(tabId);
    const matches: AXMatchResult[] = [];

    for (const node of tree) {
      if (node.ignored && !this.config.includeIgnored) continue;
      if (!options?.includeHidden && this.isHidden(node)) continue;

      const nodeName = this.getAccessibleName(node);
      if (nodeName && this.matchText(nodeName, name, options?.exact ?? false)) {
        const match = this.nodeToMatchResult(node, 'name');
        if (match) {
          match.confidence = options?.exact ? 0.92 : 0.85;
          matches.push(match);
        }
      }
    }

    return matches;
  }

  async getByLabel(tabId: number, options: LabelMatchOptions): Promise<AXMatchResult[]> {
    const tree = await this.getTree(tabId);
    const matches: AXMatchResult[] = [];
    const formRoles = ['textbox', 'checkbox', 'radio', 'combobox', 'listbox', 'spinbutton', 'slider'];

    for (const node of tree) {
      if (node.ignored && !this.config.includeIgnored) continue;

      const name = this.getAccessibleName(node);
      if (!name) continue;

      const role = this.getRole(node);
      if (formRoles.includes(role) && this.matchText(name, options.label, options.exact ?? false)) {
        const match = this.nodeToMatchResult(node, 'label');
        if (match) {
          match.confidence = 0.90;
          matches.push(match);
        }
      }
    }

    return matches;
  }

  async getByText(tabId: number, options: TextMatchOptions): Promise<AXMatchResult[]> {
    const tree = await this.getTree(tabId);
    const matches: AXMatchResult[] = [];

    for (const node of tree) {
      if (node.ignored && !this.config.includeIgnored) continue;
      if (!options.includeHidden && this.isHidden(node)) continue;

      const name = this.getAccessibleName(node);
      if (name && this.matchText(name, options.text, options.exact ?? false)) {
        const match = this.nodeToMatchResult(node, 'text');
        if (match) {
          match.confidence = options.exact ? 0.90 : 0.80;
          matches.push(match);
        }
      }
    }

    return matches;
  }

  async getByDescription(tabId: number, description: string | RegExp): Promise<AXMatchResult[]> {
    const tree = await this.getTree(tabId);
    const matches: AXMatchResult[] = [];

    for (const node of tree) {
      if (node.ignored) continue;

      const desc = node.description?.value;
      if (typeof desc === 'string' && this.matchText(desc, description, false)) {
        const match = this.nodeToMatchResult(node, 'description');
        if (match) {
          match.confidence = 0.85;
          matches.push(match);
        }
      }
    }

    return matches;
  }

  async getNodeInfo(tabId: number, backendNodeId: number): Promise<AXNode | null> {
    const result = await this.cdpService.getAccessibilityNode(tabId, backendNodeId);
    return result.success ? result.result ?? null : null;
  }

  // Legacy methods for backward compatibility
  async findByRole(tabId: number, role: string, options?: { name?: string; exact?: boolean }): Promise<AXNode | null> {
    const matches = await this.getByRole(tabId, { role, name: options?.name, exact: options?.exact });
    return matches[0]?.axNode ?? null;
  }

  async getFullTree(tabId: number): Promise<AXNode[]> {
    return this.getTree(tabId);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  getAccessibleName(node: AXNode): string {
    const value = node.name?.value;
    return typeof value === 'string' ? value.trim() : '';
  }

  getRole(node: AXNode): string {
    const value = node.role?.value;
    return typeof value === 'string' ? value : '';
  }

  isHidden(node: AXNode): boolean {
    if (node.ignored) return true;
    return this.getPropertyValue(node, 'hidden') === true;
  }

  matchesStates(
    node: AXNode,
    states: Partial<Pick<RoleMatchOptions, 'expanded' | 'pressed' | 'checked' | 'disabled' | 'selected'>>
  ): boolean {
    if (states.expanded !== undefined && this.getPropertyValue(node, 'expanded') !== states.expanded) return false;
    if (states.pressed !== undefined && this.getPropertyValue(node, 'pressed') !== states.pressed) return false;
    if (states.disabled !== undefined && this.getPropertyValue(node, 'disabled') !== states.disabled) return false;
    if (states.selected !== undefined && this.getPropertyValue(node, 'selected') !== states.selected) return false;
    if (states.checked !== undefined) {
      const checked = this.getPropertyValue(node, 'checked');
      if (states.checked === 'mixed' ? checked !== 'mixed' : checked !== states.checked) return false;
    }
    return true;
  }

  getHeadingLevel(node: AXNode): number | null {
    const level = this.getPropertyValue(node, 'level');
    return typeof level === 'number' && level >= 1 && level <= 6 ? level : null;
  }

  buildLocatorString(match: AXMatchResult): string {
    const { role, accessibleName } = match;
    if (accessibleName) {
      const escaped = accessibleName.replace(/'/g, "\\'");
      return `getByRole('${role}', { name: '${escaped}' })`;
    }
    return `getByRole('${role}')`;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private getPropertyValue(node: AXNode, name: string): unknown {
    const prop = node.properties?.find(p => p.name === name);
    return prop?.value?.value;
  }

  private matchText(value: string, pattern: string | RegExp, exact: boolean): boolean {
    if (!value) return false;
    if (pattern instanceof RegExp) return pattern.test(value);
    const v = value.toLowerCase().trim();
    const p = pattern.toLowerCase().trim();
    return exact ? v === p : v.includes(p);
  }

  private nodeToMatchResult(node: AXNode, matchType: AXMatchResult['matchType']): AXMatchResult | null {
    if (!node.backendDOMNodeId) return null;
    return {
      axNode: node,
      backendNodeId: node.backendDOMNodeId,
      accessibleName: this.getAccessibleName(node),
      role: this.getRole(node),
      confidence: 0.85,
      matchType
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: AccessibilityService | null = null;

export function getAccessibilityService(cdpService: CDPService): AccessibilityService {
  if (!instance) {
    instance = new AccessibilityService(cdpService);
  }
  return instance;
}

// Legacy export for backward compatibility
export const accessibilityService = getAccessibilityService(getCDPService());
