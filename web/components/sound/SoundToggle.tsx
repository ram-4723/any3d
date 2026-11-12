"use client";

import { useEffect, useState } from "react";
import { getSoundManager } from "./SoundManager";

/**
 * Speaker button for the object viewer control bar.
 *
 * Drop it next to the existing Labels / Photos / zoom buttons inside
 * `.viewer-controls`. It reuses the live site classes `viewer-action` and
 * `viewer-icon` so it inherits the dark gold control styling. Tailwind
 * classes are included as a fallback if those CSS classes are not in scope.
 *
 * Default: muted (no surprise audio). First click unmutes and persists
 * the preference in localStorage (`any3d-sound-muted`).
 */
export function SoundToggle({ className = "" }: { className?: string }) {
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sm = getSoundManager();
    sm.attachGestureUnlock();
    const sync = () => {
      setMuted(sm.isMuted);
      setReady(true);
    };
    sync();
    const off = sm.on("muted-change", sync);
    return off;
  }, []);

  return (
    <button
      type="button"
      className={[
        "viewer-action viewer-icon sound-toggle",
        "inline-flex items-center justify-center rounded-[7px]",
        "border border-white/20 bg-[#101915]/90 text-[#eef1ea]",
        "min-h-[34px] w-[34px] p-0 font-mono text-lg",
        "transition-colors hover:text-[#d8c290] hover:border-[#c5aa70]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed6c91]",
        muted ? "" : "viewer-action-active text-[#f0d89f] bg-[#26352c] border-[#d8c290]",
        className,
      ].join(" ")}
      aria-label={muted ? "Unmute object sounds" : "Mute object sounds"}
      aria-pressed={!muted}
      title={muted ? "Sound is off — click to enable" : "Sound is on — click to mute"}
      data-state={muted ? "muted" : "on"}
      onClick={() => {
        const sm = getSoundManager();
        sm.unlock();
        setMuted(sm.toggleMuted());
        if (!sm.isMuted) sm.startAmbient();
      }}
    >
      <SpeakerIcon muted={muted} />
      <span className="sr-only">{ready && muted ? "Enable sound" : "Mute sound"}</span>
    </button>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="block"
    >
      <path
        d="M2.5 6.2h2.1L7.8 3.6v8.8L4.6 9.8H2.5V6.2Z"
        fill="currentColor"
      />
      {muted ? (
        <path
          d="M9.2 6.1 14 11m0-4.9-4.8 4.9"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M9.3 6.2c.7.6 1.1 1.5 1.1 2.4s-.4 1.8-1.1 2.4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M11.2 4.6c1.2 1 1.9 2.5 1.9 4s-.7 3-1.9 4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export default SoundToggle;
