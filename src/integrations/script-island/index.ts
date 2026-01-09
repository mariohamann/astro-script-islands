import type { AstroIntegration } from 'astro';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import scriptIslandVitePlugin from './vite-plugin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function scriptIsland(): AstroIntegration {
  return {
    name: 'script-island',
    hooks: {
      'astro:config:setup': ({ addRenderer, updateConfig }) => {
        console.log('[script-island] Registering renderer...');

        addRenderer({
          name: 'script-island',
          clientEntrypoint: resolve(__dirname, './client.ts'),
          serverEntrypoint: resolve(__dirname, './server.ts'),
        });

        updateConfig({
          vite: {
            build: {
              assetsInlineLimit: 0, // Force bundling of all scripts to ensure ScriptIsland scripts are external
            },
            plugins: [
              scriptIslandVitePlugin(),
              {
                name: 'script-island-extension',
                enforce: 'pre',

                resolveId(id) {
                  if (id.endsWith('.si')) {
                    return id;
                  }
                },

                load(id) {
                  if (id.endsWith('.si')) {
                    return `
                      function ScriptIsland() { return null; }
                      ScriptIsland.isScriptIsland = true;
                      export { ScriptIsland };
                      export default ScriptIsland;
                    `;
                  }
                },

                transform(code, id) {
                  if (id.endsWith('.si')) {
                    return {
                      code,
                      map: null,
                    };
                  }
                },
              },
            ],
          },
        });

        console.log('[script-island] Integration setup complete');
      },
    },
  };
}
