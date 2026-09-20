import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      // En desarrollo el navegador llama a /api/... en el mismo origen que la app y Vite
      // reenvía la petición al API Gateway. Así no aplica CORS (el gateway aún no lo habilita).
      // Requiere VITE_API_BASE_URL vacío en .env (ver .env.example).
      proxy: env.VITE_PROXY_TARGET
        ? {
            '/api': {
              target: env.VITE_PROXY_TARGET,
              changeOrigin: true,
              secure: true,
            },
          }
        : undefined,
    },
  }
})
