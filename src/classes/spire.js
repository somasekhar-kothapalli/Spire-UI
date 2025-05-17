import EventEmitter from "./event-emitter.js";

import { compareArrays } from "../utils/array.js";
import { getIcons } from "../utils/icon.js";

// @singleton
// @event themechange
// @event iconschange
// @event configchange
// @event accentcolorchange
export default new (class Spire extends EventEmitter {
  // @type string?
  //
  // URL to a CSS file with Spire theme definition.
  get theme() {
    return this.#theme;
  }
  set theme(value) {
    let metaElement = document.head.querySelector(
      `:scope > meta[name="spire-theme"]`
    );

    if (!metaElement) {
      metaElement = document.createElement("meta");
      metaElement.setAttribute("name", "spire-theme");
      document.head.append(metaElement);
    }

    metaElement.setAttribute("content", value);
  }

  // @type Array<string>
  //
  // URLs to an SVG files with icons.
  get icons() {
    return [...this.#icons];
  }
  set icons(urls) {
    let metaElement = document.head.querySelector(
      `:scope > meta[name="spire-icons"]`
    );

    if (!metaElement) {
      // @legacy
      {
        metaElement = document.head.querySelector(
          `:scope > meta[name="spire-iconsets"]`
        );

        if (metaElement) {
          console.warn(
            `<meta name="spire-iconsets"> has been deprecated. Please use <meta name="spire-icons"> instead.`
          );
        }
      }

      if (!metaElement) {
        metaElement = document.createElement("meta");
        metaElement.setAttribute("name", "spire-icons");
        document.head.append(metaElement);
      }
    }

    metaElement.setAttribute("content", urls.join(", "));
  }

  // @type Array<string>
  //
  // URLs to files with localizations.
  // Each file name should consist from ISO 639 language code (e.g. "en"), optionally followed by "-" and ISO 3166
  // territory, e.g. "en", "en-US" or "en-GB".
  get locales() {
    return [...this.#locales];
  }
  set locales(urls) {
    let metaElement = document.head.querySelector(
      `:scope > meta[name="spire-locales"]`
    );

    if (!metaElement) {
      metaElement = document.createElement("meta");
      metaElement.setAttribute("name", "spire-locales");
      document.head.append(metaElement);
    }

    metaElement.setAttribute("content", urls.join(", "));
  }

  // @type string
  get locale() {
    return this.#localesIds[0] || "en";
  }

  // @type string
  //
  // Accent color.
  get accentColor() {
    return this.#accentColor;
  }
  set accentColor(value) {
    let meta = document.head.querySelector(
      `:scope > meta[name="spire-accent-color"]`
    );

    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "spire-accent-color");
      document.head.append(meta);
    }

    meta.setAttribute("content", value);
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  get whenThemeReady() {
    return new Promise((resolve) => {
      if (this.#themeReadyCallbacks === null) {
        resolve();
      } else {
        this.#themeReadyCallbacks.push(resolve);
      }
    });
  }

  get whenIconsReady() {
    return new Promise((resolve) => {
      if (this.#iconsReadyCalbacks === null) {
        resolve();
      } else {
        this.#iconsReadyCalbacks.push(resolve);
      }
    });
  }

  get whenLocalesReady() {
    return new Promise((resolve) => {
      if (this.#localesReadyCallbacks === null) {
        resolve();
      } else {
        this.#localesReadyCallbacks.push(resolve);
      }
    });
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @type CSSStyleSheet
  get themeStyleSheet() {
    return this.#themeStyleSheet;
  }

  // @type Object
  get presetAccentColors() {
    let colors = {};

    for (let rule of this.#themeStyleSheet.cssRules) {
      if (rule.type === 1 && rule.selectorText === ":root") {
        let unparsedValue = rule.style.getPropertyValue(
          "--preset-accent-colors"
        );

        if (unparsedValue !== "") {
          let entries = unparsedValue.split(",").map(($0) => $0.trim());

          for (let entry of entries) {
            let displayName = entry.substring(0, entry.indexOf(" "));
            let value = entry.substring(entry.indexOf(" ") + 1).trim();
            colors[displayName] = value;
          }

          break;
        }
      }
    }

    return colors;
  }

  // @type "none" || "titlecase"
  get autocapitalize() {
    return this.#autocapitalize;
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @type (string) => SVGSymbolElement
  //
  // Get an icon matching the given selector.
  // Selector consists from "#", followed by the icon ID.
  // Should be called after Spire.whenIconsReady.
  queryIcon(selector) {
    selector = selector.startsWith("#") === false ? "#" + selector : selector;

    let icon = null;

    for (let iconsElement of this.#iconsElements) {
      let matchedIcon = iconsElement.querySelector(selector);

      if (matchedIcon) {
        icon = matchedIcon;
        break;
      }
    }

    return icon;
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  getConfig(key, defaultValue = null) {
    let rawValue = localStorage.getItem(key);
    return rawValue === null ? defaultValue : JSON.parse(rawValue);
  }

  setConfig(key, value) {
    let beforeRawValue = localStorage.getItem(key);

    if (value === null) {
      delete localStorage[key];
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }

    let afterRawValue = localStorage.getItem(key);

    if (beforeRawValue !== afterRawValue) {
      this.dispatchEvent(
        new CustomEvent("configchange", {
          detail: { key, value, origin: "self" },
        })
      );
    }
  }

  clearConfig() {
    if (localStorage.length > 0) {
      let keys = Object.keys(localStorage);
      localStorage.clear();

      for (let key of keys) {
        this.dispatchEvent(
          new CustomEvent("configchange", {
            detail: { key, value: null, origin: "self" },
          })
        );
      }
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  #theme = null;
  #accentColor = null;
  #icons = [];
  #locales = [];
  #localesIds = [];
  #autocapitalize = "none";

  #themeStyleSheet = new CSSStyleSheet();
  #iconsElements = [];
  #localesBundle = null;

  #themeReadyCallbacks = [];
  #iconsReadyCalbacks = [];
  #localesReadyCallbacks = [];

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  constructor() {
    super();

    document.adoptedStyleSheets = [this.#themeStyleSheet];

    let { theme, accentColor, icons, locales } = this._getSettings();

    this.#theme = theme;
    this.#accentColor = accentColor;
    this.#icons = icons;
    this.#locales = locales;

    this.#localesIds = this.#locales.map((locale) => {
      let fileName = locale.substring(locale.lastIndexOf("/") + 1);
      return fileName.substring(0, fileName.indexOf("."));
    });

    // Load theme
    if (this.#theme !== null) {
      this._loadTheme(this.#theme);
    }

    // Load icons
    if (this.#icons.length > 0) {
      this._loadIcons(this.#icons);
    }

    // Observe <head> for changes
    {
      let observer = new MutationObserver((mutations) =>
        this._onHeadChange(mutations)
      );
      observer.observe(document.head, { attributes: true, subtree: true });
    }

    // Observe localStorage for changes
    {
      window.addEventListener("storage", (event) =>
        this._onStorageChange(event)
      );
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  _onHeadChange(mutations) {
    let oldTheme = this.#theme;
    let oldAccentColor = this.#accentColor;
    let oldIcons = this.#icons;
    let oldLocales = this.#locales;

    let { theme, accentColor, icons, locales } = this._getSettings();

    this.#theme = theme;
    this.#accentColor = accentColor;
    this.#icons = icons;
    this.#locales = locales;

    this.#localesIds = this.#locales.map((locale) => {
      let fileName = locale.substring(locale.lastIndexOf("/") + 1);
      return fileName.substring(0, fileName.indexOf("."));
    });

    if (this.#theme !== oldTheme) {
      this._loadTheme(this.#theme).then(() => {
        this.dispatchEvent(new CustomEvent("themechange"));
      });
    }

    if (this.#accentColor !== oldAccentColor) {
      this._updateThemeAccentColor();
      this.dispatchEvent(new CustomEvent("accentcolorchange"));
    }

    if (compareArrays(this.#icons, oldIcons, true) === false) {
      this._loadIcons(this.#icons).then(() => {
        this.dispatchEvent(new CustomEvent("iconschange"));

        // @legacy
        this.dispatchEvent(new CustomEvent("iconsetschange"));
      });
    }
  }

  // Fired only when storage is changed by OTHER app instance running in a separate tab or window.
  _onStorageChange(event) {
    if (event.storageArea === window.localStorage) {
      let key = event.key;
      let value = event.newValue === null ? null : JSON.parse(event.newValue);
      this.dispatchEvent(
        new CustomEvent("configchange", {
          detail: { key, value, origin: "other" },
        })
      );
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  _fetchTheme(url) {
    return new Promise(async (resolve) => {
      let response = await fetch(url);
      let themeText = await response.text();

      for (let [importRuleURL, importRuleText] of this._getThemeImportRules(
        themeText
      )) {
        let importText = await this._fetchTheme(importRuleURL);
        themeText = themeText.replace(importRuleText, importText);
      }

      resolve(themeText);
    });
  }

  _loadTheme(url) {
    return new Promise(async (resolve) => {
      if (this.#themeReadyCallbacks === null) {
        this.#themeReadyCallbacks = [];
      }

      let cssText = await this._fetchTheme(url);
      this.#themeStyleSheet.replaceSync(cssText);

      this._updateAutocapitalizeProperty();
      this._updateThemeAccentColor();

      if (this.#themeReadyCallbacks !== null) {
        for (let callback of this.#themeReadyCallbacks) {
          callback();
        }

        this.#themeReadyCallbacks = null;
      }

      resolve();
    });
  }

  _loadIcons(urls) {
    return new Promise(async (resolve) => {
      if (this.#iconsReadyCalbacks === null) {
        this.#iconsReadyCalbacks = [];
      }

      this.#iconsElements = [];

      for (let url of urls) {
        let iconsElement = await getIcons(url);
        this.#iconsElements.push(iconsElement);
      }

      for (let callback of this.#iconsReadyCalbacks) {
        callback();
      }

      this.#iconsReadyCalbacks = null;
      resolve();
    });
  }

  _updateAutocapitalizeProperty() {
    if (this.#localesBundle?.locales[0]?.startsWith("en")) {
      let computedStyle = getComputedStyle(document.documentElement);
      this.#autocapitalize =
        computedStyle.getPropertyValue("--autocapitalize").trim() || "none";
    } else {
      this.#autocapitalize = "none";
    }
  }

  async _updateThemeAccentColor() {
    await this.whenThemeReady;
    let color = this.#accentColor || this.presetAccentColors.blue;
    let resolvedColor = color;

    if (this.presetAccentColors[color]) {
      resolvedColor = this.presetAccentColors[color];
    }

    let rule = [...this.#themeStyleSheet.cssRules]
      .reverse()
      .find(($0) => $0.type === 1 && $0.selectorText === ":root");

    if (this.theme.includes("material")) {
      rule.style.setProperty("--accent-color", "var(--material-primary-color)");
    } else {
      rule.style.setProperty("--accent-color", resolvedColor);
    }

    // Set "--material-<colorName>" CSS properties on <body> element
    if (this.theme.includes("material")) {
      // let materialColors = getMaterialCSSColorVariables(
      //   resolvedColor,
      //   this.theme.endsWith("-dark.css"),
      //   color === "gray"
      // );

      for (let [propertyName, value] of Object.entries(materialColors)) {
        rule.style.setProperty(propertyName, value);
      }
    }

    // Set <meta name="theme-color">
    {
      let meta = document.head.querySelector(`meta[name="theme-color"]`);
      let computedStyle = getComputedStyle(document.documentElement);
      let titlebarColor =
        computedStyle.getPropertyValue("--titlebar-color").trim() || "auto";

      if (titlebarColor === "auto") {
        if (meta) {
          meta.remove();
        }
      } else {
        if (meta === null) {
          meta = document.createElement("meta");
          meta.setAttribute("name", "theme-color");
          document.head.append(meta);
        }

        meta.setAttribute("content", titlebarColor);
      }
    }
  }

  _getSettings() {
    let themeMeta = document.head.querySelector(
      `:scope > meta[name="spire-theme"]`
    );
    let accentColorMeta = document.head.querySelector(
      `:scope > meta[name="spire-accent-color"]`
    );
    let iconsMeta = document.head.querySelector(
      `:scope > meta[name="spire-icons"]`
    );
    let localesMeta = document.head.querySelector(
      `:scope > meta[name="spire-locales"]`
    );

    // @legacy
    if (!iconsMeta) {
      iconsMeta = document.head.querySelector(
        `:scope > meta[name="spire-iconsets"]`
      );

      if (iconsMeta) {
        console.warn(
          `<meta name="spire-iconsets"> has been deprecated in in Spire 0.27.0. Please use <meta name="spire-icons"> instead.`
        );
      }
    }

    let theme = null;
    let accentColor = null;
    let icons = [];
    let locales = [];

    if (themeMeta && themeMeta.content !== "") {
      theme = themeMeta.content;
    }
    if (accentColorMeta && accentColorMeta.content !== "") {
      accentColor = accentColorMeta.content;
    } else {
      accentColor = "#000";
    }
    if (iconsMeta) {
      icons = iconsMeta.content
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l !== "");
    }
    if (localesMeta) {
      locales = localesMeta.content
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l !== "");
    }

    return { theme, accentColor, icons, locales };
  }

  _getThemeImportRules(themeText) {
    let output = [];
    let currentIndex = -1;

    while (true) {
      let importStartIndex = themeText.indexOf("@import", currentIndex);

      if (importStartIndex > -1) {
        let importEndIndex = themeText.indexOf(";", importStartIndex);
        let pathStartIndex = 0;
        let pathEndIndex =
          themeText.indexOf(".css", importStartIndex) + ".css".length;
        let quoteIndex = themeText.indexOf(`'`, importStartIndex);
        let dblquoteIndex = themeText.indexOf(`"`, importStartIndex);

        if (quoteIndex > importStartIndex && quoteIndex < importEndIndex) {
          pathStartIndex = quoteIndex + 1;
        } else if (
          dblquoteIndex > importStartIndex &&
          dblquoteIndex < importEndIndex
        ) {
          pathStartIndex = dblquoteIndex + 1;
        } else {
          let urlStartIndex = themeText.indexOf("url(", importStartIndex);

          if (
            urlStartIndex > importStartIndex &&
            urlStartIndex < importEndIndex
          ) {
            pathStartIndex = urlStartIndex + "url(".length;
          }
        }

        let path = themeText.substring(pathStartIndex, pathEndIndex);

        output.push([
          path,
          themeText.substring(importStartIndex, importEndIndex + 1),
        ]);
        currentIndex = pathEndIndex;
      } else {
        break;
      }
    }

    return output;
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @legacy
  get iconsets() {
    console.warn(
      `"Spire.iconsets" has been deprecated in Spire 0.27.0. Please use "Spire.icons" instead.`
    );
    return this.icons;
  }
  set iconsets(iconsets) {
    console.warn(
      `"Spire.iconsets" has been deprecated in Spire 0.27.0. Please use "Spire.icons" instead.`
    );
    this.icons = iconsets;
  }
  get whenIconsetsReady() {
    console.warn(
      `"Spire.whenIconsetsReady" has been deprecated in Spire 0.27.0. Please use "Spire.whenIconsReady" instead.`
    );
    return this.whenIconsReady;
  }
})();
