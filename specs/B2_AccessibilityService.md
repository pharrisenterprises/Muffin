# AccessibilityService Content Specification

**File ID:** B2  
**File Path:** `src/background/services/AccessibilityService.ts`  
**Status:** FIX (existing file with errors)  
**Priority:** P0

---

## Purpose

Provides high-level accessibility tree operations built on top of CDPService. Enables Playwright-style semantic locators by traversing the Chrome accessibility tree to find elements by their ARIA role, accessible name, description, and other semantic properties. This service powers the `cdp_semantic` strategy (highest confidence at 0.95) by providing getByRole, getByName, and related methods that match elements based on how assistive technologies perceive them.

---

## Dependencies

### Uses (imports from)
- `./CDPService`: CDPService, CDPCommandResult, AXNode, AXValue, AXProperty
- `../../types/cdp`: Additional CDP type definitions

### Used By (exports to)
- `./PlaywrightLocators`: Uses for semantic element location
- `./DecisionEngine`: Uses for cdp_semantic strategy evaluation
- `../background.ts`: Message handler delegation

---

## Interfaces

```typescript
/**
 * Accessibility service configuration
 */
interface AccessibilityServiceConfig {
  /** Cache accessibility tree for this many ms (default: 1000) */
  cacheTtlMs: number;
  /** Include ignored nodes in queries (default: false) */
  includeIgnored: boolean;
  /** Maximum tree depth to traverse (default: 100) */
  maxDepth: number;
}

/**
 * Role matching options
 */
interface RoleMatchOptions {
  /** Exact role to match */
  role: ARIARole;
  /** Accessible name to match (optional) */
  name?: string | RegExp;
  /** Whether name match is exact (default: false = contains) */
  exact?: boolean;
  /** Include hidden elements (default: false) */
  includeHidden?: boolean;
  /** Match expanded state */
  expanded?: boolean;
  /** Match pressed state */
  pressed?: boolean;
  /** Match checked state */
  checked?: boolean | 'mixed';
  /** Match disabled state */
  disabled?: boolean;
  /** Match selected state */
  selected?: boolean;
  /** Match level (for headings) */
  level?: number;
}

/**
 * Text matching options
 */
interface TextMatchOptions {
  /** Text to match */
  text: string | RegExp;
  /** Whether match is exact (default: false = contains) */
  exact?: boolean;
  /** Include hidden elements (default: false) */
  includeHidden?: boolean;
}

/**
 * Label matching options
 */
interface LabelMatchOptions {
  /** Label text to match */
  label: string | RegExp;
  /** Whether match is exact (default: false = contains) */
  exact?: boolean;
}

/**
 * Accessibility node match result
 */
interface AXMatchResult {
  /** The matching accessibility node */
  axNode: AXNode;
  /** Backend DOM node ID for element interaction */
  backendNodeId: number;
  /** Computed accessible name */
  accessibleName: string;
  /** Computed accessible role */
  role: string;
  /** Match confidence (0-1) */
  confidence: number;
  /** How the match was found */
  matchType: 'role' | 'name' | 'label' | 'description' | 'text';
}

/**
 * ARIA roles (subset of common roles)
 */
type ARIARole =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'cell'
  | 'checkbox'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'feed'
  | 'figure'
  | 'form'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem'
  | string; // Allow custom roles

/**
 * Cached accessibility tree
 */
interface CachedAXTree {
  /** The tree nodes */
  nodes: AXNode[];
  /** Cache timestamp */
  cachedAt: number;
  /** Tab ID */
  tabId: number;
}
```

---

## Functions

