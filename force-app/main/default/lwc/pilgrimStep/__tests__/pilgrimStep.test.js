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

  it("dispatches a register event with a POJO descriptor on connect", () => {
    const element = createStep({ label: "One", name: "one" });
    const handler = jest.fn();
    document.body.addEventListener("pilgrimstepregister", handler);

    document.body.appendChild(element);

    expect(handler).toHaveBeenCalledTimes(1);
    const { detail } = handler.mock.calls[0][0];
    expect(detail.step).toEqual({
      uid: null,
      name: "one",
      label: "One",
      valid: true,
      skip: false
    });
    expect(typeof detail.setActive).toBe("function");
  });

  it("hides content when inactive and shows it when active via setActive callback", () => {
    const element = createStep({ name: "one" });
    const handler = jest.fn();
    document.body.addEventListener("pilgrimstepregister", handler);
    document.body.appendChild(element);

    const container = element.shadowRoot.querySelector("div");
    expect(container.className).toContain("slds-hide");

    const { setActive } = handler.mock.calls[0][0].detail;
    setActive(true);
    return Promise.resolve().then(() => {
      expect(container.className).not.toContain("slds-hide");
    });
  });

  it("hides content when inactive and shows it when active via @api setter", () => {
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

  it("emits a visibility event when skip changes", () => {
    const element = createStep({ name: "one" });
    document.body.appendChild(element);

    const handler = jest.fn();
    document.body.addEventListener("pilgrimstepvisibility", handler);
    element.skip = true;

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.skip).toBe(true);
  });

  it("does not emit validity/visibility events before connectedCallback", () => {
    const element = createStep({ name: "one" });
    const validHandler = jest.fn();
    const visibilityHandler = jest.fn();
    document.body.addEventListener("pilgrimstepvalidity", validHandler);
    document.body.addEventListener("pilgrimstepvisibility", visibilityHandler);

    element.valid = false;
    element.skip = true;

    expect(validHandler).not.toHaveBeenCalled();
    expect(visibilityHandler).not.toHaveBeenCalled();
  });

  it("dispatches an unregister event on disconnect", () => {
    const element = createStep({ name: "one" });
    document.body.appendChild(element);

    // Listen on the element itself: events dispatched during disconnectedCallback
    // don't bubble to ancestors (element is already removed from DOM).
    const handler = jest.fn();
    element.addEventListener("pilgrimstepunregister", handler);
    document.body.removeChild(element);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
