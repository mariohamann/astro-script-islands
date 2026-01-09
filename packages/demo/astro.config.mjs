// @ts-check
import { defineConfig } from 'astro/config';
import scriptIsland from 'astro-script-island/integration';

// https://astro.build/config
export default defineConfig({
  integrations: [scriptIsland()],
  compressHTML: false,
});
