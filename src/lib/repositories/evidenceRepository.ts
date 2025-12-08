// src/lib/repositories/evidenceRepository.ts
// In-memory repository for step evidence (screenshots, chains)

import type { Screenshot } from "../../types/vision";
import type { FallbackChain } from "../../types/strategy";

interface EvidenceEntry {
  stepId: number;
  timestamp: number;
  screenshot?: Screenshot;
  fallbackChain?: FallbackChain;
  ocrText?: string;
  metadata?: Record<string, unknown>;
}

class EvidenceRepository {
  private store: Map<string, EvidenceEntry[]> = new Map();
  private maxEntriesPerRecording = 100;

  private getKey(recordingId: number): string {
    return `evidence-${recordingId}`;
  }

  add(recordingId: number, entry: EvidenceEntry): void {
    const key = this.getKey(recordingId);
    const existing = this.store.get(key) || [];
    existing.push(entry);
    if (existing.length > this.maxEntriesPerRecording) {
      existing.shift();
    }
    this.store.set(key, existing);
  }

  getAll(recordingId: number): EvidenceEntry[] {
    return this.store.get(this.getKey(recordingId)) || [];
  }

  getByStepId(recordingId: number, stepId: number): EvidenceEntry | undefined {
    return this.getAll(recordingId).find(e => e.stepId === stepId);
  }

  getLatest(recordingId: number, count: number = 10): EvidenceEntry[] {
    const all = this.getAll(recordingId);
    return all.slice(-count);
  }

  clear(recordingId: number): void {
    this.store.delete(this.getKey(recordingId));
  }

  clearAll(): void {
    this.store.clear();
  }

  getStorageStats(): { entries: number; recordings: number } {
    let entries = 0;
    this.store.forEach(v => { entries += v.length; });
    return { entries, recordings: this.store.size };
  }
}

export const evidenceRepository = new EvidenceRepository();
