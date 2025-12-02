# Muffin Lite - Web Testing Automation

> Chrome extension for recording and playing back web automation tests with Vision AI capabilities.

![Version](https://img.shields.io/badge/version-2.1.0-blue)
![Chrome](https://img.shields.io/badge/chrome-extension-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## 🚀 Features

### Core Features
- **Recording** - Capture user interactions (clicks, inputs, navigation)
- **Playback** - Replay recorded steps automatically
- **CSV Data** - Run recordings with multiple data rows
- **Projects** - Organize recordings into projects

### 🆕 Vision Enhancement (v2.1.0)

#### 👁️ Vision-Based Recording
Automatically falls back to OCR-based recording when DOM selectors are unreliable:
- Shadow DOM elements
- Deeply nested structures (15+ levels)
- Elements without stable identifiers
- Monaco editors and complex inputs

#### ⏱️ Time Delays
Configure delays for your automation:
- **Global Delay**: Applied after each step (0-60,000ms)
- **Per-Step Delay**: Wait before specific steps (0-3,600s)
- Perfect for waiting for AI responses or slow operations

#### 🔁 CSV Loop Control
Control how CSV data iterates through steps:
- **Row 1**: Executes all steps (setup phase)
- **Rows 2+**: Start from designated loop point
- Ideal for batch operations with initial setup

#### 🎯 Conditional Click
Automate approval dialogs and confirmation buttons:
- Configure target button texts (e.g., "Allow", "Continue")
- Set timeout duration for polling
- Auto-detection failsafe after each step
- Perfect for AI assistant permission dialogs

---

## 📦 Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/pharrisenterprises/Muffin.git
   cd Muffin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

---

## 🎬 Quick Start

### Recording a Test

1. Click the extension icon → **Recorder**
2. Click **Record** button
3. Perform actions on your target website
4. Click **Stop Recording**
5. Name your recording and save

### Playing Back

1. Go to **Test Runner**
2. Select your recording
3. (Optional) Upload CSV data file
4. Click **Run Test**
5. Watch the automation execute

---

## 📖 Using Vision Features

### Setting Up Time Delays

**Global Delay (toolbar):**
1. Find the "Delay:" input in the toolbar
2. Enter milliseconds (e.g., 2000 for 2 seconds)
3. Applied AFTER each step completes

**Per-Step Delay (context menu):**
1. Click the ⋮ menu on any step
2. Select "Set Delay Before Step"
3. Enter seconds (e.g., 300 for 5 minutes)
4. Applied BEFORE the step executes

### Configuring CSV Loop

1. Find "CSV Loop Start:" dropdown in toolbar
2. Select which step rows 2+ should start from
3. Look for 🔁 badge on the loop start step

**Example:**
- 4 steps, loop starts at Step 3
- Row 1: Steps 1, 2, 3, 4 (all)
- Row 2: Steps 3, 4 only
- Row 3: Steps 3, 4 only

### Adding Conditional Clicks

1. Click **+ Add Conditional** button
2. Configure:
   - **Button Texts**: "Allow, Continue, Accept" (comma-separated)
   - **Timeout**: 120 seconds
   - **Poll Interval**: 500ms
   - **Confidence**: 60%
3. Save the step

---

## 📊 Step Badges

| Badge | Meaning |
|-------|---------|
| 👁️ Vision | Step uses OCR-based automation |
| 🔁 Loop Start | CSV rows 2+ begin here |
| ⏱️ 5s | Per-step delay (seconds) |
| 🎯 Conditional | Watches for approval buttons |

---

## 🔧 Configuration

### Vision Engine Settings

| Setting | Default | Description |
|---------|---------|-------------|
| confidenceThreshold | 0.6 | OCR match confidence (0-1) |
| pollIntervalMs | 500 | Conditional click polling rate |
| language | eng | Tesseract OCR language |

### Recording Settings

| Setting | Default | Description |
|---------|---------|-------------|
| globalDelayMs | 0 | Delay after each step (ms) |
| loopStartIndex | 0 | CSV loop start position |

---

## 🛠️ Development

### Project Structure

```
src/
├── background/          # Service worker
├── common/              # Shared types
├── components/          # React UI components
│   ├── badges/          # Step indicator badges
│   ├── dialogs/         # Modal dialogs
│   ├── stepRow/         # Step row components
│   └── toolbar/         # Toolbar controls
├── contentScript/       # Page injection scripts
├── lib/                 # Core libraries
│   ├── visionEngine.ts  # OCR engine
│   ├── stepExecutor.ts  # Step execution
│   ├── playbackEngine.ts# Playback orchestration
│   └── schemaMigration.ts# Data migration
└── pages/               # Extension pages
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- visionEngine

# With coverage
npm test -- --coverage
```

### Building

```bash
# Development build
npm run dev

# Production build
npm run build

# Type checking
npx tsc --noEmit
```

---

## 📚 Documentation

- [API Documentation](docs/API.md) - VisionEngine methods and types
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [E2E Test Procedure](docs/E2E_TEST_PROCEDURE.md) - Manual testing guide

---

## 🐛 Known Limitations

- **OCR Accuracy**: Text recognition depends on font clarity and contrast
- **Screenshot Timing**: Fast-changing content may cause missed captures
- **Cross-Origin Frames**: iframes from different origins may not be accessible
- **Performance**: Large recordings with many Vision steps may be slower

---

## 📝 Changelog

### v2.1.0 (Vision Enhancement)
- ✨ Added Vision Engine with Tesseract.js OCR
- ✨ Added Vision fallback during recording
- ✨ Added global and per-step time delays
- ✨ Added CSV loop start configuration
- ✨ Added conditional click automation
- 🔧 Updated schema to v3 with migration
- 📚 Added comprehensive documentation

### v2.0.0
- Initial release with DOM-based recording/playback

---

## 📄 License

MIT License - see LICENSE for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

---

**Built with ❤️ for automation enthusiasts**
