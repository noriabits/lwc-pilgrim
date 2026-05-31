import { LightningElement } from "lwc";

export default class PilgrimStepBase extends LightningElement {
  writeData(key, value) {
    this.dispatchEvent(
      new CustomEvent("pilgrimdatawrite", {
        bubbles: true,
        composed: true,
        detail: { key, value }
      })
    );
  }

  writeDataPatch(patch) {
    this.dispatchEvent(
      new CustomEvent("pilgrimdatawrite", {
        bubbles: true,
        composed: true,
        detail: { patch }
      })
    );
  }

  // Default handler for standard data-key inputs.
  // Prefers event.detail.value (lightning-combobox, lightning-radio-group) and
  // falls back to event.target.value / event.target.checked for native inputs.
  handleChange(event) {
    const key = event.target.dataset.key;
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : (event.detail?.value ?? event.target.value);
    this.writeData(key, value);
  }
}
