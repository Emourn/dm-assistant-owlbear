import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        owlbear: fileURLToPath(new URL('./owlbear.html', import.meta.url)),
        owlbearWorkbench: fileURLToPath(new URL('./owlbear-workbench.html', import.meta.url)),
        owlbearBackground: fileURLToPath(new URL('./owlbear-background.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/pdfjs-dist') || id.includes('node_modules/pdf-parse')) {
            return 'vendor-pdf'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-ui'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
