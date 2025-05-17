import { html, css } from "../utils/template.js";

// @element s-button
// @event toggle - User toggled the button on or off by clicking it.
export default class SButton extends HTMLElement {
  static observedAttributes = ["disabled", "skin", "size"];

  static #shadowTemplate = html`
    <template>
      <slot></slot>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      user-select: none;
      -webkit-user-select: none;
      display: inline-flex;
      gap: 6px;
      align-items: center;
      justify-content: center;
      width: fit-content;
      height: fit-content;
      min-height: 36px;
      padding: 4px 16px;
      box-sizing: border-box;
      opacity: 1;
      position: relative;
      cursor: pointer;
      font-size: 16px;
      border: 2px solid var(--border-color);
      border-radius: var(--border-radius);
      color: var(--text-color);
      transition: all 0.3s ease-in-out;
    }
    :host(:focus) {
      outline: none;
    }
    :host(:hover) {
      border-color: var(--accent-color);
      color: var(--accent-color);
      background-color: var(--color-primary);
    }
    :host(:active) {
      border-color: var(--accent-color);
      color: var(--accent-color);
      background-color: var(--color-primary-foreground);
    }
    :host([disabled]) {
      pointer-events: none;
      opacity: 0.6;
      cursor: not-allowed;
    }
    :host([hidden]) {
      display: none;
    }

    /* Skin variations */
    :host([skin="flat"]) {
      background-color: var(--color-primary);
      color: var(--color-primary-foreground);
      border-color: var(--color-primary);
    }
    :host([skin="flat"]:active) {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background-color: var(--color-primary-foreground);
    }
    :host([skin="stroked"]) {
      background-color: transparent;
      color: var(--color-primary);
      border-color: var(--color-primary);
    }
    :host([skin="stroked"]:hover) {
      background-color: var(--color-primary);
      color: var(--color-primary-foreground);
    }
    :host([skin="stroked"]:active) {
      background-color: var(--color-primary-foreground);
      color: var(--color-primary);
    }
    :host([skin="icon"]) {
      min-width: 36px;
      padding: 10px;
    }
    :host([skin="icon-outlined"]) {
      padding: 10px;
      background: var(--background-color);
    }

    /* Size variations */
    :host([size="small"]) {
      min-height: 24px;
      font-size: 12px;
    }
    :host([size="large"]) {
      min-height: 38px;
      font-size: 18px;
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
  // @type "normal" || "flat" || "stroked" || "icon" || "icon-outlined"
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

    // Add event listeners for handling interactions
    this.addEventListener("click", this._handleClick);
    this.addEventListener("keydown", this._handleKeyDown);
  }

  connectedCallback() {
    this._updateAccessibilityAttributes();
    this._updateSkinAttribute();
  }

  disconnectedCallback() {}

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "disabled") {
      this._updateAccessibilityAttributes();
    }
    if (name === "skin") {
      this._updateSkinAttribute();
    }
  }

  _updateAccessibilityAttributes() {
    this.setAttribute("role", "button");
    this.setAttribute("aria-disabled", this.disabled);
  }

  _updateSkinAttribute() {
    if (this.hasAttribute("skin") === false) {
      this.setAttribute("skin", "normal");
    }
  }

  _handleClick(event) {
    if (this.disabled) {
      event.preventDefault();
      return;
    }

    // Handle togglable behavior
    if (this.hasAttribute("togglable")) {
      this.toggled = !this.toggled;
      this.dispatchEvent(
        new CustomEvent("toggle", { detail: { toggled: this.toggled } })
      );
    }

    // Add any other click-related logic here
  }

  _handleKeyDown(event) {
    if (this.disabled) {
      return;
    }

    // Handle keyboard interactions (e.g., Space or Enter to activate)
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      this.click(); // Trigger a click event
    }
  }
}

customElements.define("s-button", SButton);
