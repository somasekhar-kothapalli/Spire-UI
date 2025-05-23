import { createElement } from "../utils/element.js";
import { html, css } from "../utils/template.js";
import { getBrowserEngine } from "../utils/system.js";
import { sleep } from "../utils/time.js";

// @element s-texteditor
// @event ^input
// @event ^change
// @event ^textinputmodestart
// @event ^textinputmodeend
// @event beforevalidate
export default class STextEditor extends HTMLElement {
  static observedAttributes = ["value", "spellcheck", "disabled", "validation"];

  static #shadowTemplate = html`
    <template>
      <div id="main">
        <slot></slot>
        <div
          id="editor"
          contenteditable="plaintext-only"
          spellcheck="false"
        ></div>
      </div>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: block flex;
      position: relative;
      width: 100%;
      min-height: 100px;
      box-sizing: border-box;
      font-size: 0.78125rem;
      overflow: auto;
    }
    :host(:hover) {
      cursor: text;
    }
    :host([mixed]) {
      color: rgba(0, 0, 0, 0.7);
    }
    :host([disabled]) {
      pointer-events: none;
      opacity: 0.5;
    }
    :host([hidden]) {
      display: none;
    }

    ::selection {
      color: var(--selection-color);
      background-color: var(--selection-background-color);
    }
    :host(:not(:focus)) ::selection {
      color: inherit;
      background: none;
    }

    ::-webkit-scrollbar {
      max-width: 6px;
      max-height: 6px;
      background: none;
    }
    ::-webkit-scrollbar-track {
      border-radius: 25px;
    }
    ::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 25px;
    }
    ::-webkit-scrollbar-corner {
      display: none;
    }

    #main {
      display: flex;
      flex-flow: column;
      width: 100%;
      min-height: 100%;
    }

    #editor {
      flex: 1;
      padding: 2px 6px;
      box-sizing: border-box;
      color: inherit;
      background: none;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: inherit;
    }
  `;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @property
  // @attribute
  // @type string
  // @default ""
  get value() {
    return this["#editor"].textContent;
  }
  set value(value) {
    this["#editor"].textContent = value;

    if (this.matches(":focus")) {
      document.execCommand("selectAll");
      let selection =
        getBrowserEngine() === "chromium"
          ? this.#shadowRoot.getSelection()
          : window.getSelection();
      selection.collapseToEnd();
    }

    if (this.validation === "instant") {
      this.reportValidity();
    } else if (this.validation === "auto" || this.validation === "manual") {
      if (this.#error || this.#customError) {
        this.reportValidity();
      }
    }

    this.#updateEmptyAttribute();
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  get spellcheck() {
    return this.hasAttribute("spellcheck");
  }
  set spellcheck(spellcheck) {
    spellcheck
      ? this.setAttribute("spellcheck", "")
      : this.removeAttribute("spellcheck");
  }

  // @property
  // @attribute
  // @type number
  // @default 0
  get minLength() {
    return this.hasAttribute("minlength")
      ? parseInt(this.getAttribute("minlength"))
      : 0;
  }
  set minLength(minLength) {
    this.setAttribute("minlength", minLength);
  }

  // @property
  // @attribute
  // @type number || Infinity
  // @default 0
  get maxLength() {
    return this.hasAttribute("maxlength")
      ? parseInt(this.getAttribute("maxlength"))
      : Infinity;
  }
  set maxLength(maxLength) {
    this.setAttribute("maxlength", maxLength);
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  get required() {
    return this.hasAttribute("required");
  }
  set required(required) {
    required
      ? this.setAttribute("required", "")
      : this.removeAttribute("required");
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  //
  // Whether this text editor has "mixed" state.
  get mixed() {
    return this.hasAttribute("mixed");
  }
  set mixed(mixed) {
    mixed ? this.setAttribute("mixed", "") : this.removeAttribute("mixed");
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
  // @type "auto" || "instant" || "manual"
  // @default "auto"
  //
  // - <em>"auto"</em> - validation is performed when input loses focus and when user presses "Enter"<br/>
  // - <em>"instant"</em> - validation is performed on each key press<br/>
  // - <em>"manual"</em>  - you will call reportValidity() manually when user submits the form<br/>
  get validation() {
    return this.hasAttribute("validation")
      ? this.getAttribute("validation")
      : "auto";
  }
  set validation(validation) {
    this.setAttribute("validation", validation);
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

  // @property
  // @attribute
  // @type boolean
  // @default false
  // @readOnly
  get empty() {
    return this.hasAttribute("empty");
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  // @readOnly
  get error() {
    return this.hasAttribute("error");
  }

  #shadowRoot = null;
  #focusInValue = "";
  #lastTabIndex = 0;
  #error = null;
  #customError = null;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({
      mode: "closed",
      delegatesFocus: true,
    });
    this.#shadowRoot.adoptedStyleSheets = [STextEditor.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(STextEditor.#shadowTemplate.content, true)
    );

    for (let element of this.#shadowRoot.querySelectorAll("[id]")) {
      this["#" + element.id] = element;
    }

    this.addEventListener("click", (event) => this.#onClick(event));
    this.addEventListener("focusin", (event) => this.#onFocusIn(event));
    this.addEventListener("focusout", (event) => this.#onFocusOut(event));

    this["#editor"].addEventListener("click", (event) =>
      this.#onEditorClick(event)
    );
    this["#editor"].addEventListener("input", (event) =>
      this.#onEditorInput(event)
    );

    // @bugfix: https://bugzilla.mozilla.org/show_bug.cgi?id=1291467
    if (getBrowserEngine() === "gecko") {
      this["#editor"].setAttribute("contenteditable", "");

      this["#editor"].addEventListener("beforeinput", (event) => {
        if (
          event.inputType === "insertFromPaste" &&
          event.dataTransfer.types.includes("text/plain")
        ) {
          event.preventDefault();

          let selection = window.getSelection();
          let range = selection.getRangeAt(0);

          range.deleteContents();
          range.insertNode(
            document.createTextNode(event.dataTransfer.getData("text/plain"))
          );
          selection.collapseToEnd();
        }
      });
    }
  }

  connectedCallback() {
    this.#updateAccessabilityAttributes();
    this.#updateEmptyAttribute();

    if (this.validation === "instant") {
      this.reportValidity();
    } else if (this.validation === "auto" || this.validation === "manual") {
      if (this.#error || this.#customError) {
        this.reportValidity();
      }
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    } else if (name === "value") {
      this.#onValueAttributeChange();
    } else if (name === "spellcheck") {
      this.#onSpellcheckAttributeChange();
    } else if (name === "disabled") {
      this.#onDisabledAttributeChange();
    } else if (name === "validation") {
      this.#onValidationAttributeChnage();
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @method
  // @type () => boolean
  reportValidity() {
    let beforeValidateEvent = new CustomEvent("beforevalidate", {
      bubbles: false,
      cancelable: true,
    });
    this.dispatchEvent(beforeValidateEvent);

    if (beforeValidateEvent.defaultPrevented === false) {
      if (this.value.length < this.minLength) {
        this.#error = { href: "#entered-text-is-too-short" };
      } else if (this.value.length > this.maxLength) {
        this.#error = { href: "#entered-text-is-too-long" };
      } else if (this.required && this.value.length === 0) {
        this.#error = { href: "#required-field" };
      } else {
        this.#error = null;
      }

      this.#updateValidityIndicators();
    }

    return this.#error === null && this.#customError === null;
  }

  // @method
  // @type (string || {href:string, args:Object}) => void
  setCustomValidity(arg) {
    if (arg === "") {
      this.#customError = null;
    } else {
      this.#customError = arg;
    }

    this.#updateValidityIndicators();
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  #updateValidityIndicators() {
    let error = this.#customError || this.#error;

    // Update "error" attribute
    {
      if (error) {
        this.setAttribute("error", "");
      } else {
        this.removeAttribute("error");
      }
    }

    // Update <x-tooltip>
    {
      let tooltip = this.querySelector(`:scope > x-tooltip[type="error"]`);

      if (error && this.matches(":focus")) {
        if (!tooltip) {
          tooltip = createElement("x-tooltip");
          tooltip.setAttribute("type", "error");
          this.append(tooltip);
        }

        if (error.href) {
          let args = error.args
            ? Object.entries(error.args)
                .map(([key, val]) => `${key}:${val}`)
                .join(",")
            : "";
          tooltip.innerHTML = `<x-message href="${error.href}" args="${args}"></x-message>`;
        } else {
          tooltip.innerHTML = error;
        }

        sleep(10).then(() => {
          tooltip.open(this);
        });
      } else {
        if (tooltip) {
          tooltip.close().then(() => tooltip.remove());
        }
      }
    }
  }

  #updateEmptyAttribute() {
    if (this.value.length === 0) {
      this.setAttribute("empty", "");
    } else {
      this.removeAttribute("empty");
    }
  }

  #updateAccessabilityAttributes() {
    this.setAttribute("role", "input");
    this.setAttribute("aria-disabled", this.disabled);

    if (this.disabled) {
      this.#lastTabIndex = this.tabIndex > 0 ? this.tabIndex : 0;
      this.tabIndex = -1;
    } else {
      if (this.tabIndex < 0) {
        this.tabIndex = this.#lastTabIndex > 0 ? this.#lastTabIndex : 0;
      }

      this.#lastTabIndex = 0;
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  #onValueAttributeChange() {
    this.value = this.hasAttribute("value") ? this.getAttribute("value") : "";

    if (this.matches(":focus")) {
      document.execCommand("selectAll");
    }
  }

  #onSpellcheckAttributeChange() {
    this["#editor"].spellcheck = this.spellcheck;
  }

  #onDisabledAttributeChange() {
    this["#editor"].contentEditable = this.disabled
      ? "false"
      : "plaintext-only";
    this.#updateAccessabilityAttributes();
  }

  #onValidationAttributeChnage() {
    if (this.validation === "instant") {
      this.reportValidity();
    } else if (this.validation === "auto" || this.validation === "manual") {
      if (this.#error || this.#customError) {
        this.reportValidity();
      }
    }
  }

  #onClick() {
    this.#updateValidityIndicators();
  }

  #onFocusIn() {
    this.#focusInValue = this.value;
    this.#updateValidityIndicators();
    this.dispatchEvent(
      new CustomEvent("textinputmodestart", { bubbles: true, composed: true })
    );
  }

  #onFocusOut() {
    this.dispatchEvent(
      new CustomEvent("textinputmodeend", { bubbles: true, composed: true })
    );

    if (this.validation === "auto" || this.validation === "instant") {
      this.reportValidity();
    } else if (this.validation === "manual") {
      this.#updateValidityIndicators();
    }

    let error = this.#error || this.#customError;

    if (error === null && (this.value !== this.#focusInValue || this.mixed)) {
      this.mixed = false;
      this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
    }

    (getBrowserEngine() === "chromium" ? this.#shadowRoot : window)
      .getSelection()
      .collapse(this["#main"]);
  }

  #onEditorClick(event) {
    if (event.detail >= 4) {
      document.execCommand("selectAll");
    }
  }

  #onEditorInput(event) {
    this.dispatchEvent(new CustomEvent("input", { bubbles: true }));
    this.#updateEmptyAttribute();

    if (this.validation === "instant") {
      this.reportValidity();
    } else if (this.validation === "auto" || this.validation === "manual") {
      if (this.#error || this.#customError) {
        this.reportValidity();
      }
    }
  }
}

customElements.define("s-texteditor", STextEditor);
