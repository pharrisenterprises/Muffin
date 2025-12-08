export const CURRENT_SCHEMA_VERSION = 3;

// src/lib/schemaMigration.ts
// Schema migration utilities for v1 to v3 upgrade

import type { RecordedVia } from "../types/strategy";
import type { ConditionalConfig, StepCoordinates } from "../types/vision";
import { DEFAULT_CONDITIONAL_CONFIG } from "../types/vision";

// Step interface matching indexedDB schema
export interface MigratedStep {
  id?: number;
  stepType: string;
  targetElement?: string;
  value?: string;
  timestamp?: number;
  xpath?: string;
  order?: number;
  url?: string;
  selector?: string;
  label?: string;
  // Phase 2 additions
  recordedVia: RecordedVia;
  delaySeconds?: number | null;
  conditionalConfig?: ConditionalConfig | null;
  coordinates?: StepCoordinates | null;
  ocrText?: string | null;
  confidenceScore?: number | null;
}

export interface MigratedRecording {
  id?: number;
  name: string;
  description?: string;
  target_url?: string;
  recorded_steps: MigratedStep[];
  parsed_fields?: Array<{ field_name: string; mapped: boolean; inputvarfields: string }>;
  csv_data?: string[][];
  status?: string;
  created_date?: number;
  updated_date?: number;
  
  // CamelCase aliases for Phase 4 compatibility
  steps: MigratedStep[];
  parsedFields?: Array<{ field_name: string; mapped: boolean; inputvarfields: string }>;
  csvData?: string[][];
  projectId?: number;
  createdAt?: number;
  updatedAt?: number;
  
  // Phase 2 additions
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
    stepType: (step.stepType as string) || (step.event as string) || "click",
    targetElement: step.targetElement as string | undefined,
    value: step.value as string | undefined,
    timestamp: step.timestamp as number | undefined,
    xpath: step.xpath as string | undefined,
    order: step.order as number | undefined,
    url: step.url as string | undefined,
    selector: step.selector as string | undefined,
    label: step.label as string | undefined,
    // Apply defaults for new fields
    recordedVia: (step.recordedVia as RecordedVia) || "dom",
    delaySeconds: (step.delaySeconds as number) ?? null,
    conditionalConfig: (step.conditionalConfig as ConditionalConfig) ?? null,
    coordinates: (step.coordinates as StepCoordinates) ?? null,
    ocrText: (step.ocrText as string) ?? null,
    confidenceScore: (step.confidenceScore as number) ?? null
  };
}

export function migrateRecording(recording: Record<string, unknown>): MigratedRecording {
  const existingSteps = (recording.recorded_steps || recording.steps || []) as Record<string, unknown>[];
  const steps = existingSteps.map(migrateStep);

  return {
    id: recording.id as number | undefined,
    name: (recording.name as string) || (recording.projectName as string) || "Untitled",
    description: recording.description as string | undefined,
    target_url: recording.target_url as string | undefined,
    recorded_steps: steps,
    parsed_fields: recording.parsed_fields as MigratedRecording["parsed_fields"],
    csv_data: recording.csv_data as string[][] | undefined,
    status: recording.status as string | undefined,
    created_date: recording.created_date as number | undefined,
    updated_date: recording.updated_date as number | undefined,
    // Apply defaults for new fields
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

export function getMigrationReport(recording: Record<string, unknown>): { fieldsAdded: string[]; stepsUpdated: number } {
  const fieldsAdded: string[] = [];
  if (!recording.schemaVersion) fieldsAdded.push("schemaVersion");
  if (recording.loopStartIndex === undefined) fieldsAdded.push("loopStartIndex");
  if (recording.globalDelayMs === undefined) fieldsAdded.push("globalDelayMs");
  if (!recording.conditionalDefaults) fieldsAdded.push("conditionalDefaults");

  const steps = (recording.recorded_steps || recording.steps || []) as Record<string, unknown>[];
  let stepsUpdated = 0;
  for (const step of steps) {
    if (!step.recordedVia) stepsUpdated++;
  }

  return { fieldsAdded, stepsUpdated };
}

// Export aliases for backward compatibility
export const stepNeedsMigration = needsMigration;
export const recordingNeedsMigration = needsMigration;
export const verifyRecordingMigration = getMigrationReport;
export const MIGRATION_DEFAULTS = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  loopStartIndex: 0,
  globalDelayMs: 0,
  conditionalDefaults: DEFAULT_CONDITIONAL_CONFIG
};

