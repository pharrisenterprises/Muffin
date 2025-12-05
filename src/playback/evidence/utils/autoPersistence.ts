export interface PersistenceConfig {
  storageKey: string;
  autoSaveInterval: number;
  debounceMs: number;
}

export class AutoPersistence<T> {
  private config: PersistenceConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private debounceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isDirty: boolean = false;
  private getData: () => T;
  private setData: (data: T) => void;
  
  constructor(getData: () => T, setData: (data: T) => void, config: Partial<PersistenceConfig> = {}) {
    this.config = { storageKey: 'automater_evidence_patterns', autoSaveInterval: 30000, debounceMs: 2000, ...config };
    this.getData = getData;
    this.setData = setData;
  }
  
  start(): void {
    if (this.intervalId) return;
    if (this.config.autoSaveInterval > 0) {
      this.intervalId = setInterval(() => { if (this.isDirty) this.save(); }, this.config.autoSaveInterval);
    }
  }
  
  stop(): void {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    if (this.debounceTimeoutId) { clearTimeout(this.debounceTimeoutId); this.debounceTimeoutId = null; }
  }
  
  markDirty(): void {
    this.isDirty = true;
    if (this.debounceTimeoutId) clearTimeout(this.debounceTimeoutId);
    this.debounceTimeoutId = setTimeout(() => this.save(), this.config.debounceMs);
  }
  
  async save(): Promise<boolean> {
    try {
      await chrome.storage.local.set({ [this.config.storageKey]: { data: this.getData(), savedAt: Date.now(), version: '1.0' } });
      this.isDirty = false;
      return true;
    } catch { return false; }
  }
  
  async load(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(this.config.storageKey);
      if (result[this.config.storageKey]?.data) { this.setData(result[this.config.storageKey].data); return true; }
      return false;
    } catch { return false; }
  }
}

export function createAutoPersistence<T>(getData: () => T, setData: (data: T) => void, config?: Partial<PersistenceConfig>): AutoPersistence<T> {
  return new AutoPersistence(getData, setData, config);
}
