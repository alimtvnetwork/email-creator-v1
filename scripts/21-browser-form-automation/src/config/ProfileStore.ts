// Multi-profile persistence on top of localStorage. The single-config
// ConfigStore stays as the live working copy; ProfileStore manages named
// snapshots so the operator can switch between setups (e.g. staging vs prod).
import type { AutomationConfig } from "./types";
import { DEFAULT_CONFIG } from "./defaults";

const PROFILES_KEY = "xp21.profiles.v1";
const ACTIVE_KEY   = "xp21.activeProfile.v1";
const DEFAULT_NAME = "default";

interface ProfileMap { [name: string]: AutomationConfig; }

export class ProfileStore {
  /** List all known profile names, sorted alphabetically. */
  list(): string[] {
    return Object.keys(this.readMap()).sort();
  }

  /** Currently selected profile name (defaults to "default"). */
  active(): string {
    return this.safeRead(ACTIVE_KEY) || DEFAULT_NAME;
  }

  /** Save the given config under `name` and mark it active. */
  save(name: string, config: AutomationConfig): void {
    const trimmed = this.requireName(name);
    const map = this.readMap();
    map[trimmed] = structuredClone(config);
    this.writeMap(map);
    this.setActive(trimmed);
  }

  /** Load a named profile, falling back to defaults if missing. */
  load(name: string): AutomationConfig {
    const map = this.readMap();
    return map[name] ? structuredClone(map[name]) : structuredClone(DEFAULT_CONFIG);
  }

  /** Delete a named profile; the active pointer is cleared if it matched. */
  delete(name: string): void {
    const map = this.readMap();
    if (!(name in map)) return;
    delete map[name];
    this.writeMap(map);
    if (this.active() === name) this.setActive(DEFAULT_NAME);
  }

  /** Mark a profile name as the active one. */
  setActive(name: string): void {
    this.safeWrite(ACTIVE_KEY, this.requireName(name));
  }

  private readMap(): ProfileMap {
    const raw = this.safeRead(PROFILES_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw) as ProfileMap; }
    catch { return {}; }
  }

  private writeMap(map: ProfileMap): void {
    this.safeWrite(PROFILES_KEY, JSON.stringify(map));
  }

  private requireName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Profile name is required");
    return trimmed;
  }

  private safeRead(key: string): string | null {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }

  private safeWrite(key: string, value: string): void {
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
  }
}
