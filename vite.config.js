import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // For GitHub Pages deployment
  // Change 'hearts-aglow' to your actual repo name
  base: '/hearts-aglow/',
})
