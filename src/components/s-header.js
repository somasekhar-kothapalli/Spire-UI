import { html, css } from "../utils/template.js";

export default class SHeader extends HTMLElement {
  static #shadowTemplate = html` <template> <slot></slot> </template> `;
  static #shadowStyleSheet = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: fit-content;
      padding: 0px;
      background: var(--background-color);
      color: var(--text-color);
      transition: width 0.3s ease-in-out;
    }
  `;

  #shadowRoot = null;
  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SHeader.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SHeader.#shadowTemplate.content, true)
    );
  }
}
customElements.define("s-header", SHeader);
