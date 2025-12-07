# CDPService Content Specification

**File ID:** B1  
**File Path:** `src/background/services/CDPService.ts`  
**Status:** FIX (existing file with errors)  
**Priority:** P0

---

## Purpose

Core Chrome DevTools Protocol (CDP) service that manages debugger attachment, command execution, and event handling. Provides low-level access to Chrome's debugging capabilities for accessibility tree traversal, DOM inspection, and advanced element location. This is the foundation for CDP-based strategies (cdp_semantic, cdp_power) and enables Playwright-style locators. The existing file has TypeScript errors that need to be fixed while adding missing functionality.

---

## Dependencies

### Uses (imports from)
- `chrome.debugger`: Chrome Debugger API
- `../../types/cdp`: CDPNode, AXNode, CDPCommand, CDPResponse

### Used By (exports to)
- `./AccessibilityService`: Uses CDP commands for accessibility tree
- `./PlaywrightLocators`: Uses CDP for element location
- `./AutoWaiting`: Uses CDP for element state checks
- `./DecisionEngine`: Uses CDP strategies during playback
- `../background.ts`: Message handler delegation

---

## Interfaces

```typescript
/**
 * CDP Service configuration
 */
interface CDPServiceConfig {
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
 * CDP connection state
 */
interface CDPConnection {
  /** Tab ID */
  tabId: number;
  /** Whether debugger is attached */
  attached: boolean;
  /** Attachment timestamp */
  attachedAt: number;
  /** Active session ID (if any) */
  sessionId?: string;
  /** Pending commands */
  pendingCommands: Map<number, PendingCommand>;
  /** Event listeners */
  eventListeners: Map<string, Set<CDPEventListener>>;
}

/**
 * Pending command tracking
 */
interface PendingCommand {
  /** Command method */
  method: string;
  /** Resolve function */
  resolve: (result: any) => void;
  /** Reject function */
  reject: (error: Error) => void;
  /** Sent timestamp */
  sentAt: number;
  /** Timeout handle */
  timeoutHandle: number;
}

/**
 * CDP event listener
 */
type CDPEventListener = (params: any) => void;

/**
 * CDP command result
 */
interface CDPCommandResult<T = any> {
  /** Whether command succeeded */
  success: boolean;
  /** Result data */
  result?: T;
  /** Error message if failed */
  error?: string;
  /** Execution time in ms */
  duration: number;
}

/**
 * DOM node from CDP
 */
interface CDPNode {
  /** Node ID (session-specific) */
  nodeId: number;
  /** Backend node ID (persistent) */
  backendNodeId: number;
  /** Node type (1 = Element, 3 = Text, etc.) */
  nodeType: number;
  /** Node name (tag name for elements) */
  nodeName: string;
  /** Local name (lowercase tag) */
  localName: string;
  /** Node value (for text nodes) */
  nodeValue: string;
  /** Child count */
  childNodeCount?: number;
  /** Children (if requested) */
  children?: CDPNode[];
  /** Attributes as flat array [name, value, name, value, ...] */
  attributes?: string[];
  /** Document URL (for document nodes) */
  documentURL?: string;
  /** Frame ID */
  frameId?: string;
  /** Content document (for iframes) */
  contentDocument?: CDPNode;
  /** Shadow roots */
  shadowRoots?: CDPNode[];
  /** Pseudo type */
  pseudoType?: string;
  /** Whether node is SVG */
  isSVG?: boolean;
}

/**
 * Accessibility node from CDP
 */
interface AXNode {
  /** Accessibility node ID */
  nodeId: string;
  /** Whether node is ignored for accessibility */
  ignored: boolean;
  /** Ignore reasons */
  ignoredReasons?: AXProperty[];
  /** Role */
  role?: AXValue;
  /** Name */
  name?: AXValue;
  /** Description */
  description?: AXValue;
  /** Value */
  value?: AXValue;
  /** Properties */
  properties?: AXProperty[];
  /** Child IDs */
  childIds?: string[];
  /** Backend DOM node ID */
  backendDOMNodeId?: number;
}

/**
 * Accessibility property
 */
interface AXProperty {
  /** Property name */
  name: string;
  /** Property value */
  value: AXValue;
}

/**
 * Accessibility value
 */
interface AXValue {
  /** Value type */
  type: 'boolean' | 'tristate' | 'booleanOrUndefined' | 'idref' | 'idrefList' | 'integer' | 'node' | 'nodeList' | 'number' | 'string' | 'computedString' | 'token' | 'tokenList' | 'domRelation' | 'role' | 'internalRole' | 'valueUndefined';
  /** Actual value */
  value?: any;
  /** Related nodes */
  relatedNodes?: AXRelatedNode[];
  /** Sources */
  sources?: AXValueSource[];
}

/**
 * Related accessibility node
 */
interface AXRelatedNode {
  /** Backend DOM node ID */
  backendDOMNodeId: number;
  /** ID reference */
  idref?: string;
  /** Text content */
  text?: string;
}

/**
 * Box model from CDP
 */
interface BoxModel {
  /** Content box */
  content: number[];
  /** Padding box */
  padding: number[];
  /** Border box */
  border: number[];
  /** Margin box */
  margin: number[];
  /** Width */
  width: number;
  /** Height */
  height: number;
}
```

