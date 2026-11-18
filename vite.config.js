import { reactRouter } from '@react-router/dev/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Absolute site URL for canonical links, Open Graph and the sitemap.
  // Falls back to Vercel's production domain when VITE_SITE_URL is not set.
  const siteUrl =
    env.VITE_SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5173');

  return {
    plugins: [reactRouter()],
    resolve: { tsconfigPaths: true },
    define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl) },
    server: {
      port: env.PORT ? Number(env.PORT) : 5173,
      strictPort: true,
    },
  };
});
