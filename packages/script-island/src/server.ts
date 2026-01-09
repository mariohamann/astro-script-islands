import type { NamedSSRLoadedRendererValue } from 'astro';
import { createHash } from 'node:crypto';

const renderer: NamedSSRLoadedRendererValue = {
  name: 'script-island',
  check() {
    return true;
  },
  renderToStaticMarkup(Component: any, props: Record<string, unknown>, slotted: { default?: string; }) {
    const slot = slotted.default || '';

    const scriptMatch = slot.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const scriptContent = scriptMatch?.[1]?.trim() || '';

    const contentHash = createHash('md5').update(scriptContent).digest('hex').slice(0, 12);

    return {
      html: `<!--script-island:${contentHash}-->`,
    };
  },
  supportsAstroStaticSlot: false,
};

export default renderer;
