/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// Dùng URL thay cho __dirname vì file cấu hình chạy dạng ESM ("type": "module").
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Alias "@/*" -> "src/*", khớp với "paths" trong tsconfig.app.json (guide shadcn/Vite).
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Cấu hình Vitest nằm chung ở đây để chỉ có một nguồn cấu hình build/test.
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Chỉ chạy test trong src/, không quét dist/ hay node_modules/.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
