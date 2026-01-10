// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import scriptIsland from 'astro-script-islands/integration';


import tailwindcss from '@tailwindcss/vite';


// https://astro.build/config
export default defineConfig({
  integrations: [
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
  ],
  compressHTML: false,

  vite: {
    plugins: [tailwindcss()],
  },
});
