/**
 * AUTOMATION ORCHESTRATOR TYPES
 */

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMATION TIERS
// ═══════════════════════════════════════════════════════════════════════════

export type AutomationTier = 
  | 'native_dom'      // Tier 1: Standard DOM methods (fastest)
  | 'cdp_protocol'    // Tier 2: Chrome DevTools Protocol
  | 'vision_ocr'      // Tier 3: Coordinate-based with OCR verification
  | 'manual_selector' // Tier 4: User-defined manual coordinates (LAST RESORT)
  ;

export interface TierConfig {
  tier: AutomationTier;
  enabled: boolean;
  timeout: number;
  priority: number; // Lower = higher priority
}

export const DEFAULT_TIER_CONFIG: TierConfig[] = [
  { tier: 'native_dom',      enabled: true,  timeout: 3000, priority: 1 },
  { tier: 'cdp_protocol',    enabled: true,  timeout: 3000, priority: 2 },
  { tier: 'vision_ocr',      enabled: true,  timeout: 5000, priority: 3 },
  { tier: 'manual_selector', enabled: true,  timeout: 1000, priority: 4 }, // LAST!
];

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION RESULTS
// ═══════════════════════════════════════════════════════════════════════════

export interface TierResult {
  tier: AutomationTier;
  success: boolean;
  element?: HTMLElement;
  error?: string;
  duration: number;
  confidence?: number;
}

export interface OrchestratorResult {
  success: boolean;
  usedTier: AutomationTier;
  tierResults: TierResult[];
  totalDuration: number;
  element?: HTMLElement;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CDP TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CDPConnection {
  tabId: number;
  attached: boolean;
}

export interface CDPNodeInfo {
  nodeId: number;
  backendNodeId: number;
  objectId?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL SELECTOR TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ManualSelectorData {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  timestamp: number;
  viewportWidth: number;
  viewportHeight: number;
  label?: string;
}
