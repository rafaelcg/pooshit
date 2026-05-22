export function PrivacyPage() {
  return (
    <article className="legal-page">
      <header className="legal-header">
        <a href="/">← pooshit</a>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: May 21, 2026</p>
      </header>

      <section>
        <h2>What we collect</h2>
        <p>When you run <code>npx pooshit</code>, we may store:</p>
        <ul>
          <li>A hashed version of your IP address (for rate limits and abuse prevention)</li>
          <li>Deploy metadata: slug, URL, upload size, stack type, expiry time</li>
          <li>Your project files, temporarily, while we deploy them to hosting infrastructure</li>
        </ul>
        <p>We do not require an account on the free tier.</p>
      </section>

      <section>
        <h2>What we do not collect</h2>
        <ul>
          <li>We do not sell personal data</li>
          <li>We do not use third-party ad trackers on the CLI</li>
          <li>We do not store raw IP addresses in deploy records (only a one-way hash)</li>
        </ul>
      </section>

      <section>
        <h2>Retention</h2>
        <p>
          Free deploys expire after 24 hours. Uploaded tarballs are deleted after
          processing. Deploy records may remain in our database after expiry for
          operational and abuse-prevention purposes.
        </p>
      </section>

      <section>
        <h2>Third parties</h2>
        <p>
          User apps run on Pooshit infrastructure. The landing site is hosted on
          Cloudflare Pages. Those providers process traffic to deployed URLs under
          their own policies.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Privacy questions:{" "}
          <a href="https://github.com/rafaelcg/pooshit" target="_blank" rel="noreferrer">
            GitHub issues
          </a>
          .
        </p>
      </section>

      <footer className="legal-footer">
        <a href="/terms">Terms of Service</a>
      </footer>
    </article>
  );
}
