# App.tsx Specification

**File ID:** G7  
**File Path:** `src/pages/App.tsx`  
**Status:** CREATE (or MODIFY if exists)  
**Priority:** P0

---

## Purpose

Main React application component that serves as the entry point for the popup UI. Manages navigation between Recorder, TestRunner, and Settings views, handles service initialization status, provides global error boundary, and coordinates state between child components. Acts as the shell container for all popup functionality.

---

## Dependencies

### Uses (imports from)
- `react`: React, useState, useEffect, useCallback
- `./Recorder`: Recorder component
- `./TestRunner`: TestRunner component
- `../components/StrategyBadge`: StrategyLegend
- `../types/strategy`: CapturedAction

### Used By (exports to)
- `./popup.tsx`: Root render

---

## Interfaces

```typescript
import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { Recorder } from './Recorder';
import { TestRunner } from './TestRunner';
import { StrategyLegend } from '../components/StrategyBadge';
import { CapturedAction } from '../types/strategy';

/**
 * Navigation tabs
 */
type TabId = 'recorder' | 'runner' | 'tests' | 'settings';

/**
 * Tab definition
 */
interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

/**
 * Service status from background
 */
interface ServiceStatus {
  initialized: boolean;
  services: {
    cdp: boolean;
    accessibility: boolean;
    locators: boolean;
    autoWaiting: boolean;
    vision: boolean;
    decisionEngine: boolean;
    telemetry: boolean;
    chainGenerator: boolean;
  };
}

/**
 * Saved test recording
 */
interface SavedTest {
  id: string;
  name: string;
  actions: CapturedAction[];
  metadata: {
    savedAt: number;
    actionCount: number;
    version: string;
  };
}

/**
 * App state
 */
interface AppState {
  activeTab: TabId;
  serviceStatus: ServiceStatus | null;
  isLoading: boolean;
  error: string | null;
  savedTests: SavedTest[];
  selectedTest: SavedTest | null;
  recordedActions: CapturedAction[];
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}
```

---

## Component Implementation

