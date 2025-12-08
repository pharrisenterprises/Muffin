# Router Navigation - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Defines client-side routing structure for the extension's React UI using React Router v6. Maps URL hash paths to page components and wraps them in shared Layout component.

**Where it lives:** `src/routes/Router.tsx` (~50 lines)

**Why it exists:** Chrome extensions use hash-based routing (`#/dashboard`) instead of traditional paths due to `file://` protocol limitations. This component centralizes route configuration.

---

## Inputs
**Data Requirements:**
- React Router context (provided by `<HashRouter>` in App.tsx)
- URL hash path (e.g., `pages.html#/recorder?project=123`)

**Route Parameters:**
- `/recorder?project=<id>` - Project ID for recording session
- `/fieldMapper?project=<id>` - Project ID for field mapping
- `/testRunner?project=<id>` - Project ID for test execution

---

## Outputs
**Rendered Components:**
- `/` → `<Loader />` (initial loading state)
- `/dashboard` → `<Dashboard />` (project list)
- `/recorder` → `<Recorder />` (event recording UI)
- `/fieldMapper` → `<FieldMapper />` (CSV mapping)
- `/testRunner` → `<TestRunner />` (test execution)

**All routes wrapped in:**
- `<Section>` for root route (no layout)
- `<Layout>` for authenticated routes (header + sidebar)

---

## Internal Architecture

### Code Structure
```typescript
// Router.tsx
import { Route, Routes } from "react-router-dom";
import Section from "../pages/Section";
import Loader from "../components/Loader/Loader";
import Dashboard from "../pages/Dashboard";
import Layout from "../pages/Layout";
import Recorder from "../pages/Recorder";
import FieldMapper from "../pages/FieldMapper";
import TestRunner from "../pages/TestRunner";

const Router = () => {
  return (
    <Routes>
      {/* Root route - Initial loading */}
      <Route
        path="/"
        element={
          <Section>
            <Loader />
          </Section>
        }
      />

      {/* Dashboard - Project management */}
      <Route
        path="/dashboard"
        element={
          <Layout>
            <Dashboard />
          </Layout>
        }
      />

      {/* Recorder - Event capture */}
      <Route
        path="/recorder"
        element={
          <Layout>
            <Recorder />
          </Layout>
        }
      />

      {/* Field Mapper - CSV to field mapping */}
      <Route
        path="/fieldMapper"
        element={
          <Layout>
            <FieldMapper />
          </Layout>
        }
      />

      {/* Test Runner - Playback execution */}
      <Route
        path="/testRunner"
        element={
          <Layout>
            <TestRunner />
          </Layout>
        }
      />
    </Routes>
  );
};

export default Router;
```

### Route Flow Example
```
User navigates to: pages.html#/recorder?project=123

1. <HashRouter> parses hash path
2. <Routes> matches "/recorder" route
3. Renders: <Layout><Recorder /></Layout>
4. Recorder component reads query param: project=123 (via useSearchParams)
5. Loads project data from IndexedDB
6. Renders recording interface
```

### App.tsx Integration
```typescript
// App.tsx
import { HashRouter } from 'react-router-dom';
import Router from './routes/Router';

function App() {
  return (
    <HashRouter>
      <Router />
    </HashRouter>
  );
}
```

---

## Critical Dependencies
**Upstream:**
- **App.tsx** - Wraps Router in `<HashRouter>`
- **Browser location API** - Hash change events

**Downstream:**
- **Layout component** - Shared header/sidebar wrapper
- **Page components** - Dashboard, Recorder, FieldMapper, TestRunner
- **Section component** - Simple wrapper for root route

**External:**
- **react-router-dom v6** - Routing library
  - `<Routes>` - Route container
  - `<Route>` - Individual route definition
  - `<HashRouter>` - Hash-based router (in App.tsx)
  - `useNavigate()` - Programmatic navigation hook
  - `useSearchParams()` - Query param parsing hook

---

## Hidden Assumptions
1. **Hash routing only** - Uses `#/path` not `/path` (extension limitation)
2. **No lazy loading** - All components imported synchronously (no React.lazy)
3. **No route guards** - No authentication checks (Signin route commented out)
4. **No 404 handling** - No catch-all route for invalid paths (falls through to blank)
5. **Layout for all main pages** - Assumes Dashboard/Recorder/etc need header/sidebar
6. **Query params handled in pages** - Router doesn't parse `?project=123`, pages use useSearchParams
7. **Single HashRouter instance** - Assumes App.tsx provides router context
8. **No nested routes** - Flat route structure only (no /dashboard/settings)
9. **No route animations** - Instant transitions between pages

