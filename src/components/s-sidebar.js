import { normalize } from "../utils/math.js";
import { html, css } from "../utils/template.js";
import SpireTheme from "../utils/theme.js";

export default class SSidebar extends HTMLElement {
  static observedAttributes = ["expanded", "expandable"];
  static #shadowTemplate = html`
    <template>
      <s-header id="sidebar-header" class="border-bottom"> </s-header>
      <s-container>
        <slot name="container"></slot>
      </s-container>
      <s-footer>
        <slot name="footer"></slot>
      </s-footer>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: block;
      width: var(--sidebar-width);
      height: 100%;
      position: relative;
      border-right: 2px solid var(--border-color);
      display: block flex;
      flex-flow: column;
      background-color: var(--foreground-color);
      color: var(--text-color);
      transition: width 0.3s ease-in-out;
      overflow: hidden;
      justify-content: space-between;
    }
    :host([hidden]) {
      display: none;
    }
    :host([expanded="true"]) {
      width: var(--sidebar-width);
    }
    :host([expanded="false"]),
    :host([expandable="false"]) {
      width: var(--sidebar-width-collapsed);
    }
    s-header {
      justify-content: start;
      border-bottom: 1px solid var(--border-color);
    }
    s-footer {
      display: block;
      padding: 10px;
      justify-content: start;
      border-top: 1px solid var(--border-color);
    }
    s-container {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }
  `;

  get expanded() {
    return this.hasAttribute("expanded")
      ? this.getAttribute("expanded")
      : "false";
  }
  set expanded(expanded) {
    this.setAttribute("expanded", expanded);
  }
  get expandable() {
    return this.hasAttribute("expandable")
      ? this.getAttribute("expandable") !== "false"
      : true;
  }
  set expandable(value) {
    value
      ? this.setAttribute("expandable", "true")
      : this.setAttribute("expandable", "false");
  }

  #shadowRoot;

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [
      SpireTheme.themeStyleSheet,
      SSidebar.#shadowStyleSheet,
    ];
    this.#shadowRoot.append(
      document.importNode(SSidebar.#shadowTemplate.content, true)
    );

    this.sidebarHeaderContainer =
      this.#shadowRoot.querySelector("#sidebar-header");
    this._updateSidebarHeader();

    this.footerElement = this.#shadowRoot.querySelector("s-footer");
    this.footerSlot = this.#shadowRoot.querySelector('slot[name="footer"]');
    this.footerSlot.addEventListener("slotchange", () =>
      this._updateFooterVisibility()
    );
    this._updateFooterVisibility();
    for (let element of this.#shadowRoot.querySelectorAll("[id]")) {
      this["#" + element.id] = element;
    }

    for (let element of this.#shadowRoot.querySelectorAll("[id]")) {
      this["#" + element.id] = element;
    }
  }

  connectedCallback() {
    this._updateExpandedAttribute();
  }

  disconnectedCallback() {}

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "expanded") {
      this._updateExpandedAttribute();
    } else if (name === "expandable") {
      this._updateSidebarHeader();
    }
  }

  _updateSidebarHeader() {
    this.sidebarHeaderContainer.style.padding = this.expandable
      ? "10px"
      : "0px";
    this.sidebarHeaderContainer.innerHTML = this.expandable
      ? `<s-button class="toggle-btn" id="toggle" skin="icon-outlined"> <s-icon src="menu"></s-icon> </s-button>`
      : "";
    if (this.expandable) {
      this.toggleButton =
        this.sidebarHeaderContainer.querySelector(".toggle-btn");
      this.toggleButton.addEventListener(
        "click",
        this._toggleSidebar.bind(this)
      );
    }
  }

  _toggleSidebar() {
    if (this.expandable) {
      this.setAttribute(
        "expanded",
        this.getAttribute("expanded") === "true" ? "false" : "true"
      );
      document.dispatchEvent(
        new CustomEvent("sidebar-toggled", {
          detail: { collapsed: this.expanded },
        })
      );
    }
  }

  _updateExpandedAttribute() {
    if (!this.hasAttribute("expanded")) {
      this.setAttribute("expanded", this.expandable ? "true" : "false");
    }
  }

  _updateFooterVisibility() {
    const hasFooter = this.footerSlot.assignedNodes().length > 0;
    this.footerElement.style.display = hasFooter ? "" : "none";
  }
}

customElements.define("s-sidebar", SSidebar);
