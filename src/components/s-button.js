import {
  createElement,
  closest,
  isPointerInsideElement,
} from "../utils/element.js";
import { getBrowserEngine } from "../utils/system.js";
import { html, css } from "../utils/template.js";
import { sleep } from "../utils/time.js";

let { max } = Math;

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
      padding: 2px 14px;
      box-sizing: border-box;
      opacity: 1;
      position: relative;
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
  // Whether this button is toggled.
  get toggled() {
    return this.hasAttribute("toggled");
  }
  set toggled(toggled) {
    toggled
      ? this.setAttribute("toggled", "")
      : this.removeAttribute("toggled");
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  //
  // Whether this button can be toggled on/off by the user (e.g. by clicking the button).
  get togglable() {
    return this.hasAttribute("togglable");
  }
  set togglable(togglable) {
    togglable
      ? this.setAttribute("togglable", "")
      : this.removeAttribute("togglable");
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  //
  // Whether the this button has "mixed" state.
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
  // @type boolean
  // @default false
  //
  // Whether the button should take less horizontal space.
  get condensed() {
    return this.hasAttribute("condensed");
  }
  set condensed(condensed) {
    condensed
      ? this.setAttribute("condensed", "")
      : this.removeAttribute("condensed");
  }

  // @property
  // @attribute
  // @type "normal" || "flat" || "recessed" || "dock"
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

  // @property readOnly
  // @attribute
  // @type boolean
  // @default false
  // @readOnly
  //
  // Whether the menu or popover associated with this button is opened.
  get expanded() {
    return this.hasAttribute("expanded");
  }

  // @property readOnly
  // @type boolean
  // @default false
  // @readOnly
  //
  // Whether clicking this button will cause a menu or popover to show up.
  get expandable() {
    return this._canOpenMenu() || this._canOpenPopover();
  }

  // @property readOnly
  // @type XButtonsElement?
  // @default null
  // @readOnly
  //
  // Direct ancestor <code>s-buttons</code> element.
  get ownerButtons() {
    if (this.parentElement) {
      if (this.parentElement?.localName === "s-buttons") {
        return this.parentElement;
      } else if (
        ["a", "s-box"].includes(this.parentElement.localName) &&
        this.parentElement.parentElement
      ) {
        if (this.parentElement.parentElement.localName === "s-buttons") {
          return this.parentElement.parentElement;
        }
      }
    }

    return null;
  }

  #shadowRoot = null;
  #wasFocusedBeforeExpanding = false;
  #dismissTooltip = false;
  #lastPointerDownEvent = null;
  #lastTabIndex = 0;

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

    this.addEventListener("pointerdown", (event) => this._onPointerDown(event));
    this.addEventListener("pointerenter", () => this._onPointerEnter());
    this.addEventListener("pointerleave", () => this._onPointerLeave());
    this.addEventListener("click", (event) => this._onClick(event));
    this.addEventListener("keydown", (event) => this._onKeyDown(event));
    this.addEventListener("close", (event) => this._onClose(event));

    (async () => {
      await customElements.whenDefined("s-backdrop");
      this["#backdrop"] = createElement("s-backdrop");
      this["#backdrop"].style.background = "rgba(0, 0, 0, 0)";
    })();
  }

  connectedCallback() {
    // Make the parent anchor element non-focusable (button should be focused instead)
    if (
      this.parentElement &&
      this.parentElement.localName === "a" &&
      this.parentElement.tabIndex !== -1
    ) {
      this.parentElement.tabIndex = -1;
    }

    this._updateAccessabilityAttributes();
    this._updateSkinAttribute();
  }

  disconnectedCallback() {
    this.#dismissTooltip = false;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this.isConnected === false) {
      return;
    } else if (name === "disabled") {
      this._updateAccessabilityAttributes();
    } else if (name === "skin") {
      this._updateSkinAttribute();
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @method
  // @type () => Promise
  //
  // Open the child menu or overlay.
  expand() {
    return new Promise(async (resolve) => {
      if (this._canOpenMenu()) {
        await this._openMenu();
      } else if (this._canOpenPopover()) {
        await this._openPopover();
      }

      resolve();
    });
  }

  // @method
  // @type (Promise?) => Promise
  //
  // Close the child menu or overlay.
  collapse(delay = null) {
    return new Promise(async (resolve) => {
      let popup = null;

      if (this._canCloseMenu()) {
        await this._closeMenu(delay);
      } else if (this._canClosePopover()) {
        await this._closePopover(delay);
      }

      resolve();
    });
  }

  _openMenu() {
    return new Promise(async (resolve) => {
      if (this._canOpenMenu()) {
        let menu = this.querySelector(":scope > s-menu");
        let tooltip = this.querySelector(":scope > s-tooltip");

        if (tooltip) {
          tooltip.close(false);
        }

        this.#wasFocusedBeforeExpanding = this.matches(":focus");
        this.setAttribute("expanded", "");

        this["#backdrop"].ownerElement = menu;
        this["#backdrop"].show(false);

        await menu.openNextToElement(this, "vertical", 3);
        menu.focus();
      }

      resolve();
    });
  }

  _closeMenu(delay = null) {
    return new Promise(async (resolve) => {
      if (this._canCloseMenu()) {
        let menu = this.querySelector(":scope > s-menu");
        menu.setAttribute("closing", "");

        await delay;
        menu.close();

        this["#backdrop"].hide(false);
        this.removeAttribute("expanded");

        // @bugfix: Button gets stuck with :hover state after user clicks the backdrop.
        if (getBrowserEngine() === "chromium") {
          this.replaceWith(this);
        }

        if (this.#wasFocusedBeforeExpanding) {
          this.focus();
        } else {
          let ancestorFocusableElement = closest(this.parentNode, "[tabindex]");

          if (ancestorFocusableElement) {
            ancestorFocusableElement.focus();
          }
        }

        menu.removeAttribute("closing");
      }

      resolve();
    });
  }

  _canOpenMenu() {
    let result = false;

    if (this.disabled === false) {
      let menu = this.querySelector(":scope > s-menu");

      if (
        menu &&
        menu.hasAttribute("opened") === false &&
        menu.hasAttribute("closing") === false
      ) {
        let item = menu.querySelector("s-menuitem");

        if (item !== null) {
          result = true;
        }
      }
    }

    return result;
  }

  _canCloseMenu() {
    let result = false;

    if (this.disabled === false) {
      let menu = this.querySelector(":scope > s-menu");

      if (menu && menu.opened) {
        result = true;
      }
    }

    return result;
  }

  _openPopover() {
    return new Promise(async (resolve) => {
      if (this._canOpenPopover()) {
        let popover = this.querySelector(":scope > s-popover");
        let tooltip = this.querySelector(":scope > s-tooltip");

        if (tooltip) {
          tooltip.close(false);
        }

        this.#wasFocusedBeforeExpanding = this.matches(":focus");
        this.setAttribute("expanded", "");

        await popover.open(this);
      }

      resolve();
    });
  }

  _closePopover(delay = null) {
    return new Promise(async (resolve) => {
      if (this._canClosePopover()) {
        let popover = this.querySelector(":scope > s-popover");
        popover.setAttribute("closing", "");

        await delay;
        await popover.close();

        this.removeAttribute("expanded");

        // @bugfix: Button gets stuck with :hover state after user clicks the backdrop.
        if (popover.modal && getBrowserEngine() === "chromium") {
          this.replaceWith(this);
        }

        if (this.#wasFocusedBeforeExpanding) {
          this.focus();
        } else {
          let ancestorFocusableElement = closest(this.parentNode, "[tabindex]");

          if (ancestorFocusableElement) {
            ancestorFocusableElement.focus();
          }
        }

        popover.removeAttribute("closing");
      }

      resolve();
    });
  }

  _canOpenPopover() {
    let result = false;

    if (this.disabled === false) {
      let popover = this.querySelector(":scope > s-popover");

      if (popover && popover.hasAttribute("opened") === false) {
        result = true;
      }
    }

    return result;
  }

  _canClosePopover() {
    let result = false;

    if (this.disabled === false) {
      let popover = this.querySelector(":scope > s-popover");

      if (popover && popover.opened) {
        result = true;
      }
    }

    return result;
  }

  _openDialog() {
    return new Promise((resolve) => {
      if (this._canOpenDialog()) {
        let dialog = this.querySelector(":scope > dialog");
        dialog.showModal();
      }

      resolve();
    });
  }

  _canOpenDialog() {
    let result = false;

    if (this.disabled === false) {
      let dialog = this.querySelector(":scope > dialog");

      if (
        dialog &&
        dialog.hasAttribute("open") === false &&
        dialog.hasAttribute("closing") === false
      ) {
        result = true;
      }
    }

    return result;
  }

  _openDrawer() {
    return new Promise((resolve) => {
      if (this._canOpenDrawer()) {
        let drawer = this.querySelector(":scope > s-drawer");
        drawer.open();
      }

      resolve();
    });
  }

  _canOpenDrawer() {
    let result = false;

    if (this.disabled === false) {
      let drawer = this.querySelector(":scope > s-drawer");

      if (
        drawer &&
        drawer.matches(":popover-open") === false &&
        drawer.hasAttribute("closing") === false
      ) {
        result = true;
      }
    }

    return result;
  }

  _openNotification() {
    return new Promise((resolve) => {
      if (this._canOpenNotification()) {
        let notification = this.querySelector(":scope > s-notification");
        notification.opened = true;
      }

      resolve();
    });
  }

  _canOpenNotification() {
    let result = false;

    if (this.disabled === false) {
      let notification = this.querySelector(":scope > s-notification");

      if (
        notification &&
        !notification.hasAttribute("opened") &&
        !notification.hasAttribute("closing")
      ) {
        result = true;
      }
    }

    return result;
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  _updateAccessabilityAttributes() {
    this.setAttribute("role", "button");
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

  _updateSkinAttribute() {
    if (this.hasAttribute("skin") === false) {
      this.setAttribute("skin", "normal");
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  _onPointerDown(event) {
    let openedMenu = this.querySelector(":scope > s-menu[opened]");
    let openedPopover = this.querySelector(":scope > s-popover[opened]");
    let openedDialog = this.querySelector(":scope > dialog[open]");
    let openedDrawer = this.querySelector(":scope > s-drawer[open]");
    let openedNotification = this.querySelector(
      ":scope > s-notification[opened]"
    );

    this.#lastPointerDownEvent = event;

    if (event.target === this["#backdrop"]) {
      this.#onBackdropPointerDown(event);
    } else if (openedMenu && openedMenu.contains(event.target)) {
      return;
    } else if (openedPopover && openedPopover.contains(event.target)) {
      return;
    } else if (openedDialog && openedDialog.contains(event.target)) {
      return;
    } else if (openedDrawer && openedDrawer.contains(event.target)) {
      return;
    } else if (
      openedNotification &&
      openedNotification.contains(event.target)
    ) {
      return;
    } else {
      this.#onButtonPointerDown(event);
    }
  }

  _onClose(event) {
    if (
      event.target.parentElement === this &&
      ["s-menu", "s-popover"].includes(event.target.localName) &&
      this.#lastPointerDownEvent &&
      isPointerInsideElement(this.#lastPointerDownEvent, this) === false
    ) {
      this.#dismissTooltip = false;
    }
  }

  _onPointerEnter() {
    let tooltip = this.querySelector(":scope > s-tooltip");

    if (
      tooltip &&
      tooltip.disabled === false &&
      this.expanded === false &&
      this.#dismissTooltip === false
    ) {
      if (this.parentElement && this.parentElement.localName === "s-buttons") {
        for (let sibling of this.parentElement.children) {
          if (sibling !== this && sibling.localName === "s-button") {
            let siblingTooltip = sibling.querySelector(":scope > s-tooltip");

            if (siblingTooltip) {
              siblingTooltip.close(false);
            }
          }
        }
      }

      tooltip.open(this);
    }
  }

  _onPointerLeave() {
    let tooltip = this.querySelector(":scope > s-tooltip");

    if (tooltip) {
      tooltip.close();
    }

    this.#dismissTooltip = false;
  }

  _onClick(event) {
    let openedMenu = this.querySelector(":scope > s-menu[opened]");
    let openedPopover = this.querySelector(":scope > s-popover[opened]");
    let openedDialog = this.querySelector(":scope > dialog[open]");
    let openedDrawer = this.querySelector(":scope > s-drawer[open]");
    let openedNotification = this.querySelector(
      ":scope > s-notification[opened]"
    );

    if (event.target === this["#backdrop"]) {
      return;
    } else if (openedMenu && openedMenu.contains(event.target)) {
      if (
        openedMenu.hasAttribute("closing") === false &&
        event.target.closest("s-menuitem")
      ) {
        this.#onMenuItemClick(event);
      }
    } else if (openedPopover && openedPopover.contains(event.target)) {
      return;
    } else if (openedDialog && openedDialog.contains(event.target)) {
      return;
    } else if (openedDrawer && openedDrawer.contains(event.target)) {
      return;
    } else if (
      openedNotification &&
      openedNotification.contains(event.target)
    ) {
      return;
    } else {
      this.#dismissTooltip = true;
      this.#onButtonClick(event);
    }
  }

  #onBackdropPointerDown(pointerDownEvent) {
    this.collapse();
  }

  async #onButtonPointerDown(pointerDownEvent) {
    if (pointerDownEvent.buttons > 1) {
      pointerDownEvent.preventDefault();
      return;
    }

    if (this.querySelector(":scope > dialog[open], :scope > s-drawer[open]")) {
      pointerDownEvent.preventDefault();
      return;
    }

    // This check is needed in case a slotted element was hit
    if (this.contains(pointerDownEvent.target) === false) {
      return;
    }

    this.setPointerCapture(pointerDownEvent.pointerId);

    // Don't focus the widget with pointer, instead focus the closest ancestor focusable element as soon as
    // the button is released.
    {
      pointerDownEvent.preventDefault();

      if (this.matches(":focus") === false) {
        let ancestorFocusableElement = closest(
          this.parentNode,
          "*[tabindex]:not(a)"
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
    if (
      this._canOpenMenu() === false &&
      this._canOpenPopover() === false &&
      this._canClosePopover() === false
    ) {
      let pointerDownTimeStamp = Date.now();
      let isDown = true;
      let minPressedTime = parseInt(
        getComputedStyle(this).getPropertyValue("--min-pressed-time") || "150ms"
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

          this.removeAttribute("pressed");
        })
      );

      this.addEventListener("pointercancel", pointerUpOrCancelListener);

      (async () => {
        if (this.ownerButtons) {
          if (
            this.ownerButtons.tracking === 0 ||
            this.ownerButtons.tracking === 2
          ) {
            await sleep(10);
          } else if (
            this.ownerButtons.tracking === 1 &&
            (this.toggled === false || this.mixed)
          ) {
            await sleep(10);
          } else if (this.ownerButtons.tracking === 3) {
            let buttons = [
              ...this.ownerButtons.querySelectorAll(
                ":scope > s-button, :scope > s-box > s-button"
              ),
            ];
            let toggledButtons = buttons.filter((button) => button.toggled);

            if (this.toggled === false || toggledButtons.length > 1) {
              await sleep(10);
            }
          }
        } else if (this.togglable) {
          await sleep(10);
        }

        if (isDown) {
          this.setAttribute("pressed", "");
        }
      })();
    }

    if (this._canOpenMenu()) {
      if (pointerDownEvent.pointerType !== "touch") {
        this._openMenu();
      }
    } else if (this._canOpenPopover()) {
      if (pointerDownEvent.pointerType !== "touch") {
        this._openPopover();
      }
    } else if (this._canClosePopover()) {
      this._closePopover();
    }
  }

  async #onButtonClick(event) {
    let popup = this.querySelector(":scope > s-menu, :scope > s-popover");

    if (popup) {
      if (popup.hasAttribute("closing")) {
        return;
      } else {
        popup.focus();
      }
    }

    if (this._canClosePopover() === false) {
      if (this._canOpenDialog()) {
        this._openDialog();
      } else if (this._canOpenDrawer()) {
        this._openDrawer();
      } else if (this._canOpenNotification()) {
        this._openNotification();
      }
    }

    if (
      this.#lastPointerDownEvent &&
      this.#lastPointerDownEvent.pointerType === "touch"
    ) {
      if (this._canOpenMenu()) {
        this._openMenu();
      } else if (this._canOpenPopover()) {
        this._openPopover();
      }
    }

    // Toggle the button
    if (this.togglable && event.defaultPrevented === false) {
      this.removeAttribute("pressed");
      this.toggled = !this.toggled;
      this.dispatchEvent(new CustomEvent("toggle"));
    }
  }

  #onMenuItemClick(event) {
    let item = event.target.closest("s-menuitem");
    let menu = this.querySelector(":scope > s-menu");

    if (!menu.hasAttribute("closing")) {
      this.collapse(item.whenTriggerEnd);
    }
  }

  _onKeyDown(event) {
    if (event.defaultPrevented === false) {
      if (
        event.code === "Enter" ||
        event.code === "NumpadEnter" ||
        event.code === "Space"
      ) {
        if (this._canOpenMenu()) {
          event.preventDefault();
          this._openMenu().then(() =>
            this.querySelector(":scope > s-menu").focusFirstMenuItem()
          );
        } else if (this._canOpenPopover()) {
          event.preventDefault();
          this._openPopover();
        } else if (this._canOpenDialog()) {
          event.preventDefault();
          this._openDialog();
        } else if (this._canOpenDrawer()) {
          event.preventDefault();
          this._openDrawer();
        } else if (this._canOpenNotification()) {
          event.preventDefault();
          this._openNotification();
        } else {
          if (this.matches(":focus")) {
            if (this._canClosePopover()) {
              this._closePopover();
            } else if (this._canCloseMenu()) {
              this._closeMenu();
            } else {
              event.preventDefault();
              this.click();
            }
          }
        }
      } else if (event.code === "ArrowDown") {
        if (this._canOpenMenu()) {
          let menu = this.querySelector(":scope > s-menu");
          event.preventDefault();
          this._openMenu().then(() =>
            this.querySelector(":scope > s-menu").focusFirstMenuItem()
          );
        } else if (this._canOpenPopover()) {
          event.preventDefault();
          this._openPopover();
        } else {
          event.preventDefault();
          this.click();
        }
      } else if (event.code === "ArrowUp") {
        if (this._canOpenMenu()) {
          event.preventDefault();
          this._openMenu().then(() =>
            this.querySelector(":scope > s-menu").focusLastMenuItem()
          );
        } else if (this._canOpenPopover()) {
          event.preventDefault();
          this._openPopover();
        } else {
          event.preventDefault();
          this.click();
        }
      } else if (event.code === "Escape") {
        if (this._canCloseMenu()) {
          event.preventDefault();
          this.collapse();
        } else if (this._canClosePopover()) {
          event.preventDefault();
          this.collapse();
        }
      }
    }
  }
}

customElements.define("s-button", SButton);
