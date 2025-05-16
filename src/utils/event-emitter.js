export default class EventEmitter {
  _events = {};

  emit(eventName, ...args) {
    if (!this._events || !this._events[eventName]) return;
    for (const listener of this._events[eventName]) {
      listener(...args);
    }
  }

  // @type (string, Function) => void
  addEventListener(eventName, listener) {
    if (!this._events) {
      this._events = {};
    }

    let listeners = this._events[eventName];

    if (!listeners) {
      this._events[eventName] = listeners = [];
    }

    listeners.push(listener);

    if (listeners.length > 10000) {
      console.warn(
        `Potential EventEmitter memory leak: ${listeners.length} listeners ` +
          `subscribed to event "${eventName}"`
      );
    }
  }

  // @type (string, Function) => void
  removeEventListener(eventName, listener) {
    if (!this._events || !this._events[eventName]) {
      return;
    }

    var temp = [];

    for (var i = 0; i < this._events[eventName].length; i += 1) {
      if (this._events[eventName][i] !== listener) {
        temp.push(this._events[eventName][i]);
      }
    }

    this._events[eventName] = temp;
  }

  // @type (CustomEvent) => void
  dispatchEvent(event) {
    if (!this._events) {
      return;
    }

    let listeners = this._events[event.type];

    if (!listeners) {
      return;
    }

    // If there is an error in any of the listeners then it will be thrown only after all listeners were fired,
    // this is necessary to prevent error in one listener from stopping all subsequent listeners

    let cachedError = null;

    for (let i = listeners.length - 1; i >= 0; i -= 1) {
      let listener = listeners[i];
      let result;

      try {
        result = listener.call(window, event);
      } catch (error) {
        if (cachedError === null) {
          cachedError = error;
        }
      }

      // Stop event propagation if listener returns false
      if (result === false) {
        break;
      }
    }

    if (cachedError) {
      throw cachedError;
    }
  }
}
