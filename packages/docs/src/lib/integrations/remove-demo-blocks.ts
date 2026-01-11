import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';

export default function removeDemoBlocks() {
  return {
    name: 'remove-demo-blocks',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const outDir = fileURLToPath(dir);
        const htmlFiles = await globby(`${outDir}/**/*.html`);

        for (const file of htmlFiles) {
          let content = readFileSync(file, 'utf-8');

          content = content.replace(
            /<div class="ec-line">(?:(?!<div class="ec-line">).)*?\/\/ demo:start.*?<\/div><\/div>.*?<div class="ec-line">(?:(?!<div class="ec-line">).)*?\/\/ demo:end.*?<\/div><\/div>/gs,
            ''
          );

          writeFileSync(file, content, 'utf-8');
        }
      }
    }
  };
}
