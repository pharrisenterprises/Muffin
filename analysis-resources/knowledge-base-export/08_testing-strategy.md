# TESTING STRATEGY

## Testing Overview

| Test Type | Tool | Coverage Target | Execution |
|-----------|------|-----------------|-----------|
| **Unit** | Jest | 80%+ | Pre-commit |
| **Integration** | Jest + Puppeteer | Key flows | Pre-push |
| **E2E** | Manual + Automated | Critical paths | Pre-release |
| **Manual** | Checklists | UX validation | Weekly |

## Coverage Targets

| Module | Unit | Integration | E2E |
|--------|------|-------------|-----|
| CDPService | 90% | 80% | N/A |
| PlaywrightLocators | 85% | 75% | 60% |
| DecisionEngine | 90% | 80% | 70% |
| VisionService | 80% | 70% | 60% |
| AutoWaiting | 85% | 75% | N/A |
| RecordingOrchestrator | 75% | 70% | 80% |

## Test File Structure

```
tests/
├── unit/
│   ├── CDPService.test.ts
│   ├── PlaywrightLocators.test.ts
│   ├── DecisionEngine.test.ts
│   └── VisionService.test.ts
├── integration/
│   ├── recording-flow.test.ts
│   ├── playback-flow.test.ts
│   └── cdp-integration.test.ts
├── e2e/
│   ├── scenarios/
│   │   ├── login-flow.test.ts
│   │   ├── form-submission.test.ts
│   │   └── canvas-interaction.test.ts
│   └── fixtures/
│       └── test-pages/
└── manual/
    ├── cdp-checklist.md
    ├── vision-checklist.md
    └── fallback-checklist.md
```

## CDP-Specific Tests

### CDPService Unit Tests

```typescript
describe('CDPService', () => {
  let cdp: CDPService;
  const mockTabId = 123;
  
  beforeEach(() => {
    cdp = new CDPService();
  });
  
  test('attach() enables required domains', async () => {
    await cdp.attach(mockTabId);
    
    expect(chrome.debugger.attach).toHaveBeenCalledWith(
      { tabId: mockTabId },
      '1.3'
    );
    expect(chrome.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId: mockTabId },
      'DOM.enable'
    );
  });
  
  test('sendCommand() throws if not attached', async () => {
    await expect(
      cdp.sendCommand(mockTabId, 'DOM.getDocument')
    ).rejects.toThrow('CDP not attached');
  });
  
  test('detach() removes tab from attached set', async () => {
    await cdp.attach(mockTabId);
    await cdp.detach(mockTabId);
    
    expect(cdp.isAttached(mockTabId)).toBe(false);
  });
});
```

### PlaywrightLocators Unit Tests

```typescript
describe('PlaywrightLocators', () => {
  let locators: PlaywrightLocators;
  let mockCDP: jest.Mocked<CDPService>;
  
  beforeEach(() => {
    mockCDP = {
      sendCommand: jest.fn(),
      isAttached: jest.fn().mockReturnValue(true)
    } as any;
    
    locators = new PlaywrightLocators(mockCDP, mockAxService);
  });
  
  test('getByRole() finds button by role and name', async () => {
    mockAxService.findByRole.mockResolvedValue([
      { role: { value: 'button' }, name: { value: 'Submit' } }
    ]);
    
    const result = await locators.getByRole(123, 'button', { name: 'Submit' });
    
    expect(result.found).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.9);
  });
  
  test('getByText() executes JS to find element', async () => {
    mockCDP.sendCommand.mockResolvedValue({ result: { objectId: 'abc' } });
    
    const result = await locators.getByText(123, 'Login');
    
    expect(mockCDP.sendCommand).toHaveBeenCalledWith(
      123,
      'Runtime.evaluate',
      expect.objectContaining({ expression: expect.stringContaining('Login') })
    );
  });
});
```

### DecisionEngine Unit Tests

```typescript
describe('DecisionEngine', () => {
  let engine: DecisionEngine;
  
  test('selectBestStrategy() returns highest confidence', async () => {
    const strategies = [
      { type: 'dom_selector', confidence: 0.75 },
      { type: 'cdp_semantic', confidence: 0.95 },
      { type: 'vision_ocr', confidence: 0.88 }
    ];
    
    const best = engine.selectBestStrategy(strategies);
    
    expect(best).toBe('cdp_semantic');
  });
  
  test('evaluateStrategies() scores all available options', async () => {
    const step = {
      selector: '#submit',
      visionData: { targetText: 'Submit' },
      fallbackChain: {
        strategies: [{ type: 'cdp_semantic' }]
      }
    };
    
    const strategies = await engine.evaluateStrategies(step);
    
    expect(strategies).toHaveLength(3); // DOM + CDP + Vision
    expect(strategies[0].confidence).toBeGreaterThan(strategies[1].confidence);
  });
});
```

## Integration Tests

### Recording Flow

```typescript
describe('Recording Flow Integration', () => {
  test('captures multi-layer evidence', async () => {
    // Start recording
    await sendMessage({ action: 'START_RECORDING' });
    
    // Simulate user click
    await page.click('#submit-button');
    
    // Stop recording
    const response = await sendMessage({ action: 'STOP_RECORDING' });
    
    // Verify evidence captured
    const recording = await db.recordings.get(response.data.recordingId);
    expect(recording.steps).toHaveLength(1);
    expect(recording.steps[0].fallbackChain.strategies.length).toBeGreaterThan(1);
  });
});
```

### Playback Flow

```typescript
describe('Playback Flow Integration', () => {
  test('executes fallback chain on DOM change', async () => {
    // Record step
    const step = await recordStep('#submit');
    
    // Change page (remove ID)
    await page.evaluate(() => {
      document.querySelector('#submit').removeAttribute('id');
    });
    
    // Playback
    const result = await executeStep(step);
    
    // Verify fallback succeeded
    expect(result.success).toBe(true);
    expect(result.strategyUsed).not.toBe('dom_selector');
  });
});
```

## E2E Test Scenarios

### Login Flow

```typescript
test('E2E: Login with CDP locators', async () => {
  await page.goto('https://example.com/login');
  
  // Record
  await startRecording();
  await page.getByLabel('Username').fill('testuser');
  await page.getByLabel('Password').fill('pass123');
  await page.getByRole('button', { name: 'Login' }).click();
  await stopRecording();
  
  // Change page
  await page.evaluate(() => {
    document.querySelector('[name="username"]').removeAttribute('name');
  });
  
  // Playback
  await playRecording();
  
  // Verify
  await expect(page.getByText('Welcome')).toBeVisible();
});
```

## Manual Test Checklists

### CDP Integration Checklist

- [ ] Attach debugger to tab
- [ ] Chrome shows "Debugger attached" banner
- [ ] getByRole finds button elements
- [ ] getByText finds text content
- [ ] getByLabel finds associated inputs
- [ ] getByPlaceholder finds input by placeholder
- [ ] Detach debugger on stop
- [ ] No errors in console

### Vision Checklist

- [ ] Screenshot captures at 2x DPR
- [ ] OCR extracts text with >95% accuracy
- [ ] Vision click finds and clicks canvas elements
- [ ] Vision badge shows in UI
- [ ] Conditional click polls until found
- [ ] Timeout error after 30s

### Fallback Checklist

- [ ] DOM strategy tries first
- [ ] CDP strategy tries second
- [ ] Vision strategy tries third
- [ ] All strategies logged in telemetry
- [ ] Highest confidence wins
- [ ] Playback succeeds after page change
