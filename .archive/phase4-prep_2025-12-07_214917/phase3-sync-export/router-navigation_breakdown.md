# Router Navigation Breakdown

## Purpose
**What it does:** Defines client-side routing structure for the extension's React UI using React Router v6. Maps URL hash paths to page components and wraps them in a shared Layout component.

**Where it lives:** `src/routes/Router.tsx` (~50 lines)

**Why it exists:** Chrome extensions use hash-based routing (`#/dashboard`) instead of traditional paths due to file:// protocol limitations. This component centralizes route configuration.

## Inputs
**Data Requirements:**
- React Router context (provided by `<HashRouter>` in App.tsx)
- URL hash path (e.g., `index.html#/recorder?project=123`)

**Route Parameters:**
- `/recorder?project=<id>` - Project ID for recording session
- `/fieldMapper?project=<id>` - Project ID for field mapping
- `/testRunner?project=<id>` - Project ID for test execution

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

## Internal Architecture

### Code Structure
```typescript
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

      {/* Commented out authentication route */}
      {/* <Route
        path="/sign-in"
        element={
          <Section>
            <Signin />
          </Section>
        }
      /> */}

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
            <FieldMapper/>
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

### Route Flow
```
User navigates to: pages.html#/recorder?project=123

1. <HashRouter> parses hash path
2. <Routes> matches "/recorder" route
3. Renders: <Layout><Recorder /></Layout>
4. Recorder component reads query param: project=123
5. Loads project data from IndexedDB
6. Renders recording interface
```

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

## Hidden Assumptions
1. **Hash routing only** - Uses `#/path` not `/path` (extension limitation)
2. **No lazy loading** - All components imported synchronously
3. **No route guards** - No authentication checks (Signin route commented out)
4. **No 404 handling** - No catch-all route for invalid paths
5. **Layout for all main pages** - Assumes Dashboard/Recorder/etc need header/sidebar
6. **Query params handled in pages** - Router doesn't parse `?project=123`
7. **Single HashRouter instance** - Assumes App.tsx provides router context
8. **No nested routes** - Flat route structure only

## Stability Concerns
### High-Risk Patterns
1. **No 404 fallback**
   ```typescript
   // User navigates to #/invalid-route
   → Blank page (no route matches)
   // Should have: <Route path="*" element={<NotFound />} />
   ```

2. **Commented authentication logic**
   ```typescript
   // Sign-in route commented out but Signin component imported
   // Dead code, confusing intent
   ```

3. **Layout wrapper duplication** - Every route repeats `<Layout>`
   ```typescript
   // Repetitive pattern across 4 routes
   // Could use nested routes to DRY up
   ```

4. **No loading states between routes** - Instant transitions
   ```typescript
   // Large pages (Dashboard, TestRunner) may take time to render
   // No progress indicator during navigation
   ```

### Failure Modes
- **Invalid route** → Blank page, no feedback
- **Missing Layout** → Page renders without header/sidebar (if Layout import fails)
- **Query param typos** → Pages fail silently (e.g., `?projct=123`)
- **Hash routing disabled** → Routes don't work (if HashRouter missing in App)

## Edge Cases
### Input Variations
1. **Root path** (`#/`)
   ```typescript
   → Renders <Loader /> component
   // May loop indefinitely if loader doesn't redirect
   ```

2. **Deep links with query params**
   ```typescript
   pages.html#/recorder?project=abc&step=5
   → Recorder receives full query string
   ```

3. **Invalid query params**
   ```typescript
   #/testRunner?project=invalid-id
   → TestRunner fails to load project (handled in component)
   ```

4. **Navigation between routes**
   ```typescript
   // Dashboard → Recorder → TestRunner
   // Each mount/unmount may have side effects
   ```

5. **Back/forward browser navigation**
   ```typescript
   // Hash history preserved
   // Browser back button works correctly
   ```

## Developer-Must-Know Notes
### Quick Context
This is a **minimal router configuration** with flat structure. No authentication, no lazy loading, no error boundaries. It's straightforward but lacks production-readiness features like 404 handling and loading states.

### Common Issues
1. **Why is my page blank after clicking a link?**
   - Route not defined in Router.tsx
   - Typo in path (case-sensitive)
   - **Fix:** Add route or check path spelling

2. **Why aren't query params working?**
   - Router doesn't parse query params
   - Pages must use `useSearchParams()` hook to read them
   - **Fix:** Import `useSearchParams` from react-router-dom in page component

3. **Why is Layout rendering on root path?**
   - Root route uses `<Section>` not `<Layout>`
   - Intentional design (loader has no UI chrome)
   - **Fix:** N/A - working as designed

### Integration Points
**Used By:**
- `App.tsx` - Wraps Router in `<HashRouter>`

**Uses:**
- Page components (Dashboard, Recorder, FieldMapper, TestRunner)
- Layout wrapper component
- Section wrapper component

### Performance Notes
- **No code splitting** - All page components bundled upfront (~500KB)
- **Route transitions instant** - No loading indicators
- **No route memoization** - Components re-render on every navigation

### Testing Guidance
**Mock Requirements:**
```typescript
import { MemoryRouter } from 'react-router-dom';

// Wrap Router in test router
<MemoryRouter initialEntries={['/dashboard']}>
  <Router />
</MemoryRouter>
```

**Test Cases to Cover:**
1. ✅ Root path renders Loader
2. ✅ /dashboard renders Dashboard in Layout
3. ✅ /recorder renders Recorder with query params
4. ✅ /fieldMapper renders FieldMapper
5. ✅ /testRunner renders TestRunner
6. ✅ Invalid path renders nothing (no 404 yet)
7. ✅ Navigation between routes works
8. ✅ Browser back button works

### Future Improvements
1. **Nested routes** - DRY up Layout wrapper
   ```typescript
   <Route path="/" element={<Layout />}>
     <Route path="dashboard" element={<Dashboard />} />
     <Route path="recorder" element={<Recorder />} />
     // ... etc
   </Route>
   ```

2. **404 catch-all** - Handle invalid routes
   ```typescript
   <Route path="*" element={<NotFound />} />
   ```

3. **Lazy loading** - Code split pages
   ```typescript
   const Dashboard = lazy(() => import('../pages/Dashboard'));
   // Wrap in <Suspense>
   ```

4. **Route guards** - Protect authenticated routes
   ```typescript
   <Route element={<RequireAuth />}>
     <Route path="/dashboard" element={<Dashboard />} />
   </Route>
   ```

5. **Loading states** - Show progress during navigation
   ```typescript
   <Suspense fallback={<RouteLoader />}>
     <Outlet />
   </Suspense>
   ```

6. **Type-safe routes** - Avoid string typos
   ```typescript
   const routes = {
     dashboard: '/dashboard',
     recorder: (id: string) => `/recorder?project=${id}`
   };
   ```

7. **Route metadata** - Titles, breadcrumbs
   ```typescript
   <Route path="/dashboard" element={<Dashboard />} handle={{ title: 'Dashboard' }} />
   ```
