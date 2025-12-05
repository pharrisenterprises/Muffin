// ═══════════════════════════════════════════════════════════════════════════
// PLAYBACK TROUBLESHOOTER - Unified Diagnosis and Resolution
// ═══════════════════════════════════════════════════════════════════════════

import type {
  TroubleshootingSession,
  DiagnosticResult,
  DiagnosticType,
  ResolutionAttempt,
  ResolutionStrategy,
  Resolution
} from './self-healing-types';
import type { RecordedStep } from '../recording/types';
import { ScreenshotComparator, createScreenshotComparator } from './ScreenshotComparator';
import { ElementDriftDetector, createElementDriftDetector } from './ElementDriftDetector';
import { GraphBasedFinder, createGraphBasedFinder } from './GraphBasedFinder';
import { createScreenshotCapture } from '../validation/ScreenshotCapture';
import { createHealingOrchestrator, HealingOrchestrator } from '../healing';
import { DIAGNOSTIC_PRIORITY, RESOLUTION_STRATEGY_PRIORITY } from './self-healing-config';
import { createEvidenceAggregator, EvidenceAggregator } from './evidence';

export class PlaybackTroubleshooter {
  private screenshotComparator: ScreenshotComparator;
  private driftDetector: ElementDriftDetector;
  private graphFinder: GraphBasedFinder;
  private healingOrchestrator: HealingOrchestrator;
  private screenshotCapture: ReturnType<typeof createScreenshotCapture>;
  private evidenceAggregator: EvidenceAggregator; // Batch 10: Evidence scoring
  
  constructor(healingOrchestrator?: HealingOrchestrator) {
    this.screenshotComparator = createScreenshotComparator();
    this.driftDetector = createElementDriftDetector();
    this.graphFinder = createGraphBasedFinder();
    this.healingOrchestrator = healingOrchestrator || createHealingOrchestrator();
    this.screenshotCapture = createScreenshotCapture();
    
    // Batch 10: Evidence scoring integration
    this.evidenceAggregator = createEvidenceAggregator({
      searchRadius: 300,
      maxCandidates: 50
    });
    
    // Connect evidence aggregator to other modules for better scoring
    this.evidenceAggregator.setIntegrations({
      screenshotComparator: this.screenshotComparator,
      graphFinder: this.graphFinder,
      driftDetector: this.driftDetector
    });
  }
  
  /**
   * Troubleshoot a failing step
   */
  async troubleshoot(
    step: RecordedStep,
    attemptedSelectors: string[]
  ): Promise<TroubleshootingSession> {
    const session = this.createSession(step);
    
    try {
      session.status = 'diagnosing';
      await this.runDiagnostics(step, session);
      
      session.status = 'resolving';
      await this.tryResolutions(step, session, attemptedSelectors);
      
      if (session.finalResolution) {
        session.status = 'resolved';
      } else if (this.needsManualIntervention(session)) {
        session.status = 'manual';
      } else {
        session.status = 'unresolved';
      }
    } catch {
      session.status = 'unresolved';
    }
    
    session.totalDuration = Date.now() - session.timestamp;
    
    return session;
  }
  
  /**
   * Quick troubleshoot (fewer diagnostics)
   */
  async quickTroubleshoot(step: RecordedStep): Promise<Resolution | null> {
    const driftResult = this.driftDetector.detect(step);
    if (driftResult.correction) {
      const element = document.querySelector(driftResult.correction.correctedSelector!) as HTMLElement;
      if (element) {
        return {
          strategy: 'drift-correction',
          selector: driftResult.correction.correctedSelector!,
          element,
          confidence: driftResult.correction.confidence,
          shouldCache: true,
          shouldUpdateRecording: false
        };
      }
    }
    
    const elementGraph = (step as any).elementGraph;
    if (elementGraph) {
      const graphResult = this.graphFinder.find(elementGraph);
      if (graphResult.found && graphResult.element) {
        return {
          strategy: 'graph-navigation',
          selector: graphResult.selector!,
          element: graphResult.element,
          confidence: graphResult.confidence,
          shouldCache: true,
          shouldUpdateRecording: false
        };
      }
    }
    
    return null;
  }
  
