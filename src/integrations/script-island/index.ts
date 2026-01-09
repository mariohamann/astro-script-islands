// index.ts
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
      'astro:config:setup': ({ addRenderer, updateConfig }) => {
        addRenderer({
          name: 'script-island',
          clientEntrypoint: resolve(__dirname, './client.ts'),
          serverEntrypoint: resolve(__dirname, './server.ts'),
        });

        updateConfig({
          vite: {
            plugins: [
              scriptIslandVitePlugin(emittedChunks),
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

          // Remove duplicate templates
          const deduped = content.replace(
            /(<template data-astro-template>[\s\S]*?<\/template>)\s*<template data-astro-template>[\s\S]*?<\/template>/g,
            '$1'
          );
          if (deduped !== content) {
            content = deduped;
            changed = true;
          }

          // Replace script-island + template with data-script
          const transformed = content.replace(
            /<script-island data-hash="([^"]+)"><\/script-island>\s*<template data-astro-template>\s*<script>[\s\S]*?<\/script>\s*<\/template>/g,
            (match, hashValue) => {
              const chunkFile = emittedChunks.get(hashValue);
              if (chunkFile) {
                changed = true;
                // FIX: Changed data-src to data-script
                return `<script-island data-script="/${chunkFile}"></script-island>`;
              }
              console.warn(`[script-island] No chunk found for hash: ${hashValue}`);
              console.warn(`[script-island] Available:`, [...emittedChunks.keys()]);
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
