import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

const useHttps = process.env.HTTPS === '1'

export default defineConfig({
  plugins: [vue(), tailwindcss(), ...(useHttps ? [basicSsl()] : [])],
  server: {
    https: useHttps,
    host: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:8000',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
