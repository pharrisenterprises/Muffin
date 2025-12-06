# FUTURE ROADMAP

## Overview

This document outlines planned features for **Phases 3-6** of Muffin Lite V2, along with technical debt items and community-requested features.

---

## Phase 3: Advanced Recording (Q2 2024)

### 3.1 Hover Actions
**Goal:** Capture and replay mouse hover interactions

**Features:**
- Record hover events with 200ms debounce
- Detect hover-triggered dropdowns
- Replay hover with smooth mouse movement
- Hover-to-reveal element detection

**Technical Challenges:**
- Distinguishing intentional hovers from mouse movement
- Timing coordination (hover duration)
- Tooltip/dropdown detection

**Estimated Effort:** 3 weeks

### 3.2 Drag & Drop
**Goal:** Support drag-and-drop interactions

**Features:**
- Capture drag start/end coordinates
- Record drop targets
- Replay with smooth drag animation
- Support for Sortable.js and React DnD

**Technical Challenges:**
- Different drag-and-drop libraries (HTML5, custom)
- Drop zone detection
- Multi-element drag (e.g., file uploads)

**Estimated Effort:** 2 weeks

### 3.3 Keyboard Shortcuts
**Goal:** Record keyboard combinations (Ctrl+C, Ctrl+V, etc.)

**Features:**
- Capture key combinations (Ctrl, Shift, Alt + key)
- Replay shortcuts with correct timing
- Support for browser shortcuts vs. page shortcuts
- Configurable key mapping

**Technical Challenges:**
- Browser-level shortcuts (Ctrl+T opens new tab)
- OS-level shortcuts (Ctrl+Alt+Del on Windows)
- Focus management (which element receives shortcut)

**Estimated Effort:** 1 week

### 3.4 Smart Waits
**Goal:** Automatically detect when to wait for page state

**Features:**
- Network idle detection (no pending requests)
- Animation completion detection
- Custom wait conditions (user-defined)
- Auto-wait for `fetch()` calls

**Technical Challenges:**
- Detecting "real" network idle (exclude analytics pings)
- Infinite scroll detection
- WebSocket connections (never idle)

**Estimated Effort:** 2 weeks

**Total Phase 3 Effort:** 8 weeks

---

## Phase 4: Mobile & Cross-Browser (Q3 2024)

### 4.1 Mobile Recording (Chrome Android)
**Goal:** Record tests on mobile browsers

**Features:**
- Touch event recording (tap, swipe, pinch)
- Viewport size detection
- Mobile-specific gestures
- Screen orientation changes

**Technical Challenges:**
- Chrome extension APIs limited on Android
- Touch coordinates vs. mouse coordinates
- Responsive layout changes

**Estimated Effort:** 4 weeks

### 4.2 Firefox Support
**Goal:** Port extension to Firefox

**Features:**
- WebExtensions API compatibility
- Firefox-specific CDP equivalent (Remote Debugging Protocol)
- Same feature parity as Chrome version

**Technical Challenges:**
- Different debugging APIs (Firefox uses RDP, not CDP)
- Manifest V3 differences
- IndexedDB compatibility

**Estimated Effort:** 6 weeks

### 4.3 Edge & Safari Support
**Goal:** Extend to Edge and Safari

**Features:**
- Edge (Chromium-based) - should work with minimal changes
- Safari (WebKit) - requires separate build

**Technical Challenges:**
- Safari Web Extensions have limited permissions
- Safari doesn't support `chrome.debugger`
- May need to use Accessibility API instead

**Estimated Effort:** 8 weeks (mostly Safari)

**Total Phase 4 Effort:** 18 weeks

---

## Phase 5: Collaboration & CI/CD (Q4 2024)

### 5.1 Cloud Sync
**Goal:** Sync recordings across devices

**Features:**
- Optional cloud storage (AWS S3 or Firebase)
- Encryption at rest
- Team workspaces
- Version history (git-like)

**Technical Challenges:**
- User authentication (OAuth)
- Data privacy (GDPR compliance)
- Conflict resolution (concurrent edits)

**Estimated Effort:** 6 weeks

### 5.2 Team Collaboration
**Goal:** Share recordings with team members

**Features:**
- Invite team members via email
- Role-based access control (viewer, editor, admin)
- Comments on recordings/steps
- Shared project folders

**Technical Challenges:**
- Multi-tenancy architecture
- Real-time sync (WebSockets)
- Permission management

