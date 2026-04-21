// Floating control panel rendered into a Shadow DOM. Reads/writes the live
// AutomationConfig and exposes Start/Stop/Next/Reset + profile management.
import type { AutomationConfig, RunMode } from "../config/types";
import { ConfigStore } from "../config/store";
import { ProfileStore } from "../config/ProfileStore";
import { ConfigFileIO } from "../config/ConfigFileIO";
import { DEFAULT_CONFIG } from "../config/defaults";
import { Logger, type LogLine } from "../core/Logger";
import { SequenceOrchestrator } from "../core/SequenceOrchestrator";
import { EmailSequenceGenerator } from "../core/EmailSequenceGenerator";
import { DelayController } from "../core/DelayController";
import { CycleLedger, type CycleRecord } from "../core/CycleLedger";
import { CsvExporter } from "../core/CsvExporter";
import { XPathValidator } from "../core/XPathValidator";
import { StepEventLog, type StepEvent } from "../core/StepEventLog";
import { JsonLogExporter } from "../core/JsonLogExporter";
import { PANEL_CSS } from "./styles";
import { ToastHost } from "./ToastHost";
import { el } from "./dom";

interface PanelDeps {
  config: AutomationConfig;
  store: ConfigStore;
  profiles: ProfileStore;
  fileIO: ConfigFileIO;
  logger: Logger;
  orchestrator: SequenceOrchestrator;
  delays: DelayController;
  ledger: CycleLedger;
  csv: CsvExporter;
  validator: XPathValidator;
  events: StepEventLog;
  jsonExporter: JsonLogExporter;
}

export class Panel {
  private root!: ShadowRoot;
  private logEl!: HTMLDivElement;
  private previewEl!: HTMLDivElement;
  private nextBtn!: HTMLButtonElement;
  private startBtn!: HTMLButtonElement;
  private pauseBtn!: HTMLButtonElement;
  private profileSelect!: HTMLSelectElement;
  private resultsCountEl!: HTMLSpanElement;
  private progressEl!: HTMLSpanElement;
  private eventCountEl!: HTMLSpanElement;
  private toast!: ToastHost;
  private unsubscribeLedger?: () => void;
  private unsubscribeProgress?: () => void;
  private unsubscribeEvents?: () => void;

  constructor(private readonly deps: PanelDeps) {}

  /** Mount the panel into the page; safe to call once per session. */
  mount(): void {
    const host = el("div", { id: "xp21-host" });
    document.documentElement.appendChild(host);
    this.root = host.attachShadow({ mode: "open" });
    this.root.appendChild(el("style", {}, [PANEL_CSS]));
    this.root.appendChild(this.buildRoot());
    this.toast = new ToastHost(this.root);
    this.deps.logger.subscribe((line) => this.appendLog(line));
    this.deps.logger.snapshot().forEach((line) => this.appendLog(line));
    this.unsubscribeLedger?.();
    this.unsubscribeLedger = this.deps.ledger.subscribe((records) => this.refreshResults(records));
    this.unsubscribeProgress?.();
    this.unsubscribeProgress = this.deps.orchestrator.subscribe((p) => this.refreshProgress(p));
    this.refreshResults(this.deps.ledger.snapshot());
    this.refreshPreview();
  }

