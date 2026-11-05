import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteMockServe } from 'vite-plugin-mock'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command, mode }) => {
  // 默认走真实后端（.env.real）；npm run dev:mock 时开启本地 Mock（仅 E2E/离线演示）
  const env = loadEnv(mode, process.cwd())
  const useMock = command === 'serve' && env.VITE_USE_MOCK === 'true'
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8080'

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
        // 后端接口前缀 /api 原样透传，不做路径改写
        '/api': {
          target: proxyTarget,
          changeOrigin: true
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    }
  }
})
