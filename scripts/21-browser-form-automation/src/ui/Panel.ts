// Floating control panel rendered into a Shadow DOM. Reads/writes the live
// AutomationConfig and exposes Start/Stop/Next/Reset buttons.
import type { AutomationConfig, RunMode } from "../config/types";
import { ConfigStore } from "../config/store";
import { Logger, type LogLine } from "../core/Logger";
import { SequenceOrchestrator } from "../core/SequenceOrchestrator";
import { EmailSequenceGenerator } from "../core/EmailSequenceGenerator";
import { DelayController } from "../core/DelayController";
import { PANEL_CSS } from "./styles";
import { el } from "./dom";

interface PanelDeps {
  config: AutomationConfig;
  store: ConfigStore;
  logger: Logger;
  orchestrator: SequenceOrchestrator;
  delays: DelayController;
}

export class Panel {
  private root!: ShadowRoot;
  private logEl!: HTMLDivElement;
  private previewEl!: HTMLDivElement;
  private nextBtn!: HTMLButtonElement;

  constructor(private readonly deps: PanelDeps) {}

  /** Mount the panel into the page; safe to call once per session. */
  mount(): void {
    const host = el("div", { id: "xp21-host" });
    document.documentElement.appendChild(host);
    this.root = host.attachShadow({ mode: "open" });
    this.root.appendChild(el("style", {}, [PANEL_CSS]));
    this.root.appendChild(this.buildRoot());
    this.deps.logger.subscribe((line) => this.appendLog(line));
    this.deps.logger.snapshot().forEach((line) => this.appendLog(line));
    this.refreshPreview();
  }

  private buildRoot(): HTMLElement {
    return el("div", { class: "root" }, [
      this.buildHeader(),
      el("div", { class: "body" }, [
        this.buildSequenceSection(),
        this.buildXPathSection(),
        this.buildDelaySection(),
        this.buildRuntimeSection(),
        this.buildControls(),
        this.buildLog(),
      ]),
    ]);
  }

  private buildHeader(): HTMLElement {
    const close = el("button", { title: "Close" }, ["×"]);
    close.addEventListener("click", () => (this.root.host as HTMLElement).remove());
    const header = el("div", { class: "header" }, [
      el("h1", {}, ["Form Automation · #21"]),
      el("div", { class: "actions" }, [close]),
    ]);
    this.enableDrag(header);
    return header;
  }

  private buildSequenceSection(): HTMLElement {
    const s = this.deps.config.sequence;
    const fs = el("fieldset", {}, [el("legend", {}, ["Sequence"])]);
    fs.appendChild(this.textField("Pattern (use $$$ as placeholder)", s.pattern,
      (v) => { s.pattern = v; this.afterEdit(); }));
    fs.appendChild(this.textField("Domain", s.domain,
      (v) => { s.domain = v; this.afterEdit(); }));
    const grid = el("div", { class: "row-3" }, [
      this.numberField("Padding", s.padding, (n) => { s.padding = n; this.afterEdit(); }),
      this.numberField("Start", s.rangeStart, (n) => { s.rangeStart = n; this.afterEdit(); }),
      this.numberField("End", s.rangeEnd, (n) => { s.rangeEnd = n; this.afterEdit(); }),
    ]);
    fs.appendChild(grid);
    this.previewEl = el("div", { class: "preview" });
    fs.appendChild(this.previewEl);
    return fs;
  }

  private buildXPathSection(): HTMLElement {
    const x = this.deps.config.xpaths;
    return el("fieldset", {}, [
      el("legend", {}, ["XPaths"]),
      this.areaField("Email field", x.emailField, (v) => { x.emailField = v; this.persist(); }),
      this.areaField("Password generate button", x.passwordGenerate, (v) => { x.passwordGenerate = v; this.persist(); }),
      this.areaField("Create button", x.createButton, (v) => { x.createButton = v; this.persist(); }),
    ]);
  }

  private buildDelaySection(): HTMLElement {
    const d = this.deps.config.delays;
    const onChange = () => { this.deps.delays.update(d); this.persist(); };
    return el("fieldset", {}, [
      el("legend", {}, ["Delays (ms)"]),
      el("div", { class: "row-3" }, [
        this.numberField("Between steps", d.betweenStepsMs, (n) => { d.betweenStepsMs = n; onChange(); }),
        this.numberField("Post-create min", d.postCreateMinMs, (n) => { d.postCreateMinMs = n; onChange(); }),
        this.numberField("Post-create max", d.postCreateMaxMs, (n) => { d.postCreateMaxMs = n; onChange(); }),
      ]),
    ]);
  }

