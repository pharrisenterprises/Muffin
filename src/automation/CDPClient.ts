/**
 * CDP CLIENT MODULE
 * 
 * Interfaces with Chrome DevTools Protocol for:
 * - Element location via DOM.querySelector
 * - Input simulation via Input.dispatchMouseEvent / Input.dispatchKeyEvent
 * - Screenshot capture for vision-based fallback
 */

import { CDPConnection, CDPNodeInfo } from './types';

export class CDPClient {
  private connection: CDPConnection | null = null;
  private debuggerAttached: boolean = false;
  
  /**
   * Attach to the current tab's debugger
   */
  async attach(): Promise<boolean> {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        console.error('[CDPClient] No active tab found');
        return false;
      }
      
      // Attach debugger
      await chrome.debugger.attach({ tabId: tab.id }, '1.3');
      
      this.connection = {
        tabId: tab.id,
        attached: true,
      };
      this.debuggerAttached = true;
      
      console.log('[CDPClient] Attached to tab:', tab.id);
      return true;
      
    } catch (error) {
      console.error('[CDPClient] Failed to attach:', error);
      return false;
    }
  }
  
  /**
   * Detach from debugger
   */
  async detach(): Promise<void> {
    if (this.connection?.tabId && this.debuggerAttached) {
      try {
        await chrome.debugger.detach({ tabId: this.connection.tabId });
        console.log('[CDPClient] Detached');
      } catch (e) {
        // Already detached
      }
    }
    this.connection = null;
    this.debuggerAttached = false;
  }
  
  /**
   * Send CDP command
   */
  private async sendCommand<T>(method: string, params?: object): Promise<T> {
    if (!this.connection?.tabId) {
      throw new Error('CDP not attached');
    }
    
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(
        { tabId: this.connection!.tabId },
        method,
        params,
        (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result as T);
          }
        }
      );
    });
  }
  
  /**
   * Find element by selector using CDP
   */
  async querySelector(selector: string): Promise<CDPNodeInfo | null> {
    try {
      // Get document root
      const doc = await this.sendCommand<{ root: { nodeId: number } }>('DOM.getDocument');
      
      // Query selector
      const result = await this.sendCommand<{ nodeId: number }>('DOM.querySelector', {
        nodeId: doc.root.nodeId,
        selector,
      });
      
      if (!result.nodeId) {
        return null;
      }
      
      // Get node details
      const nodeInfo = await this.sendCommand<{ 
        model: { content: number[] } 
      }>('DOM.getBoxModel', {
        nodeId: result.nodeId,
      });
      
      // content is [x1, y1, x2, y2, x3, y3, x4, y4] quad
      const content = nodeInfo.model?.content;
      if (content && content.length >= 4) {
        return {
          nodeId: result.nodeId,
          backendNodeId: result.nodeId,
          boundingBox: {
            x: content[0],
            y: content[1],
            width: content[2] - content[0],
            height: content[5] - content[1],
          },
        };
      }
      
      return { nodeId: result.nodeId, backendNodeId: result.nodeId };
      
    } catch (error) {
      console.error('[CDPClient] querySelector failed:', error);
      return null;
    }
  }
  
  /**
   * Find element by XPath using CDP
   */
  async queryXPath(xpath: string): Promise<CDPNodeInfo | null> {
    try {
      // Use Runtime.evaluate to run XPath
      const result = await this.sendCommand<{
        result: { objectId?: string };
        exceptionDetails?: object;
      }>('Runtime.evaluate', {
        expression: `document.evaluate("${xpath.replace(/"/g, '\\"')}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue`,
        returnByValue: false,
      });
      
      if (result.exceptionDetails || !result.result?.objectId) {
        return null;
      }
      
      // Get node from object
      const nodeResult = await this.sendCommand<{ nodeId: number }>('DOM.requestNode', {
        objectId: result.result.objectId,
      });
      
      if (!nodeResult.nodeId) {
        return null;
      }
      
      // Get bounding box
      try {
        const boxModel = await this.sendCommand<{
          model: { content: number[] };
        }>('DOM.getBoxModel', {
          nodeId: nodeResult.nodeId,
        });
        
        const content = boxModel.model?.content;
        if (content && content.length >= 4) {
          return {
            nodeId: nodeResult.nodeId,
            backendNodeId: nodeResult.nodeId,
            objectId: result.result.objectId,
            boundingBox: {
              x: content[0],
              y: content[1],
              width: content[2] - content[0],
              height: content[5] - content[1],
            },
          };
        }
      } catch (e) {
        // Box model might fail for hidden elements
      }
      
      return {
        nodeId: nodeResult.nodeId,
        backendNodeId: nodeResult.nodeId,
        objectId: result.result.objectId,
      };
      
    } catch (error) {
      console.error('[CDPClient] queryXPath failed:', error);
      return null;
    }
  }
  
  /**
   * Click at coordinates using CDP Input
   */
  async clickAt(x: number, y: number): Promise<boolean> {
    try {
      // Mouse down
      await this.sendCommand('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button: 'left',
        clickCount: 1,
      });
      
      // Mouse up
      await this.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: 'left',
        clickCount: 1,
      });
      
      console.log('[CDPClient] Clicked at:', x, y);
      return true;
      
    } catch (error) {
      console.error('[CDPClient] clickAt failed:', error);
      return false;
    }
  }
  
  /**
   * Type text using CDP Input
   */
  async typeText(text: string): Promise<boolean> {
    try {
      for (const char of text) {
        await this.sendCommand('Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: char,
          text: char,
        });
        await this.sendCommand('Input.dispatchKeyEvent', {
          type: 'keyUp',
          key: char,
        });
        
        // Small delay between characters
        await this.sleep(30);
      }
      
      console.log('[CDPClient] Typed text:', text.substring(0, 20));
      return true;
      
    } catch (error) {
      console.error('[CDPClient] typeText failed:', error);
      return false;
    }
  }
  
  /**
   * Press Enter key using CDP
   */
  async pressEnter(): Promise<boolean> {
    try {
      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Enter',
        code: 'Enter',
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
      });
      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Enter',
        code: 'Enter',
      });
      
      console.log('[CDPClient] Pressed Enter');
      return true;
      
    } catch (error) {
      console.error('[CDPClient] pressEnter failed:', error);
      return false;
    }
  }
  
  /**
   * Focus element by nodeId
   */
  async focusNode(nodeId: number): Promise<boolean> {
    try {
      await this.sendCommand('DOM.focus', { nodeId });
      return true;
    } catch (error) {
      console.error('[CDPClient] focusNode failed:', error);
      return false;
    }
  }
  
  /**
   * Capture screenshot (for vision fallback)
   */
  async captureScreenshot(): Promise<string | null> {
    try {
      const result = await this.sendCommand<{ data: string }>('Page.captureScreenshot', {
        format: 'png',
      });
      return result.data; // Base64 encoded
    } catch (error) {
      console.error('[CDPClient] captureScreenshot failed:', error);
      return null;
    }
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.debuggerAttached && !!this.connection?.tabId;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const cdpClient = new CDPClient();
