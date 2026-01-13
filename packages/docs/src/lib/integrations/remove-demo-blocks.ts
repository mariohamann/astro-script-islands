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

          // Remove demo blocks from data-code attributes in copy buttons
          content = content.replace(
            /data-code="([^"]*)"/g,
            (match, codeContent) => {
              // Decode HTML entities for processing
              const decoded = codeContent
                .replace(/&#x22;/g, '"')
                .replace(/&quot;/g, '"')
                .replace(/&#x27;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');

              // Remove demo blocks (comments and content between them)
              const cleaned = decoded.replace(
                /\s*\/\/\s*demo:start[\s\S]*?\/\/\s*demo:end\s*/g,
                ''
              );

              // Re-encode HTML entities
              const encoded = cleaned
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&#x22;')
                .replace(/'/g, '&#x27;');

              return `data-code="${encoded}"`;
            }
          );

          // Remove demo blocks from visible code in ec-line divs
          // This is more surgical - only removes the specific comment lines and content between them
          content = content.replace(
            /(<div class="ec-line"><div class="code">(?:(?!<\/div>).)*?)<span[^>]*>\/\/\s*demo:start<\/span>(?:(?!<\/div>).)*?<\/div><\/div>([\s\S]*?)<div class="ec-line"><div class="code">(?:(?!<\/div>).)*?<span[^>]*>\/\/\s*demo:end<\/span>(?:(?!<\/div>).)*?<\/div><\/div>/g,
            ''
          );

          writeFileSync(file, content, 'utf-8');
        }
      }
    }
  };
}
