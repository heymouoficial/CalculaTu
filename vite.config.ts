import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { devLicenseApiPlugin } from './dev/licenseApiPlugin';
import { devChatApiPlugin } from './dev/chatApiPlugin';

export default defineConfig(({ mode }) => {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, rootDir, '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      // Mock Vercel license APIs for local development
      mode === 'development' && devLicenseApiPlugin(),
      mode === 'development' && devChatApiPlugin({ apiKey: env.VITE_OPENAI_API_KEY }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    // Compatibilidad con código antiguo de Google AI Studio
    define: {
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    },
  };
});
