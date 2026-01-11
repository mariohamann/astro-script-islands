import type { AstroIntegration } from 'astro';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';
import scriptIslandVitePlugin from './vite-plugin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function scriptIsland(): AstroIntegration {
  return {
    name: 'script-island',
    hooks: {
      'astro:config:setup': ({ addRenderer, updateConfig }) => {
        addRenderer({
          name: 'script-island',
          serverEntrypoint: resolve(__dirname, './server.ts'),
          clientEntrypoint: resolve(__dirname, './client.ts'),
        });

        updateConfig({
          vite: {
            plugins: [
              scriptIslandVitePlugin(),
              {
                name: 'script-island-extension',
                enforce: 'pre',
                resolveId(id) {
                  if (id.endsWith('.si')) return id;
                },
                load(id) {
                  if (id.endsWith('.si'))
                    return `function ScriptIsland() { return null; } ScriptIsland.__isScriptIsland = true; export default ScriptIsland;`;
                },
              },
            ],
          },
        });
      },

      'astro:build:done': async ({ dir }) => {
        const distPath = fileURLToPath(dir);
        const htmlFiles = await globby(['**/*.html'], { cwd: distPath, absolute: true });
        const astroDir = path.join(distPath, '_astro');

        if (!fs.existsSync(astroDir)) {
          fs.mkdirSync(astroDir, { recursive: true });
        }

        const jsFiles = await globby(['_astro/**/*.js'], { cwd: distPath, absolute: true });
        const externalScripts = new Map<string, { path: string; multiple: boolean; }>();

        for (const jsFile of jsFiles) {
          const jsContent = fs.readFileSync(jsFile, 'utf-8');
          const markers = [...jsContent.matchAll(/\/\*! @script-island ([a-f0-9]+)( multiple)? \*\//g)];
          for (const marker of markers) {
            const relativePath = '/' + path.relative(distPath, jsFile).replace(/\\/g, '/');
            const isMultiple = marker[2] === ' multiple';
            externalScripts.set(marker[1], { path: relativePath, multiple: isMultiple });
            // console.log(`[script-island] Found external marker ${marker[1]}${isMultiple ? ' (multiple)' : ' (once)'} in ${relativePath}`);
          }
        }

        const renderedOnceIslands = new Set<string>();

        for (const file of htmlFiles) {
          let content = fs.readFileSync(file, 'utf-8');
          let changed = false;

          const pageRenderedOnce = new Set<string>();

          const inlineScripts = new Map<string, { content: string; multiple: boolean; }>();
          const inlineRegex = /<template data-astro-template>[\s\S]*?<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>[\s\S]*?<\/template>/g;

          let inlineMatch;
          while ((inlineMatch = inlineRegex.exec(content)) !== null) {
            const scriptContent = inlineMatch[1];
            const markerMatch = scriptContent.match(/\/\*! @script-island ([a-f0-9]+)( multiple)? \*\//);
            if (markerMatch) {
              const cleanScript = scriptContent.replace(/\/\*! @script-island [a-f0-9]+( multiple)? \*\/\n?/, '');
              const isMultiple = markerMatch[2] === ' multiple';
              inlineScripts.set(markerMatch[1], { content: cleanScript, multiple: isMultiple });
              // console.log(`[script-island] Found inline marker ${markerMatch[1]}${isMultiple ? ' (multiple)' : ' (once)'}`);
            }
          }

          content = content.replace(
            /<astro-island([^>]*?)component-url="[^"]*component\.[^"]+"([^>]*)>([\s\S]*?)<!--script-island:([a-f0-9]+)--><template data-astro-template>[\s\S]*?<\/template><!--astro:end--><\/astro-island>/g,
            (match, before, after, htmlContent, islandId) => {
              // console.log(`[script-island] Processing island with ID: ${islandId}`);

              const externalInfo = externalScripts.get(islandId);
              const inlineInfo = inlineScripts.get(islandId);
              const isMultiple = externalInfo?.multiple || inlineInfo?.multiple || false;

              if (!isMultiple && pageRenderedOnce.has(islandId)) {
                // console.log(`[script-island] → Removing duplicate 'once' island: ${islandId}`);
                changed = true;
                return '';
              }

              if (!isMultiple) {
                pageRenderedOnce.add(islandId);
                renderedOnceIslands.add(islandId);
              }

              if (externalInfo) {
                // console.log(`[script-island] → Using external script: ${externalInfo.path}`);
                changed = true;
                return `<astro-island${before}component-url="${externalInfo.path}"${after}>${htmlContent}<!--script-island:${islandId}--></astro-island>`;
              }

              if (inlineInfo) {
                const fileName = `script-island-${islandId}.js`;
                const filePath = path.join(astroDir, fileName);

                if (!fs.existsSync(filePath)) {
                  fs.writeFileSync(filePath, inlineInfo.content);
                  // console.log(`[script-island] → Created inline script file: ${fileName}`);
                }

                changed = true;
                return `<astro-island${before}component-url="/_astro/${fileName}"${after}>${htmlContent}<!--script-island:${islandId}--></astro-island>`;
              }

              // console.log(`[script-island] → No matching script found for ${islandId}`);
              return match;
            }
          );

          if (changed) {
            fs.writeFileSync(file, content);
            // console.log(`[script-island] Transformed: ${file}`);
          }
        }

        if (renderedOnceIslands.size > 0) {
          // console.log(`[script-island] Deduplicated ${renderedOnceIslands.size} 'once' island type(s)`);
        }
      },
    },
  };
}