---

## Functions

```typescript
/**
 * CDPService - Chrome DevTools Protocol manager
 */
class CDPService {
  private config: CDPServiceConfig;
  private connections: Map<number, CDPConnection>;
  private commandIdCounter: number;
  private isInitialized: boolean;

  /**
   * Create new CDPService instance
   * @param config - Service configuration
   */
  constructor(config?: Partial<CDPServiceConfig>);

  /**
   * Initialize the service
   * Sets up chrome.debugger event listeners
   */
  initialize(): void;

  /**
   * Attach debugger to a tab
   * @param tabId - Tab to attach to
   * @returns Promise resolving when attached
   */
  async attach(tabId: number): Promise<CDPCommandResult<void>>;

  /**
   * Detach debugger from a tab
   * @param tabId - Tab to detach from
   * @returns Promise resolving when detached
   */
  async detach(tabId: number): Promise<CDPCommandResult<void>>;

  /**
   * Check if debugger is attached to a tab
   * @param tabId - Tab to check
   * @returns Whether attached
   */
  isAttached(tabId: number): boolean;

  /**
   * Send CDP command
   * @param tabId - Target tab
   * @param method - CDP method name
   * @param params - Command parameters
   * @returns Promise resolving to command result
   */
  async sendCommand<T = any>(
    tabId: number,
    method: string,
    params?: Record<string, any>
  ): Promise<CDPCommandResult<T>>;

  /**
   * Add event listener for CDP events
   * @param tabId - Target tab
   * @param eventName - Event name (e.g., 'DOM.documentUpdated')
   * @param listener - Event handler
   */
  addEventListener(tabId: number, eventName: string, listener: CDPEventListener): void;

  /**
   * Remove event listener
   * @param tabId - Target tab
   * @param eventName - Event name
   * @param listener - Event handler to remove
   */
  removeEventListener(tabId: number, eventName: string, listener: CDPEventListener): void;

  /**
   * Get DOM document root
   * @param tabId - Target tab
   * @returns Promise resolving to document node
   */
  async getDocument(tabId: number): Promise<CDPCommandResult<CDPNode>>;

  /**
   * Query selector on document
   * @param tabId - Target tab
   * @param selector - CSS selector
   * @param nodeId - Starting node (default: document)
   * @returns Promise resolving to node ID
   */
  async querySelector(
    tabId: number,
    selector: string,
    nodeId?: number
  ): Promise<CDPCommandResult<number>>;

  /**
   * Query all matching selectors
   * @param tabId - Target tab
   * @param selector - CSS selector
   * @param nodeId - Starting node (default: document)
   * @returns Promise resolving to array of node IDs
   */
  async querySelectorAll(
    tabId: number,
    selector: string,
    nodeId?: number
  ): Promise<CDPCommandResult<number[]>>;

  /**
   * Get node by backend node ID
   * @param tabId - Target tab
   * @param backendNodeId - Backend node ID
   * @returns Promise resolving to node
   */
  async describeNode(
    tabId: number,
    backendNodeId: number
  ): Promise<CDPCommandResult<CDPNode>>;

  /**
   * Get box model for node
   * @param tabId - Target tab
   * @param nodeId - Node ID
   * @returns Promise resolving to box model
   */
  async getBoxModel(
    tabId: number,
    nodeId: number
  ): Promise<CDPCommandResult<BoxModel>>;

  /**
   * Get outer HTML for node
   * @param tabId - Target tab
   * @param nodeId - Node ID
   * @returns Promise resolving to HTML string
   */
  async getOuterHTML(
    tabId: number,
    nodeId: number
  ): Promise<CDPCommandResult<string>>;

  /**
   * Get attributes for node
   * @param tabId - Target tab
   * @param nodeId - Node ID
   * @returns Promise resolving to attributes map
   */
  async getAttributes(
    tabId: number,
    nodeId: number
  ): Promise<CDPCommandResult<Record<string, string>>>;

  /**
   * Resolve node to JavaScript object
   * @param tabId - Target tab
   * @param nodeId - Node ID
   * @returns Promise resolving to remote object ID
   */
  async resolveNode(
    tabId: number,
    nodeId: number
  ): Promise<CDPCommandResult<string>>;

  /**
   * Focus a node
   * @param tabId - Target tab
   * @param nodeId - Node ID
   */
  async focusNode(tabId: number, nodeId: number): Promise<CDPCommandResult<void>>;

  /**
   * Scroll node into view
   * @param tabId - Target tab
   * @param nodeId - Node ID
   */
  async scrollIntoView(tabId: number, nodeId: number): Promise<CDPCommandResult<void>>;

  /**
   * Get full accessibility tree
   * @param tabId - Target tab
   * @returns Promise resolving to accessibility nodes
   */
  async getAccessibilityTree(tabId: number): Promise<CDPCommandResult<AXNode[]>>;

  /**
   * Get accessibility node for DOM node
   * @param tabId - Target tab
   * @param backendNodeId - Backend DOM node ID
   * @returns Promise resolving to accessibility node
   */
  async getAccessibilityNode(
    tabId: number,
    backendNodeId: number
  ): Promise<CDPCommandResult<AXNode>>;

  /**
   * Take screenshot
   * @param tabId - Target tab
   * @param options - Screenshot options
   * @returns Promise resolving to base64 image
   */
  async captureScreenshot(
    tabId: number,
    options?: {
      format?: 'jpeg' | 'png' | 'webp';
      quality?: number;
      clip?: { x: number; y: number; width: number; height: number; scale: number };
    }
  ): Promise<CDPCommandResult<string>>;

  /**
   * Dispatch mouse event
   * @param tabId - Target tab
   * @param type - Event type
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param options - Additional options
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
  ): Promise<CDPCommandResult<void>>;

  /**
   * Dispatch keyboard event
   * @param tabId - Target tab
   * @param type - Event type
   * @param options - Key options
   */
  async dispatchKeyEvent(
    tabId: number,
    type: 'keyDown' | 'keyUp' | 'rawKeyDown' | 'char',
    options: {
      key?: string;
      code?: string;
      text?: string;
      modifiers?: number;
    }
  ): Promise<CDPCommandResult<void>>;

  /**
   * Insert text (for typing)
   * @param tabId - Target tab
   * @param text - Text to insert
   */
  async insertText(tabId: number, text: string): Promise<CDPCommandResult<void>>;

  /**
   * Clean up all connections
   */
  async cleanup(): Promise<void>;

  // Private methods
  private getOrCreateConnection(tabId: number): CDPConnection;
  private handleDebuggerEvent(source: chrome.debugger.Debuggee, method: string, params: any): void;
  private handleDebuggerDetach(source: chrome.debugger.Debuggee, reason: string): void;
  private withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T>;
  private autoDetachCheck(tabId: number): void;
}

export { 
  CDPService, 
  CDPServiceConfig, 
  CDPConnection, 
  CDPCommandResult, 
  CDPNode, 
  AXNode, 
  AXProperty, 
  AXValue,
  BoxModel 
};
```

