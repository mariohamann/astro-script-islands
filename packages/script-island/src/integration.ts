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
          serverEntrypoint: resolve(__dirname, './server.ts'),
          clientEntrypoint: resolve(__dirname, './client.ts'),
        });

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
                  if (id.endsWith('.si'))
                    return `const ScriptIsland = () => null; ScriptIsland.__isScriptIsland = true; export default ScriptIsland;`;
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

          for (const [hashValue, chunkFile] of emittedChunks) {
            const templateRegex = new RegExp(
              `<!--script-island:${hashValue}--><template data-astro-template>[\\s\\S]*?</template><!--astro:end-->`,
              'g'
            );

            if (templateRegex.test(content)) {
              content = content.replace(templateRegex, '');
              content = content.replace(
                /component-url="[^"]*component\.[^"]+"/,
                `component-url="/${chunkFile}"`
              );
              changed = true;
            }
          }

          if (changed) {
            fs.writeFileSync(file, content);
            console.log(`[script-island] Transformed: ${file}`);
          }
        }
      },
    },
  };
}
