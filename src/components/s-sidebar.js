import { html, css } from "../utils/template.js";
import { createElement } from "../utils/element.js";

export default class SSidebar extends HTMLElement {
  static observedAttributes = ["expanded", "expandable"];

  static #shadowTemplate = html`
    <template>
      <s-header id="sidebar-header"> </s-header>
      <s-content id="sidebar-content">
        <slot name="content">Default Content</slot>
      </s-content>
      <s-footer id="sidebar-footer">
        <slot name="footer">Default Footer</slot>
      </s-footer>
    </template>
  `;

  static #shadowStyleSheet = css`
    :host {
      display: flex;
      flex-direction: column;
      color: var(--text-color);
      background-color: var(--foreground-color);
      width: var(--sidebar-width);
      height: 100%;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease-in-out;
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

    s-header,
    s-footer {
      justify-content: center;
      background: transparent;
      padding: 10px;
    }

    s-content {
      flex: 1;
      overflow-y: auto;
      background: var(--foreground-color);
      padding: 15px 10px;
      overflow-x: hidden;
    }

    :host([expanded="false"]) s-header {
      flex-direction: column;
      height: fit-content;
    }

    s-footer {
      height: fit-content;
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
    this.#shadowRoot.adoptedStyleSheets = [SSidebar.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SSidebar.#shadowTemplate.content, true)
    );

    this.sidebarHeaderContainer =
      this.#shadowRoot.querySelector("#sidebar-header");

    this.footerElement = this.#shadowRoot.querySelector("s-footer");
    this.footerSlot = this.#shadowRoot.querySelector('slot[name="footer"]');
    this.footerSlot.addEventListener("slotchange", () =>
      this._updateFooterVisibility()
    );
    this._updateFooterVisibility();
  }

  connectedCallback() {
    this._updateSidebarHeader();
    this._updateExpandedAttribute();
  }

  disconnectedCallback() {}

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "expanded") {
      this._updateExpandedAttribute();
    } else if (name === "expandable") {
      this._updateSidebarHeader();
    }
  }

  _updateSidebarHeader() {
    this.sidebarHeaderContainer.innerHTML = this.expandable
      ? `
      <s-button class="toggle-btn" id="toggle" skin="icon-outlined"> <s-icon src="menu"></s-icon> </s-button>
      <slot name="header">Default Header</slot>
      `
      : `<slot name="header">Default Header</slot>`;
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
      this.dispatchEvent(
        new CustomEvent("sidebar-toggle", {
          bubbles: true,
          composed: true,
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
    this.footerElement.style.border = hasFooter ? "" : "none";
  }
}

customElements.define("s-sidebar", SSidebar);
