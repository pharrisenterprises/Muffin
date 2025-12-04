/**
 * IndexedDB Database Service
 * 
 * Provides persistent storage for projects, test runs, and recordings.
 * Uses Dexie.js for IndexedDB abstraction.
 * 
 * Schema Version History:
 * - v1: Original schema (projects, bundles, testRuns)
 * - v2: Added Vision fields (loopStartIndex, globalDelayMs, conditionalDefaults, recordedVia)
 */

import Dexie, { Table } from 'dexie';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Project interface with Vision enhancement fields.
 */
export interface Project {
  id?: number;
  projectName: string;
  isPublic: boolean;
  project_url?: string;
  recorded_steps: RecordedStep[];
  parsed_fields?: ParsedField[];
  csv_data?: string[][];
  created_date?: string;
  updated_date?: string;
  
  // === Vision Enhancement Fields (v2) ===
  /** Index where CSV loop iteration begins. Default: 0 */
  loopStartIndex: number;
  /** Global delay in ms after each step. Default: 0 */
  globalDelayMs: number;
  /** Default settings for conditional clicks */
  conditionalDefaults: ConditionalDefaults;
  /** Schema version for migration tracking */
  schemaVersion: number;
}

/**
 * Recorded step with Vision fields.
 */
export interface RecordedStep {
  id?: number;
  label: string;
  event: string;
  value?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  timestamp?: number;
  order?: number;
  
  // === Vision Enhancement Fields (v2) ===
  /** How step was recorded: 'dom' or 'vision'. Default: 'dom' */
  recordedVia: 'dom' | 'vision';
  /** Screen coordinates for vision-recorded steps */
  coordinates?: { x: number; y: number; width: number; height: number };
  /** OCR text matched during vision recording */
  ocrText?: string;
  /** OCR confidence score (0-100) */
  confidenceScore?: number;
  /** Delay in seconds before executing step */
  delaySeconds?: number;
  /** Configuration for conditional click behavior */
  conditionalConfig?: ConditionalConfig | null;
}

/**
 * Conditional click configuration.
 */
export interface ConditionalConfig {
  enabled: boolean;
  searchTerms: string[];
  timeoutSeconds: number;
  pollIntervalMs: number;
  interactionType: 'click' | 'dropdown' | 'input';
  dropdownOption?: string;
  inputValue?: string;
}

/**
 * Recording-level conditional defaults.
 */
export interface ConditionalDefaults {
  searchTerms: string[];
  timeoutSeconds: number;
  confidenceThreshold?: number;
}

/**
 * Parsed field mapping from CSV.
 */
export interface ParsedField {
  columnName: string;
  columnIndex: number;
  targetLabel: string;
  stepIndices?: number[];
}

/**
 * Bundle for grouping projects.
 */
export interface Bundle {
  id?: number;
  bundleName: string;
  projectId: number;
  isPublic: boolean;
}

/**
 * Test run record.
 */
export interface TestRun {
  id?: number;
  bundleId?: number;
  project_id: number;
  status: string;
  start_time?: string;
  end_time?: string;
  test_results?: TestResult[];
  total_rows?: number;
  completed_rows?: number;
  error_message?: string;
}

/**
 * Individual test result.
 */
export interface TestResult {
  rowIndex: number;
  status: 'success' | 'failed' | 'skipped';
  stepResults?: StepResult[];
  error?: string;
  duration?: number;
}

/**
 * Step execution result.
 */
export interface StepResult {
  stepIndex: number;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  duration?: number;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default conditional settings for new projects.
 */
export const DEFAULT_CONDITIONAL_DEFAULTS: ConditionalDefaults = {
  searchTerms: ['Allow', 'Keep'],
  timeoutSeconds: 120,
  confidenceThreshold: 60,
};

/**
 * Current schema version.
 */
export const CURRENT_SCHEMA_VERSION = 2;

// ============================================================================
// DATABASE CLASS
// ============================================================================

/**
 * ProjectDB - Dexie database for the extension.
 */
class ProjectDB extends Dexie {
  projects!: Table<Project, number>;
  bundles!: Table<Bundle, number>;
  testRuns!: Table<TestRun, number>;

