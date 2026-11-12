/**
 * Generic, slug-keyed sound manager for 3D Anything.
 *
 * Load a kit from /sounds/<slug>/sounds.json (or pass a base path).
 * Preloads audio only after the first user gesture (autoplay policy).
 * Mute preference is persisted in localStorage (default: muted until
 * the user turns the speaker on).
 *
 * No overlap spam: label sounds debounce and cut themselves if retriggered.
 * Ambient loops at a low volume while the object page is open and unmuted.
 */
export type SoundTrigger = "label-open" | "hover" | "intro" | "ambient" | "ui";

export interface SoundCredit {
  title: string;
  author: string;
  licence: string;
  licence_url: string;
  source_url: string;
  usedFor?: string;
}

export interface LabelSound {
  label: string;
  file: string;
  volume: number;
  trigger: "label-open" | "hover";
  caption: string;
}

export interface KitSoundSpec {
  file: string;
  volume: number;
  loop?: boolean;
  trigger?: string;
  caption?: string;
}

export interface SoundKitConfig {
  slug: string;
  version?: number;
  basePath?: string;
  masterVolume?: number;
  storageKey?: string;
  labels: LabelSound[];
  ambient?: KitSoundSpec;
  ui?: KitSoundSpec;
  credits?: SoundCredit[];
}

export type SoundEvent = "muted-change" | "unlocked" | "kit-loaded";

type Listener = () => void;

const DEFAULT_STORAGE_KEY = "any3d-sound-muted";
const DEBOUNCE_MS = 380;
function extSupported(ext: ".ogg" | ".mp3"): boolean {
  if (typeof Audio === "undefined") return ext === ".mp3";
  const a = document.createElement("audio");
  if (ext === ".ogg") {
    return !!a.canPlayType("audio/ogg; codecs=vorbis");
  }
  return !!a.canPlayType("audio/mpeg");
}

function preferredExt(): ".ogg" | ".mp3" {
  return extSupported(".ogg") ? ".ogg" : ".mp3";
}

