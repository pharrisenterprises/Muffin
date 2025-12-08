# EvidenceBuffer Content Specification

**File ID:** A2  
**File Path:** `src/contentScript/EvidenceBuffer.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Temporary in-memory and IndexedDB storage for evidence captured during recording sessions. Manages approximately 70MB of raw evidence during capture (screenshots, OCR data, mouse trails), then aggressively prunes to ~250KB when user clicks "Save as Approved." Provides evidence retrieval for FallbackChain generation and playback verification. Acts as the memory system for the recording session.

---

## Dependencies

### Uses (imports from)
- `../common/services/indexedDB`: db instance, Evidence table operations
- `../types/strategy`: CapturedAction, FallbackChain
- `../types/vision`: VisionCaptureResult

### Used By (exports to)
- `./RecordingOrchestrator`: Stores and retrieves captured actions
- `../background/services/DecisionEngine`: Retrieves evidence for playback verification
- `../pages/Recorder.tsx`: Gets buffer stats for UI display

---

## Interfaces
```typescript
/**
 * Configuration for EvidenceBuffer
 */
interface EvidenceBufferConfig {
  /** Maximum buffer size in bytes (default: 73400320 = 70MB) */
  maxSizeBytes: number;
  /** Trigger auto-prune at this percentage of capacity (default: 0.9 = 90%) */
  pruneThreshold: number;
  /** Retention policy for pruning */
  retentionPolicy: 'keep-all' | 'keep-last-n' | 'confidence-based';
  /** Max screenshots to retain (default: 50) */
  maxScreenshots: number;
  /** Use IndexedDB for overflow (default: true) */
  useIndexedDB: boolean;
}

/**
 * Statistics about buffer state
 */
interface BufferStats {
  /** Total size of all evidence in bytes */
  totalSize: number;
  /** Number of captured actions */
  actionCount: number;
  /** Number of screenshots stored */
  screenshotCount: number;
  /** Timestamp of oldest action */
  oldestTimestamp: number;
  /** Timestamp of newest action */
  newestTimestamp: number;
  /** Percentage of capacity used */
  capacityUsed: number;
  /** Whether buffer is using IndexedDB overflow */
  usingOverflow: boolean;
}

/**
 * Stored evidence entry
 */
interface StoredEvidence {
  /** Unique evidence ID (matches CapturedAction.id) */
  id: string;
  /** Storage timestamp */
  timestamp: number;
  /** The captured action data */
  action: CapturedAction;
  /** Screenshot blob (separate for efficient pruning) */
  screenshot?: Blob;
  /** Size of this evidence in bytes */
  sizeBytes: number;
  /** Whether this evidence has been pruned */
  pruned: boolean;
  /** Storage location */
  storage: 'memory' | 'indexeddb';
}

/**
 * Result of prune operation
 */
interface PruneResult {
  /** Size before pruning */
  beforeSize: number;
  /** Size after pruning */
  afterSize: number;
  /** Number of actions removed */
  actionsRemoved: number;
  /** Number of screenshots removed */
  screenshotsRemoved: number;
  /** Time taken to prune in ms */
  duration: number;
}

/**
 * Export format for saving
 */
interface ExportedRecording {
  /** Pruned actions ready for save */
  actions: CapturedAction[];
  /** Total exported size */
  sizeBytes: number;
  /** Export metadata */
  metadata: {
    exportedAt: number;
    originalActionCount: number;
    prunedActionCount: number;
    compressionRatio: number;
  };
}
```

---

## Functions
```typescript
/**
 * EvidenceBuffer - Temporary storage for recording evidence
 */
class EvidenceBuffer {
  private config: EvidenceBufferConfig;
  private memoryStore: Map<string, StoredEvidence>;
  private totalSize: number;
  private screenshotCount: number;
  private isPruning: boolean;

  /**
   * Create new EvidenceBuffer instance
   * @param config - Buffer configuration
   */
  constructor(config?: Partial<EvidenceBufferConfig>);

  /**
   * Store a captured action with optional screenshot
   * @param action - The captured action to store
   * @param screenshot - Optional screenshot blob
   * @returns Promise resolving to evidence ID
   */
  async store(action: CapturedAction, screenshot?: Blob): Promise<string>;

  /**
   * Retrieve stored evidence by ID
   * @param id - Evidence ID
   * @returns Promise resolving to stored evidence or null
   */
  async get(id: string): Promise<StoredEvidence | null>;

