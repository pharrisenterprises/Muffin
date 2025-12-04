import React, { useEffect } from 'react';

// B-46: Safe querySelector that handles special characters in selectors
function safeQuerySelector(doc: Document | ShadowRoot, selector: string): Element | null {
  if (!selector) return null;
  
  try {
    // Check if selector has aria-label with special chars
    if (selector.includes('[aria-label="')) {
      const match = selector.match(/\[aria-label="([^"]+)"\]/);
      if (match) {
        const labelValue = match[1];
        // If label contains CSS-breaking chars, search manually
        if (/[,:\[\]()>+~]/.test(labelValue)) {
          console.log('[TestFlow] Using manual aria-label search for:', labelValue.substring(0, 40));
          const elements = doc.querySelectorAll('[aria-label]');
          for (const el of elements) {
            if (el.getAttribute('aria-label') === labelValue) {
              return el;
            }
          }
          // Also check for partial match (label might be truncated)
          const labelStart = labelValue.substring(0, 30);
          for (const el of elements) {
            const attr = el.getAttribute('aria-label') || '';
            if (attr.startsWith(labelStart)) {
              return el;
            }
          }
          return null;
        }
      }
    }
    return doc.querySelector(selector);
  } catch (e) {
    console.error('[TestFlow] querySelector failed, trying fallback:', e);
    // Try to find by aria-label manually
    if (selector.includes('aria-label')) {
      const match = selector.match(/\[aria-label="([^"]+)"\]/);
      if (match) {
        const elements = doc.querySelectorAll('[aria-label]');
        for (const el of elements) {
          if (el.getAttribute('aria-label')?.includes(match[1].substring(0, 20))) {
            return el;
          }
        }
      }
    }
    return null;
  }
}

interface LogEventData {
  eventType: string;
  xpath: string;
  value?: string;
  label?: string,
  page?: string;
  x?: number;
  y?: number;
  bundle?: Bundle;
}

interface RunStepMessage {
  type: string;
  data: {
    event: string;
    bundle: Bundle;
    value?: string;
    label?: string;
  };
  // B-47: Conditional click config
  config?: {
    searchTerms: string[];
    timeoutSeconds: number;
    pollIntervalMs: number;
  };
}


interface Action {
  type: 'click' | 'input' | 'enter';
  value?: string;
  xpath?: string;
}

interface Bundle {
  id?: string;
  name?: string;
  className?: string;
  dataAttrs?: Record<string, string>;
  aria?: string;
  placeholder?: string;
  tag?: string;
  visibleText?: string;
  xpath?: string;
  bounding?: { left: number; top: number; width?: number; height?: number };
  iframeChain?: IframeInfo[];
  shadowHosts?: string[];
  isClosedShadow?: boolean;
  // B-40: Vision recording support
  coordinates?: { x: number; y: number };
  visionCapture?: boolean;
  recordedVia?: string;
}

interface IframeInfo {
  id?: string;
  name?: string;
  index?: number;
}

