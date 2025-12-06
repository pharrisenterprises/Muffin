// src/background/services/PlaywrightLocators.ts
import { cdpService } from "./CDPService";
import { accessibilityService } from "./AccessibilityService";
import type { LocatorResult, WaitOptions, DEFAULT_WAIT_OPTIONS } from "../../types/cdp";

class PlaywrightLocators {
  async getByRole(tabId: number, role: string, options?: { name?: string; exact?: boolean }): Promise<LocatorResult> {
    const start = Date.now();
    try {
      const node = await accessibilityService.findByRole(tabId, role, options);
      if (node && node.backendDOMNodeId) {
        return { found: true, axNode: node, confidence: 0.95, duration: Date.now() - start };
      }
      return { found: false, confidence: 0, duration: Date.now() - start };
    } catch (e) {
      return { found: false, confidence: 0, duration: Date.now() - start };
    }
  }

  async getByText(tabId: number, text: string, options?: { exact?: boolean }): Promise<LocatorResult> {
    const start = Date.now();
    try {
      const node = await accessibilityService.findByText(tabId, text, options);
      if (node && node.backendDOMNodeId) {
        return { found: true, axNode: node, confidence: 0.9, duration: Date.now() - start };
      }
      return { found: false, confidence: 0, duration: Date.now() - start };
    } catch (e) {
      return { found: false, confidence: 0, duration: Date.now() - start };
    }
  }

  async getByLabel(tabId: number, label: string): Promise<LocatorResult> {
    const start = Date.now();
    try {
      const node = await accessibilityService.findByLabel(tabId, label);
      if (node && node.backendDOMNodeId) {
        return { found: true, axNode: node, confidence: 0.9, duration: Date.now() - start };
      }
      return { found: false, confidence: 0, duration: Date.now() - start };
    } catch (e) {
      return { found: false, confidence: 0, duration: Date.now() - start };
    }
  }

  async getByPlaceholder(tabId: number, placeholder: string): Promise<LocatorResult> {
    const start = Date.now();
    try {
      const node = await accessibilityService.findByPlaceholder(tabId, placeholder);
      if (node && node.backendDOMNodeId) {
        return { found: true, axNode: node, confidence: 0.85, duration: Date.now() - start };
      }
      return { found: false, confidence: 0, duration: Date.now() - start };
    } catch (e) {
      return { found: false, confidence: 0, duration: Date.now() - start };
    }
  }

  async getByTestId(tabId: number, testId: string): Promise<LocatorResult> {
    const start = Date.now();
    try {
      const nodeId = await cdpService.querySelector(tabId, `[data-testid="${testId}"]`);
      if (nodeId) {
        return { found: true, confidence: 1.0, duration: Date.now() - start, selector: `[data-testid="${testId}"]` };
      }
      return { found: false, confidence: 0, duration: Date.now() - start };
    } catch (e) {
      return { found: false, confidence: 0, duration: Date.now() - start };
    }
  }
}

export const playwrightLocators = new PlaywrightLocators();
