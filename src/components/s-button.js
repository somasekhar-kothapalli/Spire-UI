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
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: center;
      width: fit-content;
      height: fit-content;
      min-height: 32px;
      padding: 2px 14px;
      box-sizing: border-box;
      opacity: 1;
      position: relative;
      cursor: pointer;
      transition: all 0.3s ease-in-out;
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
      opacity: 0.6;
      cursor: not-allowed;
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
  // @type "normal" || "flat" || "outlined" || "icon" || "icon-outlined" || "recessed" || "dock"
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
    this.setAttribute("pressed", "");
    setTimeout(() => {
      this.removeAttribute("pressed");
    }, 100);

    // Add any other click-related logic here
    // Toggle the button
    if (this.hasAttribute("togglable") && event.defaultPrevented === false) {
      this.removeAttribute("pressed");
      this.toggled = !this.toggled;
      this.dispatchEvent(new CustomEvent("toggle"));
    }
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
