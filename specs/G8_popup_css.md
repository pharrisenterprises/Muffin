# popup.css Specification

**File ID:** G8  
**File Path:** `src/pages/popup.css`  
**Status:** CREATE (or MODIFY if exists)  
**Priority:** P1

---

## Purpose

Main stylesheet for the Chrome extension popup UI. Contains all CSS styles for App, Recorder, TestRunner, and shared components. Implements consistent design system with color variables, spacing scale, and component styles. Supports dark mode via media queries and ensures proper rendering within Chrome extension popup constraints.

---

## Dependencies

### Used By
- `./popup.html`: Link stylesheet
- `./popup.tsx`: Import for bundling
- `./App.tsx`: Component styles
- `./Recorder.tsx`: Recorder styles
- `./TestRunner.tsx`: TestRunner styles
- All popup components

---

## CSS Structure

```css
/**
 * ============================================================================
 * CSS VARIABLES (Design Tokens)
 * ============================================================================
 */

:root {
  /* Colors - Light Mode */
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-primary-light: #e0e7ff;
  
  --color-success: #10b981;
  --color-success-light: #d1fae5;
  
  --color-warning: #f59e0b;
  --color-warning-light: #fef3c7;
  
  --color-error: #ef4444;
  --color-error-light: #fee2e2;
  
  --color-text: #1f2937;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;
  
  --color-bg: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  
  --color-border: #e5e7eb;
  --color-border-light: #f3f4f6;
  
  /* Spacing Scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  --font-size-xs: 10px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height: 1.5;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-fast: 0.1s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
  
  /* Z-index Scale */
  --z-dropdown: 100;
  --z-modal: 200;
  --z-tooltip: 300;
}

/* Dark Mode Variables */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #818cf8;
    --color-primary-hover: #6366f1;
    --color-primary-light: #312e81;
    
    --color-success: #34d399;
    --color-success-light: #064e3b;
    
    --color-warning: #fbbf24;
    --color-warning-light: #78350f;
    
    --color-error: #f87171;
    --color-error-light: #7f1d1d;
    
    --color-text: #f3f4f6;
    --color-text-secondary: #d1d5db;
    --color-text-muted: #9ca3af;
    
    --color-bg: #1f2937;
    --color-bg-secondary: #111827;
    --color-bg-tertiary: #374151;
    
    --color-border: #374151;
    --color-border-light: #4b5563;
  }
}

/**
 * ============================================================================
 * BASE STYLES
 * ============================================================================
 */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 400px;
  min-height: 500px;
  max-height: 600px;
  overflow: hidden;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: var(--line-height);
  color: var(--color-text);
  background-color: var(--color-bg);
}

#root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/**
 * ============================================================================
 * APP LAYOUT
 * ============================================================================
 */

.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Header */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}

.app-header__logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.app-header__icon {
  font-size: var(--font-size-xl);
}

.app-header__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

/* Navigation */
.app-nav {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.app-nav__tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.app-nav__tab:hover {
  color: var(--color-text);
  background: var(--color-bg-tertiary);
}

.app-nav__tab.active {
  color: var(--color-primary);
  background: var(--color-bg);
  border-bottom: 2px solid var(--color-primary);
}

.app-nav__icon {
  font-size: var(--font-size-lg);
}

.app-nav__label {
  font-weight: var(--font-weight-medium);
}

/* Content */
.app-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

/* Footer */
.app-footer {
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.app-footer__version {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

/**
 * ============================================================================
 * SERVICE STATUS INDICATOR
 * ============================================================================
 */

.service-status {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
}

.service-status.ready {
  background: var(--color-success-light);
  color: var(--color-success);
}

.service-status.partial {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.service-status__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/**
 * ============================================================================
 * BUTTONS
 * ============================================================================
 */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-border);
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.btn-danger {
  background: var(--color-error);
  color: white;
}

.btn-icon {
  padding: var(--space-2);
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.7;
}

.btn-icon:hover {
  opacity: 1;
}

/* Recording control buttons */
.btn-record {
  background: var(--color-error);
  color: white;
}

.btn-record:hover:not(:disabled) {
  background: #dc2626;
}

.btn-stop {
  background: var(--color-text);
  color: white;
}

.btn-pause {
  background: var(--color-warning);
  color: white;
}

.btn-resume, .btn-play {
  background: var(--color-success);
  color: white;
}

/**
 * ============================================================================
 * RECORDING CONTROLS
 * ============================================================================
 */

.recording-control-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
}

.main-controls {
  display: flex;
  gap: var(--space-2);
}

.status-section {
  flex: 1;
}

.recording-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}

.recording-status .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.recording-status.active .status-dot {
  background: var(--color-error);
}

.recording-status.paused .status-dot {
  background: var(--color-warning);
  animation: none;
}

.mode-badge {
  padding: 1px 6px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.record-icon {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  margin-right: var(--space-1);
}

/**
 * ============================================================================
 * PLAYBACK CONTROLS
 * ============================================================================
 */

.playback-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
}

.control-buttons {
  display: flex;
  gap: var(--space-2);
}

.progress-section {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--transition-normal);
}

.progress-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 60px;
  text-align: right;
}

.status-indicator {
  font-size: var(--font-size-sm);
}

.status-indicator .running {
  color: var(--color-success);
}

.status-indicator .paused {
  color: var(--color-warning);
}

/**
 * ============================================================================
 * ACTION CARDS
 * ============================================================================
 */

.action-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.action-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.action-card.compact {
  padding: var(--space-2);
}

.action-index {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.action-main {
  flex: 1;
  min-width: 0;
}

.action-type-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.action-type {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
}

.action-type.click { background: #dbeafe; color: #1d4ed8; }
.action-type.type { background: #dcfce7; color: #15803d; }
.action-type.select { background: #fef3c7; color: #b45309; }
.action-type.navigate { background: #f3e8ff; color: #7c3aed; }

.action-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-target {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-strategies {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.strategy-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.action-layers {
  display: flex;
  gap: 2px;
}

.layer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.layer-dot.dom { background: #059669; }
.layer-dot.vision { background: #db2777; }
.layer-dot.mouse { background: #d97706; }
.layer-dot.network { background: #0891b2; }

.action-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.duration {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.retry-count {
  font-size: var(--font-size-xs);
  color: var(--color-warning);
}

.details-btn {
  padding: var(--space-1);
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.5;
}

.details-btn:hover {
  opacity: 1;
}

/**
 * ============================================================================
 * STEP LIST
 * ============================================================================
 */

.step-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-left: 3px solid transparent;
  transition: all var(--transition-fast);
}

.step-item.active {
  background: var(--color-primary-light);
  border-left-color: var(--color-primary);
}

.step-item.step-status-success {
  border-left-color: var(--color-success);
}

.step-item.step-status-failed {
  border-left-color: var(--color-error);
  background: var(--color-error-light);
}

.step-item.step-status-running {
  border-left-color: var(--color-primary);
  background: var(--color-primary-light);
}

.step-icon {
  font-size: var(--font-size-lg);
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-action {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.step-target {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/**
 * ============================================================================
 * STRATEGY PANEL
 * ============================================================================
 */

.strategy-panel {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.strategy-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.strategy-panel-header h4 {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.strategy-list {
  max-height: 300px;
  overflow-y: auto;
}

.strategy-item {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border-light);
}

.strategy-item:last-child {
  border-bottom: none;
}

.strategy-item.used {
  background: var(--color-success-light);
}

.strategy-item.not-found {
  opacity: 0.6;
}

.strategy-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.confidence {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.used-badge {
  font-size: var(--font-size-xs);
  padding: 1px 6px;
  background: var(--color-success);
  color: white;
  border-radius: var(--radius-sm);
}

.strategy-details {
  display: flex;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.strategy-details .status {
  color: var(--color-success);
}

.strategy-item.not-found .status {
  color: var(--color-error);
}

.strategy-details .error {
  color: var(--color-error);
}

.selector {
  margin-top: var(--space-2);
}

.selector code {
  display: block;
  padding: var(--space-2);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: var(--font-size-xs);
  overflow-x: auto;
  white-space: nowrap;
}

/**
 * ============================================================================
 * TEST LIST
 * ============================================================================
 */

.test-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.test-list--empty {
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8);
}

.test-list__empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-3);
}

.test-list__empty-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-2);
}

.test-list__empty-hint {
  color: var(--color-text-secondary);
}

.test-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.test-list__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.test-list__refresh {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-lg);
  opacity: 0.7;
}

.test-list__refresh:hover {
  opacity: 1;
}

.test-list__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.test-item {
  display: flex;
  align-items: center;
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.test-item:hover {
  background: var(--color-bg-tertiary);
}

.test-item.selected {
  background: var(--color-primary-light);
}

.test-item__info {
  flex: 1;
  cursor: pointer;
}

.test-item__name {
  font-weight: var(--font-weight-medium);
  display: block;
}

.test-item__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.test-item__actions {
  display: flex;
  gap: var(--space-1);
}

.test-item__run,
.test-item__delete {
  padding: var(--space-1);
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.6;
}

.test-item__run:hover,
.test-item__delete:hover {
  opacity: 1;
}

/**
 * ============================================================================
 * RUN SUMMARY
 * ============================================================================
 */

.run-summary {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
}

.run-summary.success {
  border: 2px solid var(--color-success);
}

.run-summary.warning {
  border: 2px solid var(--color-warning);
}

.run-summary.failure {
  border: 2px solid var(--color-error);
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.summary-header h3 {
  font-size: var(--font-size-lg);
}

.summary-stats {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.stat {
  text-align: center;
}

.stat.main .value {
  font-size: var(--font-size-xl);
}

.stat .value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  display: block;
}

.stat .label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.strategy-usage h4,
.failure-reasons h4 {
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-2);
}

.usage-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.usage-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.usage-bar .bar {
  flex: 1;
  height: 8px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.usage-bar .fill {
  height: 100%;
  background: var(--color-primary);
}

.usage-bar .count {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  min-width: 24px;
  text-align: right;
}

/**
 * ============================================================================
 * SETTINGS
 * ============================================================================
 */

.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.settings__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.settings__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.settings__section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.settings__services {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings__service {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}

.settings__service-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.settings__service-dot.ready {
  background: var(--color-success);
}

.settings__service-dot.not-ready {
  background: var(--color-error);
}

.settings__reinit {
  align-self: flex-start;
}

.settings__about {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/**
 * ============================================================================
 * LOADING & ERROR STATES
 * ============================================================================
 */

.loading-screen,
.error-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--space-6);
  text-align: center;
}

.loading-screen__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-4);
}

.loading-screen__message {
  color: var(--color-text-secondary);
}

.error-screen__icon {
  font-size: 48px;
  margin-bottom: var(--space-3);
}

.error-screen__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-error);
  margin-bottom: var(--space-2);
}

.error-screen__message {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
}

.error-screen__details {
  text-align: left;
  padding: var(--space-3);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  font-family: monospace;
  font-size: var(--font-size-xs);
  max-height: 150px;
  overflow: auto;
  margin-bottom: var(--space-4);
}

.error-boundary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--space-6);
  text-align: center;
}

.error-boundary__icon {
  font-size: 48px;
  margin-bottom: var(--space-3);
}

.error-boundary__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.error-boundary__message {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
}

.error-boundary__details {
  text-align: left;
  width: 100%;
  margin-bottom: var(--space-4);
}

.error-boundary__details summary {
  cursor: pointer;
  color: var(--color-text-muted);
}

.error-boundary__details pre {
  padding: var(--space-3);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  overflow: auto;
  max-height: 150px;
  margin-top: var(--space-2);
}

/**
 * ============================================================================
 * ANIMATIONS
 * ============================================================================
 */

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/**
 * ============================================================================
 * SCROLLBAR STYLING
 * ============================================================================
 */

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}
```

