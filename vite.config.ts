import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte({
      compilerOptions: {
        customElement: true, // Compiles components to Web Components
      },
    }),
  ],
  build: {
    // 1. Enable Library Mode
    lib: {
      entry: resolve(__dirname, 'src/main.ts'), // Your library's entry point
      name: 'MyChartLibrary', // Global variable name for UMD/IIFE formats
      fileName: 'my-charts', // Output filename (e.g., my-charts.js)
      formats: ['es', 'umd'], // Outputs modern ES Modules and compatible UMD formats
    },
    // 2. Prevent Vite from generating separate CSS bundles
    cssCodeSplit: false,
    // 3. Performance optimizations
    minify: true,
    sourcemap: false, // Keeps code clean and hidden
    rollupOptions: {
      output: {
        // Forces all inline asset styling into the single JS output
        inlineDynamicImports: true,
      },
    },
  },
})
