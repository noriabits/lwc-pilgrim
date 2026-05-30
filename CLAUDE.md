# Pilgrim Flow LWC Framework

A reusable, pilgrim-flow framework built in **vanilla LWC**. Implementors compose multi-step wizards declaratively; the framework owns navigation, progress indication, validation gating, and conditional steps.

## Project structure

```
force-app/main/default/lwc/
├── pilgrimFlow/            # Container/engine  (isExposed: true)
├── pilgrimStep/            # Step wrapper       (isExposed: false)
└── pilgrimFlowDemo/        # Working example    (isExposed: true)
```

Salesforce DX project.
Run tests with `npm run test:unit`.
Lint with `npm run lint`.
Format with `npm run prettier`.

---

## Architecture

Two components follow the `lightning-tabset` / `lightning-tab` parent–child registration pattern.

### `c-pilgrim-step` — step wrapper

Thin wrapper the implementor places around each screen's content. Registers itself with the parent flow via a bubbling `pilgrimstepregister` event on `connectedCallback`. Content is rendered via `<slot>` and hidden with `slds-hide` (never unmounted) so step state survives navigation.

**Public `@api` props:**

| Prop     | Type    | Default | Description                                                                        |
| -------- | ------- | ------- | ---------------------------------------------------------------------------------- |
| `label`  | String  | —       | Text shown in the progress indicator.                                              |
| `name`   | String  | —       | Stable key for navigation and `stepchange` events.                                 |
| `valid`  | Boolean | `true`  | When `false`, blocks Next/Done on this step.                                       |
| `hidden` | Boolean | `false` | When `true`, step is skipped in navigation and absent from the progress indicator. |
| `active` | Boolean | `false` | Read-only in practice; set by the flow via `setActive()` callback.                 |

**Internal events dispatched** (bubbles + composed — consumed by `c-pilgrim-flow`, not the host):

| Event                   | When                                                 |
| ----------------------- | ---------------------------------------------------- |
| `pilgrimstepregister`   | `connectedCallback` — detail: `{ step, setActive }`  |
| `pilgrimstepunregister` | `disconnectedCallback` — detail: `{ step }`          |
| `pilgrimstepvalidity`   | `valid` setter changes — detail: `{ step, valid }`   |
| `pilgrimstepvisibility` | `hidden` setter changes — detail: `{ step, hidden }` |

> **Note on unregister:** events dispatched during `disconnectedCallback` don't bubble to ancestors (element already removed from DOM). For v1 static-slot usage this is irrelevant; dynamic step removal is a v2 concern.

---

### `c-pilgrim-flow` — container / engine

Owns the ordered step registry, active index, shared `flowData` context, and renders the navigation footer + optional progress indicator.

**Public `@api` props:**

| Prop            | Type            | Default  | Description                                                                  |
| --------------- | --------------- | -------- | ---------------------------------------------------------------------------- |
| `show-progress` | Boolean         | `false`  | Renders `lightning-progress-indicator` above the step body.                  |
| `progress-type` | String          | `'base'` | `'base'` or `'path'` — maps to `lightning-progress-indicator type`.          |
| `back-label`    | String          | `'Back'` | Label for the Back button.                                                   |
| `next-label`    | String          | `'Next'` | Label for the Next button.                                                   |
| `done-label`    | String          | `'Done'` | Label for the Done button (shown on last visible step).                      |
| `data`          | Object          | `{}`     | Seeds the shared context (`flowData`).                                       |
| `flowData`      | Object (getter) | —        | Read-only snapshot of current shared context. Returns a plain `{ ...copy }`. |

**Events emitted to the host:**

| Event               | Detail                      | When                                                             |
| ------------------- | --------------------------- | ---------------------------------------------------------------- |
| `stepchange`        | `{ name, index, flowData }` | User navigates to a new step.                                    |
| `pilgrimdatachange` | `{ flowData }`              | A descendant wrote to the shared context via `pilgrimdatawrite`. |
| `complete`          | `{ flowData }`              | User clicks Done on the last visible valid step.                 |

**Navigation rules:**

- Back/Next/Done operate over `visibleSteps` (steps where `hidden !== true`).
- Next and Done are `disabled` while `activeStep.valid === false`.
- If the active step becomes `hidden`, the flow falls back to the first visible step.

---

## Shared context contract

Because step content is **slot-owned by the host** (not the flow), the flow cannot push props directly into inner forms. The contract is:

### Writing into the context (descendant → flow)

Fire a bubbling `pilgrimdatawrite` event from any descendant. The flow merges and re-emits `pilgrimdatachange` to the host.

```js
// single key/value
this.dispatchEvent(
  new CustomEvent("pilgrimdatawrite", {
    bubbles: true,
    composed: true,
    detail: { key: "accountId", value: "ACC-001" }
  })
);

// or patch multiple keys at once
this.dispatchEvent(
  new CustomEvent("pilgrimdatawrite", {
    bubbles: true,
    composed: true,
    detail: { patch: { accountId: "ACC-001", tier: "gold" } }
  })
);
```

> **Important:** the outbound notification from the flow is `pilgrimdatachange` (not `pilgrimdatawrite`). Using the same name for both caused an infinite event loop — keep them distinct.

