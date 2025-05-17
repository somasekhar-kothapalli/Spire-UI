import { closest } from "../utils/element.js";
import { html, css } from "../utils/template.js";
import { sleep } from "../utils/time.js";

// @element s-nav
// @event ^toggle - User toggled a nav item
export default class SNav extends HTMLElement {
  static #shadowTemplate = html`
    <template>
      <slot></slot>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: block;
      box-sizing: border-box;
    }
  `;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @property
  // @type string?
  // @default null
  //
  // The value of the currently toggled nav item. Null if there is no nav item toggled.
  get value() {
    let toggledItem = this.querySelector("s-navitem[toggled]");
    return toggledItem ? toggledItem.value : null;
  }
  set value(value) {
    let items = [...this.querySelectorAll("s-navitem")];
    let toggledItem =
      value === null ? null : items.find((item) => item.value === value);

    for (let item of items) {
      item.toggled = item === toggledItem;
    }
  }

  #shadowRoot = null;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SNav.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SNav.#shadowTemplate.content, true)
    );

    this.addEventListener("click", (event) => this._onClick(event));
    this.addEventListener("pointerdown", (event) => this._onPointerDown(event));
    this.addEventListener("keydown", (event) => this._onKeyDown(event));
  }

  connectedCallback() {
    this.setAttribute("role", "navigation");

    if (this.parentElement?.localName === "s-navitem") {
      this.parentElement.setAttribute("expandable", "");
    }

    // Nested nav
    if (this.closest("s-navitem")) {
      this.setAttribute("slot", "expandable");
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  _getOutermostNavElement() {
    let navElement = this;

    while (true) {
      let ancestorNavElement = navElement.parentElement?.closest("s-nav");

      if (ancestorNavElement) {
        navElement = ancestorNavElement;
      } else {
        break;
      }
    }

    return navElement;
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  _onClick(event) {
    let clickedItem = event.target.closest("s-navitem");

    // Toggle the clicked item
    if (
      clickedItem &&
      clickedItem.hasAttribute("expandable") === false &&
      !(
        clickedItem.parentElement.localName === "a" &&
        clickedItem.parentElement.getAttribute("target") === "_blank"
      )
    ) {
      if (clickedItem.closest("s-nav") === this) {
        for (let item of this._getOutermostNavElement().querySelectorAll(
          "s-navitem"
        )) {
          if (item === clickedItem) {
            if (item.toggled === false) {
              item.toggled = true;
            }
          } else {
            item.toggled = false;
          }
        }

        clickedItem.dispatchEvent(new CustomEvent("toggle", { bubbles: true }));
      }
    }
  }

  _onPointerDown(event) {
    if (event.buttons > 1) {
      event.preventDefault();
      return;
    }

    let item = event.target.closest("s-navitem");

    if (!item || item.closest("s-nav") !== this) {
      return;
    }

    // Don't focus the widget with pointer, instead focus the closest ancestor focusable element as soon as
    // the button is released.
    {
      event.preventDefault();

      if (this.matches(":focus") === false) {
        let ancestorFocusableElement = closest(
          this.parentNode,
          "*[tabindex]:not(a,s-navitem)"
        );
        let pointerUpOrCancelListener;

        this.addEventListener(
          "pointerup",
          (pointerUpOrCancelListener = () => {
            this.removeEventListener("pointerup", pointerUpOrCancelListener);
            this.removeEventListener(
              "pointercancel",
              pointerUpOrCancelListener
            );

            if (ancestorFocusableElement) {
              ancestorFocusableElement.focus();
            } else {
              this.focus(); // Need when e.g. a color input widget was focused
              this.blur();
            }
          })
        );

        this.addEventListener("pointercancel", pointerUpOrCancelListener);
      }
    }

    // Provide "pressed" attribute for theming purposes which acts like :active pseudo-class, but is guaranteed
    // to last at least 150ms.
    if (event.target.localName !== "s-nav") {
      let pointerDownTimeStamp = Date.now();
      let isDown = true;
      let minPressedTime = parseInt(
        getComputedStyle(item).getPropertyValue("--min-pressed-time") || "150ms"
      );
      let pointerUpOrCancelListener;

      this.addEventListener(
        "pointerup",
        (pointerUpOrCancelListener = async () => {
          this.removeEventListener("pointerup", pointerUpOrCancelListener);
          this.removeEventListener("pointercancel", pointerUpOrCancelListener);

          isDown = false;
          let pressedTime = Date.now() - pointerDownTimeStamp;

          if (pressedTime < minPressedTime) {
            await sleep(minPressedTime - pressedTime);
          }

          item.removeAttribute("pressed");
        })
      );

      this.addEventListener("pointercancel", pointerUpOrCancelListener);

      (async () => {
        if (item.hasAttribute("toggled") === false) {
          await sleep(40);
        }

        if (isDown) {
          item.setAttribute("pressed", "");
        }
      })();
    }
  }

  _onKeyDown(event) {
    let navElement = this._getOutermostNavElement();
    let focusedItem = navElement.querySelector("s-navitem:focus");

    if (
      event.code === "Enter" ||
      event.code === "NumpadEnter" ||
      event.code === "Space"
    ) {
      event.preventDefault();
      event.stopPropagation();

      focusedItem.click();
    } else if (event.code === "ArrowLeft") {
      if (focusedItem.expandable && focusedItem.expanded) {
        event.preventDefault();
        event.stopPropagation();

        focusedItem.click();
      }
    } else if (event.code === "ArrowRight") {
      if (focusedItem.expandable && focusedItem.expanded === false) {
        event.preventDefault();
        event.stopPropagation();

        focusedItem.click();
      }
    } else if (event.code === "ArrowUp" || event.code === "ArrowDown") {
      let items = [...navElement.querySelectorAll("s-navitem:not([disabled])")];
      items = items.filter((item) => item.clientHeight !== 0); // Filter out collapsed items

      let focusedItemIndex = items.indexOf(focusedItem);
      let siblingItem =
        event.code === "ArrowUp"
          ? items[focusedItemIndex - 1]
          : items[focusedItemIndex + 1];

      if (siblingItem) {
        event.preventDefault();
        event.stopPropagation();

        siblingItem.focus();
      }
    }
  }
}

customElements.define("s-nav", SNav);
