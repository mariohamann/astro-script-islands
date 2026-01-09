export default (element: HTMLElement) => {
  return async (_Component: unknown, _props: Record<string, unknown>, slots: Record<string, string>) => {
    const scriptIsland = element.querySelector('script-island');
    const scriptSrc = scriptIsland?.getAttribute('data-script');

    if (scriptSrc) {
      await import(/* @vite-ignore */ scriptSrc);
      return;
    }

    const slotContent = slots?.default || '';
    const scriptMatch = slotContent.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

    if (scriptMatch?.[1]) {
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = scriptMatch[1];
      document.head.appendChild(script);
    }
  };
};
