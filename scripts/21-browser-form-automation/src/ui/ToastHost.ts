// Minimal toast notifier rendered inside the panel's Shadow DOM root so it
// inherits the panel theme and never leaks into the host page.
import { el } from "./dom";

const TOAST_LIFETIME_MS = 2200;

export type ToastLevel = "success" | "error" | "info";

export class ToastHost {
  private container: HTMLDivElement;

  constructor(root: ShadowRoot) {
    this.container = el("div", { class: "toast-host" });
    root.appendChild(this.container);
  }

  /** Show a transient message; auto-dismisses after TOAST_LIFETIME_MS. */
  show(message: string, level: ToastLevel = "info"): void {
    const node = el("div", { class: "toast " + level }, [message]);
    this.container.appendChild(node);
    window.setTimeout(() => this.fade(node), TOAST_LIFETIME_MS);
  }

  private fade(node: HTMLElement): void {
    node.classList.add("leaving");
    window.setTimeout(() => node.remove(), 220);
  }
}
