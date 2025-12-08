// src/lib/repositories/telemetryRepository.ts
// In-memory repository for strategy telemetry data

import type { StrategyTelemetry } from "../../types/strategy";

class TelemetryRepository {
  private store: Map<string, StrategyTelemetry[]> = new Map();

  private getKey(recordingId: number, runId?: string): string {
    return runId ? `${recordingId}-${runId}` : `${recordingId}-latest`;
  }

  add(recordingId: number, telemetry: StrategyTelemetry, runId?: string): void {
    const key = this.getKey(recordingId, runId);
    const existing = this.store.get(key) || [];
    existing.push(telemetry);
    this.store.set(key, existing);
  }

  getAll(recordingId: number, runId?: string): StrategyTelemetry[] {
    return this.store.get(this.getKey(recordingId, runId)) || [];
  }

  getByStepId(recordingId: number, stepId: number, runId?: string): StrategyTelemetry | undefined {
    const all = this.getAll(recordingId, runId);
    return all.find(t => t.stepId === stepId);
  }

  clear(recordingId: number, runId?: string): void {
    this.store.delete(this.getKey(recordingId, runId));
  }

  clearAll(): void {
    this.store.clear();
  }

  getStats(recordingId: number, runId?: string) {
    const all = this.getAll(recordingId, runId);
    const total = all.length;
    const successful = all.filter(t => t.finalStrategy !== null).length;
    const avgDuration = total > 0 ? all.reduce((sum, t) => sum + t.totalDuration, 0) / total : 0;
    return { total, successful, failed: total - successful, avgDuration: Math.round(avgDuration) };
  }
}

export const telemetryRepository = new TelemetryRepository();
