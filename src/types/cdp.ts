/**
 * @fileoverview Chrome DevTools Protocol (CDP) Type Definitions
 * @description Complete type definitions for CDP operations including DOM nodes,
 * accessibility tree, input simulation, page navigation, and runtime evaluation.
 * This file consolidates all CDP-related types to prevent circular dependencies.
 * 
 * @module types/cdp
 * @version 1.0.0
 * @since Phase 4
 * 
 * @see https://chromedevtools.github.io/devtools-protocol/
 */

// ============================================================================
// SECTION 1: CDP CONNECTION AND SESSION MANAGEMENT
// ============================================================================

/**
 * CDP connection state for a tab.
 * Tracks attachment status, session ID, and pending commands.
 */
export interface CDPConnection {
  /** Tab ID */
  tabId: number;
  
  /** Whether CDP is currently attached */
  attached: boolean;
  
  /** Timestamp when attached */
  attachedAt?: number;
  
  /** CDP session ID */
  sessionId?: string;
  
  /** Pending commands (for timeout tracking) */
  pendingCommands: Map<number, PendingCommand>;
  
  /** Event listeners */
  eventListeners: Map<string, CDPEventListener[]>;
}

/**
 * Pending CDP command with timeout tracking.
 */
export interface PendingCommand {
  /** CDP method name */
  method: string;
  
  /** Promise resolve function */
  resolve: (value: unknown) => void;
  
  /** Promise reject function */
  reject: (error: Error) => void;
  
  /** Timestamp when command was sent */
  sentAt: number;
  
  /** Timeout handle */
  timeoutHandle?: NodeJS.Timeout;
}

/**
 * CDP event listener callback type.
 */
export type CDPEventListener = (params: Record<string, unknown>) => void;

/**
 * Connection state enum.
 */
export type CDPConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

// ============================================================================
// SECTION 2: CDP COMMAND RESULT
// ============================================================================

/**
 * Generic CDP command result wrapper.
 * @template T Result payload type
 */
export interface CDPCommandResult<T = unknown> {
  /** Result payload */
  result: T;
  
  /** Error if command failed */
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ============================================================================
// SECTION 3: DOM NODE TYPES
// ============================================================================

/**
 * Complete CDP DOM node representation.
 * Mirrors Chrome DevTools Protocol DOM.Node.
 */
export interface CDPNode {
  /** Node identifier (unique within CDP session) */
  nodeId: number;
  
  /** Backend node ID (persistent across sessions) */
  backendNodeId: number;
  
  /** Node type constant (1=ELEMENT_NODE, 3=TEXT_NODE, etc.) */
  nodeType: number;
  
  /** Node name (uppercase for elements) */
  nodeName: string;
  
  /** Local name (lowercase for elements) */
  localName: string;
  
  /** Node value for text nodes */
  nodeValue: string;
  
  /** Child node count */
  childNodeCount?: number;
  
  /** Child nodes (if requested) */
  children?: CDPNode[];
  
  /** Attributes array [name1, value1, name2, value2, ...] */
  attributes?: string[];
  
  /** Document URL (for document nodes) */
  documentURL?: string;
  
  /** Base URL (for document nodes) */
  baseURL?: string;
  
  /** Public ID (for doctype nodes) */
  publicId?: string;
  
  /** System ID (for doctype nodes) */
  systemId?: string;
  
  /** Internal subset (for doctype nodes) */
  internalSubset?: string;
  
  /** XML version (for document nodes) */
  xmlVersion?: string;
  
  /** Name (for doctype/attr nodes) */
  name?: string;
  
  /** Value (for attr nodes) */
  value?: string;
  
  /** Pseudo element type */
  pseudoType?: string;
  
  /** Shadow root type (user-agent or open) */
  shadowRootType?: 'user-agent' | 'open' | 'closed';
  
  /** Frame ID (for frame owner elements) */
  frameId?: string;
  
