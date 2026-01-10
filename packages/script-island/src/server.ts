import type { NamedSSRLoadedRendererValue } from 'astro';
import { createHash } from 'node:crypto';

const renderer: NamedSSRLoadedRendererValue = {
  name: 'script-island',
  check(Component: unknown) {
    return (
      (Component as { name?: string; })?.name === 'ScriptIsland' ||
      (Component as { toString?: () => string; })?.toString?.().includes('ScriptIsland')
    );
  },
  renderToStaticMarkup(
    Component: unknown,
    props: Record<string, unknown>,
    slotted: { default?: string; }
  ) {
    const slot = slotted.default || '';

    const scriptMatch = slot.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const scriptContent = scriptMatch?.[1]?.trim() || '';

    const htmlContent = slot.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim();

    if (!scriptContent) {
      return { html: htmlContent };
    }

    const contentHash = createHash('md5').update(scriptContent).digest('hex').slice(0, 12);

    return {
      html: `${htmlContent}<!--script-island:${contentHash}-->`,
    };
  },
  supportsAstroStaticSlot: false,
};

export default renderer;
