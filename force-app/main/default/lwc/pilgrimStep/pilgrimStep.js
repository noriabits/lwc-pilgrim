import { LightningElement, api, track } from "lwc";

export default class PilgrimStep extends LightningElement {
  @api label;
  @api name;

  _valid = true;

  @api
  get valid() {
    return this._valid;
  }
  set valid(value) {
    this._valid = value !== false;
    this.notifyValidity();
  }

  _skip = false;

  /** When `true` the step is skipped in navigation and the progress indicator. */
  @api
  get skip() {
    return this._skip;
  }
  set skip(value) {
    this._skip = value === true || value === "true";
    this.notifyVisibility();
  }

  // @track so the setActive callback (which bypasses the @api setter) triggers re-renders
  @track _active = false;

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
    this._descriptor = {
      uid: null,
      name: this.name,
      label: this.label,
      valid: this._valid,
      skip: this._skip
    };
    this.dispatchEvent(
      new CustomEvent("pilgrimstepregister", {
        bubbles: true,
        composed: true,
        detail: {
          step: this._descriptor,
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
        detail: { uid: this._descriptor?.uid }
      })
    );
  }

  notifyValidity() {
    if (!this._descriptor) return;
    this.dispatchEvent(
      new CustomEvent("pilgrimstepvalidity", {
        bubbles: true,
        composed: true,
        detail: { uid: this._descriptor.uid, valid: this._valid }
      })
    );
  }

  notifyVisibility() {
    if (!this._descriptor) return;
    this.dispatchEvent(
      new CustomEvent("pilgrimstepvisibility", {
        bubbles: true,
        composed: true,
        detail: { uid: this._descriptor.uid, skip: this._skip }
      })
    );
  }
}
