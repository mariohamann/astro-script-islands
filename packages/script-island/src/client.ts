export default (element: HTMLElement) =>
  (
    Component: unknown,
    props: Record<string, unknown>,
    slots: Record<string, string>,
    { client }: { client: string; }
  ) => {
    const comment = Array.from(element.childNodes).find(
      (node): node is Comment =>
        node.nodeType === Node.COMMENT_NODE &&
        node.nodeValue?.startsWith('script-island:') === true
    );

    if (comment?.nodeValue) {
      const hash = comment.nodeValue.replace('script-island:', '');

      import(/* @vite-ignore */ `/virtual:script-island:${hash}`).catch((error) => {
        console.error(`[script-island] Failed to load script for hash ${hash}:`, error);
      });
    }
  };
