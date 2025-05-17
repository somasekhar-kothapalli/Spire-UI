import { html, css } from "../utils/template.js";

export default class SContainer extends HTMLElement {
  static #shadowTemplate = html` <template> <slot></slot> </template> `;
  static #shadowStyleSheet = css`
    :host {
      display: block;
      padding: 0px;
      background: var(--background-color);
      color: var(--text-color);
      transition: width 0.3s ease-in-out;
      overflow-x: hidden;
      overflow-y: scroll;
    }
    :host::-webkit-scrollbar {
      width: 6px;
      background: var(--foreground-color);
      margin-inline-end: 20px;
    }
    :host::-webkit-scrollbar-thumb {
      background: var(--accent-color);
      border-radius: var(--border-radius);
    }
    :host::-webkit-scrollbar-thumb(:hover) {
      background: var(--background-color);
    }
  `;

  #shadowRoot = null;
  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SContainer.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SContainer.#shadowTemplate.content, true)
    );
  }
}
customElements.define("s-container", SContainer);
