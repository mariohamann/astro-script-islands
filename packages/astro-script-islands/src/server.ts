import type { NamedSSRLoadedRendererValue } from 'astro';

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
    const slot = String(slotted.default || '');
    const islandId = (props as { 'data-script-island-id'?: string; })['data-script-island-id'];

    const htmlContent = slot.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim();

    return {
      html: `${htmlContent}<!--script-island:${islandId || 'unknown'}-->`,
    };
  },
  supportsAstroStaticSlot: false,
};

export default renderer;
