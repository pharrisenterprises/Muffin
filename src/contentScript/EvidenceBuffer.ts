/**
 * @fileoverview Evidence Buffer
 * @description Temporary storage for captured evidence during recording.
 * Ring buffer implementation with automatic pruning.
 * 
 * @module contentScript/EvidenceBuffer
 * @version 1.0.0
 * @since Phase 4
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EvidenceBufferConfig {
  maxSizeBytes: number;
  compressionEnabled: boolean;
  pruneThreshold: number;
}

const DEFAULT_CONFIG: EvidenceBufferConfig = {
  maxSizeBytes: 73400320, // 70MB
  compressionEnabled: true,
  pruneThreshold: 0.9 // Prune when 90% full
};

export interface BufferedEvidence {
  id: string;
  data: unknown;
  sizeBytes: number;
  timestamp: number;
  compressed: boolean;
}

export interface BufferStats {
  totalSize: number;
  itemCount: number;
  maxSize: number;
  utilizationPercent: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}

// ============================================================================
// EVIDENCE BUFFER CLASS
// ============================================================================

export class EvidenceBuffer {
  private config: EvidenceBufferConfig;
  private buffer: Map<string, BufferedEvidence> = new Map();
  private currentSize = 0;
  private insertOrder: string[] = [];

  constructor(config?: Partial<EvidenceBufferConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // CORE OPERATIONS
  // ==========================================================================

  add(id: string, data: unknown): boolean {
    const serialized = JSON.stringify(data);
    let sizeBytes = this.estimateSize(serialized);
    let processedData = data;
    let compressed = false;

    // Compress screenshots if enabled
    if (this.config.compressionEnabled && this.containsScreenshot(data)) {
      processedData = this.compressScreenshots(data);
      sizeBytes = this.estimateSize(JSON.stringify(processedData));
      compressed = true;
    }

    // Check if we need to prune
    if (this.currentSize + sizeBytes > this.config.maxSizeBytes * this.config.pruneThreshold) {
      this.prune(sizeBytes);
    }

    // Check if single item is too large
    if (sizeBytes > this.config.maxSizeBytes * 0.5) {
      console.warn(`[EvidenceBuffer] Item too large: ${sizeBytes} bytes`);
      return false;
    }

    const evidence: BufferedEvidence = {
      id,
      data: processedData,
      sizeBytes,
      timestamp: Date.now(),
      compressed
    };

    // Remove old entry if exists
    if (this.buffer.has(id)) {
      this.remove(id);
    }

    this.buffer.set(id, evidence);
    this.currentSize += sizeBytes;
    this.insertOrder.push(id);

    return true;
  }

  get(id: string): unknown | undefined {
    const evidence = this.buffer.get(id);
    return evidence?.data;
  }

  remove(id: string): boolean {
    const evidence = this.buffer.get(id);
    if (!evidence) return false;

    this.buffer.delete(id);
    this.currentSize -= evidence.sizeBytes;
    this.insertOrder = this.insertOrder.filter(i => i !== id);

    return true;
  }

  has(id: string): boolean {
    return this.buffer.has(id);
  }

  clear(): void {
    this.buffer.clear();
    this.currentSize = 0;
    this.insertOrder = [];
  }

  // ==========================================================================
  // FLUSH / EXPORT
  // ==========================================================================

  flush(): BufferedEvidence[] {
    const items = Array.from(this.buffer.values());
    this.clear();
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

  getAll(): BufferedEvidence[] {
    return Array.from(this.buffer.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  getStats(): BufferStats {
    const items = Array.from(this.buffer.values());
    const timestamps = items.map(i => i.timestamp).sort((a, b) => a - b);

    return {
      totalSize: this.currentSize,
      itemCount: this.buffer.size,
      maxSize: this.config.maxSizeBytes,
      utilizationPercent: (this.currentSize / this.config.maxSizeBytes) * 100,
      oldestTimestamp: timestamps[0] ?? null,
      newestTimestamp: timestamps[timestamps.length - 1] ?? null
    };
  }

  // ==========================================================================
  // PRUNING
  // ==========================================================================

  private prune(requiredSpace: number): void {
    const targetSize = this.config.maxSizeBytes - requiredSpace - (this.config.maxSizeBytes * 0.1);
    let prunedCount = 0;

    while (this.currentSize > targetSize && this.insertOrder.length > 0) {
      const oldestId = this.insertOrder[0];
      if (this.remove(oldestId)) {
        prunedCount++;
      }
    }

    if (prunedCount > 0) {
      console.log(`[EvidenceBuffer] Pruned ${prunedCount} items to free space`);
    }
  }

  // ==========================================================================
  // COMPRESSION
  // ==========================================================================

  private containsScreenshot(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false;

    const json = JSON.stringify(data);
    return json.includes('data:image/') || json.includes('screenshot');
  }

  private compressScreenshots(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) return data;

    const clone = JSON.parse(JSON.stringify(data));
    this.compressRecursive(clone);
    return clone;
  }

  private compressRecursive(obj: Record<string, unknown>): void {
    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (typeof value === 'string' && value.startsWith('data:image/')) {
        // Reduce quality by truncating (simple approach)
        // In real implementation, use canvas to recompress
        if (value.length > 100000) {
          obj[key] = value.slice(0, 100000) + '...[truncated]';
        }
      } else if (typeof value === 'object' && value !== null) {
        this.compressRecursive(value as Record<string, unknown>);
      }
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private estimateSize(str: string): number {
    // Rough estimate: 2 bytes per character for UTF-16
    return str.length * 2;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: EvidenceBuffer | null = null;

export function getEvidenceBuffer(config?: Partial<EvidenceBufferConfig>): EvidenceBuffer {
  if (!instance) {
    instance = new EvidenceBuffer(config);
  }
  return instance;
}
