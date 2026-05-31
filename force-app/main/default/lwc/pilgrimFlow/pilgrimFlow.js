import { LightningElement, api, track } from "lwc";
import labelBack from "@salesforce/label/c.PilgrimFlowBack";
import labelNext from "@salesforce/label/c.PilgrimFlowNext";
import labelDone from "@salesforce/label/c.PilgrimFlowDone";

export default class PilgrimFlow extends LightningElement {
  // --- public configuration ---
  @api showProgress = false;
  @api progressType = "base"; // 'base' | 'path'
  @api backLabel = labelBack;
  @api nextLabel = labelNext;
  @api doneLabel = labelDone;

  /** Seeds the shared context. */
  @api
  get data() {
    return this._flowData;
  }
  set data(value) {
    this._flowData = value ? { ...value } : {};
  }

  /** Read-only snapshot of the current shared context. */
  @api
  get flowData() {
    return { ...this._flowData };
  }

  @track _flowData = {};

  // Array of step descriptor POJOs — @track gives deep reactivity to pojo mutations
  @track _steps = [];
  _stepSeq = 0;

  @track _activeUid;

  connectedCallback() {
    this._onRegister = this.handleStepRegister.bind(this);
    this._onUnregister = this.handleStepUnregister.bind(this);
    this._onValidity = this.handleStepValidity.bind(this);
    this._onVisibility = this.handleStepVisibility.bind(this);
    this._onBusy = this.handleStepBusy.bind(this);
    this._onDataWrite = this.handleFlowDataChange.bind(this);
    this.addEventListener("pilgrimstepregister", this._onRegister);
    this.addEventListener("pilgrimstepunregister", this._onUnregister);
    this.addEventListener("pilgrimstepvalidity", this._onValidity);
    this.addEventListener("pilgrimstepvisibility", this._onVisibility);
    this.addEventListener("pilgrimstepbusy", this._onBusy);
    this.addEventListener("pilgrimdatawrite", this._onDataWrite);
  }

  disconnectedCallback() {
    this.removeEventListener("pilgrimstepregister", this._onRegister);
    this.removeEventListener("pilgrimstepunregister", this._onUnregister);
    this.removeEventListener("pilgrimstepvalidity", this._onValidity);
    this.removeEventListener("pilgrimstepvisibility", this._onVisibility);
    this.removeEventListener("pilgrimstepbusy", this._onBusy);
    this.removeEventListener("pilgrimdatawrite", this._onDataWrite);
    // Child steps also disconnect and lose their uid; reset so they re-register cleanly on reconnect.
    this._steps = [];
    this._stepSeq = 0;
    this._activeUid = undefined;
  }

  // --- registry handling ---

  handleStepRegister(event) {
    event.stopPropagation();
    const { step, setActive, setUid } = event.detail;
    const uid = `step-${this._stepSeq++}`;
    setUid(uid);
    this._steps = [...this._steps, { ...step, uid, setActive }];
    if (!this._activeUid) {
      this.activateStep(this.firstVisibleStep);
    } else {
      this.syncActiveStates();
    }
  }

  handleStepUnregister(event) {
    event.stopPropagation();
    const { uid } = event.detail;
    const wasActive = uid === this._activeUid;
    this._steps = this._steps.filter((s) => s.uid !== uid);
    if (wasActive) {
      this.activateStep(this.firstVisibleStep);
    }
  }

  handleStepValidity(event) {
    event.stopPropagation();
    const { uid, valid } = event.detail;
    this._steps = this._steps.map((s) => {
      return s.uid === uid ? { ...s, valid } : s;
    });
  }

  handleStepVisibility(event) {
    event.stopPropagation();
    const { uid, skip } = event.detail;
    this._steps = this._steps.map((s) => {
      return s.uid === uid ? { ...s, skip } : s;
    });
    const active = this.activeStep;
    if (!active || active.skip) {
      this.activateStep(this.firstVisibleStep);
    } else {
      this.syncActiveStates();
    }
  }

  handleStepBusy(event) {
    event.stopPropagation();
    const { uid, loading } = event.detail;
    this._steps = this._steps.map((s) => {
      return s.uid === uid ? { ...s, loading } : s;
    });
  }

  handleFlowDataChange(event) {
    event.stopPropagation();
    const { key, value, patch } = event.detail || {};
    const merge = patch || (key !== undefined ? { [key]: value } : {});
    this._flowData = { ...this._flowData, ...merge };
    this.emitFlowDataChange();
  }

  // --- derived state ---

  get visibleSteps() {
    return this._steps.filter((s) => !s.skip);
  }

  get firstVisibleStep() {
    return this.visibleSteps[0] || null;
  }

  get activeStep() {
    return this._steps.find((s) => s.uid === this._activeUid) || null;
  }

  get activeIndex() {
    return this.visibleSteps.findIndex((s) => s.uid === this._activeUid);
  }

  get progressSteps() {
    return this.visibleSteps.map((s) => ({
      value: s.uid,
      label: s.label
    }));
  }

  get currentStepValue() {
    return this._activeUid;
  }

  get activeStepLabel() {
    const active = this.activeStep;
    return active ? active.label : "";
  }

  get isFirst() {
    return this.activeIndex <= 0;
  }

  get isLast() {
    return this.activeIndex === this.visibleSteps.length - 1;
  }

  get activeStepValid() {
    const active = this.activeStep;
    return !active || (active.valid !== false && active.loading !== true);
  }

  get nextDisabled() {
    return !this.activeStepValid;
  }

  get showBack() {
    return !this.isFirst;
  }

  get showNext() {
    return !this.isLast && this.visibleSteps.length > 0;
  }

  get showFooterActions() {
    return this.visibleSteps.length > 0;
  }

  // --- navigation ---

  handleBack() {
    const index = this.activeIndex;
    if (index > 0) {
      this.activateStep(this.visibleSteps[index - 1]);
    }
  }

  handleNext() {
    if (!this.activeStepValid) {
      return;
    }
    const index = this.activeIndex;
    if (index < this.visibleSteps.length - 1) {
      this.activateStep(this.visibleSteps[index + 1]);
    }
  }

  handleDone() {
    if (!this.activeStepValid) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("complete", {
        detail: { flowData: { ...this._flowData } }
      })
    );
  }

  // --- helpers ---

  activateStep(step) {
    const isNavigation = this._activeUid != null;
    this._activeUid = step ? step.uid : null;
    this.syncActiveStates();
    if (step) {
      this.dispatchEvent(
        new CustomEvent("stepchange", {
          detail: {
            name: step.name,
            index: this.activeIndex,
            flowData: { ...this._flowData }
          }
        })
      );
      if (isNavigation) {
        // Move keyboard focus into the new step's region after the render cycle
        Promise.resolve().then(() => {
          this.template?.querySelector(".pilgrim-flow__body")?.focus();
        });
      }
    }
  }

  syncActiveStates() {
    this._steps.forEach((s) => {
      s.setActive(s.uid === this._activeUid);
    });
  }

  emitFlowDataChange() {
    this.dispatchEvent(
      new CustomEvent("pilgrimdatachange", {
        detail: { flowData: { ...this._flowData } }
      })
    );
  }
}
