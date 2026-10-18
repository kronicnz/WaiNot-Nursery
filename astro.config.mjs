// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// Public pages are prerendered; /admin and /api opt out with `prerender = false`.
export default defineConfig({
  integrations: [react()],
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()]
  }
});




