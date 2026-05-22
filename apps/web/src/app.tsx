import { useEffect, useState, type ReactNode } from "react";
import { BackgroundScene } from "./components/background-scene";
import { Marquee } from "./components/marquee";

interface Stats {
  totalDeploys: number;
  liveDeploys: number;
}

function Equalizer() {
  return (
    <div className="eq" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function CopyCommandButton() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText("npx pooshit");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="copy-cmd" type="button" onClick={handleCopy}>
      {copied ? "COPIED ✓" : "npx pooshit"}
    </button>
  );
}

function BoomboxTerminal() {
  return (
    <div className="boombox">
      <div className="bb-speakers">
        <div className="speaker" />
        <div className="bb-screen">
          <div className="bb-label">▶ NOW DEPLOYING</div>
          <div className="bb-line">
            <span className="t-d">$ </span>
            <span className="t-p">npx pooshit</span>
          </div>
          <div className="bb-line t-d">◐ packing…</div>
          <div className="bb-line t-d">◑ uploading 6.7mb…</div>
          <div className="bb-line t-d">◒ building…</div>
          <div className="bb-line t-o">
            → <span className="t-u">f4k9x2.pooshit.dev</span>
          </div>
          <div className="bb-line t-d">⏱ 24h · pooshit. real good.</div>
        </div>
        <div className="speaker" />
      </div>
    </div>
  );
}

interface PricingTrackProps {
  side: string;
  title: string;
  cadence: string;
  price: string;
  features: string[];
  note: ReactNode;
  pro?: boolean;
}

function PricingTrack({
  side,
  title,
  cadence,
  price,
  features,
  note,
  pro,
}: PricingTrackProps) {
  return (
    <div className={pro ? "track pro" : "track"}>
      <div className="side">{side}</div>
      <div className="track-head">
        <div>
          <h3>{title}</h3>
          <div className="cadence">{cadence}</div>
        </div>
        <div className="price">{price}</div>
      </div>
      <ul>
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <p className="note">{note}</p>
    </div>
  );
}

export function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const githubUrl =
    import.meta.env.VITE_GITHUB_URL ?? "https://github.com/rafaelcg/pooshit";

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
      return;
    }

    fetch(`${apiUrl}/v1/stats`)
      .then((response) => response.json())
      .then(setStats)
      .catch(() => undefined);
  }, []);

  return (
    <>
      <BackgroundScene />

      <div className="page-wrap">
        <Marquee />

        <main className="hero-main">
          <div>
            <div className="push-badge">★ PUSH IT ★</div>
            <h1 className="hero-title">pooshit</h1>
            <p className="hero-subtitle">real good.</p>
            <p className="hero-tagline">
              Zero-config hosting from your terminal. One command, public URL in ~60
              seconds. No signup, no dashboard — just pooshit, real good.
            </p>
            <div className="cmd-wrap">
              <CopyCommandButton />
              <Equalizer />
              {stats && (
                <span className="stats-pill">
                  {stats.totalDeploys.toLocaleString()} deploys · {stats.liveDeploys}{" "}
                  live
                </span>
              )}
            </div>
          </div>

          <div>
            <BoomboxTerminal />
          </div>
        </main>

        <section className="album">
          <p className="album-head">◆ pick your tape ◆</p>
          <div className="album-inner">
            <PricingTrack
              side="SIDE A"
              title="free"
              cadence="forever free · no card"
              price="$0"
              features={[
                "50 MB projects",
                "Live for 24 hours",
                "Random *.pooshit.dev subdomain",
                "No signup needed",
                "3 projects at a time",
              ]}
              note='Perfect for demos, side projects, and "wait it actually works?" moments.'
            />
            <PricingTrack
              pro
              side="SIDE B"
              title="pro"
              cadence="per month · cancel anytime"
              price="$9.99"
              features={[
                "500 MB projects",
                "Stays live forever",
                "Pick your subdomain",
                "Custom domain support",
                "10 concurrent projects",
              ]}
              note={
                <>
                  Run <span style={{ color: "var(--cyan)" }}>npx pooshit upgrade</span>{" "}
                  when you&apos;re ready to commit. Pro billing coming soon.
                </>
              }
            />
          </div>
        </section>

        <footer className="page-footer">
          SHIPPED WITH POOSHIT · 1986 CALLED · IT WANTS ITS GRID BACK ·{" "}
          <a href="/docs">DOCS</a>
          {" · "}
          <a href={githubUrl} target="_blank" rel="noreferrer">
            GITHUB
          </a>
          {" · "}
          <a href="/terms">TERMS</a>
          {" · "}
          <a href="/privacy">PRIVACY</a>
        </footer>
      </div>
    </>
  );
}