const Layout: React.FC = () => {
  useEffect(() => {
    // Initialize content script when component mounts
    initContentScript();

    return () => {
      removeListeners(document);
    };
  }, []);

  const humanLikeClick = (element: HTMLElement): void => {
    ['mouseover', 'mousemove', 'mousedown', 'mouseup', 'click'].forEach(type => {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
  };

  // ============================================
  // FIX 2: Label Counter with Reset
  // Resets when new recording starts
  // ============================================
  let labelCounts = new Map<string, number>();
  
  const resetLabelCounters = (): void => {
    labelCounts = new Map<string, number>();
    console.log('[TestFlow] Label counters reset for new recording');
  };
  
  const generateSequentialLabel = (baseLabel: string): string => {
    const key = (baseLabel || 'field').toLowerCase().replace(/\s+/g, '_');
    const count = labelCounts.get(key) || 0;
    labelCounts.set(key, count + 1);
    return count === 0 ? baseLabel : `${baseLabel}_${count}`;
  };

  // ============================================
  // BATCH B-40: Vision Recording for Complex Editors
  // Enables recording from Monaco, CodeMirror, Terminal, etc.
  // ============================================

  /**
   * Detects if an element is a complex editor that doesn't expose .value
   * These editors store text in JS memory, not DOM properties
   */
  function isComplexEditor(element: HTMLElement | null): boolean {
    if (!element) return false;
    
    return !!(
      // Monaco Editor (GitHub Copilot, VS Code Web, Azure DevOps)
      element.closest('.monaco-editor') ||
      element.closest('.monaco-mouse-cursor-text') ||
      element.closest('[data-mprt="7"]') || // Monaco input area
      
      // CodeMirror (Jupyter, Observable, many code playgrounds)
      element.closest('.CodeMirror') ||
      element.closest('.cm-editor') ||
      element.closest('.cm-content') ||
      
      // Terminal emulators
      element.closest('.xterm') ||
      element.closest('.terminal') ||
      element.closest('[data-terminal]') ||
      
      // Ace Editor
      element.closest('.ace_editor') ||
      element.closest('.ace_text-input') ||
      
      // ProseMirror (Notion, Confluence, many rich text editors)
      element.closest('.ProseMirror') ||
      
      // Quill Editor
      element.closest('.ql-editor') ||
      
      // TinyMCE
      element.closest('.mce-content-body') ||
      
      // Generic contenteditable that's NOT a simple input
      (element.getAttribute('contenteditable') === 'true' &&
       element.closest('[class*="editor"]')) ||
      
      // Slack message input
      element.closest('[data-qa="message_input"]') ||
      
      // Discord message input  
      element.closest('[class*="slateTextArea"]')
    );
  }

  /**
   * Gets the visible text content from a complex editor
   * Tries multiple strategies
   */
  function getComplexEditorText(element: HTMLElement): string | null {
    // Strategy 1: Try to find text content in view lines (Monaco)
    const viewLines = element.closest('.monaco-editor')?.querySelectorAll('.view-line');
    if (viewLines && viewLines.length > 0) {
      const text = Array.from(viewLines)
        .map(line => line.textContent || '')
        .join('\n')
        .trim();
      if (text) return text;
    }
    
    // Strategy 2: Try CodeMirror content
    const cmContent = element.closest('.cm-editor')?.querySelector('.cm-content');
    if (cmContent) {
      const text = cmContent.textContent?.trim();
      if (text) return text;
    }
    
    // Strategy 3: Try contenteditable innerText
    const editable = element.closest('[contenteditable="true"]');
    if (editable) {
      const text = (editable as HTMLElement).innerText?.trim();
      if (text) return text;
    }
    
    // Strategy 4: Try active element's text
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl?.innerText) {
      const text = activeEl.innerText.trim();
      if (text) return text;
    }
    
    return null;
  }

  // Vision recording state
  let visionRecordingDebounce: NodeJS.Timeout | null = null;
  let lastVisionRecordedText: string = '';

  /**
   * Captures text from complex editor using Vision OCR
   * Called when DOM-based recording fails
   */
  async function captureVisionInput(target: HTMLElement): Promise<{
    text: string;
    bounds: DOMRect;
    screenshot?: string;
  } | null> {
    try {
      // First try DOM-based text extraction (faster, no screenshot needed)
      const domText = getComplexEditorText(target);
      if (domText && domText !== lastVisionRecordedText) {
        const bounds = target.getBoundingClientRect();
        return { text: domText, bounds };
      }
      
      // Fall back to screenshot + OCR
      const editorElement = target.closest('.monaco-editor, .CodeMirror, .cm-editor, .xterm, .ace_editor, [contenteditable="true"]') as HTMLElement;
      if (!editorElement) return null;
      
      const bounds = editorElement.getBoundingClientRect();
      
      // Request screenshot from background script
      const response = await chrome.runtime.sendMessage({
        type: 'VISION_CAPTURE_FOR_RECORDING',
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        }
      });
      
      if (response?.error) {
        console.error('[TestFlow Vision] Screenshot failed:', response.error);
        return null;
      }
      
      if (response?.text) {
        return {
          text: response.text,
          bounds: bounds,
          screenshot: response.screenshot
        };
      }
      
      return null;
    } catch (error) {
      console.error('[TestFlow Vision] Capture failed:', error);
      return null;
    }
  }

  // Keyboard buffer for complex editors
  let keyboardBuffer: string = '';
  let keyboardDebounce: NodeJS.Timeout | null = null;
  // B-51: Track last target to reset buffer when element changes
  let lastKeyboardTarget: HTMLElement | null = null;

  function handleKeydownForComplexEditor(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    
    // Only for complex editors
    if (!isComplexEditor(target)) return;
    
    // B-51: Reset buffer when switching to a different element
    if (lastKeyboardTarget && target !== lastKeyboardTarget) {
      console.log('[TestFlow] Target changed, resetting keyboard buffer');
      // Save any pending text for the OLD target before switching
      if (keyboardBuffer.trim() && lastKeyboardTarget) {
        recordComplexEditorInput(lastKeyboardTarget, keyboardBuffer);
      }
      keyboardBuffer = '';
      lastVisionRecordedText = '';
    }
    lastKeyboardTarget = target;

    // Skip modifier-only keys
    if (['Control', 'Alt', 'Shift', 'Meta', 'CapsLock'].includes(event.key)) return;
    
    // Build buffer from keystrokes
    if (event.key === 'Backspace') {
      keyboardBuffer = keyboardBuffer.slice(0, -1);
    } else if (event.key === 'Enter' && !event.shiftKey) {
      // Enter without shift = submit, trigger immediate recording
      if (keyboardBuffer.trim()) {
        recordComplexEditorInput(target, keyboardBuffer);
        keyboardBuffer = '';
      }
      // B-54: Log Enter as separate step for playback
      const bounds = target.getBoundingClientRect();
      logEvent({
        eventType: 'Enter',
        xpath: getXPath(target),
        value: '',
        label: generateSequentialLabel('submit'),
        page: window.location.href,
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      });
    } else if (event.key === 'Enter' && event.shiftKey) {
      keyboardBuffer += '\n';
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      keyboardBuffer += event.key;
    }
    
    // Debounced recording after typing stops
    if (keyboardDebounce) clearTimeout(keyboardDebounce);
    keyboardDebounce = setTimeout(() => {
      if (keyboardBuffer.trim()) {
        recordComplexEditorInput(target, keyboardBuffer);
        keyboardBuffer = '';
      }
    }, 2000);
  }

  function recordComplexEditorInput(target: HTMLElement, text: string) {
    if (text === lastVisionRecordedText) return; // Avoid duplicates
    lastVisionRecordedText = text;
    
    const bounds = target.getBoundingClientRect();
    const xpath = getXPath(target);
    const bundle = recordElement(target);
    
    logEvent({
      eventType: 'input',
      xpath: xpath,
      value: text,
      label: generateSequentialLabel('prompt_input'),
      page: window.location.href,
      bundle: {
        ...bundle,
        coordinates: {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2
        },
        recordedVia: 'keyboard'
      },
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    });
    
    console.log('[TestFlow Keyboard] Recorded:', text.substring(0, 100) + '...');
  }
  
  // VISION: Generate unique labels for similar elements (e.g., search, search_1, search_2)
  const generateUniqueLabel = (baseLabel: string | undefined): string | undefined => {
    if (!baseLabel) return undefined;
    
    // Clean and normalize the label
    const normalized = baseLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // If label is too short (1-2 chars like "q"), make it more descriptive
    let finalLabel = normalized;
    if (normalized.length <= 2) {
      // Try to infer from placeholder or aria-label
      finalLabel = 'search'; // Default for short labels
    }
    
    // Check if we've seen this label before
    const count = labelCounts.get(finalLabel) || 0;
    labelCounts.set(finalLabel, count + 1);
    
    // Return with suffix if duplicate
    return count > 0 ? `${finalLabel}_${count}` : finalLabel;
  };

  const getLabelForTarget = (target: HTMLElement): string | undefined => {
    if (window.location.hostname === "docs.google.com" && window.location.pathname.startsWith("/forms")) {
      // Case 1: Google Forms question heading nearby
      const gf = findGFQuestionTitle(target);
      if (gf) return gf;
    }

    const original = getOriginalSelect(target) || target;

    // Case 1: input inside <label>
    const labelParent = original.closest("label");
    //console.log('getLabelForTarget labelParent', labelParent);
    if (labelParent) {
      const text = labelParent.innerText.replace(/\*/g, "").trim();
      if (text) {
        return text;
      }
    }

    // Case 2: input has ID and <label for="id">
    if (original.id) {
      const labelByFor = document.querySelector(`label[for="${original.id}"]`);
      //console.log('getLabelForTarget labelByFor', labelByFor);
      if (labelByFor) {
        const text = labelByFor.textContent?.replace(/\*/g, "").trim();
        if (text) {
          return text;
        }
      }
    }

    // Case 3: check aria-labelledby attribute
    const labelledBy = original.getAttribute("aria-labelledby");
    if (labelledBy) {
      //console.log('getLabelForTarget labelledBy', labelledBy);
      const labelByAria = document.getElementById(labelledBy);
      if (labelByAria) {
        return labelByAria.textContent?.replace(/\*/g, "").trim();
      }
    }

    // Case 4: check aria-label attribute
    const ariaLabel = original.getAttribute("aria-label");
    //console.log('getLabelForTarget ariaLabel', ariaLabel);
    if (ariaLabel) {
      return ariaLabel.trim();
    }

    // Case 6: look for closest label inside parent container
    const formEntity = original.closest(".form_entity");
    //console.log('getLabelForTarget formEntity', formEntity);
    if (formEntity) {
      const formLabel = formEntity.querySelector(".form_label");
      if (formLabel?.textContent?.trim()) {
        return formLabel.textContent.replace(/\*/g, "").trim();
      }
    }

    // --- CASE 3: target element with selecte2 ---
    //console.log('getLabelForTarget original', original);
    if (original.closest('[role="listbox"]') && original.getAttribute('data-select2-id') != null) {
      const data_select2_id = original.getAttribute('data-select2-id');
      //console.log('getLabelForTarget data_select2_id', data_select2_id);
      const select2_target = document.querySelector(`[role="combobox"][aria-activedescendant="${data_select2_id}"]`);
      //console.log('getLabelForTarget select2_target', select2_target);
      if (select2_target) {
        const select2_target_elem = select2_target.closest('[data-select2-id]')?.parentElement?.querySelector('select[data-select2-id]') as HTMLSelectElement
        //console.log('getLabelForTarget select2_target_elem', select2_target_elem);
        if (select2_target_elem) {
          if (select2_target_elem?.getAttribute('placeholder')) {
            return select2_target_elem?.getAttribute('placeholder')?.trim();
          } else if (select2_target_elem?.parentElement?.closest("[data-select2-id]")?.querySelector('.label')?.textContent) {
            return select2_target_elem?.parentElement?.closest("[data-select2-id]")?.querySelector('.label')?.textContent?.trim();
          } else if (select2_target_elem?.parentElement?.closest("[data-select2-id]")?.parentElement?.querySelector('.label')?.textContent) {
            return select2_target_elem?.parentElement?.closest("[data-select2-id]")?.parentElement?.querySelector('.label')?.textContent?.trim();
          }
        }
      }
    }

    // Case 9: input inside bootstrap row → use first header row as header
    const row = original.closest(".row");
    if (row) {
      const modalBody = row.closest(".modal-body");
      if (modalBody) {
        // header row hamesha pehli row hai
        const headerRow = modalBody.querySelector(".row:first-child");
        if (headerRow) {
          const headerCols = Array.from(headerRow.querySelectorAll(".col-md-3"));
          const currentCols = Array.from(row.querySelectorAll(".col-md-3"));

          const currentCol = original.closest(".col-md-3");
          const colIndex = currentCols.indexOf(currentCol as HTMLElement);

          if (colIndex >= 0 && headerCols[colIndex]) {
            const headerText = headerCols[colIndex].textContent?.trim();
            if (headerText) {
              return headerText.replace(/\*/g, "");
            }
          }
        }
      }
    }

    // Case 10: input inside bootstrap row with .col-md-2 label
    const infoRow = original.closest(".row[data-role='add-property-info']");
    if (infoRow) {
      const labelCol = infoRow.querySelector(".col-md-2");
      if (labelCol?.textContent?.trim()) {
        return labelCol.textContent.replace(/\*/g, "").trim();
      }
    }

    // Case 11: input inside bootstrap row with .col-md-2 label
    const infoRow_values = original.closest(".row");
    if (infoRow_values?.parentElement?.getAttribute("data-role") === "property-values") {
      const cols = Array.from(infoRow_values.children);
      for (let i = 0; i < cols.length; i++) {
        if (cols[i].contains(original)) {
          // Ye input jis col ke andar hai, uske pehle sibling .col-md-2 label hoga
          if (i > 0 && cols[i - 1].classList.contains("col-md-2")) {
            return cols[i - 1].textContent?.replace(/\*/g, "").trim();
          }
        }
      }
    }

    // Case 12: generic bootstrap row → label is previous sibling .col-md-2 / .col-md-3
    const genericRow = original.closest(".row");
    if (genericRow) {
      const cols = Array.from(genericRow.children).filter(
        (el) => el.classList && el.classList.toString().includes("col-md-")
      );
      for (let i = 0; i < cols.length; i++) {
        if (cols[i].contains(original)) {
          if (i > 0 && (cols[i - 1].classList.contains("col-md-2") || cols[i - 1].classList.contains("col-md-3"))) {
            const labelText = cols[i - 1].textContent?.replace(/\*/g, "").trim();
            if (labelText) return labelText;
          }
        }
      }
    }

    // find current col (col-md-*)
    const currentCol = original.closest<HTMLElement>('[class*="col-md-"]');
    if (currentCol) {
      // find the row containing this col
      const row = currentCol.closest<HTMLElement>('.row');
      if (row) {
        // get all col-md-* children inside this row
        const cols = Array.from(row.children).filter(
          (el): el is HTMLElement =>
            el instanceof HTMLElement &&
            Array.from(el.classList).some(c => c.startsWith('col-md-'))
        );

        const colIndex = cols.indexOf(currentCol);

        // find header row (previous row)
        const headerRow = row.previousElementSibling as HTMLElement | null;
        if (headerRow && headerRow.classList.contains('row')) {
          const headerCols = Array.from(headerRow.children).filter(
            (el): el is HTMLElement =>
              el instanceof HTMLElement &&
              Array.from(el.classList).some(c => c.startsWith('col-md-'))
          );

          if (headerCols[colIndex]) {
            const text = headerCols[colIndex].textContent
              ?.replace(/\*/g, "")
              .trim();
            if (text) {
              //console.log("Label found:", text);
            }
          }
        }
      }
    }

    // Generic container fallback
    const container = original.closest("div, td, th, span, p, section");
    //console.log('getLabelForTarget container', container);
    if (container) {
      // Check other common label containers
      const specialLabel = container.querySelector(
        ".form_label, .field-label, .label, .question, .question-text, [role='heading']"
      );
      //console.log('getLabelForTarget specialLabel', specialLabel);
      if (specialLabel?.textContent?.trim()) {
        return specialLabel.textContent.replace(/\*/g, "").trim();
      }

      // Otherwise check normal <label>
      const labels = Array.from(container.querySelectorAll("label"));
      //console.log('getLabelForTarget labels', labels);
      if (labels.length > 0) {
        return labels[labels.length - 1].textContent?.replace(/\*/g, "").trim();
      }
    }

    // Case 7: fallback → find nearest previous text
    let prev: Node | null = original.previousSibling;
    while (prev) {
      if (prev.nodeType === Node.TEXT_NODE && prev.textContent?.trim()) {
        return prev.textContent.replace(/\*/g, "").trim();
      }
      if (prev.nodeType === Node.ELEMENT_NODE) {
        const el = prev as HTMLElement;
        const text = el.textContent?.trim();
        if (text) return text.replace(/\*/g, "").trim();
      }
      prev = prev.previousSibling;
    }

    // Case 8: if input is inside <td>, get text from previous td in the same tr
    const tr = original.closest("tr");
    if (tr) {
      const tds = Array.from(tr.querySelectorAll("td"));
      const index = tds.indexOf(original.closest("td")!);
      if (index > 0) {
        const prevTdText = tds[index - 1].textContent?.replace(/\*/g, "").trim();
        if (prevTdText) return prevTdText;
      }
    }

    // --- Final fallback ---
    if (
      original instanceof HTMLInputElement ||
      original instanceof HTMLSelectElement ||
      original instanceof HTMLTextAreaElement
    ) {
      if (original.name) {
        return original.name;
      } else if (original.hasAttribute("data-role")) {
        return original.getAttribute("data-role") || undefined;
      } else if (original.value) {
        return original.value;
      }
    }
    if (original instanceof HTMLButtonElement || original instanceof HTMLAnchorElement) {
      const text = original.innerText.trim();
      if (text) {
        return text;
      }
    }
    return undefined;
  };


  const getOriginalSelect = (el: HTMLElement): HTMLSelectElement | null => {
    if (el.tagName.toLowerCase() === "select") return el as HTMLSelectElement;

    // If it's a Select2-generated span, find the original <select>
    if (el.classList.contains("select2-selection__rendered")) {
      const id = el.id.replace("select2-", "").replace("-container", "");
      return document.getElementById(id) as HTMLSelectElement;
    }

    return el.closest("select");
  };

  // --- Join textContent safely
  const getNodeText = (el?: Element | null) =>
    (el?.textContent || "").replace(/\*/g, "").trim();

  const findGFQuestionTitle = (target: HTMLElement): string | undefined => {
    let item: HTMLElement | null = null;

    // Try closest checkbox/radio role first
    const roleTarget = target.closest('[role="radio"], [role="checkbox"], [role="listitem"]') as HTMLElement | null;

    if (roleTarget) {
      // Checkbox special case: find parent list container
      const role = roleTarget.getAttribute("role");
      if (role === "checkbox") {
        const list = roleTarget.closest('[role="list"]') as HTMLElement | null;
        if (list) {
          item = list.closest('[role="listitem"]') as HTMLElement | null;
        }
      } else {
        item = roleTarget.closest('[role="listitem"]') as HTMLElement | null;
      }
    }

    // If still not found, fallback to closest listitem
    if (!item) {
      item = target.closest('[role="listitem"]') as HTMLElement | null;
    }

    if (!item) return;

    // Find heading in the question container
    const heading = item.querySelector('[role="heading"], .HoXoMd .M7eMe, .M7eMe');
    return getNodeText(heading as Element) || undefined;
  };

  const getXPath = (element: Element | null): string => {
    if (!element || element.tagName === "BODY") return "/html/body";

    const paths: string[] = [];
    let currentElement: Element | null = element;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling: any = currentElement.previousSibling;

      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === currentElement.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      const tagName = currentElement.tagName.toLowerCase();
      if (tagName !== 'svg') {
        paths.unshift(index > 0 ? `${tagName}[${index + 1}]` : tagName);
      }
      currentElement = currentElement.parentElement;
    }

    return `/${paths.join("/")}`;
  };

  const logEvent = (data: LogEventData): void => {
    //console.log('logEvent data', data)
    chrome.runtime.sendMessage({ type: "logEvent", data });
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement;
    if (!target) return;

    if (event.key === 'Enter') {
      const focusedEl = getFocusedElement(target);
      let bundle;
      if (focusedEl) bundle = recordElement(focusedEl);

      let value = '';
      let xpathTarget: HTMLElement = target;

      // Handle contenteditable
      const contentEditable = target.closest('[contenteditable="true"]') as HTMLElement | null;
      if (contentEditable) {
        xpathTarget = contentEditable;
        value = contentEditable.innerText || contentEditable.textContent || '';
      }
      // Input/textarea
      else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        xpathTarget = target;
        value = target.value;
      }
      // Select element
      else if (target instanceof HTMLSelectElement) {
        xpathTarget = target;
        value = target.selectedOptions[0]?.textContent?.trim() || target.value;
      }
      // Fallback
      else {
        xpathTarget = target;
        value = (target.textContent || '').trim();
      }

      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      // FIX 5: Enter key always gets "submit" label
      logEvent({
        eventType: 'Enter',
        xpath: getXPath(xpathTarget),
        bundle,
        value,
        label: generateSequentialLabel('submit'),
        page: window.location.href,
        x,
        y,
      });
    }
  };


  const handleClick = (event: Event) => {
    //const target = event.target as HTMLElement;
    const path = event.composedPath() as EventTarget[];
    const target = path.find(el => el instanceof HTMLElement) as HTMLElement;
    //console.log('handleClick target', target)
    if (!target) return;

    //console.log('handleClick target', target)
    const mouseEvent = event as MouseEvent;
    const x = mouseEvent.clientX;
    const y = mouseEvent.clientY;
    let eventType = 'click';

    // Special case for Google Autocomplete dropdown
    const pacItem = target.closest(".pac-item") as HTMLElement | null;
    if (pacItem) {
      const value = pacItem.textContent?.trim();
      //console.log("Google Autocomplete Selected:", value);

      const focusedEl = getFocusedElement(target);
      let bundle;
      if (focusedEl) {
        bundle = recordElement(focusedEl);
        //console.log("Focused element bundle:", bundle);
      }

      logEvent({
        eventType: eventType,
        xpath: getXPath(pacItem),
        bundle: bundle,
        label: "google-autocomplete",
        value,
        page: window.location.href,
        x,
        y,
      });
      return; // stop further checks
    }

    // Skip synthetic (JS-generated) clicks
    if (!(event as MouseEvent).isTrusted) {
      return;
    }

    const style = getComputedStyle(target);
    // --- Check if element is clickable (cursor:pointer or semantic clickable) ---
    const isClickable =
      target instanceof HTMLButtonElement ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLAnchorElement ||
      target.hasAttribute("role") ||
      style.cursor === "pointer" ||
      target.onclick !== null;

    if (!isClickable) {
      return; // skip non-clickable elements
    }

    setTimeout(() => {
      let value: string | undefined;
      let labelEl: HTMLElement | HTMLSelectElement | null = null;

      // --- CASE 1: radio/checkbox with role or aria-label ---
      const roleTarget = target.closest('[role="radio"], [role="checkbox"]') as HTMLElement | null;
      if (roleTarget) {
        labelEl = roleTarget.querySelector('.aDTYNe') as HTMLElement | null;
        value = roleTarget.getAttribute("aria-label") || labelEl?.textContent?.trim() || roleTarget.textContent?.trim();
      }
      else {
        // --- CASE 2: select2 or real select ---
        const originalSelect = getOriginalSelect(target);
        if (originalSelect instanceof HTMLSelectElement) {
          let selectedOption: HTMLOptionElement | null = null;

          // 1. Try selectedOptions first
          if (originalSelect.selectedOptions.length > 0) {
            selectedOption = originalSelect.selectedOptions[0];
          }

          // 2. Fallback: check <option> with matching value
          if (!selectedOption && originalSelect.value) {
            selectedOption = Array.from(originalSelect.options).find(opt => opt.value === originalSelect.value) || null;
          }

          // 3. If still not found (optional), fallback to placeholder / first option / label
          value = selectedOption?.textContent?.trim()
            || originalSelect.getAttribute("placeholder")
            || originalSelect.options[0]?.textContent?.trim()
            || getLabelForTarget(originalSelect);

          labelEl = originalSelect;
        }
        // --- CASE 3: input with selecte2 ---
        else if (target.closest('[role="listbox"]') && target.getAttribute('data-select2-id') != null) {
          const data_select2_id = target.getAttribute('data-select2-id');
          //console.log('data_select2_id', data_select2_id);
          const data_select2_text = target.textContent?.trim();
          const select2_target = document.querySelector(`[role="combobox"][aria-activedescendant="${data_select2_id}"]`);
          //console.log('select2_target', select2_target);
          if (select2_target) {
            const select2_target_elem = select2_target.closest('[data-select2-id]')?.parentElement?.querySelector('select[data-select2-id]') as HTMLSelectElement
            //console.log('select2_target_elem', select2_target_elem);
            if (select2_target_elem) {
              eventType = 'input';
              // value = select2_target_elem.value;
              const selectedText = select2_target_elem?.selectedOptions[0]?.textContent?.trim();
              value = data_select2_text ?? selectedText;
              labelEl = select2_target_elem ?? target;
            }
          }
        }
        // --- CASE 4: input or textarea ---
        else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          value = target.value;
          labelEl = target;
        }
        // --- CASE 4: fallback text from nearby element ---
        else {
          value = target.textContent?.trim();
          labelEl = target;
        }
      }
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      // Use label element (or target) for XPath
      const xpathTarget = labelEl || target;
      const xpath = getXPath(xpathTarget);
      const label = generateUniqueLabel(getLabelForTarget(target));

      // Usage: pass exactly the focused element to recordElement
      const focusedEl = getFocusedElement(target);
      let bundle;
      if (focusedEl) {
        bundle = recordElement(focusedEl);
        //console.log("Focused element bundle:", bundle);
      }
      //console.log("bundle >>>>", bundle)
      logEvent({
        eventType: eventType,
        xpath: xpath,
        bundle: bundle,
        label: label,
        value,
        page: window.location.href,
        x,
        y,
      });
    }, 30);
  };

  const handleInput = async (event: Event): Promise<void> => {
    const target = event.target as HTMLElement;
    if (!target) return;

    if (target.tagName.toLowerCase() === 'gmp-place-autocomplete') {
      //injectScript("interceptor");
      return;
    }

    let value = '';
    let xpathTarget: HTMLElement = target;
    let coordinates: { x: number; y: number } | undefined;

    // === STANDARD INPUT/TEXTAREA (DOM Recording) ===
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      xpathTarget = target;

      if (target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')) {
        value = target.checked.toString();
      } else {
        value = target.value;
      }

      if (value) {
        const focusedEl = getFocusedElement(target);
        let bundle;
        if (focusedEl) bundle = recordElement(focusedEl);

        logEvent({
          eventType: 'input',
          xpath: getXPath(xpathTarget),
          bundle,
          value,
          label: generateUniqueLabel(getLabelForTarget(target)),
          page: window.location.href,
        });
      }
      return;
    }

    // === SELECT ELEMENT ===
    if (target instanceof HTMLSelectElement) {
      xpathTarget = target;
      value = target.selectedOptions[0]?.textContent?.trim() || target.value;

      if (value) {
        const focusedEl = getFocusedElement(target);
        let bundle;
        if (focusedEl) bundle = recordElement(focusedEl);

        logEvent({
          eventType: 'input',
          xpath: getXPath(xpathTarget),
          bundle,
          value,
          label: generateUniqueLabel(getLabelForTarget(target)),
          page: window.location.href,
        });
      }
      return;
    }

    // === COMPLEX EDITOR (Vision Recording) ===
    if (isComplexEditor(target)) {
      // Debounce Vision recording (wait for user to stop typing)
      if (visionRecordingDebounce) {
        clearTimeout(visionRecordingDebounce);
      }
      
      visionRecordingDebounce = setTimeout(async () => {
        console.log('[TestFlow] Complex editor detected, attempting Vision recording...');
        
        const visionResult = await captureVisionInput(target);
        
        if (visionResult && visionResult.text && visionResult.text !== lastVisionRecordedText) {
          lastVisionRecordedText = visionResult.text;
          
          const bounds = visionResult.bounds;
          const xpath = getXPath(target);
          const bundle = recordElement(target);
          
          // Add coordinates for Vision playback
          coordinates = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2
          };
          
          logEvent({
            eventType: 'input',
            xpath: xpath,
            value: visionResult.text,
            label: generateSequentialLabel('prompt_input'),
            page: window.location.href,
            bundle: {
              ...bundle,
              coordinates: coordinates,
              visionCapture: true
            },
            x: coordinates.x,
            y: coordinates.y
          });
          
          console.log('[TestFlow Vision] Recorded:', visionResult.text.substring(0, 100) + '...');
        }
      }, 1500); // Wait 1.5s after typing stops
      
      return;
    }

    // === CONTENTEDITABLE (Try both) ===
    const contentEditable = target.closest('[contenteditable="true"]') as HTMLElement | null;
    if (contentEditable) {
      xpathTarget = contentEditable;
      value = contentEditable.innerText?.trim() || '';
      
      if (value) {
        const focusedEl = getFocusedElement(target);
        let bundle;
        if (focusedEl) bundle = recordElement(focusedEl);

        logEvent({
          eventType: 'input',
          xpath: getXPath(xpathTarget),
          bundle,
          value,
          label: generateSequentialLabel(getLabelForTarget(target) || 'editor_input'),
          page: window.location.href,
        });
      }
      return;
    }

    // === FALLBACK ===
    value = (target.textContent || '').trim();
    if (value) {
      const focusedEl = getFocusedElement(target);
      let bundle;
      if (focusedEl) bundle = recordElement(focusedEl);

      logEvent({
        eventType: 'input',
        xpath: getXPath(target),
        bundle,
        value,
        label: generateUniqueLabel(getLabelForTarget(target)),
        page: window.location.href,
      });
    }
  };

  // ---------------------- Runtime Message Handler ----------------------
  const handleRuntimeMessage = async (
    message: RunStepMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<boolean> => {
    // B-43: Page ready check
    if (message.type === 'checkPageReady') {
      const isReady = document.readyState === 'complete' && !document.querySelector('.loading, .spinner, [aria-busy="true"]');
      sendResponse({ ready: isReady });
      return true;
    }
    
    // B-47: Conditional click polling loop
    if (message.type === 'CONDITIONAL_CLICK_START') {
      const config = message.config || {
        searchTerms: ['Allow', 'Keep', 'Continue'],
        timeoutSeconds: 300,
        pollIntervalMs: 500
      };
      
      console.log('[TestFlow] 🔍 Conditional click starting');
      console.log('[TestFlow] Search terms:', config.searchTerms.join(', '));
      console.log('[TestFlow] Timeout:', config.timeoutSeconds, 's');
      console.log('[TestFlow] Poll interval:', config.pollIntervalMs, 'ms');
      
      let lastClickTime = Date.now();
      let buttonsClicked = 0;
      let pollCount = 0;
      let isComplete = false;
      
      const runPoll = async (): Promise<void> => {
        if (isComplete) return;
        
        pollCount++;
        const secondsSinceLastClick = (Date.now() - lastClickTime) / 1000;
        
        // Check timeout
        if (secondsSinceLastClick >= config.timeoutSeconds) {
          isComplete = true;
          console.log('[TestFlow] ⏱️ Timeout reached after', config.timeoutSeconds, 's');
          console.log('[TestFlow] 📊 Final:', buttonsClicked, 'buttons clicked in', pollCount, 'polls');
          sendResponse({ buttonsClicked, timedOut: true, pollCount });
          return;
        }
        
        // Search for matching buttons/links in DOM
        const clickables = document.querySelectorAll(
          'button, [role="button"], a, input[type="submit"], input[type="button"], [class*="btn"], [class*="button"]'
        );
        
        let foundAndClicked = false;
        
        for (const element of clickables) {
          const el = element as HTMLElement;
          // Skip hidden/disabled elements
          if (el.offsetParent === null || el.hasAttribute('disabled')) continue;
          
          const text = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase().trim();
          
          for (const term of config.searchTerms) {
            if (text.includes(term.toLowerCase())) {
              console.log('[TestFlow] 🎯 Found "' + term + '" in: "' + text.substring(0, 40) + '"');
              
              // Click the element
              try {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(r => setTimeout(r, 100));
                
                el.focus();
                el.click();
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                
                buttonsClicked++;
                lastClickTime = Date.now(); // RESET TIMER ON CLICK
                foundAndClicked = true;
                
                console.log('[TestFlow] ✅ Clicked! Total:', buttonsClicked);
              } catch (clickError) {
                console.error('[TestFlow] Click error:', clickError);
              }
              break;
            }
          }
          if (foundAndClicked) break;
        }
        
        if (!foundAndClicked) {
          const remaining = Math.round(config.timeoutSeconds - secondsSinceLastClick);
          if (pollCount % 20 === 0) { // Log every 20th poll (every 10s at 500ms interval)
            console.log('[TestFlow] 👀 Poll #' + pollCount + ': No buttons. Timeout in ' + remaining + 's');
          }
        }
        
        // Schedule next poll
        if (!isComplete) {
          setTimeout(runPoll, config.pollIntervalMs);
        }
      };
      
      // Start the polling loop
      runPoll();
      
      // Return true to keep the message channel open for async response
      return true;
    }
    
    if (message.type !== 'runStep') return false;
    try {
      const { event, bundle, value, label } = message.data;
      updateNotification({ label: label || event, value, status: "loading" });
      await new Promise(res => setTimeout(res, 500 + Math.random() * 500));

      const action: Action = { type: event.toLowerCase() as Action['type'], value };
      const success = await playAction(bundle, action);

      updateNotification({ label: label || event, value, status: success ? "success" : "error" });
      sendResponse(success);
      return true;
    } catch (error: any) {
      updateNotification({ label: "Error", value: String(error), status: "error" });
      sendResponse(false);
      return true;
    }
  };
  const initContentScript = (): void => {
    // FIX 2: Reset label counters for fresh sequential numbering
    resetLabelCounters();
    
    // B-40: Reset Vision recording state
    lastVisionRecordedText = '';
    keyboardBuffer = '';
    if (visionRecordingDebounce) clearTimeout(visionRecordingDebounce);
    if (keyboardDebounce) clearTimeout(keyboardDebounce);
    
    console.log('[TestFlow] Content script initialized, Vision recording enabled');
    
    logOpenPageEvent();

    // main doc
    attachListeners(document);
    injectScript("interceptor");
    // iframes
    attachToAllIframes(window);

    // Set up message listener
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  };

  window.addEventListener("load", () => {
    chrome.runtime.sendMessage({ type: "pageLoaded" });
  });


  // Attach listeners into a document (main or iframe)
  // ---------------------- Attach listeners to a document (main or iframe) ----------------------
  function attachListeners(doc: Document) {
    ["mousedown"].forEach(eventType => {
      // Capture phase ensures we see the event before inner handlers can stop it
      doc.addEventListener(eventType, handleClick, true);
    });

    doc.addEventListener("input", handleInput, true);
    doc.addEventListener("keydown", handleKeyDown, true);
    // B-40: Add keyboard listener for complex editors
    doc.addEventListener("keydown", handleKeydownForComplexEditor, true);
  }

  // ---------------------- Remove listeners ----------------------
  function removeListeners(doc: Document) {
    // doc.removeEventListener("click", handleClick, true);
    doc.removeEventListener("mousedown", handleClick, true);
    doc.removeEventListener("input", handleInput, true);
    doc.removeEventListener("keydown", handleKeyDown, true);
    // B-40: Remove complex editor keyboard listener
    doc.removeEventListener("keydown", handleKeydownForComplexEditor, true);
  }

  function injectScript(fileName: string) {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL(`js/${fileName}.js`);
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  }


  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || !data.type) return;

    switch (data.type) {
      case "AUTOCOMPLETE_INPUT":
        //console.log("User typed in Google autocomplete:", data.value);
        // eslint-disable-next-line no-case-declarations
        const value = data.value;
        // eslint-disable-next-line no-case-declarations
        const inputEl = document.activeElement as HTMLElement;
        if (inputEl) {
          const focusedEl = getFocusedElement(inputEl);
          let bundle;
          if (focusedEl) bundle = recordElement(focusedEl);
          if (bundle) {
            bundle.xpath = data.xpath;
          }
          if (focusedEl) {
            logEvent({
              eventType: 'input',
              xpath: data.xpath,
              bundle,
              value,
              label: data.label,
              page: window.location.href,
            });
          }
        }
        break;

      case "AUTOCOMPLETE_SELECTION":
        //console.log("User selected autocomplete item:", data.text);
        // eslint-disable-next-line no-case-declarations
        const selectedEl = document.activeElement as HTMLElement;
        if (selectedEl) {
          const focusedEl = getFocusedElement(selectedEl);
          let bundle;
          if (focusedEl) bundle = recordElement(focusedEl);
          if (bundle) {
            bundle.xpath = data.xpath;
          }
          if (focusedEl) {
            logEvent({
              eventType: 'click',
              xpath: data.xpath,
              bundle,
              value: data.text,
              label: generateUniqueLabel(getLabelForTarget(focusedEl)),
              page: window.location.href,
            });
          }
        }
        break;
    }
  });

  const logOpenPageEvent = () => {
    if (window.top === window.self) {
      logEvent({
        eventType: "open",
        xpath: window.location.href,
        page: window.location.href,
        label: "open page",
      });
    }
  };

  const attachToAllIframes = (win: Window) => {
    try {
      const iframes = win.document.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        try {
          if (iframe.contentDocument) {
            attachListeners(iframe.contentDocument);
            // nested iframes
            attachToAllIframes(iframe.contentWindow!);
          }
        } catch (err) {
          //console.warn("Cannot attach to iframe:", iframe.src, err);
        }
      });
    } catch (err) {
      //console.warn("Cannot access window:", err);
    }
  };

  // ============ Notification Manager ============
  const ensureNotificationBox = () => {
    // const topDoc = window.top?.document;
    // if (!topDoc) return null;
    let box = document.getElementById("ext-test-notification");
    if (!box) {
      box = document.createElement("div");
      box.id = "ext-test-notification";
      box.style.position = "fixed";
      //box.style.bottom = "20px";
      box.style.top = "62px";
      box.style.right = "20px";
      box.style.width = "280px";
      box.style.padding = "12px";
      box.style.borderRadius = "10px";
      box.style.background = "rgba(0,0,0,0.85)";
      box.style.color = "#fff";
      box.style.fontSize = "14px";
      box.style.fontFamily = "sans-serif";
      box.style.zIndex = "999999";
      box.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
      box.style.transition = "all 0.3s ease";
      if (window.self !== window.top) return false;
      document.body.appendChild(box);
    }
    return box;
  };

  function updateNotification({
    label,
    value,
    status
  }: {
    label: string;
    value?: string;
    status: "loading" | "success" | "error";
  }) {
    const box = ensureNotificationBox();
    if (!box) return;
    let statusText = "";
    let statusColor = "";

    switch (status) {
      case "loading":
        statusText = "⏳ Processing...";
        statusColor = "#3b82f6";
        break;
      case "success":
        statusText = "✅ Success";
        statusColor = "#16a34a";
        break;
      case "error":
        statusText = "❌ Failed";
        statusColor = "#dc2626";
        break;
    }
    box.style.background = `6px solid ${statusColor}`;
    box.innerHTML = `
    <div style="font-weight:600; margin-bottom:4px;">${label}</div>
    <div style="opacity:0.8; margin-bottom:6px;">${value ?? ""}</div>
    <div style="color:${statusColor}; font-weight:500;">${statusText}</div>
  `;
  }

  function getFocusedElement(target?: HTMLElement | null): HTMLElement | null {
    let activeEl = target ?? document.activeElement as HTMLElement | null;

    // If focus is inside an iframe, traverse into iframe(s)
    while (activeEl && activeEl.tagName === 'IFRAME') {
      try {
        const iframeDoc = (activeEl as HTMLIFrameElement).contentDocument;
        if (!iframeDoc) break;
        activeEl = iframeDoc.activeElement as HTMLElement | null;
      } catch (e) {
        // Cross-origin iframe: cannot access, stop
        break;
      }
    }

    return activeEl;
  }


  // ---------------------- Recording Logic ----------------------

  function recordElement(el: HTMLElement): Bundle {
    let targetEl: HTMLElement = el;

    // Check for Select2
    const originalSelect = getOriginalSelect(el);
    if (originalSelect) {
      targetEl = originalSelect;
    }

    // Check for radio/checkbox
    const roleTarget = targetEl.closest('[role="radio"], [role="checkbox"]') as HTMLElement | null;
    if (roleTarget) targetEl = roleTarget;

    const iframeChain = serializeIframeChain(getIframeChain(targetEl));

    const xpath = getXPath(targetEl);
    //console.log("targetEl.id >>>", targetEl.id);
    return {
      id: targetEl.id || undefined,
      name: targetEl.getAttribute('name') || undefined,
      className: targetEl.className || undefined,
      dataAttrs: Object.fromEntries(
        Array.from(targetEl.attributes)
          .filter(attr => attr.name.startsWith('data-'))
          .map(attr => [attr.name, attr.value])
      ),
      aria: targetEl.getAttribute('aria-labelledby') || targetEl.getAttribute('aria-label') || undefined,
      placeholder: targetEl.getAttribute('placeholder') || undefined,
      tag: targetEl.tagName.toLowerCase(),
      visibleText: (targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement || targetEl instanceof HTMLSelectElement)
        ? (targetEl as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value
        : targetEl.innerText || undefined,
      xpath,
      bounding: targetEl.getBoundingClientRect ? {
        left: targetEl.getBoundingClientRect().left,
        top: targetEl.getBoundingClientRect().top,
        width: targetEl.getBoundingClientRect().width,
        height: targetEl.getBoundingClientRect().height
      } : undefined,
      iframeChain,
    };
  }
  // ---------------------- Helper Functions ----------------------
  function visible(el: HTMLElement | null): boolean {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function textSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    a = a.trim().toLowerCase();
    b = b.trim().toLowerCase();
    if (a === b) return 1;
    const setA = new Set(a.split(/\s+/));
    const setB = new Set(b.split(/\s+/));
    const common = Array.from(setA).filter(x => setB.has(x)).length;
    return common / Math.max(setA.size, setB.size);
  }

  // ---------------------- Iframe Handling ----------------------
  function getIframeChain(el: HTMLElement): HTMLIFrameElement[] {
    const chain: HTMLIFrameElement[] = [];
    let current: Node | null = el;

    while (current && current.ownerDocument !== document) {
      const frame = current.ownerDocument?.defaultView?.frameElement as HTMLIFrameElement | null;
      if (frame) chain.unshift(frame); // outermost first
      current = frame?.parentElement || null;
    }

    return chain;
  }

  function serializeIframeChain(chain: HTMLIFrameElement[]): IframeInfo[] {
    return chain.map(f => ({
      id: f.id || undefined,
      name: f.getAttribute('name') || undefined,
      index: Array.from(f.parentElement?.querySelectorAll('iframe') || []).indexOf(f),
    }));
  }

  function getDocumentFromIframeChain(chain: IframeInfo[] = []): Document | null {
    let doc: Document = document;
    for (const info of chain) {
      let iframe: HTMLIFrameElement | null = null;

      if (info.id) iframe = doc.getElementById(info.id) as HTMLIFrameElement;
      if (!iframe && info.name) iframe = doc.querySelector(`iframe[name="${info.name}"]`);
      if (!iframe && typeof info.index === 'number') {
        const iframes = Array.from(doc.getElementsByTagName('iframe'));
        iframe = iframes[info.index] || null;
      }

      if (!iframe || !iframe.contentDocument) return null;
      doc = iframe.contentDocument;
    }
    return doc;
  }

  // ---------------------- Find Element ----------------------
  async function findElementFromBundle(bundle: Bundle, opts: { timeout?: number } = { timeout: 2000 }): Promise<HTMLElement | null> {
    // const doc = getDocumentFromIframeChain(bundle.iframeChain || []) || document;
    // const start = Date.now();
    let doc: Document | ShadowRoot = getDocumentFromIframeChain(bundle.iframeChain || []) || document;
    const start = Date.now();

    // --- Handle Shadow Hosts Chain (for open roots) ---
    if (bundle.shadowHosts && bundle.shadowHosts.length > 0) {
      for (const hostXPath of bundle.shadowHosts) {
        const hostEl = document.evaluate(
          hostXPath,
          doc,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue as HTMLElement | null;

        if (!hostEl) continue;

        // Try open shadow roots
        if (hostEl.shadowRoot) {
          doc = hostEl.shadowRoot;
        } else {
          console.warn("Closed shadow root host encountered:", hostEl);
          // If it's closed, we can't go deeper
          doc = document; // stay at document level
        }
      }
    }

    const candidates: { el: HTMLElement; score: number }[] = [];
    const el: HTMLElement | null = null;
    // --- Helper: safely escape CSS ID selectors
    const escapeId = (id: string) => CSS.escape ? CSS.escape(id) : id.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");

    //console.log("bundle.xpath >>>", bundle.xpath);
    if (bundle.xpath) {
      try {
        const resolveXPathInShadow = (hostOrRoot: HTMLElement | Document | ShadowRoot, path: string): HTMLElement | null => {
          let node: any;

          // Start with shadow root if host has __realShadowRoot
          if (hostOrRoot instanceof HTMLElement && (hostOrRoot as any).__realShadowRoot) {
            node = (hostOrRoot as any).__realShadowRoot;
          } else {
            node = hostOrRoot;
          }
          const parts = path.split("/").filter(Boolean);

          for (const part of parts) {
            const match = part.match(/^([a-z0-9-]+)(?:\[(\d+)\])?$/i);
            if (!match) continue;
            const [, tag, index] = match;

            const elements = Array.from(node.children || []).filter(
              (el: any) => el.tagName?.toLowerCase() === tag.toLowerCase()
            );

            node = elements[index ? parseInt(index) - 1 : 0] || null;

            // Dive into open shadow roots automatically
            if (node?.shadowRoot) node = node.shadowRoot;
            if (!node) break;
          }

          // Check for closest div with contenteditable="true"
          if (node instanceof HTMLElement) {
            // 1. Try to find closest parent with contenteditable
            let editableDiv = node.closest('div[contenteditable="true"]');

            // 2. If not found, check in siblings (within parent)
            if (!editableDiv && node.parentElement) {
              editableDiv = node.parentElement.querySelector('div[contenteditable="true"]');
            }

            // 3. (optional) check few levels up if nested inside multiple divs
            if (!editableDiv && node.parentElement?.parentElement) {
              editableDiv = node.parentElement.parentElement.querySelector('div[contenteditable="true"]');
            }

            if (editableDiv) return editableDiv instanceof HTMLElement ? editableDiv : null;

          }
          return node instanceof HTMLElement ? node : null;
        };
        let xpathToUse = bundle.xpath;
        // ✅ If exactly matches this xpath, use /html/body/div[4] instead
        if (bundle.xpath === "/html/body/div[3]/div/div[2]/div[3]/div[2]/span/span") {
          xpathToUse = "/html/body/div[4]/div/div[2]/div[3]/div[2]/span/span";
        }

        // Use doc as starting point (could be document or shadow root)
        const el = resolveXPathInShadow(doc as any, xpathToUse);
        //console.log("resolveXPathInShadow >>> el", el);
        if (el && visible(el)) return el;
      } catch (err) {
        console.warn("Invalid XPath or Shadow DOM traversal failed:", bundle.xpath, err);
      }
    }


    // 1) ID + other attributes
    if (bundle.id) {
      //const els = Array.from(doc.querySelectorAll<HTMLElement>(`#${bundle.id}`));
      let els: HTMLElement[] = [];
      try {
        els = Array.from(doc.querySelectorAll<HTMLElement>(`#${escapeId(bundle.id)}`));
      } catch (err) {
        console.warn("Invalid ID selector:", bundle.id, err);
      }
      for (const el of els) {
        if (!visible(el)) continue;
        let score = 0;
        if (bundle.name && el.getAttribute('name') === bundle.name) score += 1;
        if (bundle.className && el.classList.contains(bundle.className)) score += 1;
        if (bundle.aria && el.getAttribute('aria-labelledby') === bundle.aria) score += 1;
        if (bundle.dataAttrs) {
          const matchingDataAttrs = Object.entries(bundle.dataAttrs).filter(([k, v]) => el.getAttribute(k) === v);
          if (matchingDataAttrs.length > 0) score += 1;
        }
        if (bundle.bounding) {
          const r = el.getBoundingClientRect();
          const dx = r.left - bundle.bounding.left;
          const dy = r.top - bundle.bounding.top;
          if (Math.hypot(dx, dy) < 5) score += 1;
        }
        if (score >= 2) return el;
        candidates.push({ el, score });
      }
    }

    // --- Handle closed shadow roots gracefully ---
    if ((!el || !visible(el)) && bundle.isClosedShadow && bundle.shadowHosts?.length) {
      const lastHostXPath = bundle.shadowHosts[bundle.shadowHosts.length - 1];
      const hostEl = document.evaluate(
        lastHostXPath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue as HTMLElement | null;

      if (hostEl) {
        //console.log("Simulating interaction with closed shadow root host:", hostEl);

        // Simulate realistic user actions
        hostEl.focus();
        hostEl.click();

        // Optional: simulate typing (if value was recorded)
        if (bundle.visibleText) {
          hostEl.dispatchEvent(new InputEvent("input", { bubbles: true, data: bundle.visibleText }));
        }

        return hostEl;
      }
    }

    // 2) Name / aria / placeholder
    if (bundle.name) {
      let els: NodeListOf<HTMLElement> = [] as any;

      if (doc instanceof Document) {
        els = doc.getElementsByName(bundle.name) as unknown as NodeListOf<HTMLElement>;
      } else if (doc instanceof ShadowRoot) {
        // ShadowRoot me getElementsByName nahi hota
        // fallback: querySelectorAll with [name="..."]
        els = doc.querySelectorAll(`[name="${bundle.name}"]`);
      }

      for (const e of els) {
        if (visible(e)) return e;
      }
    }
    if (bundle.aria) {
      const el = safeQuerySelector(doc, `[aria-labelledby="${bundle.aria}"]`) as HTMLElement | null;
      if (el && visible(el)) return el;
    }
    if (bundle.placeholder) {
      const el = safeQuerySelector(doc, `[placeholder="${bundle.placeholder}"]`) as HTMLElement | null;
      if (el && visible(el)) return el;
    }

    // 3) Fuzzy: tag + visible text
    let all: HTMLElement[] = [];

    if (doc instanceof Document) {
      all = Array.from(doc.getElementsByTagName(bundle.tag || '*')) as HTMLElement[];
    } else if (doc instanceof ShadowRoot) {
      // ShadowRoot me getElementsByTagName nahi hota, use querySelectorAll
      all = Array.from(doc.querySelectorAll(bundle.tag || '*')) as HTMLElement[];
    }

    for (const e of all) {
      if (!visible(e)) continue;
      const text = e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement ? e.value : e.innerText || '';
      const sim = textSimilarity(text, bundle.visibleText || '');
      if (sim > 0.4) candidates.push({ el: e, score: sim });
    }

    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length && candidates[0].score > 0.5) return candidates[0].el;

    // 4) Bounding rect fallback
    if (bundle.bounding) {
      const bb = bundle.bounding;
      let best: HTMLElement | null = null;
      let bestDist = Infinity;
      const vis = Array.from(doc.querySelectorAll<HTMLElement>('*')).filter(visible);
      vis.forEach(e => {
        const r = e.getBoundingClientRect();
        const dx = r.left - bb.left;
        const dy = r.top - bb.top;
        const d = Math.hypot(dx, dy);
        if (d < bestDist) { bestDist = d; best = e; }
      });
      if (best && bestDist < 200) return best;
    }

    // B-46: Fallback for terminal/monaco - use coordinates or known selectors
    if (candidates.length === 0 || (candidates[0] && candidates[0].score < 0.5)) {
      // Check if this looks like a terminal interaction
      const isTerminal = bundle.xpath?.includes('xterm') ||
                         bundle.tag?.includes('xterm') ||
                         (bundle.visibleText && bundle.visibleText.length < 200);
      const isMonaco = bundle.xpath?.includes('monaco') ||
                       bundle.tag?.includes('monaco');
      
      if (isTerminal) {
        console.log('[TestFlow] Terminal fallback - finding terminal textarea');
        let element = doc.querySelector('.xterm-helper-textarea') as HTMLElement;
        if (!element) {
          element = doc.querySelector('.xterm textarea') as HTMLElement;
        }
        if (!element) {
          element = doc.querySelector('[class*="xterm"] textarea') as HTMLElement;
        }
        if (element && visible(element)) return element;
      }
      
      if (isMonaco) {
        console.log('[TestFlow] Monaco fallback - finding editor textarea');
        let element = doc.querySelector('.monaco-editor textarea') as HTMLElement;
        if (!element) {
          element = doc.querySelector('.inputarea') as HTMLElement;
        }
        if (element && visible(element)) return element;
      }
      
      // Last resort: use coordinates
      if (bundle.coordinates && doc instanceof Document) {
        console.log('[TestFlow] Using coordinate fallback:', bundle.coordinates);
        const element = doc.elementFromPoint(bundle.coordinates.x, bundle.coordinates.y) as HTMLElement;
        if (element && visible(element)) return element;
      }
    }

    // 5) Data attributes exact match
    if (bundle.dataAttrs) {
      for (const k in bundle.dataAttrs) {
        const v = bundle.dataAttrs[k];
        if (!v) continue;
        const el = safeQuerySelector(doc, `[${k}="${v}"]`) as HTMLElement | null;
        if (el && visible(el)) return el;
      }
    }

    // 6) Retry for dynamic pages
    if (Date.now() - start < (opts.timeout || 0)) {
      await new Promise(res => setTimeout(res, 150));
      return findElementFromBundle(bundle, { timeout: 0 });
    }

    return null;
  }
  function temporarilyShow(el: HTMLElement): () => void {
    const hidden: HTMLElement[] = [];
    let node: HTMLElement | null = el;
    while (node) {
      const style = window.getComputedStyle(node);
      if (style.display === "none") {
        node.style.display = "block";
        hidden.push(node);
      }
      node = node.parentElement;
    }
    return () => hidden.forEach(n => (n.style.display = "none"));
  }

  // ============================================
  // FIX 1: Navigation Blocker for Playback
  // Prevents Google overlays from opening unwanted tabs
  // ============================================
  let navigationBlockerInstalled = false;

  function installNavigationBlocker(): void {
    if (navigationBlockerInstalled) return;
    navigationBlockerInstalled = true;
    
    const blockedPatterns = [
      'drive.google.com',
      'youtube.com',
      'google.com/?authuser',
      'accounts.google.com',
      'myaccount.google.com',      // FIX: Block account settings popups
      'docs.google.com/picker',
      'plus.google.com',
      'google.com/intl',           // FIX: Block language redirects
      'support.google.com'         // FIX: Block help popups
    ];
    
    // Block window.open calls
    const originalOpen = window.open;
    window.open = function(url?: string | URL, target?: string, features?: string): Window | null {
      const urlStr = String(url || '');
      if (blockedPatterns.some(pattern => urlStr.includes(pattern))) {
        console.log('[TestFlow Playback] Blocked window.open:', urlStr);
        return null;
      }
      return originalOpen.call(window, url, target, features);
    };
    
    // Block link clicks that open new tabs
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      
      if (anchor && anchor.target === '_blank') {
        const href = anchor.href || '';
        if (blockedPatterns.some(pattern => href.includes(pattern))) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          console.log('[TestFlow Playback] Blocked link click:', href);
          return false;
        }
      }
    }, true); // Capture phase
    
    console.log('[TestFlow] Navigation blocker installed for playback');
  }

  // ============================================
  // B-41: Vision Playback Functions
  // ============================================
  
  // B-41: Removed unused simulateTyping, now using simulateTypingForComplexEditor in playAction

  // ---------------------- Play Action ----------------------
  async function playAction(bundle: Bundle, action: Action): Promise<boolean> {
    // FIX 1: Install navigation blocker on first playback step
    installNavigationBlocker();
    const bundleTag = bundle.tag ?? "";
    const actionType = action.type ?? "";

    // B-43: Complex editor typing simulation
    // B-48: Comprehensive typing function with xterm support
    const simulateTypingForComplexEditor = async (text: string, targetElement: HTMLElement): Promise<boolean> => {
      console.log('[TestFlow Vision] Attempting complex editor typing:', text.substring(0, 30), 'length:', text.length);
      
      // ========================================
      // STRATEGY 0: xterm Terminal (MUST BE FIRST)
      // ========================================
      const xtermTextarea = document.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
      const isXterm = xtermTextarea || targetElement.closest('.xterm') || targetElement.closest('[class*="xterm"]');
      
      if (isXterm) {
        console.log('[TestFlow Vision] Strategy 0: xterm character-by-character');
        const target = xtermTextarea || targetElement;
        
        try {
          target.focus();
          await new Promise(r => setTimeout(r, 50));
          
          for (const char of text) {
            const keyCode = char.charCodeAt(0);
            const code = char === ' ' ? 'Space' : char === '\n' ? 'Enter' : `Key${char.toUpperCase()}`;
            
            // B-52: Only dispatch keydown - xterm listens to this
            // Sending keypress/input causes double characters
            target.dispatchEvent(new KeyboardEvent('keydown', {
              key: char,
              code: code,
              keyCode: keyCode,
              which: keyCode,
              bubbles: true,
              cancelable: true
            }));
            
            await new Promise(r => setTimeout(r, 30)); // Slightly longer delay
          }
          
          console.log('[TestFlow Vision] xterm typing complete');
          return true;
        } catch (e) {
          console.warn('[TestFlow Vision] xterm strategy failed:', e);
        }
      }
      
      // ========================================
      // STRATEGY 1: execCommand (contenteditable)
      // ========================================
      try {
        targetElement.focus();
        await new Promise(r => setTimeout(r, 100));
        
        if (document.queryCommandSupported?.('insertText')) {
          const success = document.execCommand('insertText', false, text);
          if (success) {
            console.log('[TestFlow Vision] Strategy 1: execCommand succeeded');
            return true;
          }
        }
      } catch (e) {
        console.warn('[TestFlow Vision] Strategy 1 (execCommand) failed:', e);
      }
      
      // ========================================
      // STRATEGY 2: Clipboard paste (Monaco, etc.)
      // ========================================
      try {
        targetElement.focus();
        await new Promise(r => setTimeout(r, 100));
        
        await navigator.clipboard.writeText(text);
        
        // Simulate Ctrl+V
        targetElement.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'v',
          code: 'KeyV',
          keyCode: 86,
          which: 86,
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        }));
        
        // Create paste event
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer()
        });
        (pasteEvent.clipboardData as DataTransfer).setData('text/plain', text);
        targetElement.dispatchEvent(pasteEvent);
        
        console.log('[TestFlow Vision] Strategy 2: Clipboard paste attempted');
        await new Promise(r => setTimeout(r, 200));
        
        // Verify paste worked
        const editorContent = targetElement.closest('.monaco-editor, .cm-editor, [contenteditable]')?.textContent || '';
        if (editorContent.includes(text.substring(0, Math.min(20, text.length)))) {
          console.log('[TestFlow Vision] Strategy 2: Clipboard paste verified');
          return true;
        }
      } catch (e) {
        console.warn('[TestFlow Vision] Strategy 2 (clipboard) failed:', e);
      }
      
      // ========================================
      // STRATEGY 3: Selection/Range (contenteditable)
      // ========================================
      try {
        const editableElement = targetElement.closest('[contenteditable="true"]') as HTMLElement;
        
        if (editableElement) {
          editableElement.focus();
          const selection = window.getSelection();
          
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            editableElement.textContent = (editableElement.textContent || '') + text;
          }
          
          editableElement.dispatchEvent(new InputEvent('input', {
            data: text,
            inputType: 'insertText',
            bubbles: true,
            cancelable: true
          }));
          
          console.log('[TestFlow Vision] Strategy 3: Selection/Range succeeded');
          return true;
        }
      } catch (e) {
        console.warn('[TestFlow Vision] Strategy 3 (selection) failed:', e);
      }
      
      // ========================================
      // STRATEGY 4: Character-by-character InputEvents (fallback)
      // ========================================
      try {
        targetElement.focus();
        await new Promise(r => setTimeout(r, 100));
        
        for (const char of text) {
          targetElement.dispatchEvent(new InputEvent('beforeinput', {
            data: char,
            inputType: 'insertText',
            bubbles: true,
            cancelable: true
          }));
          
          targetElement.dispatchEvent(new InputEvent('input', {
            data: char,
            inputType: 'insertText',
            bubbles: true,
            cancelable: true
          }));
          
          await new Promise(r => setTimeout(r, 10));
        }
        
        console.log('[TestFlow Vision] Strategy 4: Character InputEvents complete');
        return true;
      } catch (e) {
        console.warn('[TestFlow Vision] Strategy 4 (char input) failed:', e);
      }
      
      // ========================================
      // STRATEGY 5: Direct value set (last resort)
      // ========================================
      try {
        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
          targetElement.focus();
          targetElement.value = text;
          targetElement.dispatchEvent(new Event('input', { bubbles: true }));
          targetElement.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[TestFlow Vision] Strategy 5: Direct value set');
          return true;
        }
      } catch (e) {
        console.warn('[TestFlow Vision] Strategy 5 (direct value) failed:', e);
      }
      
      console.error('[TestFlow Vision] All strategies failed for:', targetElement.tagName, targetElement.className);
      return false;
    };

    if (bundleTag.toLowerCase() === "gmp-place-autocomplete") {
      // Inject replay.js
      injectScript("replay");
      //console.log("bundle.xpath >>>", bundle.xpath);
      // Wait a bit to ensure replay.js is loaded
      await new Promise((r) => setTimeout(r, 500));

      if (actionType.toLowerCase() === "input") {
        // Send replay message to page context
        window.postMessage(
          {
            type: "REPLAY_AUTOCOMPLETE",
            actions: [
              {
                type: "AUTOCOMPLETE_INPUT",
                xpath: bundle.xpath,
                value: action.value,
              }
            ],
          },
          "*"
        );
      } else {
        // Send replay message to page context
        window.postMessage(
          {
            type: "REPLAY_AUTOCOMPLETE",
            actions: [

              {
                type: "AUTOCOMPLETE_SELECTION",
                xpath: bundle.xpath + (action.xpath ?? ""),
                text: action.value,
              },
            ],
          },
          "*"
        );
      }
      return true;
    }

    const el = await findElementFromBundle(bundle);
    if (!el) {
      console.warn("Element not found for bundle", bundle);
      return false;
    }

    const frameWin = el.ownerDocument.defaultView || window;
    const frameDoc = frameWin.document;
    if (!frameDoc) return false;

    const restoreVisibility = temporarilyShow(el);

    try {
      // Helper: focus and set value (React / controlled input safe)
      const focusAndSetValue = async (
        element: HTMLElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
        value: string
      ) => {
        element.focus();
        //console.log("focusAndSetValue >>> element >>>", element);

        // 👇 Check if it's x.com (Draft.js editor)
        const isDraftEditor =
          element.getAttribute("id")?.includes("placeholder") ||
          element.getAttribute("contenteditable") === "true";

        if (isDraftEditor) {
          if (element) {
            element.focus();
            document.execCommand('insertText', false, value);
          }
        } else {
          // 🧩 Normal input/textarea fields
          if (element.isContentEditable) {
            element.innerText = value;
            element.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, data: value, inputType: "insertText" }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
          } else if (element instanceof frameWin.HTMLInputElement || element instanceof frameWin.HTMLTextAreaElement) {
            const proto = element instanceof frameWin.HTMLInputElement
              ? frameWin.HTMLInputElement.prototype
              : frameWin.HTMLTextAreaElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
            if (setter) setter.call(element, value);
            else (element as any).value = value;

            // Dispatch input event for React
            element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
            element.dispatchEvent(new Event("change", { bubbles: true }));

            // Wait briefly so React internal state updates before Enter
            await new Promise(res => setTimeout(res, 50));

            //setTimeout(() => element.blur(), 20);
          } else if (element instanceof HTMLSelectElement) {
            const option = Array.from(element.options).find(opt => opt.value === value || opt.text.trim().toLowerCase() === value.trim().toLowerCase());
            if (option) element.value = option.value;
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
            //setTimeout(() => element.blur(), 20);
          } else {
            element.textContent = value;
            element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      };

      const humanClick = (element: HTMLElement) => humanLikeClick(element);

      switch (action.type) {
        case "click": {
          const value = action.value ?? "";

          if (el.tagName.toLowerCase() === "select") {
            await focusAndSetValue(el as HTMLSelectElement, value);
            return true;
          }

          const roleTarget = el.closest('[role="radio"], [role="checkbox"]') as HTMLElement | null;
          if (roleTarget && value) {
            const normalize = (str: string) => str.replace(/\s+/g, " ").trim();
            const options = Array.from(roleTarget.closest('[role="list"]')?.querySelectorAll('[role="checkbox"]') || [])
              .filter((el): el is HTMLElement => el instanceof HTMLElement);

            for (const opt of options) {
              const raw = opt.getAttribute("aria-label") || opt.textContent || "";
              if (normalize(raw) === normalize(value)) {
                humanClick(opt);
                return true;
              }
            }
          }
          //console.log("humanClick >>>> el >>>>", el);
          humanClick(el);
          return true;
        }

        case "input": {
          const value = action.value ?? "";
          if (typeof value !== "string") {
            console.warn("Invalid input value:", action);
            return false;
          }

          // B-48: Check for terminal first, then other complex editors
          const xtermTextarea = document.querySelector('.xterm-helper-textarea') as HTMLElement;
          const isTerminal = xtermTextarea || el?.closest('.xterm') || el?.closest('[class*="terminal"]');
          const isVisionStep = bundle.recordedVia === 'vision' || bundle.visionCapture === true;
          const isComplexEditor = el && (
            el.closest('.monaco-editor') || 
            el.closest('.CodeMirror') || 
            el.closest('.cm-editor') || 
            el.closest('.xterm') || 
            el.closest('.ace_editor') ||
            el.closest('[contenteditable="true"]')
          );
          
          console.log('[TestFlow] Input step:', { 
            value: value.substring(0, 30),
            isTerminal: !!isTerminal,
            isVisionStep, 
            isComplexEditor: !!isComplexEditor 
          });
          
          // B-48: For terminals, override element to use xterm textarea
          const typingTarget = isTerminal ? (xtermTextarea || el) : el;
          
          if (isTerminal || isVisionStep || isComplexEditor) {
            console.log('[TestFlow Vision] Using complex editor typing, target:', typingTarget?.className);
            typingTarget.click();
            typingTarget.focus();
            await new Promise(r => setTimeout(r, 300));
            const success = await simulateTypingForComplexEditor(value, typingTarget);
            if (success) {
              console.log('[TestFlow Vision] Complex editor typing succeeded');
              return true;
            }
            console.warn('[TestFlow Vision] Complex editor typing failed, trying standard');
          }

          // Standard input handling
          await focusAndSetValue(el, value);

          // Handle Select2 special case
          const optionEl = el.classList.contains("select2-results__option") ? el : el.closest(".select2-results__option");
          if (optionEl) {
            const realSelect = document.querySelector("select.select2-hidden-accessible") as HTMLSelectElement | null;
            if (realSelect) {
              const text = optionEl.textContent?.trim() || "";
              const option = Array.from(realSelect.options).find(opt => opt.text.trim().toLowerCase() === text.toLowerCase() || opt.value === text);
              if (option) {
                realSelect.value = option.value;
                realSelect.dispatchEvent(new Event("input", { bubbles: true }));
                realSelect.dispatchEvent(new Event("change", { bubbles: true }));
              }
            }
            optionEl.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
            optionEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          }

          return true;
        }

        case "enter": {
          const value = action.value ?? "";
          
          // B-48: Terminal special handling
          const xtermTextarea = document.querySelector('.xterm-helper-textarea') as HTMLElement;
          const isTerminal = xtermTextarea || el?.closest('.xterm') || el?.closest('[class*="terminal"]');
          
          if (isTerminal) {
            const target = xtermTextarea || el;
            console.log('[TestFlow] Terminal Enter detected');
            
            target.focus();
            await new Promise(r => setTimeout(r, 50));
            
            // If there's text to type first, use the typing function
            if (value) {
              console.log('[TestFlow] Terminal: typing value before Enter:', value);
              await simulateTypingForComplexEditor(value, target);
              await new Promise(r => setTimeout(r, 100));
            }
            
            // Send Enter key - use global KeyboardEvent (NOT frameWin)
            console.log('[TestFlow] Terminal: sending Enter key');
            ['keydown', 'keypress', 'keyup'].forEach(type => {
              target.dispatchEvent(new KeyboardEvent(type, {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
              }));
            });
            
            return true;
          }
          
          // Standard Enter handling
          if (value) await focusAndSetValue(el, value);

          ['keydown', 'keypress', 'keyup'].forEach(type => {
            el.dispatchEvent(new KeyboardEvent(type, {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true
            }));
          });

          if (el.tagName.toLowerCase() === "button") humanClick(el);
          return true;
        }

        default:
          console.warn("Unknown action type:", action.type);
          return false;
      }
    } catch (err) {
      console.error("Error in playAction:", err);
      return false;
    } finally {
      restoreVisibility();
    }
  }
  return null;
};

export default Layout;