  /** Content document (for frame owner elements) */
  contentDocument?: CDPNode;
  
  /** Shadow roots */
  shadowRoots?: CDPNode[];
  
  /** Template content (for template elements) */
  templateContent?: CDPNode;
  
  /** Pseudo elements */
  pseudoElements?: CDPNode[];
  
  /** Imported document (for link elements) */
  importedDocument?: CDPNode;
  
  /** Distributed nodes (for insertion points) */
  distributedNodes?: BackendNode[];
  
  /** Whether node is SVG */
  isSVG?: boolean;
  
  /** Compat mode (for documents) */
  compatibilityMode?: 'QuirksMode' | 'LimitedQuirksMode' | 'NoQuirksMode';
}

/**
 * Backend node reference.
 * Used for referencing nodes without full node data.
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
 * Type aliases for node identifiers.
 */
export type NodeId = number;
export type BackendNodeId = number;
export type RemoteObjectId = string;

// ============================================================================
// SECTION 4: BOX MODEL AND GEOMETRY
// ============================================================================

/**
 * Box model for an element.
 * Contains content, padding, border, and margin quads.
 */
export interface BoxModel {
  /** Content box quad (8 values: x1,y1, x2,y2, x3,y3, x4,y4) */
  content: Quad;
  
  /** Padding box quad */
  padding: Quad;
  
  /** Border box quad */
  border: Quad;
  
  /** Margin box quad */
  margin: Quad;
  
  /** Element width */
  width: number;
  
  /** Element height */
  height: number;
  
  /** Shape outside information (for CSS shapes) */
  shapeOutside?: ShapeOutsideInfo;
}

/**
 * Quad represented as 8 numbers [x1, y1, x2, y2, x3, y3, x4, y4].
 * Points are in clockwise order starting from top-left.
 */
export type Quad = [number, number, number, number, number, number, number, number];

/**
 * Bounding rectangle.
 */
export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Shape outside information for CSS shape-outside.
 */
export interface ShapeOutsideInfo {
  /** Bounds of the shape */
  bounds: Quad;
  
  /** Shape data (SVG path or similar) */
  shape: unknown[];
  
  /** Margin shape data */
  marginShape: unknown[];
}

// ============================================================================
// SECTION 5: ACCESSIBILITY TREE TYPES
// ============================================================================

/**
 * Complete accessibility tree node.
 * Mirrors Chrome DevTools Protocol Accessibility.AXNode.
 */
export interface AXNode {
  /** Accessibility node ID (not DOM node ID) */
  nodeId: string;
  
  /** Whether node is ignored by accessibility */
  ignored: boolean;
  
  /** Reasons why node is ignored */
  ignoredReasons?: Array<{
    name: string;
    value?: AXValue;
  }>;
  
  /** ARIA role */
  role?: AXValue;
  
  /** Accessible name */
  name?: AXValue;
  
  /** Accessible description */
  description?: AXValue;
  
  /** Accessible value */
  value?: AXValue;
  
  /** Accessibility properties */
  properties?: AXProperty[];
  
  /** Child accessibility node IDs */
  childIds?: string[];
  
  /** Backend DOM node ID */
  backendDOMNodeId: number;
}

/**
 * Accessibility property.
 */
export interface AXProperty {
  /** Property name */
  name: AXPropertyName;
  
  /** Property value */
  value: AXValue;
}

/**
 * Accessibility value with type information.
 */
export interface AXValue {
  /** Value type */
  type: AXValueType;
  
  /** Actual value */
  value?: string | number | boolean;
  
  /** Related nodes (for relatedNodes type) */
  relatedNodes?: AXRelatedNode[];
  
  /** Value sources (for accessibility computation) */
  sources?: AXValueSource[];
}

/**
 * Related accessibility node.
 */
export interface AXRelatedNode {
  /** Backend DOM node ID */
  backendDOMNodeId: number;
  