```typescript
/**
 * AccessibilityService - High-level accessibility tree operations
 */
class AccessibilityService {
  private cdpService: CDPService;
  private config: AccessibilityServiceConfig;
  private cache: Map<number, CachedAXTree>;

  /**
   * Create new AccessibilityService instance
   * @param cdpService - CDP service instance
   * @param config - Service configuration
   */
  constructor(cdpService: CDPService, config?: Partial<AccessibilityServiceConfig>);

  /**
   * Get element by ARIA role and optional name
   * Equivalent to Playwright's getByRole()
   * @param tabId - Target tab
   * @param options - Role match options
   * @returns Promise resolving to match results
   */
  async getByRole(tabId: number, options: RoleMatchOptions): Promise<AXMatchResult[]>;

  /**
   * Get element by accessible name
   * @param tabId - Target tab
   * @param name - Name to match
   * @param options - Match options
   * @returns Promise resolving to match results
   */
  async getByName(
    tabId: number,
    name: string | RegExp,
    options?: { exact?: boolean; includeHidden?: boolean }
  ): Promise<AXMatchResult[]>;

  /**
   * Get element by associated label text
   * Equivalent to Playwright's getByLabel()
   * @param tabId - Target tab
   * @param options - Label match options
   * @returns Promise resolving to match results
   */
  async getByLabel(tabId: number, options: LabelMatchOptions): Promise<AXMatchResult[]>;

  /**
   * Get element by text content
   * Equivalent to Playwright's getByText()
   * @param tabId - Target tab
   * @param options - Text match options
   * @returns Promise resolving to match results
   */
  async getByText(tabId: number, options: TextMatchOptions): Promise<AXMatchResult[]>;

  /**
   * Get element by description (aria-describedby)
   * @param tabId - Target tab
   * @param description - Description to match
   * @returns Promise resolving to match results
   */
  async getByDescription(
    tabId: number,
    description: string | RegExp
  ): Promise<AXMatchResult[]>;

  /**
   * Get the full accessibility tree
   * @param tabId - Target tab
   * @param forceRefresh - Bypass cache
   * @returns Promise resolving to AX nodes
   */
  async getTree(tabId: number, forceRefresh?: boolean): Promise<AXNode[]>;

  /**
   * Get accessibility info for a specific DOM node
   * @param tabId - Target tab
   * @param backendNodeId - Backend DOM node ID
   * @returns Promise resolving to AX node or null
   */
  async getNodeInfo(tabId: number, backendNodeId: number): Promise<AXNode | null>;

  /**
   * Find all nodes matching a predicate
   * @param tabId - Target tab
   * @param predicate - Filter function
   * @returns Promise resolving to matching nodes
   */
  async findNodes(
    tabId: number,
    predicate: (node: AXNode) => boolean
  ): Promise<AXMatchResult[]>;

  /**
   * Get computed accessible name for a node
   * @param node - AX node
   * @returns Accessible name string
   */
  getAccessibleName(node: AXNode): string;

  /**
   * Get computed role for a node
   * @param node - AX node
   * @returns Role string
   */
  getRole(node: AXNode): string;

  /**
   * Check if node matches state criteria
   * @param node - AX node
   * @param states - State criteria
   * @returns Whether node matches
   */
  matchesStates(
    node: AXNode,
    states: Partial<Pick<RoleMatchOptions, 'expanded' | 'pressed' | 'checked' | 'disabled' | 'selected'>>
  ): boolean;

  /**
   * Check if node is hidden
   * @param node - AX node
   * @returns Whether node is hidden
   */
  isHidden(node: AXNode): boolean;

  /**
   * Get heading level for heading nodes
   * @param node - AX node
   * @returns Heading level (1-6) or null
   */
  getHeadingLevel(node: AXNode): number | null;

  /**
   * Clear cache for a tab
   * @param tabId - Tab ID (or all if not specified)
   */
  clearCache(tabId?: number): void;

  /**
   * Build a locator string for a matched node
   * @param match - Match result
   * @returns Playwright-style locator string
   */
  buildLocatorString(match: AXMatchResult): string;

  // Private methods
  private matchText(value: string, pattern: string | RegExp, exact: boolean): boolean;
  private getPropertyValue(node: AXNode, propertyName: string): any;
  private nodeToMatchResult(node: AXNode, matchType: AXMatchResult['matchType']): AXMatchResult | null;
  private traverseTree(nodes: AXNode[], predicate: (node: AXNode) => boolean): AXNode[];
}

export {
  AccessibilityService,
  AccessibilityServiceConfig,
  RoleMatchOptions,
  TextMatchOptions,
  LabelMatchOptions,
  AXMatchResult,
  ARIARole
};
```

