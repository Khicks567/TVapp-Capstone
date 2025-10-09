import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// This configuration file tells Vitest how to handle React components,
// TypeScript, and resolve the path aliases used in your Next.js project.

export default defineConfig({
  // Integrate the official Vite React plugin to handle JSX and React features
  plugins: [react()],

  test: {
    // 1. Environment: Use jsdom to simulate a browser environment (required for DOM/React testing)
    environment: "jsdom",

    // 2. Setup: Run a global setup file before all tests (optional, but good practice)
    setupFiles: ["./vitest.setup.ts"],

    // 3. Matchers: Use the standard jest API for assertions (recommended)
    globals: true,
  },

  resolve: {
    // 4. Path Aliases: Map the '@/' alias to your source directory.
    // This matches the mapping in your tsconfig.json: "@/*": ["./src/*"]
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // If your component is in '@/app/components/', the alias needs to resolve correctly.
      // If your components are directly under the root, use: '@': path.resolve(__dirname, './')
    },
  },
});
