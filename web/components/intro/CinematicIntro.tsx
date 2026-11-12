"use client";

import { useEffect, useRef, useState } from "react";
import { getSoundManager } from "../sound/SoundManager";
import "./cinematic-intro.css";

export interface CinematicIntroProps {
  slug: string;
  title: string;
  tagline?: string;
  kicker?: string;
  /** Poster URL. Prefer the pack poster already on the site, e.g. `/objects/<slug>/poster.webp`. */
  posterSrc: string;
  /** 0–1 load progress from the frame loader. */
  progress?: number;
  /** True once the coarse frame set (poster + every 8th frame) is ready. */
  ready?: boolean;
  /** Minimum time the intro stays up, in ms. */
  minDurationMs?: number;
  /** Auto-dismiss cap, in ms. */
  maxDurationMs?: number;
  /** Optional path to the grain PNG. Defaults to `/intro/film-grain.png`. */
  grainSrc?: string;
  /** Play the engine start when the intro begins to dismiss, if sound is on. */
  playRevealSound?: boolean;
  onFinished?: () => void;
}

type Phase = "playing" | "exiting" | "gone";

const DEFAULT_MIN = 1200;
const DEFAULT_MAX = 3500;
const EXIT_MS = 550;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/**
 * Full-bleed cinematic start shown over the object viewer canvas.
 * Generic and keyed by slug (poster / title / tagline / sound kit).
 *
 * Dismisses when the coarse frame set is ready AND min time has elapsed,
 * or at max time, or on click / tap / keypress. Respects reduced motion.
 */
export function CinematicIntro({
  slug,
  title,
  tagline,
  kicker = "01  /  OBJECT",
  posterSrc,
  progress = 0,
  ready = false,
  minDurationMs = DEFAULT_MIN,
  maxDurationMs = DEFAULT_MAX,
  grainSrc = "/intro/film-grain.png",
  playRevealSound = true,
  onFinished,
}: CinematicIntroProps) {
  const reduced = usePrefersReducedMotion();
  const min = reduced ? Math.min(700, minDurationMs) : minDurationMs;
  const max = reduced ? Math.min(1600, maxDurationMs) : maxDurationMs;
  const [phase, setPhase] = useState<Phase>("playing");
  const started = useRef(performance.now());
  const exiting = useRef(false);

  const finish = (withSound: boolean) => {
    if (exiting.current) return;
    exiting.current = true;
    if (withSound && playRevealSound) {
      const sm = getSoundManager();
      if (!sm.isMuted && sm.isUnlocked) {
        sm.playIntroEngine();
      }
    }
    setPhase("exiting");
    window.setTimeout(() => {
      setPhase("gone");
      onFinished?.();
    }, reduced ? 350 : EXIT_MS);
  };

  useEffect(() => {
    started.current = performance.now();
    exiting.current = false;
  }, [slug]);

  useEffect(() => {
    if (phase !== "playing") return;
    const tick = () => {
      const elapsed = performance.now() - started.current;
      if (elapsed >= max) {
        finish(true);
        return;
      }
      if (ready && elapsed >= min) {
        finish(true);
      }
    };
    const id = window.setInterval(tick, 80);
    tick();
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, phase, min, max]);

  useEffect(() => {
    if (phase !== "playing") return;
    const skip = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        const keys = ["Escape", "Enter", " ", "Spacebar"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
      }
      finish(true);
    };
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      className="ci-root"
      data-phase={phase}
      data-slug={slug}
      role="dialog"
      aria-label={`${title} loading`}
      onClick={() => finish(true)}
    >
      <div className="ci-bar ci-bar-top" />
      <div className="ci-stage">
        <img
          className="ci-poster"
          src={posterSrc}
          alt=""
          draggable={false}
        />
        <div className="ci-sweep" aria-hidden="true" />
        <div
          className="ci-grain"
          aria-hidden="true"
          style={{ backgroundImage: `url(${grainSrc})` }}
        />
        <div className="ci-vignette" aria-hidden="true" />
      </div>
      <div className="ci-bar ci-bar-bottom" />
      <div className="ci-copy">
        {kicker ? <div className="ci-kicker">{kicker}</div> : null}
        <h2 className="ci-title">{title}</h2>
        {tagline ? <p className="ci-tagline">{tagline}</p> : null}
        <div
          className="ci-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.max(0, Math.min(1, progress)) * 100)}
          style={{ ["--ci-progress" as string]: String(Math.max(0, Math.min(1, progress))) }}
        >
          <span />
        </div>
        <div className="ci-hint">Click or press Esc to enter</div>
      </div>
    </div>
  );
}

export default CinematicIntro;
