// src/types/cdp.ts
export interface CDPNode {
  nodeId: number;
  backendNodeId: number;
  nodeType: number;
  nodeName: string;
  localName: string;
  nodeValue: string;
  attributes?: string[];
  childNodeCount?: number;
  children?: CDPNode[];
}

export interface AXNode {
  nodeId: string;
  role: { type: string; value: string };
  name?: { type: string; value: string };
  description?: { type: string; value: string };
  value?: { type: string; value: string };
  properties?: AXProperty[];
  backendDOMNodeId: number;
  childIds?: string[];
}

export interface AXProperty {
  name: string;
  value: { type: string; value: unknown };
}

export interface LocatorResult {
  found: boolean;
  element?: Element;
  cdpNode?: CDPNode;
  axNode?: AXNode;
  confidence: number;
  duration: number;
  selector?: string;
}

export interface WaitOptions {
  timeout?: number;
  visible?: boolean;
  enabled?: boolean;
  stable?: boolean;
  pollInterval?: number;
}

export interface CDPCommandResult<T = unknown> {
  result: T;
  error?: { code: number; message: string };
}

export interface BoxModel {
  content: number[];
  padding: number[];
  border: number[];
  margin: number[];
  width: number;
  height: number;
}

export const DEFAULT_WAIT_OPTIONS: WaitOptions = {
  timeout: 30000,
  visible: true,
  enabled: true,
  stable: false,
  pollInterval: 100
};
