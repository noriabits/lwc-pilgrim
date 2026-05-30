import { createElement } from "lwc";
import PilgrimFlow from "c/pilgrimFlow";
import PilgrimStep from "c/pilgrimStep";

function makeStep(props = {}) {
  const step = createElement("c-pilgrim-step", { is: PilgrimStep });
  Object.assign(step, props);
  return step;
}

function buildFlow(stepDefs, flowProps = {}) {
  const flow = createElement("c-pilgrim-flow", { is: PilgrimFlow });
  Object.assign(flow, flowProps);
  const steps = stepDefs.map(makeStep);
  steps.forEach((s) => flow.appendChild(s));
  document.body.appendChild(flow);
  return { flow, steps };
}

function flush() {
  return Promise.resolve();
}

function button(flow, selector) {
  return flow.shadowRoot.querySelector(selector);
}

describe("c-pilgrim-flow", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("activates the first step and shows Next but not Back/Done", async () => {
    const { flow, steps } = buildFlow([
      { label: "A", name: "a" },
      { label: "B", name: "b" },
      { label: "C", name: "c" }
    ]);
    await flush();

    expect(steps[0].active).toBe(true);
    expect(steps[1].active).toBe(false);
    expect(button(flow, ".pilgrim-flow__next")).not.toBeNull();
    expect(button(flow, ".pilgrim-flow__back")).toBeNull();
    expect(button(flow, ".pilgrim-flow__done")).toBeNull();
  });

  it("navigates forward and backward over visible steps", async () => {
    const { flow, steps } = buildFlow([
      { label: "A", name: "a" },
      { label: "B", name: "b" },
      { label: "C", name: "c" }
    ]);
    await flush();

    button(flow, ".pilgrim-flow__next").click();
    await flush();
    expect(steps[1].active).toBe(true);
    expect(button(flow, ".pilgrim-flow__back")).not.toBeNull();

    button(flow, ".pilgrim-flow__next").click();
    await flush();
    expect(steps[2].active).toBe(true);
    expect(button(flow, ".pilgrim-flow__next")).toBeNull();
    expect(button(flow, ".pilgrim-flow__done")).not.toBeNull();

    button(flow, ".pilgrim-flow__back").click();
    await flush();
    expect(steps[1].active).toBe(true);
  });

  it("skips a hidden step during navigation", async () => {
    const { flow, steps } = buildFlow([
      { label: "A", name: "a" },
      { label: "B", name: "b", hidden: true },
      { label: "C", name: "c" }
    ]);
    await flush();

    button(flow, ".pilgrim-flow__next").click();
    await flush();

    expect(steps[1].active).toBe(false);
    expect(steps[2].active).toBe(true);
    expect(button(flow, ".pilgrim-flow__done")).not.toBeNull();
  });

  it("disables Next while the active step is invalid", async () => {
    const { flow, steps } = buildFlow([
      { label: "A", name: "a", valid: false },
      { label: "B", name: "b" }
    ]);
    await flush();

    const next = button(flow, ".pilgrim-flow__next");
    expect(next.disabled).toBe(true);

    steps[0].valid = true;
    await flush();
    expect(button(flow, ".pilgrim-flow__next").disabled).toBe(false);
  });

  it("fires complete with the flow data on Done", async () => {
    const { flow } = buildFlow([{ label: "A", name: "a" }], {
      data: { foo: "bar" }
    });
    await flush();

    const handler = jest.fn();
    flow.addEventListener("complete", handler);
    button(flow, ".pilgrim-flow__done").click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.flowData).toEqual({ foo: "bar" });
  });

  it("merges pilgrimdatawrite events into the shared context", async () => {
    const { flow, steps } = buildFlow([{ label: "A", name: "a" }]);
    await flush();

    steps[0].dispatchEvent(
      new CustomEvent("pilgrimdatawrite", {
        bubbles: true,
        composed: true,
        detail: { key: "color", value: "red" }
      })
    );
    await flush();

    expect(flow.flowData).toEqual({ color: "red" });
  });

  it("renders a progress indicator only when showProgress is set", async () => {
    const { flow } = buildFlow(
      [
        { label: "A", name: "a" },
        { label: "B", name: "b" }
      ],
      { showProgress: true }
    );
    await flush();

    expect(
      flow.shadowRoot.querySelector("lightning-progress-indicator")
    ).not.toBeNull();
  });
});
