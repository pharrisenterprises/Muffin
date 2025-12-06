// src/background/services/AutoWaiting.ts
import { cdpService } from "./CDPService";
import type { WaitOptions } from "../../types/cdp";
import { DEFAULT_WAIT_OPTIONS } from "../../types/cdp";

class AutoWaiting {
  async waitForSelector(tabId: number, selector: string, options?: WaitOptions): Promise<number | null> {
    const opts = { ...DEFAULT_WAIT_OPTIONS, ...options };
    const start = Date.now();
    while (Date.now() - start < (opts.timeout || 30000)) {
      try {
        const nodeId = await cdpService.querySelector(tabId, selector);
        if (nodeId) {
          if (opts.visible) {
            const box = await cdpService.getBoxModel(tabId, nodeId);
            if (!box || box.width === 0 || box.height === 0) {
              await this.sleep(opts.pollInterval || 100);
              continue;
            }
          }
          return nodeId;
        }
      } catch (e) {
        // Element not found yet
      }
      await this.sleep(opts.pollInterval || 100);
    }
    return null;
  }

  async waitForNavigation(tabId: number, options?: { timeout?: number }): Promise<boolean> {
    const timeout = options?.timeout || 30000;
    return new Promise((resolve) => {
      const listener = (details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => {
        if (details.tabId === tabId && details.frameId === 0) {
          chrome.webNavigation.onCompleted.removeListener(listener);
          resolve(true);
        }
      };
      chrome.webNavigation.onCompleted.addListener(listener);
      setTimeout(() => {
        chrome.webNavigation.onCompleted.removeListener(listener);
        resolve(false);
      }, timeout);
    });
  }

  async waitForNetworkIdle(_tabId: number, options?: { timeout?: number; idleTime?: number }): Promise<boolean> {
    const timeout = options?.timeout || 30000;
    const idleTime = options?.idleTime || 500;
    const start = Date.now();
    let lastActivity = Date.now();
    while (Date.now() - start < timeout) {
      if (Date.now() - lastActivity >= idleTime) {
        return true;
      }
      await this.sleep(100);
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const autoWaiting = new AutoWaiting();
