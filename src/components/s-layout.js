import { html, css } from "../utils/template.js";
export default class SLayout extends HTMLElement {
  static #shadowTemplate = html`
    <template>
      <div class="s-container">
        <slot name="header"></slot>
        <slot name="sidebar"></slot>
        <slot name="content"></slot>
        <slot name="footer"></slot>
      </div>
    </template>
  `;
  static #shadowStyleSheet = css`
    :host {
      display: block;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }

    .s-container {
      display: grid;
      padding: 0;
      grid-template-areas:
        "sidebar header"
        "sidebar content"
        "sidebar footer";
      grid-template-columns: var(--sidebar-width) 1fr;
      grid-template-rows: var(--header-height) 1fr var(--footer-height);
      height: 100%;
      overflow: hidden;
      transition: grid-template-columns 0.3s ease-in-out;
    }

    :host([collapsed]) .s-container {
      grid-template-columns: var(--sidebar-width-collapsed) 1fr;
    }

    ::slotted(s-header) {
      grid-area: header;
      padding: 10px;
      height: var(--header-height);
    }

    ::slotted(s-sidebar) {
      grid-area: sidebar;
      overflow-y: auto;
    }

    ::slotted(s-content) {
      grid-area: content;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 15px;
    }

    ::slotted(s-footer) {
      grid-area: footer;
      padding: 10px;
      height: var(--footer-height);
    }
  `;

  #shadowRoot = null;

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#shadowRoot.adoptedStyleSheets = [SLayout.#shadowStyleSheet];
    this.#shadowRoot.append(
      document.importNode(SLayout.#shadowTemplate.content, true)
    );

    this.addEventListener("sidebar-toggle", this._onSidebarToggle.bind(this));
  }

  connectedCallback() {
    this._requestAnimationFrame();
  }

  disconnectedCallback() {}

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
  }

  // Wait for the DOM to render before accessing slot content
  _requestAnimationFrame() {
    const sidebarSlot = this.#shadowRoot.querySelector('slot[name="sidebar"]');
    const sidebarNodes = sidebarSlot.assignedElements();

    if (sidebarNodes.length > 0) {
      const sidebarEl = sidebarNodes[0];

      // ✅ Read collapsed attribute from s-sidebar
      const expandedAttr = sidebarEl.getAttribute("expanded");

      if (expandedAttr === "" || expandedAttr === "false") {
        this.setAttribute("collapsed", "");
      }
    }
  }

  _onSidebarToggle(event) {
    const collapsed = event?.detail?.collapsed;
    if (collapsed === "false") {
      this.setAttribute("collapsed", "");
    } else {
      this.removeAttribute("collapsed");
    }
  }
}

customElements.define("s-layout", SLayout);