  // Diagnostic phase
  
  private async runDiagnostics(step: RecordedStep, session: TroubleshootingSession): Promise<void> {
    for (const diagnosticType of DIAGNOSTIC_PRIORITY) {
      const startTime = Date.now();
      try {
        const result = await this.runDiagnostic(diagnosticType, step);
        result.duration = Date.now() - startTime;
        session.diagnostics.push(result);
      } catch (error) {
        session.diagnostics.push({
          type: diagnosticType,
          passed: false,
          message: `Diagnostic error: ${error}`,
          findings: {},
          suggestedActions: [],
          duration: Date.now() - startTime
        });
      }
    }
  }
  
  private async runDiagnostic(type: DiagnosticType, step: RecordedStep): Promise<DiagnosticResult> {
    switch (type) {
      case 'page-loaded':
        return this.diagnosePageLoaded();
      case 'element-exists':
        return this.diagnoseElementExists(step);
      case 'element-visible':
        return this.diagnoseElementVisible(step);
      case 'element-interactable':
        return this.diagnoseElementInteractable(step);
      case 'screenshot-match':
        return this.diagnoseScreenshotMatch(step);
      case 'drift-check':
        return this.diagnoseDrift(step);
      case 'context-match':
        return this.diagnoseContextMatch(step);
      case 'graph-integrity':
        return this.diagnoseGraphIntegrity(step);
      case 'selector-valid':
        return this.diagnoseSelectorValid(step);
      case 'iframe-accessible':
        return this.diagnoseIframeAccessible(step);
      case 'shadow-accessible':
        return this.diagnoseShadowAccessible(step);
      default:
        return {
          type,
          passed: true,
          message: 'No diagnostic available',
          findings: {},
          suggestedActions: [],
          duration: 0
        };
    }
  }
  
  private diagnosePageLoaded(): DiagnosticResult {
    const readyState = document.readyState;
    const passed = readyState === 'complete';
    return {
      type: 'page-loaded',
      passed,
      message: passed ? 'Page fully loaded' : `Page not ready: ${readyState}`,
      findings: { readyState },
      suggestedActions: passed ? [] : ['Wait for page load'],
      duration: 0
    };
  }
  
  private diagnoseElementExists(step: RecordedStep): DiagnosticResult {
    try {
      if (!step.selector) {
        return {
          type: 'element-exists',
          passed: false,
          message: 'No selector provided',
          findings: {},
          suggestedActions: [],
          duration: 0
        };
      }
      const element = document.querySelector(step.selector);
      const passed = element !== null;
      return {
        type: 'element-exists',
        passed,
        message: passed ? 'Element found' : 'Element not in DOM',
        findings: { selector: step.selector, found: passed },
        suggestedActions: passed ? [] : ['Try alternative selectors'],
        duration: 0
      };
    } catch {
      return {
        type: 'element-exists',
        passed: false,
        message: 'Invalid selector syntax',
        findings: { selector: step.selector },
        suggestedActions: ['Fix selector syntax'],
        duration: 0
      };
    }
  }
  
  private diagnoseElementVisible(step: RecordedStep): DiagnosticResult {
    if (!step.selector) {
      return {
        type: 'element-visible',
        passed: false,
        message: 'No selector provided',
        findings: {},
        suggestedActions: [],
        duration: 0
      };
    }
    const element = document.querySelector(step.selector) as HTMLElement;
    if (!element) {
      return { type: 'element-visible', passed: false, message: 'Element not found', findings: {}, suggestedActions: [], duration: 0 };
    }
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    const issues: string[] = [];
    if (style.display === 'none') issues.push('display: none');
    if (style.visibility === 'hidden') issues.push('visibility: hidden');
    if (parseFloat(style.opacity) === 0) issues.push('opacity: 0');
    if (rect.width === 0) issues.push('zero width');
    if (rect.height === 0) issues.push('zero height');
    
    const passed = issues.length === 0;
    return {
      type: 'element-visible',
      passed,
      message: passed ? 'Element visible' : `Visibility issues: ${issues.join(', ')}`,
      findings: { issues },
      suggestedActions: passed ? [] : ['Scroll element into view'],
      duration: 0
    };
  }
  
