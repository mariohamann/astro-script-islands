import type { Plugin, ViteDevServer } from 'vite';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { globby } from 'globby';
import path from 'node:path';

const VIRTUAL_PREFIX = 'virtual:script-island:';
const RESOLVED_PREFIX = '\0' + VIRTUAL_PREFIX;

interface Island {
  content: string;
  sourceFile: string;
}

export default function scriptIslandVitePlugin(
  emittedChunks: Map<string, string>
): Plugin {
  const islands = new Map<string, Island>();
  let server: ViteDevServer | null = null;
  let isBuild = false;

  const hash = (content: string) =>
    createHash('md5').update(content).digest('hex').slice(0, 12);

  const extractFromFile = async (filePath: string) => {
    const content = await fs.readFile(filePath, 'utf-8');
    const regex = /<ScriptIsland\s+[^>]*client:[^>]*>\s*<script[^>]*>([\s\S]*?)<\/script>\s*<\/ScriptIsland>/gi;
    const extracted = new Map<string, Island>();

    let match;
    while ((match = regex.exec(content)) !== null) {
      const scriptContent = match[1].trim();
      const id = hash(scriptContent);
      extracted.set(id, {
        content: scriptContent,
        sourceFile: filePath,
      });
    }

    return extracted;
  };

  const analyzeAll = async () => {
    const files = await globby(['src/**/*.astro'], { absolute: true, gitignore: true });
    islands.clear();

    for (const file of files) {
      const extracted = await extractFromFile(file);
      extracted.forEach((island, id) => islands.set(id, island));
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

    resolveId(id, importer) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return RESOLVED_PREFIX + id.slice(VIRTUAL_PREFIX.length);
      }
      if (id.startsWith('/' + VIRTUAL_PREFIX)) {
        return RESOLVED_PREFIX + id.slice(VIRTUAL_PREFIX.length + 1);
      }

      if (importer?.startsWith(RESOLVED_PREFIX)) {
        if (id.startsWith('.') || id.startsWith('/')) {
          const islandId = importer.slice(RESOLVED_PREFIX.length);
          const island = islands.get(islandId);

          if (island) {
            const sourceDir = path.dirname(island.sourceFile);
            const resolved = path.resolve(sourceDir, id);
            return resolved;
          }
        }
      }
    },

    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return;
      const islandId = id.slice(RESOLVED_PREFIX.length);
      const island = islands.get(islandId);
      return island?.content || '';
    },

    async buildStart() {
      await analyzeAll();

      if (isBuild) {
        for (const id of islands.keys()) {
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
          emittedChunks.set(id, fileName);
        }
      }
    },

    async handleHotUpdate({ file }) {
      if (!file.endsWith('.astro')) return;

      const extracted = await extractFromFile(file);
      extracted.forEach((island, id) => islands.set(id, island));

      if (server) {
        extracted.forEach((_, id) => {
          const mod = server!.moduleGraph.getModuleById(RESOLVED_PREFIX + id);
          if (mod) server!.moduleGraph.invalidateModule(mod);
        });
        server.ws.send({ type: 'full-reload', path: '*' });
      }
    },
  };
}
