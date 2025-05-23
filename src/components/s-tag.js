import Spire from "../classes/spire.js";

import {html, css} from "../utils/template.js";

// @element s-tag
// @part main
// @part scope
// @part remove-button
// @event ^remove - User clicked the remove button of a removable tag.
export default class STag extends HTMLElement {
  static #shadowTemplate = html`
    <template>
      <div id="container">
        <div id="scope" part="scope">
          <slot id="scope-slot" name="scope"></slot>
        </div>

        <div id="main" part="main">
          <slot></slot>

          <svg id="remove-button" part="remove-button" width="12" height="12" viewBox="0 0 100 100">
            <path id="remove-button-path"></path>
          </svg>
        </div>
      </div>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: inline-block;
      height: 24px;
      box-sizing: border-box;
      overflow: hidden;
      color: var(--text-color);
      border-width: 1px;
      border-style: solid;
      cursor: default;
    }
    :host([toggled]) {
      background: gray;
      color: white;
      outline: none;
    }
    :host([disabled]) {
      pointer-events: none;
      opacity: 0.5;
    }
    :host([hidden]) {
      display: none;
    }
    :host(:focus) {
      outline: none;
      z-index: 1;
    }

    #container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #scope {
      height: 100%;
      padding: 0 6px;
      display: none;
      align-items: center;
      justify-content: center;
      border-right-width: 1px;
      border-right-style: solid;
    }
    :host([scoped]) #scope {
      display: flex;
    }

    #main {
      height: 100%;
      padding: 0 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #remove-button {
      display: none;
      opacity: 0.8;
      width: 12px;
      height: 12px;
      vertical-align: middle;
      margin-left: 4px;
      fill: currentColor;
      color: inherit;
      --path-data: M 25 16 L 50 41 L 75 16 L 84 25 L 59 50 L 84 75 L 75 84 L 50 59 L 25 84 L 16 75 L 41 50 L 16 25 Z;
    }
    :host([removable]) #remove-button {
      display: block;
    }
    #remove-button:hover {
      opacity: 1;
    }

    #remove-button path {
      fill: inherit;
      pointer-events: none;
    }
  `;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @property
  // @attribute
  // @type string?
  // @default null
  get value() {
    return this.hasAttribute("value") ? this.getAttribute("value") : null;
  }
  set value(value) {
    value === null ? this.removeAttribute("value") : this.setAttribute("value", value);
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  get removable() {
    return this.hasAttribute("removable");
  }
  set removable(removable) {
    removable ? this.setAttribute("removable", "") : this.removeAttribute("removable");
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  get toggled() {
    return this.hasAttribute("toggled");
  }
  set toggled(toggled) {
    toggled ? this.setAttribute("toggled", "") : this.removeAttribute("toggled");
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(disabled) {
    disabled ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
  }

  // @property
  // @attribute
  // @type "small" || "large" || null
  // @default null
  get size() {
    let size = this.getAttribute("size");
    return (size === "small" || size === "large") ? size : null;
  }
  set size(size) {
    (size === "small" || size === "large") ? this.setAttribute("size", size) : this.removeAttribute("size");
  }

  #shadowRoot = null;
  #xelThemeChangeListener = null;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({mode: "closed"});
    this.#shadowRoot.adoptedStyleSheets = [STag.#shadowStyleSheet];
    this.#shadowRoot.append(document.importNode(STag.#shadowTemplate.content, true));

    for (let element of this.#shadowRoot.querySelectorAll("[id]")) {
      this["#" + element.id] = element;
    }

    this["#scope-slot"].addEventListener("slotchange", () => this.#updateScopedAttribute());
    this["#remove-button"].addEventListener("click", (event) => this.#onRemoveButtonClick(event));
  }

  connectedCallback() {
    Spire.whenThemeReady.then(() => {
      this.#updateRemoveButtonPathData();
    });

    this.#updateScopedAttribute();

    Spire.addEventListener("themechange", this.#xelThemeChangeListener = () => this.#updateRemoveButtonPathData());

    if (this.closest("s-tags")) {
      this.tabIndex = 0;
      this.removable = false;
    }
    else if (this.closest("s-tagsinput")) {
      this.toggled = false;
      this.tabIndex = 0;
      this.removable = true;
    }
    else {
      this.removable = false;
    }
  }

  disconnectedCallback() {
    Spire.removeEventListener("themechange", this.#xelThemeChangeListener);
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  #onRemoveButtonClick(event) {
    if (event.buttons <= 1) {
      this.dispatchEvent(new CustomEvent("remove", {bubbles: true}));
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  #updateRemoveButtonPathData() {
    let pathData = getComputedStyle(this["#remove-button"]).getPropertyValue("--path-data");
    this["#remove-button-path"].setAttribute("d", pathData);
  }

  #updateScopedAttribute() {
    if (this["#scope-slot"].assignedElements().length === 0) {
      this.removeAttribute("scoped");
    }
    else {
      this.setAttribute("scoped", "");
    }
  }
}

customElements.define("s-tag", STag);