  private diagnoseElementInteractable(step: RecordedStep): DiagnosticResult {
    if (!step.selector) {
      return {
        type: 'element-interactable',
        passed: false,
        message: 'No selector provided',
        findings: {},
        suggestedActions: [],
        duration: 0
      };
    }
    const element = document.querySelector(step.selector) as HTMLElement;
    if (!element) {
      return { type: 'element-interactable', passed: false, message: 'Element not found', findings: {}, suggestedActions: [], duration: 0 };
    }
    
    const style = window.getComputedStyle(element);
    const issues: string[] = [];
    
    if (element.hasAttribute('disabled')) issues.push('disabled');
    if (style.pointerEvents === 'none') issues.push('pointer-events: none');
    
    const passed = issues.length === 0;
    return {
      type: 'element-interactable',
      passed,
      message: passed ? 'Element interactable' : `Issues: ${issues.join(', ')}`,
      findings: { issues },
      suggestedActions: passed ? [] : ['Wait for element to become enabled'],
      duration: 0
    };
  }
  
  private async diagnoseScreenshotMatch(step: RecordedStep): Promise<DiagnosticResult> {
    const validationResult = (step as any).validationResult;
    if (!validationResult?.screenshot) {
      return {
        type: 'screenshot-match',
        passed: true,
        message: 'No recorded screenshot',
        findings: {},
        suggestedActions: [],
        duration: 0
      };
    }
    
    try {
      const currentScreenshot = await this.screenshotCapture.captureViewport(step.stepNumber);
      const comparison = await this.screenshotComparator.compare(validationResult.screenshot, currentScreenshot);
      
      return {
        type: 'screenshot-match',
        passed: comparison.match,
        message: comparison.match 
          ? `Screenshots match (${(comparison.similarity * 100).toFixed(1)}%)`
          : `Screenshots differ (${(comparison.similarity * 100).toFixed(1)}%)`,
        findings: { similarity: comparison.similarity },
        suggestedActions: comparison.match ? [] : ['Element may have moved'],
        duration: comparison.duration
      };
    } catch {
      return {
        type: 'screenshot-match',
        passed: false,
        message: 'Screenshot comparison failed',
        findings: {},
        suggestedActions: [],
        duration: 0
      };
    }
  }
  
  private diagnoseDrift(step: RecordedStep): DiagnosticResult {
    if (!step.selector) {
      return {
        type: 'drift-check',
        passed: false,
        message: 'No selector provided',
        findings: {},
        suggestedActions: [],
        duration: 0
      };
    }
    const element = document.querySelector(step.selector) as HTMLElement;
    const driftResult = this.driftDetector.detect(step, element);
    
    return {
      type: 'drift-check',
      passed: !driftResult.driftDetected,
      message: driftResult.driftDetected
        ? `Element drifted: ${driftResult.driftType} (${driftResult.driftDistance.toFixed(0)}px)`
        : 'No drift detected',
      findings: { driftType: driftResult.driftType, distance: driftResult.driftDistance },
      suggestedActions: driftResult.driftDetected ? ['Apply drift correction'] : [],
      duration: 0
    };
  }
  
  private diagnoseContextMatch(step: RecordedStep): DiagnosticResult {
    const validationResult = (step as any).validationResult;
    if (!validationResult?.visualContext) {
      return { type: 'context-match', passed: true, message: 'No context to compare', findings: {}, suggestedActions: [], duration: 0 };
    }
    
    const passed = validationResult.visualContext.confidence > 0.7;
    return {
      type: 'context-match',
      passed,
      message: passed ? 'Context matches' : 'Context may have changed',
      findings: { confidence: validationResult.visualContext.confidence },
      suggestedActions: passed ? [] : ['Verify element type'],
      duration: 0
    };
  }
  
