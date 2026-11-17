import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true'
  ? '/Mandalay_life_game/'
  : './',
  server: { host: '127.0.0.1', port: 5173 },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        showroom: fileURLToPath(new URL('./showroom.html', import.meta.url)),
        osmPreview: fileURLToPath(new URL('./osm-preview.html', import.meta.url))
      }
    }
  }
})
