// src/lib/schemaMigration.ts
import type { RecordedVia } from "../types/strategy";
import type { ConditionalConfig } from "../types/vision";
import { DEFAULT_CONDITIONAL_CONFIG } from "../types/vision";

export interface MigratedStep {
  id?: number;
  label: string;
  event: string;
  value?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  timestamp?: number;
  order?: number;
  recordedVia: RecordedVia;
  delaySeconds?: number | null;
  conditionalConfig?: ConditionalConfig | null;
  coordinates?: { x: number; y: number } | null;
  ocrText?: string | null;
  confidenceScore?: number | null;
}

export interface MigratedRecording {
  id?: number;
  projectId: number;
  steps: MigratedStep[];
  schemaVersion: number;
  loopStartIndex: number;
  globalDelayMs: number;
  conditionalDefaults: {
    searchTerms: string[];
    timeoutSeconds: number;
    pollIntervalMs: number;
  };
}

export function migrateStep(step: Record<string, unknown>): MigratedStep {
  return {
    id: step.id as number | undefined,
    label: (step.label as string) || "",
    event: (step.event as string) || (step.stepType as string) || "click",
    value: step.value as string | undefined,
    selector: step.selector as string | undefined,
    xpath: step.xpath as string | undefined,
    url: step.url as string | undefined,
    timestamp: step.timestamp as number | undefined,
    order: step.order as number | undefined,
    recordedVia: (step.recordedVia as RecordedVia) || "dom",
    delaySeconds: (step.delaySeconds as number) ?? null,
    conditionalConfig: (step.conditionalConfig as ConditionalConfig) ?? null,
    coordinates: (step.coordinates as { x: number; y: number }) ?? null,
    ocrText: (step.ocrText as string) ?? null,
    confidenceScore: (step.confidenceScore as number) ?? null
  };
}

export function migrateRecording(recording: Record<string, unknown>): MigratedRecording {
  const steps = Array.isArray(recording.steps) ? recording.steps.map(migrateStep) : [];
  return {
    id: recording.id as number | undefined,
    projectId: (recording.projectId as number) || 0,
    steps,
    schemaVersion: 3,
    loopStartIndex: (recording.loopStartIndex as number) ?? 0,
    globalDelayMs: (recording.globalDelayMs as number) ?? 0,
    conditionalDefaults: (recording.conditionalDefaults as MigratedRecording["conditionalDefaults"]) ?? {
      searchTerms: DEFAULT_CONDITIONAL_CONFIG.searchTerms,
      timeoutSeconds: DEFAULT_CONDITIONAL_CONFIG.timeoutSeconds,
      pollIntervalMs: DEFAULT_CONDITIONAL_CONFIG.pollIntervalMs
    }
  };
}

export function isLegacyRecording(recording: Record<string, unknown>): boolean {
  const version = recording.schemaVersion as number | undefined;
  return !version || version < 3;
}

export function needsMigration(recording: Record<string, unknown>): boolean {
  return isLegacyRecording(recording);
}
