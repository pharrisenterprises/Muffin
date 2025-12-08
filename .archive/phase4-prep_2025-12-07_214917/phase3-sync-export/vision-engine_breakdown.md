# Vision Engine Component Breakdown

## Purpose

Core OCR and Vision-based automation engine using Tesseract.js. Provides screenshot capture, text recognition, text search, coordinate-based clicking, conditional polling, and Vision-driven playback capabilities.

## Key Files

| File | Location | Purpose |
|------|----------|----------|
| VisionEngine | `src/lib/visionEngine.ts` | Main engine class |
| Vision Types | `src/types/vision.types.ts` | TypeScript interfaces |
| Vision Config | `src/types/vision.types.ts` | Configuration interface |
| Text Result | `src/types/vision.types.ts` | OCR result types |

## Inputs

| Input | Type | Source | Purpose |
|-------|------|--------|----------|
| tabId | `number` | Chrome tabs API | Screenshot capture target |
| imageData | `string \| ImageData` | Screenshot | OCR processing |
| searchText | `string \| RegExp` | User/recording | Text to find |
| coordinates | `{x, y}` | OCR/recording | Click targets |
| buttonTexts | `string[]` | Step config | Conditional polling |
| successText | `string \| null` | Step config | Exit condition |

## Outputs

| Output | Type | Destination | Content |
|--------|------|-------------|----------|
| Screenshot | `Screenshot` | OCR pipeline | Base64 PNG data |
| OcrResult | `OcrResult` | Text search | Words with coordinates |
| FindTextResult | `FindTextResult` | Click handler | Match location |
| ClickResult | `ClickResult` | Playback engine | Success status |
| ConditionalClickResult | `ConditionalClickResult` | Step executor | Button stats |

## Internal Architecture

### Class Structure

```typescript
class VisionEngine extends EventEmitter {
  private worker: Tesseract.Worker | null = null;
  private isInit: boolean = false;
  private config: VisionConfig;
  
  // Lifecycle
  async initialize(): Promise<void>
  async terminate(): Promise<void>
  
  // Screenshot
  async captureScreenshot(tabId?, options?): Promise<Screenshot>
  
  // OCR
  async recognizeText(imageData): Promise<OcrResult>
  
  // Search
  async findText(searchText, options?): Promise<FindTextResult>
  async findAllText(searchText, options?): Promise<FindTextResult[]>
  
  // Click
  async clickAt(x, y, options?): Promise<ClickResult>
  async findTextAndClick(searchText, options?): Promise<FindAndClickResult>
  
  // Conditional
  async waitAndClickButtons(config): Promise<ConditionalClickResult>
}
```

### Execution Flow

1. **Initialization**: Load Tesseract.js worker (ENG-002)
2. **Screenshot**: Capture visible tab via chrome.tabs.captureVisibleTab (ENG-003)
3. **OCR**: Extract text with Tesseract.recognize (ENG-004)
4. **Filtering**: Apply confidence threshold (ENG-005)
5. **Search**: Case-insensitive text matching with fuzzy support (ENG-005)
6. **Click**: Send VISION_CLICK message to content script (ENG-006, INT-001)
7. **Conditional**: Poll loop with timeout and button counting (ENG-007, ENG-014)

### Key Methods

**initialize()** (ENG-002)
- Creates Tesseract.Worker
- Loads 'eng' language data
- Sets initialized flag
- Emits 'initialized' event

**captureScreenshot()** (ENG-003)
- Gets active tab or uses provided tabId
- Calls chrome.tabs.captureVisibleTab
- Returns Screenshot object with dataUrl, base64Data, dimensions
- Throws if tab not accessible

**recognizeText()** (ENG-004)
- Accepts data URL or ImageData
- Calls worker.recognize()
- Extracts words with bounding boxes
- Filters by confidence threshold (ENG-005)
- Returns OcrResult with words array

**findText()** (ENG-005)
- Captures screenshot
- Runs OCR
- Searches for text (case-insensitive, fuzzy optional)
- Returns first match with clickX/clickY at center
- Supports regex, partial match, exact match

**clickAt()** (ENG-006, INT-001)
- Validates coordinates (not negative, not NaN)
- Sends VISION_CLICK message to content script
- Content script uses document.elementFromPoint()
- Dispatches mousedown, mouseup, click events
- Returns success/failure

**waitAndClickButtons()** (ENG-007, ENG-014)
- Polling loop implementation:
  1. Capture screenshot
  2. Run OCR
  3. Search for any buttonText
  4. If found: click, reset timer, increment counter, emit event
  5. If not found: wait pollIntervalMs
  6. Check timeout: exit if (now - lastClick) > timeoutSeconds
  7. Check successText: exit if found
  8. Check abort signal: exit if aborted
