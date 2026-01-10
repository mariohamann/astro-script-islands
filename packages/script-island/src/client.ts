const executedOnceScripts = new Set<string>();

export default (element: HTMLElement) => {
  return async () => {
    const commentMatch = element.innerHTML.match(/<!--script-island:([a-f0-9]+)-->/);
    const islandId = commentMatch?.[1];

    if (!islandId) {
      return;
    }

    const isOnce = element.getAttribute('props')?.includes('"data-once"');

    if (isOnce && executedOnceScripts.has(islandId)) {
      console.log('[script-island] Skipping duplicate once script:', islandId);
      return;
    }

    console.log('[script-island] Hydrating island:', islandId);

    if (isOnce) {
      executedOnceScripts.add(islandId);
    }

    const componentUrl = element.getAttribute('component-url');

    if (componentUrl?.endsWith('.si')) {
      console.log('[script-island] Dev mode - fetching from virtual module');
      try {
        await import(/* @vite-ignore */ `/@script-island/${islandId}.js`);
      } catch (e) {
        console.error('[script-island] Failed to load script:', e);
      }
      return;
    }

    try {
      const module = await import(/* @vite-ignore */ componentUrl!);
      if (typeof module.default === 'function') {
        await module.default();
      }
    } catch (e) {
      console.error('[script-island] Failed to load script:', e);
    }
  };
};
