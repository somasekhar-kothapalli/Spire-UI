import { html, css } from "../utils/template.js";

let { isArray } = Array;

// @element s-buttons
// @event ^toggle - User toggled a button on or off.
export default class SButtons extends HTMLElement {
  static #shadowTemplate = html`
    <template>
      <slot></slot>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: flex;
      flex-flow: row;
      align-items: center;
      justify-content: flex-start;
      box-sizing: border-box;
      width: fit-content;
    }
    :host([hidden]) {
      display: none;
    }
  `;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @property
  // @attribute
  // @type number
  // @default -1
  //
  // Specifies what should happen when user clicks a button:<br/>
  // <code>-1</code> - Do not toggle any buttons<br/>
  // <code>0</code> - Toggle the clicked button on/off and other buttons off<br/>
  // <code>1</code> - Toggle the clicked button on and other buttons off<br/>
  // <code>2</code> - Toggle the clicked button on/off<br/>
  // <code>3</code> - Toggle the clicked button on/off, but toggle off only if there is at least one other button
  // toggled on<br/>
  get tracking() {
    return this.hasAttribute("tracking")
      ? parseInt(this.getAttribute("tracking"))
      : -1;
  }
  set tracking(tracking) {
    this.setAttribute("tracking", tracking);
  }

  // @property
  // @attribute
  // @type boolean
  // @default false
  //
  // Whether to use vertical (rather than horizontal) layout.
  get vertical() {
    return this.hasAttribute("vertical");
  }
  set vertical(vertical) {
    vertical === true
      ? this.setAttribute("vertical", "")
      : this.removeAttribute("vertical");
  }

  // @property
  // @type string || Array || null
  //
  // Get/set the buttons that should have toggled state.
  get value() {
    if (this.tracking === 2 || this.tracking === 3) {
      let buttons = this._getButtons().filter((button) => button.toggled);
      return buttons
        .map((button) => button.value)
        .filter((value) => value != undefined);
    } else if (this.tracking === 1 || this.tracking === 0) {
      let button = this._getButtons().find((button) => button.toggled);
      return button && button.value !== undefined ? button.value : null;
    } else if (this.tracking === -1) {
      return null;
    }
  }
  set value(value) {
    if (this.tracking === 2 || this.tracking === 3) {
      let buttons = this._getButtons();

      if (isArray(value)) {
        for (let button of buttons) {
          button.toggled = value.includes(button.value);
        }
      } else {
        for (let button of buttons) {
          button.toggled = button.value === value;
        }
      }
    } else if (this.tracking === 1 || this.tracking === 0) {
      let buttons = this._getButtons();
      let matchedButton = buttons.find((button) => button.value === value);

      for (let button of buttons) {
        button.toggled = button === matchedButton;
      }
    }
  }

  #shadowRoot = null;

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SButtons.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SButtons.#shadowTemplate.content, true)
    );

    this.addEventListener("click", (event) => this._onClick(event), true);
    this.addEventListener("keydown", (event) => this._onKeyDown(event));
  }

  connectedCallback() {
    for (let child of this.children) {
      if (child.localName === "s-button") {
        let boxShadow = getComputedStyle(child).boxShadow;

        if (boxShadow !== "none") {
          this.setAttribute("hasboxshadow", "");
        } else {
          this.removeAttribute("hasboxshadow");
        }

        break;
      }
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  _getButtons() {
    return [
      ...this.querySelectorAll(":scope > s-button, :scope > s-box > s-button"),
    ];
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  _onClick(event) {
    if (event.buttons > 1) {
      return;
    }

    let clickedButton = event.target.closest("s-button");
    let canToggle =
      clickedButton &&
      clickedButton.disabled === false &&
      clickedButton.expandable === false;

    if (canToggle) {
      let otherButtons = this._getButtons().filter(
        (button) => button !== clickedButton
      );

      if (this.tracking === 0) {
        if (clickedButton.mixed) {
          clickedButton.mixed = false;
        } else {
          clickedButton.toggled = !clickedButton.toggled;
          clickedButton.mixed = false;
        }

        for (let button of otherButtons) {
          button.toggled = false;
          button.mixed = false;
        }

        this.dispatchEvent(
          new CustomEvent("toggle", { bubbles: true, detail: clickedButton })
        );
      } else if (this.tracking === 1) {
        if (clickedButton.toggled === false || clickedButton.mixed === true) {
          clickedButton.toggled = true;
          clickedButton.mixed = false;

          for (let button of otherButtons) {
            button.toggled = false;
            button.mixed = false;
          }

          this.dispatchEvent(
            new CustomEvent("toggle", { bubbles: true, detail: clickedButton })
          );
        }
      } else if (this.tracking === 2) {
        if (clickedButton.mixed) {
          clickedButton.mixed = false;
        } else {
          clickedButton.toggled = !clickedButton.toggled;
        }

        this.dispatchEvent(
          new CustomEvent("toggle", { bubbles: true, detail: clickedButton })
        );
      } else if (this.tracking === 3) {
        let otherToggledButtons = otherButtons.filter(
          (button) => button.toggled === true
        );

        if (clickedButton.toggled === false || otherToggledButtons.length > 0) {
          if (clickedButton.mixed) {
            clickedButton.mixed = false;
          } else {
            clickedButton.toggled = !clickedButton.toggled;
          }

          this.dispatchEvent(
            new CustomEvent("toggle", { bubbles: true, detail: clickedButton })
          );
        }
      }
    }
  }

  _onKeyDown(event) {
    if (event.code === "ArrowRight") {
      let element = [...this.children].find((child) => child.matches(":focus"));

      if (element) {
        if (element.nextElementSibling) {
          element.nextElementSibling.focus();
        } else if (element !== element.parentElement.firstElementChild) {
          element.parentElement.firstElementChild.focus();
        }
      }
    } else if (event.code === "ArrowLeft") {
      let element = [...this.children].find((child) => child.matches(":focus"));

      if (element) {
        if (element.previousElementSibling) {
          element.previousElementSibling.focus();
        } else if (element !== element.parentElement.lastElementChild) {
          element.parentElement.lastElementChild.focus();
        }
      }
    }
  }
}

customElements.define("s-buttons", SButtons);
