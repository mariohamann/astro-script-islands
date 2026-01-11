import type { NamedSSRLoadedRendererValue } from 'astro';

const renderer: NamedSSRLoadedRendererValue = {
  name: 'script-island',
  check(Component: unknown) {
    if (typeof Component === 'function' && (Component as { __isScriptIsland?: boolean; }).__isScriptIsland) {
      return true;
    }
    if ((Component as { name?: string; })?.name === 'ScriptIsland') {
      return true;
    }
    const str = (Component as { toString?: () => string; })?.toString?.();
    return str?.includes('__isScriptIsland') || str?.includes('ScriptIsland');
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
