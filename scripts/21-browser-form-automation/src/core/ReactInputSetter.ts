// Sets the value of a React-controlled <input> by invoking the native
// setter and dispatching the events React listens for.

export class ReactInputSetter {
  /** Assign a value through React's tracked setter and notify listeners. */
  setValue(el: Element, value: string): void {
    if (!this.isInput(el)) throw new Error("Target is not an <input> or <textarea>");
    const proto = Object.getPrototypeOf(el);
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    const setter = descriptor && descriptor.set;
    if (!setter) throw new Error("No native value setter on element prototype");
    setter.call(el, value);
    this.fire(el, "input");
    this.fire(el, "change");
  }

  /** Trigger a focus + blur cycle to flush React onBlur validations. */
  blur(el: Element): void {
    if (this.isFocusable(el)) (el as HTMLElement).blur();
  }

  private isInput(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  }

  private isFocusable(el: Element): el is HTMLElement {
    return el instanceof HTMLElement;
  }

  private fire(el: Element, type: "input" | "change"): void {
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }
}
