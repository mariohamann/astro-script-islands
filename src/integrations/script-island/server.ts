export function check(Component: any) {
  return Component?.isScriptIsland === true;
}

export function renderToStaticMarkup(_Component: any, props: Record<string, any>, slotted: any) {
  const defaultSlot = slotted?.default?.toString() || '';

  // Extract the script src from the slotted content
  const srcMatch = defaultSlot.match(/src="([^"]+)"/);
  const scriptSrc = srcMatch?.[1] || '';

  // Pass through any additional props as data attributes
  const dataAttrs = Object.entries(props)
    .filter(([key]) => key.startsWith('data-'))
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  return {
    html: `<script-island${scriptSrc ? ` data-script="${scriptSrc}"` : ''}${dataAttrs ? ` ${dataAttrs}` : ''}></script-island>`,
  };
}

export default {
  check,
  renderToStaticMarkup,
};
