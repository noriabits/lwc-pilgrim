import { api } from "lwc";
import PilgrimStepBase from "c/pilgrimStepBase";

export default class PilgrimBillingForm extends PilgrimStepBase {
  @api options = [];
  @api value = "";

  handleChange(event) {
    if (event.target.dataset.key === "billingAccountId") {
      // Write the account ID and its human-readable label together so flowData
      // is self-contained — the host doesn't need a reverse-lookup getter.
      const accountId = event.detail.value;
      const option = this.options.find((o) => o.value === accountId);
      this.writeDataPatch({
        billingAccountId: accountId,
        billingAccountLabel: option?.label ?? ""
      });
    } else {
      // All other fields (e.g. PO number) need no special handling.
      super.handleChange(event);
    }
  }
}
