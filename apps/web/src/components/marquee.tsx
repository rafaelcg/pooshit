import { useEffect, useRef } from "react";

const TAPE_PHRASE =
  "★ PUSH IT · SHIP IT · NPX POOSHIT · REAL GOOD · ONE COMMAND · LIVE IN 60 SEC ·";

export function Marquee() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const template = track.querySelector<HTMLElement>("[data-tape-set]");
    if (!template) {
      return;
    }

    const phrase = template.cloneNode(true) as HTMLElement;
    const minWidth = Math.max(window.innerWidth * 2, 2400);

    track.replaceChildren();
    track.appendChild(phrase);

    while (track.scrollWidth < minWidth) {
      track.appendChild(phrase.cloneNode(true));
    }

    const halfCount = track.children.length;
    for (let i = 0; i < halfCount; i++) {
      track.appendChild(track.children[i].cloneNode(true));
    }

    track.style.setProperty(
      "--tape-duration",
      `${Math.max(18, track.scrollWidth / 160)}s`,
    );
  }, []);

  return (
    <div className="top-tape">
      <div className="tape-viewport" aria-hidden="true">
        <div className="tape-track" ref={trackRef}>
          <div className="tape-set" data-tape-set>
            <span>{TAPE_PHRASE}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