  constructor() {
    super('ProjectDatabase');

    // Version 1: Original schema
    this.version(1).stores({
      projects: '++id, projectName, isPublic',
      bundles: '++id, bundleName, projectId, isPublic',
      testRuns: '++id, bundleId, project_id, status',
    });

    // Version 2: Add Vision enhancement fields
    this.version(2)
      .stores({
        projects: '++id, projectName, isPublic',
        bundles: '++id, bundleName, projectId, isPublic',
        testRuns: '++id, bundleId, project_id, status',
      })
      .upgrade((tx) => {
        return tx
          .table('projects')
          .toCollection()
          .modify((project: Project) => {
            // Add schema version
            project.schemaVersion = CURRENT_SCHEMA_VERSION;

            // Add Vision fields with defaults
            project.loopStartIndex = project.loopStartIndex ?? -1;
            project.globalDelayMs = project.globalDelayMs ?? 0;
            project.conditionalDefaults = project.conditionalDefaults ?? {
              ...DEFAULT_CONDITIONAL_DEFAULTS,
            };

            // Migrate existing steps
            if (project.recorded_steps && Array.isArray(project.recorded_steps)) {
              project.recorded_steps = project.recorded_steps.map((step) =>
                migrateStep(step)
              );
            }

            console.log(`[Migration] Upgraded project ${project.id} to schema v2`);
          });
      });

    // Map tables
    this.projects = this.table('projects');
    this.bundles = this.table('bundles');
    this.testRuns = this.table('testRuns');
  }

  // ==========================================================================
  // PROJECT METHODS
  // ==========================================================================

  /**
   * Add a new project with default Vision fields.
   */
  async addProject(project: Omit<Project, 'id' | 'schemaVersion' | 'loopStartIndex' | 'globalDelayMs' | 'conditionalDefaults'>): Promise<number> {
    const now = new Date().toISOString();
    const fullProject: Omit<Project, 'id'> = {
      ...project,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      loopStartIndex: -1,
      globalDelayMs: 0,
      conditionalDefaults: { ...DEFAULT_CONDITIONAL_DEFAULTS },
      recorded_steps: (project.recorded_steps || []).map(migrateStep),
      created_date: project.created_date || now,
      updated_date: now,
    };
    return await this.projects.add(fullProject as Project);
  }

  /**
   * Update an existing project.
   */
  async updateProject(id: number, updates: Partial<Project>): Promise<number> {
    const updateData: Partial<Project> = {
      ...updates,
      updated_date: new Date().toISOString(),
    };

    // Ensure steps are migrated if being updated
    if (updates.recorded_steps) {
      updateData.recorded_steps = updates.recorded_steps.map(migrateStep);
    }

    return await this.projects.update(id, updateData);
  }

  /**
   * Get all projects.
   */
  async getAllProjects(): Promise<Project[]> {
    const projects = await this.projects.toArray();
    // Ensure all returned projects have Vision fields
    return projects.map(ensureProjectDefaults);
  }

  /**
   * Get a project by ID.
   */
  async getProject(id: number): Promise<Project | undefined> {
    const project = await this.projects.get(id);
    return project ? ensureProjectDefaults(project) : undefined;
  }

  /**
   * Delete a project.
   */
  async deleteProject(projectId: number): Promise<void> {
    await this.projects.delete(projectId);
  }

  // ==========================================================================
  // VISION-SPECIFIC METHODS
  // ==========================================================================

  /**
   * Update the loop start index for a project.
   */
  async setLoopStartIndex(projectId: number, loopStartIndex: number): Promise<number> {
    return await this.projects.update(projectId, {
      loopStartIndex: loopStartIndex ?? -1,
      updated_date: new Date().toISOString(),
    });
  }

  /**
   * Update the global delay for a project.
   */
  async setGlobalDelay(projectId: number, globalDelayMs: number): Promise<number> {
    return await this.projects.update(projectId, {
      globalDelayMs: Math.max(0, globalDelayMs),
      updated_date: new Date().toISOString(),
    });
  }

