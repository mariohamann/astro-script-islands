// @ts-check
import { defineConfig } from 'astro/config';
import scriptIsland from './src/integrations/script-island/index.ts';

// https://astro.build/config
export default defineConfig({
  integrations: [scriptIsland()],
});