---

## Design System Summary

### Color Palette
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Primary | #6366f1 | #818cf8 | Buttons, links, active states |
| Success | #10b981 | #34d399 | Success states, ready indicators |
| Warning | #f59e0b | #fbbf24 | Warnings, paused states |
| Error | #ef4444 | #f87171 | Errors, recording indicator |

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Tight gaps |
| space-2 | 8px | Small gaps |
| space-3 | 12px | Medium gaps |
| space-4 | 16px | Section padding |
| space-6 | 24px | Large sections |

### Typography
| Token | Value | Usage |
|-------|-------|-------|
| font-size-xs | 10px | Badges, muted text |
| font-size-sm | 12px | Secondary text |
| font-size-base | 14px | Body text |
| font-size-lg | 16px | Headings |

---

## Acceptance Criteria

- [ ] CSS variables defined for all tokens
- [ ] Dark mode via media query
- [ ] App layout styles complete
- [ ] Button variants styled
- [ ] Recording controls styled
- [ ] Playback controls styled
- [ ] Action cards styled
- [ ] Step list styled
- [ ] Strategy panel styled
- [ ] Test list styled
- [ ] Run summary styled
- [ ] Settings page styled
- [ ] Loading/error states styled
- [ ] Animations defined
- [ ] Scrollbar styled
- [ ] No CSS errors in build

---

## Estimated Lines

600-700 lines