---

## Key Implementation Details

### Service Initialization
```typescript
constructor(config?: Partial<CDPServiceConfig>) {
  this.config = {
    autoDetachTimeoutMs: config?.autoDetachTimeoutMs ?? 300000,
    retryAttempts: config?.retryAttempts ?? 3,
    retryDelayMs: config?.retryDelayMs ?? 100,
    debugLogging: config?.debugLogging ?? false
  };
  this.connections = new Map();
  this.commandIdCounter = 0;
  this.isInitialized = false;
}

initialize(): void {
  if (this.isInitialized) return;

  // Set up debugger event listener
  chrome.debugger.onEvent.addListener(
    (source, method, params) => this.handleDebuggerEvent(source, method, params)
  );

  // Set up detach listener
  chrome.debugger.onDetach.addListener(
    (source, reason) => this.handleDebuggerDetach(source, reason)
  );

  this.isInitialized = true;
  console.log('[CDPService] Initialized');
}
```

### Attach/Detach with Error Handling
```typescript
async attach(tabId: number): Promise<CDPCommandResult<void>> {
  const startTime = Date.now();

  // Check if already attached
  if (this.isAttached(tabId)) {
    return { success: true, duration: 0 };
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
    const connection: CDPConnection = {
      tabId,
      attached: true,
      attachedAt: Date.now(),
      pendingCommands: new Map(),
      eventListeners: new Map()
    };
    this.connections.set(tabId, connection);

    // Enable required domains
    await this.sendCommand(tabId, 'DOM.enable');
    await this.sendCommand(tabId, 'Accessibility.enable');
    await this.sendCommand(tabId, 'Page.enable');

    if (this.config.debugLogging) {
      console.log(`[CDPService] Attached to tab ${tabId}`);
    }

    return { success: true, duration: Date.now() - startTime };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Attach failed';
    console.error(`[CDPService] Failed to attach to tab ${tabId}:`, message);
    return { success: false, error: message, duration: Date.now() - startTime };
  }
}

async detach(tabId: number): Promise<CDPCommandResult<void>> {
  const startTime = Date.now();
  const connection = this.connections.get(tabId);

  if (!connection?.attached) {
    return { success: true, duration: 0 };
  }

  try {
    // Cancel pending commands
    for (const [id, pending] of connection.pendingCommands) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(new Error('Debugger detached'));
    }
    connection.pendingCommands.clear();

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

    if (this.config.debugLogging) {
      console.log(`[CDPService] Detached from tab ${tabId}`);
    }

    return { success: true, duration: Date.now() - startTime };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Detach failed';
    console.error(`[CDPService] Failed to detach from tab ${tabId}:`, message);
    return { success: false, error: message, duration: Date.now() - startTime };
  }
}
```