  /**
   * Update conditional defaults for a project.
   */
  async setConditionalDefaults(
    projectId: number,
    conditionalDefaults: Partial<ConditionalDefaults>
  ): Promise<number> {
    const project = await this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    return await this.projects.update(projectId, {
      conditionalDefaults: {
        ...DEFAULT_CONDITIONAL_DEFAULTS,
        ...project.conditionalDefaults,
        ...conditionalDefaults,
      },
      updated_date: new Date().toISOString(),
    });
  }

  /**
   * Update a specific step's delay.
   */
  async setStepDelay(
    projectId: number,
    stepIndex: number,
    delaySeconds: number | undefined
  ): Promise<number> {
    const project = await this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    if (!project.recorded_steps || stepIndex >= project.recorded_steps.length) {
      throw new Error(`Step ${stepIndex} not found`);
    }

    const steps = [...project.recorded_steps];
    steps[stepIndex] = {
      ...steps[stepIndex],
      delaySeconds: delaySeconds !== undefined ? Math.max(0, delaySeconds) : undefined,
    };

    return await this.projects.update(projectId, {
      recorded_steps: steps,
      updated_date: new Date().toISOString(),
    });
  }

  /**
   * Update a specific step's conditional config.
   */
  async setStepConditionalConfig(
    projectId: number,
    stepIndex: number,
    conditionalConfig: ConditionalConfig | null
  ): Promise<number> {
    const project = await this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    if (!project.recorded_steps || stepIndex >= project.recorded_steps.length) {
      throw new Error(`Step ${stepIndex} not found`);
    }

    const steps = [...project.recorded_steps];
    steps[stepIndex] = {
      ...steps[stepIndex],
      conditionalConfig,
      event: conditionalConfig?.enabled ? 'conditional-click' : steps[stepIndex].event,
    };

    return await this.projects.update(projectId, {
      recorded_steps: steps,
      updated_date: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // TEST RUN METHODS
  // ==========================================================================

  /**
   * Create a new test run.
   */
  async createTestRun(run: Omit<TestRun, 'id'>): Promise<number> {
    return await this.testRuns.add(run as TestRun);
  }

  /**
   * Update a test run.
   */
  async updateTestRun(id: number, updates: Partial<TestRun>): Promise<number> {
    return await this.testRuns.update(id, updates);
  }

  /**
   * Get test runs for a project.
   */
  async getTestRunsByProject(projectId: number): Promise<TestRun[]> {
    return await this.testRuns
      .where('project_id')
      .equals(projectId)
      .reverse()
      .sortBy('start_time');
  }

  /**
   * Get a test run by ID.
   */
  async getTestRun(id: number): Promise<TestRun | undefined> {
    return await this.testRuns.get(id);
  }

  /**
   * Delete a test run.
   */
  async deleteTestRun(id: number): Promise<void> {
    await this.testRuns.delete(id);
  }
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Migrate a step to ensure it has all Vision fields.
 * This is idempotent - safe to call multiple times.
 */
function migrateStep(step: Partial<RecordedStep>): RecordedStep {
  return {
    ...step,
    label: step.label || '',
    event: step.event || 'click',
    recordedVia: step.recordedVia || 'dom',
    // Preserve existing values, don't add undefined fields
    ...(step.coordinates !== undefined && { coordinates: step.coordinates }),
    ...(step.ocrText !== undefined && { ocrText: step.ocrText }),
    ...(step.confidenceScore !== undefined && { confidenceScore: step.confidenceScore }),
    ...(step.delaySeconds !== undefined && { delaySeconds: step.delaySeconds }),
    ...(step.conditionalConfig !== undefined && { conditionalConfig: step.conditionalConfig }),
  } as RecordedStep;
}

/**
 * Ensure a project has all Vision fields with defaults.
 * Used when reading from database to handle any unmigrated data.
 */
function ensureProjectDefaults(project: Partial<Project>): Project {
  return {
    ...project,
    schemaVersion: project.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    loopStartIndex: project.loopStartIndex ?? -1,
    globalDelayMs: project.globalDelayMs ?? 0,
    conditionalDefaults: project.conditionalDefaults ?? { ...DEFAULT_CONDITIONAL_DEFAULTS },
    recorded_steps: (project.recorded_steps || []).map(migrateStep),
  } as Project;
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const DB = new ProjectDB();

// Export migration helpers for use in other modules
export { migrateStep, ensureProjectDefaults };