---

## Key Implementation Details

### Constructor and Cache Management
```typescript
constructor(cdpService: CDPService, config?: Partial<AccessibilityServiceConfig>) {
  this.cdpService = cdpService;
  this.config = {
    cacheTtlMs: config?.cacheTtlMs ?? 1000,
    includeIgnored: config?.includeIgnored ?? false,
    maxDepth: config?.maxDepth ?? 100
  };
  this.cache = new Map();
}

async getTree(tabId: number, forceRefresh: boolean = false): Promise<AXNode[]> {
  // Check cache
  if (!forceRefresh) {
    const cached = this.cache.get(tabId);
    if (cached && Date.now() - cached.cachedAt < this.config.cacheTtlMs) {
      return cached.nodes;
    }
  }

  // Fetch fresh tree
  const result = await this.cdpService.getAccessibilityTree(tabId);
  if (!result.success || !result.result) {
    console.error('[AccessibilityService] Failed to get tree:', result.error);
    return [];
  }

  // Cache the result
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
```

### getByRole Implementation
```typescript
async getByRole(tabId: number, options: RoleMatchOptions): Promise<AXMatchResult[]> {
  const tree = await this.getTree(tabId);
  const matches: AXMatchResult[] = [];

  const matchingNodes = this.traverseTree(tree, (node) => {
    // Skip ignored nodes unless configured otherwise
    if (node.ignored && !this.config.includeIgnored) {
      return false;
    }

    // Check hidden state
    if (!options.includeHidden && this.isHidden(node)) {
      return false;
    }

    // Match role
    const role = this.getRole(node);
    if (role.toLowerCase() !== options.role.toLowerCase()) {
      return false;
    }

    // Match name if specified
    if (options.name !== undefined) {
      const name = this.getAccessibleName(node);
      if (!this.matchText(name, options.name, options.exact ?? false)) {
        return false;
      }
    }

    // Match states
    if (!this.matchesStates(node, options)) {
      return false;
    }

    // Match heading level
    if (options.level !== undefined && options.role === 'heading') {
      const level = this.getHeadingLevel(node);
      if (level !== options.level) {
        return false;
      }
    }

    return true;
  });

  // Convert to match results
  for (const node of matchingNodes) {
    const match = this.nodeToMatchResult(node, 'role');
    if (match) {
      // Higher confidence for role+name match
      match.confidence = options.name ? 0.95 : 0.85;
      matches.push(match);
    }
  }

  return matches;
}
```

### getByLabel Implementation
```typescript
async getByLabel(tabId: number, options: LabelMatchOptions): Promise<AXMatchResult[]> {
  const tree = await this.getTree(tabId);
  const matches: AXMatchResult[] = [];

  const matchingNodes = this.traverseTree(tree, (node) => {
    if (node.ignored && !this.config.includeIgnored) {
      return false;
    }

    // Check if node has a name that matches the label
    const name = this.getAccessibleName(node);
    if (!name) return false;

    // Check for labelledby relationship
    const labelledBy = this.getPropertyValue(node, 'labelledby');
    if (labelledBy) {
      // The name comes from a label element
      return this.matchText(name, options.label, options.exact ?? false);
    }

    // For form controls, the name often comes from associated label
    const role = this.getRole(node);
    const formRoles = ['textbox', 'checkbox', 'radio', 'combobox', 'listbox', 'spinbutton', 'slider'];
    if (formRoles.includes(role)) {
      return this.matchText(name, options.label, options.exact ?? false);
    }

    return false;
  });

  for (const node of matchingNodes) {
    const match = this.nodeToMatchResult(node, 'label');
    if (match) {
      match.confidence = 0.90;
      matches.push(match);
    }
  }

  return matches;
}
```

