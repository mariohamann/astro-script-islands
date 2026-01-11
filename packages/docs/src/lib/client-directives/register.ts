import type { AstroIntegration } from "astro";

export default (): AstroIntegration => ({
  name: "client:tracking",
  hooks: {
    "astro:config:setup": ({ addClientDirective }) => {
      addClientDirective({
        name: "tracking",
        entrypoint: "./src/lib/client-directives/tracking.ts",
      });
    },
  },
});
