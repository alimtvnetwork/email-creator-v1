// Shared configuration types. The single AutomationConfig object is the
// only source of truth consumed by every other module.

export type RunMode = "auto" | "manual";

export interface SequenceConfig {
  pattern: string;       // contains the literal placeholder PLACEHOLDER_TOKEN
  padding: number;       // zero-pad width of the numeric segment
  domain: string;        // appended after "@"
  rangeStart: number;    // inclusive
  rangeEnd: number;      // inclusive
}

export interface XPathConfig {
  emailField: string;
  passwordGenerate: string;
  createButton: string;
}

export interface DelayConfig {
  betweenStepsMs: number;
  postCreateMinMs: number;
  postCreateMaxMs: number;
}

export interface RuntimeConfig {
  mode: RunMode;
  reactAware: boolean;
}

export interface AutomationConfig {
  sequence: SequenceConfig;
  xpaths: XPathConfig;
  delays: DelayConfig;
  runtime: RuntimeConfig;
}
