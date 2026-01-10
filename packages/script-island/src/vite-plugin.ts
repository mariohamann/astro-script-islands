import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

declare global {
  var __scriptIslandScripts: Record<string, { code: string; importer: string; multiple?: boolean; }> | undefined;
}

export default function scriptIslandVitePlugin(): Plugin[] {
  const processedFiles = new Set<string>();

  globalThis.__scriptIslandScripts = globalThis.__scriptIslandScripts || {};

  return [
    {
      name: 'script-island-marker',
      enforce: 'pre',

      load(id) {
        if (!id.endsWith('.astro')) return;
        if (processedFiles.has(id)) return;

        const code = fs.readFileSync(id, 'utf-8');
        if (!code.includes('ScriptIsland')) return;

        console.log(`[script-island] Processing raw file: ${id}`);

        let counter = 0;
        const newCode = code.replace(
          /<ScriptIsland([^>]*)>([\s\S]*?)<\/ScriptIsland>/g,
          (match, attrs, content) => {
            const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
            if (!scriptMatch) return match;

            const hasMultipleProp = /\bmultiple\b/.test(attrs);
            const hasNonScriptContent = content
              .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
              .trim().length > 0;

            const isMultiple = hasMultipleProp || hasNonScriptContent;

            const scriptContent = scriptMatch[1];
            const markerId = createHash('md5').update(scriptContent.trim()).digest('hex').slice(0, 8);

            globalThis.__scriptIslandScripts![markerId] = {
              code: scriptContent,
              importer: id,
              multiple: isMultiple,
            };
            console.log(`[script-island] Stored script content for marker: ${markerId}${isMultiple ? ' (multiple)' : ' (once)'}`);

            const multipleMarker = isMultiple ? ' multiple' : '';
            const newContent = content.replace(
              /(<script)(\s[^>]*>|>)/,
              `$1$2\n/*! @script-island ${markerId}${multipleMarker} */`
            );

            const cleanAttrs = attrs.replace(/\s*\bmultiple\b/, '');

            console.log(`[script-island] Injecting marker: ${markerId}${multipleMarker}`);
            return `<ScriptIsland${cleanAttrs} data-script-island-id="${markerId}"${isMultiple ? ' data-multiple="true"' : ''}>${newContent}</ScriptIsland>`;
          }
        );

        if (newCode !== code) {
          processedFiles.add(id);
          console.log(`[script-island] Transformed!`);
          return newCode;
        }
      },
    },
    {
      name: 'script-island-virtual',
      resolveId(id) {
        if (id.startsWith('/@script-island/')) {
          return '\0' + id;
        }
      },
      load(id) {
        if (id.startsWith('\0/@script-island/')) {
          const islandId = id.replace('\0/@script-island/', '').replace('.js', '');
          const scriptData = globalThis.__scriptIslandScripts?.[islandId];

          if (scriptData) {
            console.log(`[script-island] Loading virtual module for: ${islandId}`);
            return {
              code: scriptData.code,
              map: null,
            };
          }
        }
      },
      transform(code, id) {
        if (id.startsWith('\0/@script-island/')) {
          const islandId = id.replace('\0/@script-island/', '').replace('.js', '');
          const scriptData = globalThis.__scriptIslandScripts?.[islandId];

          if (scriptData) {
            return {
              code,
              map: null,
              meta: {
                vite: {
                  importer: scriptData.importer,
                },
              },
            };
          }
        }
      },
    },
  ];
}
