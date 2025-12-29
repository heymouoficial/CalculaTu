import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { devLicenseApiPlugin } from './dev/licenseApiPlugin';
import { devChatApiPlugin } from './dev/chatApiPlugin';

export default defineConfig(({ mode }) => {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, rootDir, '');

  // Operación Hydra: Parse API Key Pool
  let chatApiKey: string | undefined = env.VITE_GEMINI_API_KEY; // Fallback to single key

  if (env.VITE_GEMINI_KEY_POOL) {
    try {
      const pool: string[] = JSON.parse(env.VITE_GEMINI_KEY_POOL);
      if (pool.length > 0) {
        chatApiKey = pool[0]; // Use first key for dev server
        console.log(`🐍 Hydra: Dev server using key pool (${pool.length} keys available)`);
      }
    } catch (e) {
      console.warn('⚠️ Failed to parse VITE_GEMINI_KEY_POOL');
    }
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      // Mock Vercel license APIs for local development
      devLicenseApiPlugin(),
      // Always load chat plugin if key exists to prevent 404s in local preview
      devChatApiPlugin({ apiKey: chatApiKey }),
    ].filter(Boolean),
    assetsInclude: ['**/*.md'],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    // Compatibilidad con código antiguo de Google AI Studio
    define: {
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(chatApiKey),
    },
  };
});
