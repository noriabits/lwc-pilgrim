import { createElement } from "@lwc/engine-dom";
import PilgrimStep from "c/pilgrimStep";

function createStep(props = {}) {
  const element = createElement("c-pilgrim-step", { is: PilgrimStep });
  Object.assign(element, props);
  return element;
}

describe("c-pilgrim-step", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("dispatches a register event on connect", () => {
    const element = createStep({ label: "One", name: "one" });
    const handler = jest.fn();
    document.body.addEventListener("pilgrimstepregister", handler);

    document.body.appendChild(element);

    expect(handler).toHaveBeenCalledTimes(1);
    const { detail } = handler.mock.calls[0][0];
    // Compare name property (primitive) rather than the LWC proxy reference
    // to avoid jest's deepCyclicCopy OOMing on the circular LWC element.
    expect(detail.step.name).toBe("one");
    expect(typeof detail.setActive).toBe("function");
  });

  it("hides content when inactive and shows it when active", () => {
    const element = createStep({ name: "one" });
    document.body.appendChild(element);

    const container = element.shadowRoot.querySelector("div");
    expect(container.className).toContain("slds-hide");

    element.active = true;
    return Promise.resolve().then(() => {
      expect(container.className).not.toContain("slds-hide");
    });
  });

  it("emits a validity event when valid changes", () => {
    const element = createStep({ name: "one" });
    document.body.appendChild(element);

    const handler = jest.fn();
    document.body.addEventListener("pilgrimstepvalidity", handler);
    element.valid = false;

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.valid).toBe(false);
  });

  it("emits a visibility event when hidden changes", () => {
    const element = createStep({ name: "one" });
    document.body.appendChild(element);

    const handler = jest.fn();
    document.body.addEventListener("pilgrimstepvisibility", handler);
    element.hidden = true;

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.hidden).toBe(true);
  });

  it("dispatches an unregister event on disconnect", () => {
    const element = createStep({ name: "one" });
    document.body.appendChild(element);

    // Listen on the element itself: events dispatched during disconnectedCallback
    // don't bubble to ancestors (element is already removed), but they still fire
    // on the element (target phase).
    const handler = jest.fn();
    element.addEventListener("pilgrimstepunregister", handler);
    document.body.removeChild(element);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
