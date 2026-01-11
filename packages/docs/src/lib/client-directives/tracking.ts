import type { ClientDirective } from "astro";

export default (function (load, _opts, element) {
  window.addEventListener(
    "tracking-activated",
    async () => {
      const hydrate = await load();
      await hydrate();
    },
    { once: true },
  );
} satisfies ClientDirective);
