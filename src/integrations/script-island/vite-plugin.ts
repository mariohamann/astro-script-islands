// vite-plugin.ts
import type { Plugin, ViteDevServer } from 'vite';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { globby } from 'globby';

const VIRTUAL_PREFIX = 'virtual:script-island:';
const RESOLVED_PREFIX = '\0' + VIRTUAL_PREFIX;

interface Island {
  id: string;
  content: string;
  file: string;
  index: number;
}

export default function scriptIslandVitePlugin(
  emittedChunks: Map<string, string>
): Plugin {
  const islands = new Map<string, Island>();
  let server: ViteDevServer | null = null;
  let isBuild = false;

  const hash = (content: string): string => {
    return createHash('md5').update(content).digest('hex').slice(0, 12);
  };

  const extractFromFile = async (filePath: string): Promise<Island[]> => {
    const content = await fs.readFile(filePath, 'utf-8');
    const extracted: Island[] = [];

    const regex = /<ScriptIsland\s+[^>]*client:[^>]*>\s*<script[^>]*>([\s\S]*?)<\/script>\s*<\/ScriptIsland>/gi;

    let match;
    let index = 0;

    while ((match = regex.exec(content)) !== null) {
      const scriptContent = match[1].trim();
      const id = hash(scriptContent);

      extracted.push({
        id,
        content: scriptContent,
        file: filePath,
        index,
      });

      index++;
    }

    return extracted;
  };

  const analyzeAll = async () => {
    const files = await globby(['src/**/*.astro'], { absolute: true, gitignore: true });

    islands.clear();

    for (const file of files) {
      const extracted = await extractFromFile(file);
      extracted.forEach((island) => islands.set(island.id, island));
    }
  };

  return {
    name: 'vite-plugin-script-island',
    enforce: 'pre',

    configResolved(config) {
      isBuild = config.command === 'build';
    },

    configureServer(_server) {
      server = _server;
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return RESOLVED_PREFIX + id.slice(VIRTUAL_PREFIX.length);
      }
    },

    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return;

      const islandId = id.slice(RESOLVED_PREFIX.length);
      const island = islands.get(islandId);

      if (!island) return '';

      return island.content;
    },

    async buildStart() {
      await analyzeAll();

      if (isBuild) {
        for (const [id] of islands) {
          this.emitFile({
            type: 'chunk',
            id: VIRTUAL_PREFIX + id,
            name: `script-island-${id}`,
          });
        }
      }
    },

    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.name?.startsWith('script-island-')) {
          const id = chunk.name.replace('script-island-', '');
          // FIX: Store just the fileName, Astro will handle the base path (e.g., /_astro/)
          emittedChunks.set(id, fileName);
        }
      }
    },

    async handleHotUpdate({ file }) {
      if (!file.endsWith('.astro')) return;

      const oldIds = [...islands.entries()]
        .filter(([, i]) => i.file === file)
        .map(([id]) => id);

      oldIds.forEach((id) => islands.delete(id));

      const extracted = await extractFromFile(file);
      extracted.forEach((island) => islands.set(island.id, island));

      if (server) {
        extracted.forEach((island) => {
          const mod = server!.moduleGraph.getModuleById(RESOLVED_PREFIX + island.id);
          if (mod) server!.moduleGraph.invalidateModule(mod);
        });

        server.ws.send({ type: 'full-reload', path: '*' });
      }
    },
  };
}
