import { html, css } from "../utils/template.js";

export default class SContent extends HTMLElement {
  static #shadowTemplate = html` <template> <slot></slot> </template> `;
  static #shadowStyleSheet = css`
    :host {
    }
  `;

  #shadowRoot;

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SContent.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SContent.#shadowTemplate.content, true)
    );
  }
}

customElements.define("s-content", SContent);
