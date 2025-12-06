// src/lib/visionEngine.ts
import Tesseract from "tesseract.js";
import type { VisionConfig, TextResult, ClickTarget, ConditionalConfig, ConditionalClickResult, Screenshot, OcrResult, VisionData } from "../types/vision";
import { DEFAULT_VISION_CONFIG, DEFAULT_CONDITIONAL_CONFIG } from "../types/vision";

class VisionEngine {
  private worker: Tesseract.Worker | null = null;
  private isInit: boolean = false;
  private config: VisionConfig;

  constructor(config?: Partial<VisionConfig>) {
    this.config = { ...DEFAULT_VISION_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.isInit) return;
    this.worker = await Tesseract.createWorker(this.config.language);
    this.isInit = true;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.isInit = false;
  }

  get isInitialized(): boolean {
    return this.isInit;
  }

  async captureScreenshot(tabId?: number): Promise<Screenshot> {
    const targetTabId = tabId ?? (await this.getActiveTabId());
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: "png", quality: Math.round(this.config.screenshotQuality * 100) });
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, width: img.width, height: img.height, timestamp: Date.now() };
  }

  async recognizeText(imageData: string): Promise<OcrResult> {
    if (!this.worker) await this.initialize();
    const start = Date.now();
    const { data } = await this.worker!.recognize(imageData);
    const results: TextResult[] = data.words.map(word => ({
      text: word.text,
      confidence: word.confidence,
      bbox: { x: word.bbox.x0, y: word.bbox.y0, width: word.bbox.x1 - word.bbox.x0, height: word.bbox.y1 - word.bbox.y0 }
    }));
    return { results, duration: Date.now() - start, timestamp: Date.now() };
  }

  async findText(searchText: string, screenshot?: Screenshot): Promise<ClickTarget | null> {
    const ss = screenshot ?? await this.captureScreenshot();
    const ocr = await this.recognizeText(ss.dataUrl);
    const searchLower = searchText.toLowerCase();
    for (const result of ocr.results) {
      if (result.text.toLowerCase().includes(searchLower) && result.confidence >= this.config.confidenceThreshold) {
        return {
          x: result.bbox.x,
          y: result.bbox.y,
          width: result.bbox.width,
          height: result.bbox.height,
          text: result.text,
          confidence: result.confidence,
          timestamp: Date.now(),
          center: { x: result.bbox.x + result.bbox.width / 2, y: result.bbox.y + result.bbox.height / 2 }
        };
      }
    }
    return null;
  }

  async findAllText(searchText: string, screenshot?: Screenshot): Promise<ClickTarget[]> {
    const ss = screenshot ?? await this.captureScreenshot();
    const ocr = await this.recognizeText(ss.dataUrl);
    const searchLower = searchText.toLowerCase();
    const targets: ClickTarget[] = [];
    for (const result of ocr.results) {
      if (result.text.toLowerCase().includes(searchLower) && result.confidence >= this.config.confidenceThreshold) {
        targets.push({
          x: result.bbox.x,
          y: result.bbox.y,
          width: result.bbox.width,
          height: result.bbox.height,
          text: result.text,
          confidence: result.confidence,
          timestamp: Date.now(),
          center: { x: result.bbox.x + result.bbox.width / 2, y: result.bbox.y + result.bbox.height / 2 }
        });
      }
    }
    return targets;
  }

  async clickAt(tabId: number, x: number, y: number): Promise<void> {
    await chrome.tabs.sendMessage(tabId, { type: "VISION_CLICK", x, y });
  }

  async waitAndClickButtons(tabId: number, config: ConditionalConfig): Promise<ConditionalClickResult> {
    const startTime = Date.now();
    const timeout = config.timeoutSeconds * 1000;
    let buttonsClicked = 0;
    const clickTargets: ClickTarget[] = [];
    while (Date.now() - startTime < timeout) {
      const screenshot = await this.captureScreenshot(tabId);
      for (const term of config.searchTerms) {
        const target = await this.findText(term, screenshot);
        if (target && target.confidence >= this.config.confidenceThreshold) {
          await this.clickAt(tabId, target.center.x, target.center.y);
          buttonsClicked++;
          clickTargets.push(target);
          await this.sleep(500);
          break;
        }
      }
      if (config.successText) {
        const successTarget = await this.findText(config.successText, screenshot);
        if (successTarget) {
          return { success: true, attempts: buttonsClicked, totalWaitMs: Date.now() - startTime, buttonsClicked, clickTargets };
        }
      }
      await this.sleep(config.pollIntervalMs);
    }
    return { success: buttonsClicked > 0, attempts: buttonsClicked, totalWaitMs: Date.now() - startTime, buttonsClicked, clickTargets };
  }

  private async getActiveTabId(): Promise<number> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");
    return tab.id;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const visionEngine = new VisionEngine();
export { VisionEngine };
