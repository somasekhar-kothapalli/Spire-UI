import { html, css } from "../utils/template.js";
export default class SLayout extends HTMLElement {
  static #shadowTemplate = html`
    <template>
      <s-sidebar id="sidebar" expandable="true">
        <div slot="container">
          <slot name="sidebar-container"></slot>
        </div>
        <div slot="footer">
          <slot name="sidebar-footer"></slot>
        </div>
      </s-sidebar>
      <main class="s-container">

        <s-container id="container-content">
          <slot name="container-content"></slot>
        </s-container>
      </main>
    </template>
  `;
  static #shadowStyleSheet = css`
    :host {
      display: flex;
      flex-direction: row;
      color: var(--text-color);
      background-color: var(--foreground-color);
      height: 100%;
      width: 100%;
      overflow: hidden;
    }

    .s-container {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      margin: 10px 10px 10px 0px;
    }

    .s-content {
      display: block;
      background: var(--background-color);
      border: 1px solid var(--s-primary-color);
      color: var(--text-color);
      overflow: auto;
      height: 100%;
    }
    s-container {
      padding: 15px;
      border-radius: 16px;
    }
  `;

  #shadowRoot = null;

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SLayout.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SLayout.#shadowTemplate.content, true)
    );
  }
}

customElements.define("s-layout", SLayout);
