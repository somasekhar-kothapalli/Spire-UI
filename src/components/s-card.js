import { html, css } from "../utils/template.js";

// @element s-card
export default class SCard extends HTMLElement {
  static #shadowTemplate = html`
    <template>
      <slot></slot>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: block;
      width: 100%;
      min-width: 20px;
      min-height: 48px;
      box-sizing: border-box;
      margin: 30px 0;
      padding: 16px 20px;
    }
    :host([hidden]) {
      display: none;
    }

    slot {
      border-radius: inherit;
    }
  `;

  #shadowRoot = null;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SCard.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SCard.#shadowTemplate.content, true)
    );
  }
}

customElements.define("s-card", SCard);
