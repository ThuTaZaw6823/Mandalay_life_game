import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5173 },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        showroom: fileURLToPath(new URL('./showroom.html', import.meta.url))
      }
    }
  }
})
