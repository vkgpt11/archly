import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'react-vendor'
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'rich-text-vendor'
          if (id.includes('lowlight') || id.includes('highlight.js')) return 'syntax-vendor'
          if (id.includes('@xyflow')) return 'canvas-vendor'
          if (id.includes('@likec4/icons') || id.includes('aws-react-icons') || id.includes('react-icons')) return 'architecture-icons'
          return undefined
        },
      },
    },
  },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
