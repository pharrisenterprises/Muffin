/**
 * Chrome DevTools Protocol Client
 * Provides direct browser control without external dependencies
 */

export class CDPClient {
  private debuggerId: chrome.debugger.Debuggee;
  private attached = false;

  constructor(tabId: number) {
    this.debuggerId = { tabId };
  }

  async attach(): Promise<void> {
    if (this.attached) return;
    
    return new Promise((resolve, reject) => {
      chrome.debugger.attach(this.debuggerId, '1.3', () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          this.attached = true;
          resolve();
        }
      });
    });
  }

  async detach(): Promise<void> {
    if (!this.attached) return;
    
    return new Promise((resolve) => {
      chrome.debugger.detach(this.debuggerId, () => {
        this.attached = false;
        resolve();
      });
    });
  }

  private sendCommand<T>(method: string, params?: object): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(this.debuggerId, method, params, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result as T);
        }
      });
    });
  }

  // Get document root
  async getDocument(): Promise<{ nodeId: number }> {
    const response = await this.sendCommand<{ root: { nodeId: number } }>('DOM.getDocument');
    return { nodeId: response.root.nodeId };
  }

  // Find element by CSS selector
  async querySelector(selector: string, rootNodeId?: number): Promise<number | null> {
    try {
      const root = rootNodeId || (await this.getDocument()).nodeId;
      const response = await this.sendCommand<{ nodeId: number }>(
        'DOM.querySelector',
        { nodeId: root, selector }
      );
      return response.nodeId || null;
    } catch {
      return null;
    }
  }

  // Get element bounding box
  async getBoxModel(nodeId: number): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  } | null> {
    try {
      const response = await this.sendCommand<{
        model: {
          content: number[];
          width: number;
          height: number;
        };
      }>('DOM.getBoxModel', { nodeId });
      
      const { content, width, height } = response.model;
      const x = content[0];
      const y = content[1];
      
      return {
        x,
        y,
        width,
        height,
        centerX: x + width / 2,
        centerY: y + height / 2
      };
    } catch {
      return null;
    }
  }

  // Click at coordinates using Input domain
  async clickAtCoordinates(x: number, y: number): Promise<void> {
    // Mouse down
    await this.sendCommand('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1
    });

    // Small delay for realism
    await this.delay(50);

    // Mouse up
    await this.sendCommand('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1
    });
  }

  // Focus an element before typing
  async focusElement(nodeId: number): Promise<void> {
    await this.sendCommand('DOM.focus', { nodeId });
  }

  // Type text character by character
  async typeText(text: string): Promise<void> {
    for (const char of text) {
      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown',
        text: char
      });
      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp',
        text: char
      });
      await this.delay(30); // Human-like delay
    }
  }

  // Set input value using DOM + JavaScript (React-safe)
  async setInputValue(nodeId: number, value: string): Promise<void> {
    // Resolve node to JavaScript object
    const { object } = await this.sendCommand<{
      object: { objectId: string };
    }>('DOM.resolveNode', { nodeId });

    // Call function to set value React-safely
    await this.sendCommand('Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration: `function(value) {
        // Get native setter to bypass React
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set || Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        
        if (nativeSetter) {
          nativeSetter.call(this, value);
        } else {
          this.value = value;
        }
        
        // Dispatch events for React
        this.dispatchEvent(new Event('input', { bubbles: true }));
        this.dispatchEvent(new Event('change', { bubbles: true }));
      }`,
      arguments: [{ value }]
    });
  }

  // Press special key (Enter, Tab, etc.)
  async pressKey(key: string): Promise<void> {
    const keyMap: Record<string, { keyCode: number; code: string }> = {
      'Enter': { keyCode: 13, code: 'Enter' },
      'Tab': { keyCode: 9, code: 'Tab' },
      'Escape': { keyCode: 27, code: 'Escape' },
      'Backspace': { keyCode: 8, code: 'Backspace' },
      'Delete': { keyCode: 46, code: 'Delete' },
      'ArrowUp': { keyCode: 38, code: 'ArrowUp' },
      'ArrowDown': { keyCode: 40, code: 'ArrowDown' },
      'ArrowLeft': { keyCode: 37, code: 'ArrowLeft' },
      'ArrowRight': { keyCode: 39, code: 'ArrowRight' },
    };

    const keyInfo = keyMap[key] || { keyCode: key.charCodeAt(0), code: key };

    await this.sendCommand('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code: keyInfo.code,
      windowsVirtualKeyCode: keyInfo.keyCode,
      nativeVirtualKeyCode: keyInfo.keyCode
    });

    await this.sendCommand('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code: keyInfo.code,
      windowsVirtualKeyCode: keyInfo.keyCode,
      nativeVirtualKeyCode: keyInfo.keyCode
    });
  }

  // Capture screenshot
  async captureScreenshot(): Promise<string> {
    const response = await this.sendCommand<{ data: string }>(
      'Page.captureScreenshot',
      { format: 'png' }
    );
    return response.data; // Base64 encoded
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
