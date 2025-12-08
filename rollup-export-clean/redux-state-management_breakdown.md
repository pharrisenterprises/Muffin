# Redux State Management - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Minimal Redux store providing global theme state management (dark/light mode toggle). Currently the **only** Redux slice in the application.

**Where it lives:**
- `src/redux/store.ts` - Store configuration
- `src/redux/themeSlice.ts` - Theme slice reducer
- `src/redux/selector/` - State selectors (if any)

**Why it exists:** Provides centralized theme state accessible across all components without prop drilling. Originally intended for broader state management but currently underutilized.

---

## Inputs
**Actions:**
```typescript
toggleTheme()        // Switches between light ↔ dark
setTheme(mode: 'light' | 'dark')  // Sets specific theme
```

**Initial State:**
```typescript
{
  theme: {
    mode: 'dark'  // Default dark mode
  }
}
```

---

## Outputs
**State Shape:**
```typescript
RootState = {
  theme: {
    mode: 'light' | 'dark'
  }
}
```

**Exported Hooks:**
```typescript
useSelector((state: RootState) => state.theme.mode)
useDispatch()
```

---

## Internal Architecture

### Store Setup
```typescript
// store.ts
import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer
    // NOTE: Only one reducer - no other slices defined
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Theme Slice
```typescript
// themeSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ThemeState {
  mode: 'light' | 'dark';
}

const initialState: ThemeState = {
  mode: 'dark'  // Default dark mode
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.mode = action.payload;
    }
  }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
```

### Usage in Components
```typescript
// Header.tsx (hypothetical)
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme } from '../redux/themeSlice';
import type { RootState } from '../redux/store';

function Header() {
  const theme = useSelector((state: RootState) => state.theme.mode);
  const dispatch = useDispatch();

  return (
    <button onClick={() => dispatch(toggleTheme())}>
      {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
    </button>
  );
}
```

### Provider Setup
```typescript
// App.tsx
import { Provider } from 'react-redux';
import { store } from './redux/store';

function App() {
  return (
    <Provider store={store}>
      <Router />
    </Provider>
  );
}
```

---

## Critical Dependencies
**Upstream:**
- **App.tsx** - Wraps app in Redux Provider
- **Header/Layout components** - Consume theme state

**Downstream:**
- **@reduxjs/toolkit** - Simplified Redux API
- **react-redux** - React bindings (Provider, useSelector, useDispatch)

**External:**
- **@reduxjs/toolkit** (npm) - Redux Toolkit library
- **react-redux** (npm) - React-Redux bindings

---

## Hidden Assumptions
1. **No persistence** - Theme resets to dark on page reload
2. **Single store** - No store hydration/persistence mechanism
3. **Minimal usage** - Redux Toolkit imported but only used for theme (overkill)
4. **Dark mode default** - Starts in dark mode regardless of system preference
5. **No middleware** - No custom middleware, no async actions
6. **No DevTools config** - Redux DevTools not explicitly configured
7. **Type-safe selectors** - RootState typed, but no createSelector usage

---

## Stability Concerns

### High-Risk Patterns
1. **Theme not persisted**
   ```typescript
   // User toggles to light mode, refreshes page
   // → Resets to dark (no localStorage)
   ```

2. **Unused infrastructure**
   ```typescript
   // Redux Toolkit imported for single boolean state
   // Could use: useState + localStorage + Context
   ```

3. **No system preference detection**
   ```typescript
   // Ignores window.matchMedia('(prefers-color-scheme: dark)')
   // Always defaults to dark
   ```

4. **Overkill for use case**
   ```typescript
   // Redux store for theme-only = ~50KB bundle size
   // Context + localStorage = ~1KB
   ```

### Failure Modes
- **Store not provided** - Components using useSelector crash
- **Slice name collision** - If future slices use 'theme' name
- **Type mismatch** - Incorrect RootState type breaks selectors

---

## Edge Cases

### Input Variations
1. **Multiple rapid toggles**
   ```typescript
   dispatch(toggleTheme());
   dispatch(toggleTheme());
   dispatch(toggleTheme());
   // All batched by React, final state correct
   ```

2. **Direct setTheme with invalid value**
   ```typescript
   dispatch(setTheme('blue' as any));  // TypeScript error
   // Runtime: Sets to 'blue', may break UI
   ```

3. **Provider missing**
   ```typescript
   // If <Provider> not in App.tsx
   useSelector(...);  // Throws "could not find react-redux context"
   ```

4. **Store reset**
   ```typescript
   // No built-in way to reset store
   // Must reload page or manually dispatch setTheme('dark')
   ```

---

## Developer-Must-Know Notes
- **Redux is OVERKILL** for this use case (useState + localStorage better)
- **Only themeSlice exists** - No other slices defined (projects, recordings, etc. use IndexedDB)
- **Store provided in App.tsx** via `<Provider store={store}>`
- **No persistence** - Could be replaced with:
  ```typescript
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  useEffect(() => localStorage.setItem('theme', theme), [theme]);
  ```
- **No Redux DevTools integration** - Could be configured via `configureStore({ devTools: true })`
- **Type-safe** - RootState and AppDispatch exported for TypeScript safety
- **No async actions** - All actions synchronous (no Redux Thunk/Saga)

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **UI-001** | Low | Theme state affects UI design system color scheme |
| **H1** | Low | Tailwind classes respond to theme state (dark: prefix) |

### Specification Mapping
- **H1** (UI Design System) - Theme toggle controls light/dark Tailwind classes
- **H2** (User Experience) - Persistent theme preference improves UX (NOT IMPLEMENTED)

### Evidence References
- Code: `src/redux/store.ts` (10 lines - store config)
- Code: `src/redux/themeSlice.ts` (30 lines - theme reducer)
- UI: Theme toggle button in header (if implemented)

### Integration Risks
1. **Over-Engineering:** Redux for theme-only is excessive (alternative: React Context + localStorage)
2. **No Persistence:** Theme resets on page reload (localStorage integration missing)
3. **Unused Capacity:** Redux Toolkit imported but majority of features unused
4. **Type Safety:** Manual RootState typing required (easy to drift from actual state shape)

---

## Recommendations for Future Refactoring
1. **Option A:** Remove Redux entirely, replace with:
   ```typescript
   // ThemeContext.tsx
   const ThemeContext = createContext<ThemeContextType>(null);
   
   export function ThemeProvider({ children }) {
     const [theme, setTheme] = useState(
       localStorage.getItem('theme') || 'dark'
     );
     
     useEffect(() => {
       localStorage.setItem('theme', theme);
     }, [theme]);
     
     return (
       <ThemeContext.Provider value={{ theme, setTheme }}>
         {children}
       </ThemeContext.Provider>
     );
   }
   ```

2. **Option B:** If Redux stays, add:
   - localStorage persistence middleware
   - System preference detection
   - Redux DevTools configuration
   - Additional slices for projects/recordings

---

## Related Components
- **UI Design System** (`ui-design-system_breakdown.md`) - Consumes theme state for color scheme
- **Layout** (`router-navigation_breakdown.md`) - May include theme toggle button
- **App.tsx** - Provides Redux store via `<Provider>`