- Returns stats: buttonsClicked[], totalClicks, terminationReason

## Dependencies

### External Libraries
- **tesseract.js** (^5.0.0): OCR engine
- **events**: EventEmitter base class

### Chrome APIs
- **chrome.tabs.captureVisibleTab**: Screenshot capture
- **chrome.tabs.query**: Get active tab
- **chrome.tabs.sendMessage**: Send to content script

### Internal Dependencies
- **Vision Types** (FND-004 to FND-009): All interfaces
- **Content Script Handlers** (INT-001 to INT-005): Click/type/key/scroll
- **PlaybackEngine** (ENG-008): Vision step execution
- **StepExecutor** (ENG-017): Step routing

## Hidden Assumptions

1. **English Only**: Tesseract configured for 'eng' language
2. **Single Tab**: Only captures visible tab content
3. **Viewport Only**: Cannot capture off-screen elements
4. **OCR Performance**: 200-500ms per recognition
5. **Confidence Default**: 0.6 (60%) filters low-quality matches
6. **Poll Interval**: Minimum 500ms recommended for Copilot
7. **Timeout Behavior**: Time since LAST click, not total time
8. **Button Order**: Clicks first found button, not all matches
9. **Success Text**: Case-insensitive, partial match
10. **Worker Lifecycle**: Must initialize before use, terminate to free memory

## Stability Concerns

### High Risk
1. **Tesseract.js CDN**: Loads from unpkg.com (offline fails)
2. **OCR Accuracy**: Font-dependent, special characters unreliable
3. **Memory Leaks**: Worker must be terminated properly
4. **Tab Permissions**: chrome:// URLs not accessible

### Medium Risk
1. **Performance**: OCR is CPU-intensive
2. **Race Conditions**: Rapid clicks may miss elements
3. **Coordinate Drift**: Window resize invalidates positions
4. **Polling Load**: Tight loops can freeze UI

### Low Risk
1. **Event Emitter**: Standard Node.js pattern
2. **Screenshot Format**: Always PNG, widely supported
3. **Message Passing**: Chrome extension standard

## Edge Cases

1. **Empty Screenshot**: Returns empty OcrResult
2. **No Matches**: findText returns {found: false, clickX: null}
3. **Multiple Matches**: findText returns first, findAllText returns all
4. **Overlapping Text**: Bounding boxes may intersect
5. **Special Characters**: OCR may misread (l→1, O→0)
6. **Timeout Zero**: Conditional exits immediately after first click
7. **Empty buttonTexts**: No buttons to search, exits on timeout
8. **Abort Signal**: Exits immediately without cleanup
9. **Worker Not Initialized**: Throws "VisionEngine not initialized"
10. **Invalid Coordinates**: Throws "Invalid coordinates"

## Developer Notes

### Performance Tips
1. **Reuse Engine**: Initialize once, use many times
2. **Increase Poll Interval**: 500ms minimum for Copilot
3. **Use Confidence Threshold**: Filter noisy results
4. **Terminate When Done**: Free Tesseract worker
5. **Batch Operations**: Don't capture per-character

### Testing Strategy
- **Unit Tests** (TST-001 to TST-004): Init, screenshot, OCR, findText
- **Integration Tests** (TST-006): Conditional polling loop
- **E2E Tests** (TST-010): Full Copilot workflow
- **Mock Tesseract**: Fast deterministic tests
- **Mock Chrome**: Tab capture without browser

### Common Pitfalls
1. **Forgetting initialize()**: Causes "not initialized" errors
2. **Not terminating**: Memory leak from worker
3. **Polling too fast**: High CPU usage
4. **Ignoring confidence**: Low-quality matches
5. **Hardcoding timeout**: Different apps need different times

### Integration Points
- **Recording**: Vision fallback when DOM fails (INT-009)
- **Playback**: recordedVia='vision' routes here (INT-008)
- **CSV Loop**: Variable substitution in buttonTexts (ENG-016)
- **Migration**: Adds recordedVia default (MIG-001)

## Specification References

- ENG-001: VisionEngine class shell
- ENG-002: Tesseract worker initialization
- ENG-003: Screenshot capture
- ENG-004: OCR text recognition
- ENG-005: Text finding methods (findText, findAllText)
- ENG-006: Coordinate clicking
- ENG-007: Conditional click polling
- ENG-014: waitAndClickButtons implementation
- INT-001 to INT-005: Content script handlers
- INT-008: DOM/Vision playback switch
- TST-001 to TST-004: Core tests
- TST-006: Conditional click tests
- TST-010: Full E2E workflow
- DOC-002: API documentation