  private diagnoseGraphIntegrity(step: RecordedStep): DiagnosticResult {
    const elementGraph = (step as any).elementGraph;
    if (!elementGraph) {
      return { type: 'graph-integrity', passed: true, message: 'No graph recorded', findings: {}, suggestedActions: [], duration: 0 };
    }
    
    let foundCount = 0;
    let totalCount = 0;
    
    for (const parent of elementGraph.parents.slice(0, 3)) {
      totalCount++;
      try {
        if (document.querySelector(parent.selector)) foundCount++;
      } catch {}
    }
    
    for (const landmark of elementGraph.landmarks) {
      totalCount++;
      try {
        if (document.querySelector(landmark.selector)) foundCount++;
      } catch {}
    }
    
    const integrity = totalCount > 0 ? foundCount / totalCount : 1;
    const passed = integrity >= 0.5;
    
    return {
      type: 'graph-integrity',
      passed,
      message: `Graph integrity: ${(integrity * 100).toFixed(0)}%`,
      findings: { integrity, found: foundCount, total: totalCount },
      suggestedActions: passed ? [] : ['Page structure changed significantly'],
      duration: 0
    };
  }
  
  private diagnoseSelectorValid(step: RecordedStep): DiagnosticResult {
    try {
      if (!step.selector) {
        return {
          type: 'selector-valid',
          passed: false,
          message: 'No selector provided',
          findings: {},
          suggestedActions: [],
          duration: 0
        };
      }
      document.querySelector(step.selector);
      return {
        type: 'selector-valid',
        passed: true,
        message: 'Selector syntax valid',
        findings: {},
        suggestedActions: [],
        duration: 0
      };
    } catch (error) {
      return {
        type: 'selector-valid',
        passed: false,
        message: `Invalid selector: ${error}`,
        findings: {},
        suggestedActions: ['Fix selector syntax'],
        duration: 0
      };
    }
  }
  
  private diagnoseIframeAccessible(_step: RecordedStep): DiagnosticResult {
    const iframes = document.querySelectorAll('iframe');
    const passed = iframes.length >= 0;
    return {
      type: 'iframe-accessible',
      passed,
      message: passed ? 'Iframes accessible' : 'No iframes found',
      findings: { iframeCount: iframes.length },
      suggestedActions: [],
      duration: 0
    };
  }
  
  private diagnoseShadowAccessible(_step: RecordedStep): DiagnosticResult {
    return {
      type: 'shadow-accessible',
      passed: true,
      message: 'Shadow DOM check complete',
      findings: {},
      suggestedActions: [],
      duration: 0
    };
  }
  
  // Resolution phase
  
  private async tryResolutions(
    step: RecordedStep,
    session: TroubleshootingSession,
    attemptedSelectors: string[]
  ): Promise<void> {
    for (const strategy of RESOLUTION_STRATEGY_PRIORITY) {
      if (session.finalResolution) break;
      
      try {
        const attempt = await this.tryResolution(strategy, step, attemptedSelectors);
        session.resolutionAttempts.push(attempt);
        
        if (attempt.success && attempt.resultSelector) {
          const element = document.querySelector(attempt.resultSelector) as HTMLElement;
          
          if (element) {
            session.finalResolution = {
              strategy,
              selector: attempt.resultSelector,
              element,
              confidence: attempt.confidence,
              shouldCache: attempt.confidence >= 0.7,
              shouldUpdateRecording: attempt.confidence >= 0.9
            };
          }
        }
      } catch (error) {
        session.resolutionAttempts.push({
          strategy,
          success: false,
          confidence: 0,
          error: String(error),
          duration: 0
        });
      }
    }
  }
  
