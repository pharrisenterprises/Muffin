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
  name?: string;
  projectName?: string;
  steps: MigratedStep[];
  recorded_steps: MigratedStep[]; // alias for compatibility
  schemaVersion: number;
  loopStartIndex: number;
  globalDelayMs: number;
  conditionalDefaults: {
    searchTerms: string[];
    timeoutSeconds: number;
    pollIntervalMs: number;
  };
  createdAt?: number;
  updatedAt?: number;
  parsedFields?: unknown[];
  csvData?: string[][];
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

export function migrateRecording(recording: Record<string, unknown>, projectId?: number): MigratedRecording {
  const steps = Array.isArray(recording.steps) 
    ? recording.steps.map(migrateStep) 
    : Array.isArray(recording.recorded_steps)
    ? recording.recorded_steps.map(migrateStep)
    : [];
  
  const migrated: MigratedRecording = {
    id: recording.id as number | undefined,
    projectId: projectId ?? (recording.projectId as number) ?? 0,
    name: recording.name as string | undefined,
    projectName: recording.projectName as string | undefined,
    steps,
    recorded_steps: steps, // alias
    schemaVersion: 3,
    loopStartIndex: (recording.loopStartIndex as number) ?? 0,
    globalDelayMs: (recording.globalDelayMs as number) ?? 0,
    conditionalDefaults: (recording.conditionalDefaults as MigratedRecording["conditionalDefaults"]) ?? {
      searchTerms: DEFAULT_CONDITIONAL_CONFIG.searchTerms,
      timeoutSeconds: DEFAULT_CONDITIONAL_CONFIG.timeoutSeconds,
      pollIntervalMs: DEFAULT_CONDITIONAL_CONFIG.pollIntervalMs
    },
    createdAt: recording.createdAt as number ?? recording.created_date as number ?? Date.now(),
    updatedAt: Date.now(),
    parsedFields: recording.parsedFields as unknown[] ?? recording.parsed_fields as unknown[],
    csvData: recording.csvData as string[][] ?? recording.csv_data as string[][]
  };
  
  return migrated;
}

export function isLegacyRecording(recording: Record<string, unknown>): boolean {
  const version = recording.schemaVersion as number | undefined;
  return !version || version < 3;
}

export function needsMigration(recording: Record<string, unknown>): boolean {
  return isLegacyRecording(recording);
}
