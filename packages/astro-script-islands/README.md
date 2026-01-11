# Astro Script Islands

Use Astro's client directives without a framework!

Script Islands brings the power of `client:load`, `client:visible`, `client:idle` and custom directives to vanilla JavaScript.

## Why?

- Use Astro's client directives without framework overhead
- Defer scripts until they're actually needed
- Reduce initial page load and improve performance

> [!CAUTION]
> This package is experimental. While it's tested, there may be edge cases that haven't been considered. Use with caution in production environments. If you are interested in having this functionality officially supported in Astro, please [join the GitHub discussion](https://github.com/withastro/roadmap/discussions/102).

## Installation

```bash
npm install astro-script-islands
```

Add the integration to your `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import ScriptIslands from 'astro-script-islands/integration';

export default defineConfig({
  integrations: [ScriptIslands()],
});
```

## Usage

```astro
---
import ScriptIsland from 'astro-script-islands/component';
---

<ScriptIsland client:idle>
  <script>
    console.log('This script loads when the browser is idle!');
  </script>
</ScriptIsland>
```

For more examples and advanced usage, see the [documentation](https://astro-script-islands.dev).

## License

MIT
