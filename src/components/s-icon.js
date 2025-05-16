import { html, css } from "../utils/template.js";

// @element s-icon
export default class SIcon extends HTMLElement {
  static observedAttributes = ["name", "size"];
  static #shadowTemplate = html`
    <template>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        id="svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <slot></slot>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: block;
      color: currentColor;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
    }
    :host([disabled]) {
      opacity: 0.5;
    }
    :host([hidden]) {
      display: none;
    }
    #svg {
      width: 100%;
      height: 100%;
      overflow: inherit;
      /* @bugfix: pointerOverEvent.relatedTarget leaks shadow DOM of <s-icon> */
      pointer-events: none;
    }

    /* Add styles for different sizes if needed */
    :host([size="small"]) {
      width: 16px;
      height: 16px;
    }
    :host([size="large"]) {
      width: 32px;
      height: 32px;
    }
  `;

  shadowRoot = null;
  _defaultIconsChangeListener = null;
  constructor() {
    super();
    this.shadowRoot = this.attachShadow({ mode: "closed" });
    this.shadowRoot.adoptedStyleSheets = [SIcon.#shadowStyleSheet];
    this.shadowRoot.append(
      document.importNode(SIcon.#shadowTemplate.content, true)
    );

    for (let element of this.shadowRoot.querySelectorAll("[id]")) {
      this["#" + element.id] = element;
    }
  }

  // Lifecycle callbacks
  connectedCallback() {}

  disconnectedCallback() {}

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    } else if (name === "name") {
      this._updateIcon();
    }
    // Handle changes for other observed attributes if necessary
  }

  // Properties linked to attributes

  // @property
  // @attribute
  // @type string
  // @default ""
  get name() {
    return this.hasAttribute("name") ? this.getAttribute("name") : "";
  }
  set name(name) {
    this.setAttribute("name", name);
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
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

  // Private method to update the icon
  _updateIcon() {
    let iconName = this.name.trim();
  }
}

customElements.define("s-icon", SIcon);
