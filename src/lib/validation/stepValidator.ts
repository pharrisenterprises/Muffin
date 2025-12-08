// src/lib/validation/stepValidator.ts
// Validation functions for step configuration

import type { RecordedVia } from "../../types/strategy";
import type { ConditionalConfig, StepCoordinates } from "../../types/vision";

export interface StepValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StepToValidate {
  label?: string;
  event?: string;
  stepType?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  recordedVia?: RecordedVia;
  coordinates?: StepCoordinates | null;
  conditionalConfig?: ConditionalConfig | null;
  delaySeconds?: number | null;
}

export function validateStep(step: StepToValidate): StepValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const eventType = step.event || step.stepType;
  if (!eventType) {
    errors.push("Step must have an event type");
  }

  if (eventType === "open" || eventType === "navigate") {
    if (!step.url) {
      errors.push("Open/navigate event must have a URL");
    }
  }

  if (eventType !== "open" && eventType !== "navigate" && !step.selector && !step.xpath && step.recordedVia !== "vision") {
    warnings.push("Step has no selector or xpath - may fail during playback");
  }

  if (step.recordedVia === "vision" && !step.coordinates) {
    warnings.push("Vision step has no coordinates - will rely on OCR only");
  }

  if (step.delaySeconds !== null && step.delaySeconds !== undefined) {
    if (step.delaySeconds < 0) {
      errors.push("Delay cannot be negative");
    }
    if (step.delaySeconds > 300) {
      warnings.push("Delay is very long (>5 minutes)");
    }
  }

  if (step.conditionalConfig?.enabled) {
    if (!step.conditionalConfig.searchTerms?.length) {
      errors.push("Conditional click must have at least one search term");
    }
    if (step.conditionalConfig.timeoutSeconds < 1) {
      errors.push("Conditional timeout must be at least 1 second");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateSteps(steps: StepToValidate[]): { valid: boolean; results: StepValidationResult[] } {
  const results = steps.map(validateStep);
  const valid = results.every(r => r.valid);
  return { valid, results };
}
