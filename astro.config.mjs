// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// SSR shop promo pages — served at tripdedee.com/shop/<shopId>
// nginx proxies /shop/ -> 127.0.0.1:8090 (keeps the /shop prefix, so base must match)
export default defineConfig({
  site: 'https://tripdedee.com',
  base: '/shop',
  trailingSlash: 'ignore',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
});
