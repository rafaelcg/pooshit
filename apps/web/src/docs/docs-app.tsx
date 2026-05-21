import {
  ciExample,
  cliCommands,
  docSections,
  envVars,
  getCommandById,
  gitignoreExample,
  projectFileExample,
  type CliCommand,
} from "./content";
import { CommandPalette, useCommandPalette } from "./command-palette";
import "./docs.css";

function getDocsSlug(): string {
  const path = window.location.pathname.replace(/^\/docs\/?/, "");
  return path.replace(/\/$/, "");
}

function StatusBadge({ status }: { status: CliCommand["status"] }) {
  return (
    <span className={`docs-badge ${status === "available" ? "available" : "coming-soon"}`}>
      {status === "available" ? "Available" : "Coming soon"}
    </span>
  );
}

function CommandDetail({ command }: { command: CliCommand }) {
  return (
    <>
      <p className="docs-lead">{command.summary}</p>
      <StatusBadge status={command.status} />
      <h2>Usage</h2>
      <pre className="docs-code">{command.usage}</pre>
      <h2>Description</h2>
      <p>{command.description}</p>
      {command.options && command.options.length > 0 && (
        <>
          <h2>Options</h2>
          <div className="docs-table-wrap">
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Flag</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {command.options.map((option) => (
                  <tr key={option.flag}>
                    <td>
                      <code className="docs-inline-code">{option.flag}</code>
                    </td>
                    <td>{option.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {command.examples && command.examples.length > 0 && (
        <>
          <h2>Examples</h2>
          {command.examples.map((example) => (
            <pre key={example} className="docs-code">
              {example}
            </pre>
          ))}
        </>
      )}
      {command.notes && command.notes.length > 0 && (
        <>
          <h2>Notes</h2>
          <ul>
            {command.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function DocsPageContent({ slug }: { slug: string }) {
  if (slug.startsWith("commands/")) {
    const commandId = slug.replace("commands/", "");
    const command = getCommandById(commandId);
    if (!command) {
      return <NotFound />;
    }
    return (
      <>
        <h1>{command.name}</h1>
        <CommandDetail command={command} />
      </>
    );
  }

  switch (slug) {
    case "":
      return (
        <>
          <h1>Pooshit documentation</h1>
          <p className="docs-lead">
            Zero-config hosting from your terminal. One command, public URL in ~60
            seconds.
          </p>
          <h2>What is Pooshit?</h2>
          <p>
            Pooshit packages your project, detects the stack (static site, Node.js,
            etc.), deploys to Railway, and gives you a public URL. No account required
            on the free tier.
          </p>
          <h2>Core concepts</h2>
          <ul>
            <li>
              <strong>Deploy</strong> — a live site with a unique URL and optional expiry
              (24h on free).
            </li>
            <li>
              <strong>Deploy token</strong> — secret identifier (
              <code className="docs-inline-code">ps_…</code>) used to redeploy to the same
              URL.
            </li>
            <li>
              <strong>Project file</strong> —{" "}
              <code className="docs-inline-code">.pooshit/project.json</code> links a
              directory to a deploy (portable across machines and CI).
            </li>
          </ul>
          <h2>Command overview</h2>
          {cliCommands.map((command) => (
            <div key={command.id} className="docs-command-card">
              <a href={`/docs/commands/${command.id}`}>
                <h3>
                  {command.name} <StatusBadge status={command.status} />
                </h3>
                <p>{command.summary}</p>
              </a>
            </div>
          ))}
        </>
      );

    case "quickstart":
      return (
        <>
          <h1>Quickstart</h1>
          <p className="docs-lead">Deploy any project in under a minute.</p>
          <h2>1. Deploy</h2>
          <pre className="docs-code">cd your-project{"\n"}npx pooshit</pre>
          <p>
            Pooshit detects your stack, uploads the project, and prints a live URL when
            the build finishes.
          </p>
          <h2>2. Redeploy</h2>
          <p>
            Run <code className="docs-inline-code">npx pooshit</code> again in the same
            directory — it updates the existing site instead of creating a new one.
          </p>
          <h2>3. Optional — init first</h2>
          <pre className="docs-code">npx pooshit init{"\n"}npx pooshit</pre>
          <p>
            Creates <code className="docs-inline-code">.pooshit/project.json</code> with a
            stable project ID before your first deploy. Recommended for teams and CI.
          </p>
          <h2>Check status</h2>
          <pre className="docs-code">npx pooshit status{"\n"}npx pooshit open</pre>
        </>
      );

    case "project-file":
      return (
        <>
          <h1>Project file</h1>
          <p className="docs-lead">
            <code className="docs-inline-code">.pooshit/project.json</code> links a
            directory to a deploy.
          </p>
          <h2>Location</h2>
          <pre className="docs-code">your-project/.pooshit/project.json</pre>
          <p>
            Created automatically on first deploy, or manually via{" "}
            <code className="docs-inline-code">npx pooshit init</code>.
          </p>
          <h2>Format</h2>
          <pre className="docs-code">{projectFileExample}</pre>
          <h2>Fields</h2>
          <div className="docs-table-wrap">
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code className="docs-inline-code">version</code>
                  </td>
                  <td>
                    Schema version. Always <code className="docs-inline-code">1</code>.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code className="docs-inline-code">projectId</code>
                  </td>
                  <td>
                    Stable project identifier (
                    <code className="docs-inline-code">proj_…</code>).
                  </td>
                </tr>
                <tr>
                  <td>
                    <code className="docs-inline-code">deployToken</code>
                  </td>
                  <td>Secret token for redeploys. Treat like a password.</td>
                </tr>
                <tr>
                  <td>
                    <code className="docs-inline-code">slug</code>,{" "}
                    <code className="docs-inline-code">url</code>
                  </td>
                  <td>Public site identifier and URL (filled after deploy).</td>
                </tr>
                <tr>
                  <td>
                    <code className="docs-inline-code">expiresAt</code>
                  </td>
                  <td>Free-tier expiry timestamp, or null on Pro.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h2>Token resolution order</h2>
          <ol>
            <li>
              <code className="docs-inline-code">--token</code> flag
            </li>
            <li>
              <code className="docs-inline-code">POOSHIT_DEPLOY_TOKEN</code> env var
            </li>
            <li>
              <code className="docs-inline-code">.pooshit/project.json</code>
            </li>
            <li>
              <code className="docs-inline-code">~/.pooshit/deploys.json</code> (legacy,
              keyed by directory path)
            </li>
          </ol>
          <h2>Git</h2>
          <p>
            Add <code className="docs-inline-code">.pooshit/</code> to{" "}
            <code className="docs-inline-code">.gitignore</code> — deploy tokens are
            secrets. For CI, use a repository secret instead.
          </p>
          <pre className="docs-code">{gitignoreExample}</pre>
          <h2>Link an existing deploy</h2>
          <pre className="docs-code">npx pooshit link --token ps_your_token_here</pre>
        </>
      );

    case "environment":
      return (
        <>
          <h1>Environment variables</h1>
          <p className="docs-lead">Configure the CLI without flags.</p>
          <div className="docs-table-wrap">
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {envVars.map((item) => (
                  <tr key={item.name}>
                    <td>
                      <code className="docs-inline-code">{item.name}</code>
                    </td>
                    <td>
                      <code className="docs-inline-code">{item.default}</code>
                    </td>
                    <td>{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );

    case "limits":
      return (
        <>
          <h1>Limits & pricing</h1>
          <p className="docs-lead">
            Free tier for demos. Pro for anything you want to keep.
          </p>
          <div className="docs-table-wrap">
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Pro ($9.99/mo)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Upload size</td>
                  <td>50 MB</td>
                  <td>500 MB</td>
                </tr>
                <tr>
                  <td>Time live</td>
                  <td>24 hours</td>
                  <td>Forever</td>
                </tr>
                <tr>
                  <td>Concurrent projects</td>
                  <td>3</td>
                  <td>10</td>
                </tr>
                <tr>
                  <td>Deploys per hour</td>
                  <td>Rate limited</td>
                  <td>Higher limits</td>
                </tr>
                <tr>
                  <td>Subdomain</td>
                  <td>Random</td>
                  <td>Pick your own</td>
                </tr>
                <tr>
                  <td>Custom domain</td>
                  <td>—</td>
                  <td>Yes</td>
                </tr>
                <tr>
                  <td>Account required</td>
                  <td>No</td>
                  <td>Yes (for billing)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Free-tier limits are enforced by IP hash when not logged in. Pro limits use
            your account after <code className="docs-inline-code">pooshit login</code>{" "}
            (coming soon).
          </p>
        </>
      );

    case "ci":
      return (
        <>
          <h1>CI/CD</h1>
          <p className="docs-lead">Deploy on every push with a repository secret.</p>
          <h2>Setup</h2>
          <ol>
            <li>
              Deploy once locally: <code className="docs-inline-code">npx pooshit</code>
            </li>
            <li>
              Copy the deploy token from{" "}
              <code className="docs-inline-code">npx pooshit status</code> or{" "}
              <code className="docs-inline-code">.pooshit/project.json</code>
            </li>
            <li>
              Add it as <code className="docs-inline-code">POOSHIT_DEPLOY_TOKEN</code> in
              your CI secrets
            </li>
          </ol>
          <h2>GitHub Actions example</h2>
          <pre className="docs-code">{ciExample}</pre>
          <p>
            Do not commit deploy tokens. Use CI secrets or{" "}
            <code className="docs-inline-code">pooshit link --token</code> on a trusted
            runner only.
          </p>
        </>
      );

    default:
      return <NotFound />;
  }
}

function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p className="docs-lead">
        Try the command palette (<kbd>⌘K</kbd>) or go back to{" "}
        <a href="/docs">documentation home</a>.
      </p>
    </>
  );
}

function isActiveNav(slug: string, current: string): boolean {
  if (slug === "" && current === "") {
    return true;
  }
  return slug !== "" && current === slug;
}

export function DocsApp() {
  const slug = getDocsSlug();
  const { open, openPalette, closePalette } = useCommandPalette();
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="docs-root">
      <div className="docs-shell">
        <aside className="docs-sidebar">
          <div className="docs-brand">
            <a href="/docs">Pooshit docs</a>
            <a className="docs-home-link" href="/">
              ← Home
            </a>
          </div>
          {docSections.map((section) => (
            <div key={section.id}>
              <div className="docs-nav-section">{section.title}</div>
              {section.pages.map((item) => {
                const href = item.slug ? `/docs/${item.slug}` : "/docs";
                return (
                  <a
                    key={item.id}
                    href={href}
                    className={`docs-nav-link${isActiveNav(item.slug, slug) ? " active" : ""}`}
                  >
                    {item.title}
                  </a>
                );
              })}
            </div>
          ))}
        </aside>

        <div className="docs-main">
          <div className="docs-topbar">
            <button type="button" className="docs-search-trigger" onClick={openPalette}>
              Search docs…
              <kbd>{isMac ? "⌘K" : "Ctrl+K"}</kbd>
            </button>
          </div>
          <article className="docs-content">
            <DocsPageContent slug={slug} />
          </article>
        </div>
      </div>
      <CommandPalette open={open} onClose={closePalette} />
    </div>
  );
}