  /** ID reference (e.g., aria-labelledby target) */
  idref?: string;
  
  /** Text content */
  text?: string;
}

/**
 * Accessibility value source.
 * Describes how an accessibility value was computed.
 */
export interface AXValueSource {
  /** Source type */
  type: AXValueSourceType;
  
  /** Value from this source */
  value?: AXValue;
  
  /** Attribute name (for attribute sources) */
  attribute?: string;
  
  /** Attribute value */
  attributeValue?: AXValue;
  
  /** Whether this is a superseded source */
  superseded?: boolean;
  
  /** Native source (e.g., label, title) */
  nativeSource?: string;
  
  /** Native source value */
  nativeSourceValue?: AXValue;
  
  /** Whether value is invalid */
  invalid?: boolean;
  
  /** Invalid reason */
  invalidReason?: string;
}

/**
 * Accessibility property names.
 * Comprehensive list of ARIA and browser-native properties.
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
  | 'posInSet'
  | 'setSize';

/**
 * Accessibility value types.
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
 * Accessibility value source types.
 */
export type AXValueSourceType =
  | 'attribute'
  | 'implicit'
  | 'style'
  | 'contents'
  | 'placeholder'
  | 'relatedElement';

// ============================================================================
// SECTION 6: INPUT EVENT TYPES
// ============================================================================

/**
 * Mouse event types for Input.dispatchMouseEvent.
 */
export type MouseEventType =
  | 'mousePressed'
  | 'mouseReleased'
  | 'mouseMoved'
  | 'mouseWheel';

/**
 * Key event types for Input.dispatchKeyEvent.
 */
export type KeyEventType =
  | 'keyDown'
  | 'keyUp'
  | 'rawKeyDown'
  | 'char';

/**
 * Mouse button types.
 */
export type MouseButton =
  | 'none'
  | 'left'
  | 'middle'
  | 'right'
  | 'back'
  | 'forward';

/**
 * Input modifiers bitfield.
 */
export type InputModifiers =
  | 0     // None
  | 1     // Alt
  | 2     // Ctrl
  | 4     // Meta/Command
  | 8;    // Shift

/**
 * Mouse event parameters for Input.dispatchMouseEvent.
 */
export interface MouseEventParams {
  /** Event type */
  type: MouseEventType;
  
  /** X coordinate */
  x: number;
  
  /** Y coordinate */
  y: number;
  
  /** Modifiers bitfield */
  modifiers?: number;
  
  /** Timestamp (defaults to current time) */
  timestamp?: number;
  
  /** Mouse button */
  button?: MouseButton;
  
  /** Click count */
  clickCount?: number;
  
  /** Delta X for mouse wheel */
  deltaX?: number;
  
  /** Delta Y for mouse wheel */
  deltaY?: number;
  
  /** Pointer type */
  pointerType?: 'mouse' | 'pen';
}

/**
 * Key event parameters for Input.dispatchKeyEvent.
 */
export interface KeyEventParams {
  /** Event type */
  type: KeyEventType;
  
  /** Modifiers bitfield */
  modifiers?: number;
  
  /** Timestamp (defaults to current time) */
  timestamp?: number;
  
  /** Text generated by key press */
  text?: string;
  
  /** Unmodified text */
  unmodifiedText?: string;
  
  /** Key identifier (legacy) */
  keyIdentifier?: string;
  
  /** DOM KeyboardEvent.code */
  code?: string;
  
  /** DOM KeyboardEvent.key */
  key?: string;
  
  /** Windows virtual key code */
  windowsVirtualKeyCode?: number;
  
  /** Native virtual key code */
  nativeVirtualKeyCode?: number;
  
  /** Whether auto-repeated */
  autoRepeat?: boolean;
  
  /** Whether from keypad */
  isKeypad?: boolean;
  
  /** Whether is system key event */
  isSystemKey?: boolean;
  