  /**
   * Retrieve all stored evidence
   * @returns Promise resolving to array of stored evidence
   */
  async getAll(): Promise<StoredEvidence[]>;

  /**
   * Retrieve evidence within a time range
   * @param startTime - Start timestamp (inclusive)
   * @param endTime - End timestamp (inclusive)
   * @returns Promise resolving to matching evidence
   */
  async getByTimeRange(startTime: number, endTime: number): Promise<StoredEvidence[]>;

  /**
   * Get current buffer statistics
   * @returns Buffer stats object
   */
  getStats(): BufferStats;

  /**
   * Prune buffer to stay under capacity
   * Removes oldest screenshots first, then oldest actions
   * @returns Promise resolving to prune result
   */
  async prune(): Promise<PruneResult>;

  /**
   * Aggressive prune for "Save as Approved"
   * Reduces ~70MB to ~250KB by removing all non-essential data
   * @returns Promise resolving to prune result
   */
  async pruneForApproval(): Promise<PruneResult>;

  /**
   * Clear all stored evidence
   * @returns Promise resolving when clear complete
   */
  async clear(): Promise<void>;

  /**
   * Store a screenshot for an existing action
   * @param actionId - Action ID to attach screenshot to
   * @param screenshot - Screenshot blob
   */
  async storeScreenshot(actionId: string, screenshot: Blob): Promise<void>;

  /**
   * Retrieve screenshot for an action
   * @param actionId - Action ID
   * @returns Promise resolving to screenshot blob or null
   */
  async getScreenshot(actionId: string): Promise<Blob | null>;

  /**
   * Prune screenshots, keeping only the most recent N
   * @param keepCount - Number of screenshots to keep
   * @returns Promise resolving to number of screenshots removed
   */
  async pruneScreenshots(keepCount: number): Promise<number>;

  /**
   * Export buffer for saving to IndexedDB
   * Triggers pruneForApproval first
   * @returns Promise resolving to exported recording
   */
  async exportForSave(): Promise<ExportedRecording>;

  /**
   * Export buffer for Puppeteer script generation
   * Includes additional metadata for external execution
   * @returns Promise resolving to exported recording with Puppeteer data
   */
  async exportForPuppeteer(): Promise<ExportedRecording & {
    puppeteerSteps: Array<{
      action: string;
      selector: string;
      fallbacks: string[];
      value?: string;
    }>;
  }>;

  /**
   * Check if buffer needs pruning
   * @returns True if at or above prune threshold
   */
  needsPruning(): boolean;

  /**
   * Update an existing evidence entry
   * @param evidence - Updated evidence
   */
  private async update(evidence: StoredEvidence): Promise<void>;

  /**
   * Calculate size of an evidence entry
   * @param evidence - Evidence to measure
   * @returns Size in bytes
   */
  private calculateSize(evidence: StoredEvidence): number;

  /**
   * Move evidence to IndexedDB overflow
   * @param evidence - Evidence to move
   */
  private async moveToOverflow(evidence: StoredEvidence): Promise<void>;

  /**
   * Retrieve evidence from IndexedDB overflow
   * @param id - Evidence ID
   * @returns Promise resolving to evidence or null
   */
  private async getFromOverflow(id: string): Promise<StoredEvidence | null>;
}

