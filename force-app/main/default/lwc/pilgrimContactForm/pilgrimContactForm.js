import { LightningElement } from "lwc";

export default class PilgrimContactForm extends LightningElement {
  handleChange(event) {
    const key = event.target.dataset.key;
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    this.dispatchEvent(
      new CustomEvent("pilgrimdatawrite", {
        bubbles: true,
        composed: true,
        detail: { key, value }
      })
    );
  }
}