  private buildRuntimeSection(): HTMLElement {
    const r = this.deps.config.runtime;
    const select = el("select", {}, [
      this.option("auto", "Auto loop", r.mode),
      this.option("manual", "Manual step", r.mode),
    ]);
    select.addEventListener("change", () => {
      r.mode = (select as HTMLSelectElement).value as RunMode;
      this.nextBtn.disabled = r.mode !== "manual";
      this.persist();
    });
    const modeLabel = el("label", {}, ["Run mode", select]);
    return el("fieldset", {}, [el("legend", {}, ["Runtime"]), modeLabel]);
  }

  private buildControls(): HTMLElement {
    const start = el("button", { class: "btn primary" }, ["Start"]);
    const stop  = el("button", { class: "btn danger" }, ["Stop"]);
    this.nextBtn = el("button", { class: "btn" }, ["Next"]) as HTMLButtonElement;
    this.nextBtn.disabled = this.deps.config.runtime.mode !== "manual";
    const reset = el("button", { class: "btn" }, ["Reset"]);
    start.addEventListener("click", () => void this.deps.orchestrator.start());
    stop.addEventListener("click", () => this.deps.orchestrator.stop());
    this.nextBtn.addEventListener("click", () => void this.deps.orchestrator.next());
    reset.addEventListener("click", () => this.deps.orchestrator.reset());
    return el("div", { class: "controls" }, [start, stop, this.nextBtn, reset]);
  }

  private buildLog(): HTMLElement {
    this.logEl = el("div", { class: "log" });
    return this.logEl;
  }

  private textField(label: string, value: string, onInput: (v: string) => void): HTMLElement {
    const input = el("input", { type: "text", value }) as HTMLInputElement;
    input.addEventListener("input", () => onInput(input.value));
    return el("label", {}, [label, input]);
  }

  private areaField(label: string, value: string, onInput: (v: string) => void): HTMLElement {
    const area = el("textarea", { rows: 2 }) as HTMLTextAreaElement;
    area.value = value;
    area.addEventListener("input", () => onInput(area.value));
    return el("label", {}, [label, area]);
  }

  private numberField(label: string, value: number, onInput: (n: number) => void): HTMLElement {
    const input = el("input", { type: "number", value: String(value) }) as HTMLInputElement;
    input.addEventListener("input", () => {
      const parsed = Number(input.value);
      if (Number.isFinite(parsed)) onInput(parsed);
    });
    return el("label", {}, [label, input]);
  }

  private option(value: string, label: string, current: string): HTMLOptionElement {
    const opt = el("option", { value }) as HTMLOptionElement;
    opt.textContent = label;
    if (value === current) opt.selected = true;
    return opt;
  }

  private afterEdit(): void {
    this.persist();
    this.refreshPreview();
  }

  private refreshPreview(): void {
    try {
      const gen = new EmailSequenceGenerator(this.deps.config.sequence);
      const list = gen.generate();
      const sample = list.length <= 2 ? list.join(", ")
        : list[0] + " … " + list[list.length - 1] + " (" + list.length + " total)";
      this.previewEl.textContent = sample;
    } catch (err) {
      this.previewEl.textContent = "⚠ " + (err as Error).message;
    }
  }

  private persist(): void { this.deps.store.save(this.deps.config); }

  private appendLog(line: LogLine): void {
    const time = new Date(line.ts).toLocaleTimeString();
    const row = el("div", { class: line.level }, [
      el("span", { class: "ts" }, [time]),
      "[" + line.scope + "] " + line.msg,
    ]);
    this.logEl.insertBefore(row, this.logEl.firstChild);
  }

  private enableDrag(handle: HTMLElement): void {
    let startX = 0, startY = 0, originLeft = 0, originTop = 0, dragging = false;
    handle.addEventListener("mousedown", (ev) => {
      const host = this.root.host as HTMLElement;
      const rect = host.getBoundingClientRect();
      dragging = true; startX = ev.clientX; startY = ev.clientY;
      originLeft = rect.left; originTop = rect.top;
      host.style.right = "auto";
      ev.preventDefault();
    });
    window.addEventListener("mousemove", (ev) => {
      if (!dragging) return;
      const host = this.root.host as HTMLElement;
      host.style.left = (originLeft + ev.clientX - startX) + "px";
      host.style.top  = (originTop  + ev.clientY - startY) + "px";
    });
    window.addEventListener("mouseup", () => { dragging = false; });
  }
}