### Send Command with Retry
```typescript
async sendCommand<T = any>(
  tabId: number,
  method: string,
  params?: Record<string, any>
): Promise<CDPCommandResult<T>> {
  const startTime = Date.now();

  // Ensure attached
  if (!this.isAttached(tabId)) {
    const attachResult = await this.attach(tabId);
    if (!attachResult.success) {
      return { success: false, error: 'Not attached', duration: Date.now() - startTime };
    }
  }

  const executeCommand = async (): Promise<T> => {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(
        { tabId },
        method,
        params || {},
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
    console.error(`[CDPService] ${method} failed:`, message);
    return { success: false, error: message, duration: Date.now() - startTime };
  }
}

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

  throw lastError || new Error('All retry attempts failed');
}
```

### DOM Query Methods
```typescript
async getDocument(tabId: number): Promise<CDPCommandResult<CDPNode>> {
  const result = await this.sendCommand<{ root: CDPNode }>(tabId, 'DOM.getDocument', {
    depth: 0,
    pierce: true // Include shadow DOM
  });

  if (result.success && result.result) {
    return { ...result, result: result.result.root };
  }
  return { success: false, error: result.error, duration: result.duration };
}

async querySelector(
  tabId: number,
  selector: string,
  nodeId?: number
): Promise<CDPCommandResult<number>> {
  // Get document if no nodeId provided
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

  if (result.success && result.result) {
    return { ...result, result: result.result.nodeId };
  }
  return { success: false, error: result.error || 'Node not found', duration: result.duration };
}

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
```