  private buildRoot(): HTMLElement {
    return el("div", { class: "root" }, [
      this.buildHeader(),
      el("div", { class: "body" }, [
        this.buildProfileSection(),
        this.buildSequenceSection(),
        this.buildXPathSection(),
        this.buildDelaySection(),
        this.buildRuntimeSection(),
        this.buildControls(),
        this.buildResultsSection(),
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
    const validateAll = el("button", { class: "btn" }, ["Validate all"]) as HTMLButtonElement;
    const fields = [
      this.xpathField("Email field",              "emailField",       x.emailField,
        (v) => { x.emailField = v; this.persist(); }),
      this.xpathField("Password generate button", "passwordGenerate", x.passwordGenerate,
        (v) => { x.passwordGenerate = v; this.persist(); }),
      this.xpathField("Create button",            "createButton",     x.createButton,
        (v) => { x.createButton = v; this.persist(); }),
    ];
    validateAll.addEventListener("click", () => fields.forEach((f) => f.validate()));
    return el("fieldset", {}, [
      el("legend", {}, ["XPaths"]),
      ...fields.map((f) => f.node),
      el("div", { class: "profile-actions" }, [validateAll]),
    ]);
  }

  private xpathField(
    label: string,
    name: string,
    value: string,
    onInput: (v: string) => void,
  ): { node: HTMLElement; validate: () => void } {
    const area = el("textarea", { rows: 2 }) as HTMLTextAreaElement;
    area.value = value;
    area.addEventListener("input", () => { onInput(area.value); status.textContent = ""; status.className = "xpath-status"; });
    const status = el("span", { class: "xpath-status" }) as HTMLSpanElement;
    const btn = el("button", { class: "btn xpath-validate" }, ["Validate"]) as HTMLButtonElement;
    const validate = () => this.runValidation(name, area.value, status);
    btn.addEventListener("click", validate);
    const node = el("label", {}, [
      label,
      area,
      el("div", { class: "xpath-row" }, [btn, status]),
    ]);
    return { node, validate };
  }

  private runValidation(name: string, xpath: string, status: HTMLSpanElement): void {
    const result = this.deps.validator.validate(xpath);
    status.textContent = result.message;
    status.className = "xpath-status " + (result.ok ? "ok" : "fail");
    this.deps.logger.info("validate", name + ": " + result.message);
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
      el("div", { class: "row" }, [
        this.numberField("Retry attempts", d.retryAttempts, (n) => { d.retryAttempts = n; onChange(); }),
        this.numberField("Retry backoff", d.retryBackoffMs, (n) => { d.retryBackoffMs = n; onChange(); }),
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
    const dryInput = el("input", { type: "checkbox" }) as HTMLInputElement;
    dryInput.checked = !!r.dryRun;
    dryInput.addEventListener("change", () => { r.dryRun = dryInput.checked; this.persist(); });
    const dryLabel = el("label", { class: "checkbox-row" }, [dryInput, "Dry-run (resolve + highlight only)"]);
    return el("fieldset", {}, [el("legend", {}, ["Runtime"]), modeLabel, dryLabel]);
  }

  private buildProfileSection(): HTMLElement {
    this.profileSelect = el("select", {}) as HTMLSelectElement;
    this.populateProfileOptions();
    this.profileSelect.addEventListener("change", () => this.handleProfileSwitch());
    const row = el("div", { class: "profile-row" }, [
      el("label", {}, ["Profile", this.profileSelect]),
    ]);
    return el("fieldset", {}, [
      el("legend", {}, ["Profiles"]),
      row,
      this.buildProfileActions(),
    ]);
  }

  private buildProfileActions(): HTMLElement {
    const save    = this.actionButton("Save",    () => this.handleSaveCurrent());
    const saveAs  = this.actionButton("Save As…", () => this.handleSaveAs());
    const del     = this.actionButton("Delete",  () => this.handleDelete());
    const reset   = this.actionButton("Defaults",() => this.handleResetDefaults());
    const exp     = this.actionButton("Export",  () => this.handleExport());
    const imp     = this.actionButton("Import",  () => void this.handleImport());
    return el("div", { class: "profile-actions" }, [save, saveAs, del, reset, exp, imp]);
  }

  private actionButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = el("button", { class: "btn" }, [label]) as HTMLButtonElement;
    btn.addEventListener("click", onClick);
    return btn;
  }

  private populateProfileOptions(): void {
    this.profileSelect.replaceChildren();
    const active = this.deps.profiles.active();
    const names = this.deps.profiles.list();
    if (!names.includes(active)) names.unshift(active);
    for (const name of names) {
      this.profileSelect.appendChild(this.option(name, name, active));
    }
  }

  private handleProfileSwitch(): void {
    const name = this.profileSelect.value;
    const next = this.deps.profiles.load(name);
    this.deps.profiles.setActive(name);
    this.applyConfig(next);
    this.toast.show('Loaded profile "' + name + '"', "info");
  }

  private handleSaveCurrent(): void {
    const name = this.deps.profiles.active();
    this.deps.profiles.save(name, this.deps.config);
    this.toast.show('Saved "' + name + '"', "success");
  }

  private handleSaveAs(): void {
    const name = window.prompt("Save profile as:", this.deps.profiles.active());
    if (!name) return;
    try {
      this.deps.profiles.save(name.trim(), this.deps.config);
      this.populateProfileOptions();
      this.profileSelect.value = name.trim();
      this.toast.show('Saved "' + name.trim() + '"', "success");
    } catch (err) {
      this.toast.show((err as Error).message, "error");
    }
  }

  private handleDelete(): void {
    const name = this.profileSelect.value;
    if (!window.confirm('Delete profile "' + name + '"?')) return;
    this.deps.profiles.delete(name);
    this.populateProfileOptions();
    this.toast.show('Deleted "' + name + '"', "info");
  }

  private handleResetDefaults(): void {
    if (!window.confirm("Reset current settings to defaults?")) return;
    this.applyConfig(structuredClone(DEFAULT_CONFIG));
    this.toast.show("Reset to defaults", "info");
  }

  private handleExport(): void {
    const name = this.deps.profiles.active() || "config";
    this.deps.fileIO.exportToFile(this.deps.config, "xp21-" + name + ".json");
    this.toast.show("Exported JSON", "success");
  }

  private async handleImport(): Promise<void> {
    try {
      const imported = await this.deps.fileIO.importFromFile();
      this.applyConfig(imported);
      this.toast.show("Imported JSON", "success");
    } catch (err) {
      this.toast.show((err as Error).message, "error");
    }
  }

  /** Replace the live config in-place and re-render the body. */
  private applyConfig(next: AutomationConfig): void {
    Object.assign(this.deps.config.sequence, next.sequence);
    Object.assign(this.deps.config.xpaths,   next.xpaths);
    Object.assign(this.deps.config.delays,   next.delays);
    Object.assign(this.deps.config.runtime,  next.runtime);
    this.deps.delays.update(this.deps.config.delays);
    this.persist();
    this.rerenderBody();
  }

  private rerenderBody(): void {
    const body = this.root.querySelector(".body");
    if (!body) return;
    body.replaceChildren(
      this.buildProfileSection(),
      this.buildSequenceSection(),
      this.buildXPathSection(),
      this.buildDelaySection(),
      this.buildRuntimeSection(),
      this.buildControls(),
      this.buildResultsSection(),
      this.buildLog(),
    );
    this.deps.logger.snapshot().forEach((line) => this.appendLog(line));
    this.refreshResults(this.deps.ledger.snapshot());
    this.refreshPreview();
  }

  private buildControls(): HTMLElement {
    this.startBtn = el("button", { class: "btn primary" }, ["Start"]) as HTMLButtonElement;
    this.pauseBtn = el("button", { class: "btn" }, ["Pause"]) as HTMLButtonElement;
    const stop  = el("button", { class: "btn danger" }, ["Stop"]);
    this.nextBtn = el("button", { class: "btn" }, ["Next"]) as HTMLButtonElement;
    this.nextBtn.disabled = this.deps.config.runtime.mode !== "manual";
    const reset = el("button", { class: "btn" }, ["Reset"]);
    this.startBtn.addEventListener("click", () => void this.deps.orchestrator.start());
    this.pauseBtn.addEventListener("click", () => this.handlePauseToggle());
    stop.addEventListener("click", () => this.deps.orchestrator.stop());
    this.nextBtn.addEventListener("click", () => void this.deps.orchestrator.next());
    reset.addEventListener("click", () => this.deps.orchestrator.reset());
    this.progressEl = el("span", { class: "progress" }, ["0 / 0 · idle"]);
    return el("div", { class: "controls-wrap" }, [
      el("div", { class: "controls" }, [this.startBtn, this.pauseBtn, stop, this.nextBtn, reset]),
      this.progressEl,
    ]);
  }

  private handlePauseToggle(): void {
    const snap = this.deps.orchestrator.snapshot();
    if (snap.state === "paused") void this.deps.orchestrator.resume();
    else this.deps.orchestrator.pause();
  }

  private refreshProgress(p: { cursor: number; total: number; state: string }): void {
    if (!this.progressEl) return;
    this.progressEl.textContent = p.cursor + " / " + p.total + " · " + p.state;
    if (this.startBtn) {
      this.startBtn.textContent = p.state === "paused" ? "Resume" : "Start";
      this.startBtn.disabled = p.state === "running" || p.state === "pausing";
    }
    if (this.pauseBtn) {
      const canPause = p.state === "running";
      const canResume = p.state === "paused";
      this.pauseBtn.disabled = !(canPause || canResume);
      this.pauseBtn.textContent = canResume ? "Resume" : "Pause";
    }
  }

  private buildResultsSection(): HTMLElement {
    this.resultsCountEl = el("span", { class: "results-count" }, ["0 cycles recorded"]);
    const exportBtn = el("button", { class: "btn" }, ["Download CSV"]);
    const clearBtn  = el("button", { class: "btn" }, ["Clear"]);
    exportBtn.addEventListener("click", () => this.handleExportCsv());
    clearBtn.addEventListener("click",  () => this.handleClearResults());
    return el("fieldset", {}, [
      el("legend", {}, ["Results"]),
      this.resultsCountEl,
      el("div", { class: "profile-actions" }, [exportBtn, clearBtn]),
    ]);
  }

  private handleExportCsv(): void {
    const records = this.deps.ledger.snapshot();
    if (records.length === 0) { this.toast.show("No records to export", "info"); return; }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.deps.csv.download(records, "xp21-results-" + stamp + ".csv");
    this.toast.show("Exported " + records.length + " rows", "success");
  }

  private handleClearResults(): void {
    if (!window.confirm("Clear recorded results?")) return;
    this.deps.ledger.clear();
    this.toast.show("Results cleared", "info");
  }

  private refreshResults(records: ReadonlyArray<CycleRecord>): void {
    if (!this.resultsCountEl) return;
    const ok = records.filter((r) => r.status === "success").length;
    const fail = records.length - ok;
    this.resultsCountEl.textContent =
      records.length + " cycles · " + ok + " ok · " + fail + " failed";
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

  // areaField removed: XPath fields now use xpathField (with Validate button).

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
