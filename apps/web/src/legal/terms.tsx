export function TermsPage() {
  return (
    <article className="legal-page">
      <header className="legal-header">
        <a href="/">← pooshit</a>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: May 21, 2026</p>
      </header>

      <section>
        <h2>What Pooshit is</h2>
        <p>
          Pooshit is a free-tier hosting service. You upload a project from your
          terminal; we deploy it to shared infrastructure and give you a temporary
          public URL.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>You agree not to upload content that is illegal, malicious, or abusive, including:</p>
        <ul>
          <li>Malware, crypto miners, or phishing pages</li>
          <li>Copyright-infringing material you do not have rights to host</li>
          <li>Content that violates applicable law</li>
        </ul>
        <p>
          We may remove deploys and block IPs without notice if we detect abuse or
          security risk.
        </p>
      </section>

      <section>
        <h2>Free tier</h2>
        <p>
          Free deploys are limited in size, duration (24 hours), and rate. There is no
          uptime guarantee. Deploys may be deleted when they expire or when we need to
          reclaim resources.
        </p>
      </section>

      <section>
        <h2>Disclaimer</h2>
        <p>
          Pooshit is provided &ldquo;as is&rdquo; without warranties. We are not liable
          for data loss, downtime, or damages arising from use of the service.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions:{" "}
          <a href="https://github.com/rafaelcg/pooshit" target="_blank" rel="noreferrer">
            GitHub issues
          </a>
          .
        </p>
      </section>

      <footer className="legal-footer">
        <a href="/privacy">Privacy Policy</a>
      </footer>
    </article>
  );
}
