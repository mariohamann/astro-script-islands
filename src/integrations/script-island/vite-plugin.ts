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

export default function scriptIslandVitePlugin(): Plugin {
  const islands = new Map<string, Island>();
  let server: ViteDevServer | null = null;

const hash = (content: string, file: string, index: number): string => {
  return createHash('md5').update(`${file}:${index}:${content}`).digest('hex').slice(0, 12);
};



  const extractFromFile = async (filePath: string): Promise<Island[]> => {
    const content = await fs.readFile(filePath, 'utf-8');
    const extracted: Island[] = [];

    const regex = /<ScriptIsland\s+[^>]*client:[^>]*>\s*<script[^>]*>([\s\S]*?)<\/script>\s*<\/ScriptIsland>/gi;

    let match;
    let index = 0;

    while ((match = regex.exec(content)) !== null) {
      const scriptContent = removeDummyImport(match[1].trim());
      const id = hash(scriptContent, filePath, index);

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

    await Promise.all(
      files.map(async (file) => {
        const extracted = await extractFromFile(file);
        extracted.forEach((island) => islands.set(island.id, island));
      })
    );
  };

  return {
    name: 'vite-plugin-script-island',
    enforce: 'pre',

    configureServer(_server) {
      server = _server;
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return '\0' + id;
      }
    },

    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return;

      const islandId = id.slice(RESOLVED_PREFIX.length);
      const island = islands.get(islandId);

      if (!island) return '';

      return removeDummyImport(island.content);
    },

    async buildStart() {
      await analyzeAll();
    },

    transform(code, id) {
      if (!id.endsWith('.astro')) return;

      const regex = /(<ScriptIsland\s+)([^>]*client:[^>]*)(>\s*<script[^>]*>)([\s\S]*?)(<\/script>\s*<\/ScriptIsland>)/gi;

      let index = 0;
      let hasChanges = false;

      const transformed = code.replace(regex, (_match, open, attrs, mid, content, close) => {
        const modifiedContent = DUMMY_IMPORT + '\n' + content;
        const islandId = hash(removeDummyImport(content.trim()), id, index);
        index++;
        hasChanges = true;

        return `${open}${attrs} data-sid="${islandId}"${mid}${modifiedContent}${close}`;
      });

      return hasChanges ? transformed : undefined;
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