export { EvidenceBuffer, EvidenceBufferConfig, StoredEvidence, BufferStats, PruneResult, ExportedRecording };
```

---

## Key Implementation Details

### Store with Auto-Prune Check
```typescript
async store(action: CapturedAction, screenshot?: Blob): Promise<string> {
  const evidence: StoredEvidence = {
    id: action.id,
    timestamp: action.timestamp,
    action,
    screenshot,
    sizeBytes: 0,
    pruned: false,
    storage: 'memory'
  };
  
  // Calculate size
  evidence.sizeBytes = this.calculateSize(evidence);
  
  // Check if we need to prune before storing
  if (this.totalSize + evidence.sizeBytes > this.config.maxSizeBytes * this.config.pruneThreshold) {
    await this.prune();
  }
  
  // Check if we need to use overflow
  if (this.totalSize + evidence.sizeBytes > this.config.maxSizeBytes * 0.8) {
    // Move oldest items to IndexedDB
    await this.moveOldestToOverflow(10);
  }
  
  // Store in memory
  this.memoryStore.set(evidence.id, evidence);
  this.totalSize += evidence.sizeBytes;
  
  if (screenshot) {
    this.screenshotCount++;
  }
  
  return evidence.id;
}
```

### Size Calculation
```typescript
private calculateSize(evidence: StoredEvidence): number {
  let size = 0;
  
  // Action JSON (approximate)
  const actionJson = JSON.stringify(evidence.action);
  size += new Blob([actionJson]).size;
  
  // Screenshot blob
  if (evidence.screenshot) {
    size += evidence.screenshot.size;
  }
  
  // Overhead for storage structure (~100 bytes)
  size += 100;
  
  return size;
}
```

### Aggressive Prune for Approval (70MB → 250KB)
```typescript
async pruneForApproval(): Promise<PruneResult> {
  const startTime = Date.now();
  const beforeSize = this.totalSize;
  const beforeScreenshots = this.screenshotCount;
  
  const allEvidence = await this.getAll();
  
  for (const evidence of allEvidence) {
    // 1. Remove all screenshots except last 5
    if (evidence.screenshot) {
      evidence.screenshot = undefined;
    }
    
    // 2. Prune FallbackChain strategies to essential data only
    evidence.action.fallbackChain.strategies = evidence.action.fallbackChain.strategies.map(s => {
      const pruned: LocatorStrategy = {
        type: s.type,
        confidence: s.confidence
      };
      
      // Keep only essential metadata per strategy type
      if (s.selector) {
        pruned.selector = s.selector;
      }
      
      if (s.metadata) {
        switch (s.type) {
          case 'cdp_semantic':
            pruned.metadata = { role: s.metadata.role, name: s.metadata.name };
            break;
          case 'cdp_power':
            pruned.metadata = { 
              text: s.metadata.text?.slice(0, 100),
              label: s.metadata.label,
              placeholder: s.metadata.placeholder
            };
            break;
          case 'vision_ocr':
            pruned.metadata = { targetText: s.metadata.targetText };
            break;
          case 'coordinates':
            pruned.metadata = { x: s.metadata.x, y: s.metadata.y };
            break;
          case 'evidence_scoring':
            // Keep only endpoint, remove full trail
            pruned.metadata = { endpoint: s.metadata.endpoint };
            break;
          default:
            // Remove metadata for other types
            break;
        }
      }
      
      return pruned;
    });
    
    // 3. Remove raw vision data
    if (evidence.action.visionData) {
      delete evidence.action.visionData.rawOcrResult;
      delete evidence.action.visionData.screenshot;
      // Keep only targetText and confidence
      evidence.action.visionData = {
        ocrText: evidence.action.visionData.ocrText,
        confidence: evidence.action.visionData.confidence
      } as VisionCaptureResult;
    }
    
    // 4. Prune mouse trail to just endpoint
    if (evidence.action.mouseData) {
      const endpoint = evidence.action.mouseData.endpoint;
      evidence.action.mouseData = {
        trail: [{ ...endpoint, timestamp: evidence.action.timestamp }],
        endpoint,
        duration: 0
      };
    }
    
    // 5. Remove network data entirely
    delete evidence.action.networkData;
    
    // 6. Mark as pruned and recalculate size
    evidence.pruned = true;
    evidence.sizeBytes = this.calculateSize(evidence);
    
    await this.update(evidence);
  }
  
  // Recalculate totals
  this.totalSize = allEvidence.reduce((sum, e) => sum + e.sizeBytes, 0);
  this.screenshotCount = 0;
  
  return {
    beforeSize,
    afterSize: this.totalSize,
    actionsRemoved: 0,
    screenshotsRemoved: beforeScreenshots,
    duration: Date.now() - startTime
  };
}
```

### Export for Save
```typescript
async exportForSave(): Promise<ExportedRecording> {
  // First, aggressively prune
  await this.pruneForApproval();
  
  const allEvidence = await this.getAll();
  const actions = allEvidence.map(e => e.action);
  
  return {
    actions,
    sizeBytes: this.totalSize,
    metadata: {
      exportedAt: Date.now(),
      originalActionCount: allEvidence.length,
      prunedActionCount: allEvidence.length,
      compressionRatio: this.totalSize / (70 * 1024 * 1024) // vs 70MB baseline
    }
  };
}
```

### IndexedDB Overflow Management
```typescript
private async moveToOverflow(evidence: StoredEvidence): Promise<void> {
  if (!this.config.useIndexedDB) {
    throw new Error('IndexedDB overflow not enabled');
  }
  
  // Store in IndexedDB
  await db.evidence.put({
    id: evidence.id,
    data: JSON.stringify(evidence),
    timestamp: evidence.timestamp
  });
  
  // Update storage location
  evidence.storage = 'indexeddb';
  
  // Remove from memory but keep reference
  const memoryRef = this.memoryStore.get(evidence.id);
  if (memoryRef) {
    // Keep minimal reference in memory
    this.memoryStore.set(evidence.id, {
      ...evidence,
      action: null as any, // Clear action data
      screenshot: undefined,
      sizeBytes: 50 // Just reference size
    });
    this.totalSize -= (memoryRef.sizeBytes - 50);
  }
}

