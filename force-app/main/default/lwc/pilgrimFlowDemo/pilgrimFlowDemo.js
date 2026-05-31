import { LightningElement, track } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { BILLING_ACCOUNT_OPTIONS } from "./mockData";

/**
 * @class PilgrimFlowDemo
 * @extends LightningElement
 *
 * @classdesc
 * A dummy "New Service Request" flow showing how to use `c-pilgrim-flow`:
 * declarative slotted steps, a host-owned shared context, per-step validation
 * gating, a conditional step, the progress indicator, and `oncomplete` handling.
 */
export default class PilgrimFlowDemo extends LightningElement {
  @track data = {
    fullName: "",
    email: "",
    needsBilling: false,
    billingAccountId: ""
  };

  billingLoading = false;
  billingOptions = [];

  // --- conditional step ---
  get skipBilling() {
    return !this.data.needsBilling;
  }

  // --- validation gating (host binds `valid` on each step) ---
  get contactValid() {
    return Boolean(this.data.fullName) && /.+@.+/.test(this.data.email);
  }

  get billingValid() {
    return this.skipBilling || Boolean(this.data.billingAccountId);
  }

  get billingAccountLabel() {
    const option = this.billingOptions.find(
      (o) => o.value === this.data.billingAccountId
    );
    return option ? option.label : "—";
  }

  // --- uncontrolled inputs report up into the host's copy of the data ---
  handleField(event) {
    const key = event.target.dataset.key;
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    this.data = { ...this.data, [key]: value };
  }

  // --- flow events ---
  handleStepChange(event) {
    if (event.detail.name === "billing") {
      this.billingLoading = true;
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        this.billingOptions = BILLING_ACCOUNT_OPTIONS;
        this.billingLoading = false;
      }, 1200);
    }
  }

  handleFlowDataChange(event) {
    this.data = { ...this.data, ...event.detail.flowData };
  }

  handleComplete(event) {
    const payload = JSON.stringify(event.detail.flowData);
    this.dispatchEvent(
      new ShowToastEvent({
        title: "Request submitted",
        message: payload,
        variant: "success"
      })
    );
  }
}
