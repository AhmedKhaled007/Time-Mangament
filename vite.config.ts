import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), netlify()],
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          axios: ['axios'],
        },
      },
    },
  },
  
  // Development server configuration
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  
  // Preview server configuration
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
})