// src/background/services/AccessibilityService.ts
import { cdpService } from "./CDPService";
import type { AXNode } from "../../types/cdp";

class AccessibilityService {
  async getFullTree(tabId: number): Promise<AXNode[]> {
    return cdpService.getAccessibilityTree(tabId);
  }

  async findByRole(tabId: number, role: string, options?: { name?: string; exact?: boolean }): Promise<AXNode | null> {
    const nodes = await this.getFullTree(tabId);
    for (const node of nodes) {
      if (node.role?.value?.toLowerCase() !== role.toLowerCase()) continue;
      if (options?.name) {
        const nodeName = node.name?.value || "";
        if (options.exact) {
          if (nodeName !== options.name) continue;
        } else {
          if (!nodeName.toLowerCase().includes(options.name.toLowerCase())) continue;
        }
      }
      return node;
    }
    return null;
  }

  async findByText(tabId: number, text: string, options?: { exact?: boolean }): Promise<AXNode | null> {
    const nodes = await this.getFullTree(tabId);
    for (const node of nodes) {
      const nodeName = node.name?.value || "";
      const nodeValue = node.value?.value || "";
      const combined = `${nodeName} ${nodeValue}`;
      if (options?.exact) {
        if (nodeName === text || nodeValue === text) return node;
      } else {
        if (combined.toLowerCase().includes(text.toLowerCase())) return node;
      }
    }
    return null;
  }

  async findByLabel(tabId: number, label: string): Promise<AXNode | null> {
    const nodes = await this.getFullTree(tabId);
    for (const node of nodes) {
      const nodeName = node.name?.value || "";
      if (nodeName.toLowerCase().includes(label.toLowerCase())) {
        return node;
      }
    }
    return null;
  }

  async findByPlaceholder(tabId: number, placeholder: string): Promise<AXNode | null> {
    const nodes = await this.getFullTree(tabId);
    for (const node of nodes) {
      const props = node.properties || [];
      const placeholderProp = props.find(p => p.name === "placeholder");
      if (placeholderProp && String(placeholderProp.value.value).toLowerCase().includes(placeholder.toLowerCase())) {
        return node;
      }
    }
    return null;
  }
}

export const accessibilityService = new AccessibilityService();
