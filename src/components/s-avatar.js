import { html, css } from "../utils/template.js";

// @element s-avatar
export default class SAvatar extends HTMLElement {
  static #shadowTemplate = html`
    <template>
      <slot></slot>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: block flex;
      width: 40px;
      height: 40px;
      box-sizing: border-box;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-width: 1px;
      border-style: solid;
      user-select: none;
      -webkit-user-select: none;
    }
    :host([hidden]) {
      display: none;
    }
  `;

  // @property
  // @attribute
  // @type "small" || "large" || null
  // @default null
  get size() {
    let size = this.getAttribute("size");
    return size === "small" || size === "large" ? size : null;
  }
  set size(size) {
    size === "small" || size === "large"
      ? this.setAttribute("size", size)
      : this.removeAttribute("size");
  }

  #shadowRoot;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SAvatar.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SAvatar.#shadowTemplate.content, true)
    );
  }
}

customElements.define("s-avatar", SAvatar);