**Estimated Effort:** 4 weeks

### 5.3 CI/CD Integration
**Goal:** Run tests in CI pipelines

**Features:**
- Headless Chrome runner (Node.js CLI)
- Export to Puppeteer/Playwright scripts
- JUnit XML report output
- Docker container image

**Technical Challenges:**
- Converting Chrome extension logic to Node.js
- Maintaining feature parity (Vision Engine in headless mode)
- Authentication in CI environments

**Estimated Effort:** 5 weeks

### 5.4 Scheduled Runs
**Goal:** Run tests on a schedule (cron-like)

**Features:**
- Schedule tests (hourly, daily, weekly)
- Email notifications on failure
- Dashboard for scheduled runs
- Retry logic (auto-retry failed tests)

**Technical Challenges:**
- Background task orchestration
- Notification service (SendGrid, Mailgun)
- Time zone handling

**Estimated Effort:** 3 weeks

**Total Phase 5 Effort:** 18 weeks

---

## Phase 6: AI & Advanced Features (Q1 2025)

### 6.1 AI-Powered Test Generation
**Goal:** Generate tests from natural language descriptions

**Features:**
- "Record a test that logs in and adds item to cart"
- GPT-4 integration to parse intent
- Auto-generate step sequence
- AI suggests assertions

**Technical Challenges:**
- Prompt engineering for reliable generation
- Cost (OpenAI API fees)
- Handling ambiguous requests

**Estimated Effort:** 8 weeks

### 6.2 Visual Regression Testing
**Goal:** Detect visual changes in UI

**Features:**
- Screenshot comparison (before/after)
- Diff highlighting (red boxes on changes)
- Tolerance threshold (ignore minor changes)
- Integration with Percy or BackstopJS

**Technical Challenges:**
- Screenshot consistency (fonts, anti-aliasing)
- Storage for baseline images (large files)
- Handling expected changes (new features)

**Estimated Effort:** 4 weeks

### 6.3 Self-Healing Tests
**Goal:** Auto-fix broken tests when website changes

**Features:**
- Detect when locator fails
- Try alternative locators automatically
- Suggest updated locator to user
- Learn from user fixes (ML model)

**Technical Challenges:**
- Knowing when to auto-fix vs. prompt user
- Avoiding false positives (fixing wrong element)
- Training ML model on user corrections

**Estimated Effort:** 10 weeks

### 6.4 Performance Monitoring
**Goal:** Track page performance during tests

**Features:**
- Capture Core Web Vitals (LCP, FID, CLS)
- Network waterfall charts
- Memory usage tracking
- Performance regression alerts

**Technical Challenges:**
- Accurate timing measurements
- Correlating performance with test steps
- Storage for historical data

**Estimated Effort:** 3 weeks

**Total Phase 6 Effort:** 25 weeks

---

## Technical Debt

### Priority 1 (P1) - Must Fix
| Item | Description | Effort |
|------|-------------|--------|
| TypeScript strict mode | Enable `strict: true` in tsconfig.json | 2 weeks |
| Redux state immutability | Use Immer.js to enforce immutability | 1 week |
| Error boundary in React | Catch React errors gracefully | 2 days |
| Memory leak in CDP attach | Detach debugger on tab close | 1 week |

### Priority 2 (P2) - Should Fix
| Item | Description | Effort |
|------|-------------|--------|
| Remove jQuery dependency | Replace with native JS | 1 week |
| Upgrade Dexie.js to v4 | Migrate to latest version | 3 days |
| Replace moment.js with date-fns | Reduce bundle size | 2 days |
| Add E2E tests | Puppeteer or Playwright tests | 2 weeks |

### Priority 3 (P3) - Nice to Have
| Item | Description | Effort |
|------|-------------|--------|
| Dark mode UI | Add dark theme toggle | 1 week |
| Localization (i18n) | Support multiple languages | 3 weeks |
| Accessibility audit | WCAG 2.1 AA compliance | 2 weeks |
| Code coverage > 80% | Increase unit test coverage | 2 weeks |

---

## Community Requests

### Most Requested (from GitHub Issues)

1. **Export to Selenium** (78 votes)
   - Export recordings as Selenium WebDriver scripts
   - Effort: 2 weeks
   - Status: ✅ Planned for Phase 5

