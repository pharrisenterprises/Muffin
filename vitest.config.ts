/**
 * Vitest Configuration
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // Include patterns
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    
    // Exclude patterns
    exclude: ['node_modules', 'dist'],
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**/*.ts', 'src/components/**/*.tsx'],
      exclude: ['src/__tests__/**', '**/*.d.ts'],
    },
    
    // Globals (describe, it, expect available without import)
    globals: true,
    
    // Timeout for async tests
    testTimeout: 10000,
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
