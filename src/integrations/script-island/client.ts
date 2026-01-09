export class ScriptIsland extends HTMLElement {
  async connectedCallback() {
    const scriptSrc = this.getAttribute('data-script');

    if (scriptSrc) {
      await import(/* @vite-ignore */ scriptSrc);
      return;
    }

    const inlineScript = this.querySelector('script');

    if (inlineScript?.textContent) {
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = inlineScript.textContent;
      document.head.appendChild(script);
    }
  }
}

customElements.define('script-island', ScriptIsland);
