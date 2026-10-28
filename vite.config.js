import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteMockServe } from 'vite-plugin-mock'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command, mode }) => {
  // VITE_USE_MOCK=false 时关闭本地 Mock，改走后端真实接口（见 .env.real / npm run dev:real）
  const env = loadEnv(mode, process.cwd())
  const useMock = command === 'serve' && env.VITE_USE_MOCK !== 'false'

  return {
    plugins: [
      vue(),
      viteMockServe({
        mockPath: 'mock',
        enable: useMock
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true
        },
        '/uploads': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    }
  }
})
