import { LightningElement, api, track } from "lwc";

/**
 * @class PilgrimFlow
 * @extends LightningElement
 *
 * @classdesc
 * A reusable, pilgrim flow. Implementors compose a wizard by
 * nesting `c-pilgrim-step` children (each holding their own content) and the
 * flow handles navigation (Back / Next / Done), an optional progress indicator,
 * per-step validation gating, and conditional (skippable) steps.
 *
 * The flow owns a shared context object (`flowData`). Descendants report changes
 * up via a bubbling `pilgrimdatawrite` event; the flow merges and re-emits it.
 */
export default class PilgrimFlow extends LightningElement {
  // --- public configuration ---
  @api showProgress = false;
  @api progressType = "base"; // 'base' | 'path'
  @api backLabel = "Back";
  @api nextLabel = "Next";
  @api doneLabel = "Done";

  /** Seeds the shared context. */
  @api
  get data() {
    return this._flowData;
  }
  set data(value) {
    this._flowData = value ? { ...value } : {};
  }

  /** Read access to the current shared context snapshot (plain object). */
  @api
  get flowData() {
    return { ...this._flowData };
  }

  @track _flowData = {};

  // ordered registry of every registered step (visible or not)
  _steps = [];
  _stepSeq = 0;

  // identity (uid) of the currently active step
  @track _activeUid;

  // reactive bump so getters recompute when the registry/visibility changes
  @track _version = 0;

  connectedCallback() {
    this.addEventListener(
      "pilgrimstepregister",
      this.handleStepRegister.bind(this)
    );
    this.addEventListener(
      "pilgrimstepunregister",
      this.handleStepUnregister.bind(this)
    );
    this.addEventListener(
      "pilgrimstepvalidity",
      this.handleStepValidity.bind(this)
    );
    this.addEventListener(
      "pilgrimstepvisibility",
      this.handleStepVisibility.bind(this)
    );
    this.addEventListener(
      "pilgrimdatawrite",
      this.handleFlowDataChange.bind(this)
    );
  }

  // --- registry handling ---

  handleStepRegister(event) {
    event.stopPropagation();
    const { step, setActive } = event.detail;
    step.uid = `step-${this._stepSeq++}`;
    step.setActive = setActive;
    this._steps = [...this._steps, step];
    if (!this._activeUid) {
      this.activateStep(this.firstVisibleStep);
    } else {
      this.syncActiveStates();
    }
    this.bump();
  }

  handleStepUnregister(event) {
    event.stopPropagation();
    const { step } = event.detail;
    const wasActive = step.uid === this._activeUid;
    this._steps = this._steps.filter((s) => s.uid !== step.uid);
    if (wasActive) {
      this.activateStep(this.firstVisibleStep);
    }
    this.bump();
  }

  handleStepValidity() {
    this.bump();
  }

  handleStepVisibility() {
    // If the active step just became hidden, fall back to the first visible one.
    const active = this.activeStep;
    if (!active || active.hidden) {
      this.activateStep(this.firstVisibleStep);
    } else {
      this.syncActiveStates();
    }
    this.bump();
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
    // eslint-disable-next-line no-unused-expressions
    this._version; // reactive dependency
    return this._steps.filter((s) => !s.hidden);
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

  get isFirst() {
    return this.activeIndex <= 0;
  }

  get isLast() {
    return this.activeIndex === this.visibleSteps.length - 1;
  }

  get activeStepValid() {
    const active = this.activeStep;
    return !active || active.valid !== false;
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

  get showDone() {
    return this.isLast && this.visibleSteps.length > 0;
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
    }
  }

  syncActiveStates() {
    this._steps.forEach((s) => {
      if (typeof s.setActive === "function") {
        s.setActive(s.uid === this._activeUid);
      } else {
        s.active = s.uid === this._activeUid;
      }
    });
  }

  emitFlowDataChange() {
    this.dispatchEvent(
      new CustomEvent("pilgrimdatachange", {
        detail: { flowData: { ...this._flowData } }
      })
    );
  }

  bump() {
    this._version++;
  }
}