### Reading the context (host → step)

The host owns its own `@track data` object. It listens for `onpilgrimdatachange` from the flow to stay in sync, and passes values down to slotted forms as attributes. The flow's `flowData` getter also exposes a plain-object snapshot at any time.

### Validity gating (host → step)

The host computes a validity getter and binds it to the step's `valid` prop:

```html
<c-pilgrim-step name="contact" valid="{contactValid}"></c-pilgrim-step>
```

When `valid` is `false` the Next/Done button is disabled.

---

## Usage example

```html
<!-- myFlow.html -->
<template>
  <c-pilgrim-flow
    show-progress
    progress-type="base"
    done-label="Submit"
    onstepchange="{handleStepChange}"
    onpilgrimdatachange="{handleFlowDataChange}"
    oncomplete="{handleComplete}"
  >
    <c-pilgrim-step label="Contact" name="contact" valid="{contactValid}">
      <lightning-input
        label="Name"
        value="{data.name}"
        data-key="name"
        onchange="{handleField}"
        required
      >
      </lightning-input>
    </c-pilgrim-step>

    <c-pilgrim-step
      label="Billing"
      name="billing"
      hidden="{skipBilling}"
      valid="{billingValid}"
    >
      <lightning-combobox
        label="Account"
        value="{data.accountId}"
        options="{accountOptions}"
        data-key="accountId"
        onchange="{handleField}"
      >
      </lightning-combobox>
    </c-pilgrim-step>

    <c-pilgrim-step label="Review" name="review">
      <p>{data.name}</p>
    </c-pilgrim-step>
  </c-pilgrim-flow>
</template>
```

```js
// myFlow.js
import { LightningElement, track } from "lwc";

export default class MyFlow extends LightningElement {
  @track data = { name: "", accountId: "", needsBilling: false };

  get skipBilling() {
    return !this.data.needsBilling;
  }
  get contactValid() {
    return Boolean(this.data.name);
  }
  get billingValid() {
    return this.skipBilling || Boolean(this.data.accountId);
  }

  handleField(e) {
    const key = e.target.dataset.key;
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    this.data = { ...this.data, [key]: value };
  }

  handleStepChange(e) {
    /* e.detail = { name, index, flowData } */
  }
  handleFlowDataChange(e) {
    this.data = { ...this.data, ...e.detail.flowData };
  }
  handleComplete(e) {
    /* e.detail.flowData — submit to Apex, navigate, etc. */
  }
}
```

The working demo is `pilgrimFlowDemo` (Contact → conditional Billing → Review), deployable to any Lightning App Page, Record Page, or Home Page.

---

## Testing

Test files live in `__tests__/` inside each component folder and use `@salesforce/sfdx-lwc-jest`.

**Run tests:**

```bash
npm run test:unit
```

**Known jest quirk:** When a test assertion fails and the received/expected value is an LWC element proxy, Jest's `deepCyclicCopyReplaceable` recurses infinitely and OOMs. Workaround: never use `expect(lwcElement).toEqual(...)` or `expect(lwcElement).toBe(...)` directly — compare primitive properties instead (e.g. `expect(detail.step.name).toBe('one')`). Also use `element.className` (string) instead of `element.classList` (DOMTokenList) for class assertions.

Tests for `pilgrimStep` also cover an event-bubbling edge case: `pilgrimstepunregister` events dispatched from `disconnectedCallback` don't bubble to `document.body` (element is already removed from DOM). Listen on the element itself in tests.

---

## Deploy to org

```bash
sf project deploy start \
  -d force-app/main/default/lwc/pilgrimFlow \
  -d force-app/main/default/lwc/pilgrimStep \
  -d force-app/main/default/lwc/pilgrimFlowDemo
```

Then open Lightning App Builder and drop **Pilgrim Flow Demo** onto a page.

## Local dev preview (no deploy needed)

```bash
sf lightning dev component --name pilgrimFlowDemo -o <org-alias>
```

First run prompts to enable Local Dev in the org (one-time). Supports hot reload for HTML, CSS, and JS changes.

---

## Design decisions

| Decision            | Choice                                                  | Rationale                                                              |
| ------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| Step authoring      | Slots (declarative)                                     | Simplest, IDE autocomplete, no runtime dynamic import complexity.      |
| Data sharing        | Host-owned `@track data` + `pilgrimdatawrite` events up | Flow can't push props into slotted content; host owns the data object. |
| Validation gating   | `valid` prop on step, computed by host                  | Host has full context to compute validity; step is just a dumb gate.   |
| Persistence on Done | Not in framework — host handles via `oncomplete`        | Keeps the framework server-agnostic and reusable outside Salesforce.   |
| Step show/hide      | `slds-hide` CSS (content stays in DOM)                  | Step state (form inputs, scroll position) survives navigation.         |

## Not in v1 (deferred)

- Dynamic, config-driven steps via `lwc:is` — step contract is intentionally clean for this future addition.
- Server persistence on Done — host handles via the `complete` event.
- Cancel button — add `show-cancel` prop + `cancel` event.
- Step-level error messages when Next is blocked (currently only button is disabled).
