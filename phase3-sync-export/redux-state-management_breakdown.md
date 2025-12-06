# Redux State Management Breakdown

## Purpose
**What it does:** Minimal Redux store for global theme state management (dark/light mode toggle).

**Where it lives:** 
- `src/redux/store.ts` - Store configuration
- `src/redux/themeSlice.ts` - Theme slice reducer
- `src/redux/selector/` - State selectors

**Why it exists:** Provides centralized theme state accessible across all components without prop drilling.

## Current Usage
**VERY LIMITED** - Only used for theme management. Most state is local (useState) or in IndexedDB.

## Internal Architecture
**Store Setup:**
```typescript
// store.ts
import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**Theme Slice:**
```typescript
// themeSlice.ts
import { createSlice } from '@reduxjs/toolkit';

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
    setTheme: (state, action) => {
      state.mode = action.payload;
    }
  }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
```

**Usage in Components:**
```typescript
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme } from '../redux/themeSlice';

function Header() {
  const theme = useSelector((state: RootState) => state.theme.mode);
  const dispatch = useDispatch();
  
  return (
    <button onClick={() => dispatch(toggleTheme())}>
      {theme === 'light' ? '🌙' : '☀️'} Toggle Theme
    </button>
  );
}
```

## Critical Dependencies
- **@reduxjs/toolkit** - Simplified Redux API
- **react-redux** - React bindings (Provider, useSelector, useDispatch)

## Hidden Assumptions
1. **No persistence** - Theme resets on page reload
2. **Single store** - No store hydration/persistence
3. **Minimal usage** - Over-engineered for theme-only state
4. **Dark mode default** - Starts in dark mode

## Stability Concerns
- **Theme not persisted** - Resets to dark on every page load
- **Unused infrastructure** - Redux Toolkit imported but barely used
- **Should use localStorage** - Theme preference should persist

## Developer-Must-Know Notes
- Redux is **overkill** for this use case (useState + localStorage better)
- Only `themeSlice` exists - no other slices defined
- Store provided in `App.tsx` via `<Provider>`
- Could be replaced with React Context + localStorage
- No middleware, no async actions, no Redux DevTools integration configured