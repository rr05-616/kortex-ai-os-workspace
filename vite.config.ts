import { vlyPlugin } from "@vly-ai/integrations";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vlyPlugin(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force a single copy of React across all packages (including vlyPlugin).
    // Without this, @vly-ai/integrations can resolve its own React copy, which
    // triggers "Invalid hook call" errors at runtime.
    dedupe: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'convex-vendor': ['convex'],
          'radix-ui': [
            '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar', '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible', '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card', '@radix-ui/react-label',
            '@radix-ui/react-menubar', '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover', '@radix-ui/react-progress',
            '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area',
            '@radix-ui/react-select', '@radix-ui/react-separator',
            '@radix-ui/react-slider', '@radix-ui/react-switch',
            '@radix-ui/react-tabs', '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group', '@radix-ui/react-tooltip',
          ],
          'framer-motion': ['framer-motion'],
          'charts': ['recharts'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    minify: 'esbuild',
  },
  // Pre-bundle ALL dependencies that are imported at top level.
  // CRITICAL: Missing packages here cause Vite to fail at startup because
  // the dependency optimizer crashes when it encounters require() or CJS
  // syntax in these packages during on-demand optimization.
  optimizeDeps: {
    entries: ['index.html'],
    include: [
      // Core React
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-router',
      // Convex
      'convex',
      '@convex-dev/auth/react',
      // Freebuff platform (uses require() — MUST be pre-bundled)
      '@vly-ai/integrations',
      '@zumer/snapdom',
      // UI libraries
      'framer-motion',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      // Forms
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      // Charts
      'recharts',
      // AI
      '@google/generative-ai',
    ],
  },
  server: {
    host: true,
    port: 5173,
    hmr: false,
    watch: {
      ignored: ['**/backend/**', '**/__pycache__/**', '**/node_modules/**'],
    },
    fs: {
      allow: ['.'],
      deny: ['**/backend/**'],
    },
  },
});
