import { html, css } from "../utils/template.js";

export default class SContainer extends HTMLElement {
  static #shadowTemplate = html` <template> <slot></slot> </template> `;
  static #shadowStyleSheet = css`
    :host {
      display: block;
      padding: 0px;
      background: var(--foreground-color);
      color: var(--text-color);
      transition: width 0.3s ease-in-out;
      overflow: hidden;
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
