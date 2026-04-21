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
  retryAttempts: number;     // total attempts incl. the first; 1 = no retry
  retryBackoffMs: number;    // base backoff; doubled each subsequent attempt
}

export interface RuntimeConfig {
  mode: RunMode;
  reactAware: boolean;
  dryRun: boolean;            // when true: resolve + highlight only, no clicks/fills
}

export interface AutomationConfig {
  sequence: SequenceConfig;
  xpaths: XPathConfig;
  delays: DelayConfig;
  runtime: RuntimeConfig;
}
