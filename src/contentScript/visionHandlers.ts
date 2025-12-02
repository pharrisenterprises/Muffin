/**
 * Vision Content Script Handlers
 * 
 * Receives Vision commands from VisionEngine (via background script)
 * and executes them in the webpage context.
 * 
 * Handles:
 * - VISION_CLICK: Click at screen coordinates
 * - VISION_TYPE: Type text into focused element
 * - VISION_KEY: Send keyboard shortcuts
 * - VISION_SCROLL: Scroll the page
 * - VISION_GET_ELEMENT: Get element info at coordinates
 */

import type { VisionMessage, VisionResponse } from '../types/vision';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Element information returned from VISION_GET_ELEMENT.
 */
export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  isEditable: boolean;
  isClickable: boolean;
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Click result with element details.
 */
export interface ClickResult {
  success: boolean;
  element?: string;
  error?: string;
}

/**
 * Type result.
 */
export interface TypeResult {
  success: boolean;
  error?: string;
}

/**
 * Key result.
 */
export interface KeyResult {
  success: boolean;
  error?: string;
}

/**
 * Scroll result.
 */
export interface ScrollResult {
  success: boolean;
  scrollY?: number;
  error?: string;
}

// ============================================================================
// CLICK HANDLER (INT-002)
// ============================================================================

/**
 * Handle VISION_CLICK command.
 * Clicks at the specified screen coordinates.
 * 
 * @param x - X coordinate (relative to viewport)
 * @param y - Y coordinate (relative to viewport)
 * @returns Click result with success status
 */
