# Vision Content Script Handlers Breakdown

## Purpose

Content script message handlers for Vision-based interactions. Provides coordinate-based clicking, typing, keyboard shortcuts, scrolling, and element inspection within the webpage context.

## Key Files

| File | Location | Purpose |
|------|----------|----------|
| Vision Handlers | `src/contentScript/visionHandlers.ts` | Message listeners |
| Click Handler | `src/contentScript/visionHandlers.ts` | VISION_CLICK handler |
| Type Handler | `src/contentScript/visionHandlers.ts` | VISION_TYPE handler |
| Key Handler | `src/contentScript/visionHandlers.ts` | VISION_KEY handler |
| Scroll Handler | `src/contentScript/visionHandlers.ts` | VISION_SCROLL handler |
| Get Element Handler | `src/contentScript/visionHandlers.ts` | VISION_GET_ELEMENT handler |

## Inputs

| Input | Type | Source | Purpose |
|-------|------|--------|----------|
| x, y | `number` | VisionEngine | Click coordinates |
| text | `string` | VisionEngine | Text to type |
| key | `string` | VisionEngine | Keyboard shortcut |
| direction | `'up'\|'down'` | VisionEngine | Scroll direction |

## Outputs

| Output | Type | Destination | Content |
|--------|------|-------------|----------|
| ClickResult | `{success, element?}` | VisionEngine | Click outcome |
| TypeResult | `{success}` | VisionEngine | Type outcome |
| KeyResult | `{success}` | VisionEngine | Key outcome |
| ScrollResult | `{success}` | VisionEngine | Scroll outcome |
| ElementInfo | `{tagName, id, class}` | VisionEngine | Element details |

## Internal Architecture

### Message Router

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'VISION_CLICK':
      handleVisionClick(message.x, message.y, sendResponse);
      return true;
    case 'VISION_TYPE':
      handleVisionType(message.text, sendResponse);
      return true;
    case 'VISION_KEY':
      handleVisionKey(message.key, sendResponse);
      return true;
    case 'VISION_SCROLL':
      handleVisionScroll(message.direction, sendResponse);
      return true;
    case 'VISION_GET_ELEMENT':
      handleVisionGetElement(message.x, message.y, sendResponse);
      return true;
  }
});
```

### Handler Implementations

**handleVisionClick(x, y)**
- Get element via document.elementFromPoint(x, y)
- Scroll into view if needed
- Dispatch mousedown, mouseup, click events
- Return success with element tagName

**handleVisionType(text)**
- Get active element (document.activeElement)
- For input/textarea: set .value, dispatch input/change
- For contenteditable: use document.execCommand('insertText')
- Return success status

**handleVisionKey(key)**
- Parse key string (e.g., "Control+A")
- Create KeyboardEvent with modifiers
- Dispatch on active element
- Return success status

**handleVisionScroll(direction)**
- Calculate scroll amount (500px default)
- window.scrollBy(0, direction === 'down' ? 500 : -500)
- Return success status

**handleVisionGetElement(x, y)**
- Get element via document.elementFromPoint(x, y)
- Extract tagName, id, className, textContent
- Return element info

## Dependencies

### Browser APIs
- **document.elementFromPoint**: Coordinate → element lookup
- **Element.scrollIntoView**: Ensure visibility
- **MouseEvent**: Synthetic click events
- **KeyboardEvent**: Keyboard simulation
- **window.scrollBy**: Page scrolling

### Internal Dependencies
- **VisionEngine** (ENG-001 to ENG-006): Message sender
- **PlaybackEngine** (ENG-008): Orchestrates calls

## Hidden Assumptions

1. **Same Origin**: Cannot access cross-origin iframes
2. **Event Bubbling**: Assumes bubbling enabled
3. **Active Element**: document.activeElement is focusable
4. **Instant Scrolling**: Uses 'instant' behavior
5. **Event Order**: mousedown → mouseup → click
6. **Modifier Keys**: Uses standard names (Control, Shift, Alt, Meta)
7. **Text Input**: Assumes element is editable
8. **Element Exists**: elementFromPoint may return null

## Stability Concerns

### High Risk
1. **Event Interception**: Other scripts may block events
2. **Iframe Boundaries**: Cross-origin iframes unreachable
3. **Shadow DOM**: May need special handling

### Medium Risk
1. **Focus Loss**: Active element may lose focus
2. **Scroll Timing**: Scroll may not complete before next action
3. **Event Suppression**: Site may preventDefault()

### Low Risk
1. **Coordinate Accuracy**: Browser handles DPR scaling
2. **Message Passing**: Chrome's reliable message system

## Edge Cases

1. **No Element at Coordinates**: elementFromPoint returns null
2. **Element Behind Overlay**: Click hits wrong element
3. **No Active Element**: Typing fails silently
4. **Non-Editable Element**: Typing has no effect
5. **Already at Top/Bottom**: Scroll has no effect
6. **Invalid Key String**: KeyboardEvent fails
7. **Shadow Root**: May need shadowRoot.elementFromPoint
8. **Iframe**: Click on iframe doesn't reach content
9. **Fixed/Sticky Elements**: May intercept clicks
10. **Display: None**: Element exists but not clickable

## Developer Notes

### Testing Strategy
- **Unit Tests**: Mock document.elementFromPoint
- **Integration Tests** (INT-001 to INT-005): Message passing
- **E2E Tests**: Real browser interactions

### Common Pitfalls
1. **Forgetting scrollIntoView**: Element off-screen
2. **Wrong event order**: Click before mousedown
3. **Missing modifiers**: Ctrl+A needs ctrlKey: true
4. **Coordinate scaling**: Assuming 1:1 pixel ratio
5. **Async timing**: Not waiting for scroll

### Integration Points
- **VisionEngine.clickAt()**: Calls VISION_CLICK (INT-001)
- **VisionEngine.typeText()**: Calls VISION_TYPE (INT-002)
- **VisionEngine.sendKeys()**: Calls VISION_KEY (INT-003)
- **VisionEngine.scrollPage()**: Calls VISION_SCROLL (INT-004)
- **Recording**: VISION_GET_ELEMENT for metadata (INT-005)

## Specification References

- INT-001: Vision click handler
- INT-002: Vision type handler
- INT-003: Vision key handler
- INT-004: Vision scroll handler
- INT-005: Vision get element handler
- ENG-006: Coordinate clicking
- ENG-009: Type text function
- ENG-010: Send keys function
- ENG-011: Scroll function