```typescript
/**
 * Tab definitions
 */
const TABS: Tab[] = [
  { id: 'recorder', label: 'Record', icon: '⏺️' },
  { id: 'runner', label: 'Run', icon: '▶️' },
  { id: 'tests', label: 'Tests', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

/**
 * Error Boundary Component
 */
class ErrorBoundary extends React.Component<
  { children: ReactNode; onReset: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Muffin Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__icon">❌</div>
          <h2 className="error-boundary__title">Something went wrong</h2>
          <p className="error-boundary__message">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <details className="error-boundary__details">
            <summary>Error Details</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
          <button
            className="error-boundary__button"
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              this.props.onReset();
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Main App Component
 */
export function App(): JSX.Element {
  // State
  const [state, setState] = useState<AppState>({
    activeTab: 'recorder',
    serviceStatus: null,
    isLoading: true,
    error: null,
    savedTests: [],
    selectedTest: null,
    recordedActions: []
  });

  // Initialize on mount
  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize app and check service status
   */
  async function initializeApp(): Promise<void> {
    try {
      // Check service status
      const response = await chrome.runtime.sendMessage({
        action: 'GET_SERVICE_STATUS'
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          serviceStatus: response.status,
          isLoading: false
        }));
      } else {
        throw new Error(response.error || 'Failed to get service status');
      }

      // Load saved tests
      await loadSavedTests();

    } catch (error) {
      console.error('App initialization error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      }));
    }
  }

  /**
   * Load saved tests from storage
   */
  async function loadSavedTests(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'LIST_RECORDINGS'
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          savedTests: response.recordings || []
        }));
      }
    } catch (error) {
      console.error('Failed to load saved tests:', error);
    }
  }

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((tabId: TabId) => {
    setState(prev => ({ ...prev, activeTab: tabId }));
  }, []);

  /**
   * Handle recording complete
   */
  const handleRecordingComplete = useCallback((actions: CapturedAction[]) => {
    setState(prev => ({
      ...prev,
      recordedActions: actions
    }));
  }, []);

  /**
   * Handle save recording
   */
  const handleSaveRecording = useCallback(async (name: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'SAVE_RECORDING',
        payload: {
          name,
          actions: state.recordedActions,
          metadata: {
            version: 'v2'
          }
        }
      });

      if (response.success) {
        await loadSavedTests();
        setState(prev => ({
          ...prev,
          recordedActions: []
        }));
      }
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  }, [state.recordedActions]);

  /**
   * Handle test selection
   */
  const handleTestSelect = useCallback(async (testId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'LOAD_RECORDING',
        payload: { id: testId }
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          selectedTest: response.recording,
          activeTab: 'runner'
        }));
      }
    } catch (error) {
      console.error('Failed to load test:', error);
    }
  }, []);

  /**
   * Handle test deletion
   */
  const handleTestDelete = useCallback(async (testId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'DELETE_RECORDING',
        payload: { id: testId }
      });

      if (response.success) {
        await loadSavedTests();
        if (state.selectedTest?.id === testId) {
          setState(prev => ({ ...prev, selectedTest: null }));
        }
      }
    } catch (error) {
      console.error('Failed to delete test:', error);
    }
  }, [state.selectedTest?.id]);

  /**
   * Handle error reset
   */
  const handleErrorReset = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    initializeApp();
  }, []);

  /**
   * Retry service initialization
   */
  const handleRetryInit = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await chrome.runtime.sendMessage({
        action: 'REINITIALIZE_SERVICES'
      });
      await initializeApp();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Retry failed'
      }));
    }
  }, []);

  // Loading state
  if (state.isLoading) {
    return <LoadingScreen message="Initializing Muffin..." />;
  }

  // Error state
  if (state.error) {
    return (
      <ErrorScreen
        message={state.error}
        onRetry={handleRetryInit}
      />
    );
  }

  // Service not initialized
  if (!state.serviceStatus?.initialized) {
    return (
      <ErrorScreen
        message="Services failed to initialize"
        details={formatServiceStatus(state.serviceStatus)}
        onRetry={handleRetryInit}
      />
    );
  }

  return (
    <ErrorBoundary onReset={handleErrorReset}>
      <div className="app">
        {/* Header */}
        <header className="app-header">
          <div className="app-header__logo">
            <span className="app-header__icon">🧁</span>
            <span className="app-header__title">Muffin</span>
          </div>
          <ServiceStatusIndicator status={state.serviceStatus} />
        </header>

        {/* Tab Navigation */}
        <nav className="app-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`app-nav__tab ${state.activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="app-nav__icon">{tab.icon}</span>
              <span className="app-nav__label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main className="app-content">
          {state.activeTab === 'recorder' && (
            <Recorder
              onRecordingComplete={handleRecordingComplete}
              onSave={handleSaveRecording}
              recordedActions={state.recordedActions}
            />
          )}

          {state.activeTab === 'runner' && (
            <TestRunner
              test={state.selectedTest}
              onClose={() => setState(prev => ({ ...prev, selectedTest: null }))}
            />
          )}

          {state.activeTab === 'tests' && (
            <TestList
              tests={state.savedTests}
              selectedId={state.selectedTest?.id}
              onSelect={handleTestSelect}
              onDelete={handleTestDelete}
              onRefresh={loadSavedTests}
            />
          )}

          {state.activeTab === 'settings' && (
            <Settings
              serviceStatus={state.serviceStatus}
              onReinitialize={handleRetryInit}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <span className="app-footer__version">v2.0.0</span>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

/**
 * Loading Screen Component
 */
function LoadingScreen({ message }: { message: string }): JSX.Element {
  return (
    <div className="loading-screen">
      <div className="loading-screen__spinner"></div>
      <p className="loading-screen__message">{message}</p>
    </div>
  );
}

/**
 * Error Screen Component
 */
function ErrorScreen({
  message,
  details,
  onRetry
}: {
  message: string;
  details?: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <div className="error-screen">
      <div className="error-screen__icon">⚠️</div>
      <h2 className="error-screen__title">Error</h2>
      <p className="error-screen__message">{message}</p>
      {details && (
        <pre className="error-screen__details">{details}</pre>
      )}
      <button className="error-screen__button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

/**
 * Service Status Indicator
 */
function ServiceStatusIndicator({ status }: { status: ServiceStatus }): JSX.Element {
  const allReady = Object.values(status.services).every(Boolean);
  const readyCount = Object.values(status.services).filter(Boolean).length;
  const totalCount = Object.values(status.services).length;

  return (
    <div className={`service-status ${allReady ? 'ready' : 'partial'}`}>
      <span className="service-status__dot"></span>
      <span className="service-status__text">
        {allReady ? 'Ready' : `${readyCount}/${totalCount}`}
      </span>
    </div>
  );
}

/**
 * Test List Component
 */
function TestList({
  tests,
  selectedId,
  onSelect,
  onDelete,
  onRefresh
}: {
  tests: SavedTest[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}): JSX.Element {
  if (tests.length === 0) {
    return (
      <div className="test-list test-list--empty">
        <div className="test-list__empty-icon">📭</div>
        <p className="test-list__empty-text">No saved tests yet</p>
        <p className="test-list__empty-hint">
          Record some actions and save them as a test
        </p>
      </div>
    );
  }

  return (
    <div className="test-list">
      <div className="test-list__header">
        <h3 className="test-list__title">Saved Tests ({tests.length})</h3>
        <button className="test-list__refresh" onClick={onRefresh} title="Refresh">
          🔄
        </button>
      </div>

      <div className="test-list__items">
        {tests.map(test => (
          <div
            key={test.id}
            className={`test-item ${selectedId === test.id ? 'selected' : ''}`}
          >
            <div className="test-item__info" onClick={() => onSelect(test.id)}>
              <span className="test-item__name">{test.name}</span>
              <span className="test-item__meta">
                {test.metadata.actionCount} actions •{' '}
                {formatDate(test.metadata.savedAt)}
              </span>
            </div>
            <div className="test-item__actions">
              <button
                className="test-item__run"
                onClick={() => onSelect(test.id)}
                title="Run test"
              >
                ▶️
              </button>
              <button
                className="test-item__delete"
                onClick={() => {
                  if (confirm(`Delete "${test.name}"?`)) {
                    onDelete(test.id);
                  }
                }}
                title="Delete test"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Settings Component
 */
function Settings({
  serviceStatus,
  onReinitialize
}: {
  serviceStatus: ServiceStatus;
  onReinitialize: () => void;
}): JSX.Element {
  return (
    <div className="settings">
      <h3 className="settings__title">Settings</h3>

      <section className="settings__section">
        <h4 className="settings__section-title">Service Status</h4>
        <div className="settings__services">
          {Object.entries(serviceStatus.services).map(([name, ready]) => (
            <div key={name} className="settings__service">
              <span className={`settings__service-dot ${ready ? 'ready' : 'not-ready'}`}></span>
              <span className="settings__service-name">{formatServiceName(name)}</span>
            </div>
          ))}
        </div>
        <button className="settings__reinit" onClick={onReinitialize}>
          Reinitialize Services
        </button>
      </section>

      <section className="settings__section">
        <h4 className="settings__section-title">Strategy Legend</h4>
        <StrategyLegend compact />
      </section>

      <section className="settings__section">
        <h4 className="settings__section-title">About</h4>
        <p className="settings__about">
          Muffin v2.0.0<br />
          7-tier fallback strategy system<br />
          Multi-layer recording
        </p>
      </section>
    </div>
  );
}

/**
 * Format service status for display
 */
function formatServiceStatus(status: ServiceStatus | null): string {
  if (!status) return 'No status available';
  
  return Object.entries(status.services)
    .map(([name, ready]) => `${name}: ${ready ? '✓' : '✗'}`)
    .join('\n');
}

/**
 * Format service name for display
 */
function formatServiceName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString();
}

export default App;
```

---

## Component Structure

```
App
├── ErrorBoundary (catches React errors)
│   └── div.app
│       ├── header.app-header
│       │   ├── Logo
│       │   └── ServiceStatusIndicator
│       ├── nav.app-nav
│       │   └── Tab buttons
│       ├── main.app-content
│       │   ├── Recorder (tab: recorder)
│       │   ├── TestRunner (tab: runner)
│       │   ├── TestList (tab: tests)
│       │   └── Settings (tab: settings)
│       └── footer.app-footer
```

---

## State Management

### App State
| Property | Type | Purpose |
|----------|------|---------|
| activeTab | TabId | Current navigation tab |
| serviceStatus | ServiceStatus | Background service health |
| isLoading | boolean | Initial loading state |
| error | string | Error message |
| savedTests | SavedTest[] | List of saved recordings |
| selectedTest | SavedTest | Currently selected test |
| recordedActions | CapturedAction[] | Actions from current recording |

### State Flow
1. App mounts → initializeApp()
2. Checks service status from background
3. Loads saved tests from storage
4. User navigates tabs, records, runs tests
5. State updates trigger re-renders

---

## Usage Example

```typescript
// src/pages/popup.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './popup.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
```

---

## Acceptance Criteria

- [ ] App initializes and checks service status
- [ ] Loading screen shows during initialization
- [ ] Error screen shows on initialization failure
- [ ] Tab navigation works between all 4 tabs
- [ ] Recorder tab shows Recorder component
- [ ] Runner tab shows TestRunner component
- [ ] Tests tab lists saved recordings
- [ ] Settings tab shows service status and legend
- [ ] Error boundary catches React errors
- [ ] Service status indicator shows readiness
- [ ] Tests can be selected, run, and deleted
- [ ] Recordings can be saved with name
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Services not ready**: Show error with retry
2. **No saved tests**: Show empty state
3. **Test load fails**: Show error message
4. **Tab switch during operation**: Preserve state
5. **Rapid tab switching**: Debounce renders
6. **Background script crash**: Handle reconnection
7. **Storage quota exceeded**: Warn user
8. **Very many saved tests**: Virtual scroll
9. **Long test names**: Truncate with ellipsis
10. **Popup closed during operation**: State lost (expected)

---

## Estimated Lines

400-500 lines
