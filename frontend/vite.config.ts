import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL || 'https://bullslong.com').replace(/\/$/, '')
  const appName = env.VITE_APP_NAME || 'BULLSLONG'

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-site-meta',
        transformIndexHtml(html) {
          return html.replaceAll('__SITE_URL__', siteUrl).replaceAll('__APP_NAME__', appName)
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      open: false,
    },
  }
})