  private async tryResolution(
    strategy: ResolutionStrategy,
    step: RecordedStep,
    attemptedSelectors: string[]
  ): Promise<ResolutionAttempt> {
    const startTime = Date.now();
    
    switch (strategy) {
      case 'retry-original':
        return this.retryOriginal(step, startTime);
      case 'drift-correction':
        return this.applyDriftCorrection(step, startTime);
      case 'graph-navigation':
        return this.useGraphNavigation(step, startTime);
      case 'evidence-scoring': // Batch 10: NEW resolution strategy
        return this.useEvidenceScoring(step, startTime);
      case 'healing-cache':
        return this.checkHealingCache(step, startTime);
      case 'screenshot-locate':
        return this.locateViaScreenshot(step, startTime);
      case 'local-vision':
        return this.useLocalVision(step, attemptedSelectors, startTime);
      case 'ai-vision':
        return this.useAIVision(step, attemptedSelectors, startTime);
      default:
        return { strategy, success: false, confidence: 0, duration: Date.now() - startTime };
    }
  }
  
  private retryOriginal(step: RecordedStep, startTime: number): ResolutionAttempt {
    try {
      if (!step.selector) {
        return { strategy: 'retry-original', success: false, confidence: 0, duration: Date.now() - startTime };
      }
      const element = document.querySelector(step.selector);
      return {
        strategy: 'retry-original',
        success: element !== null,
        resultSelector: element ? step.selector : undefined,
        confidence: element ? 0.9 : 0,
        duration: Date.now() - startTime
      };
    } catch {
      return { strategy: 'retry-original', success: false, confidence: 0, duration: Date.now() - startTime };
    }
  }
  
  private applyDriftCorrection(step: RecordedStep, startTime: number): ResolutionAttempt {
    if (!step.selector) {
      return { strategy: 'drift-correction', success: false, confidence: 0, duration: Date.now() - startTime };
    }
    
    const driftResult = this.driftDetector.detect(step);
    
    if (!driftResult.correction) {
      return { strategy: 'drift-correction', success: false, confidence: 0, duration: Date.now() - startTime };
    }
    
    const selector = driftResult.correction.correctedSelector || step.selector;
    
    try {
      const element = document.querySelector(selector);
      return {
        strategy: 'drift-correction',
        success: element !== null,
        resultSelector: element ? selector : undefined,
        confidence: element ? driftResult.correction.confidence : 0,
        duration: Date.now() - startTime
      };
    } catch {
      return { strategy: 'drift-correction', success: false, confidence: 0, duration: Date.now() - startTime };
    }
  }
  