private async getFromOverflow(id: string): Promise<StoredEvidence | null> {
  const record = await db.evidence.get(id);
  if (!record) return null;
  
  return JSON.parse(record.data) as StoredEvidence;
}
```

---

## Integration Points

### With RecordingOrchestrator
```typescript
// In RecordingOrchestrator
class RecordingOrchestrator {
  private evidenceBuffer: EvidenceBuffer;
  
  constructor(config: RecordingOrchestratorConfig) {
    this.evidenceBuffer = new EvidenceBuffer({
      maxSizeBytes: config.bufferSizeLimit,
      pruneThreshold: 0.9,
      retentionPolicy: 'keep-all',
      maxScreenshots: 50,
      useIndexedDB: true
    });
  }
  
  async captureAction(event: Event, element: HTMLElement): Promise<CapturedAction> {
    // ... capture logic ...
    
    // Store with optional screenshot
    const screenshot = this.visionCapture?.getLastScreenshot();
    await this.evidenceBuffer.store(action, screenshot);
    
    return action;
  }
  
  async stop(): Promise<CapturedAction[]> {
    const { actions } = await this.evidenceBuffer.exportForSave();
    return actions;
  }
  
  getBufferSize(): number {
    return this.evidenceBuffer.getStats().totalSize;
  }
}
```

### With Recorder.tsx (Buffer Stats Display)
```typescript
// In Recorder.tsx
const [bufferStats, setBufferStats] = useState<BufferStats | null>(null);

useEffect(() => {
  const interval = setInterval(() => {
    chrome.runtime.sendMessage({ action: 'GET_BUFFER_STATS' }, (response) => {
      if (response?.stats) {
        setBufferStats(response.stats);
      }
    });
  }, 1000);
  
  return () => clearInterval(interval);
}, [isRecording]);

// Display in UI
{bufferStats && (
  <div className="buffer-stats">
    <span>Buffer: {(bufferStats.totalSize / 1024 / 1024).toFixed(1)}MB</span>
    <span>Steps: {bufferStats.actionCount}</span>
    <progress value={bufferStats.capacityUsed} max={1} />
  </div>
)}
```

---

## Acceptance Criteria

- [ ] Stores up to 70MB of evidence during active recording
- [ ] Auto-prunes when reaching 90% capacity
- [ ] pruneForApproval() reduces size from ~70MB to <500KB
- [ ] Screenshots stored and retrievable by action ID
- [ ] IndexedDB overflow works when memory limit approached
- [ ] getStats() returns accurate real-time statistics
- [ ] exportForSave() returns valid, pruned data structure
- [ ] exportForPuppeteer() includes Puppeteer-compatible step data
- [ ] clear() removes all evidence from memory and IndexedDB
- [ ] TypeScript compiles with strict mode, 0 errors
- [ ] Memory usage stays bounded (no memory leaks)
- [ ] Prune operations complete in <500ms for typical recordings

---

## Edge Cases

1. **Memory pressure**: Browser may garbage collect - use WeakRef for large blobs
2. **IndexedDB quota**: Handle quota exceeded errors gracefully
3. **Rapid actions**: Queue stores to prevent race conditions
4. **Page unload**: Flush to IndexedDB before page navigates
5. **Corrupt data**: Validate JSON on retrieve from IndexedDB
6. **Empty buffer**: Handle getAll() on empty buffer gracefully
7. **Duplicate IDs**: Reject or update existing entries

---

## Estimated Lines

250-300 lines
