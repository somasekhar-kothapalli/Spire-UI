import { isNumeric } from "../utils/string.js";
import { html, css } from "../utils/template.js";
import { getBrowserEngine } from "../utils/system.js";
import { debounce, sleep } from "../utils/time.js";
import {
  normalize,
  getPrecision,
  getDistanceBetweenPoints,
} from "../utils/math.js";

let { isFinite } = Number;

const NUMERIC_KEYS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "-",
  "+",
  ",",
  ".",
];

// @element s-numberinput
// @event ^change
// @event ^changestart
// @event ^changeend
// @event ^textinputmodestart
// @event ^textinputmodeend
export default class SNumberInput extends HTMLElement {
  static observedAttributes = [
    "value",
    "min",
    "max",
    "prefix",
    "suffix",
    "disabled",
  ];

  static #shadowTemplate = html`
    <template>
      <div id="main">
        <div id="editor-container">
          <div
            id="editor"
            contenteditable="plaintext-only"
            spellcheck="false"
          ></div>
        </div>
        <slot></slot>
      </div>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: block;
      position: relative;
      max-width: 160px;
      height: 32px;
      box-sizing: border-box;
      font-size: 0.78125rem;
      line-height: 10;
      --inner-padding: 0 6px;
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

    #main {
      display: flex;
      align-items: center;
      height: 100%;
    }

    #editor-container {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      padding: var(--inner-padding);
      box-sizing: border-box;
      overflow: hidden;
    }

    #editor {
      width: 100%;
      color: inherit;
      background: none;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    :host(:focus) #editor {
      overflow: visible;
      text-overflow: clip;
    }
    :host([disabled]) #editor {
      user-select: none;
      -webkit-user-select: none;
    }
    #editor::-webkit-scrollbar {
      display: none;
    }
    #editor::before {
      content: attr(data-prefix);
      pointer-events: none;
    }
    #editor::after {
      content: attr(data-suffix);
      pointer-events: none;
    }
    :host([empty]) #editor::before,
    :host([empty]) #editor::after,
    :host(:focus) #editor::before,
    :host(:focus) #editor::after {
      display: none;
    }
  `;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @property
  // @attribute
  // @type number?
  // @default null
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
  // @default Infinity
  get min() {
    return this.hasAttribute("min")
      ? parseFloat(this.getAttribute("min"))
      : -Infinity;
  }
  set min(min) {
    isFinite(min) ? this.setAttribute("min", min) : this.removeAttribute("min");
  }

  // @property
  // @attribute
  // @type number
  // @default Infinity
  get max() {
    return this.hasAttribute("max")
      ? parseFloat(this.getAttribute("max"))
      : Infinity;
  }
  set max(max) {
    isFinite(max) ? this.setAttribute("max", max) : this.removeAttribute("max");
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  get mixed() {
    return this.hasAttribute("mixed");
  }
  set mixed(mixed) {
    mixed ? this.setAttribute("mixed", "") : this.removeAttribute("mixed");
  }

  // @property
  // @attribute
  // @type number
  // @default 20
  //
  // Maximal number of digits to be shown after the dot. This setting affects only the display value.
  get precision() {
    return this.hasAttribute("precision")
      ? parseFloat(this.getAttribute("precision"))
      : 20;
  }
  set precision(value) {
    this.setAttribute("precision", value);
  }

  // @property
  // @attribute
  // @type number
  // @default 1
  //
  // Number by which value should be incremented or decremented when up or down arrow key is pressed.
  get step() {
    return this.hasAttribute("step")
      ? parseFloat(this.getAttribute("step"))
      : 1;
  }
  set step(step) {
    this.setAttribute("step", step);
  }

  // @property
  // @attribute
  // @type string
  // @default ""
  get prefix() {
    return this.hasAttribute("prefix") ? this.getAttribute("prefix") : "";
  }
  set prefix(prefix) {
    this.setAttribute("prefix", prefix);
  }

  // @property
  // @attribute
  // @type string
  // @default ""
  get suffix() {
    return this.hasAttribute("suffix") ? this.getAttribute("suffix") : "";
  }
  set suffix(suffix) {
    this.setAttribute("suffix", suffix);
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  //
  // Whether this input has "mixed" state.
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
  #lastTabIndex = 0;

  #isDragging = false;
  #isChangeStart = false;
  #isArrowKeyDown = false;
  #isBackspaceKeyDown = false;
  #isStepperButtonDown = false;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({
      mode: "closed",
      delegatesFocus: true,
    });
    this.#shadowRoot.adoptedStyleSheets = [
      SNumberInput.#shadowStyleSheet,
    ];
    this.#shadowRoot.append(
      document.importNode(SNumberInput.#shadowTemplate.content, true)
    );

    for (let element of this.#shadowRoot.querySelectorAll("[id]")) {
      this["#" + element.id] = element;
    }

    this.#shadowRoot.addEventListener("pointerdown", (event) =>
      this.#onShadowRootPointerDown(event)
    );
    this.#shadowRoot.addEventListener("wheel", (event) => this.#onWheel(event));
    this["#editor"].addEventListener("paste", (event) => this.#onPaste(event));
    this["#editor"].addEventListener("input", (event) =>
      this.#onEditorInput(event)
    );
    this.addEventListener("pointerdown", (event) => this.#onPointerDown(event));
    this.addEventListener("pointerenter", () => this.#onPointerEnter());
    this.addEventListener("pointerleave", () => this.#onPointerLeave());
    this.addEventListener("keydown", (event) => this.#onKeyDown(event));
    this.addEventListener("keyup", (event) => this.#onKeyUp(event));
    this.addEventListener("keypress", (event) => this.#onKeyPress(event));
    this.addEventListener("incrementstart", (event) =>
      this.#onStepperIncrementStart(event)
    );
    this.addEventListener("decrementstart", (event) =>
      this.#onStepperDecrementStart(event)
    );
    this.addEventListener("focusin", (event) => this.#onFocusIn(event));
    this.addEventListener("focusout", (event) => this.#onFocusOut(event));

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
    this.#update();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    } else if (name === "value") {
      this.#onValueAttributeChange();
    } else if (name === "min") {
      this.#onMinAttributeChange();
    } else if (name === "max") {
      this.#onMaxAttributeChange();
    } else if (name === "prefix") {
      this.#onPrefixAttributeChange();
    } else if (name === "suffix") {
      this.#onSuffixAttributeChange();
    } else if (name === "disabled") {
      this.#onDisabledAttributeChange();
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  #increment(large = false) {
    let oldValue = this.value;
    let newValue = this.value;

    if (large) {
      newValue += this.step * 10;
    } else {
      newValue += this.step;
    }

    newValue = normalize(newValue, this.min, this.max, getPrecision(this.step));

    if (oldValue !== newValue) {
      this.value = newValue;
    }

    if (this.matches(":focus")) {
      document.execCommand("selectAll");
    }

    this.#updateEmptyState();
  }

  #decrement(large = false) {
    let oldValue = this.value;
    let newValue = this.value;

    if (large) {
      newValue -= this.step * 10;
    } else {
      newValue -= this.step;
    }

    newValue = normalize(newValue, this.min, this.max, getPrecision(this.step));

    if (oldValue !== newValue) {
      this.value = newValue;
    }

    if (this.matches(":focus")) {
      document.execCommand("selectAll");
    }

    this.#updateEmptyState();
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  #maybeDispatchChangeStartEvent() {
    if (!this.#isChangeStart) {
      this.#isChangeStart = true;
      this.dispatchEvent(new CustomEvent("changestart", { bubbles: true }));
    }
  }

  #maybeDispatchChangeEndEvent = debounce(() => {
    if (
      this.#isChangeStart &&
      !this.#isArrowKeyDown &&
      !this.#isBackspaceKeyDown &&
      !this.#isStepperButtonDown
    ) {
      this.#isChangeStart = false;
      this.dispatchEvent(new CustomEvent("changeend", { bubbles: true }));
    }
  }, 500);

  #commitEditorChanges() {
    let editorTextContent = this["#editor"].textContent;
    let editorValue = parseFloat(editorTextContent);

    if (Number.isNaN(editorValue)) {
      editorValue = null;
    }

    let normalizedEditorValue =
      editorValue === null ? null : normalize(editorValue, this.min, this.max);

    if (normalizedEditorValue !== this.value) {
      this.dispatchEvent(new CustomEvent("changestart", { bubbles: true }));
      this.value = normalizedEditorValue;
      this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
      this.dispatchEvent(new CustomEvent("changeend", { bubbles: true }));
    } else if (editorValue !== this.value) {
      this.value = normalizedEditorValue;
    } else {
      // Reset the editor text content just in case the currently entered raw value is invalid
      this.#updateEditorTextContent();
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  #update() {
    this.#updateEditorTextContent();
    this.#updateEmptyState();
    this.#updateStepper();
  }

  #updateEditorTextContent() {
    if (this.hasAttribute("value")) {
      if (this.step < 1) {
        let value = parseFloat(this.getAttribute("value"));
        let stepPrecision = getPrecision(this.step);
        let valuePrecision = getPrecision(value);

        if (stepPrecision > 0 && valuePrecision < stepPrecision) {
          this["#editor"].textContent = value.toFixed(stepPrecision);
        } else {
          this["#editor"].textContent = this.getAttribute("value").trim();
        }
      } else {
        this["#editor"].textContent = this.getAttribute("value").trim();
      }
    } else {
      this["#editor"].textContent = "";
    }
  }

  #updateEmptyState() {
    let value = null;

    if (this.matches(":focus")) {
      let textContent = this["#editor"].textContent;
      value = textContent.trim() === "" ? null : parseFloat(textContent);
    } else {
      value = this.value;
    }

    if (value === null) {
      this.setAttribute("empty", "");
    } else {
      this.removeAttribute("empty");
    }
  }

  #updateStepper() {
    let stepper = this.querySelector("s-stepper");

    if (stepper) {
      let canDecrement = this.value > this.min;
      let canIncrement = this.value < this.max;

      if (canIncrement === true && canDecrement === true) {
        stepper.removeAttribute("disabled");
      } else if (canIncrement === false && canDecrement === false) {
        stepper.setAttribute("disabled", "");
      } else if (canIncrement === false) {
        stepper.setAttribute("disabled", "increment");
      } else if (canDecrement === false) {
        stepper.setAttribute("disabled", "decrement");
      }
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
    this.#update();
  }

  #onMinAttributeChange() {
    this.#updateStepper();
  }

  #onMaxAttributeChange() {
    this.#updateStepper();
  }

  #onPrefixAttributeChange() {
    this["#editor"].setAttribute("data-prefix", this.prefix);
  }

  #onSuffixAttributeChange() {
    this["#editor"].setAttribute("data-suffix", this.suffix);
  }

  #onDisabledAttributeChange() {
    this["#editor"].contentEditable = this.disabled
      ? "false"
      : "plaintext-only";
    this.#updateAccessabilityAttributes();
  }

  #onFocusIn() {
    document.execCommand("selectAll");
    this.dispatchEvent(
      new CustomEvent("textinputmodestart", { bubbles: true, composed: true })
    );
  }

  #onFocusOut() {
    if (getBrowserEngine() === "chromium") {
      this.#shadowRoot.getSelection().collapse(this["#main"]);
    }

    this["#editor"].scrollLeft = 0;

    this.#commitEditorChanges();
    this.dispatchEvent(
      new CustomEvent("textinputmodeend", { bubbles: true, composed: true })
    );
  }

  #onEditorInput() {
    this.#updateEmptyState();
    this.#updateStepper();
  }

  #onWheel(event) {
    if (this.matches(":focus")) {
      event.preventDefault();
      this.#maybeDispatchChangeStartEvent();

      if (event.wheelDeltaX > 0 || event.wheelDeltaY > 0) {
        this.#increment(event.shiftKey);
        this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
      } else {
        this.#decrement(event.shiftKey);
        this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
      }

      this.#maybeDispatchChangeEndEvent();
    }
  }


  #onPointerDown(pointerDownEvent) {
    if (pointerDownEvent.target.localName === "s-stepper") {
      // Don't focus the input when user clicks stepper
      pointerDownEvent.preventDefault();
    }
  }

  #onShadowRootPointerDown(pointerDownEvent) {
    if (pointerDownEvent.buttons > 1 || pointerDownEvent.isPrimary === false) {
      pointerDownEvent.preventDefault();
      return;
    }

    if (pointerDownEvent.target === this["#editor"]) {
      if (this["#editor"].matches(":focus") === false) {
        pointerDownEvent.preventDefault();

        let initialValue = this.value;
        let cachedClientX = pointerDownEvent.clientX;
        let pointerDownPoint = new DOMPoint(
          pointerDownEvent.clientX,
          pointerDownEvent.clientY
        );
        let pointerMoveListener, pointerUpOrCancelListener;

        this.style.cursor = "col-resize";
        this["#editor"].setPointerCapture(pointerDownEvent.pointerId);

        this["#editor"].addEventListener(
          "pointermove",
          (pointerMoveListener = (pointerMoveEvent) => {
            let pointerMovePoint = new DOMPoint(
              pointerMoveEvent.clientX,
              pointerMoveEvent.clientY
            );
            let deltaTime =
              pointerMoveEvent.timeStamp - pointerDownEvent.timeStamp;
            let isDistinct = pointerMoveEvent.clientX !== cachedClientX;
            let isIntentional =
              getDistanceBetweenPoints(pointerDownPoint, pointerMovePoint) >
                3 || deltaTime > 80;
            cachedClientX = pointerMoveEvent.clientX;

            if (isDistinct && isIntentional && pointerMoveEvent.isPrimary) {
              if (this.#isDragging === false) {
                this.#isDragging = true;
                this.#isChangeStart = true;
                this.dispatchEvent(
                  new CustomEvent("changestart", { bubbles: true })
                );
              }

              let dragOffset =
                pointerMoveEvent.clientX - pointerDownEvent.clientX;
              let value = initialValue + dragOffset * this.step;

              value = normalize(
                value,
                this.min,
                this.max,
                getPrecision(this.step)
              );
              this.value = value;
              this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
            }
          })
        );

        this["#editor"].addEventListener(
          "pointerup",
          (pointerUpOrCancelListener = () => {
            this["#editor"].removeEventListener(
              "pointermove",
              pointerMoveListener
            );
            this["#editor"].removeEventListener(
              "pointerup",
              pointerUpOrCancelListener
            );
            this["#editor"].removeEventListener(
              "pointercancel",
              pointerUpOrCancelListener
            );

            this.style.cursor = null;

            if (this.#isDragging === true) {
              this.#isDragging = false;
              this.#isChangeStart = false;
              this.dispatchEvent(
                new CustomEvent("changeend", {
                  detail: this.value !== initialValue,
                  bubbles: true,
                })
              );
            } else {
              this["#editor"].focus();
              document.execCommand("selectAll");
            }
          })
        );

        this["#editor"].addEventListener(
          "pointercancel",
          pointerUpOrCancelListener
        );
      }
    }
  }

  #onPointerEnter() {
    let tooltip = this.querySelector(":scope > s-tooltip");

    if (tooltip && tooltip.disabled === false) {
      tooltip.open(this);
    }
  }

  #onPointerLeave() {
    let tooltip = this.querySelector(":scope > s-tooltip");

    if (tooltip) {
      tooltip.close();
    }
  }

  #onStepperIncrementStart() {
    let incrementListener, incrementEndListener;

    if (this.matches(":focus")) {
      this.#commitEditorChanges();
    }

    this.#isStepperButtonDown = true;

    this.addEventListener(
      "increment",
      (incrementListener = (event) => {
        this.#maybeDispatchChangeStartEvent();
        this.#increment(event.detail.shiftKey);
        this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
        this.#maybeDispatchChangeEndEvent();
      })
    );

    this.addEventListener(
      "incrementend",
      (incrementEndListener = () => {
        this.#isStepperButtonDown = false;
        this.removeEventListener("increment", incrementListener);
        this.removeEventListener("incrementend", incrementEndListener);
      })
    );
  }

  #onStepperDecrementStart() {
    let decrementListener, decrementEndListener;

    if (this.matches(":focus")) {
      this.#commitEditorChanges();
    }

    this.#isStepperButtonDown = true;

    this.addEventListener(
      "decrement",
      (decrementListener = (event) => {
        this.#maybeDispatchChangeStartEvent();
        this.#decrement(event.detail.shiftKey);
        this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
        this.#maybeDispatchChangeEndEvent();
      })
    );

    this.addEventListener(
      "decrementend",
      (decrementEndListener = () => {
        this.#isStepperButtonDown = false;
        this.removeEventListener("decrement", decrementListener);
        this.removeEventListener("decrementend", decrementEndListener);
      })
    );
  }

  #onKeyDown(event) {
    if (event.code === "ArrowDown") {
      event.preventDefault();

      this.#isArrowKeyDown = true;
      this.#maybeDispatchChangeStartEvent();
      this.#decrement(event.shiftKey);
      this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
      this.#maybeDispatchChangeEndEvent();
    } else if (event.code === "ArrowUp") {
      event.preventDefault();

      this.#isArrowKeyDown = true;
      this.#maybeDispatchChangeStartEvent();
      this.#increment(event.shiftKey);
      this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
      this.#maybeDispatchChangeEndEvent();
    } else if (event.code === "Backspace") {
      this.#isBackspaceKeyDown = true;
    } else if (event.code === "Enter" || event.code === "NumpadEnter") {
      this.#commitEditorChanges();
      document.execCommand("selectAll");
    }
  }

  #onKeyUp(event) {
    if (event.code === "ArrowDown") {
      this.#isArrowKeyDown = false;
      this.#maybeDispatchChangeEndEvent();
    } else if (event.code === "ArrowUp") {
      this.#isArrowKeyDown = false;
      this.#maybeDispatchChangeEndEvent();
    } else if (event.code === "Backspace") {
      this.#isBackspaceKeyDown = false;
    }
  }

  #onKeyPress(event) {
    if (
      event.ctrlKey === false &&
      event.altKey === false &&
      event.metaKey === false &&
      NUMERIC_KEYS.includes(event.key) === false
    ) {
      event.preventDefault();
    }
  }

  async #onPaste(event) {
    // Allow only for pasting numeric text
    event.preventDefault();
    let content = event.clipboardData.getData("text/plain").trim();

    if (isNumeric(content)) {
      // @bugfix: https://github.com/nwjs/nw.js/issues/3403
      await sleep(1);

      document.execCommand("insertText", false, content);
    }
  }
}

customElements.define("s-numberinput", SNumberInput);
