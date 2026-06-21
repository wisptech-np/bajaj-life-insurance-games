import { defineConfig } from 'vite';

const LMS_URLS = {
  uat: 'https://sales.bajajlife.com/BalicLmsUtil',
  preprod: 'https://sales.bajajlife.com/BalicLmsUtil',
  production: 'https://sales.bajajlife.com/BalicLmsUtil',
};
const LMS_UPDATE_URLS = {
  uat: 'https://sales.bajajlife.com/BalicLmsUtil',
  preprod: 'https://sales.bajajlife.com/BalicLmsUtil',
  production: 'https://sales.bajajlife.com/BalicLmsUtil',
};

export default defineConfig(({ mode }) => ({
  base: './',
  server: { port: 5173, host: '0.0.0.0' },
  define: {
    __LMS_BASE_URL__: JSON.stringify(LMS_URLS[mode] || LMS_URLS.uat),
    __LMS_UPDATE_BASE_URL__: JSON.stringify(LMS_UPDATE_URLS[mode] || LMS_UPDATE_URLS.uat),
  },
  build: { outDir: 'dist', assetsDir: 'assets', emptyOutDir: true },
}));
