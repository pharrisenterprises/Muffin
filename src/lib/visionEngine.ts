// src/lib/visionEngine.ts
// Vision engine for OCR-based element discovery and conditional clicking

import Tesseract from "tesseract.js";
import type { VisionConfig, TextResult, ClickTarget, ConditionalConfig, ConditionalClickResult, Screenshot, OcrResult } from "../types/vision";
import { DEFAULT_VISION_CONFIG, DEFAULT_CONDITIONAL_CONFIG } from "../types/vision";

class VisionEngine {
  private worker: Tesseract.Worker | null = null;
  private isInit: boolean = false;
  private config: VisionConfig;
  private lastScreenshot: Screenshot | null = null;
  private lastOcrResult: OcrResult | null = null;

  constructor(config?: Partial<VisionConfig>) {
    this.config = { ...DEFAULT_VISION_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.isInit) return;
    this.worker = await Tesseract.createWorker(this.config.language);
    this.isInit = true;
    console.log("[VisionEngine] Initialized with language:", this.config.language);
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.isInit = false;
    console.log("[VisionEngine] Terminated");
  }

  get isInitialized(): boolean {
    return this.isInit;
  }

  getConfig(): VisionConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<VisionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getLastScreenshot(): Screenshot | null {
    return this.lastScreenshot;
  }

  getLastOcrResult(): OcrResult | null {
    return this.lastOcrResult;
  }

  async captureScreenshot(_tabId?: number): Promise<Screenshot> {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });
    const screenshot: Screenshot = { dataUrl, width: img.width, height: img.height, timestamp: Date.now() };
    this.lastScreenshot = screenshot;
    return screenshot;
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
    const ocrResult: OcrResult = { results, duration: Date.now() - start, timestamp: Date.now() };
    this.lastOcrResult = ocrResult;
    return ocrResult;
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

  async clickAtCoordinates(tabId: number, x: number, y: number): Promise<boolean> {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "VISION_CLICK", x, y });
      return true;
    } catch (e) {
      console.error("[VisionEngine] clickAtCoordinates error:", e);
      return false;
    }
  }

  async typeText(tabId: number, text: string): Promise<boolean> {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "VISION_TYPE", text });
      return true;
    } catch (e) {
      console.error("[VisionEngine] typeText error:", e);
      return false;
    }
  }

  async waitAndClickButtons(tabId: number, config?: Partial<ConditionalConfig>): Promise<ConditionalClickResult> {
    const cfg = { ...DEFAULT_CONDITIONAL_CONFIG, ...config, enabled: true };
    const startTime = Date.now();
    const timeout = cfg.timeoutSeconds * 1000;
    let buttonsClicked = 0;
    const clickTargets: ClickTarget[] = [];

    while (Date.now() - startTime < timeout) {
      const screenshot = await this.captureScreenshot(tabId);
      for (const term of cfg.searchTerms) {
        const target = await this.findText(term, screenshot);
        if (target && target.confidence >= this.config.confidenceThreshold) {
          const clicked = await this.clickAtCoordinates(tabId, target.center.x, target.center.y);
          if (clicked) {
            buttonsClicked++;
            clickTargets.push(target);
            console.log("[VisionEngine] Clicked:", term, "at", target.center);
            await this.sleep(500);
            break;
          }
        }
      }
      if (cfg.successText) {
        const successTarget = await this.findText(cfg.successText, screenshot);
        if (successTarget) {
          const duration = Date.now() - startTime;
          return { success: true, attempts: buttonsClicked, totalWaitMs: duration, buttonsClicked, clickTargets, clickedTexts: [], duration, timedOut: false };
        }
      }
      await this.sleep(cfg.pollIntervalMs);
    }
    const duration = Date.now() - startTime;
    return { success: buttonsClicked > 0, attempts: buttonsClicked, totalWaitMs: duration, buttonsClicked, clickTargets, clickedTexts: [], duration, timedOut: false };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const visionEngine = new VisionEngine();
export { VisionEngine };