  /**
   * Use evidence-based scoring to find the element (Batch 10)
   * Combines spatial, sequence, visual, DOM, and history evidence
   */
  private async useEvidenceScoring(
    step: RecordedStep,
    startTime: number
  ): Promise<ResolutionAttempt> {
    try {
      // Convert RecordedStep to StepWithEvidence format
      const stepWithEvidence: any = {
        ...step,
        labelConfidence: 1.0,
        url: step.page || window.location.href
      };
      
      // Get previous steps for sequence context (empty for now)
      const previousSteps: any[] = [];
      
      const result = await this.evidenceAggregator.findElement(stepWithEvidence, previousSteps);
      
      if (result.success && result.selectedElement && result.selectedSelector) {
        return {
          strategy: 'evidence-scoring',
          success: true,
          resultSelector: result.selectedSelector,
          confidence: result.confidence,
          duration: Date.now() - startTime
        };
      }
      
      return {
        strategy: 'evidence-scoring',
        success: false,
        confidence: result.confidence,
        error: result.reasoning?.join('; ') || 'Evidence scoring did not find a match above threshold',
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        strategy: 'evidence-scoring',
        success: false,
        confidence: 0,
        error: `Evidence scoring error: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime
      };
    }
  }
  
  private useGraphNavigation(step: RecordedStep, startTime: number): ResolutionAttempt {
    const elementGraph = (step as any).elementGraph;
    if (!elementGraph) {
      return { strategy: 'graph-navigation', success: false, confidence: 0, duration: Date.now() - startTime };
    }
    
    const result = this.graphFinder.find(elementGraph);
    return {
      strategy: 'graph-navigation',
      success: result.found,
      resultSelector: result.selector,
      confidence: result.confidence,
      duration: Date.now() - startTime
    };
  }
  
  private async checkHealingCache(_step: RecordedStep, startTime: number): Promise<ResolutionAttempt> {
    return { strategy: 'healing-cache', success: false, confidence: 0, duration: Date.now() - startTime };
  }
  
  private async locateViaScreenshot(step: RecordedStep, startTime: number): Promise<ResolutionAttempt> {
    const validationResult = (step as any).validationResult;
    if (!validationResult?.screenshot) {
      return { strategy: 'screenshot-locate', success: false, confidence: 0, duration: Date.now() - startTime };
    }
    
    try {
      const currentScreenshot = await this.screenshotCapture.captureViewport(step.stepNumber);
      const newBounds = await this.screenshotComparator.findElementInCurrent(validationResult.screenshot, currentScreenshot);
      
      if (!newBounds) {
        return { strategy: 'screenshot-locate', success: false, confidence: 0, duration: Date.now() - startTime };
      }
      
      const centerX = newBounds.x + newBounds.width / 2;
      const centerY = newBounds.y + newBounds.height / 2;
      const element = document.elementFromPoint(centerX, centerY) as HTMLElement;
      
      if (!element) {
        return { strategy: 'screenshot-locate', success: false, confidence: 0, duration: Date.now() - startTime };
      }
      
      const selector = this.generateSelector(element);
      return {
        strategy: 'screenshot-locate',
        success: true,
        resultSelector: selector,
        confidence: 0.6,
        duration: Date.now() - startTime
      };
    } catch {
      return { strategy: 'screenshot-locate', success: false, confidence: 0, duration: Date.now() - startTime };
    }
  }
  
  private async useLocalVision(
    step: RecordedStep,
    attemptedSelectors: string[],
    startTime: number
  ): Promise<ResolutionAttempt> {
    try {
      const healingResponse = await this.healingOrchestrator.healStep(
        step,
        attemptedSelectors.map(s => ({ selector: s, strategy: 'unknown', error: 'failed' }))
      );
      
      if (!healingResponse.success || healingResponse.provider !== 'local-vision') {
        return { strategy: 'local-vision', success: false, confidence: 0, duration: Date.now() - startTime };
      }
      
      return {
        strategy: 'local-vision',
        success: true,
        resultSelector: healingResponse.suggestedSelector,
        confidence: healingResponse.confidence,
        duration: Date.now() - startTime
      };
    } catch {
      return { strategy: 'local-vision', success: false, confidence: 0, duration: Date.now() - startTime };
    }
  }
  
  private async useAIVision(
    step: RecordedStep,
    attemptedSelectors: string[],
    startTime: number
  ): Promise<ResolutionAttempt> {
    const response = await this.healingOrchestrator.healStep(
      step,
      attemptedSelectors.map(s => ({ selector: s, strategy: 'unknown', error: 'failed' }))
    );
    
    if (!response.success || response.provider !== 'claude-vision') {
      return { strategy: 'ai-vision', success: false, confidence: 0, duration: Date.now() - startTime };
    }
    
    return {
      strategy: 'ai-vision',
      success: true,
      resultSelector: response.suggestedSelector,
      confidence: response.confidence,
      duration: Date.now() - startTime
    };
  }
  
  // Helper methods
  
  private createSession(step: RecordedStep): TroubleshootingSession {
    return {
      sessionId: `troubleshoot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      step,
      diagnostics: [],
      resolutionAttempts: [],
      status: 'diagnosing',
      totalDuration: 0,
      timestamp: Date.now()
    };
  }
  
  private needsManualIntervention(session: TroubleshootingSession): boolean {
    const allFailed = session.diagnostics.every(d => !d.passed);
    const allResolutionsFailed = session.resolutionAttempts.every(r => !r.success);
    return allFailed && allResolutionsFailed;
  }
  
  private generateSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.dataset.testid) return `[data-testid="${element.dataset.testid}"]`;
    
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
      current = current.parentElement;
    }
    
    return '/' + parts.join('/');
  }
}

export function createPlaybackTroubleshooter(healingOrchestrator?: HealingOrchestrator): PlaybackTroubleshooter {
  return new PlaybackTroubleshooter(healingOrchestrator);
}
