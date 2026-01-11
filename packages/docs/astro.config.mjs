// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import scriptIsland from '../astro-script-islands/src/integration.js';
import removeDemoBlocks from './src/lib/integrations/remove-demo-blocks.js';
import trackingDirective from "./src/lib/client-directives/register";


import tailwindcss from '@tailwindcss/vite';


// https://astro.build/config
export default defineConfig({
  integrations: [
    trackingDirective(),
    scriptIsland(),
    starlight({
      title: 'astro-script-islands',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
      sidebar: [
        {
          label: 'Guides',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Example Guide', slug: 'guides/example' },
          ],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ], customCss: [
        './src/styles/global.css',
      ],
    }),
    removeDemoBlocks(),
  ],
  compressHTML: false,

  vite: {
    plugins: [tailwindcss()],
  },
});
