import { createElement, closest, elementFromPoint } from "../utils/element.js";
import { html, css } from "../utils/template.js";

// @element s-contextmenu
export default class SContextMenu extends HTMLElement {
  static #shadowTemplate = html`
    <template>
      <slot></slot>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: block;
      position: fixed;
      width: 0px;
      height: 0px;
      font-size: 0.875rem;
      z-index: 1001;
    }
  `;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @property
  // @attribute
  // @type boolean
  // @default false
  //
  // Whether the context menu should open when user right-clicks its parent container.
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(disabled) {
    disabled
      ? this.setAttribute("disabled", "")
      : this.removeAttribute("disabled");
  }

  #shadowRoot = null;
  #parentElement = null;

  #windowBlurListener = null;
  #parentContextMenuListener = null;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SContextMenu.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SContextMenu.#shadowTemplate.content, true)
    );

    this["#backdrop"] = createElement("s-backdrop");
    this["#backdrop"].style.background = "rgba(0, 0, 0, 0)";
    this["#backdrop"].addEventListener("contextmenu", (event) =>
      this.#onBackdropContextMenu(event)
    );
    this["#backdrop"].addEventListener("pointerdown", (event) =>
      this.#onBackdropPointerDown(event)
    );

    this.addEventListener("blur", (event) => this.#onBlur());
    this.addEventListener("keydown", (event) => this.#onKeyDown(event), true);
    this.addEventListener("click", (event) => this.#onClick(event));
  }

  connectedCallback() {
    this.#parentElement = this.parentElement || this.parentNode.host;

    window.addEventListener(
      "blur",
      (this.#windowBlurListener = () => {
        this.#onBlur();
      })
    );

    this.#parentElement.addEventListener(
      "contextmenu",
      (this.#parentContextMenuListener = (event) => {
        this.#onParentContextMenu(event);
      })
    );
  }

  disconnectedCallback() {
    window.removeEventListener("blur", this.#windowBlurListener);
    this.#parentElement.removeEventListener(
      "contextmenu",
      this.#parentContextMenuListener
    );

    this.#parentElement = null;
  }

  ///////////////////////////////////'/////////////////////////////////////////////////////////////////////////////

  // @method
  // @type (number, number) => void
  //
  // Open the context menu at given point.
  open(clientX, clientY) {
    let menu = this.querySelector("s-menu");

    if (menu.opened === false) {
      menu.openAtPoint(clientX, clientY);

      this["#backdrop"].ownerElement = menu;
      this["#backdrop"].show(false);

      menu.focus();
    }
  }

  // @method
  // @type () => void
  //
  // Close the context menu.
  close() {
    return new Promise(async (resolve) => {
      this["#backdrop"].hide(false);

      let menu = this.querySelector("s-menu");

      if (menu && menu.opened === true) {
        await menu.close();

        if (this.isConnected) {
          let ancestorFocusableElement = closest(this.parentNode, "[tabindex]");

          if (ancestorFocusableElement) {
            ancestorFocusableElement.focus();
          }
        }
      }

      resolve();
    });
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  #onBlur() {
    this.close();
  }

  #onParentContextMenu(event) {
    if (this.disabled === false) {
      event.preventDefault();
      this.open(event.clientX, event.clientY);
    }
  }

  #onBackdropContextMenu(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    this.close().then(() => {
      let target = elementFromPoint(event.clientX, event.clientY, true);
      let clonedEvent = new MouseEvent(event.type, event);
      target.dispatchEvent(clonedEvent);
    });
  }

  #onBackdropPointerDown(event) {
    if (event.buttons <= 1) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.close();
    }
  }

  async #onClick(event) {
    let item = event.target.closest("s-menuitem");

    if (item && item.disabled === false) {
      let submenu = item.querySelector("s-menu");

      if (submenu) {
        if (submenu.opened) {
          submenu.close();
        } else {
          submenu.openNextToElement(item, "horizontal");
        }
      } else {
        this.setAttribute("closing", "");

        await item.whenTriggerEnd;
        await this.close();

        this.removeAttribute("closing");
      }
    }
  }

  #onKeyDown(event) {
    if (event.code === "Escape") {
      let menu = this.querySelector("s-menu");

      if (menu.opened) {
        event.preventDefault();
        this.close();
      }
    } else if (event.code === "Tab") {
      event.preventDefault();
      event.stopPropagation();

      let menu = this.querySelector("s-menu");
      menu.focusNextMenuItem();
    }
  }
}

customElements.define("s-contextmenu", SContextMenu);
