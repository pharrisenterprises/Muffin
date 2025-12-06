/**
 * AUTOMATION ORCHESTRATOR
 * 
 * Multi-tier fallback system for robust test automation
 * 
 * TIER ORDER (CRITICAL - DO NOT CHANGE):
 * 1. Native DOM   - Standard DOM methods with context validation (fastest, most reliable)
 * 2. CDP Protocol - Chrome DevTools Protocol (bypasses some DOM issues)
 * 3. Vision OCR   - Coordinate-based with visual verification (handles dynamic elements)
 * 4. Manual       - User-defined coordinates (LAST RESORT ONLY)
 * 
 * ⚠️ Manual Selector is ALWAYS LAST. It is a safety net, not a primary method.
 */

import { RecordedStep } from '../recording/types';
import { 
  AutomationTier, 
  TierConfig, 
  DEFAULT_TIER_CONFIG,
  OrchestratorResult,
  TierResult 
} from './types';
import { NativeDOMTier } from './tiers/NativeDOMTier';
import { CDPTier } from './tiers/CDPTier';
import { VisionOCRTier } from './tiers/VisionOCRTier';
import { ManualSelectorTier } from './tiers/ManualSelectorTier';

export class AutomationOrchestrator {
  private tierConfig: TierConfig[];
  
  // Tier implementations
  private nativeDOMTier: NativeDOMTier;
  private cdpTier: CDPTier;
  private visionOCRTier: VisionOCRTier;
  private manualSelectorTier: ManualSelectorTier;
  
  constructor(config?: Partial<TierConfig>[]) {
    // Merge with defaults, ensuring correct priority order
    this.tierConfig = DEFAULT_TIER_CONFIG.map((defaultTier) => {
      const override = config?.find(c => c.tier === defaultTier.tier);
      return { ...defaultTier, ...override };
    }).sort((a, b) => a.priority - b.priority); // ALWAYS sort by priority
    
    // Initialize tiers
    this.nativeDOMTier = new NativeDOMTier();
    this.cdpTier = new CDPTier();
    this.visionOCRTier = new VisionOCRTier();
    this.manualSelectorTier = new ManualSelectorTier();
    
    console.log('[Orchestrator] Initialized with tier order:', 
      this.tierConfig.filter(t => t.enabled).map(t => `${t.priority}:${t.tier}`).join(' → ')
    );
  }
  
  /**
   * Execute a step using tiered fallback
   */
  async executeStep(step: RecordedStep): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const tierResults: TierResult[] = [];
    
    console.log(`\n[Orchestrator] ═══════════════════════════════════════`);
    console.log(`[Orchestrator] Executing: ${step.label}`);
    console.log(`[Orchestrator] ═══════════════════════════════════════`);
    
    // Skip "open" events
    if (step.event === 'open') {
      return {
        success: true,
        usedTier: 'native_dom',
        tierResults: [],
        totalDuration: 0,
      };
    }
    
    // Try each tier in priority order
    for (const tierConfig of this.tierConfig) {
      if (!tierConfig.enabled) {
        console.log(`[Orchestrator] Skipping disabled tier: ${tierConfig.tier}`);
        continue;
      }
      
      console.log(`[Orchestrator] Trying tier ${tierConfig.priority}: ${tierConfig.tier}`);
      
      let result: TierResult;
      
      try {
        result = await this.executeTier(tierConfig.tier, step);
      } catch (error) {
        result = {
          tier: tierConfig.tier,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: 0,
        };
      }
      
      tierResults.push(result);
      
      // If successful, return immediately
      if (result.success) {
        console.log(`[Orchestrator] ✓ SUCCESS via ${tierConfig.tier} (${result.duration}ms)`);
        
        return {
          success: true,
          usedTier: tierConfig.tier,
          tierResults,
          totalDuration: Date.now() - startTime,
          element: result.element,
        };
      }
      
      console.log(`[Orchestrator] ✗ ${tierConfig.tier} failed: ${result.error}`);
    }
    
    // All tiers failed
    console.error('[Orchestrator] ✗ ALL TIERS FAILED');
    
    return {
      success: false,
      usedTier: 'manual_selector',
      tierResults,
      totalDuration: Date.now() - startTime,
      error: 'All automation tiers failed. Consider using Manual Selector Tool to define coordinates.',
    };
  }
  
  /**
   * Execute a specific tier
   */
  private async executeTier(tier: AutomationTier, step: RecordedStep): Promise<TierResult> {
    switch (tier) {
      case 'native_dom':
        return this.nativeDOMTier.execute(step);
        
      case 'cdp_protocol':
        return this.cdpTier.execute(step);
        
      case 'vision_ocr':
        return this.visionOCRTier.execute(step);
        
      case 'manual_selector':
        return this.manualSelectorTier.execute(step);
        
      default:
        return {
          tier,
          success: false,
          error: `Unknown tier: ${tier}`,
          duration: 0,
        };
    }
  }
  
  /**
   * Execute all steps with orchestration
   */
  async executeAll(steps: RecordedStep[]): Promise<OrchestratorResult[]> {
    const results: OrchestratorResult[] = [];
    
    console.log(`[Orchestrator] Starting playback of ${steps.length} steps`);
    
    for (const step of steps) {
      const result = await this.executeStep(step);
      results.push(result);
      
      // Small delay between steps
      await this.sleep(100);
    }
    
    // Summary
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n[Orchestrator] ═══════════════════════════════════════`);
    console.log(`[Orchestrator] PLAYBACK COMPLETE`);
    console.log(`[Orchestrator] Passed: ${passed} / ${steps.length}`);
    console.log(`[Orchestrator] Failed: ${failed}`);
    console.log(`[Orchestrator] ═══════════════════════════════════════\n`);
    
    return results;
  }
  
  /**
   * Get current tier configuration
   */
  getTierConfig(): TierConfig[] {
    return [...this.tierConfig];
  }
  
  /**
   * Update tier configuration
   */
  updateTierConfig(updates: Partial<TierConfig>[]): void {
    for (const update of updates) {
      const tier = this.tierConfig.find(t => t.tier === update.tier);
      if (tier) {
        Object.assign(tier, update);
      }
    }
    // Re-sort by priority
    this.tierConfig.sort((a, b) => a.priority - b.priority);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const automationOrchestrator = new AutomationOrchestrator();
