import { html, css } from "../utils/template.js";

// @element s-progressbar
// @part bar
export default class SProgressbar extends HTMLElement {
  static observedAttributes = ["value", "max", "disabled"];

  static #shadowTemplate = html`
    <template>
      <div id="determinate-bar" part="bar"></div>

      <div id="indeterminate-bars">
        <div id="primary-indeterminate-bar" part="bar"></div>
        <div id="secondary-indeterminate-bar" part="bar"></div>
      </div>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: block;
      box-sizing: border-box;
      height: 8px;
      width: 100%;
      position: relative;
      contain: strict;
      overflow: hidden;
      cursor: default;
    }
    :host([hidden]) {
      display: none;
    }

    #indeterminate-bars {
      width: 100%;
      height: 100%;
    }

    #determinate-bar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 0%;
      height: 100%;
      background: #3b99fb;
      transition: width 0.4s ease-in-out;
      will-change: left, right;
    }
    :host([value="-1"]) #determinate-bar {
      visibility: hidden;
    }

    #primary-indeterminate-bar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      height: 100%;
      background: #3b99fb;
      will-change: left, right;
    }

    #secondary-indeterminate-bar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      height: 100%;
      background: #3b99fb;
      will-change: left, right;
    }
  `;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @property
  // @attribute
  // @type number?
  // @default null
  //
  // Current progress, in procentages.
  get value() {
    return this.hasAttribute("value")
      ? parseFloat(this.getAttribute("value"))
      : null;
  }
  set value(value) {
    value === null
      ? this.removeAttribute("value")
      : this.setAttribute("value", value);
  }

  // @property
  // @attribute
  // @type number
  // @default 1
  get max() {
    return this.hasAttribute("max") ? parseFloat(this.getAttribute("max")) : 1;
  }
  set max(max) {
    this.setAttribute("max", max);
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

  #shadowRoot = null;
  #indeterminateAnimations = null;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SProgressbar.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SProgressbar.#shadowTemplate.content, true)
    );

    for (let element of this.#shadowRoot.querySelectorAll("[id]")) {
      this["#" + element.id] = element;
    }
  }

  connectedCallback() {
    this.#update();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    } else if (name === "value") {
      this.#update();
    } else if (name === "disabled") {
      this.#update();
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  #update() {
    // Determinate bar
    {
      // Hide
      if (this.value === null || this.value === -1 || this.disabled) {
        this["#determinate-bar"].style.width = "0%";
      }
      // Show
      else {
        this["#determinate-bar"].style.width =
          (this.value / this.max) * 100 + "%";
      }
    }

    // Indeterminate bars
    {
      // Hide
      if (this.value !== null || this.disabled) {
        if (this.#indeterminateAnimations) {
          for (let animation of this.#indeterminateAnimations) {
            animation.cancel();
          }

          this.#indeterminateAnimations = null;
        }
      }
      // Show
      else {
        if (!this.#indeterminateAnimations) {
          this.#indeterminateAnimations = [
            this["#primary-indeterminate-bar"].animate(
              [
                { left: "-35%", right: "100%", offset: 0.0 },
                { left: "100%", right: "-90%", offset: 0.6 },
                { left: "100%", right: "-90%", offset: 1.0 },
              ],
              {
                duration: 2000,
                easing: "ease-in-out",
                iterations: Infinity,
              }
            ),
            this["#secondary-indeterminate-bar"].animate(
              [
                { left: "-100%", right: "100%", offset: 0.0 },
                { left: "110%", right: "-30%", offset: 0.8 },
                { left: "110%", right: "-30%", offset: 1.0 },
              ],
              {
                duration: 2000,
                delay: 1000,
                easing: "ease-in-out",
                iterations: Infinity,
              }
            ),
          ];
        }
      }
    }
  }
}

customElements.define("s-progressbar", SProgressbar);
