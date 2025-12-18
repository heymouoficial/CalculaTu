import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function resolveGeminiApiKey() {
  // Prefer GEMINI_API_KEY (Vercel), but support common variants.
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY ||
    ''
  );
}

export default defineConfig(() => {
  const apiKey = resolveGeminiApiKey();
  const rootDir = path.dirname(fileURLToPath(import.meta.url));

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // Keep contract used by Google AI Studio generated code.
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
    },
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
  };
});
