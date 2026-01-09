import type { AstroIntegration } from 'astro';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { globby } from 'globby';
import scriptIslandVitePlugin from './vite-plugin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function scriptIsland(): AstroIntegration {
  const emittedChunks = new Map<string, string>();

  return {
    name: 'script-island',
    hooks: {
      'astro:config:setup': ({ addRenderer, updateConfig, injectScript, command }) => {
        addRenderer({
          name: 'script-island',
          serverEntrypoint: resolve(__dirname, './server.ts'),
        });

        if (command === 'dev') {
          injectScript('page', `
            document.addEventListener('DOMContentLoaded', () => {
              document.querySelectorAll('astro-island').forEach((island) => {
                const comment = Array.from(island.childNodes).find(
                  (node) => node.nodeType === 8 && node.nodeValue?.startsWith('script-island:')
                );
                
                if (comment?.nodeValue) {
                  const hash = comment.nodeValue.replace('script-island:', '');
                  const componentUrl = island.getAttribute('component-url');
                  
                  if (componentUrl?.endsWith('.si')) {
                    island.setAttribute('component-url', '/virtual:script-island:' + hash);
                  }
                }
              });
            });
          `);
        }

        updateConfig({
          vite: {
            plugins: [
              scriptIslandVitePlugin(emittedChunks),
              {
                name: 'script-island-extension',
                enforce: 'pre',
                resolveId(id) {
                  if (id.endsWith('.si')) return id;
                },
                load(id) {
                  if (id.endsWith('.si')) return `export default () => null`;
                },
              },
            ],
          },
        });
      },

      'astro:build:done': async ({ dir }) => {
        const distPath = fileURLToPath(dir);
        const htmlFiles = await globby(['**/*.html'], { cwd: distPath, absolute: true });

        for (const file of htmlFiles) {
          let content = fs.readFileSync(file, 'utf-8');
          let changed = false;

          const transformed = content.replace(
            /(<astro-island[^>]+)(component-url="[^"]+")([^>]*>)<!--script-island:([a-f0-9]+)-->(?:<template data-astro-template>[\s\S]*?<\/template>)?/g,
            (match, before, componentUrl, after, hashValue) => {
              const chunkFile = emittedChunks.get(hashValue);
              if (chunkFile) {
                changed = true;
                return `${before}component-url="/${chunkFile}"${after}`;
              }
              console.warn(`[script-island] No chunk found for hash: ${hashValue}`);
              return match;
            }
          );

          if (changed) {
            fs.writeFileSync(file, transformed);
            console.log(`[script-island] Transformed: ${file}`);
          }
        }
      },
    },
  };
}
