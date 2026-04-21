// Entry point bundled as an IIFE. Wires the modules together and mounts the UI.
import { ConfigStore } from "../config/store";
import { ProfileStore } from "../config/ProfileStore";
import { ConfigFileIO } from "../config/ConfigFileIO";
import { Logger } from "../core/Logger";
import { DelayController } from "../core/DelayController";
import { ReactInputSetter } from "../core/ReactInputSetter";
import { StepRunner } from "../core/StepRunner";
import { SequenceOrchestrator } from "../core/SequenceOrchestrator";
import { XPathResolver } from "../xpath/resolver";
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
  const runner = new StepRunner(() => config.xpaths, resolver, setter, delays, logger);
  const orchestrator = new SequenceOrchestrator(() => config, runner, logger);

  new Panel({ config, store, profiles, fileIO, logger, orchestrator, delays }).mount();
  logger.info("boot", "Panel mounted (active profile: " + activeName + ")");
}

bootstrap();
