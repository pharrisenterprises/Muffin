// src/background/services/CDPService.ts
import type { CDPNode, AXNode, BoxModel } from "../../types/cdp";

class CDPService {
  private attachedTabs: Set<number> = new Set();

  async attach(tabId: number): Promise<void> {
    if (this.attachedTabs.has(tabId)) return;
    await chrome.debugger.attach({ tabId }, "1.3");
    this.attachedTabs.add(tabId);
    await this.sendCommand(tabId, "DOM.enable");
    await this.sendCommand(tabId, "Accessibility.enable");
    await this.sendCommand(tabId, "Runtime.enable");
  }

  async detach(tabId: number): Promise<void> {
    if (!this.attachedTabs.has(tabId)) return;
    try {
      await chrome.debugger.detach({ tabId });
    } catch (e) {
      console.warn("CDP detach warning:", e);
    }
    this.attachedTabs.delete(tabId);
  }

  async sendCommand<T>(tabId: number, method: string, params?: object): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result as T);
        }
      });
    });
  }

  isAttached(tabId: number): boolean {
    return this.attachedTabs.has(tabId);
  }

  async getDocument(tabId: number): Promise<CDPNode> {
    const { root } = await this.sendCommand<{ root: CDPNode }>(tabId, "DOM.getDocument", { depth: -1 });
    return root;
  }

  async querySelector(tabId: number, selector: string, nodeId?: number): Promise<number> {
    const root = nodeId ?? (await this.getDocument(tabId)).nodeId;
    const { nodeId: resultId } = await this.sendCommand<{ nodeId: number }>(tabId, "DOM.querySelector", { nodeId: root, selector });
    return resultId;
  }

  async querySelectorAll(tabId: number, selector: string, nodeId?: number): Promise<number[]> {
    const root = nodeId ?? (await this.getDocument(tabId)).nodeId;
    const { nodeIds } = await this.sendCommand<{ nodeIds: number[] }>(tabId, "DOM.querySelectorAll", { nodeId: root, selector });
    return nodeIds;
  }

  async getBoxModel(tabId: number, nodeId: number): Promise<BoxModel | null> {
    try {
      const { model } = await this.sendCommand<{ model: BoxModel }>(tabId, "DOM.getBoxModel", { nodeId });
      return model;
    } catch {
      return null;
    }
  }

  async getAccessibilityTree(tabId: number): Promise<AXNode[]> {
    const { nodes } = await this.sendCommand<{ nodes: AXNode[] }>(tabId, "Accessibility.getFullAXTree");
    return nodes;
  }

  async focusNode(tabId: number, nodeId: number): Promise<void> {
    await this.sendCommand(tabId, "DOM.focus", { nodeId });
  }

  async scrollIntoView(tabId: number, nodeId: number): Promise<void> {
    await this.sendCommand(tabId, "DOM.scrollIntoViewIfNeeded", { nodeId });
  }

  async clickNode(tabId: number, nodeId: number): Promise<void> {
    const box = await this.getBoxModel(tabId, nodeId);
    if (!box) throw new Error("Cannot get box model for click");
    const x = (box.content[0] + box.content[2]) / 2;
    const y = (box.content[1] + box.content[5]) / 2;
    await this.sendCommand(tabId, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await this.sendCommand(tabId, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }

  async typeText(tabId: number, text: string): Promise<void> {
    for (const char of text) {
      await this.sendCommand(tabId, "Input.dispatchKeyEvent", { type: "keyDown", text: char });
      await this.sendCommand(tabId, "Input.dispatchKeyEvent", { type: "keyUp", text: char });
    }
  }
}

export const cdpService = new CDPService();