### getByText Implementation
```typescript
async getByText(tabId: number, options: TextMatchOptions): Promise<AXMatchResult[]> {
  const tree = await this.getTree(tabId);
  const matches: AXMatchResult[] = [];

  const matchingNodes = this.traverseTree(tree, (node) => {
    if (node.ignored && !this.config.includeIgnored) {
      return false;
    }

    if (!options.includeHidden && this.isHidden(node)) {
      return false;
    }

    // Check accessible name for text content
    const name = this.getAccessibleName(node);
    if (name && this.matchText(name, options.text, options.exact ?? false)) {
      return true;
    }

    // Check description as well
    const description = node.description?.value;
    if (description && typeof description === 'string') {
      if (this.matchText(description, options.text, options.exact ?? false)) {
        return true;
      }
    }

    return false;
  });

  for (const node of matchingNodes) {
    const match = this.nodeToMatchResult(node, 'text');
    if (match) {
      match.confidence = options.exact ? 0.90 : 0.80;
      matches.push(match);
    }
  }

  return matches;
}
```

### Helper Methods
```typescript
getAccessibleName(node: AXNode): string {
  if (!node.name) return '';
  
  const value = node.name.value;
  if (typeof value === 'string') {
    return value.trim();
  }
  
  return '';
}

getRole(node: AXNode): string {
  if (!node.role) return '';
  
  const value = node.role.value;
  if (typeof value === 'string') {
    return value;
  }
  
  return '';
}

isHidden(node: AXNode): boolean {
  // Check if ignored for accessibility
  if (node.ignored) {
    return true;
  }

  // Check hidden property
  const hidden = this.getPropertyValue(node, 'hidden');
  if (hidden === true) {
    return true;
  }

  return false;
}

matchesStates(
  node: AXNode,
  states: Partial<Pick<RoleMatchOptions, 'expanded' | 'pressed' | 'checked' | 'disabled' | 'selected'>>
): boolean {
  if (states.expanded !== undefined) {
    const expanded = this.getPropertyValue(node, 'expanded');
    if (expanded !== states.expanded) return false;
  }

  if (states.pressed !== undefined) {
    const pressed = this.getPropertyValue(node, 'pressed');
    if (pressed !== states.pressed) return false;
  }

  if (states.checked !== undefined) {
    const checked = this.getPropertyValue(node, 'checked');
    if (states.checked === 'mixed') {
      if (checked !== 'mixed') return false;
    } else {
      if (checked !== states.checked) return false;
    }
  }

  if (states.disabled !== undefined) {
    const disabled = this.getPropertyValue(node, 'disabled');
    if (disabled !== states.disabled) return false;
  }

  if (states.selected !== undefined) {
    const selected = this.getPropertyValue(node, 'selected');
    if (selected !== states.selected) return false;
  }

  return true;
}

getHeadingLevel(node: AXNode): number | null {
  const level = this.getPropertyValue(node, 'level');
  if (typeof level === 'number' && level >= 1 && level <= 6) {
    return level;
  }
  return null;
}

private getPropertyValue(node: AXNode, propertyName: string): any {
  if (!node.properties) return undefined;

  const prop = node.properties.find(p => p.name === propertyName);
  if (prop?.value) {
    return prop.value.value;
  }

  return undefined;
}

private matchText(value: string, pattern: string | RegExp, exact: boolean): boolean {
  if (!value) return false;

  if (pattern instanceof RegExp) {
    return pattern.test(value);
  }

  const normalizedValue = value.toLowerCase().trim();
  const normalizedPattern = pattern.toLowerCase().trim();

  if (exact) {
    return normalizedValue === normalizedPattern;
  }

  return normalizedValue.includes(normalizedPattern);
}

private nodeToMatchResult(
  node: AXNode,
  matchType: AXMatchResult['matchType']
): AXMatchResult | null {
  // Must have a backend node ID to be useful
  if (!node.backendDOMNodeId) {
    return null;
  }

  return {
    axNode: node,
    backendNodeId: node.backendDOMNodeId,
    accessibleName: this.getAccessibleName(node),
    role: this.getRole(node),
    confidence: 0.85, // Default, override in caller
    matchType
  };
}

private traverseTree(nodes: AXNode[], predicate: (node: AXNode) => boolean): AXNode[] {
  const results: AXNode[] = [];
  const nodeMap = new Map<string, AXNode>();

  // Build node map for child lookup
  for (const node of nodes) {
    nodeMap.set(node.nodeId, node);
  }

  // Check each node
  for (const node of nodes) {
    if (predicate(node)) {
      results.push(node);
    }
  }

  return results;
}
```