  /** Location (0=standard, 1=left, 2=right, 3=numpad) */
  location?: number;
}

/**
 * Convert modifier flags to bitfield.
 */
export function modifiersToBitmask(modifiers: {
  alt?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}): number {
  let mask = 0;
  if (modifiers.alt) mask |= 1;
  if (modifiers.ctrl) mask |= 2;
  if (modifiers.meta) mask |= 4;
  if (modifiers.shift) mask |= 8;
  return mask;
}

// ============================================================================
// SECTION 7: PAGE TYPES
// ============================================================================

/**
 * Layout viewport dimensions and position.
 */
export interface LayoutViewport {
  /** X offset in CSS pixels */
  pageX: number;
  
  /** Y offset in CSS pixels */
  pageY: number;
  
  /** Width in CSS pixels */
  clientWidth: number;
  
  /** Height in CSS pixels */
  clientHeight: number;
}

/**
 * Visual viewport dimensions and position.
 */
export interface VisualViewport {
  /** X offset in CSS pixels */
  offsetX: number;
  
  /** Y offset in CSS pixels */
  offsetY: number;
  
  /** Width in CSS pixels */
  pageX: number;
  
  /** Height in CSS pixels */
  pageY: number;
  
  /** Width in CSS pixels */
  clientWidth: number;
  
  /** Height in CSS pixels */
  clientHeight: number;
  
  /** Scale factor */
  scale: number;
  
  /** Zoom level */
  zoom?: number;
}

/**
 * Layout metrics combining viewports and content size.
 */
export interface LayoutMetrics {
  /** Layout viewport */
  layoutViewport: LayoutViewport;
  
  /** Visual viewport */
  visualViewport: VisualViewport;
  
  /** Content size (full document) */
  contentSize: BoundingRect;
}

/**
 * Screenshot parameters for Page.captureScreenshot.
 */
export interface ScreenshotParams {
  /** Image format (jpeg, png, webp) */
  format?: 'jpeg' | 'png' | 'webp';
  
  /** Image quality (0-100, jpeg/webp only) */
  quality?: number;
  
  /** Clip rectangle */
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale?: number;
  };
  
  /** Capture beyond viewport */
  fromSurface?: boolean;
  
  /** Capture screenshot from surface (default) or view */
  captureBeyondViewport?: boolean;
}

// ============================================================================
// SECTION 8: RUNTIME TYPES
// ============================================================================

/**
 * Remote object representation.
 * Used for JavaScript objects accessed via CDP.
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
  
  /** Unserializable value (e.g., Infinity, NaN) */
  unserializableValue?: string;
  
  /** String representation */
  description?: string;
  
  /** Remote object ID (for non-primitive values) */
  objectId?: RemoteObjectId;
  
  /** Object preview */
  preview?: ObjectPreview;
  
  /** Custom preview */
  customPreview?: {
    header: string;
    bodyGetterId?: RemoteObjectId;
  };
}

/**
 * Remote object types.
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
 * Remote object subtypes.
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
 * Object preview (for console display).
 */
export interface ObjectPreview {
  /** Object type */
  type: RemoteObjectType;
  
  /** Object subtype */
  subtype?: RemoteObjectSubtype;
  
  /** String description */
  description?: string;
  
  /** Whether preview was truncated */
  overflow: boolean;
  
  /** Properties preview */
  properties: PropertyPreview[];
  
  /** Entries preview (for Map/Set) */
  entries?: EntryPreview[];
}

/**
 * Property preview.
 */
export interface PropertyPreview {
  /** Property name */
  name: string;
  
  /** Property type */
  type: RemoteObjectType;
  
  /** Property value (if primitive) */
  value?: string;
  
  /** Value preview (if object) */
  valuePreview?: ObjectPreview;
  
  /** Property subtype */
  subtype?: RemoteObjectSubtype;
}

/**
 * Entry preview (for Map/Set).
 */