function handleVisionClick(x: number, y: number): ClickResult {
  try {
    // Get element at coordinates
    const element = document.elementFromPoint(x, y);

    if (!element) {
      console.warn(`[VisionHandlers] No element found at (${x}, ${y})`);
      return { success: false, error: 'No element at coordinates' };
    }

    // Scroll element into view if needed (ensures it's fully visible)
    element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });

    // Small delay to let scroll settle
    // Note: This is synchronous, so we use a workaround
    const scrolledElement = document.elementFromPoint(x, y) || element;

    // Create realistic mouse event sequence
    const mouseEventInit: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x + window.screenX,
      screenY: y + window.screenY,
      button: 0,
      buttons: 1,
      relatedTarget: null,
    };

    // Dispatch mousedown
    scrolledElement.dispatchEvent(new MouseEvent('mousedown', mouseEventInit));

    // Dispatch mouseup
    scrolledElement.dispatchEvent(new MouseEvent('mouseup', {
      ...mouseEventInit,
      buttons: 0,
    }));

    // Dispatch click
    scrolledElement.dispatchEvent(new MouseEvent('click', mouseEventInit));

    // Also try to focus the element if it's focusable
    if (scrolledElement instanceof HTMLElement && isFocusable(scrolledElement)) {
      scrolledElement.focus();
    }

    console.log(`[VisionHandlers] Clicked at (${x}, ${y}):`, scrolledElement.tagName);

    return {
      success: true,
      element: scrolledElement.tagName,
    };
  } catch (error) {
    console.error('[VisionHandlers] Click error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// TYPE HANDLER (INT-003)
// ============================================================================

/**
 * Handle VISION_TYPE command.
 * Types text into the currently focused element.
 * 
 * @param text - Text to type
 * @returns Type result with success status
 */
function handleVisionType(text: string): TypeResult {
  try {
    const activeElement = document.activeElement;

    if (!activeElement) {
      return { success: false, error: 'No active element' };
    }

    // Handle standard input/textarea elements
    if (activeElement instanceof HTMLInputElement || 
        activeElement instanceof HTMLTextAreaElement) {
      
      // Clear existing value and set new text
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        activeElement instanceof HTMLInputElement 
          ? HTMLInputElement.prototype 
          : HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(activeElement, text);
      } else {
        activeElement.value = text;
      }

      // Dispatch input events
      activeElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

      console.log(`[VisionHandlers] Typed into ${activeElement.tagName}: "${text.substring(0, 30)}..."`);
      return { success: true };
    }

    // Handle contenteditable elements (Monaco editor, rich text, etc.)
    if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
      // Try execCommand first (works in most cases)
      const success = document.execCommand('insertText', false, text);
      
      if (!success) {
        // Fallback: directly manipulate textContent
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
        } else {
          activeElement.textContent = text;
        }
      }

      // Dispatch input event
      activeElement.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text,
      }));

      console.log(`[VisionHandlers] Typed into contenteditable: "${text.substring(0, 30)}..."`);
      return { success: true };
    }

    // Fallback: simulate keyboard events for each character
    console.log('[VisionHandlers] Using keyboard simulation fallback');
    for (const char of text) {
      activeElement.dispatchEvent(new KeyboardEvent('keydown', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
      }));
      activeElement.dispatchEvent(new KeyboardEvent('keypress', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
      }));
      activeElement.dispatchEvent(new KeyboardEvent('keyup', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
      }));
    }

    return { success: true };
  } catch (error) {
    console.error('[VisionHandlers] Type error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// KEY HANDLER (INT-004)
// ============================================================================

/**
 * Handle VISION_KEY command.
 * Sends keyboard shortcuts/special keys.
 * 
 * @param key - Key to send (e.g., 'Enter', 'Tab', 'Escape', 'a')
 * @param modifiers - Modifier keys
 * @returns Key result with success status
 */
function handleVisionKey(
  key: string,
  modifiers?: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  }
): KeyResult {
  try {
    const activeElement = document.activeElement || document.body;

    // Map common key names to proper key values
    const keyMap: Record<string, string> = {
      'enter': 'Enter',
      'tab': 'Tab',
      'escape': 'Escape',
      'esc': 'Escape',
      'backspace': 'Backspace',
      'delete': 'Delete',
      'space': ' ',
      'up': 'ArrowUp',
      'down': 'ArrowDown',
      'left': 'ArrowLeft',
      'right': 'ArrowRight',
      'home': 'Home',
      'end': 'End',
      'pageup': 'PageUp',
      'pagedown': 'PageDown',
    };

    const normalizedKey = keyMap[key.toLowerCase()] || key;

    // Determine the key code
    const code = getKeyCode(normalizedKey);

    const keyEventInit: KeyboardEventInit = {
      key: normalizedKey,
      code,
      bubbles: true,
      cancelable: true,
      view: window,
      ctrlKey: modifiers?.ctrlKey || false,
      shiftKey: modifiers?.shiftKey || false,
      altKey: modifiers?.altKey || false,
      metaKey: modifiers?.metaKey || false,
    };

    // Dispatch key events
    activeElement.dispatchEvent(new KeyboardEvent('keydown', keyEventInit));
    
    // Only dispatch keypress for printable characters
    if (normalizedKey.length === 1) {
      activeElement.dispatchEvent(new KeyboardEvent('keypress', keyEventInit));
    }
    
    activeElement.dispatchEvent(new KeyboardEvent('keyup', keyEventInit));

    console.log(`[VisionHandlers] Sent key: ${normalizedKey}`, modifiers);
    return { success: true };
  } catch (error) {
    console.error('[VisionHandlers] Key error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// SCROLL HANDLER (INT-005)
// ============================================================================

/**
 * Handle VISION_SCROLL command.
 * Scrolls the page in the specified direction.
 * 
 * @param direction - Scroll direction
 * @param amount - Pixels to scroll (default: 500)
 * @returns Scroll result with new scroll position
 */
function handleVisionScroll(
  direction: 'up' | 'down' | 'left' | 'right' | 'top' | 'bottom',
  amount: number = 500
): ScrollResult {
  try {
    switch (direction) {
      case 'up':
        window.scrollBy({ top: -amount, behavior: 'instant' });
        break;
      case 'down':
        window.scrollBy({ top: amount, behavior: 'instant' });
        break;
      case 'left':
        window.scrollBy({ left: -amount, behavior: 'instant' });
        break;
      case 'right':
        window.scrollBy({ left: amount, behavior: 'instant' });
        break;
      case 'top':
        window.scrollTo({ top: 0, behavior: 'instant' });
        break;
      case 'bottom':
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
        break;
    }

    console.log(`[VisionHandlers] Scrolled ${direction} by ${amount}px`);
    return {
      success: true,
      scrollY: window.scrollY,
    };
  } catch (error) {
    console.error('[VisionHandlers] Scroll error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// GET ELEMENT HANDLER (INT-005)
// ============================================================================

/**
 * Handle VISION_GET_ELEMENT command.
 * Gets information about the element at specified coordinates.
 * 
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Element information or null if no element found
 */
function handleVisionGetElement(x: number, y: number): ElementInfo | null {
  try {
    const element = document.elementFromPoint(x, y);

    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();

    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      textContent: element.textContent?.trim().substring(0, 100) || undefined,
      isEditable: isEditable(element),
      isClickable: isClickable(element),
      boundingRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    };
  } catch (error) {
    console.error('[VisionHandlers] Get element error:', error);
    return null;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if an element is focusable.
 */
function isFocusable(element: HTMLElement): boolean {
  const focusableTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'];
  if (focusableTags.includes(element.tagName)) return true;
  if (element.tabIndex >= 0) return true;
  if (element.isContentEditable) return true;
  return false;
}

/**
 * Check if an element is editable.
 */
function isEditable(element: Element): boolean {
  if (element instanceof HTMLInputElement) {
    const nonEditableTypes = ['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image'];
    return !nonEditableTypes.includes(element.type);
  }
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  return false;
}

/**
 * Check if an element is clickable.
 */
function isClickable(element: Element): boolean {
  const clickableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'];
  if (clickableTags.includes(element.tagName)) return true;
  
  const role = element.getAttribute('role');
  if (role && ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'].includes(role)) return true;
  
  // Check for click handler (this is a heuristic)
  if (element instanceof HTMLElement) {
    const style = window.getComputedStyle(element);
    if (style.cursor === 'pointer') return true;
  }
  
  return false;
}

/**
 * Get key code from key name.
 */
function getKeyCode(key: string): string {
  const codeMap: Record<string, string> = {
    'Enter': 'Enter',
    'Tab': 'Tab',
    'Escape': 'Escape',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    ' ': 'Space',
    'ArrowUp': 'ArrowUp',
    'ArrowDown': 'ArrowDown',
    'ArrowLeft': 'ArrowLeft',
    'ArrowRight': 'ArrowRight',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
  };

  if (codeMap[key]) return codeMap[key];
  if (key.length === 1) {
    if (/[a-zA-Z]/.test(key)) return `Key${key.toUpperCase()}`;
    if (/[0-9]/.test(key)) return `Digit${key}`;
  }
  return key;
}

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

/**
 * Initialize Vision handlers.
 * Sets up the message listener for Vision commands.
 */
export function initializeVisionHandlers(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: VisionMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: VisionResponse) => void
    ) => {
      // Only handle Vision messages
      if (!message.type?.startsWith('VISION_')) {
        return false;
      }

      console.log(`[VisionHandlers] Received: ${message.type}`);

      switch (message.type) {
        case 'VISION_CLICK': {
          const result = handleVisionClick(message.x, message.y);
          sendResponse({ success: result.success, error: result.error, data: result });
          return true;
        }

        case 'VISION_TYPE': {
          const result = handleVisionType(message.text);
          sendResponse({ success: result.success, error: result.error });
          return true;
        }

        case 'VISION_KEY': {
          const result = handleVisionKey(message.key, message.modifiers);
          sendResponse({ success: result.success, error: result.error });
          return true;
        }

        case 'VISION_SCROLL': {
          const result = handleVisionScroll(message.direction, message.amount);
          sendResponse({ success: result.success, error: result.error, data: result });
          return true;
        }

        case 'VISION_GET_ELEMENT': {
          const result = handleVisionGetElement(message.x, message.y);
          sendResponse({ success: result !== null, data: result });
          return true;
        }

        default:
          console.warn(`[VisionHandlers] Unknown message type: ${(message as any).type}`);
          return false;
      }
    }
  );

  console.log('[VisionHandlers] Initialized');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  handleVisionClick,
  handleVisionType,
  handleVisionKey,
  handleVisionScroll,
  handleVisionGetElement,
};
