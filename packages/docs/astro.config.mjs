// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import scriptIsland from '../astro-script-islands/src/integration.js';
import trackingDirective from "./src/lib/client-directives/register";
import removeDemoBlocks from './src/lib/integrations/remove-demo-blocks';

import tailwindcss from '@tailwindcss/vite';


// https://astro.build/config
export default defineConfig({
  site: 'https://mariohamann.github.io',
  base: '/astro-script-islands',

  integrations: [
    trackingDirective(),
    scriptIsland(),
    starlight({
      title: 'astro-script-islands',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/mariohamann/astro-script-islands' }],
      customCss: [
        './src/styles/global.css',
      ],
    }),
    removeDemoBlocks(),
  ],
  compressHTML: true,

  vite: {
    plugins: [tailwindcss()],
  },
});