export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private sources = new Map<string, AudioBufferSourceNode>();
  private gains = new Map<string, GainNode>();
  private lastPlayed = new Map<string, number>();
  private kit: SoundKitConfig | null = null;
  private basePath = "";
  private ext: ".ogg" | ".mp3" = ".mp3";
  private unlocked = false;
  private muted = true;
  private loadPromise: Promise<void> | null = null;
  private listeners = new Map<SoundEvent, Set<Listener>>();
  private storageKey = DEFAULT_STORAGE_KEY;
  private gestureBound = false;
  private volume = 1;

  constructor() {
    this.muted = this.readMuted();
    this.ext = preferredExt();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  get currentKit(): SoundKitConfig | null {
    return this.kit;
  }

  on(event: SoundEvent, fn: Listener): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  private emit(event: SoundEvent): void {
    this.listeners.get(event)?.forEach((fn) => fn());
  }

  private readMuted(): boolean {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw === null) return true; // default muted until the user enables sound
      return raw === "1" || raw === "true";
    } catch {
      return true;
    }
  }

  private writeMuted(muted: boolean): void {
    try {
      localStorage.setItem(this.storageKey, muted ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
  }

  /** Call once from a top-level effect. Safe to call many times. */
  attachGestureUnlock(target: Window | Document | HTMLElement = window): void {
    if (this.gestureBound) return;
    this.gestureBound = true;
    const unlock = () => {
      this.unlock();
    };
    target.addEventListener("pointerdown", unlock, { passive: true });
    target.addEventListener("keydown", unlock);
    target.addEventListener("touchstart", unlock, { passive: true });
  }

  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    if (!this.unlocked) {
      this.unlocked = true;
      this.emit("unlocked");
      if (this.kit && this.buffers.size === 0) {
        void this.preload(this.kit);
      }
    }
  }

  setMuted(muted: boolean): void {
    this.unlock();
    this.muted = muted;
    this.writeMuted(muted);
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : this.volume, now, 0.04);
    }
    if (muted) {
      this.stopAmbient();
    } else if (this.kit?.ambient) {
      this.startAmbient();
    }
    this.emit("muted-change");
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  async load(slugOrConfig: string | SoundKitConfig, basePath?: string): Promise<void> {
    const config =
      typeof slugOrConfig === "string"
        ? await this.fetchConfig(slugOrConfig, basePath)
        : slugOrConfig;
    this.kit = config;
    this.storageKey = config.storageKey || DEFAULT_STORAGE_KEY;
    this.muted = this.readMuted();
    this.volume = config.masterVolume ?? 1;
    this.basePath = (config.basePath || `/sounds/${config.slug}`).replace(/\/$/, "");
    if (this.master) {
      this.master.gain.value = this.muted ? 0 : this.volume;
    }
    this.emit("muted-change");
    if (this.unlocked) {
      await this.preload(config);
    }
  }

  private async fetchConfig(slug: string, basePath?: string): Promise<SoundKitConfig> {
    const root = (basePath || `/sounds/${slug}`).replace(/\/$/, "");
    const res = await fetch(`${root}/sounds.json`);
    if (!res.ok) {
      throw new Error(`Sound kit not found for slug "${slug}" (${res.status})`);
    }
    const data = (await res.json()) as SoundKitConfig;
    if (!data.basePath) data.basePath = root;
    if (!data.slug) data.slug = slug;
    return data;
  }

  private async preload(config: SoundKitConfig): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.preloadInner(config);
    try {
      await this.loadPromise;
    } finally {
      /* keep promise so we don't refetch on every play */
    }
  }

  private async preloadInner(config: SoundKitConfig): Promise<void> {
    this.unlock();
    const files = new Set<string>();
    for (const label of config.labels) files.add(label.file);
    if (config.ambient?.file) files.add(config.ambient.file);
    if (config.ui?.file) files.add(config.ui.file);
    await Promise.all([...files].map((file) => this.loadBuffer(file)));
    this.emit("kit-loaded");
  }

  private urlFor(file: string, ext: ".ogg" | ".mp3" = this.ext): string {
    const clean = file.replace(/\.(ogg|mp3|wav)$/i, "");
    return `${this.basePath}/${clean}${ext}`;
  }

  private async loadBuffer(file: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(file)) return this.buffers.get(file)!;
    this.unlock();
    if (!this.ctx) return null;
    const order: Array<".ogg" | ".mp3"> =
      this.ext === ".ogg" ? [".ogg", ".mp3"] : [".mp3", ".ogg"];
    let lastErr: unknown = null;
    for (const ext of order) {
      try {
        const res = await fetch(this.urlFor(file, ext));
        if (!res.ok) continue;
        const arr = await res.arrayBuffer();
        const buf = await this.ctx.decodeAudioData(arr.slice(0));
        this.buffers.set(file, buf);
        return buf;
      } catch (err) {
        lastErr = err;
      }
    }
    console.warn(`[SoundManager] could not decode ${file}`, lastErr);
    return null;
  }

  private playFile(
    file: string,
    opts: { volume?: number; loop?: boolean; id?: string; debounce?: boolean } = {},
  ): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx || !this.master) return;
    const id = opts.id || file;
    if (opts.debounce !== false) {
      const last = this.lastPlayed.get(id) ?? 0;
      if (performance.now() - last < DEBOUNCE_MS) return;
    }
    this.lastPlayed.set(id, performance.now());

    const start = (buf: AudioBuffer) => {
      if (!this.ctx || !this.master || this.muted) return;
      this.stopId(id, 0.03);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = !!opts.loop;
      const gain = this.ctx.createGain();
      gain.gain.value = opts.volume ?? 1;
      src.connect(gain);
      gain.connect(this.master);
      src.start(0);
      this.sources.set(id, src);
      this.gains.set(id, gain);
      src.onended = () => {
        if (this.sources.get(id) === src) {
          this.sources.delete(id);
          this.gains.delete(id);
        }
      };
    };

    const existing = this.buffers.get(file);
    if (existing) {
      start(existing);
      return;
    }
    void this.loadBuffer(file).then((buf) => {
      if (buf) start(buf);
    });
  }

  private stopId(id: string, fade = 0.05): void {
    const src = this.sources.get(id);
    const gain = this.gains.get(id);
    if (!src) return;
    try {
      if (gain && this.ctx) {
        const now = this.ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fade);
        src.stop(now + fade + 0.01);
      } else {
        src.stop();
      }
    } catch {
      /* already stopped */
    }
    this.sources.delete(id);
    this.gains.delete(id);
  }

  /** Play the sound mapped to a label id (e.g. on hotspot / label-card open). */
  playLabel(labelId: string): void {
    const spec = this.kit?.labels.find((l) => l.label === labelId);
    if (!spec) return;
    this.playFile(spec.file, {
      volume: spec.volume,
      id: `label:${labelId}`,
      debounce: true,
    });
  }

  playUiTick(): void {
    const spec = this.kit?.ui;
    if (!spec) return;
    this.playFile(spec.file, {
      volume: spec.volume,
      id: "ui-tick",
      debounce: true,
    });
  }

  /**
   * Play the engine start with the intro reveal. Only sounds if the user
   * has already unmuted (and a user gesture has unlocked the context).
   */
  playIntroEngine(): void {
    const spec = this.kit?.labels.find((l) => l.label === "engine");
    if (!spec) return;
    this.playFile(spec.file, {
      volume: spec.volume,
      id: "intro-engine",
      debounce: false,
    });
  }

  startAmbient(): void {
    const spec = this.kit?.ambient;
    if (!spec || this.muted) return;
    if (this.sources.has("ambient")) return;
    this.playFile(spec.file, {
      volume: spec.volume,
      loop: true,
      id: "ambient",
      debounce: false,
    });
  }

  stopAmbient(): void {
    this.stopId("ambient", 0.2);
  }

  /** Stop everything and drop buffers. Call when leaving the object page. */
  dispose(): void {
    for (const id of [...this.sources.keys()]) this.stopId(id, 0.05);
    this.buffers.clear();
    this.loadPromise = null;
    this.kit = null;
  }
}

/** Shared singleton so the toggle, intro, and label hooks stay in sync. */
let shared: SoundManager | null = null;

export function getSoundManager(): SoundManager {
  if (!shared) shared = new SoundManager();
  return shared;
}
