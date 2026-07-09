import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const LMS_URLS: Record<string, string> = {
  uat: 'https://sales.bajajlife.com/BalicLmsUtil',
  preprod: 'https://sales.bajajlife.com/BalicLmsUtil',
  production: 'https://sales.bajajlife.com/BalicLmsUtil',
};

const LMS_UPDATE_URLS: Record<string, string> = {
  uat: 'https://sales.bajajlife.com/BalicLmsUtil',
  preprod: 'https://sales.bajajlife.com/BalicLmsUtil',
  production: 'https://sales.bajajlife.com/BalicLmsUtil',
};

export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    port: 3036,
    host: '0.0.0.0',
  },
  plugins: [react()],
  define: {
    __LMS_BASE_URL__: JSON.stringify(LMS_URLS[mode] || LMS_URLS.uat),
    __LMS_UPDATE_BASE_URL__: JSON.stringify(LMS_UPDATE_URLS[mode] || LMS_UPDATE_URLS.uat),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        name: 'GuardianArcher',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        format: 'es',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
}));
