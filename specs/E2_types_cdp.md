# types/cdp.ts Content Specification

**File ID:** E2  
**File Path:** `src/types/cdp.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Defines all TypeScript types and interfaces for Chrome DevTools Protocol (CDP) operations. Consolidates CDP-related types used by CDPService, AccessibilityService, PlaywrightLocators, and strategy evaluators. Includes DOM node types, accessibility tree types, box model types, and input event types. Ensures type safety for all debugger interactions and provides accurate typing for CDP command responses.

---

## Dependencies

### Uses (imports from)
- None (pure type definitions)

### Used By (exports to)
- `../background/services/CDPService`: All CDP types
- `../background/services/AccessibilityService`: AXNode, AXValue, AXProperty
- `../background/services/PlaywrightLocators`: CDPNode, BoxModel
- `../background/services/AutoWaiting`: CDP response types
- `../background/services/strategies/*`: Element types

---

## Type Definitions

```typescript
/**
 * ============================================================================
 * CDP CONNECTION TYPES
 * ============================================================================
 */

/**
 * CDP Debuggee target
 */
export interface CDPDebuggee {
  /** Tab ID */
  tabId?: number;
  /** Extension ID */
  extensionId?: string;
  /** Target ID */
  targetId?: string;
}

/**
 * CDP connection state
 */
export interface CDPConnection {
  /** Tab ID */
  tabId: number;
  /** Whether debugger is attached */
  attached: boolean;
  /** Attachment timestamp */
  attachedAt: number;
  /** Active session ID */
  sessionId?: string;
  /** Pending commands */
  pendingCommands: Map<number, PendingCommand>;
  /** Event listeners */
  eventListeners: Map<string, Set<CDPEventListener>>;
}

/**
 * Pending CDP command
 */
export interface PendingCommand {
  /** Command method */
  method: string;
  /** Resolve function */
  resolve: (result: unknown) => void;
  /** Reject function */
  reject: (error: Error) => void;
  /** Sent timestamp */
  sentAt: number;
  /** Timeout handle */
  timeoutHandle: ReturnType<typeof setTimeout>;
}

/**
 * CDP event listener function
 */
export type CDPEventListener = (params: unknown) => void;

/**
 * CDP command result wrapper
 */
