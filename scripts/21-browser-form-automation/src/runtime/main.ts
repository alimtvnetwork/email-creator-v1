// Entry point bundled as an IIFE. Wires the modules together and mounts the UI.
import { ConfigStore } from "../config/store";
import { ProfileStore } from "../config/ProfileStore";
import { ConfigFileIO } from "../config/ConfigFileIO";
import { Logger } from "../core/Logger";
import { DelayController } from "../core/DelayController";
import { ReactInputSetter } from "../core/ReactInputSetter";
import { StepRunner } from "../core/StepRunner";
import { SequenceOrchestrator } from "../core/SequenceOrchestrator";
import { CycleLedger } from "../core/CycleLedger";
import { CsvExporter } from "../core/CsvExporter";
import { RetryPolicy } from "../core/RetryPolicy";
import { XPathResolver } from "../xpath/resolver";
import { HotkeyController } from "../core/HotkeyController";
import { Panel } from "../ui/Panel";

declare global { interface Window { __xp21Mounted?: boolean; } }

function bootstrap(): void {
  if (window.__xp21Mounted) { console.warn("[xp21] already mounted"); return; }
  window.__xp21Mounted = true;

  const store = new ConfigStore();
  const profiles = new ProfileStore();
  const fileIO = new ConfigFileIO();
  // Live config: prefer the named active profile if it exists, else the
  // legacy single-slot store, else defaults (handled inside ConfigStore).
  const activeName = profiles.active();
  const profileNames = profiles.list();
  const config = profileNames.includes(activeName)
    ? profiles.load(activeName)
    : store.load();
  const logger = new Logger();

  const resolver = new XPathResolver();
  resolver.attachLogger((scope, msg, level) =>
    level === "warn" ? logger.warn(scope, msg) : logger.info(scope, msg));

  const setter = new ReactInputSetter();
  const delays = new DelayController(config.delays);
  const retry = new RetryPolicy(() => config.delays, logger);
  const runner = new StepRunner(() => config.xpaths, resolver, setter, delays, logger, retry);
  const ledger = new CycleLedger();
  const csv = new CsvExporter();
  const orchestrator = new SequenceOrchestrator(() => config, runner, logger, ledger);

  new Panel({ config, store, profiles, fileIO, logger, orchestrator, delays, ledger, csv }).mount();
  const host = document.getElementById("xp21-host");
  if (host) new HotkeyController(logger).attach(host);
  logger.info("boot", "Panel mounted (active profile: " + activeName + ")");
}

bootstrap();
