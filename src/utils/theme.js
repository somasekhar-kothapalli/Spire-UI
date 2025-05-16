import EventEmitter from "./event-emitter.js";

// @singleton
// @event themechange
// @event accentcolorchange
export default new (class SpireTheme extends EventEmitter {
  _theme;
  _accentColor;
  _themeReadyCallbacks = [];
  _themeStyleSheet = new CSSStyleSheet();

  get theme() {
    return this._theme;
  }

  set theme(value) {
    this._setMetaValue("spire-theme", value);
  }

  get accentColor() {
    return this._accentColor;
  }

  set accentColor(value) {
    this._setMetaValue("spire-accent-color", value);
  }

  constructor() {
    super();
    document.adoptedStyleSheets = [this._themeStyleSheet];
    let { theme, accentColor, icons, locales } = this._getSettings();

    this._theme = theme || "blue";
    this._accentColor = accentColor || "blue";

    // Load theme
    if (this._theme !== null) {
      this._loadTheme(this._theme);
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

  _onHeadChange(mutations) {
    let oldTheme = this._theme;
    let oldAccentColor = this._accentColor;

    let { theme, accentColor, icons, locales } = this._getSettings();

    this._theme = theme;
    this._accentColor = accentColor;

    if (this._theme !== oldTheme) {
      this._loadTheme(this._theme).then(() => {
        this.dispatchEvent(new CustomEvent("themechange"));
      });
    }

    if (this._accentColor !== oldAccentColor) {
      this._updateThemeAccentColor();
      this.dispatchEvent(new CustomEvent("accentcolorchange"));
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

  _loadTheme(themeName) {
    return new Promise(async (resolve) => {
      if (this._themeReadyCallbacks === null) {
        this._themeReadyCallbacks = [];
      }

      let cssText = await this._fetchTheme(themeName);
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      this._themeStyleSheet = sheet;
      document.adoptedStyleSheets = [this._themeStyleSheet];

      this._updateThemeAccentColor();

      if (this._themeReadyCallbacks !== null) {
        for (let callback of this._themeReadyCallbacks) {
          callback();
        }

        this._themeReadyCallbacks = null;
      }

      resolve();
    });
  }

  async _updateThemeAccentColor() {
    await this.whenThemeReady;
    let color = this._accentColor || this.presetAccentColors.blue;
    let resolvedColor = color;

    if (this.presetAccentColors[color]) {
      resolvedColor = this.presetAccentColors[color];
    }

    let rule = [...this._themeStyleSheet.cssRules]
      .reverse()
      .find(($0) => $0.type === 1 && $0.selectorText === ":root");

    if (this.theme.includes("material")) {
      rule.style.setProperty("--accent-color", "var(--material-primary-color)");
    } else {
      rule.style.setProperty("--accent-color", resolvedColor);
    }

    // Set "--material-<colorName>" CSS properties on <body> element
    if (this.theme.includes("material")) {
      let materialColors = getMaterialCSSColorVariables(
        resolvedColor,
        this.theme.endsWith("-dark.css"),
        color === "gray"
      );

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
        // Extract the path from the import rule
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

  get whenThemeReady() {
    return new Promise((resolve) => {
      if (this._themeStyleSheet) {
        resolve();
      } else {
        this._themeReadyCallbacks.push(resolve);
      }
    });
  }

  // @type CSSStyleSheet
  get themeStyleSheet() {
    return this._themeStyleSheet;
  }

  // @type Object
  get presetAccentColors() {
    let colors = {};

    for (let rule of this._themeStyleSheet.cssRules) {
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

  _getMetaValue(name) {
    const meta = document.head.querySelector(`meta[name="${name}"]`);
    return meta ? meta.getAttribute("content") : null;
  }

  _setMetaValue(name, value) {
    let meta = document.head.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", value);
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
})();