### Accessibility Tree Methods
```typescript
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
  return { success: false, error: result.error || 'No accessibility node', duration: result.duration };
}
```

### Input Methods
```typescript
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

async insertText(tabId: number, text: string): Promise<CDPCommandResult<void>> {
  return this.sendCommand(tabId, 'Input.insertText', { text });
}
```

### Event Handling
```typescript
private handleDebuggerEvent(
  source: chrome.debugger.Debuggee,
  method: string,
  params: any
): void {
  const tabId = source.tabId;
  if (!tabId) return;

  const connection = this.connections.get(tabId);
  if (!connection) return;

  // Dispatch to listeners
  const listeners = connection.eventListeners.get(method);
  if (listeners) {
    for (const listener of listeners) {
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
    // Reject pending commands
    for (const pending of connection.pendingCommands.values()) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(new Error(`Debugger detached: ${reason}`));
    }
    this.connections.delete(tabId);
  }
}
```

---

## Integration Points

### With Background Script
```typescript
// In background.ts
const cdpService = new CDPService({ debugLogging: false });
cdpService.initialize();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CDP_ATTACH') {
    cdpService.attach(message.tabId).then(sendResponse);
    return true;
  }

  if (message.action === 'CDP_DETACH') {
    cdpService.detach(message.tabId).then(sendResponse);
    return true;
  }

  if (message.action === 'CDP_COMMAND') {
    cdpService.sendCommand(message.tabId, message.method, message.params)
      .then(sendResponse);
    return true;
  }
});
```

### With AccessibilityService
```typescript
// AccessibilityService uses CDPService for AX tree
class AccessibilityService {
  constructor(private cdpService: CDPService) {}

  async getNodeByRole(tabId: number, role: string, name?: string) {
    const result = await this.cdpService.getAccessibilityTree(tabId);
    // ... filter nodes by role/name
  }
}
```

---

## Acceptance Criteria

- [ ] attach() successfully attaches debugger to tab
- [ ] detach() cleanly detaches and cleans up
- [ ] sendCommand() executes CDP commands with retry logic
- [ ] getDocument() returns DOM document root
- [ ] querySelector/querySelectorAll find elements
- [ ] getAccessibilityTree() returns full AX tree
- [ ] dispatchMouseEvent() sends mouse events
- [ ] insertText() types text correctly
- [ ] Event listeners receive CDP events
- [ ] Auto-detach after timeout (optional)
- [ ] Graceful handling of tab closure
- [ ] TypeScript compiles with strict mode, 0 errors
- [ ] All existing functionality preserved

---

## Edge Cases

1. **Tab closed during command**: Handle gracefully, reject pending
2. **Multiple attach calls**: Reuse existing connection
3. **Detach during command**: Cancel and reject pending commands
4. **Extension reload**: Connections lost, re-attach needed
5. **Permission denied**: User must allow debugger access
6. **Cross-origin iframes**: May need separate attach
7. **Service worker tabs**: CDP not available
8. **PDF viewer tabs**: Limited CDP support
9. **DevTools already open**: May conflict with debugger
10. **Command timeout**: Implement configurable timeout

---

## Estimated Lines

400-500 lines