---

## Stability Concerns

### High-Risk Patterns
1. **No 404 route**
   ```typescript
   // User navigates to #/invalid-path
   // → Blank page (no error message or redirect)
   ```

2. **Commented authentication route**
   ```typescript
   {/* <Route path="/sign-in" element={<Signin />} /> */}
   // Implies authentication planned but not implemented
   ```

3. **No lazy loading**
   ```typescript
   import Dashboard from '../pages/Dashboard';  // All pages in main bundle
   // Should use: const Dashboard = React.lazy(() => import('../pages/Dashboard'));
   ```

4. **Query param parsing in pages**
   ```typescript
   // Each page must call useSearchParams()
   // No centralized param validation
   ```

### Failure Modes
- **Invalid route** - Shows blank page (no error boundary)
- **Missing query param** - Page must handle undefined project ID
- **Browser back button** - May break if pages don't handle state cleanup
- **Hash collision** - Site with own hash routing may conflict

---

## Edge Cases

### Input Variations
1. **Missing query param**
   ```typescript
   // Navigate to #/recorder (no ?project=123)
   // Recorder must handle null project ID
   ```

2. **Invalid project ID**
   ```typescript
   // #/recorder?project=9999 (doesn't exist)
   // Page must validate ID and handle not found
   ```

3. **Malformed hash**
   ```typescript
   // #/recorder/extra/segments
   // Router doesn't match → Blank page
   ```

4. **Multiple query params**
   ```typescript
   // #/testRunner?project=5&run=10
   // useSearchParams() in page handles parsing
   ```

5. **Root path behavior**
   ```typescript
   // Navigate to pages.html or pages.html#/
   // Shows <Loader /> component
   ```

---

## Developer-Must-Know Notes
- **Hash routing required** - Chrome extensions cannot use BrowserRouter (file:// protocol)
- **No lazy loading** - All page components loaded upfront (consider React.lazy for optimization)
- **Layout wrapper** - All main pages (Dashboard/Recorder/etc) share Layout (header + sidebar)
- **Section wrapper** - Root route uses Section (simple wrapper, no header/sidebar)
- **Query params** - Pages must use `useSearchParams()` hook to read `?project=<id>`
- **Navigation** - Use `navigate('/path')` from `useNavigate()` hook
- **No auth guards** - Signin route commented out, no authentication system
- **No 404 page** - Invalid routes show blank (should add catch-all route)

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **UI-001** | High | Router controls page navigation throughout workflow |
| **B1** | Critical | Recording Workflow (Dashboard → Recorder → FieldMapper → TestRunner) relies on routing |
| **H2** | Medium | User Experience specification requires smooth navigation between phases |

### Specification Mapping
- **B1** (Recording Workflow) - Maps workflow phases to routes
- **D2** (Project Management) - `/dashboard` hosts project CRUD operations
- **H1** (UI Design System) - Layout wrapper provides consistent UI chrome
- **H2** (User Experience) - Hash routing enables back/forward navigation

### Evidence References
- Code: `src/routes/Router.tsx` (50 lines - route definitions)
- Code: `src/App.tsx` (HashRouter provider)
- Test: Manual navigation (Dashboard → Recorder → FieldMapper → TestRunner)

### Integration Risks
1. **No 404 Handling:** Invalid routes show blank page (UX gap)
2. **No Lazy Loading:** All pages in main bundle (performance impact)
3. **Query Param Validation:** Each page must validate `?project=<id>` independently (duplication)
4. **No Auth Guards:** Commented Signin route suggests authentication planned but not implemented

---

## Recommendations for Future Enhancement
1. **Add 404 route:**
   ```typescript
   <Route path="*" element={<NotFound />} />
   ```

2. **Implement lazy loading:**
   ```typescript
   const Dashboard = React.lazy(() => import('../pages/Dashboard'));
   // Wrap routes in <Suspense fallback={<Loader />}>
   ```

3. **Add route guards:**
   ```typescript
   <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
   ```

4. **Centralize query param parsing:**
   ```typescript
   // Higher-order component to validate project ID
   function withProjectId(Component) { ... }
   ```

---

## Related Components
- **App.tsx** - Provides HashRouter context
- **Layout** - Wrapper component for authenticated routes
- **Dashboard UI** (`dashboard-ui_breakdown.md`) - Root page for project management
- **Recorder UI** (`recorder-ui_breakdown.md`) - Recording phase page
- **Field Mapper UI** (`field-mapper-ui_breakdown.md`) - Mapping phase page
- **Test Runner UI** (`test-runner-ui_breakdown.md`) - Execution phase page
