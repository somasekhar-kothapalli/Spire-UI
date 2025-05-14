import { html, css } from "../utils/template.js";

// @element s-button
// @event toggle - User toggled the button on or off by clicking it.
export default class SButton extends HTMLElement {
  static observedAttributes = ["disabled", "skin"];

  static #shadowTemplate = html`
    <template>
      <slot></slot>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
      height: fit-content;
      min-height: 32px;
      padding: 3px 16px;
      box-sizing: border-box;
      opacity: 1;
      position: relative;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      border-radius: 16px;
    }
    :host(:focus) {
      outline: none;
    }
    :host(:focus:not(:active)) {
      z-index: 1;
    }
    :host([mixed]) {
      opacity: 0.75;
    }
    :host([disabled]) {
      pointer-events: none;
      opacity: 0.5;
    }
    :host([hidden]) {
      display: none;
    }
  `;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @property
  // @attribute
  // @type string?
  // @default null
  //
  // A unique value associated with this button.
  get value() {
    return this.hasAttribute("value") ? this.getAttribute("value") : null;
  }
  set value(value) {
    value === null
      ? this.removeAttribute("value")
      : this.setAttribute("value", value);
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  //
  // Whether this button is disabled.
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(disabled) {
    disabled
      ? this.setAttribute("disabled", "")
      : this.removeAttribute("disabled");
  }

  // @property
  // @attribute
  // @type "normal" || "flat" || "raised" || "stroked" || "icon"
  // @default "normal"
  get skin() {
    return this.hasAttribute("skin") ? this.getAttribute("skin") : "normal";
  }
  set skin(skin) {
    this.setAttribute("skin", skin);
  }

  // @property
  // @attribute
  // @type "normal" || "small" || "large"
  // @default "normal"
  get size() {
    let size = this.getAttribute("size");
    return size === "small" || size === "large" ? size : "normal";
  }
  set size(size) {
    size === "small" || size === "large"
      ? this.setAttribute("size", size)
      : this.removeAttribute("size");
  }

  #shadowRoot = null;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SButton.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SButton.#shadowTemplate.content, true)
    );

    for (let element of this.#shadowRoot.querySelectorAll("[id]")) {
      this["#" + element.id] = element;
    }
  }

  connectedCallback() {}
  disconnectedCallback() {}
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "disabled") {
      this.updateDisabledAttribute();
    }
    if (name === "skin") {
      this.updateSkinAttribute();
    }
  }

  updateDisabledAttribute() {
    this.setAttribute("role", "button");
    this.setAttribute("aria-disabled", this.disabled);
  }

  updateSkinAttribute() {
    if (this.hasAttribute("skin") === false) {
      this.setAttribute("skin", "normal");
    }
  }
}

customElements.define("s-button", SButton);
