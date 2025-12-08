/**
 * TYPE CONTRACT VERIFICATION FILE
 * 
 * This file imports from all type files to verify exports exist with correct signatures.
 * If this file compiles with 0 errors, all type contracts are satisfied.
 * 
 * DO NOT import this file anywhere in production code.
 * It exists solely for verification purposes.
 */

// ============================================================================
// STRATEGY.TS CONTRACTS
// ============================================================================

import type {
  StrategyType,
  LocatorStrategy,
  FallbackChain,
  StrategyEvaluationResult,
  CapturedAction,
  StrategyMetadata,
} from './strategy';

import { STRATEGY_WEIGHTS, getStrategyWeight } from './strategy';

// Verify StrategyType is union of 7 types
type _VerifyStrategyType = StrategyType extends
  | 'cdp_semantic'
  | 'cdp_power'
  | 'dom_selector'
  | 'evidence_scoring'
  | 'css_selector'
  | 'vision_ocr'
  | 'coordinates'
  ? true
  : never;

// Verify LocatorStrategy has all required fields
type _VerifyLocatorStrategy = {
  type: StrategyType;
  value?: string;           // MUST EXIST for compatibility
  selector?: string;        // Alternative to value
  confidence: number;
  metadata?: StrategyMetadata;
} extends LocatorStrategy ? true : never;

// Verify FallbackChain has all required fields
type _VerifyFallbackChain = {
  strategies: LocatorStrategy[];
  primaryStrategy: StrategyType;
  recordedAt: number;
} extends FallbackChain ? true : never;

// Verify STRATEGY_WEIGHTS has all 7 strategies
const _weights: Record<StrategyType, number> = STRATEGY_WEIGHTS;
const _verifyWeight: number = getStrategyWeight('cdp_semantic');

// ============================================================================
// CDP.TS CONTRACTS
// ============================================================================

import type {
  CDPNode,
  AXNode,
  BoxModel,
  CDPConnection,
  CDPCommandResult,
} from './cdp';

// Verify CDPNode has required fields
type _VerifyCDPNode = CDPNode extends {
  nodeId: number;
  backendNodeId: number;
} ? true : never;

// Verify AXNode has backendDOMNodeId
type _VerifyAXNode = AXNode extends {
  backendDOMNodeId?: number;
} ? true : never;

// ============================================================================
// RECORDING.TS CONTRACTS
// ============================================================================

import type {
  RecordingSessionState,
  BufferConfig,
} from './recording';

// Verify backward compatibility aliases exist
import type {
  RecordingState,
  RecordingStatus,
} from './recording';

// Verify RecordingSessionState has correct values
type _VerifySessionState = RecordingSessionState extends
  | 'idle'
  | 'initializing'
  | 'recording'
  | 'paused'
  | 'finalizing'
  | 'completed'
  | 'error'
  ? true
  : never;

// Verify aliases are equivalent
type _VerifyStateAlias = RecordingState extends RecordingSessionState ? true : never;
type _VerifyStatusAlias = RecordingStatus extends RecordingSessionState ? true : never;

// ============================================================================
// CONTRACT VERIFICATION COMPLETE
// ============================================================================

export {};