export interface EntryPreview {
  /** Key preview */
  key?: ObjectPreview;
  
  /** Value preview */
  value: ObjectPreview;
}

// ============================================================================
// SECTION 9: LOCATOR RESULT
// ============================================================================

/**
 * Result of locating an element via CDP.
 */
export interface LocatorResult {
  /** Whether element was found */
  found: boolean;
  
  /** CDP node if found */
  cdpNode?: CDPNode;
  
  /** Accessibility node if found */
  axNode?: AXNode;
  
  /** Backend node ID if found */
  backendNodeId?: number;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Locator duration in ms */
  duration: number;
  
  /** Selector used */
  selector?: string;
  
  /** Strategy type used */
  strategyType?: string;
  
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// SECTION 10: WAIT OPTIONS
// ============================================================================

/**
 * Options for waiting for elements.
 */
export interface WaitOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Wait for element to be visible */
  visible?: boolean;
  
  /** Wait for element to be enabled (not disabled) */
  enabled?: boolean;
  
  /** Wait for element position to be stable */
  stable?: boolean;
  
  /** Polling interval in milliseconds */
  pollInterval?: number;
}

/**
 * Default wait options.
 */
export const DEFAULT_WAIT_OPTIONS: WaitOptions = {
  timeout: 30000,
  visible: true,
  enabled: true,
  stable: false,
  pollInterval: 100
} as const;

// ============================================================================
// SECTION 11: UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse CDP attributes array into Record<string, string>.
 * CDP returns attributes as [name1, value1, name2, value2, ...].
 */
export function parseAttributes(attributes?: string[]): Record<string, string> {
  if (!attributes || attributes.length === 0) {
    return {};
  }
  
  const result: Record<string, string> = {};
  for (let i = 0; i < attributes.length; i += 2) {
    result[attributes[i]] = attributes[i + 1] || '';
  }
  return result;
}

/**
 * Get accessible name from AXNode.
 */
export function getAccessibleName(axNode: AXNode): string | undefined {
  if (!axNode.name) {
    return undefined;
  }
  
  if (typeof axNode.name.value === 'string') {
    return axNode.name.value;
  }
  
  return undefined;
}

/**
 * Get accessible role from AXNode.
 */
export function getAccessibleRole(axNode: AXNode): string | undefined {
  if (!axNode.role) {
    return undefined;
  }
  
  if (typeof axNode.role.value === 'string') {
    return axNode.role.value;
  }
  
  return undefined;
}

/**
 * Get accessibility property value.
 */
export function getAXProperty(
  axNode: AXNode,
  propertyName: AXPropertyName
): AXValue | undefined {
  if (!axNode.properties) {
    return undefined;
  }
  
  const property = axNode.properties.find((p) => p.name === propertyName);
  return property?.value;
}

/**
 * Convert CDP Quad to BoundingRect.
 * Takes the bounding box of the quad points.
 */
export function quadToBoundingRect(quad: Quad): BoundingRect {
  const xs = [quad[0], quad[2], quad[4], quad[6]];
  const ys = [quad[1], quad[3], quad[5], quad[7]];
  
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;
  
  return { x, y, width, height };
}

/**
 * Get center point of a BoundingRect.
 */
export function getCenterPoint(rect: BoundingRect): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

// ============================================================================
// SECTION 11: LOCATOR RESULT
// ============================================================================

/**
 * Result of a locator query operation.
 * Used by PlaywrightLocators and other services to return element lookup results.
 */
export interface LocatorResult {
  /** Whether the element was found */
  found: boolean;
  
  /** CDP NodeId (from DOM.querySelector) - optional */
  nodeId?: number;
  
  /** CDP BackendNodeId (from Accessibility tree) - optional */
  backendNodeId?: number;
  
  /** Selector used (if applicable) */
  selector?: string;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Query duration in milliseconds */
  duration: number;
}
