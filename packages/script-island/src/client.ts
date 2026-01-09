const originalImport = window.import || ((...args) => import(...args));

const scriptIslandMap = new Map<string, string>();

document.addEventListener('DOMContentLoaded', () => {
  const islands = document.querySelectorAll('astro-island');

  islands.forEach((island) => {
    const comment = Array.from(island.childNodes).find(
      (node) => node.nodeType === Node.COMMENT_NODE && node.nodeValue?.startsWith('script-island:')
    );

    if (comment && comment.nodeValue) {
      const hash = comment.nodeValue.replace('script-island:', '');
      const componentUrl = island.getAttribute('component-url');

      if (componentUrl?.endsWith('.si')) {
        island.setAttribute('component-url', `/virtual:script-island:${hash}`);
      }
    }
  });
});
