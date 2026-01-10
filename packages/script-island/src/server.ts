import type { NamedSSRLoadedRendererValue } from 'astro';
import { createHash } from 'node:crypto';

const renderer: NamedSSRLoadedRendererValue = {
  name: 'script-island',
  check(Component: any) {
    return Component?.name === 'ScriptIsland' || Component?.toString?.().includes('ScriptIsland');
  },
  renderToStaticMarkup(Component: any, props: Record<string, unknown>, slotted: { default?: string; }) {
    const slot = slotted.default || '';

    const scriptMatch = slot.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const scriptContent = scriptMatch?.[1]?.trim() || '';

    if (!scriptContent) {
      return { html: '' };
    }

    const contentHash = createHash('md5').update(scriptContent).digest('hex').slice(0, 12);

    return {
      html: `<!--script-island:${contentHash}-->`,
    };
  },
  supportsAstroStaticSlot: false,
};

export default renderer;
