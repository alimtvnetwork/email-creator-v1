// Default configuration values. The XPaths come from the operator brief.
// Edit here only to change initial UI values; runtime edits live in localStorage.
import type { AutomationConfig } from "./types";

export const PLACEHOLDER_TOKEN = "$$$";
export const STORAGE_KEY = "xp21.config.v1";
export const LOG_MAX_LINES = 200;

export const DEFAULT_CONFIG: AutomationConfig = {
  sequence: {
    pattern: "loveable.engineer.v" + PLACEHOLDER_TOKEN,
    padding: 3,
    domain: "gmail.com",
    rangeStart: 5,
    rangeEnd: 10,
  },
  xpaths: {
    emailField:
      "/html/body/div[2]/div[2]/div/div/div/div[2]/section[2]/div/div[1]/form/div/div[2]/div[2]/div[2]/div[1]/div/input",
    passwordGenerate:
      "/html/body/div[2]/div[2]/div/div/div/div[2]/section[2]/div/div[1]/form/div/div[2]/div[5]/div/div[1]/span/span/span/button[2]",
    createButton:
      "/html/body/div[2]/div[2]/div/div/div/div[2]/section[2]/div/div[1]/form/div/div[3]/button[1]",
  },
  delays: {
    betweenStepsMs: 200,
    postCreateMinMs: 500,
    postCreateMaxMs: 700,
    retryAttempts: 3,
    retryBackoffMs: 250,
  },
  runtime: {
    mode: "auto",
    reactAware: true,
  },
};
