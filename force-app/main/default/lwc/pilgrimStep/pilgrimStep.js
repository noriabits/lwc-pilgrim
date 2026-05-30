import { LightningElement, api } from "lwc";

/**
 * @class PilgrimStep
 * @extends LightningElement
 *
 * @classdesc
 * A single screen inside a `c-pilgrim-flow`. The implementor places their own
 * content as children; this wrapper exposes it through a default `<slot>` and
 * toggles visibility so step state survives navigation (content stays in the DOM).
 *
 * Steps register themselves with the parent `c-pilgrim-flow` on connect using the
 * same bubbling-event handshake `lightning-tab` uses with `lightning-tabset`.
 */
export default class PilgrimStep extends LightningElement {
  /** Text shown in the progress indicator / step header. */
  @api label;

  /** Stable key used by the flow for navigation and the progress `current-step`. */
  @api name;

  // --- validity (drives the flow's Next/Done gate) ---
  _valid = true;

  /** Whether this step is currently valid. Default `true`. */
  @api
  get valid() {
    return this._valid;
  }
  set valid(value) {
    this._valid = value !== false;
    this.notifyValidity();
  }

  // --- conditional step ---
  _hidden = false;

  /** When `true` the step is skipped in navigation and the progress indicator. */
  @api
  get hidden() {
    return this._hidden;
  }
  set hidden(value) {
    this._hidden = value === true || value === "true";
    this.notifyVisibility();
  }

  // --- active state (controlled by the parent flow) ---
  _active = false;

  /** Whether this step is the one currently displayed. Set by `c-pilgrim-flow`. */
  @api
  get active() {
    return this._active;
  }
  set active(value) {
    this._active = value === true;
  }

  get containerClass() {
    return this._active ? "pilgrim-step" : "pilgrim-step slds-hide";
  }

  connectedCallback() {
    this.dispatchEvent(
      new CustomEvent("pilgrimstepregister", {
        bubbles: true,
        composed: true,
        detail: {
          step: this,
          setActive: (isActive) => {
            this._active = isActive === true;
          }
        }
      })
    );
  }

  disconnectedCallback() {
    this.dispatchEvent(
      new CustomEvent("pilgrimstepunregister", {
        bubbles: true,
        composed: true,
        detail: { step: this }
      })
    );
  }

  notifyValidity() {
    this.dispatchEvent(
      new CustomEvent("pilgrimstepvalidity", {
        bubbles: true,
        composed: true,
        detail: { step: this, valid: this._valid }
      })
    );
  }

  notifyVisibility() {
    this.dispatchEvent(
      new CustomEvent("pilgrimstepvisibility", {
        bubbles: true,
        composed: true,
        detail: { step: this, hidden: this._hidden }
      })
    );
  }
}