2. **Variable Support** (65 votes)
   - Define variables (e.g., `{{username}}`) and reuse across steps
   - Effort: 1 week
   - Status: ✅ Planned for Phase 3

3. **API Request Recording** (52 votes)
   - Capture `fetch()` and `XMLHttpRequest` calls
   - Replay API calls with recorded responses
   - Effort: 3 weeks
   - Status: 🔄 Under consideration

4. **Mobile App Testing** (48 votes)
   - Test native mobile apps (React Native, Flutter)
   - Effort: 12 weeks
   - Status: ❌ Not planned (requires separate product)

5. **Real-Time Collaboration** (43 votes)
   - Multiple users edit same recording simultaneously (like Google Docs)
   - Effort: 8 weeks
   - Status: 🔄 Under consideration (Phase 5)

6. **Test Suites** (39 votes)
   - Group recordings into suites
   - Run entire suite with one click
   - Effort: 1 week
   - Status: ✅ Planned for Phase 3

7. **Assertions** (37 votes)
   - Add assertions (e.g., "expect button to be disabled")
   - Visual assertions (element present, text equals)
   - Effort: 2 weeks
   - Status: ✅ Planned for Phase 3

8. **Screenshot on Failure** (34 votes)
   - Auto-capture screenshot when test fails
   - Effort: 2 days
   - Status: ✅ Easy win - implement in next patch

9. **Slack/Discord Notifications** (31 votes)
   - Send test results to Slack/Discord channels
   - Effort: 1 week
   - Status: ✅ Planned for Phase 5

10. **Recording Templates** (28 votes)
    - Save recordings as templates (e.g., "Login Template")
    - Instantiate template with different data
    - Effort: 1 week
    - Status: 🔄 Under consideration

---

## Research Spikes

### Experimental Features (R&D)

1. **WebAssembly for Vision Engine**
   - Goal: Speed up OCR by compiling Tesseract to WASM
   - Expected Improvement: 2-3x faster
   - Effort: 2 weeks research + 2 weeks implementation
   - Risk: High (WASM debugging is hard)

2. **Machine Learning for Element Identification**
   - Goal: Train model to identify elements by visual appearance
   - Use TensorFlow.js or ONNX Runtime
   - Effort: 8 weeks (requires dataset collection)
   - Risk: High (model accuracy unknown)

3. **Blockchain for Test Provenance**
   - Goal: Immutable audit trail of test runs (for compliance)
   - Use IPFS + Ethereum smart contract
   - Effort: 4 weeks
   - Risk: Medium (unclear user demand)

4. **Voice Commands**
   - Goal: "Muffin, record a login test"
   - Use Web Speech API
   - Effort: 2 weeks
   - Risk: Low (fun experiment)

---

## Deprecation Notices

### Features Planned for Removal

1. **jQuery Dependency** (Phase 3)
   - Reason: Modern JS makes it unnecessary
   - Impact: None (internal refactor)

2. **Legacy DOM Selector Strategy** (Phase 4)
   - Reason: CDP locators are superior
   - Impact: Old recordings will auto-migrate

3. **Coordinates-Only Playback** (Phase 5)
   - Reason: Too brittle, Vision Engine is better fallback
   - Impact: Recordings will require Vision Engine enabled

---

## Success Metrics (by Phase)

| Phase | Target Metric | Target Value |
|-------|---------------|--------------|
| Phase 3 | Advanced interactions supported | 90% of use cases |
| Phase 4 | Browser coverage | Chrome, Firefox, Edge |
| Phase 5 | Team workspaces active | 500+ teams |
| Phase 6 | AI-generated tests | 10,000+ generated |

---

## Contribution Guide

Want to help build these features?

1. **Check GitHub Issues:** [github.com/muffin-lite/issues](#)
2. **Pick a "good first issue" label**
3. **Fork the repo and create a feature branch**
4. **Submit a PR with tests**
5. **Join our Discord:** [discord.gg/muffinlite](#)

---

## Feedback

Have ideas not listed here? Let us know:

- **GitHub Discussions:** [github.com/muffin-lite/discussions](#)
- **Email:** roadmap@muffinlite.com
- **Twitter/X:** @muffinlite

---

## Conclusion

Muffin Lite V2 is evolving from a simple recording tool to a comprehensive test automation platform. This roadmap is a living document and will be updated quarterly based on:

- User feedback
- Technical feasibility
- Market demand
- Available resources

**Last Updated:** January 2024  
**Next Review:** April 2024
