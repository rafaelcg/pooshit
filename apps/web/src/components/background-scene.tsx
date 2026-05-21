export function BackgroundScene() {
  return (
    <>
      <div className="sky" />
      <div className="horizon" />
      <div className="mountains" />
      <div className="grid-floor" />
      <div className="stars" aria-hidden="true">
        <span className="star" />
        <span className="star" />
        <span className="star" />
        <span className="star" />
        <span className="star" />
        <span className="star" />
      </div>
      <div className="shapes" aria-hidden="true">
        <div className="shape s1" />
        <div className="shape s2" />
        <div className="shape s3" />
        <div className="shape s4" />
        <div className="shape s5" />
        <div className="shape s6" />
        <div className="shape s7" />
        <div className="squiggle q1">
          <svg viewBox="0 0 100 24" aria-hidden="true">
            <path d="M2 12 Q 18 2, 34 12 T 66 12 T 98 12" />
          </svg>
        </div>
        <div className="squiggle q2">
          <svg viewBox="0 0 100 24" aria-hidden="true">
            <path d="M2 12 Q 18 22, 34 12 T 66 12 T 98 12" />
          </svg>
        </div>
      </div>
      <div className="vhs" />
      <div className="vhs-track" />
    </>
  );
}
