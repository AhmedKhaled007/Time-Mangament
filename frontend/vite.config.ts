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
    port: 5173,
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
  },
})