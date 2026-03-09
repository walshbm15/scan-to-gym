import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/proxy/capi': {
        target: 'https://capi.puregym.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy\/capi/, ''),
      },
    },
  },
});