### Build Locator String
```typescript
buildLocatorString(match: AXMatchResult): string {
  const role = match.role;
  const name = match.accessibleName;

  if (name) {
    // Escape quotes in name
    const escapedName = name.replace(/'/g, "\\'");
    return `getByRole('${role}', { name: '${escapedName}' })`;
  }

  return `getByRole('${role}')`;
}
```

---

## Integration Points

### With PlaywrightLocators
```typescript
// PlaywrightLocators uses AccessibilityService for semantic location
class PlaywrightLocators {
  constructor(
    private cdpService: CDPService,
    private accessibilityService: AccessibilityService
  ) {}

  async getByRole(tabId: number, role: string, options?: { name?: string }) {
    const matches = await this.accessibilityService.getByRole(tabId, {
      role: role as ARIARole,
      name: options?.name
    });

    if (matches.length === 0) return null;

    // Get DOM node from backend ID
    const backendNodeId = matches[0].backendNodeId;
    return this.cdpService.describeNode(tabId, backendNodeId);
  }
}
```

### With DecisionEngine
```typescript
// DecisionEngine evaluates cdp_semantic strategy
async evaluateCDPSemantic(tabId: number, strategy: LocatorStrategy): Promise<StrategyResult> {
  if (!strategy.metadata?.role) {
    return { success: false, confidence: 0 };
  }

  const matches = await this.accessibilityService.getByRole(tabId, {
    role: strategy.metadata.role,
    name: strategy.metadata.name
  });

  if (matches.length === 1) {
    return {
      success: true,
      confidence: matches[0].confidence,
      backendNodeId: matches[0].backendNodeId
    };
  }

  return { success: false, confidence: 0 };
}
```

---

## Acceptance Criteria

- [ ] getByRole() finds elements by ARIA role
- [ ] getByRole() with name filters by accessible name
- [ ] getByRole() supports state filtering (expanded, checked, etc.)
- [ ] getByLabel() finds form controls by label text
- [ ] getByText() finds elements by text content
- [ ] getByDescription() finds elements by aria-describedby
- [ ] Regex patterns work for all text matching
- [ ] Exact vs contains matching works correctly
- [ ] Hidden elements excluded by default
- [ ] Cache improves performance on repeated queries
- [ ] buildLocatorString() generates valid Playwright locators
- [ ] Handles missing accessibility properties gracefully
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **No accessible name**: Some elements lack names, handle gracefully
2. **Multiple matches**: Return all matches, let caller decide
3. **Dynamic content**: Cache invalidation on DOM changes
4. **Hidden elements**: aria-hidden vs display:none vs visibility:hidden
5. **Shadow DOM**: AX tree includes shadow DOM content
6. **Iframes**: Separate AX trees per frame
7. **Custom elements**: May have unusual role mappings
8. **Computed names**: Names from aria-labelledby complex references
9. **Live regions**: May change during query
10. **Role inheritance**: Generic roles from parent elements

---

## Estimated Lines

350-400 lines
