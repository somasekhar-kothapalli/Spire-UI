import { html, css } from "../utils/template.js";

export default class SFooter extends HTMLElement {
  static #shadowTemplate = html` <template> <slot></slot> </template> `;
  static #shadowStyleSheet = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--footer-height);
      padding: 0px;
      background: var(--background-color);
      color: var(--text-color);
      transition: all 0.3s ease-in-out;
    }
  `;

  #shadowRoot = null;
  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SFooter.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SFooter.#shadowTemplate.content, true)
    );
  }
}
customElements.define("s-footer", SFooter);
