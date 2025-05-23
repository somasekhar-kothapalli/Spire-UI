import { isPointerInsideElement } from "../utils/element.js";

let showModal = HTMLDialogElement.prototype.showModal;
let close = HTMLDialogElement.prototype.close;
let openDialogs = [];

// @element dialog
let DialogElementMixin = {
  // @property readOnly
  // @attribute
  // @type boolean
  // @default false
  //
  // Whether the dialog is currently open.
  get open() {
    return this.hasAttribute("open");
  },

  // @method
  // @type () => Promise
  //
  // Open the dialog.<br/>
  // Returns a promise that is resolved when the dialog finishes animating.
  showModal() {
    return new Promise(async (resolve) => {
      if (this.open === true || this.isConnected === false) {
        resolve();
        return;
      }
      if (this._showAnimation) {
        await this._showAnimation.finished;
      }
      if (this._closeAnimation) {
        await this._closeAnimation.finished;
      }

      showModal.apply(this, arguments);

      // Prevent the document from being scrolled when the dialog is open
      {
        let closeListener;

        let initialOverflow = {
          html: document.documentElement.style.overflow,
          body: document.body.style.overflow,
        };

        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";

        openDialogs.push(this);

        this.addEventListener(
          "close",
          (closeListener = (event) => {
            // Note that "close" event might also dispatched by e.g. <bs-menu> inside the dialog, so we must
            // ensure that the event target is this dialog
            if (event.target === this) {
              this.removeEventListener("close", closeListener);
              openDialogs = openDialogs.filter((dialog) => dialog !== this);

              if (openDialogs.length === 0) {
                document.documentElement.style.overflow = initialOverflow.html;
                document.body.style.overflow = initialOverflow.body;
              }
            }
          })
        );
      }

      // Focus either the dialog or an element inside the dialog that has "autofocus" attribute
      // https://github.com/whatwg/html/issues/1929#issuecomment-272632190
      {
        let autofocusElement = this.querySelector("[autofocus]");

        if (autofocusElement) {
          autofocusElement.focus();
        } else {
          this.focus();
        }
      }

      // Animate the dialog
      {
        if (this.hasAttribute("hidden") === false) {
          let computedStyle = getComputedStyle(this);
          let transitionDuration =
            parseFloat(
              computedStyle.getPropertyValue("transition-duration") || "0s"
            ) * 1000;
          let transitionTimingFunction = computedStyle.getPropertyValue(
            "transition-timing-function"
          );
          let transitionType =
            computedStyle.getPropertyValue("--transition-type") || "stretch";

          this._showAnimation = this.animate(
            {
              transform:
                transitionType === "grow"
                  ? [`scale(0.9)`, "scale(1)"]
                  : [`scaleY(0)`, "scaleY(1)"],
              opacity: ["0", "1"],
            },
            { duration: transitionDuration, easing: transitionTimingFunction }
          );
        }
      }

      // Do not close the dialog with "Escape" key
      {
        let keyDownListener;
        let documentKeyDownListener;
        let closeListener;

        this.addEventListener(
          "keydown",
          (keyDownListener = (event) => {
            if (event.code === "Escape") {
              event.preventDefault();
            }
          })
        );

        document.addEventListener(
          "keydown",
          (documentKeyDownListener = (event) => {
            if (event.code === "Escape" && event.target === document.body) {
              // Don't close the dialog if focus is outside the dialog
              event.preventDefault();
            }
          })
        );

        this.addEventListener(
          "close",
          (closeListener = (event) => {
            // Note that "close" event might also dispatched by e.g. <bs-menu> inside the dialog, so we must
            // ensure that the event target is this dialog
            if (event.target === this) {
              this.removeEventListener("close", closeListener);
              this.removeEventListener("keydown", keyDownListener);
              document.removeEventListener("keydown", documentKeyDownListener);
            }
          })
        );
      }

      // Close the dialog when backdrop is clicked
      {
        let pointerDownListener;
        let clickListener;
        let closeListener;
        let closeOnClick = true;

        this.addEventListener(
          "pointerdown",
          (pointerDownListener = (event) => {
            closeOnClick = isPointerInsideElement(event, this) === false;
          })
        );

        this.addEventListener(
          "click",
          (clickListener = (event) => {
            if (
              event.target === this &&
              event.isTrusted === true && // Click event was not triggered by keyboard
              event.defaultPrevented === false &&
              closeOnClick === true &&
              isPointerInsideElement(event, this) === false &&
              this.hasAttribute("open") === true
            ) {
              this.close();

              // Provide a custom "userclose" event which is dispatched only when the dialog was closed by user
              // clicking the backdrop. This event is unlike the standard "close" event which is dispatched even when
              // the dialog was closed programmatically.
              this.dispatchEvent(new CustomEvent("userclose"));
            }
          })
        );

        this.addEventListener(
          "close",
          (closeListener = (event) => {
            // Note that "close" event might also dispatched by e.g. <bs-menu> inside the dialog, so we must
            // ensure that the event target is this dialog
            if (event.target === this) {
              this.removeEventListener("pointerdown", pointerDownListener);
              this.removeEventListener("click", clickListener);
              this.removeEventListener("close", closeListener);
            }
          })
        );
      }

      if (this._showAnimation) {
        await this._showAnimation.finished;
        this._showAnimation = null;
      }

      resolve();
    });
  },

  // @method
  // @type () => Promise
  //
  // Close the dialog.<br/>
  // Returns a promise that is resolved when the dialog finishes animating.
  close() {
    return new Promise(async (resolve) => {
      // Animate the dialog
      {
        if (this._showAnimation) {
          await this._showAnimation.finished;
        }

        if (this._closeAnimation) {
          await this._closeAnimation.finished;
        }

        if (this.hasAttribute("hidden") === false) {
          let computedStyle = getComputedStyle(this);
          let transitionDuration =
            parseFloat(
              computedStyle.getPropertyValue("transition-duration") || "0s"
            ) * 1000;
          let transitionTimingFunction =
            computedStyle.getPropertyValue("transition-timing-function") ||
            "ease";
          let transitionType =
            computedStyle.getPropertyValue("--transition-type") || "stretch";

          this._closeAnimation = this.animate(
            {
              transform:
                transitionType === "grow"
                  ? [`scale(1)`, "scale(0.9)"]
                  : [`scaleY(1)`, "scaleY(0)"],
              opacity: ["1", "0"],
            },
            { duration: transitionDuration, easing: transitionTimingFunction }
          );
        }
      }

      if (this._closeAnimation) {
        await this._closeAnimation.finished;
        this._closeAnimation = null;
      }

      if (this.hasAttribute("open")) {
        close.apply(this, arguments);
      }

      resolve();
    });
  },
};

for (let [name, desc] of Object.entries(
  Object.getOwnPropertyDescriptors(DialogElementMixin)
)) {
  Object.defineProperty(HTMLDialogElement.prototype, name, desc);
}

export default HTMLDialogElement;