export interface CDPCommandResult<T = unknown> {
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
 * ============================================================================
 * DOM NODE TYPES
 * ============================================================================
 */

/**
 * DOM node from CDP DOM.getDocument / DOM.describeNode
 */
export interface CDPNode {
  /** Node ID (session-specific, changes on reload) */
  nodeId: number;
  /** Parent node ID */
  parentId?: number;
  /** Backend node ID (persistent across sessions) */
  backendNodeId: number;
  /** Node type (1=Element, 3=Text, 8=Comment, 9=Document, etc.) */
  nodeType: number;
  /** Node name (tag name for elements, #text for text nodes) */
  nodeName: string;
  /** Local name (lowercase tag without namespace) */
  localName: string;
  /** Node value (text content for text nodes) */
  nodeValue: string;
  /** Child node count */
  childNodeCount?: number;
  /** Child nodes (if depth > 0) */
  children?: CDPNode[];
  /** Attributes as flat array [name, value, name, value, ...] */
  attributes?: string[];
  /** Document URL (for document nodes) */
  documentURL?: string;
  /** Base URL */
  baseURL?: string;
  /** Public ID (for doctype) */
  publicId?: string;
  /** System ID (for doctype) */
  systemId?: string;
  /** Internal subset (for doctype) */
  internalSubset?: string;
  /** XML version */
  xmlVersion?: string;
  /** Node name (for attribute nodes) */
  name?: string;
  /** Node value (for attribute nodes) */
  value?: string;
  /** Pseudo type (::before, ::after, etc.) */
  pseudoType?: string;
  /** Shadow root type */
  shadowRootType?: 'user-agent' | 'open' | 'closed';
  /** Frame ID (for frame owner elements) */
  frameId?: string;
  /** Content document (for iframes) */
  contentDocument?: CDPNode;
  /** Shadow roots */
  shadowRoots?: CDPNode[];
  /** Template content (for template elements) */
  templateContent?: CDPNode;
  /** Pseudo elements */
  pseudoElements?: CDPNode[];
  /** Imported document (for import links) */
  importedDocument?: CDPNode;
  /** Distributed nodes (for insertion points) */
  distributedNodes?: BackendNode[];
  /** Whether node is SVG */
  isSVG?: boolean;
  /** Compatibility mode */
  compatibilityMode?: 'QuirksMode' | 'LimitedQuirksMode' | 'NoQuirksMode';
  /** Assigned slot */
  assignedSlot?: BackendNode;
}

/**
 * Backend node reference (lightweight)
 */
export interface BackendNode {
  /** Node type */
  nodeType: number;
  /** Node name */
  nodeName: string;
  /** Backend node ID */
  backendNodeId: number;
}

/**
 * Node ID types
 */
export type NodeId = number;
export type BackendNodeId = number;
export type RemoteObjectId = string;

/**
 * ============================================================================
 * BOX MODEL TYPES
 * ============================================================================
 */

/**
 * Box model from DOM.getBoxModel
 */
export interface BoxModel {
  /** Content box quad (8 values: x1,y1,x2,y2,x3,y3,x4,y4) */
  content: number[];
  /** Padding box quad */
  padding: number[];
  /** Border box quad */
  border: number[];
  /** Margin box quad */
  margin: number[];
  /** Node width */
  width: number;
  /** Node height */
  height: number;
  /** Shape outside (CSS shapes) */
  shapeOutside?: ShapeOutsideInfo;
}

/**
 * CSS shape outside info
 */
export interface ShapeOutsideInfo {
  /** Shape bounds */
  bounds: number[];
  /** Shape */
  shape: unknown[];
  /** Margin shape */
  marginShape: unknown[];
}

/**
 * Bounding rect (simplified box)
 */
export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Quad - array of 4 points (8 numbers)
 */
export type Quad = number[];

/**
 * ============================================================================
 * ACCESSIBILITY TREE TYPES
 * ============================================================================
 */

/**
 * Accessibility node from Accessibility.getFullAXTree
 */
export interface AXNode {
  /** Unique accessibility node ID */
  nodeId: AXNodeId;
  /** Whether node is ignored for accessibility */
  ignored: boolean;
  /** Reasons for being ignored */
  ignoredReasons?: AXProperty[];
  /** Role */
  role?: AXValue;
  /** Accessible name */
  name?: AXValue;
  /** Description */
  description?: AXValue;
  /** Value */
  value?: AXValue;
  /** Additional properties */
  properties?: AXProperty[];
  /** Parent node ID */
  parentId?: AXNodeId;
  /** Child node IDs */
  childIds?: AXNodeId[];
  /** Backend DOM node ID */
  backendDOMNodeId?: BackendNodeId;
  /** Frame ID */
  frameId?: string;
}

/**
 * Accessibility node ID (string in CDP)
 */
export type AXNodeId = string;

/**
 * Accessibility property
 */
export interface AXProperty {
  /** Property name */
  name: AXPropertyName;
  /** Property value */
  value: AXValue;
}

/**
 * Accessibility property names
 */
export type AXPropertyName =
  | 'busy'
  | 'disabled'
  | 'editable'
  | 'focusable'
  | 'focused'
  | 'hidden'
  | 'hiddenRoot'
  | 'invalid'
  | 'keyshortcuts'
  | 'settable'
  | 'roledescription'
  | 'live'
  | 'atomic'
  | 'relevant'
  | 'root'
  | 'autocomplete'
  | 'hasPopup'
  | 'level'
  | 'multiselectable'
  | 'orientation'
  | 'multiline'
  | 'readonly'
  | 'required'
  | 'valuemin'
  | 'valuemax'
  | 'valuetext'
  | 'checked'
  | 'expanded'
  | 'modal'
  | 'pressed'
  | 'selected'
  | 'activedescendant'
  | 'controls'
  | 'describedby'
  | 'details'
  | 'errormessage'
  | 'flowto'
  | 'labelledby'
  | 'owns'
  | string; // Allow other properties

/**
 * Accessibility value
 */
export interface AXValue {
  /** Value type */
  type: AXValueType;
  /** Actual value (type depends on type field) */
  value?: AXValueValue;
  /** Related nodes (for relational properties) */
  relatedNodes?: AXRelatedNode[];
  /** Value sources */
  sources?: AXValueSource[];
}

/**
 * Accessibility value types
 */
export type AXValueType =
  | 'boolean'
  | 'tristate'
  | 'booleanOrUndefined'
  | 'idref'
  | 'idrefList'
  | 'integer'
  | 'node'
  | 'nodeList'
  | 'number'
  | 'string'
  | 'computedString'
  | 'token'
  | 'tokenList'
  | 'domRelation'
  | 'role'
  | 'internalRole'
  | 'valueUndefined';

/**
 * Accessibility value union
 */
export type AXValueValue = string | number | boolean | undefined;

/**
 * Related accessibility node
 */
export interface AXRelatedNode {
  /** Backend DOM node ID */
  backendDOMNodeId: BackendNodeId;
  /** ID reference */
  idref?: string;
  /** Text content */
  text?: string;
}

/**
 * Accessibility value source
 */
export interface AXValueSource {
  /** Source type */
  type: AXValueSourceType;
  /** Source value */
  value?: AXValue;
  /** Attribute name (if type is 'attribute') */
  attribute?: string;
  /** Attribute value */
  attributeValue?: AXValue;
  /** Whether superseded */
  superseded?: boolean;
  /** Native source (if type is 'implicit') */
  nativeSource?: AXValueNativeSourceType;
  /** Native source value */
  nativeSourceValue?: AXValue;
  /** Whether invalid */
  invalid?: boolean;
  /** Invalid reason */
  invalidReason?: string;
}

/**
 * Accessibility value source types
 */
export type AXValueSourceType =
  | 'attribute'
  | 'implicit'
  | 'style'
  | 'contents'
  | 'placeholder'
  | 'relatedElement';

/**
 * Native source types
 */
export type AXValueNativeSourceType =
  | 'description'
  | 'figcaption'
  | 'label'
  | 'labelfor'
  | 'labelwrapped'
  | 'legend'
  | 'rubyannotation'
  | 'tablecaption'
  | 'title'
  | 'other';

/**
 * ============================================================================
 * INPUT TYPES
 * ============================================================================
 */

/**
 * Mouse event types for Input.dispatchMouseEvent
 */
export type MouseEventType =
  | 'mousePressed'
  | 'mouseReleased'
  | 'mouseMoved'
  | 'mouseWheel';

/**
 * Mouse button
 */
export type MouseButton = 'none' | 'left' | 'middle' | 'right' | 'back' | 'forward';

/**
 * Keyboard event types for Input.dispatchKeyEvent
 */
export type KeyEventType =
  | 'keyDown'
  | 'keyUp'
  | 'rawKeyDown'
  | 'char';

/**
 * Input modifier flags
 */
export interface InputModifiers {
  /** Alt/Option key */
  alt?: boolean;
  /** Ctrl key */
  ctrl?: boolean;
  /** Meta/Command key */
  meta?: boolean;
  /** Shift key */
  shift?: boolean;
}

/**
 * Convert modifiers to bitmask
 */
export function modifiersToBitmask(modifiers: InputModifiers): number {
  let mask = 0;
  if (modifiers.alt) mask |= 1;
  if (modifiers.ctrl) mask |= 2;
  if (modifiers.meta) mask |= 4;
  if (modifiers.shift) mask |= 8;
  return mask;
}

/**
 * Mouse event parameters
 */
export interface MouseEventParams {
  /** Event type */
  type: MouseEventType;
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Mouse button */
  button?: MouseButton;
  /** Click count */
  clickCount?: number;
  /** Modifier keys bitmask */
  modifiers?: number;
  /** Time since epoch (ms) */
  timestamp?: number;
  /** Delta X (for wheel events) */
  deltaX?: number;
  /** Delta Y (for wheel events) */
  deltaY?: number;
  /** Pointer type */
  pointerType?: 'mouse' | 'pen';
}

/**
 * Keyboard event parameters
 */
export interface KeyEventParams {
  /** Event type */
  type: KeyEventType;
  /** Key value (e.g., 'Enter', 'a') */
  key?: string;
  /** Code value (e.g., 'Enter', 'KeyA') */
  code?: string;
  /** Text to insert (for char events) */
  text?: string;
  /** Unmodified text */
  unmodifiedText?: string;
  /** Modifier keys bitmask */
  modifiers?: number;
  /** Windows virtual key code */
  windowsVirtualKeyCode?: number;
  /** Native virtual key code */
  nativeVirtualKeyCode?: number;
  /** Auto-repeat */
  autoRepeat?: boolean;
  /** Is keypad */
  isKeypad?: boolean;
  /** Is system key */
  isSystemKey?: boolean;
  /** Location (standard, left, right, numpad) */
  location?: number;
}

/**
 * ============================================================================
 * PAGE TYPES
 * ============================================================================
 */

/**
 * Viewport from Page.getLayoutMetrics
 */
export interface LayoutViewport {
  /** Horizontal offset */
  pageX: number;
  /** Vertical offset */
  pageY: number;
  /** Width */
  clientWidth: number;
  /** Height */
  clientHeight: number;
}

/**
 * Visual viewport
 */
export interface VisualViewport {
  /** Horizontal offset */
  offsetX: number;
  /** Vertical offset */
  offsetY: number;
  /** Horizontal offset relative to page */
  pageX: number;
  /** Vertical offset relative to page */
  pageY: number;
  /** Width */
  clientWidth: number;
  /** Height */
  clientHeight: number;
  /** Scale (zoom) */
  scale: number;
  /** Zoom factor */
  zoom?: number;
}

/**
 * Layout metrics result
 */
export interface LayoutMetrics {
  /** Deprecated layout viewport */
  layoutViewport: LayoutViewport;
  /** Visual viewport */
  visualViewport: VisualViewport;
  /** Content size */
  contentSize: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** CSS layout viewport */
  cssLayoutViewport: LayoutViewport;
  /** CSS visual viewport */
  cssVisualViewport: VisualViewport;
  /** CSS content size */
  cssContentSize: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Screenshot parameters
 */
export interface ScreenshotParams {
  /** Image format */
  format?: 'jpeg' | 'png' | 'webp';
  /** Quality (0-100, jpeg/webp only) */
  quality?: number;
  /** Clip region */
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
  /** Capture from surface */
  fromSurface?: boolean;
  /** Capture beyond viewport */
  captureBeyondViewport?: boolean;
  /** Optimize for speed */
  optimizeForSpeed?: boolean;
}

/**
 * ============================================================================
 * RUNTIME TYPES
 * ============================================================================
 */

/**
 * Remote object from Runtime domain
 */
export interface RemoteObject {
  /** Object type */
  type: RemoteObjectType;
  /** Object subtype */
  subtype?: RemoteObjectSubtype;
  /** Object class name */
  className?: string;
  /** Primitive value */
  value?: unknown;
  /** String representation */
  unserializableValue?: string;
  /** Object description */
  description?: string;
  /** Object ID (for non-primitives) */
  objectId?: RemoteObjectId;
  /** Preview */
  preview?: ObjectPreview;
  /** Custom preview */
  customPreview?: CustomPreview;
}

/**
 * Remote object types
 */
export type RemoteObjectType =
  | 'object'
  | 'function'
  | 'undefined'
  | 'string'
  | 'number'
  | 'boolean'
  | 'symbol'
  | 'bigint';

/**
 * Remote object subtypes
 */
export type RemoteObjectSubtype =
  | 'array'
  | 'null'
  | 'node'
  | 'regexp'
  | 'date'
  | 'map'
  | 'set'
  | 'weakmap'
  | 'weakset'
  | 'iterator'
  | 'generator'
  | 'error'
  | 'proxy'
  | 'promise'
  | 'typedarray'
  | 'arraybuffer'
  | 'dataview'
  | 'webassemblymemory'
  | 'wasmvalue';

/**
 * Object preview
 */
export interface ObjectPreview {
  /** Type */
  type: RemoteObjectType;
  /** Subtype */
  subtype?: RemoteObjectSubtype;
  /** Description */
  description?: string;
  /** Whether overflow */
  overflow: boolean;
  /** Properties */
  properties: PropertyPreview[];
  /** Entries (for maps/sets) */
  entries?: EntryPreview[];
}

/**
 * Property preview
 */
export interface PropertyPreview {
  /** Name */
  name: string;
  /** Type */
  type: RemoteObjectType;
  /** Value */
  value?: string;
  /** Value preview */
  valuePreview?: ObjectPreview;
  /** Subtype */
  subtype?: RemoteObjectSubtype;
}

/**
 * Entry preview (for maps/sets)
 */
export interface EntryPreview {
  /** Key preview */
  key?: ObjectPreview;
  /** Value preview */
  value: ObjectPreview;
}

/**
 * Custom preview
 */
export interface CustomPreview {
  /** Header */
  header: string;
  /** Body getter ID */
  bodyGetterId?: RemoteObjectId;
}

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Parse attributes array to record
 */
export function parseAttributes(attributes: string[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!attributes) return result;
  
  for (let i = 0; i < attributes.length; i += 2) {
    result[attributes[i]] = attributes[i + 1];
  }
  return result;
}

/**
 * Get accessible name from AXNode
 */
export function getAccessibleName(node: AXNode): string {
  if (!node.name?.value) return '';
  return typeof node.name.value === 'string' ? node.name.value : '';
}

/**
 * Get role from AXNode
 */
export function getAccessibleRole(node: AXNode): string {
  if (!node.role?.value) return '';
  return typeof node.role.value === 'string' ? node.role.value : '';
}

/**
 * Get property value from AXNode
 */
export function getAXProperty(node: AXNode, name: AXPropertyName): AXValueValue | undefined {
  const prop = node.properties?.find(p => p.name === name);
  return prop?.value?.value;
}

/**
 * Convert quad to bounding rect
 */
export function quadToBoundingRect(quad: Quad): BoundingRect {
  const x = Math.min(quad[0], quad[2], quad[4], quad[6]);
  const y = Math.min(quad[1], quad[3], quad[5], quad[7]);
  const maxX = Math.max(quad[0], quad[2], quad[4], quad[6]);
  const maxY = Math.max(quad[1], quad[3], quad[5], quad[7]);
  
  return {
    x,
    y,
    width: maxX - x,
    height: maxY - y
  };
}

/**
 * Get center point of bounding rect
 */
export function getCenterPoint(rect: BoundingRect): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}
```

---

## Usage Examples

### Working with DOM Nodes
```typescript
import { CDPNode, parseAttributes, BackendNodeId } from '../types/cdp';

function processNode(node: CDPNode): void {
  const attrs = parseAttributes(node.attributes);
  console.log(`Tag: ${node.nodeName}, ID: ${attrs.id}, Backend: ${node.backendNodeId}`);
}
```

### Working with Accessibility
```typescript
import { AXNode, getAccessibleName, getAccessibleRole, getAXProperty } from '../types/cdp';

function describeNode(axNode: AXNode): string {
  const role = getAccessibleRole(axNode);
  const name = getAccessibleName(axNode);
  const disabled = getAXProperty(axNode, 'disabled');
  return `${role}${name ? `: "${name}"` : ''}${disabled ? ' (disabled)' : ''}`;
}
```

### Working with Box Model
```typescript
import { BoxModel, quadToBoundingRect, getCenterPoint } from '../types/cdp';

function getClickPoint(boxModel: BoxModel): { x: number; y: number } {
  const rect = quadToBoundingRect(boxModel.border);
  return getCenterPoint(rect);
}
```

---

## Acceptance Criteria

- [ ] CDPConnection and PendingCommand types defined
- [ ] CDPNode with all DOM properties
- [ ] BoxModel with all quad types
- [ ] AXNode with full accessibility tree support
- [ ] AXProperty and AXValue with all types
- [ ] Input event types (mouse, keyboard)
- [ ] Page layout and viewport types
- [ ] Runtime types (RemoteObject)
- [ ] Utility functions for common operations
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Missing attributes array**: Handle undefined
2. **Unknown property names**: Allow string extension
3. **Null subtype**: Object with subtype 'null'
4. **Shadow root types**: user-agent, open, closed
5. **Quad with rotation**: Still works for bounding rect
6. **Empty AX tree**: Handle gracefully
7. **Missing value field**: Type guards handle
8. **Circular references**: Not in CDP types
9. **Large node trees**: Types don't limit size
10. **Future CDP versions**: Extensible types

---

## Estimated Lines

400-450 lines
